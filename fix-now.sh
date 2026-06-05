#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  fix-now.sh — Perbaiki Local Bot API + aktifkan MODE CEPAT.
#  SEKALI JALAN, tanpa nano. Pakai:  sudo bash fix-now.sh
#
#  Memperbaiki penyebab "Can't create files in /tmp/telegram-bot-api"
#  (container crash-loop → ECONNREFUSED 8081 → bot lambat/diam):
#    • chmod 777 folder mount + jalankan container sebagai root (--user 0:0)
#    • verifikasi container BENERAN listen di 8081 (bukan cuma "ada")
#    • set .env (BOT_API_ROOT + REDIS_URL) otomatis via sed
#    • migrasi bot dari cloud ke lokal (logOut) + restart pm2
#  Kalau container tetap gagal → otomatis pakai cloud biar bot tetap hidup.
# ─────────────────────────────────────────────────────────────
set -uo pipefail

# Kredensial Telegram API (boleh override: TELEGRAM_API_ID=... sudo -E bash fix-now.sh)
API_ID="${TELEGRAM_API_ID:-32773999}"
API_HASH="${TELEGRAM_API_HASH:-d2eb7260911dbce615a1fb27f36d4b12}"

PM2_NAME="${PM2_NAME:-2fa-bot}"

# Cari folder bot otomatis
BOT_DIR="${BOT_DIR:-}"
if [[ -z "$BOT_DIR" ]]; then
  for d in "$HOME/Bot-2fa" "/root/Bot-2fa" "$(pwd)"; do
    [[ -f "$d/bot.js" ]] && { BOT_DIR="$d"; break; }
  done
fi
ENV_FILE="$BOT_DIR/.env"

if [[ $EUID -ne 0 ]]; then echo "✗ Jalankan dengan sudo: sudo bash fix-now.sh" >&2; exit 1; fi
if [[ ! -f "$ENV_FILE" ]]; then echo "✗ .env tidak ketemu di $ENV_FILE (set BOT_DIR=/path sudo -E bash fix-now.sh)" >&2; exit 1; fi

echo "▶ Folder bot : $BOT_DIR"

# set baris KEY=VALUE di .env (idempotent; aktifkan walau kosong/di-comment)
set_env() {
  local k="$1" v="$2"
  [[ -s "$ENV_FILE" && -z "$(tail -c1 "$ENV_FILE")" ]] || printf '\n' >> "$ENV_FILE"
  if grep -qE "^[#[:space:]]*${k}=" "$ENV_FILE"; then
    sed -i -E "s|^[#[:space:]]*${k}=.*|${k}=${v}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$k" "$v" >> "$ENV_FILE"
  fi
}

# ── 1) Redis ──
echo "▶ 1/5  Redis ..."
if ! command -v redis-server >/dev/null 2>&1; then
  apt-get update -y >/dev/null 2>&1 && apt-get install -y redis-server >/dev/null 2>&1
fi
systemctl enable --now redis-server >/dev/null 2>&1 || true
redis-cli ping >/dev/null 2>&1 && echo "  ✓ Redis aktif" || echo "  ⚠ Redis belum aktif (bot tetap jalan pakai in-memory)"

# ── 2) Container Local Bot API (fix permission + jalankan sebagai root) ──
echo "▶ 2/5  Local Bot API container ..."
mkdir -p /root/bot-api-data /root/bot-api-temp
chmod 777 /root/bot-api-data /root/bot-api-temp
docker rm -f telegram-bot-api >/dev/null 2>&1 || true
docker run -d --name telegram-bot-api --restart always --user 0:0 \
  -p 127.0.0.1:8081:8081 \
  -e TELEGRAM_API_ID="$API_ID" \
  -e TELEGRAM_API_HASH="$API_HASH" \
  -e TELEGRAM_LOCAL=1 \
  -v /root/bot-api-data:/var/lib/telegram-bot-api \
  -v /root/bot-api-temp:/tmp/telegram-bot-api \
  aiogram/telegram-bot-api:latest >/dev/null

# ── 3) Tunggu sampai benar-benar listen di 8081 ──
echo "▶ 3/5  Menunggu container siap ..."
LISTEN=0
for _ in $(seq 1 15); do
  sleep 2
  if curl -s -m 3 "http://127.0.0.1:8081/" >/dev/null 2>&1; then LISTEN=1; break; fi
  ST="$(docker inspect -f '{{.State.Status}}' telegram-bot-api 2>/dev/null || echo missing)"
  [[ "$ST" == "exited" || "$ST" == "restarting" ]] && break
done

# Token dari .env
TOKEN="$(grep -E '^BOT_TOKEN=' "$ENV_FILE" | head -n1 | sed -E "s/^BOT_TOKEN=//; s/[\"' ]//g; s/\r//g")"

# ── 4) Konfigurasi .env sesuai hasil ──
echo "▶ 4/5  Konfigurasi .env ..."
set_env REDIS_URL "redis://127.0.0.1:6379"

if [[ "$LISTEN" == "1" ]]; then
  echo "  ✓ Local Bot API listen di 127.0.0.1:8081"
  if [[ -n "$TOKEN" ]]; then
    if curl -s -m 5 "http://127.0.0.1:8081/bot$TOKEN/getMe" | grep -q '"ok":true'; then
      echo "  ✓ Bot sudah dilayani server lokal"
    else
      echo "  • Migrasi: logout dari cloud ..."
      curl -s -m 8 "https://api.telegram.org/bot$TOKEN/logOut" >/dev/null 2>&1 || true
      sleep 3
    fi
  fi
  set_env BOT_API_ROOT "http://127.0.0.1:8081"
  echo "  ✓ MODE CEPAT aktif (BOT_API_ROOT=http://127.0.0.1:8081)"
else
  echo "  ✗ Container masih gagal listen. 15 baris log terakhir:"
  docker logs --tail 15 telegram-bot-api 2>&1 | sed 's/^/      /'
  echo "  → Sementara pakai CLOUD biar bot tetap jalan (tidak diam)."
  sed -i -E 's|^BOT_API_ROOT=.*|#BOT_API_ROOT=http://127.0.0.1:8081|' "$ENV_FILE" 2>/dev/null || true
fi

# ── 5) Restart bot ──
echo "▶ 5/5  Restart bot ..."
cd "$BOT_DIR"
pm2 restart "$PM2_NAME" --update-env >/dev/null 2>&1 || pm2 start bot.js --name "$PM2_NAME" >/dev/null 2>&1
sleep 2

echo
echo "════════════ HASIL ════════════"
docker ps --filter name=telegram-bot-api --format 'container : {{.Status}}'
echo "BOT_API   : $(grep -E '^#?BOT_API_ROOT=' "$ENV_FILE" | head -n1)"
echo "REDIS     : $(grep -E '^#?REDIS_URL=' "$ENV_FILE" | head -n1)"
echo
if [[ "$LISTEN" == "1" ]]; then
  echo "✅ SELESAI — mode CEPAT. Ketik /ping di bot (harus < 20 ms)."
else
  echo "⚠ Bot jalan via cloud. Cek log container di atas, perbaiki, lalu ulangi: sudo bash fix-now.sh"
fi
echo "Log bot: pm2 logs $PM2_NAME --lines 20"
