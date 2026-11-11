use crate::models::ConnectedKeyboard;
use std::collections::HashMap;
use std::process::Command;

struct KnownBoardMeta {
    brand_model: &'static str,
    layout_id: &'static str,
    chip_family: &'static str,
    is_pilot: bool,
}

fn identify_board(vid: u32, pid: u32, product_name: &str) -> KnownBoardMeta {
    let prod_upper = product_name.to_uppercase();
    if (vid == 0x25A7 && (pid == 0x2420 || pid == 0xFA61 || pid == 0xFA67 || pid == 0x2419))
        || prod_upper.contains("M82X")
    {
        return KnownBoardMeta {
            brand_model: "Rexus Daxa M82X Ultimate (75% Gasket, Knob, TFT)",
            layout_id: "m82xu_75",
            chip_family: "Compx / Sino Wealth Tri-Mode (0x25A7)",
            is_pilot: true,
        };
    }

    match (vid, pid) {
        (0x258A, _) => KnownBoardMeta {
            brand_model: "Sino Wealth / Royal Kludge / Fantech Mechanical (75%)",
            layout_id: "m82xu_75",
            chip_family: "Sino Wealth SH68F90 (0x258A)",
            is_pilot: false,
        },
        (0x3434, _) => KnownBoardMeta {
            brand_model: "Keychron Q/V/K Pro Series (QMK/VIA)",
            layout_id: "m82xu_75",
            chip_family: "STM32 / WB32 QMK Raw HID (0x3434)",
            is_pilot: false,
        },
        (0x320F, _) => KnownBoardMeta {
            brand_model: "VortexSeries / Glorious / Evision RGB Board",
            layout_id: "m82xu_75",
            chip_family: "Evision VS11K09A (0x320F)",
            is_pilot: false,
        },
        (0x05AC, _) => KnownBoardMeta {
            brand_model: "Apple / Custom QMK Keyboard (macOS HID)",
            layout_id: "m82xu_75",
            chip_family: "Apple / Generic HID (0x05AC)",
            is_pilot: false,
        },
        _ => KnownBoardMeta {
            brand_model: "Universal Mechanical Keyboard (HID Standard + Raw)",
            layout_id: "m82xu_75",
            chip_family: "Generic USB/BLE HID Controller",
            is_pilot: false,
        },
    }
}

fn parse_hex_or_dec(token: &str) -> Option<u32> {
    let trimmed = token.trim();
    if let Some(hex) = trimmed.strip_prefix("0x").or_else(|| trimmed.strip_prefix("0X")) {
        u32::from_str_radix(hex, 16).ok()
    } else {
        trimmed.parse::<u32>().ok()
    }
}

pub fn count_active_os_remaps(vid: u32, pid: u32) -> usize {
    let matching = format!(r#"{{"VendorID":{},"ProductID":{}}}"#, vid, pid);
    let output = Command::new("hidutil")
        .args(["property", "--matching", &matching, "--get", "UserKeyMapping"])
        .output();

    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        // Each mapping block contains HIDKeyboardModifierMappingSrc
        stdout.matches("HIDKeyboardModifierMappingSrc").count()
    } else {
        0
    }
}

fn fetch_bluetooth_macs() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let output = Command::new("system_profiler")
        .arg("SPBluetoothDataType")
        .output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        let mut current_device = String::new();
        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.ends_with(':')
                && !trimmed.starts_with("Connected")
                && !trimmed.starts_with("Not Connected")
                && !trimmed.starts_with("Bluetooth")
            {
                current_device = trimmed.trim_end_matches(':').to_string();
            } else if let Some(addr) = trimmed.strip_prefix("Address:") {
                if !current_device.is_empty() {
                    map.insert(current_device.clone(), addr.trim().to_string());
                }
            }
        }
    }
    map
}

pub fn scan_connected_keyboards() -> Vec<ConnectedKeyboard> {
    let bt_macs = fetch_bluetooth_macs();
    let mut seen: HashMap<String, ConnectedKeyboard> = HashMap::new();

    if let Ok(out) = Command::new("hidutil").arg("list").output() {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
            let trimmed = line.trim();
            if !trimmed.starts_with("0x") {
                continue;
            }
            let cols: Vec<&str> = trimmed.split_whitespace().collect();
            if cols.len() < 8 {
                continue;
            }
            let vid = match parse_hex_or_dec(cols[0]) {
                Some(v) => v,
                None => continue,
            };
            let pid = match parse_hex_or_dec(cols[1]) {
                Some(p) => p,
                None => continue,
            };
            if vid == 0 && pid == 0 {
                continue;
            }

            let usage_page = parse_hex_or_dec(cols[3]).unwrap_or(0);
            let usage = parse_hex_or_dec(cols[4]).unwrap_or(0);
            let registry_id = cols[5].to_string();

            // UsagePage 1 Usage 6 = Keyboard, or known mechanical keyboard vendor 0x25A7 / 0x258A / 0x3434 / 0x320F
            let is_keyboard_usage = usage_page == 1 && usage == 6;
            let is_known_kb_vendor = matches!(vid, 0x25A7 | 0x258A | 0x3434 | 0x320F);
            if !is_keyboard_usage && !is_known_kb_vendor {
                continue;
            }

            // Skip virtual TouchBarUserDevice or internal sensors
            if line.contains("TouchBarUserDevice") || line.contains("Keyboard Backlight") {
                continue;
            }

            let transport = if line.contains("Bluetooth Low Energy") {
                "Bluetooth Low Energy".to_string()
            } else if line.contains("Bluetooth") {
                "Bluetooth Classic".to_string()
            } else if line.contains("USB") {
                "USB Wired / 2.4GHz Dongle".to_string()
            } else {
                "System HID".to_string()
            };

            let product_name = if line.contains("M82XU 5.0") {
                "M82XU 5.0".to_string()
            } else if line.contains("Apple Internal Keyboard") {
                "Apple Internal Keyboard".to_string()
            } else {
                // Extract product name between Class and UserClass/Built-In
                cols[7..cols.len().saturating_sub(2)].join(" ")
            };

            let key = format!("{:04x}:{:04x}", vid, pid);
            if seen.contains_key(&key) {
                continue;
            }

            let meta = identify_board(vid, pid, &product_name);
            let mac_address = bt_macs.get(&product_name).cloned();
            let active_os_remaps = count_active_os_remaps(vid, pid);
            let supports_raw_hid = transport.contains("USB") || meta.is_pilot;

            seen.insert(
                key.clone(),
                ConnectedKeyboard {
                    id: key,
                    vendor_id: vid,
                    product_id: pid,
                    vendor_hex: format!("0x{:04X}", vid),
                    product_hex: format!("0x{:04X}", pid),
                    product_name,
                    brand_model: meta.brand_model.to_string(),
                    transport,
                    mac_address,
                    registry_id,
                    layout_id: meta.layout_id.to_string(),
                    is_pilot: meta.is_pilot,
                    supports_os_remap: true,
                    supports_raw_hid,
                    active_os_remaps,
                    chip_family: meta.chip_family.to_string(),
                },
            );
        }
    }

    let mut list: Vec<ConnectedKeyboard> = seen.into_values().collect();
    list.sort_by(|a, b| b.is_pilot.cmp(&a.is_pilot).then_with(|| a.id.cmp(&b.id)));

    if !list.iter().any(|k| k.is_pilot) {
        list.insert(
            0,
            ConnectedKeyboard {
                id: "25a7:2420".to_string(),
                vendor_id: 0x25A7,
                product_id: 0x2420,
                vendor_hex: "0x25A7".to_string(),
                product_hex: "0x2420".to_string(),
                product_name: "M82XU 5.0 (Standby / Offline)".to_string(),
                brand_model: "Rexus Daxa M82X Ultimate (75% Gasket, Knob, TFT)".to_string(),
                transport: "Standby (Bluetooth LE / USB Ready)".to_string(),
                mac_address: Some("F4:EE:25:F3:7B:B5".to_string()),
                registry_id: "0x100028a83".to_string(),
                layout_id: "m82xu_75".to_string(),
                is_pilot: true,
                supports_os_remap: true,
                supports_raw_hid: true,
                active_os_remaps: count_active_os_remaps(0x25A7, 0x2420),
                chip_family: "Compx / Sino Wealth Tri-Mode (0x25A7)".to_string(),
            },
        );
    }

    list
}
