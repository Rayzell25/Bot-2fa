#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  setup-vps.sh — Install Redis + Docker + Local Bot API
#  Untuk: 2FA + Address Bot (RayzellStores)
#  Pakai : sudo bash setup-vps.sh
# ─────────────────────────────────────────────────────────────
set -e

# ── Edit dua nilai ini sebelum jalan ─────────────────────────
TELEGRAM_API_ID="${TELEGRAM_API_ID:-32773999}"
TELEGRAM_API_HASH="${TELEGRAM_API_HASH:-d2eb7260911dbce615a1fb27f36d4b12}"
# ─────────────────────────────────────────────────────────────

if [[ $EUID -ne 0 ]]; then
  echo "✗ Jalankan sebagai root (atau pakai sudo)." >&2
  exit 1
fi

# Lokasi file .env bot (override: ENV_FILE=/path/.env sudo -E bash setup-vps.sh)
ENV_FILE="${ENV_FILE:-/root/Bot-2fa/.env}"

# set_env KEY VALUE FILE — set/replace baris KEY=VALUE (idempotent, termasuk
# kalau baris-nya ada tapi kosong atau di-comment).
set_env() {
  local key="$1" val="$2" file="$3"
  [[ -f "$file" ]] || return 1
  # pastikan file diakhiri newline supaya append tidak nyambung
  [[ -s "$file" && -z "$(tail -c1 "$file")" ]] || printf '\n' >> "$file"
  if grep -qE "^[#[:space:]]*${key}=" "$file"; then
    sed -i -E "s|^[#[:space:]]*${key}=.*|${key}=${val}|" "$file"
  else
    printf '%s=%s\n' "$key" "$val" >> "$file"
  fi
}

echo "▶ 1/6  Install Redis ..."
apt update -y
apt install -y redis-server
systemctl enable --now redis-server
if redis-cli ping | grep -q PONG; then
  echo "  ✓ Redis aktif (PONG)"
else
  echo "  ✗ Redis gagal start" >&2
  exit 1
fi

echo "▶ 2/6  Install Docker ..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | bash
fi
systemctl enable --now docker
docker --version

echo "▶ 3/6  Jalankan Local Bot API container ..."
mkdir -p /root/bot-api-data /root/bot-api-temp

# Hapus container lama (kalau ada) supaya idempotent
docker rm -f telegram-bot-api >/dev/null 2>&1 || true

docker run -d \
  --name telegram-bot-api \
  --restart always \
  -p 127.0.0.1:8081:8081 \
  -e TELEGRAM_API_ID="${TELEGRAM_API_ID}" \
  -e TELEGRAM_API_HASH="${TELEGRAM_API_HASH}" \
  -e TELEGRAM_LOCAL=1 \
  -v /root/bot-api-data:/var/lib/telegram-bot-api \
  -v /root/bot-api-temp:/tmp/telegram-bot-api \
  aiogram/telegram-bot-api:latest >/dev/null

sleep 3
if docker ps --format '{{.Names}}' | grep -q '^telegram-bot-api$'; then
  echo "  ✓ Container telegram-bot-api jalan di 127.0.0.1:8081"
else
  echo "  ✗ Container gagal start. Cek: docker logs telegram-bot-api" >&2
  exit 1
fi

echo "▶ 4/6  Konfigurasi .env (BOT_API_ROOT + REDIS_URL) ..."
if [[ -f "$ENV_FILE" ]]; then
  set_env REDIS_URL    "redis://127.0.0.1:6379" "$ENV_FILE"
  set_env BOT_API_ROOT "http://127.0.0.1:8081"  "$ENV_FILE"
  echo "  ✓ .env diperbarui: $ENV_FILE"
  grep -E '^(REDIS_URL|BOT_API_ROOT)=' "$ENV_FILE" | sed 's/^/     /'
else
  echo "  ⚠ $ENV_FILE tidak ada. Tambahkan manual:"
  echo "     REDIS_URL=redis://127.0.0.1:6379"
  echo "     BOT_API_ROOT=http://127.0.0.1:8081"
fi

echo "▶ 5/6  Migrasi bot ke Local Bot API (logout dari cloud) ..."
# Saat pindah dari api.telegram.org ke server lokal, bot WAJIB logout dari
# cloud dulu, kalau tidak update bisa nyangkut / bot terasa delay/diem.
# Token diambil dari env BOT_TOKEN atau dari file .env bot.
if [[ -z "${BOT_TOKEN:-}" && -f "$ENV_FILE" ]]; then
  BOT_TOKEN="$(grep -E '^BOT_TOKEN=' "$ENV_FILE" | head -n1 | sed -E 's/^BOT_TOKEN=//; s/["'\'' ]//g; s/\r//g')"
fi

if [[ -z "${BOT_TOKEN:-}" ]]; then
  echo "  ⚠ BOT_TOKEN tidak ketemu (set di $ENV_FILE atau: export BOT_TOKEN=...)."
  echo "    Setelah isi .env, jalankan manual sekali:"
  echo "      curl -s \"https://api.telegram.org/bot<TOKEN>/logOut\""
else
  # Cek apakah local server sudah melayani bot ini
  LOCAL_ME="$(curl -s "http://127.0.0.1:8081/bot${BOT_TOKEN}/getMe" 2>/dev/null || true)"
  if echo "$LOCAL_ME" | grep -q '"ok":true'; then
    echo "  ✓ Local Bot API sudah melayani bot (getMe ok)"
  else
    echo "  • Logout dari cloud (api.telegram.org) dulu ..."
    curl -s "https://api.telegram.org/bot${BOT_TOKEN}/logOut" >/dev/null 2>&1 || true
    sleep 3
    LOCAL_ME="$(curl -s "http://127.0.0.1:8081/bot${BOT_TOKEN}/getMe" 2>/dev/null || true)"
    if echo "$LOCAL_ME" | grep -q '"ok":true'; then
      echo "  ✓ Berhasil migrasi ke Local Bot API (getMe ok)"
    else
      echo "  ⚠ Belum bisa verifikasi getMe ke local. Respon:"
      echo "    ${LOCAL_ME:-<kosong>}"
      echo "    Cek: docker logs telegram-bot-api"
    fi
  fi
fi
echo "  ℹ Catatan: setelah logout dari cloud, kamu tidak bisa balik ke"
echo "    api.telegram.org selama ~10 menit (batasan Telegram)."

echo "▶ 6/6  Selesai. .env sudah di-set otomatis:"
cat <<EOF

  REDIS_URL=redis://127.0.0.1:6379
  BOT_API_ROOT=http://127.0.0.1:8081

Tinggal restart bot:
  cd ~/Bot-2fa && npm install && pm2 restart 2fa-bot
  pm2 logs 2fa-bot --lines 20

Sukses kalau log menampilkan:
  Bot API       : http://localhost:8081
  Redis         : connected → redis://127.0.0.1:6379

Verifikasi cepat: ketik /ping di bot (harus < 60 ms) atau: bash check-speed.sh
EOF
