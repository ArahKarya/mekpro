use crate::models::{HidPacketLog, KeyboardProfile};
use std::process::Command;

fn parse_hex_rgb(hex: &str) -> (u8, u8, u8) {
    let clean = hex.trim().trim_start_matches('#');
    if clean.len() >= 6 {
        let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(255);
        let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(107);
        let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(53);
        (r, g, b)
    } else {
        (255, 107, 53)
    }
}

fn rgb888_to_rgb565(r: u8, g: u8, b: u8) -> u16 {
    let r5 = ((r as u16) >> 3) & 0x1F;
    let g6 = ((g as u16) >> 2) & 0x3F;
    let b5 = ((b as u16) >> 3) & 0x1F;
    (r5 << 11) | (g6 << 5) | b5
}

fn format_packet_hex(buf: &[u8]) -> String {
    buf.iter()
        .take(32)
        .map(|b| format!("{:02X}", b))
        .collect::<Vec<_>>()
        .join(" ")
}

// OEM 0x25A7 boards expose UsagePage 0xFF00 (65280) or 0xFF13 (65299) only over USB or 2.4G dongle.
pub fn try_transmit_vendor_reports(vid: u32, pid: u32, packets: &[[u8; 64]]) -> (bool, String) {
    let api = match hidapi::HidApi::new() {
        Ok(a) => a,
        Err(e) => return (false, format!("HIDAPI init gagal: {}", e)),
    };

    let vid_u16 = (vid & 0xFFFF) as u16;
    let pid_u16 = (pid & 0xFFFF) as u16;

    // Prioritaskan interface Vendor-Defined (UsagePage >= 0xFF00) pada USB / 2.4G
    let mut candidate_infos: Vec<_> = api
        .device_list()
        .filter(|d| d.vendor_id() == vid_u16 && (d.product_id() == pid_u16 || vid_u16 == 0x25A7))
        .collect();

    candidate_infos.sort_by_key(|d| {
        if d.usage_page() >= 0xFF00 {
            0
        } else {
            1
        }
    });

    for info in candidate_infos {
        let usage_page = info.usage_page();
        let usage = info.usage();
        // Jika masih di Bluetooth LE (UsagePage 0x01 / 0x0C), chip Beken membatasi MaxFeatureReportSize=1 byte.
        if usage_page < 0xFF00 {
            continue;
        }
        if let Ok(device) = info.open_device(&api) {
            let mut sent_count = 0;
            for pkt in packets {
                if device.send_feature_report(pkt).is_ok() || device.write(pkt).is_ok() {
                    sent_count += 1;
                }
            }
            if sent_count > 0 {
                return (
                    true,
                    format!(
                        "Terkirim {} paket 64-byte ke UsagePage 0x{:04X} Usage 0x{:04X} (VID:0x{:04X} PID:0x{:04X})",
                        sent_count,
                        usage_page,
                        usage,
                        info.vendor_id(),
                        info.product_id()
                    ),
                );
            }
        }
    }

    // Cek apakah hanya antarmuka Bluetooth LE (HOGP UsagePage 0x01/0x0C) yang terlihat
    if let Ok(out) = Command::new("hidutil").arg("list").output() {
        let stdout = String::from_utf8_lossy(&out.stdout);
        let vid_hex = format!("0x{:x}", vid);
        for line in stdout.lines() {
            let lower = line.to_lowercase();
            if lower.contains(&vid_hex) && lower.contains("bluetooth") {
                return (
                    false,
                    "Mode Bluetooth LE (Chip Beken HOGP: hanya membuka UsagePage 0x01 Keyboard & 0x0C Media dengan MaxFeatureReportSize=1 byte; kanal Vendor 64-byte 0xFF00 dikunci firmware saat Bluetooth)".to_string(),
                );
            }
        }
    }

    (
        false,
        "Antarmuka Vendor HID 0xFF00 belum terdeteksi (hubungkan kabel USB atau penerima 2.4GHz)".to_string(),
    )
}

pub fn build_and_dispatch_hardware_packets(
    profile: &KeyboardProfile,
    now_str: &str,
) -> (bool, String, Vec<HidPacketLog>) {
    let mut logs = Vec::new();

    // Report 0x04, Command 0x07: Compx/SinoWealth 64-byte RGB lighting configuration frame.
    let mut rgb_pkt = [0u8; 64];
    rgb_pkt[0] = 0x04;
    rgb_pkt[1] = 0x07;
    rgb_pkt[2] = match profile.hardware.effect_mode.as_str() {
        "off" => 0x00,
        "cyber_wave" => 0x01,
        "static_per_key" => 0x02,
        "reactive_thock" => 0x03,
        "breathing" => 0x04,
        "spectrum" => 0x05,
        "radar" => 0x06,
        _ => 0x01,
    };
    rgb_pkt[3] = (profile.hardware.brightness.min(100) / 20).min(5);
    rgb_pkt[4] = (profile.hardware.speed.min(100) / 20).min(5);
    rgb_pkt[5] = match profile.hardware.direction.as_str() {
        "right_to_left" => 0x01,
        "outward" => 0x02,
        _ => 0x00,
    };
    let (r1, g1, b1) = parse_hex_rgb(&profile.hardware.primary_color);
    let (r2, g2, b2) = parse_hex_rgb(&profile.hardware.secondary_color);
    rgb_pkt[6] = r1;
    rgb_pkt[7] = g1;
    rgb_pkt[8] = b1;
    rgb_pkt[9] = r2;
    rgb_pkt[10] = g2;
    rgb_pkt[11] = b2;
    rgb_pkt[12] = (profile.hardware.per_key_colors.len() & 0xFF) as u8;
    let crc1: u16 = rgb_pkt[1..15].iter().map(|&x| x as u16).sum();
    rgb_pkt[15] = (crc1 & 0xFF) as u8;

    // Report 0x05, Command 0x0B: MCU debounce, polling rate, sleep timer, and NKRO flags.
    let mut hw_pkt = [0u8; 64];
    hw_pkt[0] = 0x05;
    hw_pkt[1] = 0x0B;
    hw_pkt[2] = (profile.hardware.sleep_timeout_min & 0xFF) as u8;
    hw_pkt[3] = profile.hardware.debounce_ms;
    hw_pkt[4] = match profile.hardware.polling_rate_hz {
        1000 => 0x01,
        500 => 0x02,
        250 => 0x04,
        _ => 0x08,
    };
    hw_pkt[5] = if profile.hardware.nkro_enabled { 0x01 } else { 0x00 };
    hw_pkt[6] = if profile.hardware.win_lock { 0x01 } else { 0x00 };
    hw_pkt[7] = if profile.hardware.mac_modifier_swap { 0x01 } else { 0x00 };
    let crc2: u16 = hw_pkt[1..15].iter().map(|&x| x as u16).sum();
    hw_pkt[15] = (crc2 & 0xFF) as u8;

    // Report 0x08, Command 0xA1: TFT screen mode, RTC clock sync, and RGB565 big-endian pixel words.
    let mut tft_pkt = [0u8; 64];
    tft_pkt[0] = 0x08;
    tft_pkt[1] = 0xA1;
    tft_pkt[2] = match profile.tft.screen_mode.as_str() {
        "clock_status" => 0x01,
        "pixel_art" => 0x02,
        "wpm_gauge" => 0x03,
        "custom_banner" => 0x04,
        _ => 0x01,
    };
    tft_pkt[3] = profile.tft.brightness.min(100);
    tft_pkt[4] = profile.tft.fps;
    tft_pkt[5] = if profile.tft.sync_clock { 0x01 } else { 0x00 };

    for (idx, hex_color) in profile.tft.pixel_grid_16x16.iter().take(8).enumerate() {
        let (r, g, b) = parse_hex_rgb(hex_color);
        let rgb565 = rgb888_to_rgb565(r, g, b);
        let offset = 8 + idx * 2;
        tft_pkt[offset] = (rgb565 >> 8) as u8;
        tft_pkt[offset + 1] = (rgb565 & 0xFF) as u8;
    }
    let crc3: u16 = tft_pkt[1..31].iter().map(|&x| x as u16).sum();
    tft_pkt[31] = (crc3 & 0xFF) as u8;

    let packets = [rgb_pkt, hw_pkt, tft_pkt];
    let (usb_vendor_ready, tx_detail) =
        try_transmit_vendor_reports(profile.vendor_id, profile.product_id, &packets);

    let direction_label = if usb_vendor_ready {
        "TX -> USB Vendor HID (0xFF00)"
    } else {
        "STAGED (BLE -> Auto-USB Queue)"
    };
    let status_label = if usb_vendor_ready {
        format!("TRANSMITTED ({})", tx_detail)
    } else {
        format!("QUEUED ({})", tx_detail)
    };

    logs.push(HidPacketLog {
        timestamp: now_str.to_string(),
        direction: direction_label.to_string(),
        endpoint: format!(
            "VID:0x{:04X} PID:0x{:04X} : Report 0x04 (RGB Matrix)",
            profile.vendor_id, profile.product_id
        ),
        summary: format!(
            "Mode={} | Bright={}% | Speed={}% | Primary={} | CustomKeys={}",
            profile.hardware.effect_mode,
            profile.hardware.brightness,
            profile.hardware.speed,
            profile.hardware.primary_color,
            profile.hardware.per_key_colors.len()
        ),
        hex_dump: format_packet_hex(&rgb_pkt),
        status: status_label.clone(),
    });

    logs.push(HidPacketLog {
        timestamp: now_str.to_string(),
        direction: direction_label.to_string(),
        endpoint: format!(
            "VID:0x{:04X} PID:0x{:04X} : Report 0x05 (MCU & Power)",
            profile.vendor_id, profile.product_id
        ),
        summary: format!(
            "Sleep={}m | Debounce={}ms | Poll={}Hz | NKRO={} | WinLock={}",
            profile.hardware.sleep_timeout_min,
            profile.hardware.debounce_ms,
            profile.hardware.polling_rate_hz,
            profile.hardware.nkro_enabled,
            profile.hardware.win_lock
        ),
        hex_dump: format_packet_hex(&hw_pkt),
        status: status_label.clone(),
    });

    logs.push(HidPacketLog {
        timestamp: now_str.to_string(),
        direction: direction_label.to_string(),
        endpoint: format!(
            "VID:0x{:04X} PID:0x{:04X} : Report 0x08 (TFT RGB565 & RTC)",
            profile.vendor_id, profile.product_id
        ),
        summary: format!(
            "TFT Mode={} | FPS={} | ClockSync={} | Banner='{}'",
            profile.tft.screen_mode,
            profile.tft.fps,
            profile.tft.sync_clock,
            profile.tft.banner_text
        ),
        hex_dump: format_packet_hex(&tft_pkt),
        status: status_label,
    });

    let transport_mode = if usb_vendor_ready {
        "USB Wired Vendor HID (Direct EEPROM + OS Engine)".to_string()
    } else {
        "Hybrid Bluetooth LE (OS Remap & Macro Live + Hardware Packets Queued for USB)".to_string()
    };

    (usb_vendor_ready, transport_mode, logs)
}
