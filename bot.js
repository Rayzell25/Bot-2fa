require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { TOTP, Secret } = require('otpauth');

// ─────────────────────────────────────────
//   CONFIG
// ─────────────────────────────────────────
const BOT_TOKEN    = process.env.BOT_TOKEN    || '8643566619:AAHy98hpFwLsjHZwTl5XogtgoY60mNzsh9A';
const OWNER_ID     = parseInt(process.env.OWNER_ID || '1334793299');
const BOT_USERNAME = process.env.BOT_USERNAME  || 'auotorderbot';
const CHANNEL      = process.env.CHANNEL       || '@RayzellStores';

const bot = new TelegramBot(BOT_TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 },
  },
});

// ─────────────────────────────────────────
//   HELPERS
// ─────────────────────────────────────────

function isValid2FASecret(input) {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z2-7]+=*$/.test(cleaned) && cleaned.length >= 16;
}

function generateSecret(label = 'MyAccount', issuer = 'RayzellStores') {
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({ issuer, label, algorithm: 'SHA1', digits: 6, period: 30, secret });
  return { base32: secret.base32, otpauth: totp.toString(), otp: totp.generate() };
}

function getOTP(base32) {
  const totp = new TOTP({
    issuer: 'RayzellStores', label: 'Account',
    algorithm: 'SHA1', digits: 6, period: 30,
    secret: Secret.fromBase32(base32.trim().toUpperCase()),
  });
  return totp.generate();
}

async function hasJoined(userId) {
  try {
    const member = await bot.getChatMember(CHANNEL, userId);
    if (member.status === 'kicked' || member.status === 'left') return false;
    return true;
  } catch {
    return true; // jika error (bot bukan admin channel), loloskan user
  }
}

// ─────────────────────────────────────────
//   KEYBOARD
// ─────────────────────────────────────────

const mainMenuOpts = {
  parse_mode: 'HTML',
  reply_markup: {
    keyboard: [
      ['🔐 Generate Secret', '🔍 Validasi Secret'],
      ['⏱ Get OTP',          '📋 Cara Pakai'    ],
      ['👤 Owner',            '📢 Channel'        ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

const joinOpts = {
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [[
      { text: 'Join Channel', url: 'https://t.me/RayzellStores' },
      { text: '✓ Sudah Join', callback_data: 'check_join' },
    ]],
  },
};

// ─────────────────────────────────────────
//   GUARD
// ─────────────────────────────────────────

async function guard(msg) {
  if (await hasJoined(msg.from.id)) return true;
  const name = msg.from.first_name || 'Pengguna';
  await bot.sendMessage(msg.chat.id,
    `<b>Akses Terbatas</b>\n\n` +
    `Halo ${name}, kamu perlu bergabung ke channel kami terlebih dahulu untuk menggunakan bot ini.\n\n` +
    `📢 @RayzellStores`,
    joinOpts
  );
  return false;
}

// ─────────────────────────────────────────
//   /start
// ─────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const name   = msg.from.first_name || 'Pengguna';
  const joined = await hasJoined(msg.from.id);

  if (!joined) {
    return bot.sendMessage(msg.chat.id,
      `<b>Akses Terbatas</b>\n\n` +
      `Halo ${name}, kamu perlu bergabung ke channel kami terlebih dahulu untuk menggunakan bot ini.\n\n` +
      `📢 @RayzellStores`,
      joinOpts
    );
  }

  return bot.sendMessage(msg.chat.id,
    `<b>2FA Secret Bot</b>\n` +
    `<i>by RayzellStores</i>\n\n` +
    `Halo, ${name}! Selamat datang.\n\n` +
    `Bot ini dapat membantu kamu:\n` +
    `· Generate 2FA secret key baru\n` +
    `· Validasi secret yang sudah ada\n` +
    `· Mendapatkan kode OTP real-time\n\n` +
    `Pilih menu di bawah untuk memulai.`,
    mainMenuOpts
  );
});

// ─────────────────────────────────────────
//   CALLBACK QUERY  — satu listener
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
        text: 'Kamu belum bergabung. Silakan join channel dulu.',
        show_alert: true,
      });
    }
    await bot.answerCallbackQuery(query.id, { text: 'Berhasil! Selamat datang.' });
    try {
      await bot.editMessageText(
        `<b>Verifikasi Berhasil</b>\n\nHalo ${name}, akses telah diberikan. Gunakan menu di bawah untuk memulai.`,
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
      );
    } catch (_) {}
    return bot.sendMessage(chatId,
      `<b>2FA Secret Bot</b>\n` +
      `<i>by RayzellStores</i>\n\n` +
      `Halo, ${name}! Selamat datang.\n\n` +
      `Pilih menu di bawah untuk memulai.`,
      mainMenuOpts
    );
  }

  // ── gen_new / qr — tidak dipakai lagi, abaikan ──

  await bot.answerCallbackQuery(query.id);
});

// ─────────────────────────────────────────
//   MESSAGE HANDLER
// ─────────────────────────────────────────

const userState = {};

bot.on('message', async (msg) => {
  if (!msg.text) return;
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text.trim();

  if (text.startsWith('/')) return;

  if (!(await guard(msg))) return;

  // ── Generate Secret ──
  if (text === '🔐 Generate Secret') {
    const { base32, otp } = generateSecret();
    return bot.sendMessage(chatId,
      `<b>Secret Key</b>\n` +
      `<code>${base32}</code>\n\n` +
      `<b>OTP sekarang</b>\n` +
      `<code>${otp}</code>\n\n` +
      `<i>Masukkan Secret Key ke Google Authenticator atau Authy kamu.</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── Validasi Secret ──
  if (text === '🔍 Validasi Secret') {
    userState[userId] = 'awaiting_validate';
    return bot.sendMessage(chatId,
      `<b>Validasi Secret</b>\n\nKirim 2FA secret key kamu.\n\n<i>Contoh: <code>JBSWY3DPEHPK3PXP</code></i>`,
      { parse_mode: 'HTML', reply_markup: { force_reply: true } }
    );
  }

  // ── Get OTP ──
  if (text === '⏱ Get OTP') {
    userState[userId] = 'awaiting_otp';
    return bot.sendMessage(chatId,
      `<b>Get OTP</b>\n\nKirim 2FA secret key kamu untuk mendapatkan kode OTP.\n\n<i>Contoh: <code>JBSWY3DPEHPK3PXP</code></i>`,
      { parse_mode: 'HTML', reply_markup: { force_reply: true } }
    );
  }

  // ── Cara Pakai ──
  if (text === '📋 Cara Pakai') {
    return bot.sendMessage(chatId,
      `<b>Cara Pakai</b>\n\n` +
      `<b>1. Generate Secret</b>\n` +
      `Tekan menu Generate Secret untuk membuat secret key TOTP baru yang bisa langsung dipakai di Google Authenticator atau Authy.\n\n` +
      `<b>2. Validasi Secret</b>\n` +
      `Punya secret key yang ingin dicek? Gunakan menu Validasi Secret untuk memastikan formatnya valid.\n\n` +
      `<b>3. Get OTP</b>\n` +
      `Kirim secret key kamu dan bot akan memberikan kode OTP 6 digit yang aktif saat itu.\n\n` +
      `<i>Didukung: Google Authenticator, Authy, Microsoft Authenticator</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── Owner ──
  if (text === '👤 Owner') {
    return bot.sendMessage(chatId,
      `<b>Owner</b>\n\n` +
      `Telegram: @RayzellStores\n` +
      `Channel: <a href="https://t.me/RayzellStores">t.me/RayzellStores</a>`,
      { parse_mode: 'HTML', disable_web_page_preview: true }
    );
  }

  // ── Channel ──
  if (text === '📢 Channel') {
    return bot.sendMessage(chatId,
      `<b>Channel</b>\n\n<a href="https://t.me/RayzellStores">t.me/RayzellStores</a>\n\nJoin untuk update terbaru.`,
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: 'Buka Channel', url: 'https://t.me/RayzellStores' }]] },
      }
    );
  }

  // ── State: awaiting_validate ──
  if (userState[userId] === 'awaiting_validate') {
    delete userState[userId];
    const input = text.toUpperCase().replace(/\s+/g, '');
    if (!isValid2FASecret(input)) {
      return bot.sendMessage(chatId,
        `<b>Secret Tidak Valid</b>\n\n` +
        `<code>${text}</code>\n\n` +
        `Bukan format 2FA secret yang valid.\n` +
        `Secret harus berupa karakter Base32 (A–Z, 2–7) minimal 16 karakter.\n\n` +
        `<i>Contoh yang benar: <code>JBSWY3DPEHPK3PXP</code></i>`,
        { parse_mode: 'HTML' }
      );
    }
    const otp = getOTP(input);
    return bot.sendMessage(chatId,
      `<b>Secret Valid</b>\n\n` +
      `<code>${input}</code>\n\n` +
      `OTP saat ini\n<code>${otp}</code>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── State: awaiting_otp ──
  if (userState[userId] === 'awaiting_otp') {
    delete userState[userId];
    const input = text.toUpperCase().replace(/\s+/g, '');
    if (!isValid2FASecret(input)) {
      return bot.sendMessage(chatId,
        `<b>Secret Tidak Valid</b>\n\n` +
        `<code>${text}</code>\n\n` +
        `Bukan format 2FA secret yang valid.`,
        { parse_mode: 'HTML' }
      );
    }
    const otp  = getOTP(input);
    const now  = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    return bot.sendMessage(chatId,
      `<b>Kode OTP</b>\n\n` +
      `<code>${otp}</code>\n\n` +
      `Berlaku 30 detik · <i>${now} WIB</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── Auto-detect secret langsung ──
  const raw = text.toUpperCase().replace(/\s+/g, '');
  if (raw.length >= 16 && isValid2FASecret(raw)) {
    const otp = getOTP(raw);
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    return bot.sendMessage(chatId,
      `<b>Kode OTP</b>\n\n` +
      `<code>${otp}</code>\n\n` +
      `Secret: <code>${raw}</code>\n` +
      `Berlaku 30 detik · <i>${now} WIB</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── Tidak dikenal ──
  return bot.sendMessage(chatId,
    `Perintah tidak dikenal.\n\nGunakan menu di bawah atau kirim secret key 2FA kamu langsung.\n\n<i>Ketik /start untuk memuat ulang menu.</i>`,
    { parse_mode: 'HTML' }
  );
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
console.log('  2FA Secret Bot — started');
console.log(`  Bot      : @${BOT_USERNAME}`);
console.log(`  Owner    : ${OWNER_ID}`);
console.log(`  Channel  : ${CHANNEL}`);
console.log('');
