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
| `CHANNEL` | Opsional — hanya tampil di log startup (format: `@namachannel`) |

Simpan: **CTRL+X → Y → Enter**

### STEP 7 — Test Jalankan
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
Tekan **CTRL+C**, lanjut ke STEP 8.

### STEP 8 — Jalankan dengan PM2 (Permanent)
```bash
pm2 start bot.js --name "2fa-bot"
pm2 startup
# Salin & jalankan perintah yang muncul
pm2 save
```

### STEP 9 — Verifikasi
1. Buka Telegram → cari username bot
2. Ketik `/start`
3. Muncul menu utama → **✅ Bot berhasil!**

---

## ⚡ Performa: Redis + Local Bot API (opsional, sangat direkomendasikan)

Dua hal ini bikin bot **jauh lebih responsif** terutama di VPS jauh:

| Komponen | Fungsi |
|----------|--------|
| **Redis** | Cache session/state user → bot tetap "ingat" state walau di-restart |
| **Local Bot API** | Menghilangkan latency request ke `api.telegram.org` (jadi `localhost`) |

> 🧠 **Soal MTProto:** Local Bot API (`aiogram/telegram-bot-api`) **adalah** lapisan MTProto-nya — dia yang connect ke DC Telegram (`149.154.167.50:443`) via MTProto dari VPS kamu. Bot Node cuma ngobrol ke `localhost:8081` (HTTP, ~0ms). Inilah cara tercepat untuk sebuah **bot**. Catatan: bot Telegram **tidak bisa** pakai MTProto *client-to-client* (peer-to-peer) — itu khusus akun user (userbot), bukan akun bot.

### A. Install Redis
```bash
apt install redis-server -y && systemctl start redis && systemctl enable redis
redis-cli ping     # harus balas: PONG
```

### B. Install Docker (untuk Local Bot API)
```bash
curl -fsSL https://get.docker.com | bash
```

### C. Jalankan Local Bot API

> Ambil `API_ID` & `API_HASH` dari https://my.telegram.org → **API development tools**

```bash
docker run -d \
  --name telegram-bot-api \
  --restart always \
  -p 127.0.0.1:8081:8081 \
  -e TELEGRAM_API_ID=API_ID_KAMU \
  -e TELEGRAM_API_HASH=API_HASH_KAMU \
  -e TELEGRAM_LOCAL=1 \
  -v /root/bot-api-data:/var/lib/telegram-bot-api \
  -v /root/bot-api-temp:/tmp/telegram-bot-api \
  aiogram/telegram-bot-api:latest
```

Cek status:
```bash
docker ps                     # container harus "Up"
docker logs telegram-bot-api  # tidak boleh ada error
```

### C2. ⚠️ WAJIB: Logout dari cloud sebelum pakai Local API
Saat pindah dari `api.telegram.org` ke server lokal, bot **harus logout dari cloud dulu**. Kalau dilewati, update bisa nyangkut dan bot terasa **delay / diem**.

```bash
# ganti <TOKEN> dengan BOT_TOKEN kamu
curl -s "https://api.telegram.org/bot<TOKEN>/logOut"

# verifikasi local server sudah melayani bot (harus balas "ok":true)
curl -s "http://localhost:8081/bot<TOKEN>/getMe"
```
> Setelah logout, kamu **tidak bisa balik** ke `api.telegram.org` selama ~10 menit (batasan Telegram). Script `setup-vps.sh` melakukan langkah ini otomatis (step 4/5) kalau `BOT_TOKEN` ada di `.env`.

### D. Tambahkan ke `.env` bot kamu
```env
REDIS_URL=redis://127.0.0.1:6379
BOT_API_ROOT=http://localhost:8081
```

### E. Restart bot
```bash
cd ~/Bot-2fa
npm install      # install ioredis (kalau habis git pull)
pm2 restart 2fa-bot
pm2 logs 2fa-bot --lines 20
```

✅ Kalau berhasil, log akan menampilkan:
```
  Bot API       : http://localhost:8081
  Redis         : connected → redis://127.0.0.1:6379
```

> 💡 **Otomatis:** Jalankan `bash setup-vps.sh` untuk install Redis + Docker + Local Bot API sekaligus.

---

## 🎨 Custom Emoji (Telegram Premium)

Bot ini support **animated custom emoji** lewat tag `<tg-emoji emoji-id>`. Ada 2 hal penting:

1. **Hanya user Telegram Premium** yang melihat animasi. User biasa tetap lihat emoji unicode normal — itu memang batasan Telegram, bukan bug.
2. Emoji premium harus dikirim oleh akun yang **punya Telegram Premium** (cuma akun Premium yang bisa mengetik custom emoji).

> ⚠️ **Custom emoji hanya bisa di TEKS pesan, BUKAN di tombol.** Di **Bot API**, `InlineKeyboardButton` tidak punya field `icon_custom_emoji_id` — field itu hanya untuk *forum topic*. Tombol dengan custom emoji (mis. `{ text, icon_custom_emoji_id, callback_data }`) hanya ada di **TDLib/MTProto** (akun user), tidak bisa dikirim oleh bot. Jadi custom emoji bot ini tampil di header/teks menu via `<tg-emoji>`, bukan di label tombol.

### Cara pasang — otomatis ✨

> Wajib: kamu (OWNER) pakai **Telegram Premium**.

1. Di chat bot, ketik `/emoji` lalu **tempel emoji-emoji premium** di belakangnya, **urut sesuai slot**:
   ```
   /emoji 🔐📍🌐⭐🔥🚀⚠️👋🔄⏱🗺🪪📢
   ```
   (pakai versi *premium* dari emoji-emoji itu)
2. Bot otomatis ambil `custom_emoji_id`, simpan ke `emoji.local.json`, dan **langsung aktif tanpa restart**.
3. Bot balas tabel slot mana dapat emoji mana. Ketik `/start` untuk lihat hasilnya.

**Urutan slot:** `lock · pin · globe · star · fire · rocket · warning · wave · refresh · timer · map · id · channel`

Boleh kirim sebagian saja (mis. `/emoji 🔐📍` → cuma isi 2 slot pertama), atau forward pesan ber-emoji-premium ke bot lalu **reply** `/emoji`.

### Cara pasang — pakai ID mentah (tanpa Premium) 🔢

Kalau kamu sudah punya `custom_emoji_id` (angka), tidak perlu mengetik emoji premium:

```
/emoji 5368324170671202286 5379748062124047633        # urut sesuai slot
/emoji star 5368324170671202286                        # set 1 slot spesifik by nama
```

Dapat ID-nya: forward emoji premium ke [@userinfobot](https://t.me/userinfobot) / [@JsonDumpBot](https://t.me/JsonDumpBot), atau reply emoji premium dengan `/emoji`.

### Command terkait

| Command | Fungsi |
|---------|--------|
| `/emoji 🔐📍🌐...` | Pasang custom emoji ke slot secara urut, dari emoji premium (OWNER) |
| `/emoji <id> <id> ...` | Pasang custom emoji dari **ID angka**, urut sesuai slot (OWNER) |
| `/emoji <slot> <id>` | Set **1 slot** spesifik by nama, mis. `/emoji star 5368...` (OWNER) |
| `/emoji reset` | Hapus semua custom emoji, balik ke unicode (OWNER) |
| `/reload` | Muat ulang `emoji.json` + `emoji.local.json` tanpa restart (OWNER) |
| `/ping` | Diagnosa latency API — cek apakah Local Bot API aktif & seberapa cepat (OWNER) |
| `/whoami` | Cek user ID kamu vs `OWNER_ID` di `.env` |

> `emoji.local.json` ditulis otomatis oleh bot saat runtime dan sudah masuk `.gitignore`, jadi tidak bentrok saat `git pull`.

### Alternatif manual

Edit `emoji.json`, isi `id` tiap slot dengan `custom_emoji_id` asli (dapat via [@JsonDumpBot](https://t.me/JsonDumpBot): forward pesan premium → cari `custom_emoji_id`), lalu `/reload` atau `pm2 restart 2fa-bot`.

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
├── setup-vps.sh    # Installer Redis + Docker + Local Bot API
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
