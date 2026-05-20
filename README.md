<div align="center">

# 🔐 Telegram 2FA Secret Bot

### Bot Telegram untuk Generate & Validasi 2FA Secret secara Real-time

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue?style=for-the-badge&logo=telegram)](https://t.me/RayzellStores)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**by [RayzellStores](https://t.me/RayzellStores)**

</div>

---

## ✨ Fitur Unggulan

| Fitur | Keterangan |
|-------|-----------|
| 🔐 **Generate 2FA Secret** | Buat secret key TOTP asli & unik |
| 🔍 **Validasi Secret** | Cek apakah secret yang kamu punya valid |
| ⏱️ **OTP Real-time** | Ambil kode OTP 6 digit langsung |
| 📱 **QR Code** | Generate QR untuk Google Authenticator |
| 🔒 **Force Join** | User wajib join channel sebelum pakai bot |
| ⚡ **Respon Cepat** | Polling mode, respon instan |

---

## 📋 Syarat & Ketentuan VPS

> ⚠️ **Baca dulu sebelum install!**

### Spesifikasi VPS Minimum

| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| **OS** | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |
| **RAM** | 512 MB | 1 GB |
| **Storage** | 5 GB | 10 GB |
| **CPU** | 1 vCore | 1-2 vCore |
| **Koneksi** | 10 Mbps | 100 Mbps |

### Software yang Dibutuhkan

- ✅ Node.js **v18+**
- ✅ npm **v8+**
- ✅ Git
- ✅ PM2 (untuk keep bot tetap hidup)

---

## 🚀 Tutorial Instalasi Lengkap (Step by Step)

> 💡 **Semua perintah dijalankan sebagai `root` atau gunakan `sudo`**

---

### STEP 1 — Update & Upgrade VPS

```bash
apt update && apt upgrade -y
```

---

### STEP 2 — Install Kebutuhan Dasar

```bash
apt install -y curl git nano
```

Verifikasi:
```bash
git --version   # Harus tampil: git version 2.x.x
curl --version  # Harus tampil: curl 7.x.x
```

---

### STEP 3 — Install Node.js v18

> ⚠️ Jangan pakai `apt install nodejs` langsung — versinya terlalu lama!
> Gunakan NodeSource agar dapat Node.js v18.

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

Verifikasi — **WAJIB muncul v18+**:
```bash
node -v   # Harus: v18.x.x
npm -v    # Harus: v8.x.x atau lebih
```

> ❌ Kalau masih muncul versi lama (v10/v12), jalankan ini dulu:
> ```bash
> apt remove -y nodejs
> apt autoremove -y
> curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
> apt install -y nodejs
> ```

---

### STEP 4 — Install PM2

PM2 adalah process manager agar bot tetap hidup meski terminal ditutup.

```bash
npm install -g pm2
```

Verifikasi:
```bash
pm2 -v   # Harus tampil nomor versi PM2
```

> ❌ **Error `pm2: command not found`?** Jalankan:
> ```bash
> npm install -g pm2 --force
> # Atau jika masih gagal:
> npx pm2 -v
> ```

---

### STEP 5 — Clone Repository Bot

```bash
cd ~
git clone https://github.com/Rayzell25/Bot-2fa.git
cd Bot-2fa
```

---

### STEP 6 — Install Dependencies Bot

```bash
npm install
```

> ⏳ Tunggu hingga selesai (1-2 menit). Pastikan tidak ada error merah.
> Pesan kuning `npm warn` itu normal, abaikan saja.

---

### STEP 7 — Konfigurasi File .env

```bash
cp .env.example .env
nano .env
```

Isi semua variabel lalu simpan (**CTRL+X → Y → Enter**):

```env
BOT_TOKEN=token_dari_botfather
OWNER_ID=telegram_id_kamu
BOT_USERNAME=username_bot_tanpa_@
CHANNEL=@NamaChannel
```

> 💡 **Cara dapat nilai di atas:**
> | Variabel | Cara Dapat |
> |----------|-----------|
> | `BOT_TOKEN` | Chat [@BotFather](https://t.me/BotFather) → `/newbot` |
> | `OWNER_ID` | Chat [@userinfobot](https://t.me/userinfobot) |
> | `BOT_USERNAME` | Username bot dari BotFather (tanpa `@`) |
> | `CHANNEL` | Username channel kamu (format: `@namachannel`) |

---

### STEP 8 — Jadikan Bot sebagai Admin Channel

> ⚠️ **WAJIB!** Bot harus jadi admin di channel agar fitur force-join berfungsi.

1. Buka channel Telegram kamu
2. Klik nama channel → **Edit → Administrators**
3. Klik **Add Administrator** → Cari username bot
4. Aktifkan permission minimal: ✅ **Add Members**
5. Klik **Save**

---

### STEP 9 — Test Jalankan Bot

Jalankan dulu tanpa PM2 untuk memastikan tidak ada error:

```bash
node bot.js
```

✅ **Sukses** kalau muncul:
```
╔══════════════════════════════════╗
║  🔐  2FA SECRET BOT  STARTED  🔐  ║
║     by RayzellStores              ║
╚══════════════════════════════════╝
✅  Bot: @namabot
👑  Owner ID: 123456789
📢  Channel: @RayzellStores
🚀  Bot is running...
```

Tekan **CTRL+C** untuk stop, lalu lanjut ke STEP 10.

---

### STEP 10 — Jalankan Bot dengan PM2 (Permanent)

```bash
# Start bot
pm2 start bot.js --name "2fa-bot"

# Aktifkan auto-start saat VPS reboot
pm2 startup
# ⚠️ Salin & jalankan perintah yang muncul dari pm2 startup!

# Simpan konfigurasi PM2
pm2 save

# Cek status
pm2 status

# Lihat log
pm2 logs 2fa-bot
```

---

### STEP 11 — Verifikasi Bot Berjalan

1. Buka Telegram → cari username bot kamu
2. Ketik `/start`
3. Kalau muncul pesan selamat datang → **🎉 Bot 100% berhasil!**

---

## 🔄 Update Bot

Kalau ada update terbaru dari repository:

```bash
cd ~/Bot-2fa

# Pull update terbaru
git pull origin main

# Restart bot
pm2 restart 2fa-bot
```

---

## 🛠️ Perintah PM2 Penting

```bash
pm2 status              # Cek status semua proses
pm2 logs 2fa-bot        # Lihat log
pm2 restart 2fa-bot     # Restart bot
pm2 stop 2fa-bot        # Stop bot
pm2 delete 2fa-bot      # Hapus dari PM2
pm2 monit               # Monitor real-time
```

---

## ❗ Troubleshooting

### ❌ `pm2: command not found`
PM2 belum terinstall. Jalankan:
```bash
npm install -g pm2
pm2 -v
```

### ❌ `node: command not found` atau versi Node.js lama
```bash
# Hapus nodejs lama
apt remove -y nodejs
apt autoremove -y

# Install Node.js 18 dari NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verifikasi
node -v   # Harus v18.x.x
npm -v
```

### ❌ `npm install -g pm2` error permission
```bash
# Coba tanpa sudo (kalau login sebagai root)
npm install -g pm2 --force
```

### ❌ Bot tidak merespon setelah start
```bash
pm2 status           # Cek status (harus "online")
pm2 logs 2fa-bot     # Cek log error
```

### ❌ `Error: Cannot find module`
```bash
cd ~/Bot-2fa
npm install
pm2 restart 2fa-bot
```

### ❌ `Error: Unauthorized` (401)
- Token bot salah atau expired
- Buat token baru di [@BotFather](https://t.me/BotFather) → `/mybot` → API Token
- Update `.env` lalu: `pm2 restart 2fa-bot`

### ❌ Bot tidak bisa cek member channel
- Bot belum jadi admin di channel → lihat STEP 8
- Pastikan format CHANNEL di `.env`: `@namachannel` (dengan `@`)

### ❌ `npm warn` saat install dependencies
- Pesan kuning `warn` itu **normal**, abaikan
- Yang perlu diperhatikan hanya pesan merah `error`

### ❌ Bot mati setelah terminal ditutup
```bash
# Pastikan sudah jalankan pm2 startup
pm2 startup
# Salin & jalankan perintah yang muncul
pm2 save
```

---

## 📁 Struktur File

```
Bot-2fa/
├── bot.js          # File utama bot
├── package.json    # Dependencies
├── .env            # Konfigurasi (JANGAN di-share!)
├── .env.example    # Contoh konfigurasi
├── .gitignore      # File yang diabaikan git
└── README.md       # Dokumentasi ini
```

---

## 📞 Support & Contact

<div align="center">

| Platform | Link |
|----------|------|
| 📢 Channel | [@RayzellStores](https://t.me/RayzellStores) |
| 💬 Owner | [@RayzellStores](https://t.me/RayzellStores) |

**Jika ada kendala instalasi, hubungi owner di Telegram!**

⭐ **Jangan lupa kasih Star di repo ini kalau bermanfaat!** ⭐

</div>

---

<div align="center">

Made with ❤️ by **RayzellStores**

</div>
