#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  setup-vps.sh — Install Redis + Docker + Local Bot API
#  Untuk: 2FA + Address Bot (RayzellStores)
#  Pakai : sudo bash setup-vps.sh
# ─────────────────────────────────────────────────────────────
set -e

# ── Edit dua nilai ini sebelum jalan (atau set via env var) ──
TELEGRAM_API_ID="${TELEGRAM_API_ID:-32773999}"
TELEGRAM_API_HASH="${TELEGRAM_API_HASH:-d2eb7260911dbce615a1fb27f36d4b12}"
# Lokasi .env bot (auto-update kalau ada)
ENV_FILE="${ENV_FILE:-$HOME/Bot-2fa/.env}"
# ─────────────────────────────────────────────────────────────

if [[ $EUID -ne 0 ]]; then
  echo "✗ Jalankan sebagai root (atau pakai sudo)." >&2
  exit 1
fi

# ─────────────────────────────────────────
echo "▶ 1/5  Install Redis ..."
# ─────────────────────────────────────────
apt update -y
apt install -y redis-server
systemctl enable --now redis-server
if redis-cli ping 2>/dev/null | grep -q PONG; then
  echo "  ✓ Redis aktif (PONG)"
else
  echo "  ✗ Redis gagal start" >&2
  exit 1
fi

# ─────────────────────────────────────────
echo "▶ 2/5  Install Docker ..."
# ─────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "  · Docker belum ada, mencoba install via get.docker.com ..."
  if ! curl -fsSL https://get.docker.com | bash; then
    echo "  · Script resmi gagal, fallback ke paket apt (docker.io) ..."
    apt install -y docker.io
  fi
else
  echo "  · Docker sudah terpasang."
fi

# Pastikan service jalan
systemctl enable --now docker 2>/dev/null || service docker start || true
sleep 2

# Verifikasi docker benar-benar bisa dipakai
if ! command -v docker >/dev/null 2>&1; then
  echo "  ✗ Docker gagal terinstall. Install manual lalu jalankan ulang script ini." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "  ✗ Docker terinstall tapi daemon tidak jalan. Coba: systemctl start docker" >&2
  exit 1
fi
echo "  ✓ Docker siap ($(docker --version))"

# ─────────────────────────────────────────
echo "▶ 3/5  Tarik image & jalankan Local Bot API ..."
# ─────────────────────────────────────────
mkdir -p /root/bot-api-data /root/bot-api-temp

# Pull image dulu (retry 3x) supaya error jaringan kelihatan jelas
for i in 1 2 3; do
  if docker pull aiogram/telegram-bot-api:latest; then break; fi
  echo "  · Pull gagal (percobaan $i/3), ulang dalam 5 detik ..."
  sleep 5
  [[ $i -eq 3 ]] && { echo "  ✗ Gagal menarik image. Cek koneksi internet VPS." >&2; exit 1; }
done

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
  echo "  ✗ Container gagal start. Cek log: docker logs telegram-bot-api" >&2
  docker logs --tail 20 telegram-bot-api 2>&1 || true
  exit 1
fi

# ─────────────────────────────────────────
echo "▶ 4/5  Update .env bot ..."
# ─────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  # Tambahkan REDIS_URL kalau belum ada
  if ! grep -q '^REDIS_URL=' "$ENV_FILE"; then
    echo 'REDIS_URL=redis://127.0.0.1:6379' >> "$ENV_FILE"
    echo "  ✓ REDIS_URL ditambahkan ke $ENV_FILE"
  else
    echo "  · REDIS_URL sudah ada, dilewati"
  fi
  # Tambahkan BOT_API_ROOT kalau belum ada
  if ! grep -q '^BOT_API_ROOT=' "$ENV_FILE"; then
    echo 'BOT_API_ROOT=http://localhost:8081' >> "$ENV_FILE"
    echo "  ✓ BOT_API_ROOT ditambahkan ke $ENV_FILE"
  else
    echo "  · BOT_API_ROOT sudah ada, dilewati"
  fi
else
  echo "  ⚠ $ENV_FILE tidak ditemukan. Tambahkan manual:"
  echo "      REDIS_URL=redis://127.0.0.1:6379"
  echo "      BOT_API_ROOT=http://localhost:8081"
fi

# ─────────────────────────────────────────
echo "▶ 5/5  Selesai!"
# ─────────────────────────────────────────
cat <<EOF

  Status:
    Redis            : $(redis-cli ping 2>/dev/null)
    Docker           : $(docker --version)
    Local Bot API    : http://127.0.0.1:8081 (container 'telegram-bot-api')

  Restart bot biar config kebaca:
    cd ~/Bot-2fa && npm install && pm2 restart 2fa-bot && pm2 logs 2fa-bot --lines 20

  Di log bot harus muncul:
    Bot API       : http://localhost:8081
    Redis         : connected → redis://127.0.0.1:6379
EOF
