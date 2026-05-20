<div align="center">

# 🔐 Telegram 2FA + Address Bot

### Bot Telegram untuk generate 2FA Secret & Alamat Indonesia secara real-time

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue?style=for-the-badge&logo=telegram)](https://t.me/RayzellStores)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**by [RayzellStores](https://t.me/RayzellStores)**

</div>

---

## ✨ Fitur

| Fitur | Keterangan |
|-------|-----------|
| 🔒 **Force Join Channel** | User wajib join sebelum bisa pakai bot |
| 🔐 **Generate 2FA** | OTP real-time dengan countdown & tombol Refresh |
| 📍 **Generate Alamat** | Alamat Indonesia random (10 kota real), pilih 1–10 |
| ✏️ **1 Pesan Saja** | Semua menu di-edit dalam 1 chat, tidak buat pesan baru |
| ← **Tombol Back** | Navigasi balik ke menu utama dari mana saja |
| ⚡ **Anti Delay** | Respon cepat, polling 300ms |

---

## 📱 Cara Kerja Bot

### Menu Utama
```
Halo, Rayzell! Pilih fitur di bawah.

[ 🔐 Generate 2FA ]  [ 📍 Generate Alamat ]
```

### Generate 2FA
1. Klik **Generate 2FA** → bot minta kirim secret key
2. Kirim secret (Base32) → OTP muncul dengan countdown:
```
🔐 2FA Code: 917034
🟢 Status: Aktif

██████████  28s

[ ⏱ 28s ]  [ ← Kembali ]
```
3. Saat expired:
```
🔐 2FA Code: 917034
⏳ Status: Expired

Tap Refresh untuk mendapatkan kode baru.

[ 🔄 Refresh ]  [ ← Kembali ]
```

### Generate Alamat Indonesia
1. Klik **Generate Alamat** → pilih jumlah 1–10
2. Bot generate alamat random dari 10 kota real Indonesia:
```
— Alamat 1 —
Street   : Jl. Sudirman No.42
City     : Jakarta Selatan
Province : DKI Jakarta
Phone    : +62 812 3456 7890
Postal   : 12920
Country  : Indonesia
Full     : Jl. Sudirman No.42, Jakarta Selatan, DKI Jakarta, 12920

[ ← Kembali ]  [ 🔄 Generate Baru ]
```

**Kota yang tersedia:**
- Jakarta Selatan (DKI Jakarta)
- Yogyakarta (DI Yogyakarta)
- Semarang (Jawa Tengah)
- Surabaya (Jawa Timur)
- Bandung (Jawa Barat)
- Medan (Sumatera Utara)
- Banjarmasin (Kalimantan Selatan)
- Makassar (Sulawesi Selatan)
- Denpasar (Bali)
- Manado (Sulawesi Utara)

---

## 📋 Syarat VPS

| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| **OS** | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |
| **RAM** | 512 MB | 1 GB |
| **Storage** | 5 GB | 10 GB |
| **CPU** | 1 vCore | 1–2 vCore |

---

## 🚀 Cara Install (Step by Step)

> Semua perintah dijalankan sebagai **root**

### STEP 1 — Update VPS
```bash
apt update && apt upgrade -y
apt install -y curl git nano
```

### STEP 2 — Install Node.js 18
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node -v   # harus v18.x.x
npm -v    # harus v8.x.x atau lebih
```

> ❌ Kalau masih versi lama:
> ```bash
> apt remove -y nodejs && apt autoremove -y
> curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
> apt install -y nodejs
> ```

### STEP 3 — Install PM2
```bash
npm install -g pm2
pm2 -v
```

### STEP 4 — Clone Repository
```bash
cd ~
git clone https://github.com/Rayzell25/Bot-2fa.git
cd Bot-2fa
```

### STEP 5 — Install Dependencies
```bash
npm install
```

### STEP 6 — Konfigurasi .env
```bash
cp .env.example .env
nano .env
```

Isi file `.env`:
```env
BOT_TOKEN=token_dari_botfather
OWNER_ID=telegram_id_kamu
BOT_USERNAME=username_bot_tanpa_@
CHANNEL=@NamaChannel
```

| Variabel | Cara Dapat |
|----------|-----------|
| `BOT_TOKEN` | Chat [@BotFather](https://t.me/BotFather) → `/newbot` |
| `OWNER_ID` | Chat [@userinfobot](https://t.me/userinfobot) |
| `BOT_USERNAME` | Username bot dari BotFather (tanpa `@`) |
| `CHANNEL` | Username channel kamu (format: `@namachannel`) |

Simpan: **CTRL+X → Y → Enter**

### STEP 7 — Jadikan Bot sebagai Admin Channel
> ⚠️ **Wajib!** Bot harus jadi admin agar force-join berfungsi.

1. Buka channel Telegram kamu
2. **Edit → Administrators → Add Administrator**
3. Cari username bot → aktifkan ✅ **Add Members** → Simpan

### STEP 8 — Test Jalankan
```bash
node bot.js
```
✅ Sukses kalau muncul:
```
  2FA + Address Bot — started
  Bot     : @namabot
  Owner   : 123456789
  Channel : @RayzellStores
```
Tekan **CTRL+C**, lanjut ke STEP 9.

### STEP 9 — Jalankan dengan PM2 (Permanent)
```bash
pm2 start bot.js --name "2fa-bot"
pm2 startup
# Salin & jalankan perintah yang muncul
pm2 save
```

### STEP 10 — Verifikasi
1. Buka Telegram → cari username bot
2. Ketik `/start`
3. Muncul menu utama → **✅ Bot berhasil!**

---

## 🔄 Update Bot

```bash
cd ~/Bot-2fa
git pull origin main
pm2 restart 2fa-bot
```

---

## 🛠️ Perintah PM2

```bash
pm2 status              # cek status
pm2 logs 2fa-bot        # lihat log
pm2 restart 2fa-bot     # restart
pm2 stop 2fa-bot        # stop
pm2 monit               # monitor real-time
```

---

## ❗ Troubleshooting

| Error | Solusi |
|-------|--------|
| `pm2: command not found` | `npm install -g pm2` |
| `node: command not found` | Install ulang Node.js 18 dari NodeSource |
| Bot tidak cek member | Pastikan bot sudah jadi **admin** di channel |
| OTP tidak muncul | `pm2 restart 2fa-bot` |
| Bot mati setelah terminal tutup | Jalankan `pm2 startup` lalu `pm2 save` |
| Semua user dianggap belum join | Bot belum dijadikan admin channel |

---

## 📁 Struktur File

```
Bot-2fa/
├── bot.js          # File utama bot
├── package.json    # Dependencies
├── .env            # Konfigurasi (jangan di-share!)
├── .env.example    # Contoh konfigurasi
├── .gitignore      # File yang diabaikan git
└── README.md       # Dokumentasi ini
```

---

## 📞 Support

<div align="center">

| Platform | Link |
|----------|------|
| 📢 Channel | [@RayzellStores](https://t.me/RayzellStores) |
| 💬 Owner | [@RayzellStores](https://t.me/RayzellStores) |

⭐ **Kasih Star kalau bermanfaat!** ⭐

</div>

---

<div align="center">

Made with ❤️ by **RayzellStores**

</div>
