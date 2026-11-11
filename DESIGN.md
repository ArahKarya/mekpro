# DESIGN.md: MeKPro Hardware Configuration Utility

## Design Read
Reading this as: Desktop hardware peripheral configuration studio for mechanical keyboard owners (pilot: Rexus Daxa M82X Ultimate / `M82XU 5.0`), in a tactile CNC-instrument and PBT-keycap industrial language, dial `ENERGY 2 / RHYTHM 2 / MOTION 1`.

## 1. Identity & Character
MeKPro is a hardware bench tool for configuring physical switches, HID usage matrices, rotary encoders, and onboard TFT displays. Its visual language comes from physical mechanical keyboards: bead-blasted anodized aluminum frames, dye-sublimated PBT keycaps, and high-contrast laser-etched legends.
- **No generic AI gradients or neon glows**: Zero cyan-to-purple gradients, zero decorative pulsing dots, zero glassmorphism stacks.
- **One focal point per screen**: The 75% (82-key + TFT + Rotary Encoder) physical keyboard matrix sits at the center of the workspace. Every control below it acts directly on the selected keycap or hardware register.
- **Identity motif**: Monospaced hardware register tags (`VID:0x25A7`, `PID:0x2420`, `USAGE:0x07`) paired with recessed keycap bevels (`border-bottom: 3px solid`) that mimic physical cherry-profile keycap skirts.

## 2. Color Palette (R-29: 2 Core Neutrals + 1 Deliberate Accent)

### Dark Theme (Default Bench Mode)
- **Canvas (`--bg-canvas`)**: `#111315` (Anodized Graphite)
- **Surface (`--bg-surface`)**: `#181B1F` (Matte Aluminum)
- **Elevated Control (`--bg-elevated`)**: `#22262C`
- **Component Boundary (`--border-subtle`)**: `#6B7280` (`3.57:1` against `#181B1F`, passing WCAG 1.4.11 non-text 3:1)
- **Primary Text (`--text-primary`)**: `#F3F4F6` (`16.92:1` against `#111315`, passing WCAG AA 4.5:1)
- **Secondary / Sub-legend Text (`--text-muted`)**: `#9CA3AF` (`6.81:1` against `#181B1F`, passing WCAG AA 4.5:1)
- **Deliberate Accent (`--brand-color`)**: `#FF6B35` (Industrial Switch Stem Orange, `6.09:1` on `#181B1F`; dark ink `#111315` on `#FF6B35` is `6.57:1`)

### Light Theme (PBT Industrial Paper Mode, switchable via Topbar Toggle)
- **Canvas (`--bg-canvas`)**: `#F4F2ED` (Warm PBT Off-White)
- **Surface (`--bg-surface`)**: `#FFFFFF`
- **Elevated Control (`--bg-elevated`)**: `#EAE6DF`
- **Component Boundary (`--border-subtle`)**: `#78736A` (`4.71:1` against `#FFFFFF`, passing WCAG 1.4.11 non-text 3:1)
- **Primary Text (`--text-primary`)**: `#141413` (`16.48:1` against `#F4F2ED`, passing WCAG AA 4.5:1)
- **Secondary Text (`--text-muted`)**: `#524F49` (`8.16:1` against `#FFFFFF`, passing WCAG AA 4.5:1)
- **Deliberate Accent (`--brand-color`)**: `#C2410C` (Deep Industrial Orange, `5.18:1` with `#FFFFFF` text)

## 3. Typography (R-06)
- **UI & Controls**: System humanist sans (`-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`) for fast scanning of Indonesian control labels, using fluid `clamp()` sizing so text reflows cleanly at 200% zoom.
- **Register Codes, HID Hex & Keycode Telemetry**: System technical monospace (`"SF Mono", Menlo, monospace`) restricted strictly to hexadecimal HID usages, MAC addresses, keycodes, and 64-byte packet dumps.

## 4. Three Dials (Part 3 Liveliness)
- **ENERGY: 2 (Balanced)**: Physical keycap bevels and Industrial Switch Orange (`#FF6B35` / `#C2410C`) give immediate hardware tactility without theatrical effects.
- **RHYTHM: 2 (Consistent with purposeful variation)**: Top specification bar -> Full-width interactive 75% keyboard chassis -> Asymmetric 2-column inspector below (left column for primary action/selection, right column for active hardware rules or packet logs).
- **MOTION: 1 (Hover and active key-press states only)**: Physical `translateY(2px)` key depression when a switch is pressed on the real M82XU keyboard. Zero endless loops or decorative animations.

## 5. One-Line Reasons for Major Decisions (R-31)
- **Color**: Industrial Switch Stem Orange (`#FF6B35` dark / `#C2410C` light) over matte graphite/PBT neutrals evokes physical mechanical switch stems while passing 4.5:1 AA contrast.
- **Layout**: Placing the 82-key + TFT + Knob chassis full-width above the inspector keeps the physical keyboard as the single focal point while editing any layer, macro, or RGB zone.
- **Typography**: Native macOS SF Pro paired with SF Mono separates human-readable Indonesian actions from raw hexadecimal `IOHIDEventSystem` and USB report bytes.
- **Spacing**: Compact 6px keycap pitch inside the chassis mirrors a real 75% gasket-mount plate, while 16px panel gaps separate the interactive chassis from configuration forms.
- **Panels**: Two-column asymmetric workspace pairs the input selector (left) with the live applied state (right) so users see cause and effect without scrolling.
- **Icons / Marks**: Zero decorative emojis; keycaps and controls use real keyboard legends (`Esc`, `PgUp`, `Cmd`, `Opt`, `01`–`05`) because keyboard users read legends, not clip-art.
