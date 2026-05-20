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

### STEP 1 — Update & Upgrade VPS

Pertama, pastikan VPS kamu up-to-date:

```bash
sudo apt update && sudo apt upgrade -y
```

---

### STEP 2 — Install Node.js v18+

```bash
# Install curl dulu kalau belum ada
sudo apt install -y curl

# Tambah repo NodeSource (Node.js 18)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verifikasi instalasi
node -v    # Harus tampil: v18.x.x
npm -v     # Harus tampil: v8.x.x atau lebih
```

---

### STEP 3 — Install Git

```bash
sudo apt install -y git

# Verifikasi
git --version
```

---

### STEP 4 — Install PM2 (Process Manager)

PM2 digunakan agar bot tetap berjalan meskipun terminal ditutup.

```bash
sudo npm install -g pm2

# Verifikasi
pm2 -v
```

---

### STEP 5 — Clone Repository

```bash
# Pindah ke folder home
cd ~

# Clone repo bot
git clone https://github.com/Rayzell25/Bot-2fa.git

# Masuk ke folder bot
cd Bot-2fa
```

---

### STEP 6 — Install Dependencies

```bash
npm install
```

> ⏳ Tunggu hingga semua package selesai terinstall. Biasanya 1-2 menit.

---

### STEP 7 — Konfigurasi Bot

```bash
# Copy file env
cp .env.example .env

# Edit file .env
nano .env
```

Isi file `.env` seperti ini:

```env
BOT_TOKEN=isi_token_bot_kamu_disini
OWNER_ID=isi_telegram_id_kamu
BOT_USERNAME=username_bot_tanpa_@
CHANNEL=@NamaChannel
```

> 💡 **Cara dapat nilai di atas:**
> - `BOT_TOKEN` → Buat bot baru di [@BotFather](https://t.me/BotFather), ketik `/newbot`
> - `OWNER_ID` → Cek ID kamu di [@userinfobot](https://t.me/userinfobot)
> - `BOT_USERNAME` → Username bot yang kamu buat di BotFather (tanpa @)
> - `CHANNEL` → Username channel kamu (format: `@namachannel`)

Setelah edit, simpan dengan: **CTRL+X → Y → Enter**

---

### STEP 8 — Tambahkan Bot sebagai Admin Channel

> ⚠️ **WAJIB!** Bot harus jadi admin di channel kamu agar bisa cek member.

1. Buka channel kamu di Telegram
2. Klik nama channel → **Edit → Administrators**
3. Klik **Add Administrator**
4. Cari username bot kamu
5. Aktifkan permission: **Add Members** (minimal)
6. Klik **Save**

---

### STEP 9 — Jalankan Bot

#### Cara 1: Test dulu (tanpa PM2)
```bash
node bot.js
```
Kalau muncul output seperti ini, berarti bot berhasil jalan:
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
Stop dengan **CTRL+C**, lalu lanjut ke cara 2.

#### Cara 2: Jalankan dengan PM2 (Recommended)
```bash
# Start bot
pm2 start bot.js --name "2fa-bot"

# Lihat status
pm2 status

# Lihat log real-time
pm2 logs 2fa-bot

# Auto-start setelah VPS reboot
pm2 startup
pm2 save
```

---

### STEP 10 — Verifikasi Bot Berjalan

1. Buka Telegram
2. Cari username bot kamu
3. Ketik `/start`
4. Kalau muncul pesan selamat datang → **✅ Bot berhasil!**

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

### Bot tidak merespon?
```bash
# Cek apakah bot jalan
pm2 status

# Cek log error
pm2 logs 2fa-bot --lines 50
```

### Error: Cannot find module?
```bash
cd ~/Bot-2fa
npm install
pm2 restart 2fa-bot
```

### Error: Unauthorized (401)?
- Pastikan `BOT_TOKEN` di `.env` sudah benar
- Cek apakah token masih aktif di @BotFather

### Bot tidak bisa cek member channel?
- Pastikan bot sudah jadi **admin** di channel
- Pastikan `CHANNEL` di `.env` diisi dengan format `@namachannel`

### Node.js version terlalu lama?
```bash
# Cek versi
node -v

# Kalau kurang dari v18, install ulang:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
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
