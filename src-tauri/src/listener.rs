use crate::models::{LiveKeyEventPayload, MacroBinding};
use std::collections::HashMap;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

pub struct ListenerSharedState {
    pub macros: Mutex<Vec<MacroBinding>>,
    pub macros_active: Mutex<bool>,
}

impl ListenerSharedState {
    pub fn new(initial_macros: Vec<MacroBinding>) -> Self {
        Self {
            macros: Mutex::new(initial_macros),
            macros_active: Mutex::new(true),
        }
    }
}

pub fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn macos_keycode_to_key_id(code: i64) -> (&'static str, &'static str) {
    match code {
        53 => ("Escape", "Esc"),
        122 => ("F1", "F1"),
        120 => ("F2", "F2"),
        99 => ("F3", "F3"),
        118 => ("F4", "F4"),
        96 => ("F5", "F5"),
        97 => ("F6", "F6"),
        98 => ("F7", "F7"),
        100 => ("F8", "F8"),
        101 => ("F9", "F9"),
        109 => ("F10", "F10"),
        103 => ("F11", "F11"),
        111 => ("F12", "F12"),
        117 => ("Delete", "Del"),
        50 => ("Backquote", "` ~"),
        18 => ("Digit1", "1"),
        19 => ("Digit2", "2"),
        20 => ("Digit3", "3"),
        21 => ("Digit4", "4"),
        23 => ("Digit5", "5"),
        22 => ("Digit6", "6"),
        26 => ("Digit7", "7"),
        28 => ("Digit8", "8"),
        25 => ("Digit9", "9"),
        29 => ("Digit0", "0"),
        27 => ("Minus", "- _"),
        24 => ("Equal", "= +"),
        51 => ("Backspace", "Backspace"),
        116 => ("PageUp", "PgUp"),
        48 => ("Tab", "Tab"),
        12 => ("KeyQ", "Q"),
        13 => ("KeyW", "W"),
        14 => ("KeyE", "E"),
        15 => ("KeyR", "R"),
        17 => ("KeyT", "T"),
        16 => ("KeyY", "Y"),
        32 => ("KeyU", "U"),
        34 => ("KeyI", "I"),
        31 => ("KeyO", "O"),
        35 => ("KeyP", "P"),
        33 => ("BracketLeft", "[ {"),
        30 => ("BracketRight", "] }"),
        42 => ("Backslash", "\\ |"),
        121 => ("PageDown", "PgDn"),
        57 => ("CapsLock", "Caps"),
        0 => ("KeyA", "A"),
        1 => ("KeyS", "S"),
        2 => ("KeyD", "D"),
        3 => ("KeyF", "F"),
        5 => ("KeyG", "G"),
        4 => ("KeyH", "H"),
        38 => ("KeyJ", "J"),
        40 => ("KeyK", "K"),
        37 => ("KeyL", "L"),
        41 => ("Semicolon", "; :"),
        39 => ("Quote", "' \""),
        36 | 76 => ("Enter", "Enter"),
        115 => ("Home", "Home"),
        56 => ("ShiftLeft", "L-Shift"),
        6 => ("KeyZ", "Z"),
        7 => ("KeyX", "X"),
        8 => ("KeyC", "C"),
        9 => ("KeyV", "V"),
        11 => ("KeyB", "B"),
        45 => ("KeyN", "N"),
        46 => ("KeyM", "M"),
        43 => ("Comma", ", <"),
        47 => ("Period", ". >"),
        44 => ("Slash", "/ ?"),
        60 => ("ShiftRight", "R-Shift"),
        126 => ("ArrowUp", "Up"),
        119 => ("End", "End"),
        59 => ("ControlLeft", "L-Ctrl"),
        55 => ("MetaLeft", "L-Win/Cmd"),
        58 => ("AltLeft", "L-Alt/Opt"),
        49 => ("Space", "Space"),
        61 => ("AltRight", "R-Alt/Opt"),
        54 => ("MetaRight", "Fn/R-Cmd"),
        62 => ("ControlRight", "R-Ctrl"),
        123 => ("ArrowLeft", "Left"),
        125 => ("ArrowDown", "Down"),
        124 => ("ArrowRight", "Right"),
        74 => ("KnobPress", "Knob Mute"),
        72 => ("KnobCW", "Knob Vol+"),
        73 => ("KnobCCW", "Knob Vol-"),
        _ => ("CustomKey", "Key"),
    }
}

pub fn execute_macro_binding(binding: MacroBinding) {
    thread::spawn(move || {
        match binding.action_type.as_str() {
            "app" => {
                let target = binding.payload.trim();
                if !target.is_empty() {
                    let _ = Command::new("open").args(["-a", target]).spawn();
                }
            }
            "shell" => {
                let cmd = binding.payload.trim();
                if !cmd.is_empty() {
                    let _ = Command::new("sh").args(["-c", cmd]).spawn();
                }
            }
            "text" => {
                let escaped = binding.payload.replace('\\', "\\\\").replace('"', "\\\"");
                let script = format!(
                    r#"tell application "System Events" to keystroke "{}""#,
                    escaped
                );
                let _ = Command::new("osascript").args(["-e", &script]).output();
            }
            "system" => {
                let script = match binding.payload.as_str() {
                    "screenshot" => {
                        r#"tell application "System Events" to keystroke "4" using {command down, shift down}"#
                    }
                    "mission_control" => r#"tell application "Mission Control" to launch"#,
                    "spotlight" => {
                        r#"tell application "System Events" to keystroke space using {command down}"#
                    }
                    "lock_screen" => {
                        r#"tell application "System Events" to keystroke "q" using {control down, command down}"#
                    }
                    _ => "",
                };
                if !script.is_empty() {
                    let _ = Command::new("osascript").args(["-e", script]).output();
                }
            }
            _ => {
                for step in &binding.steps {
                    match step.step_type.as_str() {
                        "delay" => {
                            let ms = step.delay_ms.max(10).min(5000);
                            thread::sleep(std::time::Duration::from_millis(ms));
                        }
                        "text" => {
                            let escaped = step.value.replace('\\', "\\\\").replace('"', "\\\"");
                            let script = format!(
                                r#"tell application "System Events" to keystroke "{}""#,
                                escaped
                            );
                            let _ = Command::new("osascript").args(["-e", &script]).output();
                        }
                        "key" | "shortcut" => {
                            let escaped = step.value.replace('\\', "\\\\").replace('"', "\\\"");
                            let script = format!(
                                r#"tell application "System Events" to keystroke "{}""#,
                                escaped
                            );
                            let _ = Command::new("osascript").args(["-e", &script]).output();
                        }
                        _ => {}
                    }
                }
            }
        }
    });
}

pub fn spawn_key_listener(app: AppHandle, shared: Arc<ListenerSharedState>) {
    thread::spawn(move || {
        #[cfg(target_os = "macos")]
        macos_tap::run(app, shared);
    });
}

#[cfg(target_os = "macos")]
mod macos_tap {
    use super::*;
    use std::cell::RefCell;
    use std::collections::HashSet;

    use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
    use core_graphics::event::{
        CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventType,
        EventField,
    };

    extern "C" {
        fn CGRequestListenEventAccess() -> bool;
    }

    fn is_modifier(code: i64) -> bool {
        matches!(code, 54..=63)
    }

    pub fn run(app: AppHandle, shared: Arc<ListenerSharedState>) {
        let _granted = unsafe { CGRequestListenEventAccess() };

        let held_modifiers: RefCell<HashSet<i64>> = RefCell::new(HashSet::new());
        let last_press_ms: RefCell<HashMap<i64, u64>> = RefCell::new(HashMap::new());

        let tap = CGEventTap::new(
            CGEventTapLocation::Session,
            CGEventTapPlacement::TailAppendEventTap,
            CGEventTapOptions::ListenOnly,
            vec![
                CGEventType::KeyDown,
                CGEventType::KeyUp,
                CGEventType::FlagsChanged,
            ],
            move |_proxy, event_type, event| {
                let code = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
                let (key_id, key_label) = macos_keycode_to_key_id(code);
                let now = now_millis();

                let phase_opt: Option<bool> = match event_type {
                    CGEventType::KeyDown => {
                        let autorepeat =
                            event.get_integer_value_field(EventField::KEYBOARD_EVENT_AUTOREPEAT);
                        if autorepeat == 0 {
                            Some(true)
                        } else {
                            None
                        }
                    }
                    CGEventType::KeyUp => Some(false),
                    CGEventType::FlagsChanged if is_modifier(code) => {
                        let pressed = held_modifiers.borrow_mut().insert(code);
                        if !pressed {
                            held_modifiers.borrow_mut().remove(&code);
                        }
                        Some(pressed)
                    }
                    _ => None,
                };

                if let Some(pressed) = phase_opt {
                    let mut delta_since_last_ms = None;
                    let mut chatter_detected = false;
                    let mut macro_triggered = None;

                    if pressed {
                        if let Some(prev) = last_press_ms.borrow_mut().insert(code, now) {
                            let delta = now.saturating_sub(prev);
                            delta_since_last_ms = Some(delta);
                            if delta > 0 && delta < 25 {
                                chatter_detected = true;
                            }
                        }

                        let macros_on = *shared.macros_active.lock().unwrap();
                        if macros_on {
                            if let Ok(list) = shared.macros.lock() {
                                if let Some(found) = list
                                    .iter()
                                    .find(|m| m.enabled && (m.trigger_key_id == key_id || m.trigger_keycode == code))
                                {
                                    macro_triggered = Some(found.name.clone());
                                    execute_macro_binding(found.clone());
                                }
                            }
                        }
                    }

                    let payload = LiveKeyEventPayload {
                        keycode: code,
                        key_id: key_id.to_string(),
                        key_label: key_label.to_string(),
                        pressed,
                        timestamp_ms: now,
                        delta_since_last_ms,
                        chatter_detected,
                        macro_triggered,
                    };

                    let _ = app.emit("mekpro://key-event", payload);
                }

                None
            },
        );

        let Ok(tap) = tap else {
            return;
        };

        unsafe {
            if let Ok(source) = tap.mach_port.create_runloop_source(0) {
                CFRunLoop::get_current().add_source(&source, kCFRunLoopCommonModes);
                tap.enable();
                CFRunLoop::run_current();
            }
        }
    }
}
