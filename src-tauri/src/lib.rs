pub mod hid_protocol;
pub mod listener;
pub mod models;
pub mod remap_engine;
pub mod scanner;
pub mod storage;

use listener::{execute_macro_binding, now_millis, spawn_key_listener, ListenerSharedState};
use models::{ApplySyncResult, ConnectedKeyboard, KeyboardProfile, MacroBinding};
use std::sync::{Arc, Mutex};
use tauri::State;

pub struct AppState {
    pub profiles: Mutex<Vec<KeyboardProfile>>,
    pub listener_shared: Arc<ListenerSharedState>,
}

fn current_time_iso() -> String {
    let secs = now_millis() / 1000;
    format!("TS-{}", secs)
}

#[tauri::command]
fn scan_keyboards() -> Vec<ConnectedKeyboard> {
    scanner::scan_connected_keyboards()
}

#[tauri::command]
fn get_profiles(state: State<'_, AppState>) -> Vec<KeyboardProfile> {
    state.profiles.lock().unwrap().clone()
}

#[tauri::command]
fn save_and_apply_profile(
    profile: KeyboardProfile,
    state: State<'_, AppState>,
) -> Result<ApplySyncResult, String> {
    let now_str = current_time_iso();

    {
        let mut profiles = state.profiles.lock().unwrap();
        if let Some(existing) = profiles.iter_mut().find(|p| p.id == profile.id) {
            *existing = profile.clone();
        } else {
            profiles.push(profile.clone());
        }
        storage::save_profiles(&profiles)?;
    }

    {
        let mut macros_guard = state.listener_shared.macros.lock().unwrap();
        *macros_guard = profile.macros.clone();
    }

    let (os_remaps_applied, launch_agent_installed, os_log) =
        remap_engine::apply_os_remaps(&profile, &now_str)?;

    let (raw_hid_transmitted, transport_mode, mut packet_logs) =
        hid_protocol::build_and_dispatch_hardware_packets(&profile, &now_str);

    packet_logs.insert(0, os_log);

    let msg = if raw_hid_transmitted {
        format!(
            "Berhasil menerapkan {} remap OS dan mengirim 3 paket Vendor HID (RGB, MCU, TFT) ke {}.",
            os_remaps_applied, profile.brand_model
        )
    } else {
        format!(
            "Berhasil menerapkan {} remap OS dan {} macro aktif ke {} (via Bluetooth LE). Paket RGB, MCU, dan TFT disimpan dalam antrean sinkronisasi USB.",
            os_remaps_applied,
            profile.macros.iter().filter(|m| m.enabled).count(),
            profile.brand_model
        )
    };

    Ok(ApplySyncResult {
        ok: true,
        os_remaps_applied,
        launch_agent_installed,
        raw_hid_transmitted,
        transport_mode,
        message: msg,
        packet_logs,
    })
}

#[tauri::command]
fn delete_profile(profile_id: String, state: State<'_, AppState>) -> Result<Vec<KeyboardProfile>, String> {
    let mut profiles = state.profiles.lock().unwrap();
    if profiles.len() <= 1 {
        return Err("Minimal harus ada 1 profil tersimpan.".to_string());
    }
    profiles.retain(|p| p.id != profile_id);
    storage::save_profiles(&profiles)?;
    Ok(profiles.clone())
}

#[tauri::command]
fn reset_device_remaps(vid: u32, pid: u32) -> Result<String, String> {
    remap_engine::reset_os_remaps(vid, pid)?;
    Ok(format!(
        "Seluruh pemetaan tombol untuk perangkat 0x{:04X}:0x{:04X} telah dikembalikan ke standar pabrik.",
        vid, pid
    ))
}

#[tauri::command]
fn test_macro_now(binding: MacroBinding) -> Result<String, String> {
    let name = binding.name.clone();
    execute_macro_binding(binding);
    Ok(format!("Macro '{}' telah dijalankan.", name))
}

#[tauri::command]
fn set_macro_engine_enabled(enabled: bool, state: State<'_, AppState>) -> Result<bool, String> {
    let mut flag = state.listener_shared.macros_active.lock().unwrap();
    *flag = enabled;
    Ok(*flag)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_profiles = storage::load_profiles();
    let first_macros = initial_profiles
        .first()
        .map(|p| p.macros.clone())
        .unwrap_or_default();
    let listener_shared = Arc::new(ListenerSharedState::new(first_macros));
    let listener_shared_for_thread = Arc::clone(&listener_shared);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            profiles: Mutex::new(initial_profiles),
            listener_shared,
        })
        .setup(move |app| {
            spawn_key_listener(app.handle().clone(), listener_shared_for_thread);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_keyboards,
            get_profiles,
            save_and_apply_profile,
            delete_profile,
            reset_device_remaps,
            test_macro_now,
            set_macro_engine_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running MeKPro Tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_keyboards_includes_pilot_m82xu() {
        let list = scanner::scan_connected_keyboards();
        assert!(!list.is_empty(), "Harus ada minimal 1 keyboard (Pilot M82XU)");
        let pilot = list.iter().find(|k| k.vendor_id == 0x25A7 && k.product_id == 0x2420);
        assert!(pilot.is_some(), "Pilot M82XU (0x25A7:0x2420) harus terdeteksi");
        assert!(pilot.unwrap().is_pilot);
    }

    #[test]
    fn test_remap_and_hid_packets_generation() {
        let mut profiles = storage::default_profiles();
        let prof = &mut profiles[0];
        prof.hardware.mac_modifier_swap = true;
        prof.remaps[0].enabled = true;

        let pairs = remap_engine::build_hidutil_mappings(prof);
        assert!(pairs.len() >= 3, "Harus mencakup Mac swap (2 arah) dan CapsLock ke Esc");

        let (_usb_ready, _mode, logs) =
            hid_protocol::build_and_dispatch_hardware_packets(prof, "TS-TEST");
        assert_eq!(logs.len(), 3, "Harus menghasilkan 3 paket HID (RGB, MCU, TFT)");
        assert!(logs[0].hex_dump.starts_with("04 07"));
        assert!(logs[1].hex_dump.starts_with("05 0B"));
        assert!(logs[2].hex_dump.starts_with("08 A1"));
    }
}
