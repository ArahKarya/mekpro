use crate::models::{HidPacketLog, KeyboardProfile};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

const LAUNCH_AGENT_LABEL: &str = "com.aks.mekpro.remap";

fn launch_agent_path() -> Option<PathBuf> {
    let home = std::env::var_os("HOME")?;
    Some(
        PathBuf::from(home)
            .join("Library")
            .join("LaunchAgents")
            .join(format!("{}.plist", LAUNCH_AGENT_LABEL)),
    )
}

pub fn build_hidutil_mappings(profile: &KeyboardProfile) -> Vec<(u64, u64, String)> {
    let mut pairs: Vec<(u64, u64, String)> = Vec::new();

    // If Mac Modifier Swap is enabled, swap Left Alt (0x7000000E2) <-> Left GUI/Cmd (0x7000000E3)
    if profile.hardware.mac_modifier_swap {
        pairs.push((
            0x7000000E2,
            0x7000000E3,
            "Mac Mode: Left Alt -> Left Command".to_string(),
        ));
        pairs.push((
            0x7000000E3,
            0x7000000E2,
            "Mac Mode: Left Win -> Left Option".to_string(),
        ));
    }

    // Add enabled base-layer (layer 0) hardware HID remaps
    for rule in &profile.remaps {
        if !rule.enabled || rule.layer != 0 {
            continue;
        }
        if rule.from_hid_usage == rule.to_hid_usage {
            continue;
        }
        // Replace any existing rule with the same source usage
        pairs.retain(|(src, _, _)| *src != rule.from_hid_usage);
        pairs.push((
            rule.from_hid_usage,
            rule.to_hid_usage,
            format!("{} -> {}", rule.from_label, rule.to_label),
        ));
    }

    // Also map rotary knob behavior if customized away from default Volume
    match profile.hardware.knob_press.as_str() {
        "play_pause" => {
            pairs.push((
                0xC000000E2, // Mute usage on Consumer page
                0xC000000CD, // Play/Pause usage
                "Knob Press: Mute -> Play/Pause".to_string(),
            ));
        }
        "mission_control" => {
            pairs.push((
                0xC000000E2,
                0x70000003C, // F3 / Mission Control
                "Knob Press: Mute -> F3 (Mission Control)".to_string(),
            ));
        }
        "screen_lock" => {
            pairs.push((
                0xC000000E2,
                0xC0000019E, // AL Terminal Lock / Screensaver
                "Knob Press: Mute -> Lock Screen".to_string(),
            ));
        }
        _ => {}
    }

    pairs
}

pub fn apply_os_remaps(
    profile: &KeyboardProfile,
    now_str: &str,
) -> Result<(usize, bool, HidPacketLog), String> {
    let pairs = build_hidutil_mappings(profile);

    let json_items: Vec<String> = pairs
        .iter()
        .map(|(src, dst, _)| {
            format!(
                r#"{{"HIDKeyboardModifierMappingSrc":{},"HIDKeyboardModifierMappingDst":{}}}"#,
                src, dst
            )
        })
        .collect();

    let matching_arg = format!(
        r#"{{"VendorID":{},"ProductID":{}}}"#,
        profile.vendor_id, profile.product_id
    );
    let mapping_arg = format!(r#"{{"UserKeyMapping":[{}]}}"#, json_items.join(","));

    let output = Command::new("hidutil")
        .args([
            "property",
            "--matching",
            &matching_arg,
            "--set",
            &mapping_arg,
        ])
        .output()
        .map_err(|e| format!("Gagal menjalankan hidutil: {}", e))?;

    let status_ok = output.status.success();
    let launch_installed = sync_launch_agent(profile, &matching_arg, &mapping_arg);

    let summary_desc = if pairs.is_empty() {
        format!(
            "Reset UserKeyMapping ke Default Pabrik untuk VID:0x{:04X} PID:0x{:04X}",
            profile.vendor_id, profile.product_id
        )
    } else {
        let labels: Vec<String> = pairs.iter().map(|(_, _, l)| l.clone()).collect();
        format!(
            "Applied {} IOHIDEventSystem remap(s) ke 0x{:04X}:0x{:04X} ({})",
            pairs.len(),
            profile.vendor_id,
            profile.product_id,
            labels.join(", ")
        )
    };

    let log = HidPacketLog {
        timestamp: now_str.to_string(),
        direction: "OS -> IOHIDSystem".to_string(),
        endpoint: format!(
            "hidutil --matching VID:0x{:04X} PID:0x{:04X}",
            profile.vendor_id, profile.product_id
        ),
        summary: summary_desc,
        hex_dump: mapping_arg,
        status: if status_ok {
            "ACTIVE (0.0ms Kernel Remap)".to_string()
        } else {
            "WARN: Device Standby".to_string()
        },
    };

    Ok((pairs.len(), launch_installed, log))
}

pub fn reset_os_remaps(vid: u32, pid: u32) -> Result<(), String> {
    let matching_arg = format!(r#"{{"VendorID":{},"ProductID":{}}}"#, vid, pid);
    let _ = Command::new("hidutil")
        .args([
            "property",
            "--matching",
            &matching_arg,
            "--set",
            r#"{"UserKeyMapping":[]}"#,
        ])
        .output()
        .map_err(|e| format!("Failed to reset hidutil: {}", e))?;

    if let Some(plist_path) = launch_agent_path() {
        if plist_path.exists() {
            let _ = fs::remove_file(plist_path);
        }
    }
    Ok(())
}

fn sync_launch_agent(profile: &KeyboardProfile, matching_arg: &str, mapping_arg: &str) -> bool {
    let Some(plist_path) = launch_agent_path() else {
        return false;
    };

    if !profile.launch_agent_enabled {
        if plist_path.exists() {
            let _ = fs::remove_file(&plist_path);
        }
        return false;
    }

    if let Some(parent) = plist_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let plist_xml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/hidutil</string>
        <string>property</string>
        <string>--matching</string>
        <string>{matching}</string>
        <string>--set</string>
        <string>{mapping}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
"#,
        label = LAUNCH_AGENT_LABEL,
        matching = matching_arg,
        mapping = mapping_arg
    );

    fs::write(&plist_path, plist_xml).is_ok()
}
