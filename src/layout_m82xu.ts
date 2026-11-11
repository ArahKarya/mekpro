export interface KeyCapSpec {
  id: string;
  label: string;
  sub: string;
  widthU: number;
  hidUsage: number;
  macosKeycode: number;
  gapBefore?: boolean;
  specialType?: "tft" | "knob";
}

export interface RemapTargetOption {
  label: string;
  category: "nav" | "modifier" | "media" | "function";
  hidUsage: number;
  sub: string;
}

export const M82XU_ROWS: KeyCapSpec[][] = [
  [
    { id: "Escape", label: "Esc", sub: "`~", widthU: 1, hidUsage: 0x700000029, macosKeycode: 53 },
    { id: "F1", label: "F1", sub: "Bri-", widthU: 1, hidUsage: 0x70000003a, macosKeycode: 122, gapBefore: true },
    { id: "F2", label: "F2", sub: "Bri+", widthU: 1, hidUsage: 0x70000003b, macosKeycode: 120 },
    { id: "F3", label: "F3", sub: "Mission", widthU: 1, hidUsage: 0x70000003c, macosKeycode: 99 },
    { id: "F4", label: "F4", sub: "Launch", widthU: 1, hidUsage: 0x70000003d, macosKeycode: 118 },
    { id: "F5", label: "F5", sub: "LED-", widthU: 1, hidUsage: 0x70000003e, macosKeycode: 96, gapBefore: true },
    { id: "F6", label: "F6", sub: "LED+", widthU: 1, hidUsage: 0x70000003f, macosKeycode: 97 },
    { id: "F7", label: "F7", sub: "Prev", widthU: 1, hidUsage: 0x700000040, macosKeycode: 98 },
    { id: "F8", label: "F8", sub: "Play", widthU: 1, hidUsage: 0x700000041, macosKeycode: 100 },
    { id: "F9", label: "F9", sub: "Next", widthU: 1, hidUsage: 0x700000042, macosKeycode: 101, gapBefore: true },
    { id: "F10", label: "F10", sub: "Mute", widthU: 1, hidUsage: 0x700000043, macosKeycode: 109 },
    { id: "F11", label: "F11", sub: "Vol-", widthU: 1, hidUsage: 0x700000044, macosKeycode: 103 },
    { id: "F12", label: "F12", sub: "Vol+", widthU: 1, hidUsage: 0x700000045, macosKeycode: 111 },
    { id: "Delete", label: "Del", sub: "Ins", widthU: 1, hidUsage: 0x70000004c, macosKeycode: 117 },
    { id: "TftModule", label: "TFT", sub: "128x128", widthU: 1.2, hidUsage: 0, macosKeycode: -1, specialType: "tft" },
    { id: "KnobPress", label: "KNOB", sub: "Vol/Mute", widthU: 1, hidUsage: 0xc000000e2, macosKeycode: 74, specialType: "knob" },
  ],
  [
    { id: "Backquote", label: "` ~", sub: "BT1", widthU: 1, hidUsage: 0x700000035, macosKeycode: 50 },
    { id: "Digit1", label: "1 !", sub: "BT 1", widthU: 1, hidUsage: 0x70000001e, macosKeycode: 18 },
    { id: "Digit2", label: "2 @", sub: "BT 2", widthU: 1, hidUsage: 0x70000001f, macosKeycode: 19 },
    { id: "Digit3", label: "3 #", sub: "BT 3", widthU: 1, hidUsage: 0x700000020, macosKeycode: 20 },
    { id: "Digit4", label: "4 $", sub: "2.4G", widthU: 1, hidUsage: 0x700000021, macosKeycode: 21 },
    { id: "Digit5", label: "5 %", sub: "USB", widthU: 1, hidUsage: 0x700000022, macosKeycode: 23 },
    { id: "Digit6", label: "6 ^", sub: "", widthU: 1, hidUsage: 0x700000023, macosKeycode: 22 },
    { id: "Digit7", label: "7 &", sub: "", widthU: 1, hidUsage: 0x700000024, macosKeycode: 26 },
    { id: "Digit8", label: "8 *", sub: "", widthU: 1, hidUsage: 0x700000025, macosKeycode: 28 },
    { id: "Digit9", label: "9 (", sub: "", widthU: 1, hidUsage: 0x700000026, macosKeycode: 25 },
    { id: "Digit0", label: "0 )", sub: "", widthU: 1, hidUsage: 0x700000027, macosKeycode: 29 },
    { id: "Minus", label: "- _", sub: "", widthU: 1, hidUsage: 0x70000002d, macosKeycode: 27 },
    { id: "Equal", label: "= +", sub: "", widthU: 1, hidUsage: 0x70000002e, macosKeycode: 24 },
    { id: "Backspace", label: "Backspace", sub: "RGB Reset", widthU: 2, hidUsage: 0x70000002a, macosKeycode: 51 },
    { id: "PageUp", label: "PgUp", sub: "PrtSc", widthU: 1, hidUsage: 0x70000004b, macosKeycode: 116 },
  ],
  [
    { id: "Tab", label: "Tab", sub: "", widthU: 1.5, hidUsage: 0x70000002b, macosKeycode: 48 },
    { id: "KeyQ", label: "Q", sub: "", widthU: 1, hidUsage: 0x700000014, macosKeycode: 12 },
    { id: "KeyW", label: "W", sub: "Up", widthU: 1, hidUsage: 0x70000001a, macosKeycode: 13 },
    { id: "KeyE", label: "E", sub: "", widthU: 1, hidUsage: 0x700000008, macosKeycode: 14 },
    { id: "KeyR", label: "R", sub: "", widthU: 1, hidUsage: 0x700000015, macosKeycode: 15 },
    { id: "KeyT", label: "T", sub: "", widthU: 1, hidUsage: 0x700000017, macosKeycode: 17 },
    { id: "KeyY", label: "Y", sub: "", widthU: 1, hidUsage: 0x70000001c, macosKeycode: 16 },
    { id: "KeyU", label: "U", sub: "", widthU: 1, hidUsage: 0x700000018, macosKeycode: 32 },
    { id: "KeyI", label: "I", sub: "", widthU: 1, hidUsage: 0x70000000c, macosKeycode: 34 },
    { id: "KeyO", label: "O", sub: "", widthU: 1, hidUsage: 0x700000012, macosKeycode: 31 },
    { id: "KeyP", label: "P", sub: "", widthU: 1, hidUsage: 0x700000013, macosKeycode: 35 },
    { id: "BracketLeft", label: "[ {", sub: "", widthU: 1, hidUsage: 0x70000002f, macosKeycode: 33 },
    { id: "BracketRight", label: "] }", sub: "", widthU: 1, hidUsage: 0x700000030, macosKeycode: 30 },
    { id: "Backslash", label: "\\ |", sub: "RGB Mode", widthU: 1.5, hidUsage: 0x700000031, macosKeycode: 42 },
    { id: "PageDown", label: "PgDn", sub: "Pause", widthU: 1, hidUsage: 0x70000004e, macosKeycode: 121 },
  ],
  [
    { id: "CapsLock", label: "Caps", sub: "Lock", widthU: 1.75, hidUsage: 0x700000039, macosKeycode: 57 },
    { id: "KeyA", label: "A", sub: "Win Mode", widthU: 1, hidUsage: 0x700000004, macosKeycode: 0 },
    { id: "KeyS", label: "S", sub: "Mac Mode", widthU: 1, hidUsage: 0x700000016, macosKeycode: 1 },
    { id: "KeyD", label: "D", sub: "Right", widthU: 1, hidUsage: 0x700000007, macosKeycode: 2 },
    { id: "KeyF", label: "F", sub: "", widthU: 1, hidUsage: 0x700000009, macosKeycode: 3 },
    { id: "KeyG", label: "G", sub: "", widthU: 1, hidUsage: 0x70000000a, macosKeycode: 5 },
    { id: "KeyH", label: "H", sub: "", widthU: 1, hidUsage: 0x70000000b, macosKeycode: 4 },
    { id: "KeyJ", label: "J", sub: "", widthU: 1, hidUsage: 0x70000000d, macosKeycode: 38 },
    { id: "KeyK", label: "K", sub: "", widthU: 1, hidUsage: 0x70000000e, macosKeycode: 40 },
    { id: "KeyL", label: "L", sub: "", widthU: 1, hidUsage: 0x70000000f, macosKeycode: 37 },
    { id: "Semicolon", label: "; :", sub: "", widthU: 1, hidUsage: 0x700000033, macosKeycode: 41 },
    { id: "Quote", label: "' \"", sub: "", widthU: 1, hidUsage: 0x700000034, macosKeycode: 39 },
    { id: "Enter", label: "Enter", sub: "RGB Color", widthU: 2.25, hidUsage: 0x700000028, macosKeycode: 36 },
    { id: "Home", label: "Home", sub: "ScrLk", widthU: 1, hidUsage: 0x70000004a, macosKeycode: 115 },
  ],
  [
    { id: "ShiftLeft", label: "Shift", sub: "", widthU: 2.25, hidUsage: 0x7000000e1, macosKeycode: 56 },
    { id: "KeyZ", label: "Z", sub: "", widthU: 1, hidUsage: 0x70000001d, macosKeycode: 6 },
    { id: "KeyX", label: "X", sub: "", widthU: 1, hidUsage: 0x70000001b, macosKeycode: 7 },
    { id: "KeyC", label: "C", sub: "", widthU: 1, hidUsage: 0x700000006, macosKeycode: 8 },
    { id: "KeyV", label: "V", sub: "", widthU: 1, hidUsage: 0x700000019, macosKeycode: 9 },
    { id: "KeyB", label: "B", sub: "Bat Check", widthU: 1, hidUsage: 0x700000005, macosKeycode: 11 },
    { id: "KeyN", label: "N", sub: "NKRO", widthU: 1, hidUsage: 0x700000011, macosKeycode: 45 },
    { id: "KeyM", label: "M", sub: "", widthU: 1, hidUsage: 0x700000010, macosKeycode: 46 },
    { id: "Comma", label: ", <", sub: "", widthU: 1, hidUsage: 0x700000036, macosKeycode: 43 },
    { id: "Period", label: ". >", sub: "", widthU: 1, hidUsage: 0x700000037, macosKeycode: 47 },
    { id: "Slash", label: "/ ?", sub: "", widthU: 1, hidUsage: 0x700000038, macosKeycode: 44 },
    { id: "ShiftRight", label: "Shift", sub: "", widthU: 1.75, hidUsage: 0x7000000e5, macosKeycode: 60 },
    { id: "ArrowUp", label: "Up", sub: "Bright+", widthU: 1, hidUsage: 0x700000052, macosKeycode: 126 },
    { id: "End", label: "End", sub: "TFT Mode", widthU: 1, hidUsage: 0x70000004d, macosKeycode: 119 },
  ],
  [
    { id: "ControlLeft", label: "Ctrl", sub: "Control", widthU: 1.25, hidUsage: 0x7000000e0, macosKeycode: 59 },
    { id: "MetaLeft", label: "Win/Cmd", sub: "GUI", widthU: 1.25, hidUsage: 0x7000000e3, macosKeycode: 55 },
    { id: "AltLeft", label: "Alt/Opt", sub: "Alt", widthU: 1.25, hidUsage: 0x7000000e2, macosKeycode: 58 },
    { id: "Space", label: "Space (Daxa M82X Ultimate)", sub: "Fn + Backspace: Factory Reset", widthU: 6.25, hidUsage: 0x70000002c, macosKeycode: 49 },
    { id: "AltRight", label: "Alt", sub: "R-Alt", widthU: 1, hidUsage: 0x7000000e6, macosKeycode: 61 },
    { id: "MetaRight", label: "Fn", sub: "Layer 1", widthU: 1, hidUsage: 0x7000000e7, macosKeycode: 54 },
    { id: "ControlRight", label: "Ctrl", sub: "R-Ctrl", widthU: 1, hidUsage: 0x7000000e4, macosKeycode: 62 },
    { id: "ArrowLeft", label: "Left", sub: "Speed-", widthU: 1, hidUsage: 0x700000050, macosKeycode: 123 },
    { id: "ArrowDown", label: "Down", sub: "Bright-", widthU: 1, hidUsage: 0x700000051, macosKeycode: 125 },
    { id: "ArrowRight", label: "Right", sub: "Speed+", widthU: 1, hidUsage: 0x70000004f, macosKeycode: 124 },
  ],
];

export const ALL_M82XU_KEYS: KeyCapSpec[] = M82XU_ROWS.flat();

export const REMAP_TARGETS: RemapTargetOption[] = [
  { label: "Escape", sub: "HID 0x29", category: "nav", hidUsage: 0x700000029 },
  { label: "Delete (Forward)", sub: "HID 0x4C", category: "nav", hidUsage: 0x70000004c },
  { label: "Backspace", sub: "HID 0x2A", category: "nav", hidUsage: 0x70000002a },
  { label: "Home", sub: "Awal Baris", category: "nav", hidUsage: 0x70000004a },
  { label: "End", sub: "Akhir Baris", category: "nav", hidUsage: 0x70000004d },
  { label: "Page Up", sub: "Scroll Atas", category: "nav", hidUsage: 0x70000004b },
  { label: "Page Down", sub: "Scroll Bawah", category: "nav", hidUsage: 0x70000004e },
  { label: "Insert", sub: "HID 0x49", category: "nav", hidUsage: 0x700000049 },
  { label: "Print Screen / F13", sub: "Capture", category: "nav", hidUsage: 0x700000046 },
  { label: "Tab", sub: "HID 0x2B", category: "nav", hidUsage: 0x70000002b },
  { label: "Enter / Return", sub: "HID 0x28", category: "nav", hidUsage: 0x700000028 },
  { label: "Spacebar", sub: "HID 0x2C", category: "nav", hidUsage: 0x70000002c },

  { label: "Left Command", sub: "Mac GUI (0xE3)", category: "modifier", hidUsage: 0x7000000e3 },
  { label: "Left Option", sub: "Mac Alt (0xE2)", category: "modifier", hidUsage: 0x7000000e2 },
  { label: "Left Control", sub: "Mac Ctrl (0xE0)", category: "modifier", hidUsage: 0x7000000e0 },
  { label: "Left Shift", sub: "Shift Kiri (0xE1)", category: "modifier", hidUsage: 0x7000000e1 },
  { label: "Right Command", sub: "R-GUI (0xE7)", category: "modifier", hidUsage: 0x7000000e7 },
  { label: "Right Option", sub: "R-Alt (0xE6)", category: "modifier", hidUsage: 0x7000000e6 },
  { label: "Right Control", sub: "R-Ctrl (0xE4)", category: "modifier", hidUsage: 0x7000000e4 },
  { label: "Caps Lock", sub: "Toggle Caps (0x39)", category: "modifier", hidUsage: 0x700000039 },

  { label: "Mute Audio", sub: "Consumer 0xE2", category: "media", hidUsage: 0xc000000e2 },
  { label: "Volume Up (+)", sub: "Consumer 0xE9", category: "media", hidUsage: 0xc000000e9 },
  { label: "Volume Down (-)", sub: "Consumer 0xEA", category: "media", hidUsage: 0xc000000ea },
  { label: "Play / Pause", sub: "Consumer 0xCD", category: "media", hidUsage: 0xc000000cd },
  { label: "Next Track", sub: "Consumer 0xB5", category: "media", hidUsage: 0xc000000b5 },
  { label: "Prev Track", sub: "Consumer 0xB6", category: "media", hidUsage: 0xc000000b6 },
  { label: "Display Brightness +", sub: "Consumer 0x6F", category: "media", hidUsage: 0xc0000006f },
  { label: "Display Brightness -", sub: "Consumer 0x70", category: "media", hidUsage: 0xc00000070 },
  { label: "Lock Screen (macOS)", sub: "Consumer 0x19E", category: "media", hidUsage: 0xc0000019e },

  { label: "F13 (Macro / Action)", sub: "HID 0x68", category: "function", hidUsage: 0x700000068 },
  { label: "F14 (Macro / Action)", sub: "HID 0x69", category: "function", hidUsage: 0x700000069 },
  { label: "F15 (Macro / Action)", sub: "HID 0x6A", category: "function", hidUsage: 0x70000006a },
  { label: "F16 (Macro / Action)", sub: "HID 0x6B", category: "function", hidUsage: 0x70000006b },
  { label: "F17 (Macro / Action)", sub: "HID 0x6C", category: "function", hidUsage: 0x70000006c },
  { label: "F18 (Macro / Action)", sub: "HID 0x6D", category: "function", hidUsage: 0x70000006d },
  { label: "F19 (Macro / Action)", sub: "HID 0x6E", category: "function", hidUsage: 0x70000006e },
  { label: "F20 (Macro / Action)", sub: "HID 0x6F", category: "function", hidUsage: 0x70000006f },
];

export function makePixelPreset(name: "cyber_bot" | "switch_thock" | "heart_hp"): string[] {
  const bg = "#111315";
  if (name === "heart_hp") {
    const rd = "#ff6b35";
    const hi = "#f3f4f6";
    const rows = [
      "................",
      "..RRRR....RRRR..",
      ".RRHHRR..RRRRRR.",
      "RRHHHHRRRRRRRRRR",
      "RRHHRRRRRRRRRRRR",
      "RRRRRRRRRRRRRRRR",
      "RRRRRRRRRRRRRRRR",
      ".RRRRRRRRRRRRRR.",
      "..RRRRRRRRRRRR..",
      "...RRRRRRRRRR...",
      "....RRRRRRRR....",
      ".....RRRRRR.....",
      "......RRRR......",
      ".......RR.......",
      "................",
      "................",
    ];
    return rows.flatMap((r) =>
      r.split("").map((ch) => (ch === "R" ? rd : ch === "H" ? hi : bg))
    );
  }
  if (name === "switch_thock") {
    const ac = "#ff6b35";
    const wh = "#f3f4f6";
    const sl = "#9ca3af";
    const rows = [
      "......AAAA......",
      "....AAAAAAAA....",
      "......AAAA......",
      "...WWWWWWWWWW...",
      "..WWWWWWWWWWWW..",
      "..WWWWAAAAWWWW..",
      "..WWWWAAAAWWWW..",
      ".SSSSSSSSSSSSSS.",
      ".SSSSSSSSSSSSSS.",
      "..SSSSSSSSSSSS..",
      "..SSSSSSSSSSSS..",
      "...SSSSSSSSSS...",
      ".....AA..AA.....",
      ".....AA..AA.....",
      ".....AA..AA.....",
      "................",
    ];
    return rows.flatMap((r) =>
      r
        .split("")
        .map((ch) => (ch === "A" ? ac : ch === "W" ? wh : ch === "S" ? sl : bg))
    );
  }
  const ac = "#ff6b35";
  const sl = "#9ca3af";
  const wh = "#f3f4f6";
  const rows = [
    "....AAAAAAAA....",
    "..AASSSSSSSSAA..",
    ".AS..........SA.",
    ".A.AA.AAAA.AA.A.",
    "AS.AW.AWWA.WA.SA",
    "AS.AA.AAAA.AA.SA",
    "A..............A",
    "A.SS.AAAAAA.SS.A",
    "A.SS.AWWWWA.SS.A",
    "A..............A",
    "AS.A.A.AA.A.A.SA",
    "AS.AAAAWWAAAA.SA",
    ".A............A.",
    ".ASAAAAAAAAAASA.",
    "..AASSSSSSSSAA..",
    "....AAAAAAAA....",
  ];
  return rows.flatMap((r) =>
    r
      .split("")
      .map((ch) => (ch === "A" ? ac : ch === "S" ? sl : ch === "W" ? wh : bg))
  );
}
