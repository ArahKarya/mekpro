use crate::models::{
    KeyRemapRule, KeyboardProfile, MacroBinding, MacroStep, RgbHardwareConfig, TftScreenConfig,
};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

fn config_file_path() -> PathBuf {
    let base = std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    let dir = base
        .join("Library")
        .join("Application Support")
        .join("com.aks.mekpro");
    let _ = fs::create_dir_all(&dir);
    dir.join("profiles.json")
}

pub fn default_pixel_grid_m82xu() -> Vec<String> {
    let bg = "#111315".to_string();
    let ac = "#ff6b35".to_string();
    let sl = "#9ca3af".to_string();
    let wh = "#f3f4f6".to_string();

    let pattern: [[u8; 16]; 16] = [
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0],
        [0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0],
        [0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0],
        [1, 2, 0, 1, 3, 0, 1, 3, 3, 1, 0, 3, 1, 0, 2, 1],
        [1, 2, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 2, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 2, 2, 0, 1, 1, 1, 1, 1, 1, 0, 2, 2, 0, 1],
        [1, 0, 2, 2, 0, 1, 3, 3, 3, 3, 1, 0, 2, 2, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 2, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 2, 1],
        [1, 2, 0, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 0, 2, 1],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0],
        [0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    ];

    let mut out = Vec::with_capacity(256);
    for row in pattern {
        for cell in row {
            match cell {
                1 => out.push(ac.clone()),
                2 => out.push(sl.clone()),
                3 => out.push(wh.clone()),
                _ => out.push(bg.clone()),
            }
        }
    }
    out
}

pub fn default_profiles() -> Vec<KeyboardProfile> {
    let mut per_key = HashMap::new();
    per_key.insert("Escape".to_string(), "#ff6b35".to_string());
    per_key.insert("Enter".to_string(), "#ff6b35".to_string());
    per_key.insert("ArrowUp".to_string(), "#ff6b35".to_string());
    per_key.insert("ArrowDown".to_string(), "#ff6b35".to_string());
    per_key.insert("ArrowLeft".to_string(), "#ff6b35".to_string());
    per_key.insert("ArrowRight".to_string(), "#ff6b35".to_string());

    vec![
        KeyboardProfile {
            id: "pilot-m82xu-mac-pro".to_string(),
            name: "M82XU : Produktivitas macOS (Pilot)".to_string(),
            description: "Profil utama Rexus Daxa M82X Ultimate (M82XU 5.0) untuk macOS: Swap Win/Alt ke Cmd/Opt, CapsLock ke Escape (opsional), navigasi Home/End/PgUp/PgDn, dan sinkronisasi jam TFT.".to_string(),
            vendor_id: 0x25A7,
            product_id: 0x2420,
            brand_model: "Rexus Daxa M82X Ultimate (M82XU 5.0)".to_string(),
            layout_id: "m82xu_75".to_string(),
            updated_at: "2026-11-11T09:30:00+07:00".to_string(),
            launch_agent_enabled: false,
            remaps: vec![
                KeyRemapRule {
                    id: "remap-capslock-esc".to_string(),
                    key_id: "CapsLock".to_string(),
                    layer: 0,
                    from_hid_usage: 0x700000039,
                    to_hid_usage: 0x700000029,
                    from_label: "Caps Lock".to_string(),
                    to_label: "Escape".to_string(),
                    enabled: false,
                },
                KeyRemapRule {
                    id: "remap-pgup-home".to_string(),
                    key_id: "PageUp".to_string(),
                    layer: 0,
                    from_hid_usage: 0x70000004B,
                    to_hid_usage: 0x70000004A,
                    from_label: "Page Up".to_string(),
                    to_label: "Home".to_string(),
                    enabled: false,
                },
                KeyRemapRule {
                    id: "remap-pgdn-end".to_string(),
                    key_id: "PageDown".to_string(),
                    layer: 0,
                    from_hid_usage: 0x70000004E,
                    to_hid_usage: 0x70000004D,
                    from_label: "Page Down".to_string(),
                    to_label: "End".to_string(),
                    enabled: false,
                },
            ],
            macros: vec![
                MacroBinding {
                    id: "macro-f12-screenshot".to_string(),
                    name: "Tangkapan Layar Area (macOS)".to_string(),
                    trigger_key_id: "Home".to_string(),
                    trigger_keycode: 115,
                    modifier_filter: "none".to_string(),
                    action_type: "system".to_string(),
                    payload: "screenshot".to_string(),
                    steps: vec![],
                    enabled: false,
                },
                MacroBinding {
                    id: "macro-end-terminal".to_string(),
                    name: "Buka Aplikasi Terminal".to_string(),
                    trigger_key_id: "End".to_string(),
                    trigger_keycode: 119,
                    modifier_filter: "none".to_string(),
                    action_type: "app".to_string(),
                    payload: "Terminal".to_string(),
                    steps: vec![],
                    enabled: false,
                },
                MacroBinding {
                    id: "macro-git-status".to_string(),
                    name: "Ketik Perintah Git Status".to_string(),
                    trigger_key_id: "PageDown".to_string(),
                    trigger_keycode: 121,
                    modifier_filter: "none".to_string(),
                    action_type: "sequence".to_string(),
                    payload: "git status".to_string(),
                    steps: vec![
                        MacroStep {
                            step_type: "text".to_string(),
                            value: "git status".to_string(),
                            delay_ms: 50,
                        },
                        MacroStep {
                            step_type: "delay".to_string(),
                            value: "100ms".to_string(),
                            delay_ms: 100,
                        },
                    ],
                    enabled: false,
                },
            ],
            hardware: RgbHardwareConfig {
                effect_mode: "cyber_wave".to_string(),
                brightness: 80,
                speed: 60,
                direction: "left_to_right".to_string(),
                primary_color: "#ff6b35".to_string(),
                secondary_color: "#f59e0b".to_string(),
                per_key_colors: per_key.clone(),
                sleep_timeout_min: 10,
                debounce_ms: 4,
                polling_rate_hz: 1000,
                nkro_enabled: true,
                win_lock: false,
                mac_modifier_swap: false,
                knob_clockwise: "volume_up".to_string(),
                knob_counter_clockwise: "volume_down".to_string(),
                knob_press: "mute".to_string(),
            },
            tft: TftScreenConfig {
                screen_mode: "clock_status".to_string(),
                brightness: 85,
                fps: 15,
                sync_clock: true,
                show_battery: true,
                show_connection: true,
                banner_text: "M82XU MEKPRO".to_string(),
                accent_hex: "#ff6b35".to_string(),
                pixel_grid_16x16: default_pixel_grid_m82xu(),
            },
        },
        KeyboardProfile {
            id: "pilot-m82xu-low-latency".to_string(),
            name: "M82XU : Respons 2ms Debounce (1000Hz)".to_string(),
            description: "Profil respons cepat untuk Rexus Daxa M82X Ultimate: Debounce 2ms, 1000Hz Polling Rate, NKRO Penuh, dan Win-Lock aktif.".to_string(),
            vendor_id: 0x25A7,
            product_id: 0x2420,
            brand_model: "Rexus Daxa M82X Ultimate (M82XU 5.0)".to_string(),
            layout_id: "m82xu_75".to_string(),
            updated_at: "2026-11-11T09:30:00+07:00".to_string(),
            launch_agent_enabled: false,
            remaps: vec![],
            macros: vec![],
            hardware: RgbHardwareConfig {
                effect_mode: "static_per_key".to_string(),
                brightness: 100,
                speed: 80,
                direction: "outward".to_string(),
                primary_color: "#ff6b35".to_string(),
                secondary_color: "#f59e0b".to_string(),
                per_key_colors: per_key,
                sleep_timeout_min: 30,
                debounce_ms: 2,
                polling_rate_hz: 1000,
                nkro_enabled: true,
                win_lock: true,
                mac_modifier_swap: false,
                knob_clockwise: "volume_up".to_string(),
                knob_counter_clockwise: "volume_down".to_string(),
                knob_press: "play_pause".to_string(),
            },
            tft: TftScreenConfig {
                screen_mode: "wpm_gauge".to_string(),
                brightness: 100,
                fps: 24,
                sync_clock: true,
                show_battery: true,
                show_connection: true,
                banner_text: "1000HZ 2MS".to_string(),
                accent_hex: "#ff6b35".to_string(),
                pixel_grid_16x16: default_pixel_grid_m82xu(),
            },
        },
        KeyboardProfile {
            id: "legacy-sino-wealth-75".to_string(),
            name: "Profil OEM 75% (Sino Wealth / RK / Vortex)".to_string(),
            description: "Profil kompatibilitas untuk keyboard mechanical OEM (Royal Kludge, VortexSeries, Fantech, Ajazz) yang perangkat lunak bawaannya tidak tersedia di macOS.".to_string(),
            vendor_id: 0x258A,
            product_id: 0x0049,
            brand_model: "OEM 75% Mechanical (Sino Wealth / Compx / Evision)".to_string(),
            layout_id: "m82xu_75".to_string(),
            updated_at: "2026-11-11T09:30:00+07:00".to_string(),
            launch_agent_enabled: false,
            remaps: vec![],
            macros: vec![],
            hardware: RgbHardwareConfig {
                effect_mode: "breathing".to_string(),
                brightness: 75,
                speed: 50,
                direction: "left_to_right".to_string(),
                primary_color: "#ff6b35".to_string(),
                secondary_color: "#f59e0b".to_string(),
                per_key_colors: HashMap::new(),
                sleep_timeout_min: 10,
                debounce_ms: 4,
                polling_rate_hz: 1000,
                nkro_enabled: true,
                win_lock: false,
                mac_modifier_swap: true,
                knob_clockwise: "volume_up".to_string(),
                knob_counter_clockwise: "volume_down".to_string(),
                knob_press: "mute".to_string(),
            },
            tft: TftScreenConfig {
                screen_mode: "clock_status".to_string(),
                brightness: 80,
                fps: 15,
                sync_clock: true,
                show_battery: true,
                show_connection: true,
                banner_text: "OEM 75 PROFILE".to_string(),
                accent_hex: "#ff6b35".to_string(),
                pixel_grid_16x16: default_pixel_grid_m82xu(),
            },
        },
    ]
}

pub fn load_profiles() -> Vec<KeyboardProfile> {
    let path = config_file_path();
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(parsed) = serde_json::from_str::<Vec<KeyboardProfile>>(&raw) {
            if !parsed.is_empty() {
                return parsed;
            }
        }
    }
    let defaults = default_profiles();
    let _ = save_profiles(&defaults);
    defaults
}

pub fn save_profiles(profiles: &[KeyboardProfile]) -> Result<(), String> {
    let path = config_file_path();
    let json = serde_json::to_string_pretty(profiles)
        .map_err(|e| format!("Failed to serialize profiles: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write profiles.json: {}", e))
}
