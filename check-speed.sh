#!/usr/bin/env bash
# ─────────────────────────────────────────
#  Diagnosa kecepatan & konfigurasi bot
#  Pakai (di folder bot, di VPS):  bash check-speed.sh
# ─────────────────────────────────────────
set -uo pipefail

ENV_FILE="${ENV_FILE:-$(cd "$(dirname "$0")" && pwd)/.env}"

getenv() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -n1 | sed -E "s/^$1=//; s/[\"' ]//g; s/\r//g"; }

echo "════════════ DIAGNOSA BOT ════════════"
echo

# 1) Isi .env
if [[ -f "$ENV_FILE" ]]; then
  echo "📄 .env : $ENV_FILE"
  BOT_TOKEN="$(getenv BOT_TOKEN)"
  BOT_API_ROOT="$(getenv BOT_API_ROOT)"
  REDIS_URL="$(getenv REDIS_URL)"
  WEBHOOK_URL="$(getenv WEBHOOK_URL)"
else
  echo "⚠ .env TIDAK ketemu di: $ENV_FILE"
  BOT_TOKEN=""; BOT_API_ROOT=""; REDIS_URL=""; WEBHOOK_URL=""
fi
echo "  BOT_TOKEN    : ${BOT_TOKEN:+<terisi>}${BOT_TOKEN:-<KOSONG!>}"
echo "  BOT_API_ROOT : ${BOT_API_ROOT:-<kosong → pakai api.telegram.org (LAMBAT!)>}"
echo "  REDIS_URL    : ${REDIS_URL:-<kosong>}"
echo "  WEBHOOK_URL  : ${WEBHOOK_URL:-<kosong → mode polling (DISARANKAN)>}"
echo

# 2) Redis
echo "🧠 Redis :"
if command -v redis-cli >/dev/null 2>&1; then
  echo "   ping → $(redis-cli ping 2>&1)"
else
  echo "   redis-cli tidak ada (Redis belum diinstall?)"
fi
echo

# 3) Container Local Bot API
echo "🐳 Local Bot API (Docker) :"
if command -v docker >/dev/null 2>&1; then
  if docker ps --filter name=telegram-bot-api --format '{{.Names}}' 2>/dev/null | grep -q .; then
    docker ps --filter name=telegram-bot-api --format '   {{.Names}}  →  {{.Status}}'
  else
    echo "   ⚠ container 'telegram-bot-api' TIDAK jalan → Local API mati"
  fi
else
  echo "   docker tidak ada"
fi
echo

# 4) Latency getMe
API="${BOT_API_ROOT:-https://api.telegram.org}"
echo "⏱  Tes getMe → $API"
if [[ -n "$BOT_TOKEN" ]]; then
  START=$(date +%s%3N)
  RESP="$(curl -s -m 10 "$API/bot${BOT_TOKEN}/getMe" 2>/dev/null)"
  END=$(date +%s%3N)
  MS=$((END - START))
  if echo "$RESP" | grep -q '"ok":true'; then
    UNAME="$(echo "$RESP" | grep -o '"username":"[^"]*"' | head -1 | sed 's/"username":"//; s/"$//')"
    echo "   ✓ OK (${MS} ms)  @${UNAME}"
    if   [[ "$MS" -lt 60  ]]; then echo "   ⚡ SANGAT CEPAT — Local API aktif"
    elif [[ "$MS" -lt 200 ]]; then echo "   🟢 cepat"
    elif [[ "$MS" -lt 500 ]]; then echo "   🟡 sedang"
    else echo "   🐌 LAMBAT — kemungkinan masih lewat api.telegram.org / Local API belum aktif"; fi
  else
    echo "   ✗ Gagal: ${RESP:-<tidak ada respon>}"
  fi
else
  echo "   (BOT_TOKEN kosong, dilewati)"
fi
echo

# 5) Status webhook (deteksi bentrok polling vs webhook)
echo "🔗 Webhook info :"
if [[ -n "$BOT_TOKEN" ]]; then
  WH="$(curl -s -m 10 "$API/bot${BOT_TOKEN}/getWebhookInfo" 2>/dev/null)"
  URL="$(echo "$WH" | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"//; s/"$//')"
  PENDING="$(echo "$WH" | grep -o '"pending_update_count":[0-9]*' | head -1 | cut -d: -f2)"
  if [[ -z "$URL" ]]; then
    echo "   url = (kosong) → mode POLLING ✓ (cocok dgn WEBHOOK_URL kosong)"
    echo "   pending updates = ${PENDING:-0}"
  else
    echo "   url = $URL"
    echo "   pending updates = ${PENDING:-?}"
    echo "   ⚠ Ada webhook ke-set! Kalau WEBHOOK_URL di .env KOSONG (polling),"
    echo "     ini BENTROK (getUpdates 409) → bot lelet / tidak respon."
    echo "     Hapus: curl -s \"$API/bot<TOKEN>/deleteWebhook\""
  fi
else
  echo "   (BOT_TOKEN kosong, dilewati)"
fi
echo
echo "════════════ SELESAI ════════════"
echo "Ringkas: yang WAJIB untuk cepat = BOT_API_ROOT terisi + container telegram-bot-api jalan + getMe < 60ms."
