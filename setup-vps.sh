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

echo "▶ 1/4  Install Redis ..."
apt update -y
apt install -y redis-server
systemctl enable --now redis-server
if redis-cli ping | grep -q PONG; then
  echo "  ✓ Redis aktif (PONG)"
else
  echo "  ✗ Redis gagal start" >&2
  exit 1
fi

echo "▶ 2/4  Install Docker ..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | bash
fi
systemctl enable --now docker
docker --version

echo "▶ 3/4  Jalankan Local Bot API container ..."
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

echo "▶ 4/4  Selesai. Tambahkan ini ke .env bot kamu:"
cat <<EOF

  REDIS_URL=redis://127.0.0.1:6379
  BOT_API_ROOT=http://localhost:8081

Lalu restart bot:
  cd ~/Bot-2fa && npm install && pm2 restart 2fa-bot
EOF
