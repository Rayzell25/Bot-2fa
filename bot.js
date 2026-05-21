// Load .env hanya kalau tidak diset dari luar (PM2 ecosystem)
if (!process.env.BOT_TOKEN) require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { TOTP, Secret } = require('otpauth');

const BOT_TOKEN    = process.env.BOT_TOKEN    || '8643566619:AAHy98hpFwLsjHZwTl5XogtgoY60mNzsh9A';
const OWNER_ID     = parseInt(process.env.OWNER_ID || '1334793299');
const BOT_USERNAME = process.env.BOT_USERNAME  || 'auotorderbot';
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
    `<b>— #${i} —</b>\n` +
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

async function hasJoined(userId) {
  try {
    const m = await bot.getChatMember(CHANNEL, userId);
    if (m.status === 'kicked' || m.status === 'left') return false;
    return true;
  } catch { return true; }
}

// ─────────────────────────────────────────
//   SESSIONS
// ─────────────────────────────────────────

const sessions = {}; // OTP sessions
const msgCache = {}; // userId → msgId (pesan utama, untuk di-edit)

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
    { text: '🔐 Generate 2FA',      callback_data: 'menu_2fa'     },
    { text: '📍 Random Address',   callback_data: 'menu_address' },
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
    } catch (_) {}
  }
  // Kirim baru kalau belum ada atau gagal edit
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

  if (!joined) {
    const sent = await bot.sendMessage(chatId,
      `Untuk menggunakan bot ini, kamu harus join channel kami dulu.`,
      joinOpts
    );
    msgCache[userId] = sent.message_id;
    return;
  }

  await sendOrEdit(chatId, userId,
    `Halo, <b>${name}</b>! Pilih fitur di bawah.`,
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

  // ── check_join ──
  if (data === 'check_join') {
    const joined = await hasJoined(userId);
    if (!joined) {
      return bot.answerCallbackQuery(query.id, {
        text: 'Kamu belum join. Silakan join channel dulu.', show_alert: true,
      });
    }
    await bot.answerCallbackQuery(query.id, { text: 'Berhasil! Selamat datang.' });
    msgCache[userId] = msgId;
    await sendOrEdit(chatId, userId,
      `Halo, <b>${name}</b>! Pilih fitur di bawah.`,
      { reply_markup: mainMenu }
    );
    return;
  }

  // ── menu_2fa ──
  if (data === 'menu_2fa') {
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    stopSession(userId);
    await sendOrEdit(chatId, userId,
      `🔐 <b>Generate 2FA</b>\n\nKirim secret key 2FA kamu (Base32).\n\n<i>Contoh: <code>JBSWY3DPEHPK3PXP</code></i>`,
      { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
    );
    return;
  }

  // ── menu_address ──
  if (data === 'menu_address') {
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    await sendOrEdit(chatId, userId,
      `📍 <b>Random Address</b>\n\nPilih jumlah alamat yang ingin di-generate.`,
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
          [{ text: '← Kembali', callback_data: 'back_main' }],
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
    msgCache[userId] = msgId;

    const addrs = generateAddresses(n);
    const text  = addrs.map((a, i) => formatAddress(a, i + 1)).join('\n\n');

    await sendOrEdit(chatId, userId, text, {
      reply_markup: { inline_keyboard: [[
        { text: '← Kembali',      callback_data: 'menu_address' },
        { text: '🔄 Generate Baru', callback_data: last },
      ]]},
    });
    return;
  }

  // ── back_main ──
  if (data === 'back_main') {
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    stopSession(userId);
    await sendOrEdit(chatId, userId,
      `Halo, <b>${name}</b>! Pilih fitur di bawah.`,
      { reply_markup: mainMenu }
    );
    return;
  }

  // ── otp_back ──
  if (data === 'otp_back') {
    await bot.answerCallbackQuery(query.id);
    stopSession(userId);
    msgCache[userId] = msgId;
    await sendOrEdit(chatId, userId,
      `Halo, <b>${name}</b>! Pilih fitur di bawah.`,
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
    msgCache[userId] = msgId;
    await startOtpSession(userId, chatId, base32);
    return;
  }

  await bot.answerCallbackQuery(query.id).catch(() => {});
});

// ─────────────────────────────────────────
//   MESSAGE — terima secret 2FA
// ─────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text.trim();

  if (!(await hasJoined(userId))) {
    return bot.sendMessage(chatId,
      `Untuk menggunakan bot ini, kamu harus join channel kami dulu.`,
      joinOpts
    );
  }

  // Hapus pesan user biar chat tetap rapi (opsional, bisa di-comment kalau error)
  try { await bot.deleteMessage(chatId, msg.message_id); } catch (_) {}

  const input = text.toUpperCase().replace(/\s+/g, '');

  if (!isValid2FASecret(input)) {
    await sendOrEdit(chatId, userId,
      `Error: This is not 2FA Secret !\n\n<i>Kembali ke menu?</i>`,
      { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
    );
    return;
  }

  await startOtpSession(userId, chatId, input);
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
