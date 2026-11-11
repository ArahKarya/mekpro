use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectedKeyboard {
    pub id: String,
    pub vendor_id: u32,
    pub product_id: u32,
    pub vendor_hex: String,
    pub product_hex: String,
    pub product_name: String,
    pub brand_model: String,
    pub transport: String,
    pub mac_address: Option<String>,
    pub registry_id: String,
    pub layout_id: String,
    pub is_pilot: bool,
    pub supports_os_remap: bool,
    pub supports_raw_hid: bool,
    pub active_os_remaps: usize,
    pub chip_family: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyRemapRule {
    pub id: String,
    pub key_id: String,
    pub layer: u8,
    pub from_hid_usage: u64,
    pub to_hid_usage: u64,
    pub from_label: String,
    pub to_label: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroStep {
    pub step_type: String, // "key", "delay", "text", "shortcut"
    pub value: String,
    pub delay_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacroBinding {
    pub id: String,
    pub name: String,
    pub trigger_key_id: String,
    pub trigger_keycode: i64,
    pub modifier_filter: String, // "none", "fn_layer", "alt", "cmd_shift"
    pub action_type: String,     // "sequence", "text", "app", "shell", "system"
    pub payload: String,
    pub steps: Vec<MacroStep>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbHardwareConfig {
    pub effect_mode: String, // "cyber_wave", "static_per_key", "reactive_thock", "breathing", "spectrum", "radar", "off"
    pub brightness: u8,      // 0..=100
    pub speed: u8,           // 0..=100
    pub direction: String,   // "left_to_right", "right_to_left", "outward"
    pub primary_color: String,
    pub secondary_color: String,
    pub per_key_colors: HashMap<String, String>,
    pub sleep_timeout_min: u16, // 0 = never, 5, 10, 30
    pub debounce_ms: u8,        // 2, 4, 8, 12
    pub polling_rate_hz: u16,   // 125, 250, 500, 1000
    pub nkro_enabled: bool,
    pub win_lock: bool,
    pub mac_modifier_swap: bool,
    pub knob_clockwise: String,
    pub knob_counter_clockwise: String,
    pub knob_press: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TftScreenConfig {
    pub screen_mode: String, // "clock_status", "pixel_art", "wpm_gauge", "custom_banner"
    pub brightness: u8,
    pub fps: u8,
    pub sync_clock: bool,
    pub show_battery: bool,
    pub show_connection: bool,
    pub banner_text: String,
    pub accent_hex: String,
    pub pixel_grid_16x16: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardProfile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub vendor_id: u32,
    pub product_id: u32,
    pub brand_model: String,
    pub layout_id: String,
    pub updated_at: String,
    pub launch_agent_enabled: bool,
    pub remaps: Vec<KeyRemapRule>,
    pub macros: Vec<MacroBinding>,
    pub hardware: RgbHardwareConfig,
    pub tft: TftScreenConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HidPacketLog {
    pub timestamp: String,
    pub direction: String, // "TX -> USB/HID", "STAGED (BLE -> USB Queue)", "OS -> IOHIDSystem"
    pub endpoint: String,
    pub summary: String,
    pub hex_dump: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveKeyEventPayload {
    pub keycode: i64,
    pub key_id: String,
    pub key_label: String,
    pub pressed: bool,
    pub timestamp_ms: u64,
    pub delta_since_last_ms: Option<u64>,
    pub chatter_detected: bool,
    pub macro_triggered: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplySyncResult {
    pub ok: bool,
    pub os_remaps_applied: usize,
    pub launch_agent_installed: bool,
    pub raw_hid_transmitted: bool,
    pub transport_mode: String,
    pub message: String,
    pub packet_logs: Vec<HidPacketLog>,
}
