require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { TOTP, Secret } = require('otpauth');
const QRCode = require('qrcode');

// ─────────────────────────────────────────
//   CONFIG
// ─────────────────────────────────────────
const BOT_TOKEN    = process.env.BOT_TOKEN    || '8643566619:AAHy98hpFwLsjHZwTl5XogtgoY60mNzsh9A';
const OWNER_ID     = parseInt(process.env.OWNER_ID || '1334793299');
const BOT_USERNAME = process.env.BOT_USERNAME  || 'auotorderbot';
const CHANNEL      = process.env.CHANNEL       || '@RayzellStores';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ─────────────────────────────────────────
//   HELPERS
// ─────────────────────────────────────────

/** Validate & normalise a Base32 2FA secret */
function isValid2FASecret(input) {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '');
  // Base32 alphabet only, length must be multiple of 8 (common: 16, 32)
  const base32Regex = /^[A-Z2-7]+=*$/;
  return base32Regex.test(cleaned) && cleaned.length >= 16;
}

/** Generate a fresh TOTP secret + current OTP */
function generateSecret(label = 'MyAccount', issuer = 'RayzellStores') {
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer,
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  return {
    base32 : secret.base32,
    otpauth: totp.toString(),
    otp    : totp.generate(),
  };
}

/** Get current OTP from a given Base32 secret */
function getOTP(base32) {
  const totp = new TOTP({
    issuer   : 'RayzellStores',
    label    : 'Account',
    algorithm: 'SHA1',
    digits   : 6,
    period   : 30,
    secret   : Secret.fromBase32(base32.trim().toUpperCase()),
  });
  return totp.generate();
}

/** Check if user has joined the required channel */
async function hasJoined(userId) {
  try {
    const member = await bot.getChatMember(CHANNEL, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}


// ─────────────────────────────────────────
//   KEYBOARD BUILDERS
// ─────────────────────────────────────────

const mainMenu = {
  reply_markup: {
    keyboard: [
      ['🔐 Generate 2FA Secret', '🔍 Cek 2FA Secret'],
      ['⏱️ Get OTP Code',        '📋 Cara Pakai'],
      ['👑 Owner',               '📢 Channel'],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
  parse_mode: 'HTML',
};

function joinButton() {
  return {
    reply_markup: {
      inline_keyboard: [[
        { text: '📢 Join Channel Dulu!', url: 'https://t.me/RayzellStores' },
        { text: '✅ Sudah Join', callback_data: 'check_join' },
      ]],
    },
    parse_mode: 'HTML',
  };
}

// ─────────────────────────────────────────
//   FORCE JOIN MIDDLEWARE
// ─────────────────────────────────────────

async function requireJoin(msg, next) {
  const userId = msg.from.id;
  const joined = await hasJoined(userId);
  if (!joined) {
    await bot.sendMessage(msg.chat.id,
      `╔══════════════════════╗\n` +
      `║  🔒 <b>AKSES DITOLAK!</b>  ║\n` +
      `╚══════════════════════╝\n\n` +
      `⚠️ Kamu belum join channel kami!\n\n` +
      `📢 Wajib join dulu sebelum bisa\n` +
      `menggunakan bot ini.\n\n` +
      `🔗 <b>Channel:</b> @RayzellStores\n\n` +
      `👇 Klik tombol di bawah, lalu tekan <b>✅ Sudah Join</b>`,
      joinButton()
    );
    return false;
  }
  return true;
}


// ─────────────────────────────────────────
//   /start COMMAND
// ─────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const userId   = msg.from.id;
  const name     = msg.from.first_name || 'User';
  const joined   = await hasJoined(userId);

  if (!joined) {
    return bot.sendMessage(msg.chat.id,
      `╔══════════════════════╗\n` +
      `║  🔒 <b>AKSES DITOLAK!</b>  ║\n` +
      `╚══════════════════════╝\n\n` +
      `👋 Halo <b>${name}</b>!\n\n` +
      `⚠️ Sebelum menggunakan bot ini,\n` +
      `kamu <b>WAJIB</b> join channel kami dulu!\n\n` +
      `📢 <b>Channel:</b> @RayzellStores\n\n` +
      `👇 Klik tombol di bawah lalu tekan <b>✅ Sudah Join</b>`,
      joinButton()
    );
  }

  await bot.sendMessage(msg.chat.id,
    `╔═══════════════════════════╗\n` +
    `║  🔐 <b>2FA SECRET BOT</b>  ║\n` +
    `║    by @RayzellStores       ║\n` +
    `╚═══════════════════════════╝\n\n` +
    `👋 Selamat datang, <b>${name}</b>!\n\n` +
    `✨ Bot ini bisa:\n` +
    `├ 🔐 Generate 2FA Secret asli\n` +
    `├ 🔍 Validasi 2FA Secret kamu\n` +
    `├ ⏱️ Ambil OTP code real-time\n` +
    `└ 📱 Generate QR Code\n\n` +
    `💡 Pilih menu di bawah untuk mulai!\n\n` +
    `⚡ <i>Powered by RayzellStores</i>`,
    mainMenu
  );
});


// ─────────────────────────────────────────
//   CALLBACK QUERY — check_join
// ─────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const name   = query.from.first_name || 'User';

  if (query.data === 'check_join') {
    const joined = await hasJoined(userId);
    if (!joined) {
      return bot.answerCallbackQuery(query.id, {
        text: '❌ Kamu belum join! Join dulu ya.',
        show_alert: true,
      });
    }

    await bot.answerCallbackQuery(query.id, {
      text: '✅ Verifikasi berhasil! Selamat datang!',
      show_alert: true,
    });

    await bot.editMessageText(
      `✅ <b>Verifikasi Berhasil!</b>\n\nHalo <b>${name}</b>, kamu sudah bergabung!\nSekarang bisa gunakan bot ini. 🎉`,
      { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
    );

    return bot.sendMessage(chatId,
      `╔═══════════════════════════╗\n` +
      `║  🔐 <b>2FA SECRET BOT</b>  ║\n` +
      `║    by @RayzellStores       ║\n` +
      `╚═══════════════════════════╝\n\n` +
      `✨ Pilih menu di bawah untuk mulai!\n\n` +
      `⚡ <i>Powered by RayzellStores</i>`,
      mainMenu
    );
  }

  // Generate QR callback
  if (query.data && query.data.startsWith('qr_')) {
    const secret = query.data.replace('qr_', '');
    await bot.answerCallbackQuery(query.id);
    try {
      const { otpauth } = generateSecret('MyAccount', 'RayzellStores');
      const qrBuffer = await QRCode.toBuffer(otpauth, { width: 300, margin: 2 });
      await bot.sendPhoto(chatId, qrBuffer, {
        caption: `📱 <b>QR Code untuk Google Authenticator</b>\n\n🔑 Secret: <code>${secret}</code>\n\n📌 Scan QR ini dengan app authenticator kamu!`,
        parse_mode: 'HTML',
      });
    } catch (e) {
      bot.sendMessage(chatId, '❌ Gagal generate QR Code.', { parse_mode: 'HTML' });
    }
  }
});


// ─────────────────────────────────────────
//   TEXT MESSAGE HANDLER
// ─────────────────────────────────────────

// State sederhana untuk menunggu input
const userState = {};

bot.on('message', async (msg) => {
  if (!msg.text) return;
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text.trim();

  // Skip commands (sudah ada handler sendiri)
  if (text.startsWith('/')) return;

  // ── Force Join Check ──
  const ok = await requireJoin(msg, null);
  if (!ok) return;

  // ── MENU: Generate 2FA Secret ──
  if (text === '🔐 Generate 2FA Secret') {
    const { base32, otp } = generateSecret('MyAccount', 'RayzellStores');
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    return bot.sendMessage(chatId,
      `╔══════════════════════════╗\n` +
      `║  ✅ <b>2FA SECRET GENERATED!</b>  ║\n` +
      `╚══════════════════════════╝\n\n` +
      `🔑 <b>Secret Key:</b>\n` +
      `<code>${base32}</code>\n\n` +
      `⏱️ <b>OTP Sekarang:</b>\n` +
      `<code>${otp}</code>\n\n` +
      `📋 <b>Info:</b>\n` +
      `├ Algorithm : SHA1\n` +
      `├ Digits    : 6\n` +
      `├ Period    : 30 detik\n` +
      `└ Type      : TOTP\n\n` +
      `🕐 <i>Generate: ${now} WIB</i>\n\n` +
      `💡 Copy secret key di atas lalu masukkan ke Google Authenticator / Authy!\n\n` +
      `⚡ <i>@RayzellStores</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔄 Generate Lagi', callback_data: 'gen_new' },
            { text: '📱 QR Code', callback_data: `qr_${base32}` },
          ]],
        },
      }
    );
  }

  // ── MENU: Cek 2FA Secret ──
  if (text === '🔍 Cek 2FA Secret') {
    userState[userId] = 'awaiting_validate';
    return bot.sendMessage(chatId,
      `🔍 <b>Validasi 2FA Secret</b>\n\n` +
      `📝 Kirim 2FA Secret kamu sekarang.\n\n` +
      `📌 <i>Contoh format:</i>\n` +
      `<code>JBSWY3DPEHPK3PXP</code>\n\n` +
      `⚠️ Hanya Base32 yang valid akan diproses.`,
      { parse_mode: 'HTML', reply_markup: { force_reply: true } }
    );
  }

  // ── MENU: Get OTP Code ──
  if (text === '⏱️ Get OTP Code') {
    userState[userId] = 'awaiting_otp';
    return bot.sendMessage(chatId,
      `⏱️ <b>Get OTP Code</b>\n\n` +
      `📝 Kirim 2FA Secret kamu untuk mendapatkan OTP real-time.\n\n` +
      `📌 <i>Contoh:</i>\n` +
      `<code>JBSWY3DPEHPK3PXP</code>`,
      { parse_mode: 'HTML', reply_markup: { force_reply: true } }
    );
  }


  // ── MENU: Cara Pakai ──
  if (text === '📋 Cara Pakai') {
    return bot.sendMessage(chatId,
      `╔══════════════════════╗\n` +
      `║  📋 <b>CARA PAKAI BOT</b>  ║\n` +
      `╚══════════════════════╝\n\n` +
      `<b>1️⃣ Generate 2FA Secret</b>\n` +
      `   • Tekan menu 🔐 Generate\n` +
      `   • Dapat secret key unik\n` +
      `   • Masukkan ke Google Auth\n\n` +
      `<b>2️⃣ Validasi Secret</b>\n` +
      `   • Tekan 🔍 Cek 2FA Secret\n` +
      `   • Kirim secret kamu\n` +
      `   • Bot cek apakah valid\n\n` +
      `<b>3️⃣ Get OTP Real-time</b>\n` +
      `   • Tekan ⏱️ Get OTP Code\n` +
      `   • Kirim secret kamu\n` +
      `   • Dapat kode 6 digit\n\n` +
      `<b>📱 App yang Direkomendasikan:</b>\n` +
      `├ Google Authenticator\n` +
      `├ Authy\n` +
      `└ Microsoft Authenticator\n\n` +
      `⚡ <i>@RayzellStores</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── MENU: Owner ──
  if (text === '👑 Owner') {
    return bot.sendMessage(chatId,
      `👑 <b>INFO OWNER</b>\n\n` +
      `🔹 Owner: <b>RayzellStores</b>\n` +
      `🔹 Telegram: @RayzellStores\n` +
      `🔹 Channel: <a href="https://t.me/RayzellStores">t.me/RayzellStores</a>\n\n` +
      `💬 Ada pertanyaan? Hubungi owner langsung!`,
      { parse_mode: 'HTML', disable_web_page_preview: true }
    );
  }

  // ── MENU: Channel ──
  if (text === '📢 Channel') {
    return bot.sendMessage(chatId,
      `📢 <b>CHANNEL KAMI</b>\n\n` +
      `🔗 <a href="https://t.me/RayzellStores">t.me/RayzellStores</a>\n\n` +
      `📌 Join untuk info update terbaru!`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📢 Buka Channel', url: 'https://t.me/RayzellStores' },
          ]],
        },
      }
    );
  }

  // ── STATE: Menunggu input validasi ──
  if (userState[userId] === 'awaiting_validate') {
    delete userState[userId];
    const input = text.toUpperCase().replace(/\s+/g, '');
    if (!isValid2FASecret(input)) {
      return bot.sendMessage(chatId,
        `╔══════════════════════╗\n` +
        `║  ❌ <b>INVALID SECRET!</b>  ║\n` +
        `╚══════════════════════╝\n\n` +
        `⛔ <b>Error:</b> This is not a 2FA Secret!\n\n` +
        `📌 Secret yang valid:\n` +
        `├ Format: Base32 (A-Z, 2-7)\n` +
        `├ Panjang: minimal 16 karakter\n` +
        `└ Contoh: <code>JBSWY3DPEHPK3PXP</code>\n\n` +
        `🔄 Coba lagi dengan secret yang benar.`,
        { parse_mode: 'HTML' }
      );
    }
    const otp = getOTP(input);
    return bot.sendMessage(chatId,
      `╔════════════════════════╗\n` +
      `║  ✅ <b>SECRET VALID!</b>  ║\n` +
      `╚════════════════════════╝\n\n` +
      `🔑 <b>Secret:</b>\n<code>${input}</code>\n\n` +
      `⏱️ <b>OTP Sekarang:</b>\n<code>${otp}</code>\n\n` +
      `✅ Secret ini <b>VALID</b> dan bisa digunakan!\n\n` +
      `⚡ <i>@RayzellStores</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── STATE: Menunggu input OTP ──
  if (userState[userId] === 'awaiting_otp') {
    delete userState[userId];
    const input = text.toUpperCase().replace(/\s+/g, '');
    if (!isValid2FASecret(input)) {
      return bot.sendMessage(chatId,
        `╔══════════════════════╗\n` +
        `║  ❌ <b>INVALID SECRET!</b>  ║\n` +
        `╚══════════════════════╝\n\n` +
        `⛔ <b>Error:</b> This is not a 2FA Secret!\n\n` +
        `📌 Pastikan kamu mengirim secret yang benar\n` +
        `(bukan kode OTP atau password biasa).`,
        { parse_mode: 'HTML' }
      );
    }
    const otp = getOTP(input);
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    return bot.sendMessage(chatId,
      `╔═══════════════════════╗\n` +
      `║  ⏱️ <b>OTP REAL-TIME</b>  ║\n` +
      `╚═══════════════════════╝\n\n` +
      `🔑 <b>Secret:</b>\n<code>${input}</code>\n\n` +
      `🔢 <b>Kode OTP:</b>\n` +
      `<code>${otp}</code>\n\n` +
      `⏰ Kode berlaku <b>30 detik</b>\n` +
      `🕐 <i>${now} WIB</i>\n\n` +
      `⚡ <i>@RayzellStores</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── INPUT LANGSUNG (tanpa menu) ──
  // User kirim teks random — cek apakah itu secret
  if (text.length >= 16 && /^[A-Z2-7]+=*$/i.test(text.replace(/\s+/g, ''))) {
    const input = text.toUpperCase().replace(/\s+/g, '');
    if (isValid2FASecret(input)) {
      const otp = getOTP(input);
      const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      return bot.sendMessage(chatId,
        `╔════════════════════════╗\n` +
        `║  ✅ <b>SECRET TERDETEKSI!</b>  ║\n` +
        `╚════════════════════════╝\n\n` +
        `🔑 <b>Secret:</b>\n<code>${input}</code>\n\n` +
        `⏱️ <b>OTP Sekarang:</b>\n<code>${otp}</code>\n\n` +
        `🕐 <i>${now} WIB</i>\n\n` +
        `⚡ <i>@RayzellStores</i>`,
        { parse_mode: 'HTML' }
      );
    }
  }

  // ── Teks tidak dikenal ──
  return bot.sendMessage(chatId,
    `❓ <b>Perintah tidak dikenal.</b>\n\n` +
    `Gunakan menu di bawah atau ketik secret 2FA kamu langsung.\n\n` +
    `⛔ <b>Error:</b> This is not a 2FA Secret!\n\n` +
    `💡 Ketik /start untuk kembali ke menu utama.`,
    { parse_mode: 'HTML' }
  );
});


// ─────────────────────────────────────────
//   CALLBACK: Generate New
// ─────────────────────────────────────────

bot.on('callback_query', async (query) => {
  if (query.data !== 'gen_new') return;
  const chatId = query.message.chat.id;
  await bot.answerCallbackQuery(query.id);
  const { base32, otp } = generateSecret('MyAccount', 'RayzellStores');
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  return bot.sendMessage(chatId,
    `╔══════════════════════════╗\n` +
    `║  ✅ <b>2FA SECRET GENERATED!</b>  ║\n` +
    `╚══════════════════════════╝\n\n` +
    `🔑 <b>Secret Key:</b>\n` +
    `<code>${base32}</code>\n\n` +
    `⏱️ <b>OTP Sekarang:</b>\n` +
    `<code>${otp}</code>\n\n` +
    `📋 <b>Info:</b>\n` +
    `├ Algorithm : SHA1\n` +
    `├ Digits    : 6\n` +
    `├ Period    : 30 detik\n` +
    `└ Type      : TOTP\n\n` +
    `🕐 <i>Generate: ${now} WIB</i>\n\n` +
    `⚡ <i>@RayzellStores</i>`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Generate Lagi', callback_data: 'gen_new' },
          { text: '📱 QR Code', callback_data: `qr_${base32}` },
        ]],
      },
    }
  );
});

// ─────────────────────────────────────────
//   POLLING ERROR HANDLER
// ─────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('❌ Polling error:', err.message);
});

// ─────────────────────────────────────────
//   START UP LOG
// ─────────────────────────────────────────
console.log('');
console.log('╔══════════════════════════════════╗');
console.log('║  🔐  2FA SECRET BOT  STARTED  🔐  ║');
console.log('║     by RayzellStores              ║');
console.log('╚══════════════════════════════════╝');
console.log(`✅  Bot: @${BOT_USERNAME}`);
console.log(`👑  Owner ID: ${OWNER_ID}`);
console.log(`📢  Channel: ${CHANNEL}`);
console.log('🚀  Bot is running...\n');
