<div align="center">

# 🔐 Generate2FA Bot

### Bot Telegram serba guna — Generate 2FA OTP, Alamat Indonesia Random, & Cek IP/ISP

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Telegram](https://img.shields.io/badge/Telegram-@Generate2FA__bot-blue?style=for-the-badge&logo=telegram)](https://t.me/Generate2FA_bot)
[![PM2](https://img.shields.io/badge/PM2-Managed-orange?style=for-the-badge)](https://pm2.keymetrics.io)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**by [RayzellStores](https://t.me/RayzellStores)**

</div>

---

## ✨ Fitur Lengkap

| Fitur | Keterangan |
|-------|-----------|
| 🔒 **Force Join Channel** | User wajib join channel sebelum bisa pakai bot |
| 🔐 **Generate 2FA OTP** | Generate kode TOTP real-time dari secret key (Base32) dengan countdown timer |
| 📍 **Random Address** | Generate alamat Indonesia acak dari 10 kota nyata, pilih 1–10 alamat |
| 🌐 **Cek IP / ISP** | Lookup IP publik atau domain — tampilkan ISP, negara, kota, koordinat, timezone |
| ✏️ **1-Message UI** | Semua navigasi dalam 1 pesan yang sama — tidak bikin chat baru |
| ⚡ **Respon Cepat** | answerCallbackQuery dipanggil paling awal, debounce 300ms, cache join 5 menit |
| 🔄 **Anti Spam Refresh** | Klik Refresh OTP berkali-kali tidak akan buat interval dobel |

---

## 📱 Tampilan & Cara Pakai Bot

### 1. Mulai Bot
Ketik `/start` di chat bot → Jika belum join channel, muncul tombol join dulu.

Setelah join, muncul menu utama:
```
Halo, Rayzell! Pilih fitur di bawah.

[ 🔐 Generate 2FA ]  [ 📍 Random Address ]
[       🌐 Cek IP / ISP        ]
```

---

### 2. Generate 2FA OTP
**Kegunaan:** Buat kamu yang perlu lihat kode 2FA tanpa buka Google Authenticator. Cocok untuk akun yang secret key-nya sudah disimpan.

**Cara pakai:**
1. Klik **🔐 Generate 2FA**
2. Bot minta kirim secret key (format Base32)
3. Kirim secret, contoh: `JBSWY3DPEHPK3PXP`
4. OTP langsung muncul dengan countdown timer:

```
🔐 2FA Code: 917034
🟢 Status: Aktif

████████░░  22s

[ ⏱ 22s ]  [ ← Kembali ]
```

Warna indikator:
- 🟢 Hijau = sisa waktu > 10 detik
- 🟡 Kuning = sisa 6–10 detik
- 🔴 Merah = sisa ≤ 5 detik (segera akan ganti)

Saat kode expired:
```
🔐 2FA Code: 917034
⏳ Status: Expired

Tap Refresh untuk mendapatkan kode baru.

[ ← Kembali ]  [ 🔄 Refresh ]
```
Klik **🔄 Refresh** → kode baru langsung muncul.

---

### 3. Random Address Indonesia
**Kegunaan:** Generate data alamat Indonesia lengkap untuk keperluan testing, form dummy, atau lainnya.

**Cara pakai:**
1. Klik **📍 Random Address**
2. Pilih jumlah alamat (1–10)
3. Alamat langsung tampil:

```
— #1 —
Street   : Jl. Sudirman No.42
City     : Jakarta Selatan
Province : DKI Jakarta
Phone    : +62 812 3456 7890
Postal   : 12920
Country  : Indonesia
Full     : Jl. Sudirman No.42, Jakarta Selatan, DKI Jakarta, 12920

[ ← Kembali ]  [ 🔄 Generate Baru ]
```

Kota yang tersedia: Jakarta Selatan, Yogyakarta, Semarang, Surabaya, Bandung, Medan, Banjarmasin, Makassar, Denpasar, Manado.

---

### 4. Cek IP / ISP
**Kegunaan:** Cek informasi detail dari IP publik atau domain — berguna untuk verifikasi ISP, lokasi server, atau geolokasi.

**Cara pakai:**
1. Klik **🌐 Cek IP / ISP**
2. Kirim IP atau domain, contoh: `8.8.8.8` atau `google.com`
3. Hasil muncul lengkap:

```
IP Lookup Result

Public IP   : 8.8.8.8
ISP         : Google LLC
Org         : Google LLC
ASN         : AS15169 Google LLC
Country     : United States 🇺🇸 (US)
City        : Mountain View
Region      : California
Coordinates : 37.4056, -122.0775
Timezone    : America/Los_Angeles
ZIP/Code    : 94043

🌍 Lihat di Google Maps

[ 🔄 Cek Lagi ]  [ ← Kembali ]
```

---

## 🖥️ Syarat VPS

| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| **OS** | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |
| **RAM** | 512 MB | 1 GB |
| **Storage** | 5 GB | 10 GB |
| **CPU** | 1 vCore | 1–2 vCore |

---

## 🚀 Deploy ke VPS (Pertama Kali)

> Jalankan semua perintah sebagai **root** atau user dengan `sudo`.

### STEP 1 — Update sistem
```bash
apt update && apt upgrade -y
apt install -y curl git nano
```

### STEP 2 — Install Node.js 18
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node -v
npm -v
```
Output harus: `v18.x.x`

### STEP 3 — Install PM2
```bash
npm install -g pm2
pm2 -v
```

### STEP 4 — Clone repository
```bash
cd ~
git clone https://github.com/Rayzell25/Bot-2fa.git
cd Bot-2fa
```

### STEP 5 — Install dependencies
```bash
npm install
```

### STEP 6 — Buat file .env
```bash
cp .env.example .env
nano .env
```

Isi dengan data kamu:
```env
BOT_TOKEN=isi_token_dari_botfather
OWNER_ID=isi_telegram_id_kamu
BOT_USERNAME=Generate2FA_bot
CHANNEL=@RayzellStores
```

Simpan: **CTRL+X → Y → Enter**

| Variabel | Cara Dapat |
|----------|-----------|
| `BOT_TOKEN` | Chat [@BotFather](https://t.me/BotFather) → `/newbot` |
| `OWNER_ID` | Chat [@userinfobot](https://t.me/userinfobot) |
| `BOT_USERNAME` | Username bot dari BotFather (tanpa `@`) |
| `CHANNEL` | Username channel kamu (format `@namachannel`) |

### STEP 7 — Jadikan bot sebagai admin channel
> ⚠️ **Wajib** agar fitur force-join berfungsi!

1. Buka channel Telegram kamu
2. **Edit Channel → Administrators → Add Administrator**
3. Cari username bot → centang ✅ **Add Members** → Simpan

### STEP 8 — Test jalankan
```bash
node bot.js
```

✅ Sukses jika muncul:
```
  Mode          : polling
  2FA + Address Bot — started
  Bot     : @Generate2FA_bot
  Owner   : 123456789
  Channel : @RayzellStores
```

Tekan **CTRL+C** untuk stop, lanjut ke step berikutnya.

### STEP 9 — Jalankan dengan PM2 (agar tetap hidup)
```bash
pm2 start bot.js --name "2fa-bot"
pm2 startup
```
Salin & jalankan perintah yang muncul dari `pm2 startup`, lalu:
```bash
pm2 save
```

### STEP 10 — Verifikasi
Buka Telegram → cari `@Generate2FA_bot` → ketik `/start`
Muncul menu utama = **✅ Bot berhasil berjalan!**

---

## 🔄 Update Bot (Saat Ada Perubahan)

Setiap kali ada update di GitHub, jalankan ini di VPS:

```bash
cd ~/Bot-2fa
git pull origin main
pm2 restart 2fa-bot
```

Cek log setelah restart:
```bash
pm2 logs 2fa-bot --lines 20
```

---

## 🛠️ Perintah PM2 Sehari-hari

```bash
pm2 status              # lihat status semua proses
pm2 logs 2fa-bot        # lihat log realtime
pm2 logs 2fa-bot --lines 50   # lihat 50 baris log terakhir
pm2 restart 2fa-bot     # restart bot
pm2 stop 2fa-bot        # stop bot
pm2 start 2fa-bot       # start bot (setelah stop)
pm2 delete 2fa-bot      # hapus dari PM2
pm2 monit               # dashboard monitor real-time
```

---

## ❗ Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `pm2: command not found` | Jalankan `npm install -g pm2` |
| `node: command not found` | Install ulang Node.js 18 dari NodeSource |
| Bot tidak respon | Cek log: `pm2 logs 2fa-bot` |
| Semua user dianggap belum join | Pastikan bot sudah dijadikan **admin** channel |
| OTP tidak muncul / error | `pm2 restart 2fa-bot` |
| Bot mati setelah terminal ditutup | Jalankan `pm2 startup` lalu `pm2 save` |
| `polling_error` di log | Bot token salah atau ada 2 instance bot berjalan — `pm2 list` lalu kill yang dobel |

---

## 📁 Struktur File

```
Bot-2fa/
├── bot.js          # File utama bot (semua logika di sini)
├── package.json    # Dependencies
├── .env            # Konfigurasi rahasia (jangan di-commit!)
├── .env.example    # Template konfigurasi
├── .gitignore      # File yang diabaikan git
└── README.md       # Dokumentasi ini
```

---

## 📞 Support & Channel

<div align="center">

| Platform | Link |
|----------|------|
| 🤖 Bot | [@Generate2FA_bot](https://t.me/Generate2FA_bot) |
| 📢 Channel | [@RayzellStores](https://t.me/RayzellStores) |
| 💬 Owner | [@RayzellStores](https://t.me/RayzellStores) |

⭐ **Kasih bintang kalau bermanfaat!** ⭐

</div>

---

<div align="center">

Made with ❤️ by **RayzellStores**

</div>
