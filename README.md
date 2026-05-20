<div align="center">

# 🔐 Telegram 2FA Secret Bot

### Bot Telegram untuk generate & cek 2FA Secret secara real-time

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue?style=for-the-badge&logo=telegram)](https://t.me/RayzellStores)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**by [RayzellStores](https://t.me/RayzellStores)**

</div>

---

## ✨ Fitur

- 🔒 **Force Join Channel** — user wajib join channel sebelum bisa pakai bot
- 🔐 **Live OTP** — kode OTP real-time dengan countdown langsung di tombol
- 🔄 **Tombol Refresh** — muncul otomatis saat OTP expired, klik untuk dapat kode baru
- ⛔ **Validasi Secret** — kirim bukan Base32? langsung balas `Error: This is not 2FA Secret !`
- ⚡ **Respon cepat** — polling interval 300ms

---

## 📱 Cara Kerja Bot

1. `/start` → kalau belum join channel, disuruh join dulu
2. Kalau sudah join → bot balas: `Hello, please enter your 2FA Secret.`
3. Kirim secret key → bot balas OTP dengan countdown:

```
🔐 2FA Code: 917034
🟢 Status: Active

██████████  28s

[ ⏱ 28s ]
```

4. Countdown berjalan otomatis. Saat expired, tampilan berubah:

```
🔐 2FA Code: 917034
⏳ Status: Expired

Tap Refresh to get a new OTP.

[ 🔄 Refresh ]
```

5. Klik **Refresh** → OTP baru langsung muncul
6. Klik **Refresh sebelum expired** → ditolak, tampil notif "OTP masih aktif. Tunggu X detik."

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

---

### STEP 1 — Update VPS

```bash
apt update && apt upgrade -y
apt install -y curl git nano
```

---

### STEP 2 — Install Node.js 18

> ⚠️ Jangan pakai `apt install nodejs` langsung — versinya terlalu lama!

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

Verifikasi:
```bash
node -v   # harus v18.x.x
npm -v    # harus v8.x.x atau lebih
```

> ❌ Kalau masih versi lama:
> ```bash
> apt remove -y nodejs && apt autoremove -y
> curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
> apt install -y nodejs
> ```

---

### STEP 3 — Install PM2

```bash
npm install -g pm2
pm2 -v
```

---

### STEP 4 — Clone Repository

```bash
cd ~
git clone https://github.com/Rayzell25/Bot-2fa.git
cd Bot-2fa
```

---

### STEP 5 — Install Dependencies

```bash
npm install
```

---

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

---

### STEP 7 — Jadikan Bot sebagai Admin Channel

> ⚠️ **Wajib!** Bot harus jadi admin di channel agar force-join berfungsi.

1. Buka channel Telegram kamu
2. **Edit → Administrators → Add Administrator**
3. Cari username bot kamu
4. Aktifkan permission: ✅ **Add Members**
5. Simpan

---

### STEP 8 — Test Jalankan

```bash
node bot.js
```

✅ Sukses kalau muncul:
```
  2FA Secret Bot — started
  Bot      : @namabot
  Owner    : 123456789
  Channel  : @RayzellStores
```

Tekan **CTRL+C**, lalu lanjut ke STEP 9.

---

### STEP 9 — Jalankan dengan PM2 (Permanent)

```bash
pm2 start bot.js --name "2fa-bot"
pm2 startup
# Salin & jalankan perintah yang muncul dari pm2 startup
pm2 save
```

Cek status:
```bash
pm2 status
pm2 logs 2fa-bot
```

---

### STEP 10 — Verifikasi

1. Buka Telegram → cari username bot
2. Ketik `/start`
3. Kalau muncul `Hello, please enter your 2FA Secret.` → **✅ Bot berhasil!**

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
