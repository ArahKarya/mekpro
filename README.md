# MeKPro: Konfigurator Keyboard Mechanical

**Perangkat Pilot:** Rexus Daxa M82X Ultimate (`M82XU 5.0`, Vendor ID `0x25A7`, Product ID `0x2420`)

MeKPro adalah aplikasi desktop macOS berbasis Tauri 2 (Rust + TypeScript) untuk mengatur pemetaan tombol, otomasi macro, pencahayaan RGB, parameter mikrokontroler (debounce, polling rate, sleep timer), serta layar TFT pada keyboard mechanical yang perangkat lunak resminya sudah tidak diperbarui oleh pabrik atau hanya tersedia untuk sistem operasi Windows.

## Arsitektur & Fitur

1. **Pemetaan Tombol Kernel Per-Perangkat (`IOHIDEventSystem` / `hidutil`)**
   - Mengubah pemetaan tombol secara spesifik hanya pada pasangan `VendorID` dan `ProductID` target (`0x25A7:0x2420` untuk M82XU) tanpa memengaruhi keyboard bawaan MacBook.
   - Bekerja baik saat keyboard terhubung melalui **Bluetooth Low Energy (`M82XU 5.0`)** maupun **Kabel USB / Dongle 2.4GHz**.
   - Menyediakan opsi instalasi `~/Library/LaunchAgents/com.aks.mekpro.remap.plist` agar pemetaan tombol tetap aktif otomatis saat login macOS.
2. **Protokol Vendor HID 64-Byte (`0x25A7` Compx / Sino Wealth)**
   - Menyusun frame laporan 64-byte beserta checksum untuk:
     - **Report `0x04`**: Mode efek pencahayaan RGB, kecerahan, kecepatan, arah, dan pemetaan warna per-tombol.
     - **Report `0x05`**: Waktu debounce switch (`2ms`, `4ms`, `8ms`, `12ms`), polling rate (`125Hz` hingga `1000Hz`), batas waktu tidur otomatis, NKRO, dan Win-Lock.
     - **Report `0x08`**: Konversi kanvas ikon 16x16 ke format `RGB565` dan sinkronisasi jam sistem (RTC) ke layar TFT.
3. **Otomasi Macro & Penguji Matriks Tombol (`CGEventTap`)**
   - Mendengarkan sinyal tombol secara real-time di macOS untuk menguji seluruh tombol, menghitung **Max NKRO Rollover**, dan mendeteksi gejala **Switch Chatter (`< 25ms bounce`)** pada switch mekanikal yang mulai aus.
   - Menjalankan aksi macro (pengetikan teks otomatis, membuka aplikasi melalui `open -a`, atau mengeksekusi perintah shell).
4. **Cadangan & Pemulihan Profil (`.mekpro.json`)**
   - Seluruh pengaturan disimpan dalam format JSON terbuka yang dapat diekspor dan diimpor kapan saja.

## Cara Menjalankan

```bash
cd ~/Project/keypilot

# Menjalankan dalam mode pengembangan
pnpm tauri dev

# Memaketkan aplikasi native macOS (.app)
pnpm tauri build --bundles app --debug
```
