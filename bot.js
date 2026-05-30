// Selalu load .env dan OVERRIDE env lama (mis. cache PM2) supaya perubahan
// di .env (OWNER_ID, dll) langsung kebaca walau cuma `pm2 restart`.
// .env = sumber kebenaran. Kalau file .env tidak ada, env dari luar tetap dipakai.
require('dotenv').config({ override: true });

const TelegramBot = require('node-telegram-bot-api');
const { TOTP, Secret } = require('otpauth');
const axios = require('axios');
const Redis = require('ioredis');
const fs    = require('fs');
const path  = require('path');

const BOT_TOKEN    = process.env.BOT_TOKEN    || '8643566619:AAHy98hpFwLsjHZwTl5XogtgoY60mNzsh9A';
const OWNER_ID     = parseInt(process.env.OWNER_ID || '1334793299');
const BOT_USERNAME = process.env.BOT_USERNAME  || 'auotorderbot';
const CHANNEL      = process.env.CHANNEL       || '@RayzellStores';

// ─────────────────────────────────────────
//   LOCAL BOT API (eliminasi latency)
// ─────────────────────────────────────────
// Isi BOT_API_ROOT dengan URL Local Bot API kamu, mis. http://localhost:8081
// Kosongkan untuk pakai server resmi https://api.telegram.org
const BOT_API_ROOT = process.env.BOT_API_ROOT || '';
console.log('  Bot API       :', BOT_API_ROOT || 'https://api.telegram.org (resmi)');

// ─────────────────────────────────────────
//   REDIS (cache session/state)
// ─────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL || '';
let redis = null;
if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: false,
  });
  redis.on('connect', () => console.log('  Redis         : connected →', REDIS_URL));
  redis.on('error', (err) => console.error('  Redis error   :', err.message));
} else {
  console.log('  Redis         : disabled (in-memory fallback)');
}

// ─────────────────────────────────────────
//   WEBHOOK / POLLING (auto-detect)
// ─────────────────────────────────────────
const WEBHOOK_URL  = process.env.WEBHOOK_URL  || '';
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '3000');

console.log('  Mode          :', WEBHOOK_URL ? `webhook (${WEBHOOK_URL})` : 'polling');

let bot;
if (WEBHOOK_URL) {
  // WEBHOOK mode — respon instan, direkomendasikan di VPS
  bot = new TelegramBot(BOT_TOKEN, {
    baseApiUrl: BOT_API_ROOT || undefined,
    webHook: { port: WEBHOOK_PORT },
  });
  bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`)
    .then(() => console.log(`  Webhook aktif : ${WEBHOOK_URL}/bot${BOT_TOKEN}`))
    .catch(err => console.error('  Webhook error:', err.message));
} else {
  // POLLING mode — fallback jika WEBHOOK_URL tidak diset
  // Long polling — interval 0 + timeout 60 detik = respon hampir instan
  bot = new TelegramBot(BOT_TOKEN, {
    baseApiUrl: BOT_API_ROOT || undefined,
    polling: {
      interval: 0,
      autoStart: true,
      params: {
        timeout: 60,
        allowed_updates: ['message', 'callback_query'],
      },
    },
  });
}

// ─────────────────────────────────────────
//   DATA ALAMAT INDONESIA (real)
// ─────────────────────────────────────────

const addresses = [
  {
    streets  : ['Jl. Sudirman No.', 'Jl. Thamrin No.', 'Jl. Gatot Subroto No.', 'Jl. Kuningan No.', 'Jl. HR Rasuna Said No.'],
    city     : 'Jakarta Selatan',
    province : 'DKI Jakarta',
    postal   : ['12190', '12920', '12930', '12940', '12950'],
    phone_prefix: '+62 812',
  },
  {
    streets  : ['Jl. Malioboro No.', 'Jl. Solo No.', 'Jl. Parangtritis No.', 'Jl. Kaliurang No.', 'Jl. Magelang No.'],
    city     : 'Yogyakarta',
    province : 'DI Yogyakarta',
    postal   : ['55213', '55221', '55231', '55241', '55251'],
    phone_prefix: '+62 821',
  },
  {
    streets  : ['Jl. Pemuda No.', 'Jl. Pandanaran No.', 'Jl. Gajah Mada No.', 'Jl. MT Haryono No.', 'Jl. Imam Bonjol No.'],
    city     : 'Semarang',
    province : 'Jawa Tengah',
    postal   : ['50132', '50133', '50134', '50135', '50136'],
    phone_prefix: '+62 817',
  },
  {
    streets  : ['Jl. Darmo No.', 'Jl. Basuki Rahmat No.', 'Jl. Gubeng No.', 'Jl. Diponegoro No.', 'Jl. Embong Malang No.'],
    city     : 'Surabaya',
    province : 'Jawa Timur',
    postal   : ['60241', '60251', '60261', '60271', '60281'],
    phone_prefix: '+62 813',
  },
  {
    streets  : ['Jl. Asia Afrika No.', 'Jl. Braga No.', 'Jl. Dago No.', 'Jl. Riau No.', 'Jl. Supratman No.'],
    city     : 'Bandung',
    province : 'Jawa Barat',
    postal   : ['40111', '40112', '40113', '40114', '40115'],
    phone_prefix: '+62 822',
  },
  {
    streets  : ['Jl. Imam Bonjol No.', 'Jl. Diponegoro No.', 'Jl. Pemuda No.', 'Jl. Sutomo No.', 'Jl. Nibung No.'],
    city     : 'Medan',
    province : 'Sumatera Utara',
    postal   : ['20151', '20152', '20153', '20154', '20155'],
    phone_prefix: '+62 811',
  },
  {
    streets  : ['Jl. Ahmad Yani No.', 'Jl. Lambung Mangkurat No.', 'Jl. Jendral Sudirman No.', 'Jl. Pangeran Samudera No.', 'Jl. Hasanuddin No.'],
    city     : 'Banjarmasin',
    province : 'Kalimantan Selatan',
    postal   : ['70111', '70112', '70113', '70114', '70115'],
    phone_prefix: '+62 851',
  },
  {
    streets  : ['Jl. Pettarani No.', 'Jl. Urip Sumoharjo No.', 'Jl. Sultan Hasanuddin No.', 'Jl. Ratulangi No.', 'Jl. Penghibur No.'],
    city     : 'Makassar',
    province : 'Sulawesi Selatan',
    postal   : ['90111', '90112', '90113', '90114', '90115'],
    phone_prefix: '+62 852',
  },
  {
    streets  : ['Jl. Diponegoro No.', 'Jl. Teuku Umar No.', 'Jl. Hayam Wuruk No.', 'Jl. Gatot Subroto No.', 'Jl. Imam Bonjol No.'],
    city     : 'Denpasar',
    province : 'Bali',
    postal   : ['80111', '80112', '80113', '80114', '80115'],
    phone_prefix: '+62 819',
  },
  {
    streets  : ['Jl. Sam Ratulangi No.', 'Jl. Ahmad Yani No.', 'Jl. Sudirman No.', 'Jl. Pierre Tendean No.', 'Jl. Walanda Maramis No.'],
    city     : 'Manado',
    province : 'Sulawesi Utara',
    postal   : ['95111', '95112', '95113', '95114', '95115'],
    phone_prefix: '+62 853',
  },
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAddress() {
  const loc    = randItem(addresses);
  const street = randItem(loc.streets) + rand(1, 150);
  const postal = randItem(loc.postal);
  const phone  = `${loc.phone_prefix} ${rand(1000, 9999)} ${rand(1000, 9999)}`;
  const full   = `${street}, ${loc.city}, ${loc.province}, ${postal}`;
  return { street, city: loc.city, province: loc.province, phone, postal, country: 'Indonesia', full };
}

function generateAddresses(n) {
  const res = [];
  for (let i = 0; i < n; i++) res.push(generateAddress());
  return res;
}

function formatAddress(addr, i) {
  return (
    `⎔ <b>#${i}</b>\n` +
    `⊹ Street   : <code>${addr.street}</code>\n` +
    `⊹ City     : <code>${addr.city}</code>\n` +
    `⊹ Province : <code>${addr.province}</code>\n` +
    `⊹ Phone    : <code>${addr.phone}</code>\n` +
    `⊹ Postal   : <code>${addr.postal}</code>\n` +
    `⊹ Country  : <code>${addr.country}</code>\n` +
    `⊹ Full     : <code>${addr.full}</code>`
  );
}

// ─────────────────────────────────────────
//   2FA HELPERS
// ─────────────────────────────────────────

function isValid2FASecret(input) {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z2-7]+=*$/.test(cleaned) && cleaned.length >= 16;
}

function getOTP(base32) {
  const totp = new TOTP({
    algorithm: 'SHA1', digits: 6, period: 30,
    secret: Secret.fromBase32(base32.trim().toUpperCase()),
  });
  return totp.generate();
}

function currentPeriod() {
  return Math.floor(Date.now() / 1000 / 30);
}

function secondsLeft() {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

function timerBar(secs) {
  const filled = Math.round((secs / 30) * 10);
  const empty  = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + `  ${secs}s`;
}

// Cek join channel — di-cache di Redis 5 menit supaya tidak getChatMember
// di setiap pesan (sumber utama latency). memJoin = fallback in-memory.
const JOIN_TTL = 5 * 60; // 5 menit
const memJoin  = new Map(); // userId → { ok, exp }

async function hasJoined(userId) {
  // 1) cek cache
  if (redis) {
    try {
      const c = await redis.get(`join:${userId}`);
      if (c === '1') return true;
      if (c === '0') return false;
    } catch {}
  } else {
    const c = memJoin.get(userId);
    if (c && c.exp > Date.now()) return c.ok;
  }

  // 2) cache miss → tanya Telegram
  let ok = true;
  try {
    const m = await bot.getChatMember(CHANNEL, userId);
    ok = !(m.status === 'kicked' || m.status === 'left');
  } catch {
    ok = true; // kalau error (mis. bot bukan admin), jangan blokir user
  }

  // 3) simpan ke cache
  if (redis) {
    try { await redis.set(`join:${userId}`, ok ? '1' : '0', 'EX', JOIN_TTL); } catch {}
  } else {
    memJoin.set(userId, { ok, exp: Date.now() + JOIN_TTL * 1000 });
  }
  return ok;
}

// ─────────────────────────────────────────
//   SESSIONS
// ─────────────────────────────────────────

const sessions   = {}; // OTP sessions (timer in-memory, tidak bisa di-cache)

// ── State store: Redis kalau ada, fallback in-memory ──
// msgCache  : userId → msgId (pesan utama, untuk di-edit)
// userState : userId → state string ('awaiting_ip', 'awaiting_2fa')
const memMsg   = {};
const memState = {};

const MSG_TTL   = 24 * 60 * 60; // 24 jam
const STATE_TTL = 60 * 60;      // 1 jam

async function getMsg(userId) {
  if (redis) {
    try {
      const v = await redis.get(`msg:${userId}`);
      return v ? parseInt(v) : undefined;
    } catch { return memMsg[userId]; }
  }
  return memMsg[userId];
}

async function setMsg(userId, msgId) {
  memMsg[userId] = msgId;
  if (redis) {
    try { await redis.set(`msg:${userId}`, msgId, 'EX', MSG_TTL); } catch {}
  }
}

async function getState(userId) {
  if (redis) {
    try { return (await redis.get(`state:${userId}`)) || undefined; }
    catch { return memState[userId]; }
  }
  return memState[userId];
}

async function setState(userId, state) {
  memState[userId] = state;
  if (redis) {
    try { await redis.set(`state:${userId}`, state, 'EX', STATE_TTL); } catch {}
  }
}

async function clearState(userId) {
  delete memState[userId];
  if (redis) {
    try { await redis.del(`state:${userId}`); } catch {}
  }
}

// Hapus cache status join (dipakai saat user klik "Sudah Join")
async function clearJoinCache(userId) {
  memJoin.delete(userId);
  if (redis) {
    try { await redis.del(`join:${userId}`); } catch {}
  }
}

function stopSession(userId) {
  if (sessions[userId]) {
    clearInterval(sessions[userId].timer);
    delete sessions[userId];
  }
}

// ─────────────────────────────────────────
//   CUSTOM EMOJI — load dari emoji.json (+ emoji.local.json)
//   emoji.json        : default + fallback unicode (di-commit ke git)
//   emoji.local.json  : { "key": "<custom_emoji_id>" } override runtime,
//                       ditulis otomatis oleh command /emoji (di-gitignore).
//   • id terisi  → render <tg-emoji emoji-id="ID">FALLBACK</tg-emoji> (Premium user lihat animasi)
//   • id kosong  → pakai fallback unicode polos (semua user lihat sama)
//   Referensi: https://core.telegram.org/bots/api#messageentity (type: custom_emoji)
// ─────────────────────────────────────────
const EMOJI_FILE       = path.join(__dirname, 'emoji.json');
const EMOJI_LOCAL_FILE = path.join(__dirname, 'emoji.local.json');

function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }
function escHTML(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function readJsonSafe(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

let EMOJI_META = [];   // urut: [{ key, fallback }] — urutan slot untuk /emoji
const E = {};          // key → string render (di-mutate live, jangan di-reassign)

function reloadEmoji() {
  const base  = readJsonSafe(EMOJI_FILE) || {};
  const local = readJsonSafe(EMOJI_LOCAL_FILE) || {}; // { key: "id" }
  const meta  = [];
  const map   = {};
  let withId = 0, total = 0;

  for (const [key, val] of Object.entries(base)) {
    if (key.startsWith('_') || !val || typeof val !== 'object') continue;
    total++;
    const fb = val.fallback || '';
    const id = String(local[key] || val.id || '').trim();
    meta.push({ key, fallback: fb });
    map[key] = id
      ? `<tg-emoji emoji-id="${escAttr(id)}">${escHTML(fb)}</tg-emoji>`
      : escHTML(fb);
    if (id) withId++;
  }

  EMOJI_META = meta;
  for (const k of Object.keys(E)) delete E[k]; // mutate object yang sama
  Object.assign(E, map);
  console.log(`  Emoji         : loaded ${total} keys (${withId} custom_emoji_id, ${total - withId} unicode)`);
  return { withId, total };
}
reloadEmoji();

// ─────────────────────────────────────────
//   KEYBOARDS
// ─────────────────────────────────────────

const mainMenu = {
  inline_keyboard: [[
    { text: '🔐 Generate 2FA',    callback_data: 'menu_2fa'     },
    { text: '📍 Random Address',  callback_data: 'menu_address' },
  ],[
    { text: '🌐 Cek IP / ISP',    callback_data: 'menu_ip'      },
  ]],
};

const joinOpts = {
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [[
      { text: '📢 Join Channel', url: 'https://t.me/RayzellStores' },
      { text: '✓ Sudah Join',   callback_data: 'check_join' },
    ]],
  },
};

// ─────────────────────────────────────────
//   SEND / EDIT helper (1 pesan saja)
// ─────────────────────────────────────────

async function sendOrEdit(chatId, userId, text, opts = {}) {
  const mid = await getMsg(userId);
  if (mid) {
    try {
      await bot.editMessageText(text, {
        chat_id   : chatId,
        message_id: mid,
        parse_mode: 'HTML',
        ...opts,
      });
      return mid;
    } catch (_) {}
  }
  // Kirim baru kalau belum ada atau gagal edit
  const sent = await bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...opts });
  await setMsg(userId, sent.message_id);
  return sent.message_id;
}

// ─────────────────────────────────────────
//   /emoji — OWNER only: pasang custom emoji premium otomatis
//   Cara pakai (butuh Telegram Premium):
//     • Ketik /emoji lalu tempel emoji-emoji PREMIUM di belakangnya:
//         /emoji 🔐📍🌐⭐🔥🚀⚠️👋🔄⏱🗺🪪📢
//       Emoji diisi ke slot SECARA URUT (lihat daftar EMOJI_META).
//     • Atau forward pesan ber-emoji-premium ke bot, lalu reply /emoji
//     • /emoji reset  → balik ke emoji unicode biasa
//   Bot otomatis simpan ke emoji.local.json + langsung aktif (tanpa restart).
// ─────────────────────────────────────────
function extractCustomEmoji(message) {
  const pick = (m) => {
    if (!m) return [];
    const txt  = m.text || m.caption || '';
    const ents = (m.entities || m.caption_entities || []).filter(e => e.type === 'custom_emoji');
    return ents
      .sort((a, b) => a.offset - b.offset)
      .map(e => ({ id: e.custom_emoji_id, base: txt.substr(e.offset, e.length) }));
  };
  const own = pick(message);              // prioritas: emoji di pesan /emoji itu sendiri
  return own.length ? own : pick(message.reply_to_message);
}

function ownerGuard(msg) {
  const userId = msg.from.id;
  if (userId === OWNER_ID) return true;
  bot.sendMessage(msg.chat.id,
    `🔒 Command ini khusus <b>OWNER</b>.\n\n` +
    `User ID kamu: <code>${userId}</code>\n` +
    `OWNER_ID di .env: <code>${OWNER_ID}</code>\n\n` +
    `Kalau ini akun kamu, set <code>OWNER_ID=${userId}</code> di .env lalu restart bot.`,
    { parse_mode: 'HTML' }
  );
  return false;
}

bot.onText(/^\/emoji(?:@\w+)?(?:\s+([\s\S]*))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const arg    = ((match && match[1]) || '').trim();
  console.log(`[/emoji] user ${userId} (owner=${OWNER_ID}) arg="${arg.slice(0, 40)}"`);

  if (!ownerGuard(msg)) return;

  // ── reset ──
  if (/^(reset|clear|hapus)$/i.test(arg)) {
    try { if (fs.existsSync(EMOJI_LOCAL_FILE)) fs.unlinkSync(EMOJI_LOCAL_FILE); } catch {}
    const { total } = reloadEmoji();
    return bot.sendMessage(chatId,
      `♻️ <b>Custom emoji direset.</b>\nSemua ${total} slot kembali ke emoji unicode biasa.`,
      { parse_mode: 'HTML' });
  }

  // ── ambil custom emoji dari pesan / reply ──
  const found = extractCustomEmoji(msg);

  if (found.length === 0) {
    const urut = EMOJI_META.map(m => m.fallback).join('');
    return bot.sendMessage(chatId,
      `⚠️ <b>Tidak ada custom emoji premium terdeteksi.</b>\n\n` +
      `<b>Cara pakai</b> (wajib punya Telegram Premium):\n` +
      `1. Ketik <code>/emoji</code> lalu tempel emoji <b>premium</b> di belakangnya, urut sesuai slot:\n` +
      `   <code>/emoji ${urut}</code>\n` +
      `2. Atau forward pesan ber-emoji-premium ke sini → reply <code>/emoji</code>\n\n` +
      `Urutan slot (${EMOJI_META.length}): ${EMOJI_META.map((m, i) => `${i + 1}.${m.key}`).join('  ')}\n\n` +
      `<i>Catatan: emoji unicode biasa (bukan premium) tidak punya ID, jadi tidak terdeteksi.</i>\n` +
      `<code>/emoji reset</code> untuk balik ke emoji biasa.`,
      { parse_mode: 'HTML' });
  }

  // ── assign URUT ke slot, simpan, reload live ──
  const local   = readJsonSafe(EMOJI_LOCAL_FILE) || {};
  const nAssign = Math.min(found.length, EMOJI_META.length);
  const rows    = [];
  for (let i = 0; i < nAssign; i++) {
    const { key, fallback } = EMOJI_META[i];
    local[key] = found[i].id;
    rows.push(`${i + 1}. <b>${key}</b> ${fallback} → <code>${found[i].id}</code>`);
  }

  try {
    fs.writeFileSync(EMOJI_LOCAL_FILE, JSON.stringify(local, null, 2));
  } catch (e) {
    return bot.sendMessage(chatId, `❌ Gagal menyimpan emoji.local.json: ${escHTML(e.message)}`, { parse_mode: 'HTML' });
  }

  const { withId, total } = reloadEmoji();

  let extra = '';
  if (found.length > EMOJI_META.length) extra += `\n⚠️ ${found.length - EMOJI_META.length} emoji ekstra diabaikan (slot cuma ${EMOJI_META.length}).`;
  if (nAssign < EMOJI_META.length)      extra += `\nℹ️ ${EMOJI_META.length - nAssign} slot belum diisi (masih unicode).`;

  await bot.sendMessage(chatId,
    `✅ <b>${nAssign} custom emoji terpasang & langsung aktif!</b>\n\n` +
    rows.join('\n') +
    `\n\nAktif sekarang: <b>${withId}/${total}</b> slot.${extra}\n\n` +
    `Ketik /start untuk lihat hasilnya. ${E.wave || ''}`,
    { parse_mode: 'HTML' });
});

// ─────────────────────────────────────────
//   /reload — OWNER only: muat ulang emoji.json + emoji.local.json (tanpa restart)
// ─────────────────────────────────────────
bot.onText(/^\/reload(?:@\w+)?\b/, async (msg) => {
  if (!ownerGuard(msg)) return;
  console.log(`[/reload] user ${msg.from.id}`);
  const { withId, total } = reloadEmoji();
  await bot.sendMessage(msg.chat.id,
    `♻️ <b>Reload selesai.</b>\nCustom emoji aktif: <b>${withId}/${total}</b> slot.`,
    { parse_mode: 'HTML' });
});

// ─────────────────────────────────────────
//   /whoami — utility, cek apakah ID kamu = OWNER_ID
// ─────────────────────────────────────────
bot.onText(/^\/whoami(?:@\w+)?\b/, async (msg) => {
  const userId = msg.from.id;
  const isOwner = userId === OWNER_ID;
  console.log(`[/whoami] from user ${userId} (owner=${OWNER_ID})`);
  await bot.sendMessage(msg.chat.id,
    `<b>User ID kamu:</b> <code>${userId}</code>\n` +
    `<b>OWNER_ID di .env:</b> <code>${OWNER_ID}</code>\n` +
    `<b>Status:</b> ${isOwner ? '✅ kamu adalah OWNER' : '❌ kamu BUKAN owner — set OWNER_ID di .env ke ' + userId}`,
    { parse_mode: 'HTML' }
  );
});

// ─────────────────────────────────────────
//   /start
// ─────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const name   = msg.from.first_name || 'Pengguna';
  const joined = await hasJoined(userId);

  stopSession(userId);

  if (!joined) {
    const sent = await bot.sendMessage(chatId,
      `${E.channel} <b>Gabung dulu yuk!</b>\n\nKamu harus join channel kami sebelum pakai bot ini.`,
      joinOpts
    );
    await setMsg(userId, sent.message_id);
    return;
  }

  await sendOrEdit(chatId, userId,
    `${E.wave} Halo, <b>${name}</b>!\n\n${E.star} Pilih fitur di bawah.`,
    { reply_markup: mainMenu }
  );
});

// ─────────────────────────────────────────
//   OTP SESSION
// ─────────────────────────────────────────

async function startOtpSession(userId, chatId, base32) {
  stopSession(userId);

  let otp;
  try { otp = getOTP(base32); }
  catch { return sendOrEdit(chatId, userId, `${E.warning} <b>Error:</b> This is not a valid 2FA Secret!`); }

  const startPeriod = currentPeriod();
  const secs        = secondsLeft();

  const msgId = await sendOrEdit(chatId, userId,
    `${E.lock} <b>Kode 2FA</b>\n\n⊹ <code>${otp}</code>`,
    {
      reply_markup: { inline_keyboard: [[
        { text: `⏱ ${secs}s`,   callback_data: `otp_refresh_${base32}` },
        { text: '← Back',        callback_data: 'otp_back' },
      ]]},
    }
  );

  const timer = setInterval(async () => {
    try {
      const nowPeriod = currentPeriod();
      const nowSecs   = secondsLeft();

      if (nowPeriod !== startPeriod) {
        clearInterval(sessions[userId]?.timer);
        if (sessions[userId]) sessions[userId].timer = null;

        await bot.editMessageText(
          `${E.lock} <b>Kode 2FA</b>\n\n⊹ <code>${otp}</code>\n\n${E.refresh} <i>Expired · Tap Refresh</i>`,
          {
            chat_id      : chatId,
            message_id   : msgId,
            parse_mode   : 'HTML',
            reply_markup : { inline_keyboard: [[
              { text: '← Back',    callback_data: 'otp_back' },
              { text: '↺ Refresh', callback_data: `otp_refresh_${base32}` },
            ]]},
          }
        );
        return;
      }

      await bot.editMessageText(
        `${E.lock} <b>Kode 2FA</b>\n\n⊹ <code>${otp}</code>`,
        {
          chat_id      : chatId,
          message_id   : msgId,
          parse_mode   : 'HTML',
          reply_markup : { inline_keyboard: [[
            { text: `⏱ ${nowSecs}s`, callback_data: `otp_refresh_${base32}` },
            { text: '← Back',         callback_data: 'otp_back' },
          ]]},
        }
      );
    } catch (e) {
      const em = e.message || '';
      if (em.includes('message to edit not found') || em.includes('MESSAGE_ID_INVALID')) {
        stopSession(userId);
      }
    }
  }, 2000);

  sessions[userId] = { secret: base32, chatId, msgId, timer };
}

// ─────────────────────────────────────────
//   CALLBACK QUERY
// ─────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const name   = query.from.first_name || 'Pengguna';
  const data   = query.data || '';

  // ── check_join ──
  if (data === 'check_join') {
    await clearJoinCache(userId); // pastikan cek fresh, bukan dari cache
    const joined = await hasJoined(userId);
    if (!joined) {
      return bot.answerCallbackQuery(query.id, {
        text: 'Kamu belum join. Silakan join channel dulu.', show_alert: true,
      });
    }
    await bot.answerCallbackQuery(query.id, { text: 'Berhasil! Selamat datang.' });
    await setMsg(userId, msgId);
    await sendOrEdit(chatId, userId,
      `${E.wave} Halo, <b>${name}</b>!\n\n${E.star} Pilih fitur di bawah.`,
      { reply_markup: mainMenu }
    );
    return;
  }

  // ── menu_2fa ──
  if (data === 'menu_2fa') {
    await bot.answerCallbackQuery(query.id);
    await setMsg(userId, msgId);
    stopSession(userId);
    await setState(userId, 'awaiting_2fa');
    await sendOrEdit(chatId, userId,
      `${E.lock} <b>Generate 2FA</b>\n\nKirim secret key 2FA kamu.\n\n⊹ Contoh: <code>JBSWY3DPEHPK3PXP</code>`,
      { reply_markup: { inline_keyboard: [[{ text: '← Back', callback_data: 'back_main' }]] } }
    );
    return;
  }

  // ── menu_address ──
  if (data === 'menu_address') {
    await bot.answerCallbackQuery(query.id);
    await setMsg(userId, msgId);
    await sendOrEdit(chatId, userId,
      `${E.pin} <b>Random Address</b>\n\nPilih jumlah alamat.`,
      {
        reply_markup: { inline_keyboard: [
          [
            { text: '1',  callback_data: 'addr_1'  },
            { text: '2',  callback_data: 'addr_2'  },
            { text: '3',  callback_data: 'addr_3'  },
            { text: '4',  callback_data: 'addr_4'  },
            { text: '5',  callback_data: 'addr_5'  },
          ],
          [
            { text: '6',  callback_data: 'addr_6'  },
            { text: '7',  callback_data: 'addr_7'  },
            { text: '8',  callback_data: 'addr_8'  },
            { text: '9',  callback_data: 'addr_9'  },
            { text: '10', callback_data: 'addr_10' },
          ],
          [{ text: '← Back', callback_data: 'back_main' }],
        ]},
      }
    );
    return;
  }

  // ── addr_N ──
  if (data.startsWith('addr_')) {
    const n    = parseInt(data.replace('addr_', ''));
    const last = data; // simpan untuk tombol Generate Baru
    await bot.answerCallbackQuery(query.id);
    await setMsg(userId, msgId);

    const addrs = generateAddresses(n);
    const text  = addrs.map((a, i) => formatAddress(a, i + 1)).join('\n\n');

    await sendOrEdit(chatId, userId, text, {
      reply_markup: { inline_keyboard: [[
        { text: '← Back',         callback_data: 'menu_address' },
        { text: '↺ Generate Baru', callback_data: last },
      ]]},
    });
    return;
  }

  // ── back_main ──
  if (data === 'back_main') {
    await bot.answerCallbackQuery(query.id);
    await setMsg(userId, msgId);
    stopSession(userId);
    await clearState(userId);
    await sendOrEdit(chatId, userId,
      `${E.wave} Halo, <b>${name}</b>!\n\n${E.star} Pilih fitur di bawah.`,
      { reply_markup: mainMenu }
    );
    return;
  }

  // ── otp_back ──
  if (data === 'otp_back') {
    await bot.answerCallbackQuery(query.id);
    stopSession(userId);
    await setMsg(userId, msgId);
    await sendOrEdit(chatId, userId,
      `${E.wave} Halo, <b>${name}</b>!\n\n${E.star} Pilih fitur di bawah.`,
      { reply_markup: mainMenu }
    );
    return;
  }

  // ── otp_refresh_<base32> ──
  if (data.startsWith('otp_refresh_')) {
    const base32 = data.slice(12);
    const sess   = sessions[userId];

    // Timer masih jalan = belum expired
    if (sess && sess.timer !== null) {
      const secs = secondsLeft();
      return bot.answerCallbackQuery(query.id, {
        text: `OTP masih aktif. Tunggu ${secs} detik lagi.`, show_alert: false,
      });
    }

    await bot.answerCallbackQuery(query.id, { text: 'Refreshed!' });
    await setMsg(userId, msgId);
    await startOtpSession(userId, chatId, base32);
    return;
  }

  // ── menu_ip ──
  if (data === 'menu_ip') {
    await bot.answerCallbackQuery(query.id);
    await setMsg(userId, msgId);
    await sendOrEdit(chatId, userId,
      `${E.globe} <b>Cek IP / ISP</b>\n\nKirim IP atau domain.\n\n⊹ <code>178.128.98.106</code>\n⊹ <code>google.com</code>`,
      { reply_markup: { inline_keyboard: [[{ text: '← Back', callback_data: 'back_main' }]] } }
    );
    await setState(userId, 'awaiting_ip');
    return;
  }

  await bot.answerCallbackQuery(query.id).catch(() => {});
});

// ─────────────────────────────────────────
//   MESSAGE — terima secret 2FA / IP lookup
// ─────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text.trim();

  if (!(await hasJoined(userId))) {
    return bot.sendMessage(chatId,
      `${E.channel} <b>Gabung dulu yuk!</b>\n\nKamu harus join channel kami sebelum pakai bot ini.`,
      joinOpts
    );
  }

  // Hapus pesan user biar chat tetap rapi
  try { await bot.deleteMessage(chatId, msg.message_id); } catch (_) {}

  const state = await getState(userId);

  // ── State: awaiting_ip ──
  if (state === 'awaiting_ip') {
    await clearState(userId);
    const query = text.trim();
    // Reset state dulu biar tidak nyangkut

    await sendOrEdit(chatId, userId,
      `${E.globe} <b>Mengecek...</b> <code>${query}</code>`,
      { reply_markup: { inline_keyboard: [[{ text: '← Back', callback_data: 'back_main' }]] } }
    );

    try {
      // Kalau domain, resolve dulu ke IP pakai ip-api
      const res = await axios.get(`http://ip-api.com/json/${encodeURIComponent(query)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, {
        timeout: 8000,
      });
      const d = res.data;

      if (d.status === 'fail') {
        await sendOrEdit(chatId, userId,
          `${E.warning} Gagal mengecek: <code>${query}</code>\n\n<i>${d.message || 'IP/domain tidak valid.'}</i>`,
          { reply_markup: { inline_keyboard: [[{ text: '← Back', callback_data: 'back_main' }]] } }
        );
        return;
      }

      // Flag emoji dari country code
      const flag = d.countryCode
        ? d.countryCode.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0)))
        : '';

      const mapsUrl = `https://www.google.com/maps?q=${d.lat},${d.lon}`;

      const result =
        `${E.globe} <b>Hasil IP Lookup</b>\n\n` +
        `${E.id} IP       : <code>${d.query}</code>\n` +
        `⊹ ISP      : <code>${d.isp}</code>\n` +
        `⊹ Org      : <code>${d.org}</code>\n` +
        `⊹ ASN      : <code>${d.as}</code>\n` +
        `⊹ Negara   : <code>${d.country} ${flag} (${d.countryCode})</code>\n` +
        `⊹ Kota     : <code>${d.city}</code>\n` +
        `⊹ Region   : <code>${d.regionName}</code>\n` +
        `⊹ Koordinat: <code>${d.lat}, ${d.lon}</code>\n` +
        `⊹ Timezone : <code>${d.timezone}</code>\n` +
        `⊹ ZIP      : <code>${d.zip || '-'}</code>\n\n` +
        `${E.map} <a href="${mapsUrl}">Lihat di Google Maps</a>`;

      await sendOrEdit(chatId, userId, result, {
        reply_markup: { inline_keyboard: [[
          { text: '↺ Cek Lagi',  callback_data: 'menu_ip'   },
          { text: '← Back',      callback_data: 'back_main' },
        ]]},
        disable_web_page_preview: true,
      });
    } catch (err) {
      await sendOrEdit(chatId, userId,
        `${E.warning} <b>Error:</b> Gagal menghubungi server. Coba lagi.\n\n<i>${err.message}</i>`,
        { reply_markup: { inline_keyboard: [[{ text: '← Back', callback_data: 'back_main' }]] } }
      );
    }
    return;
  }

  // ── State: awaiting_2fa ──
  if (state === 'awaiting_2fa') {
    const input = text.toUpperCase().replace(/\s+/g, '');
    if (!isValid2FASecret(input)) {
      await sendOrEdit(chatId, userId,
        `${E.warning} <b>Secret tidak valid.</b>\n\nCoba lagi atau kembali ke menu.`,
        { reply_markup: { inline_keyboard: [[{ text: '← Back', callback_data: 'back_main' }]] } }
      );
      return;
    }
    await clearState(userId);
    await startOtpSession(userId, chatId, input);
    return;
  }

  // ── Tidak ada state — abaikan input random ──
  // User kirim teks tanpa klik menu apapun — tidak diproses
});

// ─────────────────────────────────────────
//   ERROR HANDLER
// ─────────────────────────────────────────

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

// ─────────────────────────────────────────
//   STARTUP
// ─────────────────────────────────────────
console.log('');
console.log('  2FA + Address Bot — started');
console.log(`  Bot     : @${BOT_USERNAME}`);
console.log(`  Owner   : ${OWNER_ID}`);
console.log(`  Channel : ${CHANNEL}`);
console.log('');
