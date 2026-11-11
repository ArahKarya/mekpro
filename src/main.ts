import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  ALL_M82XU_KEYS,
  KeyCapSpec,
  M82XU_ROWS,
  REMAP_TARGETS,
  makePixelPreset,
} from "./layout_m82xu";

interface HardwareFnShortcut {
  key_combo: string;
  category: string;
  description: string;
}

interface DeviceCapabilityReport {
  model_name: string;
  vendor_hex: string;
  product_hex: string;
  connection_mode: string;
  switch_mount: string;
  battery_capacity_mah: number;
  battery_level_status: string;
  south_facing_led: boolean;
  side_led_modes: number;
  main_led_modes: number;
  rotary_encoder: boolean;
  hot_swappable: boolean;
  hardware_fn_shortcuts: HardwareFnShortcut[];
}

interface ConnectedKeyboard {
  id: string;
  vendor_id: number;
  product_id: number;
  vendor_hex: string;
  product_hex: string;
  product_name: string;
  brand_model: string;
  transport: string;
  mac_address: string | null;
  registry_id: string;
  layout_id: string;
  is_pilot: boolean;
  supports_os_remap: boolean;
  supports_raw_hid: boolean;
  active_os_remaps: number;
  chip_family: string;
  capabilities?: DeviceCapabilityReport;
}

interface KeyRemapRule {
  id: string;
  key_id: string;
  layer: number;
  from_hid_usage: number;
  to_hid_usage: number;
  from_label: string;
  to_label: string;
  enabled: boolean;
}

interface MacroStep {
  step_type: string;
  value: string;
  delay_ms: number;
}

interface MacroBinding {
  id: string;
  name: string;
  trigger_key_id: string;
  trigger_keycode: number;
  modifier_filter: string;
  action_type: string;
  payload: string;
  steps: MacroStep[];
  enabled: boolean;
}

interface RgbHardwareConfig {
  effect_mode: string;
  brightness: number;
  speed: number;
  direction: string;
  primary_color: string;
  secondary_color: string;
  per_key_colors: Record<string, string>;
  side_led_mode: number;
  side_led_brightness: number;
  sleep_timeout_min: number;
  debounce_ms: number;
  polling_rate_hz: number;
  nkro_enabled: boolean;
  win_lock: boolean;
  mac_modifier_swap: boolean;
  knob_clockwise: string;
  knob_counter_clockwise: string;
  knob_press: string;
}

interface TftScreenConfig {
  screen_mode: string;
  brightness: number;
  fps: number;
  sync_clock: boolean;
  show_battery: boolean;
  show_connection: boolean;
  banner_text: string;
  accent_hex: string;
  pixel_grid_16x16: string[];
}

interface KeyboardProfile {
  id: string;
  name: string;
  description: string;
  vendor_id: number;
  product_id: number;
  brand_model: string;
  layout_id: string;
  updated_at: string;
  launch_agent_enabled: boolean;
  remaps: KeyRemapRule[];
  macros: MacroBinding[];
  hardware: RgbHardwareConfig;
  tft: TftScreenConfig;
}

interface HidPacketLog {
  timestamp: string;
  direction: string;
  endpoint: string;
  summary: string;
  hex_dump: string;
  status: string;
}

interface LiveKeyEventPayload {
  keycode: number;
  key_id: string;
  key_label: string;
  pressed: boolean;
  timestamp_ms: number;
  delta_since_last_ms: number | null;
  chatter_detected: boolean;
  macro_triggered: string | null;
}

interface ApplySyncResult {
  ok: boolean;
  os_remaps_applied: number;
  launch_agent_installed: boolean;
  raw_hid_transmitted: boolean;
  transport_mode: string;
  message: string;
  packet_logs: HidPacketLog[];
}

type ActiveTab = "remap" | "macro" | "rgb" | "tft" | "capabilities" | "diagnostic";
type ThemeMode = "dark" | "light";

const FALLBACK_PILOT_KEYBOARD: ConnectedKeyboard = {
  id: "25a7:2420",
  vendor_id: 0x25a7,
  product_id: 0x2420,
  vendor_hex: "0x25A7",
  product_hex: "0x2420",
  product_name: "M82XU 5.0",
  brand_model: "Rexus Daxa M82X Ultimate (75% Gasket, Knob, TFT)",
  transport: "Bluetooth Low Energy",
  mac_address: "F4:EE:25:F3:7B:B5",
  registry_id: "0x100028a83",
  layout_id: "m82xu_75",
  is_pilot: true,
  supports_os_remap: true,
  supports_raw_hid: true,
  active_os_remaps: 0,
  chip_family: "Compx / Sino Wealth Tri-Mode (0x25A7)",
};

const FALLBACK_PILOT_PROFILE: KeyboardProfile = {
  id: "pilot-m82xu-mac-pro",
  name: "M82XU : Produktivitas macOS (Pilot)",
  description:
    "Profil utama Rexus Daxa M82X Ultimate (M82XU 5.0) untuk macOS: Swap Win/Alt ke Cmd/Opt, CapsLock ke Escape, dan sinkronisasi jam TFT.",
  vendor_id: 0x25a7,
  product_id: 0x2420,
  brand_model: "Rexus Daxa M82X Ultimate (M82XU 5.0)",
  layout_id: "m82xu_75",
  updated_at: new Date().toISOString(),
  launch_agent_enabled: false,
  remaps: [],
  macros: [],
  hardware: {
    effect_mode: "cyber_wave",
    brightness: 80,
    speed: 60,
    direction: "left_to_right",
    primary_color: "#ff6b35",
    secondary_color: "#f59e0b",
    per_key_colors: {
      Escape: "#ff6b35",
      Enter: "#ff6b35",
    },
    side_led_mode: 1,
    side_led_brightness: 80,
    sleep_timeout_min: 10,
    debounce_ms: 4,
    polling_rate_hz: 1000,
    nkro_enabled: true,
    win_lock: false,
    mac_modifier_swap: false,
    knob_clockwise: "volume_up",
    knob_counter_clockwise: "volume_down",
    knob_press: "mute",
  },
  tft: {
    screen_mode: "clock_status",
    brightness: 85,
    fps: 15,
    sync_clock: true,
    show_battery: true,
    show_connection: true,
    banner_text: "M82XU MEKPRO",
    accent_hex: "#ff6b35",
    pixel_grid_16x16: makePixelPreset("cyber_bot"),
  },
};

let keyboards: ConnectedKeyboard[] = [structuredClone(FALLBACK_PILOT_KEYBOARD)];
let selectedKeyboardId = "25a7:2420";
let profiles: KeyboardProfile[] = [structuredClone(FALLBACK_PILOT_PROFILE)];
let activeProfileIdx = 0;
let activeTab: ActiveTab = "remap";
let activeLayer = 0;
let selectedKeyId = "CapsLock";
let remapFilterCategory: "all" | "nav" | "modifier" | "media" | "function" = "all";
let fnFilterKeyword = "";
let currentTheme: ThemeMode =
  (localStorage.getItem("mekpro_theme") as ThemeMode) || "dark";

let paintColor = "#ff6b35";
let pixelBrushColor = "#ff6b35";
let isPaintingPixel = false;

let is3dView = false;
let camTiltDeg = 36;
let camYawDeg = -8;
let isLightingPaused = false;
let rgbAnimFrameId = 0;

interface KeyMatrixCoord {
  row: number;
  colX: number;
}

const KEY_COORDS_MAP = new Map<string, KeyMatrixCoord>();
M82XU_ROWS.forEach((rowList, rIdx) => {
  let cursorU = 0;
  for (const spec of rowList) {
    if (spec.gapBefore) cursorU += 0.25;
    KEY_COORDS_MAP.set(spec.id, {
      row: rIdx,
      colX: cursorU + spec.widthU * 0.5,
    });
    cursorU += spec.widthU;
  }
});

interface RippleOrigin {
  row: number;
  colX: number;
  timeMs: number;
}

const rippleOrigins: RippleOrigin[] = [];
let cachedKeyDomNodes: Array<{
  id: string;
  el: HTMLElement;
  row: number;
  colX: number;
}> = [];
let cachedChassisEl: HTMLElement | null = null;
let cachedViewportEl: HTMLElement | null = null;
let cachedLiveDotEl: HTMLElement | null = null;

const pressedKeys = new Set<string>();
const testedKeys = new Set<string>();
let maxRolloverCount = 0;
let lastKeyEvent: LiveKeyEventPayload | null = null;
let chatterCount = 0;
let packetLogs: HidPacketLog[] = [];

let isLoading = false;
let loadingMessage = "";
let errorMessage = "";
let statusBannerMessage = "";

const SWATCH_COLORS = [
  "#ff6b35",
  "#f59e0b",
  "#22c55e",
  "#38bdf8",
  "#f43f5e",
  "#f3f4f6",
  "#9ca3af",
  "#111315",
];

function applyThemeToDocument(theme: ThemeMode): void {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("mekpro_theme", theme);
}

function currentProfile(): KeyboardProfile {
  return profiles[activeProfileIdx] || profiles[0] || FALLBACK_PILOT_PROFILE;
}

function currentKeyboard(): ConnectedKeyboard {
  return (
    keyboards.find((k) => k.id === selectedKeyboardId) ||
    keyboards[0] ||
    FALLBACK_PILOT_KEYBOARD
  );
}

function getKeySpec(keyId: string): KeyCapSpec {
  return ALL_M82XU_KEYS.find((k) => k.id === keyId) || ALL_M82XU_KEYS[0];
}

function setupDialogFallbacks(): void {
  // Check pointer coordinates instead of event.target because clicking dialog padding targets the dialog element itself.
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    const outside = (e: PointerEvent, dialog: HTMLDialogElement) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener("pointerdown", (e) => {
        pressedOutside = outside(e, dialog);
      });
      dialog.addEventListener("pointerup", (e) => {
        if (pressedOutside && outside(e, dialog)) dialog.close();
      });
    }
  }

  for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog")) {
    dialog.addEventListener("close", () => {
      dialog.returnValue = "";
    });
  }
}

async function initApp(): Promise<void> {
  applyThemeToDocument(currentTheme);
  setupDialogFallbacks();
  wireModalControls();

  isLoading = true;
  loadingMessage = "Memindai perangkat HID pada bus macOS...";
  renderApp();

  try {
    const scanned = await invoke<ConnectedKeyboard[]>("scan_keyboards");
    if (Array.isArray(scanned) && scanned.length > 0) {
      keyboards = scanned;
    }
    const loadedProfiles = await invoke<KeyboardProfile[]>("get_profiles");
    if (Array.isArray(loadedProfiles) && loadedProfiles.length > 0) {
      profiles = loadedProfiles;
    }
    errorMessage = "";
  } catch {
    keyboards = [structuredClone(FALLBACK_PILOT_KEYBOARD)];
    profiles = [structuredClone(FALLBACK_PILOT_PROFILE)];
  } finally {
    isLoading = false;
    loadingMessage = "";
  }

  if (keyboards.length > 0) {
    selectedKeyboardId = keyboards[0].id;
  }

  try {
    await listen<LiveKeyEventPayload>("mekpro://key-event", (event) => {
      handleLiveKeyEvent(event.payload);
    });
  } catch {
    // Falls back to DOM keydown/keyup below when running outside the Tauri shell.
  }

  window.addEventListener("keydown", (e) => {
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      return;
    }
    const matched = ALL_M82XU_KEYS.find((k) => k.id === e.code);
    if (matched && !e.repeat) {
      handleLiveKeyEvent({
        keycode: matched.macosKeycode,
        key_id: matched.id,
        key_label: matched.label,
        pressed: true,
        timestamp_ms: Date.now(),
        delta_since_last_ms: null,
        chatter_detected: false,
        macro_triggered: null,
      });
    }
  });

  window.addEventListener("keyup", (e) => {
    const matched = ALL_M82XU_KEYS.find((k) => k.id === e.code);
    if (matched) {
      handleLiveKeyEvent({
        keycode: matched.macosKeycode,
        key_id: matched.id,
        key_label: matched.label,
        pressed: false,
        timestamp_ms: Date.now(),
        delta_since_last_ms: null,
        chatter_detected: false,
        macro_triggered: null,
      });
    }
  });

  window.addEventListener("pointerup", () => {
    isPaintingPixel = false;
  });

  renderApp();
  startRgbAnimationLoop();
  triggerRippleAtKey("KeyF");
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const num = parseInt(clean, 16);
  if (Number.isNaN(num) || clean.length < 6) return [255, 107, 53];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * clamped),
    Math.round(a[1] + (b[1] - a[1]) * clamped),
    Math.round(a[2] + (b[2] - a[2]) * clamped),
  ];
}

function hslToRgbTuple(hDeg: number, s: number, l: number): [number, number, number] {
  const h = ((hDeg % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

function triggerRippleAtKey(keyId: string): void {
  const coord = KEY_COORDS_MAP.get(keyId);
  if (!coord) return;
  rippleOrigins.push({
    row: coord.row,
    colX: coord.colX,
    timeMs: performance.now(),
  });
  if (rippleOrigins.length > 14) {
    rippleOrigins.shift();
  }
}

function triggerDemoRippleSequence(): void {
  const demoKeys = ["Escape", "KeyW", "KeyF", "KeyJ", "Enter", "Space"];
  demoKeys.forEach((kid, idx) => {
    window.setTimeout(() => {
      triggerRippleAtKey(kid);
      const el = document.querySelector<HTMLElement>(`[data-key-id="${kid}"]`);
      if (el) {
        el.classList.add("pressed");
        window.setTimeout(() => el.classList.remove("pressed"), 160);
      }
    }, idx * 120);
  });
}

function refreshCachedLightingDom(): void {
  cachedChassisEl = document.querySelector<HTMLElement>(".m82xu-chassis");
  cachedViewportEl = document.querySelector<HTMLElement>(".chassis-scroll-wrap");
  cachedLiveDotEl = document.getElementById("led-live-dot");
  cachedKeyDomNodes = [];
  for (const el of document.querySelectorAll<HTMLElement>(".keycap[data-key-id]")) {
    const id = el.getAttribute("data-key-id") || "";
    const coord = KEY_COORDS_MAP.get(id) || { row: 0, colX: 0 };
    cachedKeyDomNodes.push({ id, el, row: coord.row, colX: coord.colX });
  }
}

function tickRgbLightingFrame(nowMs: number): void {
  const prof = currentProfile();
  const hw = prof.hardware;
  const brightFactor = Math.max(0, Math.min(1, hw.brightness / 100));
  const speedHz = 0.35 + (hw.speed / 100) * 3.4;
  const timeSec = isLightingPaused ? 0 : (nowMs / 1000) * speedHz;

  const primaryRgb = hexToRgbTuple(hw.primary_color || "#ff6b35");
  const secondaryRgb = hexToRgbTuple(hw.secondary_color || "#f59e0b");

  // Prune old ripples older than 1250ms
  while (rippleOrigins.length > 0 && nowMs - rippleOrigins[0].timeMs > 1250) {
    rippleOrigins.shift();
  }

  if (hw.effect_mode === "off" || brightFactor <= 0.01) {
    for (const node of cachedKeyDomNodes) {
      node.el.style.setProperty("--led-color", "#2b303a");
      node.el.style.setProperty("--led-glow", "rgba(0, 0, 0, 0)");
      node.el.style.setProperty("--led-top-tint", "rgba(0, 0, 0, 0)");
    }
    cachedChassisEl?.style.setProperty("--plate-ambient-glow", "rgba(0, 0, 0, 0)");
    cachedChassisEl?.style.setProperty("--underglow-strip-color", "#374151");
    cachedViewportEl?.style.setProperty("--plate-ambient-glow", "rgba(0, 0, 0, 0)");
    cachedLiveDotEl?.style.setProperty("--live-dot-color", "#4b5563");
  } else {
    let centerSampleRgb: [number, number, number] = primaryRgb;

    for (const node of cachedKeyDomNodes) {
      let rgb: [number, number, number] = primaryRgb;
      let keyIntensity = brightFactor;

      if (hw.effect_mode === "static_per_key") {
        const customHex = hw.per_key_colors[node.id] || hw.primary_color;
        rgb = hexToRgbTuple(customHex);
      } else if (hw.effect_mode === "cyber_wave") {
        let spatialPhase = node.colX * 0.42 + node.row * 0.15;
        if (hw.direction === "right_to_left") {
          spatialPhase = -node.colX * 0.42 + node.row * 0.15;
        } else if (hw.direction === "outward") {
          spatialPhase = Math.hypot(node.colX - 7.5, (node.row - 2.5) * 1.4) * 0.65;
        }
        const wave = 0.5 + 0.5 * Math.sin(spatialPhase - timeSec * 2.4);
        rgb = lerpRgb(secondaryRgb, primaryRgb, wave);
        keyIntensity = brightFactor * (0.45 + 0.55 * wave);
      } else if (hw.effect_mode === "breathing") {
        const breath = 0.5 + 0.5 * Math.sin(timeSec * 2.1);
        const colorMix = 0.5 + 0.5 * Math.cos(timeSec * 1.05 + node.row * 0.12);
        rgb = lerpRgb(secondaryRgb, primaryRgb, colorMix);
        keyIntensity = brightFactor * (0.15 + 0.85 * breath);
      } else if (hw.effect_mode === "spectrum") {
        let dirSign = 1;
        let offset = node.colX * 18 + node.row * 10;
        if (hw.direction === "right_to_left") {
          dirSign = -1;
        } else if (hw.direction === "outward") {
          offset = Math.hypot(node.colX - 7.5, (node.row - 2.5) * 1.4) * 28;
        }
        const hue = offset * dirSign - timeSec * 95;
        rgb = hslToRgbTuple(hue, 0.9, 0.56);
      } else if (hw.effect_mode === "reactive_thock") {
        let rippleBoost = 0;
        for (const origin of rippleOrigins) {
          const ageSec = (nowMs - origin.timeMs) / 1000;
          const dist = Math.hypot(node.colX - origin.colX, (node.row - origin.row) * 1.35);
          const waveRadius = ageSec * (6.5 + (hw.speed / 100) * 8.0);
          const ringDelta = Math.abs(dist - waveRadius);
          if (ringDelta < 2.2) {
            const localStrength = (1 - ringDelta / 2.2) * Math.max(0, 1 - ageSec / 1.2);
            if (localStrength > rippleBoost) rippleBoost = localStrength;
          }
        }
        if (pressedKeys.has(node.id)) {
          rippleBoost = 1;
        }
        rgb = lerpRgb(secondaryRgb, primaryRgb, rippleBoost);
        keyIntensity = brightFactor * (0.18 + 0.82 * rippleBoost);
      }

      if (node.id === "KeyG") {
        centerSampleRgb = rgb;
      }

      const [r, g, b] = rgb;
      const glowAlpha = (0.28 + 0.58 * keyIntensity).toFixed(2);
      const tintAlpha = (0.16 + 0.42 * keyIntensity).toFixed(2);
      const scaledR = Math.round(r * (0.3 + 0.7 * keyIntensity));
      const scaledG = Math.round(g * (0.3 + 0.7 * keyIntensity));
      const scaledB = Math.round(b * (0.3 + 0.7 * keyIntensity));

      node.el.style.setProperty("--led-color", `rgb(${scaledR}, ${scaledG}, ${scaledB})`);
      node.el.style.setProperty("--led-glow", `rgba(${r}, ${g}, ${b}, ${glowAlpha})`);
      node.el.style.setProperty("--led-top-tint", `rgba(${r}, ${g}, ${b}, ${tintAlpha})`);
    }

    const [cr, cg, cb] = centerSampleRgb;
    const plateAlpha = (0.18 + 0.28 * brightFactor).toFixed(2);
    const ambientCss = `rgba(${cr}, ${cg}, ${cb}, ${plateAlpha})`;
    const stripCss = `rgb(${cr}, ${cg}, ${cb})`;
    cachedChassisEl?.style.setProperty("--plate-ambient-glow", ambientCss);
    cachedChassisEl?.style.setProperty("--underglow-strip-color", stripCss);
    cachedViewportEl?.style.setProperty("--plate-ambient-glow", ambientCss);
    cachedLiveDotEl?.style.setProperty("--live-dot-color", stripCss);
  }

  rgbAnimFrameId = window.requestAnimationFrame(tickRgbLightingFrame);
}

function startRgbAnimationLoop(): void {
  if (rgbAnimFrameId) {
    window.cancelAnimationFrame(rgbAnimFrameId);
  }
  rgbAnimFrameId = window.requestAnimationFrame(tickRgbLightingFrame);
}

function handleLiveKeyEvent(payload: LiveKeyEventPayload): void {
  lastKeyEvent = payload;
  if (payload.pressed) {
    pressedKeys.add(payload.key_id);
    testedKeys.add(payload.key_id);
    triggerRippleAtKey(payload.key_id);
    if (pressedKeys.size > maxRolloverCount) {
      maxRolloverCount = pressedKeys.size;
    }
    if (payload.chatter_detected) {
      chatterCount += 1;
    }
  } else {
    pressedKeys.delete(payload.key_id);
  }

  const keyEl = document.querySelector<HTMLElement>(`[data-key-id="${payload.key_id}"]`);
  if (keyEl) {
    keyEl.classList.toggle("pressed", payload.pressed);
    keyEl.classList.add("tested");
  }

  const rolloverEl = document.getElementById("live-rollover-val");
  if (rolloverEl) {
    rolloverEl.textContent = `${pressedKeys.size} aktif (${maxRolloverCount} maks NKRO)`;
  }
  const testedEl = document.getElementById("live-tested-val");
  if (testedEl) {
    testedEl.textContent = `${testedKeys.size} / ${ALL_M82XU_KEYS.length - 1}`;
  }
  const lastKeyEl = document.getElementById("live-last-key-val");
  if (lastKeyEl) {
    const deltaStr =
      payload.delta_since_last_ms !== null ? ` (selisih ${payload.delta_since_last_ms}ms)` : "";
    lastKeyEl.textContent = `${payload.key_label} [Kode ${payload.keycode}]${deltaStr}`;
  }
  const chatterEl = document.getElementById("live-chatter-val");
  if (chatterEl) {
    chatterEl.textContent =
      chatterCount === 0 ? "0 pantulan (Switch Normal)" : `${chatterCount} pantulan (<25ms)`;
  }
}

function wireModalControls(): void {
  const copyBtn = document.getElementById("btn-copy-json");
  const downloadBtn = document.getElementById("btn-download-json");
  const importBtn = document.getElementById("btn-import-json-apply");
  const textarea = document.getElementById("profile-json-textarea") as HTMLTextAreaElement | null;
  const jsonDialog = document.getElementById("profile-json-dialog") as HTMLDialogElement | null;

  copyBtn?.addEventListener("click", async () => {
    if (textarea) {
      await navigator.clipboard.writeText(textarea.value);
      statusBannerMessage = "JSON profil disalin ke clipboard.";
      renderApp();
    }
  });

  downloadBtn?.addEventListener("click", () => {
    if (!textarea) return;
    const blob = new Blob([textarea.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProfile().id || "keyboard-profile"}.mekpro.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn?.addEventListener("click", async () => {
    if (!textarea) return;
    try {
      const parsed = JSON.parse(textarea.value) as KeyboardProfile;
      if (!parsed.id || !parsed.hardware) {
        throw new Error("Struktur JSON tidak memiliki atribut id atau hardware.");
      }
      const existingIdx = profiles.findIndex((p) => p.id === parsed.id);
      if (existingIdx >= 0) {
        profiles[existingIdx] = parsed;
        activeProfileIdx = existingIdx;
      } else {
        profiles.push(parsed);
        activeProfileIdx = profiles.length - 1;
      }
      errorMessage = "";
      jsonDialog?.close();
      await applyCurrentProfile();
    } catch (e) {
      errorMessage = `Gagal memuat JSON profil: ${String(e)}. Periksa tanda kurung kurawal pada JSON lalu coba lagi.`;
      jsonDialog?.close();
      renderApp();
    }
  });

  const presetSelect = document.getElementById("preset-oem-select") as HTMLSelectElement | null;
  const nameInput = document.getElementById("custom-board-name") as HTMLInputElement | null;
  const vidInput = document.getElementById("custom-board-vid") as HTMLInputElement | null;
  const pidInput = document.getElementById("custom-board-pid") as HTMLInputElement | null;
  const createBoardBtn = document.getElementById("btn-create-custom-board");
  const boardDialog = document.getElementById("custom-board-dialog") as HTMLDialogElement | null;

  presetSelect?.addEventListener("change", () => {
    const parts = presetSelect.value.split(":");
    if (parts.length >= 3 && vidInput && pidInput && nameInput) {
      vidInput.value = `0x${parts[0].toUpperCase()}`;
      pidInput.value = `0x${parts[1].toUpperCase()}`;
      nameInput.value = parts.slice(2).join(":");
    }
  });

  createBoardBtn?.addEventListener("click", async () => {
    if (!nameInput || !vidInput || !pidInput) return;
    const vid = parseInt(vidInput.value.replace(/^0x/i, ""), 16) || 0x25a7;
    const pid = parseInt(pidInput.value.replace(/^0x/i, ""), 16) || 0x2420;
    const base = structuredClone(currentProfile());
    base.id = `custom-${vid.toString(16)}-${pid.toString(16)}-${Date.now().toString().slice(-4)}`;
    base.name = nameInput.value.trim() || "Profil Keyboard Mechanical Baru";
    base.brand_model = nameInput.value.trim() || "Keyboard Mechanical HID";
    base.vendor_id = vid;
    base.product_id = pid;
    base.updated_at = new Date().toISOString();
    profiles.push(base);
    activeProfileIdx = profiles.length - 1;
    boardDialog?.close();
    await applyCurrentProfile();
  });
}

async function applyCurrentProfile(): Promise<void> {
  const prof = currentProfile();
  prof.updated_at = new Date().toISOString();
  isLoading = true;
  loadingMessage = "Menerapkan pemetaan IOHIDSystem dan menyusun paket protokol...";
  errorMessage = "";
  renderApp();

  try {
    const res = await invoke<ApplySyncResult>("save_and_apply_profile", { profile: prof });
    statusBannerMessage = res.message;
    packetLogs = [...res.packet_logs, ...packetLogs].slice(0, 25);
    keyboards = await invoke<ConnectedKeyboard[]>("scan_keyboards");
  } catch (err) {
    errorMessage = `Sinkronisasi ke perangkat mengalami kendala: ${String(err)}. Pastikan izin akses HID aktif lalu klik Coba Lagi.`;
  } finally {
    isLoading = false;
    loadingMessage = "";
  }
  renderApp();
}

async function resetDeviceToFactory(): Promise<void> {
  const prof = currentProfile();
  prof.remaps = [];
  prof.hardware.mac_modifier_swap = false;
  isLoading = true;
  loadingMessage = "Mengembalikan pemetaan tombol ke konfigurasi pabrik...";
  errorMessage = "";
  renderApp();

  try {
    const msg = await invoke<string>("reset_device_remaps", {
      vid: prof.vendor_id,
      pid: prof.product_id,
    });
    await invoke<ApplySyncResult>("save_and_apply_profile", { profile: prof });
    keyboards = await invoke<ConnectedKeyboard[]>("scan_keyboards");
    statusBannerMessage = msg;
  } catch (err) {
    errorMessage = `Gagal mereset perangkat: ${String(err)}.`;
  } finally {
    isLoading = false;
    loadingMessage = "";
  }
  renderApp();
}

function computeKeycapStyle(keySpec: KeyCapSpec, prof: KeyboardProfile): string {
  const widthPx = Math.round(keySpec.widthU * 54 + (keySpec.widthU - 1) * 5);
  const hw = prof.hardware;

  if (hw.effect_mode !== "off") {
    const customHex = hw.per_key_colors[keySpec.id];
    if (hw.effect_mode === "static_per_key" && customHex) {
      return `width: ${widthPx}px; border-color: ${customHex};`;
    }
  }

  return `width: ${widthPx}px;`;
}

function renderKeycap(keySpec: KeyCapSpec, prof: KeyboardProfile): string {
  const gapHtml = keySpec.gapBefore ? `<div class="kb-gap"></div>` : "";

  if (keySpec.specialType === "tft") {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const connBadge = currentKeyboard()?.transport.includes("Bluetooth") ? "BLE" : "USB";
    return `
      ${gapHtml}
      <button type="button" class="tft-module" data-action="open-tft-tab" title="Klik untuk kustomisasi Layar TFT M82X Ultimate">
        <div class="tft-header-mini">
          <span>${connBadge}</span>
          <span>82K</span>
        </div>
        <div class="tft-body-mini">${
          prof.tft.screen_mode === "clock_status" ? hhmm : prof.tft.banner_text.slice(0, 8)
        }</div>
        <div class="tft-footer-mini">${prof.tft.banner_text.slice(0, 11)}</div>
      </button>
    `;
  }

  if (keySpec.specialType === "knob") {
    const isSel = selectedKeyId === keySpec.id ? "selected" : "";
    return `
      ${gapHtml}
      <button type="button" class="rotary-knob ${isSel}" data-key-id="${keySpec.id}" title="CNC Rotary Knob: Klik untuk atur fungsi tekan">
        <span>KNOB</span>
        <small>${prof.hardware.knob_press.toUpperCase()}</small>
      </button>
    `;
  }

  const isSelected = selectedKeyId === keySpec.id ? "selected" : "";
  const isPressed = pressedKeys.has(keySpec.id) ? "pressed" : "";
  const isTested = testedKeys.has(keySpec.id) ? "tested" : "";
  const remapRule = prof.remaps.find(
    (r) => r.key_id === keySpec.id && r.layer === activeLayer && r.enabled
  );
  const hasMacro = prof.macros.some((m) => m.trigger_key_id === keySpec.id && m.enabled);

  let topLegend = keySpec.label;
  let subLegend = keySpec.sub;
  if (
    prof.hardware.mac_modifier_swap &&
    (keySpec.id === "MetaLeft" || keySpec.id === "AltLeft")
  ) {
    topLegend = keySpec.id === "MetaLeft" ? "Option" : "Command";
    subLegend = "Mac Swap";
  }
  if (remapRule) {
    subLegend = `Ke: ${remapRule.to_label}`;
  }

  return `
    ${gapHtml}
    <button
      type="button"
      class="keycap ${isSelected} ${isPressed} ${isTested} ${remapRule ? "remapped" : ""} ${
    hasMacro ? "has-macro" : ""
  }"
      style="${computeKeycapStyle(keySpec, prof)}"
      data-key-id="${keySpec.id}"
      title="${keySpec.label} (${keySpec.id})"
    >
      <div class="keycap-top">
        <span>${topLegend}</span>
      </div>
      <div class="keycap-sub">${subLegend}</div>
    </button>
  `;
}

function renderRemapTab(prof: KeyboardProfile): string {
  const keySpec = getKeySpec(selectedKeyId);
  const remapRule = prof.remaps.find(
    (r) => r.key_id === keySpec.id && r.layer === activeLayer && r.enabled
  );
  const filteredTargets = REMAP_TARGETS.filter(
    (t) => remapFilterCategory === "all" || t.category === remapFilterCategory
  );

  return `
    <div class="workspace-grid">
      <section class="panel-card">
        <h2>
          <span>1. Studio Pemetaan Tombol</span>
          <span class="mono" style="font-size:0.75rem; color: var(--text-muted)">IOHIDEventSystem</span>
        </h2>

        <div class="selected-key-hero">
          <div class="selected-key-badge-wrap">
            <div class="selected-key-visual-badge">${keySpec.label}</div>
            <div class="selected-key-meta">
              <div class="selected-key-title">Tombol Aktif: [${keySpec.label}] (${keySpec.id})</div>
              <div class="selected-key-status">
                Fungsi Sekarang: <strong>${remapRule ? remapRule.to_label : "Standar (" + keySpec.label + ")"}</strong>
                <span class="mono" style="font-size:0.74rem; color: var(--text-muted); margin-left: 6px;">[HID 0x${keySpec.hidUsage.toString(16).toUpperCase()}]</span>
              </div>
            </div>
          </div>
          <div class="quick-action-row">
            ${
              remapRule
                ? `<button type="button" class="btn-secondary" id="btn-quick-reset-key">Reset ke Default</button>`
                : ""
            }
            <button type="button" class="btn-secondary" data-quick-assign="0x29" data-quick-label="Escape">Jadikan Escape</button>
          </div>
        </div>

        <p class="panel-desc">
          Pilih fungsi baru dari katalog di bawah. Pemetaan akan langsung diaktifkan pada layer ${activeLayer} khusus untuk perangkat ini tanpa mengganggu keyboard laptop macOS.
        </p>

        <div class="filter-pills-bar">
          <button type="button" class="filter-pill ${remapFilterCategory === "all" ? "active" : ""}" data-remap-cat="all">Semua Fungsi</button>
          <button type="button" class="filter-pill ${remapFilterCategory === "nav" ? "active" : ""}" data-remap-cat="nav">Navigasi &amp; Teks</button>
          <button type="button" class="filter-pill ${remapFilterCategory === "modifier" ? "active" : ""}" data-remap-cat="modifier">Modifier &amp; Mac</button>
          <button type="button" class="filter-pill ${remapFilterCategory === "media" ? "active" : ""}" data-remap-cat="media">Media &amp; Audio</button>
          <button type="button" class="filter-pill ${remapFilterCategory === "function" ? "active" : ""}" data-remap-cat="function">F13 sampai F20</button>
        </div>

        <div class="target-key-grid">
          ${filteredTargets
            .map(
              (t) => `
            <button
              type="button"
              class="remap-target-btn"
              data-assign-usage="${t.hidUsage}"
              data-assign-label="${t.label}"
            >
              <strong>${t.label}</strong>
              <small>${t.sub}</small>
            </button>
          `
            )
            .join("")}
        </div>
      </section>

      <section class="panel-card">
        <h2>
          <span>2. Konfigurasi Rotary Knob &amp; Daftar Pemetaan Aktif (${prof.remaps.length})</span>
        </h2>
        <div class="form-grid">
          <label class="field-label" for="knob-press-select">
            <span>Aksi Tekan Rotary Knob</span>
            <select id="knob-press-select">
              <option value="mute" ${prof.hardware.knob_press === "mute" ? "selected" : ""}>Mute / Unmute Audio (Standar)</option>
              <option value="play_pause" ${prof.hardware.knob_press === "play_pause" ? "selected" : ""}>Play / Pause Media</option>
              <option value="mission_control" ${prof.hardware.knob_press === "mission_control" ? "selected" : ""}>Mission Control (macOS)</option>
              <option value="screen_lock" ${prof.hardware.knob_press === "screen_lock" ? "selected" : ""}>Kunci Layar (macOS)</option>
            </select>
          </label>
          <div class="field-label">
            <span>Penyesuaian Modifier macOS</span>
            <label class="checkbox-row" for="mac-swap-checkbox">
              <input type="checkbox" id="mac-swap-checkbox" ${prof.hardware.mac_modifier_swap ? "checked" : ""} />
              <span>Tukar posisi Win dan Alt menjadi Option dan Command</span>
            </label>
          </div>
        </div>

        <div class="rule-list">
          ${
            prof.remaps.length === 0
              ? `<div class="state-box"><span>Belum ada pemetaan tombol khusus pada profil ini. Klik tombol mana saja pada matriks keyboard di atas, lalu pilih fungsi barunya di kolom kiri untuk membuat pemetaan pertama.</span></div>`
              : prof.remaps
                  .map(
                    (r, idx) => `
              <div class="rule-item">
                <div>
                  <strong>[${r.from_label}]</strong> dipetakan ke <strong>[${r.to_label}]</strong>
                  <div class="mono" style="font-size:0.74rem; color: var(--text-muted)">
                    0x${r.from_hid_usage.toString(16).toUpperCase()} ke 0x${r.to_hid_usage.toString(16).toUpperCase()}
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <label class="checkbox-row">
                    <input type="checkbox" data-toggle-remap="${idx}" ${r.enabled ? "checked" : ""} />
                    <span>Aktif</span>
                  </label>
                  <button type="button" class="btn-danger" data-delete-remap="${idx}">Hapus</button>
                </div>
              </div>
            `
                  )
                  .join("")
          }
        </div>
      </section>
    </div>
  `;
}

function renderMacroTab(prof: KeyboardProfile): string {
  const keySpec = getKeySpec(selectedKeyId);
  return `
    <div class="workspace-grid">
      <section class="panel-card">
        <h2>
          <span>1. Buat Macro atau Pintasan pada Tombol [${keySpec.label}]</span>
        </h2>
        <p class="panel-desc">
          Pasang perintah otomatis pada tombol yang dipilih untuk mengetikkan teks, membuka aplikasi macOS, atau menjalankan skrip shell.
        </p>
        <div class="form-grid">
          <label class="field-label" for="macro-name-input">
            <span>Nama Macro</span>
            <input type="text" id="macro-name-input" placeholder="Contoh: Buka Terminal" value="Pintasan ${keySpec.label}" />
          </label>
          <label class="field-label" for="macro-type-select">
            <span>Jenis Aksi</span>
            <select id="macro-type-select">
              <option value="text">Ketikkan Teks Otomatis (Snippet)</option>
              <option value="app">Buka Aplikasi macOS (open -a)</option>
              <option value="shell">Jalankan Perintah Shell (sh -c)</option>
              <option value="system">Aksi Sistem macOS (Screenshot / Mission Control)</option>
            </select>
          </label>
        </div>
        <label class="field-label" for="macro-payload-input">
          <span>Parameter Aksi (Nama Aplikasi, Teks, atau Perintah Shell)</span>
          <input type="text" id="macro-payload-input" placeholder="Contoh: Terminal atau git status" value="Terminal" />
        </label>
        <div>
          <button type="button" class="btn-primary" id="btn-add-macro">Simpan Macro pada Tombol [${keySpec.label}]</button>
        </div>
      </section>

      <section class="panel-card">
        <h2>
          <span>2. Daftar Macro Tersimpan (${prof.macros.length})</span>
        </h2>
        <div class="rule-list">
          ${
            prof.macros.length === 0
              ? `<div class="state-box"><span>Belum ada macro pada profil ini. Isi formulir di kolom kiri lalu klik Simpan Macro untuk menambahkan pintasan otomatis.</span></div>`
              : prof.macros
                  .map(
                    (m, idx) => `
              <div class="rule-item">
                <div>
                  <strong>${m.name}</strong> (Pemicu: <span class="mono">[${m.trigger_key_id}]</span>)
                  <div class="mono" style="font-size:0.75rem; color: var(--text-muted)">
                    ${m.action_type.toUpperCase()}: ${m.payload}
                  </div>
                </div>
                <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
                  <button type="button" class="btn-secondary" data-test-macro="${idx}">Uji Jalan</button>
                  <label class="checkbox-row">
                    <input type="checkbox" data-toggle-macro="${idx}" ${m.enabled ? "checked" : ""} />
                    <span>Aktif</span>
                  </label>
                  <button type="button" class="btn-danger" data-delete-macro="${idx}">Hapus</button>
                </div>
              </div>
            `
                  )
                  .join("")
          }
        </div>
      </section>
    </div>
  `;
}

function renderRgbHardwareTab(prof: KeyboardProfile): string {
  const hw = prof.hardware;
  const keySpec = getKeySpec(selectedKeyId);
  return `
    <div class="workspace-grid">
      <section class="panel-card">
        <h2>
          <span>1. Konfigurasi Backlight RGB &amp; Warna Per-Tombol</span>
          <span class="mono" style="font-size:0.75rem; color: var(--text-muted)">Report 0x04 (64-Byte)</span>
        </h2>
        <div class="form-grid">
          <label class="field-label" for="rgb-mode-select">
            <span>Mode Efek Pencahayaan</span>
            <select id="rgb-mode-select">
              <option value="cyber_wave" ${hw.effect_mode === "cyber_wave" ? "selected" : ""}>Gelombang Dinamis (Wave)</option>
              <option value="static_per_key" ${hw.effect_mode === "static_per_key" ? "selected" : ""}>Statis Per-Tombol (Custom Map)</option>
              <option value="reactive_thock" ${hw.effect_mode === "reactive_thock" ? "selected" : ""}>Reaktif Saat Ditekan (Ripple)</option>
              <option value="breathing" ${hw.effect_mode === "breathing" ? "selected" : ""}>Transisi Halus (Breathing)</option>
              <option value="spectrum" ${hw.effect_mode === "spectrum" ? "selected" : ""}>Siklus Spektrum Penuh</option>
              <option value="off" ${hw.effect_mode === "off" ? "selected" : ""}>Matikan LED (Hemat Daya Baterai)</option>
            </select>
          </label>
          <label class="field-label" for="rgb-dir-select">
            <span>Arah Transisi Efek</span>
            <select id="rgb-dir-select">
              <option value="left_to_right" ${hw.direction === "left_to_right" ? "selected" : ""}>Kiri ke Kanan</option>
              <option value="right_to_left" ${hw.direction === "right_to_left" ? "selected" : ""}>Kanan ke Kiri</option>
              <option value="outward" ${hw.direction === "outward" ? "selected" : ""}>Dari Tengah ke Tepi</option>
            </select>
          </label>
          <label class="field-label" for="rgb-brightness-range">
            <span>Tingkat Kecerahan LED (${hw.brightness}%)</span>
            <input type="range" id="rgb-brightness-range" min="0" max="100" value="${hw.brightness}" style="--progress: ${hw.brightness}%" />
          </label>
          <label class="field-label" for="rgb-speed-range">
            <span>Kecepatan Transisi (${hw.speed}%)</span>
            <input type="range" id="rgb-speed-range" min="0" max="100" value="${hw.speed}" style="--progress: ${hw.speed}%" />
          </label>
        </div>

        <div>
          <div style="font-size:0.8rem; font-weight:600; margin-bottom:8px;">
            Pilih Warna LED untuk Tombol [${keySpec.label}], Warna Utama, atau Warna Gelombang Kedua:
          </div>
          <div class="swatch-row">
            ${SWATCH_COLORS.map(
              (hex) => `
              <button
                type="button"
                class="color-swatch ${paintColor === hex ? "active" : ""}"
                style="background:${hex}"
                data-paint-swatch="${hex}"
                aria-label="Pilih warna ${hex}"
              ></button>
            `
            ).join("")}
            <button type="button" class="btn-secondary" id="btn-paint-selected-key">
              Warnai Tombol [${keySpec.label}]
            </button>
            <button type="button" class="btn-secondary" id="btn-paint-all-primary">
              Set Warna Utama (${hw.primary_color})
            </button>
            <button type="button" class="btn-secondary" id="btn-paint-secondary">
              Set Warna Kedua (${hw.secondary_color})
            </button>
            <button type="button" class="btn-primary" id="btn-demo-ripple-tab">
              Simulasi Ripple 3D
            </button>
          </div>
        </div>
      </section>

      <section class="panel-card">
        <h2>
          <span>2. Parameter Mikrokontroler (MCU), Debounce &amp; Daya</span>
          <span class="mono" style="font-size:0.75rem; color: var(--text-muted)">Report 0x05 (0x25A7)</span>
        </h2>
        <div class="form-grid">
          <label class="field-label" for="hw-debounce-select">
            <span>Waktu Debounce Switch (Pencegah Double-Click)</span>
            <select id="hw-debounce-select">
              <option value="2" ${hw.debounce_ms === 2 ? "selected" : ""}>2 ms (Respons Cepat)</option>
              <option value="4" ${hw.debounce_ms === 4 ? "selected" : ""}>4 ms (Rekomendasi Harian)</option>
              <option value="8" ${hw.debounce_ms === 8 ? "selected" : ""}>8 ms (Standar Pabrik)</option>
              <option value="12" ${hw.debounce_ms === 12 ? "selected" : ""}>12 ms (Kompensasi Switch Aus)</option>
            </select>
          </label>
          <label class="field-label" for="hw-polling-select">
            <span>Polling Rate (Mode Kabel USB / 2.4GHz)</span>
            <select id="hw-polling-select">
              <option value="1000" ${hw.polling_rate_hz === 1000 ? "selected" : ""}>1000 Hz (Interval 1 ms)</option>
              <option value="500" ${hw.polling_rate_hz === 500 ? "selected" : ""}>500 Hz (Interval 2 ms)</option>
              <option value="250" ${hw.polling_rate_hz === 250 ? "selected" : ""}>250 Hz (Interval 4 ms)</option>
              <option value="125" ${hw.polling_rate_hz === 125 ? "selected" : ""}>125 Hz (Interval 8 ms)</option>
            </select>
          </label>
          <label class="field-label" for="hw-sleep-select">
            <span>Batas Waktu Tidur Otomatis (Mode Nirkabel)</span>
            <select id="hw-sleep-select">
              <option value="5" ${hw.sleep_timeout_min === 5 ? "selected" : ""}>5 Menit Tanpa Aktivitas</option>
              <option value="10" ${hw.sleep_timeout_min === 10 ? "selected" : ""}>10 Menit Tanpa Aktivitas</option>
              <option value="30" ${hw.sleep_timeout_min === 30 ? "selected" : ""}>30 Menit Tanpa Aktivitas</option>
              <option value="0" ${hw.sleep_timeout_min === 0 ? "selected" : ""}>Nonaktifkan Tidur Otomatis</option>
            </select>
          </label>
        </div>

        <div style="display:flex; flex-direction:column; gap:4px;">
          <label class="checkbox-row" for="hw-nkro-check">
            <input type="checkbox" id="hw-nkro-check" ${hw.nkro_enabled ? "checked" : ""} />
            <span>Aktifkan N-Key Rollover Penuh (NKRO Anti-Ghosting)</span>
          </label>
          <label class="checkbox-row" for="hw-winlock-check">
            <input type="checkbox" id="hw-winlock-check" ${hw.win_lock ? "checked" : ""} />
            <span>Kunci Tombol Windows Saat Mode Permainan</span>
          </label>
          <label class="checkbox-row" for="hw-launchagent-check">
            <input type="checkbox" id="hw-launchagent-check" ${prof.launch_agent_enabled ? "checked" : ""} />
            <span>Terapkan Pemetaan Otomatis Saat Login macOS (LaunchAgent)</span>
          </label>
        </div>
      </section>
    </div>
  `;
}

function renderTftTab(prof: KeyboardProfile): string {
  const tft = prof.tft;
  return `
    <div class="workspace-grid">
      <section class="panel-card">
        <h2>
          <span>1. Kanvas Ikon 16x16 RGB565 (Layar TFT M82X Ultimate)</span>
          <span class="mono" style="font-size:0.75rem; color: var(--text-muted)">Report 0x08 (Cmd 0xA1)</span>
        </h2>
        <div class="pixel-editor-wrap">
          <div class="pixel-grid" id="tft-pixel-grid">
            ${tft.pixel_grid_16x16
              .map(
                (hex, idx) => `
              <div
                class="pixel-cell"
                style="background:${hex}"
                data-pixel-idx="${idx}"
              ></div>
            `
              )
              .join("")}
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; flex:1; min-width:220px;">
            <div style="font-size:0.8rem; font-weight:600;">Pilih Warna Kuas Kanvas:</div>
            <div class="swatch-row">
              ${SWATCH_COLORS.map(
                (hex) => `
                <button
                  type="button"
                  class="color-swatch ${pixelBrushColor === hex ? "active" : ""}"
                  style="background:${hex}"
                  data-pixel-swatch="${hex}"
                  aria-label="Kuas warna ${hex}"
                ></button>
              `
              ).join("")}
            </div>
            <div style="font-size:0.8rem; font-weight:600; margin-top:4px;">Muat Pola Bawaan:</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              <button type="button" class="btn-secondary" data-pixel-preset="cyber_bot">Pola Robot</button>
              <button type="button" class="btn-secondary" data-pixel-preset="switch_thock">Pola Switch</button>
              <button type="button" class="btn-secondary" data-pixel-preset="heart_hp">Pola Simbol Hati</button>
              <button type="button" class="btn-danger" id="btn-clear-pixels">Kosongkan Kanvas</button>
            </div>
          </div>
        </div>
      </section>

      <section class="panel-card">
        <h2>
          <span>2. Parameter Layar TFT &amp; Sinkronisasi Jam Sistem</span>
        </h2>
        <div class="form-grid">
          <label class="field-label" for="tft-mode-select">
            <span>Mode Tampilan Layar</span>
            <select id="tft-mode-select">
              <option value="clock_status" ${tft.screen_mode === "clock_status" ? "selected" : ""}>Jam Digital &amp; Indikator Koneksi</option>
              <option value="pixel_art" ${tft.screen_mode === "pixel_art" ? "selected" : ""}>Kanvas Ikon 16x16 Kustom</option>
              <option value="wpm_gauge" ${tft.screen_mode === "wpm_gauge" ? "selected" : ""}>Indikator Polling Rate</option>
              <option value="custom_banner" ${tft.screen_mode === "custom_banner" ? "selected" : ""}>Teks Label Kustom</option>
            </select>
          </label>
          <label class="field-label" for="tft-fps-select">
            <span>Kecepatan Bingkai (FPS)</span>
            <select id="tft-fps-select">
              <option value="10" ${tft.fps === 10 ? "selected" : ""}>10 FPS (Hemat Daya)</option>
              <option value="15" ${tft.fps === 15 ? "selected" : ""}>15 FPS (Standar)</option>
              <option value="24" ${tft.fps === 24 ? "selected" : ""}>24 FPS (Cepat)</option>
            </select>
          </label>
          <label class="field-label" for="tft-banner-input">
            <span>Teks Label pada Layar TFT (Maks 18 Karakter)</span>
            <input type="text" id="tft-banner-input" maxlength="18" placeholder="M82XU MEKPRO" value="${tft.banner_text}" />
          </label>
          <label class="field-label" for="tft-bright-range">
            <span>Kecerahan Layar TFT (${tft.brightness}%)</span>
            <input type="range" id="tft-bright-range" min="10" max="100" value="${tft.brightness}" style="--progress: ${tft.brightness}%" />
          </label>
        </div>
        <label class="checkbox-row" for="tft-sync-clock-check">
          <input type="checkbox" id="tft-sync-clock-check" ${tft.sync_clock ? "checked" : ""} />
          <span>Sinkronkan waktu RTC layar TFT dengan jam sistem macOS saat dikirim</span>
        </label>
      </section>
    </div>
  `;
}

function renderDiagnosticTab(): string {
  return `
    <div class="workspace-grid">
      <section class="panel-card">
        <h2>
          <span>1. Penguji Matriks Tombol, NKRO &amp; Detektor Switch Chatter</span>
          <button type="button" class="btn-secondary" id="btn-reset-tester">Reset Hasil Uji</button>
        </h2>
        <p class="panel-desc">
          Tekan tombol fisik pada keyboard M82XU Anda. Tombol yang berhasil mengirim sinyal akan ditandai garis atas terang. Jika satu switch memantul ulang dalam waktu kurang dari 25ms, penghitung chatter akan mencatatnya.
        </p>
        <div class="diagnostic-readout-list">
          <div class="diagnostic-item">
            <span class="diagnostic-label">Tombol Ditekan Bersamaan (NKRO)</span>
            <span class="diagnostic-val mono" id="live-rollover-val">${pressedKeys.size} aktif (${maxRolloverCount} maks NKRO)</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Cakupan Tombol Teruji</span>
            <span class="diagnostic-val mono" id="live-tested-val">${testedKeys.size} / ${ALL_M82XU_KEYS.length - 1}</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Kode Tombol Terakhir</span>
            <span class="diagnostic-val mono" id="live-last-key-val">${
              lastKeyEvent
                ? `${lastKeyEvent.key_label} [Kode ${lastKeyEvent.keycode}]`
                : "Menunggu input tombol..."
            }</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Deteksi Switch Chatter (&lt;25ms)</span>
            <span class="diagnostic-val mono" id="live-chatter-val">${
              chatterCount === 0 ? "0 pantulan (Switch Normal)" : `${chatterCount} pantulan (<25ms)`
            }</span>
          </div>
        </div>
      </section>

      <section class="panel-card">
        <h2>
          <span>2. Inspektur Paket Protokol IOHIDSystem &amp; Vendor HID</span>
        </h2>
        <p class="panel-desc">
          Daftar perintah pemetaan kernel (<code>hidutil</code>) dan frame 64-byte Vendor HID (<code>0x25A7</code>) yang dihasilkan.
        </p>
        ${
          packetLogs.length === 0
            ? `<div class="state-box"><span>Belum ada paket protokol yang dikirim pada sesi ini. Klik tombol Terapkan ke Keyboard di bagian kanan atas untuk mengeksekusi pemetaan IOHIDSystem dan membuat paket 64-byte Vendor HID.</span></div>`
            : `
          <div style="max-height: 240px; overflow-y: auto;">
            <table class="log-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Register / Report</th>
                  <th>Parameter &amp; Frame Heksadesimal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${packetLogs
                  .map(
                    (log) => `
                  <tr>
                    <td class="mono">${log.direction}</td>
                    <td class="mono">${log.endpoint}</td>
                    <td>
                      <div><strong>${log.summary}</strong></div>
                      <div class="mono" style="font-size:0.7rem; color: var(--text-muted); word-break: break-all;">${log.hex_dump}</div>
                    </td>
                    <td class="mono">${log.status}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
        }
      </section>
    </div>
  `;
}

function renderCapabilitiesTab(kb: ConnectedKeyboard): string {
  const cap = kb.capabilities;
  const rawShortcuts = cap?.hardware_fn_shortcuts || [
    {
      key_combo: "Fn + Space (Tahan 3s)",
      category: "Baterai",
      description: "Cek persentase daya baterai via barisan angka 1-0 (Merah <30%, Kuning <50%, Hijau >50%)"
    },
    {
      key_combo: "Fn + \\",
      category: "Backlight",
      description: "Ganti mode pencahayaan utama South-Facing RGB (18 mode bawaan)"
    },
    {
      key_combo: "Fn + Alt Kiri",
      category: "Side LED",
      description: "Ganti efek lampu samping bodi keyboard (8 mode)"
    },
    {
      key_combo: "Fn + Panah Atas/Bawah",
      category: "Brightness",
      description: "Atur tingkat kecerahan lampu tombol (5 level kecerahan)"
    },
    {
      key_combo: "Fn + Panah Kiri/Kanan",
      category: "Speed",
      description: "Atur kecepatan animasi transisi cahaya LED (5 level kecepatan)"
    },
    {
      key_combo: "Fn + W / E / R",
      category: "Bluetooth",
      description: "Pilih slot Bluetooth BT1 / BT2 / BT3 (Tahan 3s untuk pairing)"
    },
    {
      key_combo: "Fn + T",
      category: "Wireless 2.4G",
      description: "Pindah ke mode Wireless 2.4GHz USB Dongle"
    },
    {
      key_combo: "Fn + Y",
      category: "Kabel USB",
      description: "Pindah ke mode Kabel USB Type-C (Wired Mode)"
    },
    {
      key_combo: "Fn + Win",
      category: "Gaming",
      description: "Kunci / Buka kunci tombol Windows (Win-Lock)"
    },
    {
      key_combo: "Fn + M / S",
      category: "OS Profile",
      description: "Pilih profil tata letak macOS (Fn+M) atau Windows (Fn+S)"
    }
  ];

  const q = fnFilterKeyword.trim().toLowerCase();
  const shortcuts = q
    ? rawShortcuts.filter(
        (s) =>
          s.key_combo.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      )
    : rawShortcuts;

  return `
    <div class="workspace-grid">
      <section class="panel-card">
        <h2>
          <span>1. Profil Spesifikasi Perangkat Keras (${kb.brand_model})</span>
          <span class="mono" style="font-size:0.75rem; color: var(--text-muted)">${kb.vendor_hex}:${kb.product_hex}</span>
        </h2>
        <p class="panel-desc">
          Spesifikasi arsitektur fisik yang teridentifikasi langsung pada papan ketik mekanikal Anda.
        </p>

        <div class="diagnostic-readout-list">
          <div class="diagnostic-item">
            <span class="diagnostic-label">Struktur Pemasangan (Mounting)</span>
            <span class="diagnostic-val mono">${cap?.switch_mount || "Gasket Mount (PC Plate + Poron Foam)"}</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Orientasi LED Switch</span>
            <span class="diagnostic-val mono">${cap?.south_facing_led ? "South-Facing RGB (Anti-Interferensi Cherry Profile)" : "North-Facing"}</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Kapasitas Baterai Internal</span>
            <span class="diagnostic-val mono">${cap?.battery_capacity_mah || 2500} mAh Lithium Rechargeable</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Metode Cek Persentase Baterai</span>
            <span class="diagnostic-val mono">${cap?.battery_level_status || "Fn + Space (LED Baris Angka 1-0)"}</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Soket Switch Hotswap</span>
            <span class="diagnostic-val mono">${cap?.hot_swappable ? "5-Pin Universal Kailh Socket (3-Pin / 5-Pin)" : "Soldered"}</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Rotary Encoder</span>
            <span class="diagnostic-val mono">${cap?.rotary_encoder ? "Knurled Aluminum Knob (Volume + Push Mute)" : "None"}</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Mode Lampu Backlight Utama</span>
            <span class="diagnostic-val mono">${cap?.main_led_modes || 18} Preset Hardware (+ Kustom Per-Key)</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Mode Lampu Samping Bodi</span>
            <span class="diagnostic-val mono">${cap?.side_led_modes || 8} Mode Side LED Strip (Fn + Alt Kiri)</span>
          </div>
        </div>

        <div class="state-box" style="margin-top: 10px;">
          <div>
            <strong>Panduan Pengisian Daya Baterai:</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
              Pabrikan Rexus DAXA merekomendasikan tegangan 5V / 250mA standar. Hindari penggunaan charger fast-charging (PD/QC watt tinggi) agar kesehatan sel baterai 2500mAh tetap awet.
            </div>
          </div>
        </div>
      </section>

      <section class="panel-card">
        <h2>
          <span>2. Daftar Tombol Pintas Firmware Asli (${shortcuts.length} pintasan)</span>
        </h2>
        <p class="panel-desc">
          Tombol kombinasi bawaan mikrokontroler keyboard yang dapat dieksekusi langsung tanpa memerlukan software.
        </p>

        <label class="field-label" for="fn-filter-input">
          <span>Filter Pintasan Fn:</span>
          <input type="text" id="fn-filter-input" placeholder="Ketik kata kunci (misal: baterai, bluetooth, led, mac)..." value="${fnFilterKeyword}" />
        </label>

        <div style="max-height: 380px; overflow-y: auto;">
          <table class="log-table">
            <thead>
              <tr>
                <th style="width: 170px;">Kombinasi Fn</th>
                <th style="width: 140px;">Kategori</th>
                <th>Fungsi Perangkat Keras</th>
              </tr>
            </thead>
            <tbody>
              ${
                shortcuts.length === 0
                  ? `<tr><td colspan="3" style="text-align:center; padding:18px; color:var(--text-muted);">Tidak ada pintasan Fn yang cocok dengan kata kunci "${fnFilterKeyword}".</td></tr>`
                  : shortcuts
                      .map(
                        (item) => `
                <tr>
                  <td><code class="mono" style="font-weight:700; color: var(--brand-color);">${item.key_combo}</code></td>
                  <td><span class="mono" style="font-size:0.75rem; color: var(--text-muted);">${item.category}</span></td>
                  <td>${item.description}</td>
                </tr>
              `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderApp(): void {
  const root = document.getElementById("app");
  if (!root) return;

  const prof = currentProfile();
  const kb = currentKeyboard();

  root.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-section">
          <div class="brand-icon-wrap">
            <img src="/icon.png" alt="" width="32" height="32" />
          </div>
          <div class="brand-info">
            <div class="brand-title-row">
              <h1>MeKPro</h1>
              <span class="app-version-badge">v1.0</span>
            </div>
            <p class="brand-tagline">Studio Konfigurasi Keyboard Mechanical</p>
          </div>
        </div>

        <div class="topbar-center">
          <div class="selector-pill-group" title="Pilih Keyboard Terhubung">
            <span class="status-dot ${kb.transport.includes("Bluetooth") ? "ble" : "usb"}"></span>
            <select id="device-select" class="topbar-select" aria-label="Pilih Perangkat Keyboard">
              ${keyboards
                .map(
                  (k) => `
                <option value="${k.id}" ${k.id === selectedKeyboardId ? "selected" : ""}>
                  ${k.product_name} (${k.transport.includes("Bluetooth") ? "BLE" : "USB"})
                </option>
              `
                )
                .join("")}
            </select>
            <button type="button" class="btn-icon" id="btn-rescan-kb" title="Pindai Ulang Bus HID" aria-label="Pindai Ulang">
              Pindai
            </button>
          </div>

          <div class="selector-pill-group" title="Pilih Profil Aktif">
            <select id="profile-select" class="topbar-select" aria-label="Pilih Profil Konfigurasi">
              ${profiles
                .map(
                  (p, idx) => `
                <option value="${idx}" ${idx === activeProfileIdx ? "selected" : ""}>
                  Profil: ${p.name}
                </option>
              `
                )
                .join("")}
            </select>
            <button type="button" class="btn-icon" id="btn-open-json-modal" title="Ekspor atau Impor Profil JSON" aria-label="Cadangan JSON">
              JSON
            </button>
          </div>
        </div>

        <div class="topbar-actions">
          <button type="button" class="btn-secondary" id="btn-toggle-theme" title="Ubah Tema Tampilan">
            ${currentTheme === "dark" ? "Mode Terang" : "Mode Gelap"}
          </button>
          <button type="button" class="btn-secondary" id="btn-open-custom-board" title="Daftarkan Keyboard Kustom Baru">
            + Keyboard
          </button>
          <button type="button" class="btn-danger" id="btn-factory-reset" title="Kembalikan Pengaturan Keyboard ke Standar Pabrik">
            Reset
          </button>
          <button type="button" class="btn-primary" id="btn-apply-sync" title="Terapkan Konfigurasi ke IOHIDSystem dan Hardware">
            Terapkan ke Keyboard
          </button>
        </div>
      </header>

      ${
        isLoading
          ? `
        <div class="state-box" role="status" aria-live="polite">
          <span><strong>Memproses:</strong> ${loadingMessage}</span>
        </div>
      `
          : ""
      }

      ${
        errorMessage
          ? `
        <div class="state-box" role="alert">
          <span><strong>Kendala:</strong> ${errorMessage}</span>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-secondary" id="btn-retry-sync">Coba Lagi</button>
            <button type="button" class="btn-icon" id="btn-dismiss-error">Tutup</button>
          </div>
        </div>
      `
          : ""
      }

      ${
        statusBannerMessage
          ? `
        <div class="state-box" role="status">
          <span><strong>Status:</strong> ${statusBannerMessage}</span>
          <button type="button" class="btn-icon" id="btn-dismiss-toast">Tutup</button>
        </div>
      `
          : ""
      }

      <section class="keyboard-stage" aria-label="Matriks Fisik Keyboard 75 Persen">
        <div class="stage-toolbar">
          <div class="stage-telemetry-chips">
            <div class="telemetry-chip">
              <span class="chip-label">Model:</span>
              <strong>${kb?.brand_model || prof.brand_model}</strong>
            </div>
            <div class="telemetry-chip">
              <span class="chip-label">Koneksi:</span>
              <span class="status-dot ${kb?.transport.includes("Bluetooth") ? "ble" : "usb"}" style="margin: 0;"></span>
              <strong>${kb?.transport || "Bluetooth Low Energy"}</strong>
            </div>
            <div class="telemetry-chip">
              <span class="chip-label">MAC / ID:</span>
              <span>${kb?.mac_address || "F4:EE:25:F3:7B:B5"}</span>
            </div>
            <div class="telemetry-chip">
              <span class="chip-label">Kernel Remap:</span>
              <strong>${kb?.active_os_remaps || 0} aktif</strong>
            </div>
          </div>

          <div class="stage-view-controls">
            <div class="segmented-control" role="group" aria-label="Pilih Mode Tampilan">
              <button type="button" class="segmented-btn ${!is3dView ? "active" : ""}" data-view-mode="2d">
                Mode 2D
              </button>
              <button type="button" class="segmented-btn ${is3dView ? "active" : ""}" data-view-mode="3d">
                Mode 3D (RGB)
              </button>
            </div>

            <div class="segmented-control" role="group" aria-label="Pilih Layer Keyboard">
              <button type="button" class="segmented-btn ${activeLayer === 0 ? "active" : ""}" data-layer-btn="0">
                Layer 0 (Dasar)
              </button>
              <button type="button" class="segmented-btn ${activeLayer === 1 ? "active" : ""}" data-layer-btn="1">
                Layer 1 (Fn)
              </button>
            </div>
          </div>
        </div>

        ${
          is3dView
            ? `
        <div class="stage-camera-bar" aria-label="Kontrol Visualisasi 3D dan Pencahayaan RGB">
          <div class="camera-controls-left">
            <span class="led-live-badge">
              <span class="led-live-dot" id="led-live-dot"></span>
              <span>LED: ${prof.hardware.effect_mode.toUpperCase()} (${prof.hardware.brightness}%)</span>
            </span>
            <div class="segmented-control">
              <button type="button" class="segmented-btn ${camTiltDeg === 36 && camYawDeg === -8 ? "active" : ""}" data-cam-preset="iso">
                Isometrik
              </button>
              <button type="button" class="segmented-btn ${camTiltDeg === 28 && camYawDeg === 0 ? "active" : ""}" data-cam-preset="front">
                Sudut Ketik
              </button>
              <button type="button" class="segmented-btn ${camTiltDeg === 52 && camYawDeg === 12 ? "active" : ""}" data-cam-preset="led">
                Fokus Underglow
              </button>
            </div>
          </div>

          <div class="camera-controls-right">
            <label class="camera-slider-group" for="cam-tilt-range">
              <span>Tilt (${camTiltDeg}°)</span>
              <input type="range" id="cam-tilt-range" min="0" max="60" value="${camTiltDeg}" style="--progress: ${Math.round((camTiltDeg / 60) * 100)}%" />
            </label>
            <label class="camera-slider-group" for="cam-yaw-range">
              <span>Rotasi (${camYawDeg}°)</span>
              <input type="range" id="cam-yaw-range" min="-35" max="35" value="${camYawDeg}" style="--progress: ${Math.round(((camYawDeg + 35) / 70) * 100)}%" />
            </label>
            <button type="button" class="btn-secondary" id="btn-stage-demo-ripple">
              Uji Ripple
            </button>
            <button type="button" class="btn-secondary" id="btn-toggle-led-pause">
              ${isLightingPaused ? "Jalankan LED" : "Jeda LED"}
            </button>
          </div>
        </div>
        `
            : ""
        }

        <div class="chassis-scroll-wrap ${is3dView ? "stage-3d-viewport" : ""}" id="keyboard-3d-viewport">
          <div
            class="m82xu-chassis ${is3dView ? "chassis-3d" : ""}"
            id="keyboard-3d-chassis"
            style="--cam-tilt: ${camTiltDeg}deg; --cam-yaw: ${camYawDeg}deg;"
          >
            ${M82XU_ROWS.map(
              (row) => `
              <div class="kb-row">
                ${row.map((keySpec) => renderKeycap(keySpec, prof)).join("")}
              </div>
            `
            ).join("")}
          </div>
        </div>
      </section>

      <nav class="tabs-nav" aria-label="Kategori Konfigurasi">
        <button type="button" class="tab-btn ${activeTab === "remap" ? "active" : ""}" data-tab-btn="remap">
          01. Pemetaan &amp; Knob (${prof.remaps.length})
        </button>
        <button type="button" class="tab-btn ${activeTab === "macro" ? "active" : ""}" data-tab-btn="macro">
          02. Otomasi Macro (${prof.macros.length})
        </button>
        <button type="button" class="tab-btn ${activeTab === "rgb" ? "active" : ""}" data-tab-btn="rgb">
          03. Pencahayaan &amp; MCU
        </button>
        <button type="button" class="tab-btn ${activeTab === "tft" ? "active" : ""}" data-tab-btn="tft">
          04. Layar TFT 16x16
        </button>
        <button type="button" class="tab-btn ${activeTab === "capabilities" ? "active" : ""}" data-tab-btn="capabilities">
          05. Manual Fn &amp; Perangkat
        </button>
        <button type="button" class="tab-btn ${activeTab === "diagnostic" ? "active" : ""}" data-tab-btn="diagnostic">
          06. Penguji &amp; Protokol
        </button>
      </nav>

      <main>
        ${activeTab === "remap" ? renderRemapTab(prof) : ""}
        ${activeTab === "macro" ? renderMacroTab(prof) : ""}
        ${activeTab === "rgb" ? renderRgbHardwareTab(prof) : ""}
        ${activeTab === "tft" ? renderTftTab(prof) : ""}
        ${activeTab === "capabilities" ? renderCapabilitiesTab(kb) : ""}
        ${activeTab === "diagnostic" ? renderDiagnosticTab() : ""}
      </main>
    </div>
  `;

  bindDynamicListeners();
  refreshCachedLightingDom();
}

function bindDynamicListeners(): void {
  const prof = currentProfile();

  document.getElementById("device-select")?.addEventListener("change", (e) => {
    selectedKeyboardId = (e.target as HTMLSelectElement).value;
    const kb = currentKeyboard();
    if (kb) {
      prof.vendor_id = kb.vendor_id;
      prof.product_id = kb.product_id;
      prof.brand_model = kb.brand_model;
    }
    renderApp();
  });

  document.getElementById("profile-select")?.addEventListener("change", (e) => {
    activeProfileIdx = parseInt((e.target as HTMLSelectElement).value, 10) || 0;
    renderApp();
  });

  document.getElementById("btn-toggle-theme")?.addEventListener("click", () => {
    const next: ThemeMode = currentTheme === "dark" ? "light" : "dark";
    applyThemeToDocument(next);
    renderApp();
  });

  document.getElementById("btn-rescan-kb")?.addEventListener("click", async () => {
    isLoading = true;
    loadingMessage = "Memindai ulang daftar perangkat HID...";
    renderApp();
    try {
      keyboards = await invoke<ConnectedKeyboard[]>("scan_keyboards");
      statusBannerMessage = `Pemindaian selesai: ${keyboards.length} perangkat ditemukan.`;
      errorMessage = "";
    } catch (err) {
      errorMessage = `Gagal memindai ulang bus HID: ${String(err)}.`;
    } finally {
      isLoading = false;
      loadingMessage = "";
    }
    renderApp();
  });

  document.getElementById("btn-open-json-modal")?.addEventListener("click", () => {
    const dialog = document.getElementById("profile-json-dialog") as HTMLDialogElement | null;
    const textarea = document.getElementById("profile-json-textarea") as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = JSON.stringify(prof, null, 2);
    }
    dialog?.showModal();
  });

  document.getElementById("btn-open-custom-board")?.addEventListener("click", () => {
    const dialog = document.getElementById("custom-board-dialog") as HTMLDialogElement | null;
    dialog?.showModal();
  });

  document.getElementById("btn-apply-sync")?.addEventListener("click", () => {
    void applyCurrentProfile();
  });

  document.getElementById("btn-retry-sync")?.addEventListener("click", () => {
    void applyCurrentProfile();
  });

  document.getElementById("btn-factory-reset")?.addEventListener("click", () => {
    void resetDeviceToFactory();
  });

  document.getElementById("btn-dismiss-toast")?.addEventListener("click", () => {
    statusBannerMessage = "";
    renderApp();
  });

  document.getElementById("btn-dismiss-error")?.addEventListener("click", () => {
    errorMessage = "";
    renderApp();
  });

  for (const el of document.querySelectorAll<HTMLElement>("[data-key-id]")) {
    el.addEventListener("click", () => {
      const kid = el.getAttribute("data-key-id");
      if (kid) {
        selectedKeyId = kid;
        triggerRippleAtKey(kid);
        if (activeTab === "rgb" && prof.hardware.effect_mode === "static_per_key") {
          prof.hardware.per_key_colors[kid] = paintColor;
        }
        renderApp();
      }
    });
  }

  for (const btn of document.querySelectorAll<HTMLElement>("[data-cam-preset]")) {
    btn.addEventListener("click", () => {
      const preset = btn.getAttribute("data-cam-preset");
      if (preset === "2d") {
        is3dView = false;
      } else if (preset === "iso") {
        is3dView = true;
        camTiltDeg = 36;
        camYawDeg = -8;
      } else if (preset === "front") {
        is3dView = true;
        camTiltDeg = 28;
        camYawDeg = 0;
      } else if (preset === "led") {
        is3dView = true;
        camTiltDeg = 52;
        camYawDeg = 12;
      }
      renderApp();
    });
  }

  document.getElementById("cam-tilt-range")?.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    camTiltDeg = Number(target.value);
    target.style.setProperty("--progress", `${Math.round((camTiltDeg / 60) * 100)}%`);
    cachedChassisEl?.style.setProperty("--cam-tilt", `${camTiltDeg}deg`);
    const labelSpan = target.parentElement?.querySelector("span");
    if (labelSpan) labelSpan.textContent = `Tilt (${camTiltDeg}°)`;
  });

  document.getElementById("cam-yaw-range")?.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    camYawDeg = Number(target.value);
    target.style.setProperty("--progress", `${Math.round(((camYawDeg + 35) / 70) * 100)}%`);
    cachedChassisEl?.style.setProperty("--cam-yaw", `${camYawDeg}deg`);
    const labelSpan = target.parentElement?.querySelector("span");
    if (labelSpan) labelSpan.textContent = `Rotasi (${camYawDeg}°)`;
  });

  document.getElementById("btn-stage-demo-ripple")?.addEventListener("click", () => {
    triggerDemoRippleSequence();
  });

  document.getElementById("btn-demo-ripple-tab")?.addEventListener("click", () => {
    prof.hardware.effect_mode = "reactive_thock";
    renderApp();
    triggerDemoRippleSequence();
  });

  document.getElementById("btn-toggle-led-pause")?.addEventListener("click", () => {
    isLightingPaused = !isLightingPaused;
    renderApp();
  });

  document.querySelector('[data-action="open-tft-tab"]')?.addEventListener("click", () => {
    activeTab = "tft";
    renderApp();
  });

  for (const btn of document.querySelectorAll<HTMLElement>("[data-view-mode]")) {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-view-mode");
      is3dView = mode === "3d";
      renderApp();
    });
  }

  for (const btn of document.querySelectorAll<HTMLElement>("[data-layer-btn]")) {
    btn.addEventListener("click", () => {
      activeLayer = parseInt(btn.getAttribute("data-layer-btn") || "0", 10);
      renderApp();
    });
  }

  for (const btn of document.querySelectorAll<HTMLElement>("[data-tab-btn]")) {
    btn.addEventListener("click", () => {
      const nextTab = (btn.getAttribute("data-tab-btn") as ActiveTab) || "remap";
      activeTab = nextTab;
      if (nextTab === "rgb") {
        is3dView = true;
      }
      renderApp();
    });
  }

  for (const btn of document.querySelectorAll<HTMLElement>("[data-remap-cat]")) {
    btn.addEventListener("click", () => {
      remapFilterCategory = (btn.getAttribute("data-remap-cat") as typeof remapFilterCategory) || "all";
      renderApp();
    });
  }

  for (const btn of document.querySelectorAll<HTMLElement>("[data-assign-usage]")) {
    btn.addEventListener("click", () => {
      const targetUsage = Number(btn.getAttribute("data-assign-usage"));
      const targetLabel = btn.getAttribute("data-assign-label") || "Custom";
      const srcSpec = getKeySpec(selectedKeyId);

      const existingIdx = prof.remaps.findIndex(
        (r) => r.key_id === srcSpec.id && r.layer === activeLayer
      );
      const newRule: KeyRemapRule = {
        id: `remap-${srcSpec.id}-${Date.now()}`,
        key_id: srcSpec.id,
        layer: activeLayer,
        from_hid_usage: srcSpec.hidUsage,
        to_hid_usage: targetUsage,
        from_label: srcSpec.label,
        to_label: targetLabel,
        enabled: true,
      };
      if (existingIdx >= 0) {
        prof.remaps[existingIdx] = newRule;
      } else {
        prof.remaps.push(newRule);
      }
      statusBannerMessage = `Pemetaan disiapkan: [${srcSpec.label}] ke [${targetLabel}]. Klik "Terapkan ke Keyboard" untuk mengaktifkan.`;
      renderApp();
    });
  }

  document.getElementById("btn-quick-reset-key")?.addEventListener("click", () => {
    const srcSpec = getKeySpec(selectedKeyId);
    const idx = prof.remaps.findIndex(
      (r) => r.key_id === srcSpec.id && r.layer === activeLayer
    );
    if (idx >= 0) {
      prof.remaps.splice(idx, 1);
      statusBannerMessage = `Pemetaan tombol [${srcSpec.label}] dikembalikan ke standar.`;
      renderApp();
    }
  });

  for (const btn of document.querySelectorAll<HTMLElement>("[data-quick-assign]")) {
    btn.addEventListener("click", () => {
      const targetUsage = Number(btn.getAttribute("data-quick-assign"));
      const targetLabel = btn.getAttribute("data-quick-label") || "Custom";
      const srcSpec = getKeySpec(selectedKeyId);
      const existingIdx = prof.remaps.findIndex(
        (r) => r.key_id === srcSpec.id && r.layer === activeLayer
      );
      const newRule: KeyRemapRule = {
        id: `remap-${srcSpec.id}-${Date.now()}`,
        key_id: srcSpec.id,
        layer: activeLayer,
        from_hid_usage: srcSpec.hidUsage,
        to_hid_usage: targetUsage,
        from_label: srcSpec.label,
        to_label: targetLabel,
        enabled: true,
      };
      if (existingIdx >= 0) {
        prof.remaps[existingIdx] = newRule;
      } else {
        prof.remaps.push(newRule);
      }
      statusBannerMessage = `Pemetaan cepat: [${srcSpec.label}] diubah ke [${targetLabel}].`;
      renderApp();
    });
  }

  const fnInput = document.getElementById("fn-filter-input") as HTMLInputElement | null;
  fnInput?.addEventListener("input", (e) => {
    fnFilterKeyword = (e.target as HTMLInputElement).value;
    renderApp();
    const refreshed = document.getElementById("fn-filter-input") as HTMLInputElement | null;
    if (refreshed) {
      refreshed.focus();
      refreshed.setSelectionRange(fnFilterKeyword.length, fnFilterKeyword.length);
    }
  });

  document.getElementById("knob-press-select")?.addEventListener("change", (e) => {
    prof.hardware.knob_press = (e.target as HTMLSelectElement).value;
    renderApp();
  });

  document.getElementById("mac-swap-checkbox")?.addEventListener("change", (e) => {
    prof.hardware.mac_modifier_swap = (e.target as HTMLInputElement).checked;
    renderApp();
  });

  for (const chk of document.querySelectorAll<HTMLInputElement>("[data-toggle-remap]")) {
    chk.addEventListener("change", () => {
      const idx = Number(chk.getAttribute("data-toggle-remap"));
      if (prof.remaps[idx]) {
        prof.remaps[idx].enabled = chk.checked;
        renderApp();
      }
    });
  }

  for (const del of document.querySelectorAll<HTMLElement>("[data-delete-remap]")) {
    del.addEventListener("click", () => {
      const idx = Number(del.getAttribute("data-delete-remap"));
      prof.remaps.splice(idx, 1);
      renderApp();
    });
  }

  document.getElementById("btn-add-macro")?.addEventListener("click", () => {
    const nameEl = document.getElementById("macro-name-input") as HTMLInputElement | null;
    const typeEl = document.getElementById("macro-type-select") as HTMLSelectElement | null;
    const payloadEl = document.getElementById("macro-payload-input") as HTMLInputElement | null;
    const srcSpec = getKeySpec(selectedKeyId);
    if (!nameEl || !typeEl || !payloadEl) return;

    const newMacro: MacroBinding = {
      id: `macro-${srcSpec.id}-${Date.now()}`,
      name: nameEl.value.trim() || `Pintasan ${srcSpec.label}`,
      trigger_key_id: srcSpec.id,
      trigger_keycode: srcSpec.macosKeycode,
      modifier_filter: "none",
      action_type: typeEl.value,
      payload: payloadEl.value.trim(),
      steps: [
        {
          step_type: "text",
          value: payloadEl.value.trim(),
          delay_ms: 40,
        },
      ],
      enabled: true,
    };
    prof.macros.push(newMacro);
    statusBannerMessage = `Macro "${newMacro.name}" ditambahkan pada tombol [${srcSpec.label}].`;
    renderApp();
  });

  for (const btn of document.querySelectorAll<HTMLElement>("[data-test-macro]")) {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.getAttribute("data-test-macro"));
      const binding = prof.macros[idx];
      if (!binding) return;
      try {
        const res = await invoke<string>("test_macro_now", { binding });
        statusBannerMessage = res;
      } catch (err) {
        statusBannerMessage = `Simulasi Macro: ${binding.name} (${String(err)})`;
      }
      renderApp();
    });
  }

  for (const chk of document.querySelectorAll<HTMLInputElement>("[data-toggle-macro]")) {
    chk.addEventListener("change", () => {
      const idx = Number(chk.getAttribute("data-toggle-macro"));
      if (prof.macros[idx]) {
        prof.macros[idx].enabled = chk.checked;
        renderApp();
      }
    });
  }

  for (const del of document.querySelectorAll<HTMLElement>("[data-delete-macro]")) {
    del.addEventListener("click", () => {
      const idx = Number(del.getAttribute("data-delete-macro"));
      prof.macros.splice(idx, 1);
      renderApp();
    });
  }

  document.getElementById("rgb-mode-select")?.addEventListener("change", (e) => {
    prof.hardware.effect_mode = (e.target as HTMLSelectElement).value;
    renderApp();
  });

  document.getElementById("rgb-dir-select")?.addEventListener("change", (e) => {
    prof.hardware.direction = (e.target as HTMLSelectElement).value;
    renderApp();
  });

  document.getElementById("rgb-brightness-range")?.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    prof.hardware.brightness = Number(target.value);
    target.style.setProperty("--progress", `${target.value}%`);
    const labelSpan = target.parentElement?.querySelector("span");
    if (labelSpan) labelSpan.textContent = `Tingkat Kecerahan LED (${target.value}%)`;
  });

  document.getElementById("rgb-speed-range")?.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    prof.hardware.speed = Number(target.value);
    target.style.setProperty("--progress", `${target.value}%`);
    const labelSpan = target.parentElement?.querySelector("span");
    if (labelSpan) labelSpan.textContent = `Kecepatan Transisi (${target.value}%)`;
  });

  for (const sw of document.querySelectorAll<HTMLElement>("[data-paint-swatch]")) {
    sw.addEventListener("click", () => {
      paintColor = sw.getAttribute("data-paint-swatch") || "#ff6b35";
      renderApp();
    });
  }

  document.getElementById("btn-paint-selected-key")?.addEventListener("click", () => {
    prof.hardware.per_key_colors[selectedKeyId] = paintColor;
    prof.hardware.effect_mode = "static_per_key";
    renderApp();
  });

  document.getElementById("btn-paint-all-primary")?.addEventListener("click", () => {
    prof.hardware.primary_color = paintColor;
    renderApp();
  });

  document.getElementById("btn-paint-secondary")?.addEventListener("click", () => {
    prof.hardware.secondary_color = paintColor;
    renderApp();
  });

  document.getElementById("hw-debounce-select")?.addEventListener("change", (e) => {
    prof.hardware.debounce_ms = Number((e.target as HTMLSelectElement).value);
    renderApp();
  });

  document.getElementById("hw-polling-select")?.addEventListener("change", (e) => {
    prof.hardware.polling_rate_hz = Number((e.target as HTMLSelectElement).value);
    renderApp();
  });

  document.getElementById("hw-sleep-select")?.addEventListener("change", (e) => {
    prof.hardware.sleep_timeout_min = Number((e.target as HTMLSelectElement).value);
    renderApp();
  });

  document.getElementById("hw-nkro-check")?.addEventListener("change", (e) => {
    prof.hardware.nkro_enabled = (e.target as HTMLInputElement).checked;
  });

  document.getElementById("hw-winlock-check")?.addEventListener("change", (e) => {
    prof.hardware.win_lock = (e.target as HTMLInputElement).checked;
  });

  document.getElementById("hw-launchagent-check")?.addEventListener("change", (e) => {
    prof.launch_agent_enabled = (e.target as HTMLInputElement).checked;
  });

  for (const sw of document.querySelectorAll<HTMLElement>("[data-pixel-swatch]")) {
    sw.addEventListener("click", () => {
      pixelBrushColor = sw.getAttribute("data-pixel-swatch") || "#ff6b35";
      renderApp();
    });
  }

  for (const cell of document.querySelectorAll<HTMLElement>("[data-pixel-idx]")) {
    const paintCell = () => {
      const idx = Number(cell.getAttribute("data-pixel-idx"));
      prof.tft.pixel_grid_16x16[idx] = pixelBrushColor;
      cell.style.background = pixelBrushColor;
    };
    cell.addEventListener("pointerdown", () => {
      isPaintingPixel = true;
      paintCell();
    });
    cell.addEventListener("pointerenter", () => {
      if (isPaintingPixel) paintCell();
    });
  }

  for (const pre of document.querySelectorAll<HTMLElement>("[data-pixel-preset]")) {
    pre.addEventListener("click", () => {
      const name = pre.getAttribute("data-pixel-preset") as
        | "cyber_bot"
        | "switch_thock"
        | "heart_hp";
      prof.tft.pixel_grid_16x16 = makePixelPreset(name);
      prof.tft.screen_mode = "pixel_art";
      renderApp();
    });
  }

  document.getElementById("btn-clear-pixels")?.addEventListener("click", () => {
    prof.tft.pixel_grid_16x16 = new Array(256).fill("#111315");
    renderApp();
  });

  document.getElementById("tft-mode-select")?.addEventListener("change", (e) => {
    prof.tft.screen_mode = (e.target as HTMLSelectElement).value;
    renderApp();
  });

  document.getElementById("tft-fps-select")?.addEventListener("change", (e) => {
    prof.tft.fps = Number((e.target as HTMLSelectElement).value);
    renderApp();
  });

  document.getElementById("tft-banner-input")?.addEventListener("input", (e) => {
    prof.tft.banner_text = (e.target as HTMLInputElement).value;
    renderApp();
  });

  document.getElementById("tft-bright-range")?.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    prof.tft.brightness = Number(target.value);
    target.style.setProperty("--progress", `${target.value}%`);
    renderApp();
  });

  document.getElementById("tft-sync-clock-check")?.addEventListener("change", (e) => {
    prof.tft.sync_clock = (e.target as HTMLInputElement).checked;
  });

  document.getElementById("btn-reset-tester")?.addEventListener("click", () => {
    testedKeys.clear();
    maxRolloverCount = 0;
    chatterCount = 0;
    renderApp();
  });
}

void initApp();
