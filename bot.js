// Load .env hanya kalau tidak diset dari luar (PM2 ecosystem)
if (!process.env.BOT_TOKEN) require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { TOTP, Secret } = require('otpauth');
const axios = require('axios');
const { REGIONS, generateOneAddress } = require('./countries');

const BOT_TOKEN    = process.env.BOT_TOKEN    || '8643566619:AAHy98hpFwLsjHZwTl5XogtgoY60mNzsh9A';
const OWNER_ID     = parseInt(process.env.OWNER_ID || '1334793299');
const BOT_USERNAME = process.env.BOT_USERNAME  || 'Generate2FA_bot';
const CHANNEL      = process.env.CHANNEL       || '@RayzellStores';

// ─────────────────────────────────────────
//   WEBHOOK / POLLING (auto-detect)
// ─────────────────────────────────────────
const WEBHOOK_URL  = process.env.WEBHOOK_URL  || '';
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '3000');

console.log('  Mode          :', WEBHOOK_URL ? `webhook (${WEBHOOK_URL})` : 'polling');

let bot;
if (WEBHOOK_URL) {
  // WEBHOOK mode — respon instan, direkomendasikan di VPS
  bot = new TelegramBot(BOT_TOKEN, { webHook: { port: WEBHOOK_PORT } });
  bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`)
    .then(() => console.log(`  Webhook aktif : ${WEBHOOK_URL}/bot${BOT_TOKEN}`))
    .catch(err => console.error('  Webhook error:', err.message));
} else {
  // POLLING mode — fallback jika WEBHOOK_URL tidak diset
  // Long polling — interval 0 + timeout 60 detik = respon hampir instan
  bot = new TelegramBot(BOT_TOKEN, {
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
//   ADDRESS HELPER
// ─────────────────────────────────────────

function formatAddress(addr) {
  return (
    `<b>📍 Address Result</b>\n\n` +
    `Street   : <code>${addr.street}</code>\n` +
    `City     : <code>${addr.city}</code>\n` +
    `Province : <code>${addr.province}</code>\n` +
    `Phone    : <code>${addr.phone}</code>\n` +
    `Postal   : <code>${addr.postal}</code>\n` +
    `Country  : <code>${addr.country}</code>\n` +
    `Full     : <code>${addr.full}</code>`
  );
}

// ─────────────────────────────────────────
//   ADDRESS PAGINATION HELPER
// ─────────────────────────────────────────

// Negara per halaman di daftar negara
const COUNTRY_PAGE_SIZE = 8;

function buildCountryKeyboard(region, page) {
  const list = REGIONS[region];
  const totalPages = Math.ceil(list.length / COUNTRY_PAGE_SIZE);
  const slice = list.slice(page * COUNTRY_PAGE_SIZE, (page + 1) * COUNTRY_PAGE_SIZE);
  // tombol negara 2 per baris
  const rows = [];
  for (let i = 0; i < slice.length; i += 2) {
    const row = [{ text: slice[i], callback_data: `addr_gen_${slice[i]}` }];
    if (slice[i + 1]) row.push({ text: slice[i + 1], callback_data: `addr_gen_${slice[i + 1]}` });
    rows.push(row);
  }
  // navigasi prev/next
  const nav = [];
  if (page > 0)              nav.push({ text: '◀ Prev', callback_data: `addr_country_${region}_${page - 1}` });
  if (page < totalPages - 1) nav.push({ text: 'Next ▶', callback_data: `addr_country_${region}_${page + 1}` });
  if (nav.length) rows.push(nav);
  rows.push([{ text: '← Kembali', callback_data: 'menu_address' }]);
  return { inline_keyboard: rows };
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

// ── hasJoined cache: 5 menit per user ──
const joinCache = {}; // userId → { result, ts }
const JOIN_CACHE_TTL = 5 * 60 * 1000; // 5 menit

async function hasJoined(userId) {
  const now = Date.now();
  const cached = joinCache[userId];
  if (cached && (now - cached.ts) < JOIN_CACHE_TTL) return cached.result;
  try {
    const m = await bot.getChatMember(CHANNEL, userId);
    const result = !(m.status === 'kicked' || m.status === 'left');
    joinCache[userId] = { result, ts: now };
    return result;
  } catch {
    joinCache[userId] = { result: true, ts: now };
    return true;
  }
}

// ─────────────────────────────────────────
//   SESSIONS
// ─────────────────────────────────────────

const sessions   = {}; // OTP sessions
const msgCache   = {}; // userId → msgId (pesan utama, untuk di-edit)
const userState  = {}; // userId → state string ('awaiting_ip', dll)
const cbDebounce = {}; // userId → timestamp last callback (debounce 500ms)
const cbLock     = {}; // userId → true kalau callback sedang diproses (processing lock)

function stopSession(userId) {
  if (sessions[userId]) {
    clearInterval(sessions[userId].timer);
    delete sessions[userId];
  }
}

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
//   CUSTOM EMOJI HELPER
// ─────────────────────────────────────────

// Custom Emoji ID milik owner — dipasang sebagai dekorasi di teks pesan
const CE_ID   = '5318986077455795572'; // custom emoji ID
const CE_CHAR = '⭐';                   // placeholder emoji (1 karakter, length=2 UTF-16)

// Hitung byte-offset UTF-16 dari sebuah string sampai indeks karakter ke-n
function utf16Offset(str, charIndex) {
  let offset = 0;
  for (let i = 0; i < charIndex; i++) {
    const cp = str.codePointAt(i);
    offset += cp > 0xFFFF ? 2 : 1;
    if (cp > 0xFFFF) i++; // surrogate pair → lewati extra
  }
  return offset;
}

// Kirim pesan baru dengan custom emoji entity via raw HTTP (entities + reply_markup)
async function sendMsgWithEmoji(chatId, text, cePositions, opts = {}) {
  const entities = cePositions.map(charIdx => ({
    type           : 'custom_emoji',
    offset         : utf16Offset(text, charIdx),
    length         : 2,
    custom_emoji_id: CE_ID,
  }));
  const body = {
    chat_id  : chatId,
    text,
    entities,
    ...opts,
  };
  const res = await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    body, { timeout: 8000 }
  );
  return res.data.result;
}

// Edit pesan existing dengan custom emoji entity via raw HTTP
// Error selain "message is not modified" di-swallow supaya caller tidak crash
// dan tidak ada fallback ke sendMessage yang tidak diinginkan.
async function editMsgWithEmoji(chatId, messageId, text, cePositions, opts = {}) {
  const entities = cePositions.map(charIdx => ({
    type           : 'custom_emoji',
    offset         : utf16Offset(text, charIdx),
    length         : 2,
    custom_emoji_id: CE_ID,
  }));
  const body = {
    chat_id   : chatId,
    message_id: messageId,
    text,
    entities,
    ...opts,
  };
  try {
    const res = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`,
      body, { timeout: 8000 }
    );
    return res.data.result;
  } catch (e) {
    const desc = e?.response?.data?.description || e.message || '';
    // "message is not modified" → konten sama, bukan error
    // semua error lain → silent-ignore, jangan throw ke caller
    // (caller sudah set msgCache, throw akan bikin handler crash & pesan baru muncul)
    return null;
  }
}

// ─────────────────────────────────────────
//   SEND / EDIT helper (1 pesan saja)
//   ATURAN GLOBAL: semua output bot harus lewat sini.
//   sendMessage HANYA boleh dipanggil jika msgCache kosong atau pesan benar hilang.
//   hintMsgId: kalau diisi, gunakan ini sebagai anchor sebelum cek msgCache
//   (dipakai oleh callback handler supaya double-click tidak buat pesan baru)
// ─────────────────────────────────────────

async function sendOrEdit(chatId, userId, text, opts = {}, hintMsgId = null) {
  // Kalau ada hintMsgId dari callback, paksa update msgCache dulu
  if (hintMsgId && !msgCache[userId]) {
    msgCache[userId] = hintMsgId;
  }
  const mid = msgCache[userId];
  if (mid) {
    try {
      await bot.editMessageText(text, {
        chat_id   : chatId,
        message_id: mid,
        parse_mode: 'HTML',
        ...opts,
      });
      return mid;
    } catch (err) {
      const em = err.message || '';
      // Konten sama persis → bukan error, abaikan, kembalikan mid yang ada
      if (em.includes('message is not modified')) return mid;
      // Pesan benar-benar sudah tidak ada → hapus cache, kirim baru di bawah
      if (
        em.includes('message to edit not found') ||
        em.includes('MESSAGE_ID_INVALID') ||
        em.includes("message can't be edited")
      ) {
        delete msgCache[userId];
        // jatuh ke sendMessage di bawah
      } else {
        // Semua error lain (rate limit, network, dll)
        // → JANGAN kirim baru, tetap return mid supaya 1-message UI terjaga
        return mid;
      }
    }
  }
  // Kirim pesan baru hanya kalau msgCache kosong atau pesan sudah benar-benar hilang
  const sent = await bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...opts });
  msgCache[userId] = sent.message_id;
  return sent.message_id;
}

// ─────────────────────────────────────────
//   /start
// ─────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const name   = msg.from.first_name || 'Pengguna';
  const joined = await hasJoined(userId);

  stopSession(userId);
  delete msgCache[userId]; // reset agar /start selalu kirim pesan baru yang bersih

  if (!joined) {
    const sent = await bot.sendMessage(chatId,
      `Untuk menggunakan bot ini, kamu harus join channel kami dulu.`,
      joinOpts
    );
    msgCache[userId] = sent.message_id;
    return;
  }

  // Teks menu utama — CE_CHAR di posisi 0 sebagai dekorasi
  const menuText = `${CE_CHAR} Halo, <b>${name}</b>! Pilih fitur di bawah.`;
  const sent = await sendMsgWithEmoji(chatId, menuText, [0], {
    parse_mode  : 'HTML',
    reply_markup: mainMenu,
  });
  msgCache[userId] = sent.message_id;
});

// ─────────────────────────────────────────
//   OTP SESSION
// ─────────────────────────────────────────

async function startOtpSession(userId, chatId, base32) {
  // Hentikan & bersihkan session lama DULU sebelum buat baru
  stopSession(userId);
  // Tandai session sedang dibuat untuk cegah double-call saat spam Refresh
  sessions[userId] = { secret: base32, chatId, msgId: null, timer: null, starting: true };

  let otp;
  try { otp = getOTP(base32); }
  catch { return sendOrEdit(chatId, userId, `Error: This is not 2FA Secret !`); }

  const startPeriod = currentPeriod();
  const secs        = secondsLeft();
  const ic          = secs <= 5 ? '🔴' : secs <= 10 ? '🟡' : '🟢';

  const msgId = await sendOrEdit(chatId, userId,
    `🔐 2FA Code: <code>${otp}</code>\n` +
    `${ic} Status: <b>Aktif</b>\n\n` +
    `<code>${timerBar(secs)}</code>`,
    {
      reply_markup: { inline_keyboard: [[
        { text: `⏱ ${secs}s`,       callback_data: `otp_refresh_${base32}` },
        { text: '← Kembali',        callback_data: 'otp_back' },
      ]]},    }
  );

  const timer = setInterval(async () => {
    try {
      const nowPeriod = currentPeriod();
      const nowSecs   = secondsLeft();

      if (nowPeriod !== startPeriod) {
        clearInterval(sessions[userId]?.timer);
        if (sessions[userId]) sessions[userId].timer = null;

        await bot.editMessageText(
          `🔐 2FA Code: <code>${otp}</code>\n` +
          `⏳ Status: <b>Expired</b>\n\n` +
          `Tap Refresh untuk mendapatkan kode baru.`,
          {
            chat_id      : chatId,
            message_id   : msgId,
            parse_mode   : 'HTML',
            reply_markup : { inline_keyboard: [[
              { text: '← Kembali',  callback_data: 'otp_back' },
              { text: '🔄 Refresh', callback_data: `otp_refresh_${base32}` },
            ]]},
          }
        );
        return;
      }

      const ic2 = nowSecs <= 5 ? '🔴' : nowSecs <= 10 ? '🟡' : '🟢';
      await bot.editMessageText(
        `🔐 2FA Code: <code>${otp}</code>\n` +
        `${ic2} Status: <b>Aktif</b>\n\n` +
        `<code>${timerBar(nowSecs)}</code>`,
        {
          chat_id      : chatId,
          message_id   : msgId,
          parse_mode   : 'HTML',
          reply_markup : { inline_keyboard: [[
            { text: `⏱ ${nowSecs}s`, callback_data: `otp_refresh_${base32}` },
            { text: '← Kembali',    callback_data: 'otp_back' },
          ]]},        }
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

  // ── answerCallbackQuery PALING AWAL — hilangkan spinner segera ──
  // Dilakukan sebelum debounce/lock supaya Telegram tidak timeout
  bot.answerCallbackQuery(query.id).catch(() => {});

  // ── Debounce 500ms + Processing Lock ──
  // Keduanya diperlukan: debounce tolak klik ke-2 yang datang cepat,
  // lock mencegah race condition klik ke-3 yang lolos debounce saat
  // handler pertama masih async (await edit).
  const now = Date.now();
  if (cbDebounce[userId] && (now - cbDebounce[userId]) < 500) return;
  if (cbLock[userId]) return;

  cbDebounce[userId] = now;
  cbLock[userId]     = true;

  try {
    await _handleCallback(userId, chatId, msgId, name, data, query.id);
  } catch (_) {
    // Tangkap semua error supaya lock selalu di-release
  } finally {
    cbLock[userId] = false;
  }
});

// Handler isi callback — dipisah supaya try-finally rapi
async function _handleCallback(userId, chatId, msgId, name, data, queryId) {

  // ── check_join ──
  if (data === 'check_join') {
    const joined = await hasJoined(userId);
    if (!joined) {
      bot.answerCallbackQuery(queryId, {
        text: 'Kamu belum join. Silakan join channel dulu.', show_alert: true,
      }).catch(() => {});
      return;
    }
    bot.answerCallbackQuery(queryId, { text: 'Berhasil! Selamat datang.' }).catch(() => {});
    msgCache[userId] = msgId;
    const menuText = `${CE_CHAR} Halo, <b>${name}</b>! Pilih fitur di bawah.`;
    await editMsgWithEmoji(chatId, msgId, menuText, [0], {
      parse_mode  : 'HTML',
      reply_markup: mainMenu,
    });
    return;
  }

  // ── menu_2fa ──
  if (data === 'menu_2fa') {
    msgCache[userId] = msgId;
    stopSession(userId);
    delete userState[userId];
    userState[userId] = 'awaiting_2fa';
    const t2fa = `${CE_CHAR} <b>Generate 2FA</b>\n\nKirim secret key 2FA kamu (Base32).\n\n<i>Contoh: <code>JBSWY3DPEHPK3PXP</code></i>`;
    await editMsgWithEmoji(chatId, msgId, t2fa, [0], {
      parse_mode  : 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] },
    });
    return;
  }

  // ── menu_address ──
  if (data === 'menu_address') {
    msgCache[userId] = msgId;
    const tAddr = `${CE_CHAR} <b>Random Address</b>\n\nPilih region:`;
    await editMsgWithEmoji(chatId, msgId, tAddr, [0], {
      parse_mode  : 'HTML',
      reply_markup: { inline_keyboard: [
        [
          { text: '🌏 Asia',   callback_data: 'addr_country_Asia_0'   },
          { text: '🌍 Europe', callback_data: 'addr_country_Europe_0' },
        ],
        [{ text: '← Kembali', callback_data: 'back_main' }],
      ]},
    });
    return;
  }

  // ── addr_country_REGION_PAGE — daftar negara dengan pagination ──
  if (data.startsWith('addr_country_')) {
    msgCache[userId] = msgId;
    // format: addr_country_Asia_0
    const parts  = data.slice('addr_country_'.length).split('_');
    const page   = parseInt(parts[parts.length - 1]);
    const region = parts.slice(0, -1).join('_'); // handle multi-word regions
    const kb = buildCountryKeyboard(region, page);
    const tR = `${CE_CHAR} <b>Random Address — ${region}</b>\n\nPilih negara:`;
    await editMsgWithEmoji(chatId, msgId, tR, [0], {
      parse_mode  : 'HTML',
      reply_markup: kb,
    });
    return;
  }

  // ── addr_gen_COUNTRY — generate 1 alamat dari negara ini ──
  if (data.startsWith('addr_gen_')) {
    msgCache[userId] = msgId;
    const country = data.slice('addr_gen_'.length);
    const addr    = generateOneAddress(country);
    if (!addr) {
      await sendOrEdit(chatId, userId, `❌ Negara tidak ditemukan: <code>${country}</code>`, {
        reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'menu_address' }]] },
      }, msgId);
      return;
    }
    // Cari region negara ini untuk tombol back
    const region = Object.keys(REGIONS).find(r => REGIONS[r].includes(country)) || 'Asia';
    const page   = Math.floor(REGIONS[region].indexOf(country) / COUNTRY_PAGE_SIZE);
    await sendOrEdit(chatId, userId, formatAddress(addr), {
      reply_markup: { inline_keyboard: [[
        { text: '🔄 Generate Again', callback_data: `addr_gen_${country}` },
        { text: '← Kembali',        callback_data: `addr_country_${region}_${page}` },
      ]]},
    }, msgId);
    return;
  }

  // ── addr_N (legacy) — kept for safety, redirect ke menu_address ──
  if (data.startsWith('addr_')) {
    msgCache[userId] = msgId;
    const tAddr = `${CE_CHAR} <b>Random Address</b>\n\nPilih region:`;
    await editMsgWithEmoji(chatId, msgId, tAddr, [0], {
      parse_mode  : 'HTML',
      reply_markup: { inline_keyboard: [
        [
          { text: '🌏 Asia',   callback_data: 'addr_country_Asia_0'   },
          { text: '🌍 Europe', callback_data: 'addr_country_Europe_0' },
        ],
        [{ text: '← Kembali', callback_data: 'back_main' }],
      ]},
    });
    return;
  }

  // ── back_main ──
  if (data === 'back_main') {
    msgCache[userId] = msgId;
    stopSession(userId);
    delete userState[userId];
    const menuText = `${CE_CHAR} Halo, <b>${name}</b>! Pilih fitur di bawah.`;
    await editMsgWithEmoji(chatId, msgId, menuText, [0], {
      parse_mode  : 'HTML',
      reply_markup: mainMenu,
    });
    return;
  }

  // ── otp_back ──
  if (data === 'otp_back') {
    stopSession(userId);
    msgCache[userId] = msgId;
    const menuText = `${CE_CHAR} Halo, <b>${name}</b>! Pilih fitur di bawah.`;
    await editMsgWithEmoji(chatId, msgId, menuText, [0], {
      parse_mode  : 'HTML',
      reply_markup: mainMenu,
    });
    return;
  }

  // ── otp_refresh_<base32> ──
  if (data.startsWith('otp_refresh_')) {
    const base32 = data.slice(12);
    const sess   = sessions[userId];

    // Timer masih jalan ATAU session sedang diinisialisasi = tolak spam
    if (sess && (sess.timer !== null || sess.starting)) {
      const secs = secondsLeft();
      bot.answerCallbackQuery(queryId, {
        text: `OTP masih aktif. Tunggu ${secs} detik lagi.`, show_alert: false,
      }).catch(() => {});
      return;
    }

    msgCache[userId] = msgId;
    await startOtpSession(userId, chatId, base32);
    return;
  }

  // ── menu_ip ──
  if (data === 'menu_ip') {
    msgCache[userId] = msgId;
    const tIp = `${CE_CHAR} <b>Cek IP / ISP</b>\n\nKirim IP address atau domain yang ingin dicek.\n\n<i>Contoh:</i>\n<code>178.128.98.106</code>\n<code>google.com</code>`;
    await editMsgWithEmoji(chatId, msgId, tIp, [0], {
      parse_mode  : 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] },
    });
    userState[userId] = 'awaiting_ip';
    return;
  }
}

// ─────────────────────────────────────────
//   MESSAGE — terima secret 2FA / IP lookup
// ─────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text.trim();

  // ── Debounce pesan: abaikan kalau kirim < 800ms dari pesan sebelumnya ──
  // Naikkan ke 800ms supaya spam paste 5x sekaligus tetap hanya proses 1
  const nowMsg = Date.now();
  if (cbDebounce[`msg_${userId}`] && (nowMsg - cbDebounce[`msg_${userId}`]) < 800) {
    try { await bot.deleteMessage(chatId, msg.message_id); } catch (_) {}
    return;
  }
  cbDebounce[`msg_${userId}`] = nowMsg;

  // Hapus pesan user biar chat tetap rapi (sebelum cek join supaya pesan user hilang)
  try { await bot.deleteMessage(chatId, msg.message_id); } catch (_) {}

  if (!(await hasJoined(userId))) {
    // Pakai sendOrEdit supaya tetap 1-message UI
    await sendOrEdit(chatId, userId,
      `Untuk menggunakan bot ini, kamu harus join channel kami dulu.`,
      joinOpts
    );
    return;
  }

  // ── State: awaiting_ip ──
  if (userState[userId] === 'awaiting_ip') {
    delete userState[userId];
    const query = text.trim();

    await sendOrEdit(chatId, userId,
      `🌐 <b>Mengecek...</b> <code>${query}</code>`,
      { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
    );

    try {
      const res = await axios.get(`http://ip-api.com/json/${encodeURIComponent(query)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, {
        timeout: 8000,
      });
      const d = res.data;

      if (d.status === 'fail') {
        await sendOrEdit(chatId, userId,
          `❌ <b>Gagal mengecek:</b> <code>${query}</code>\n\n<i>${d.message || 'IP/domain tidak valid.'}</i>`,
          { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
        );
        return;
      }

      const flag = d.countryCode
        ? d.countryCode.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0)))
        : '';

      const mapsUrl = `https://www.google.com/maps?q=${d.lat},${d.lon}`;

      const result =
        `<b>IP Lookup Result</b>\n\n` +
        `Public IP   : <code>${d.query}</code>\n` +
        `ISP         : <code>${d.isp}</code>\n` +
        `Org         : <code>${d.org}</code>\n` +
        `ASN         : <code>${d.as}</code>\n` +
        `Country     : <code>${d.country} ${flag} (${d.countryCode})</code>\n` +
        `City        : <code>${d.city}</code>\n` +
        `Region      : <code>${d.regionName}</code>\n` +
        `Coordinates : <code>${d.lat}, ${d.lon}</code>\n` +
        `Timezone    : <code>${d.timezone}</code>\n` +
        `ZIP/Code    : <code>${d.zip || '-'}</code>\n\n` +
        `🌍 <a href="${mapsUrl}">Lihat di Google Maps</a>`;

      await sendOrEdit(chatId, userId, result, {
        reply_markup: { inline_keyboard: [[
          { text: '🔄 Cek Lagi',  callback_data: 'menu_ip'   },
          { text: '← Kembali',   callback_data: 'back_main' },
        ]]},
        disable_web_page_preview: true,
      });
    } catch (err) {
      await sendOrEdit(chatId, userId,
        `❌ <b>Error:</b> Gagal menghubungi server. Coba lagi.\n\n<i>${err.message}</i>`,
        { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
      );
    }
    return;
  }

  // ── State: awaiting_2fa ──
  if (userState[userId] === 'awaiting_2fa') {
    const input = text.toUpperCase().replace(/\s+/g, '');
    if (!isValid2FASecret(input)) {
      // Tetap di state awaiting_2fa — user bisa coba lagi
      // SELALU pakai sendOrEdit() — tidak boleh ada sendMessage baru di sini
      await sendOrEdit(chatId, userId,
        `❌ <b>Secret tidak valid!</b>\n\nFormat harus Base32 (huruf A-Z dan angka 2-7), minimal 16 karakter.\n\n<i>Contoh: <code>JBSWY3DPEHPK3PXP</code></i>\n\nKirim ulang, atau kembali ke menu.`,
        { reply_markup: { inline_keyboard: [[{ text: '← Kembali ke Menu', callback_data: 'back_main' }]] } }
      );
      return;
    }
    delete userState[userId];
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
