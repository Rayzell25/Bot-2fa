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
  const base32Regex = /^[A-Z2-7]+=*$/;
  return base32Regex.test(cleaned) && cleaned.length >= 16;
}

/** Generate a fresh TOTP secret + current OTP */
function generateSecret(label = 'MyAccount', issuer = 'RayzellStores') {
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({ issuer, label, algorithm: 'SHA1', digits: 6, period: 30, secret });
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

/**
 * Cek apakah user sudah join channel.
 * - 'member' / 'administrator' / 'creator' → sudah join ✅
 * - 'left' / 'kicked'                      → belum/tidak join ❌
 * - Error API (mis. bot bukan admin)        → anggap SUDAH join ✅
 *   supaya user yang udah join tidak kena block karena masalah permission bot.
 */
async function hasJoined(userId) {
  try {
    const member = await bot.getChatMember(CHANNEL, userId);
    // kicked = banned, left = keluar sendiri
    if (member.status === 'kicked' || member.status === 'left') return false;
    return true;
  } catch (err) {
    // Kalau bot bukan admin channel atau channel tidak ditemukan,
    // jangan blokir user — log error saja lalu loloskan.
    console.error('⚠️  hasJoined error (bot mungkin bukan admin channel):', err.message);
    return true;
  }
}

// ─────────────────────────────────────────
//   KEYBOARD BUILDERS
// ─────────────────────────────────────────

const mainMenuOpts = {
  reply_markup: {
    keyboard: [
      ['🔐 Generate 2FA Secret', '🔍 Cek 2FA Secret'],
      ['⏱️ Get OTP Code',        '📋 Cara Pakai'],
      ['👑 Owner',               '📢 Channel'],
    ],
    resize_keyboard    : true,
    one_time_keyboard  : false,
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
//   FORCE JOIN CHECK (helper)
// ─────────────────────────────────────────

async function requireJoin(msg) {
  const joined = await hasJoined(msg.from.id);
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
  const name   = msg.from.first_name || 'User';
  const joined = await hasJoined(msg.from.id);

  // Belum join → minta join dulu
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

  // Sudah join → langsung tampil menu utama
  return bot.sendMessage(msg.chat.id,
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
    mainMenuOpts
  );
});

// ─────────────────────────────────────────
//   CALLBACK QUERY  (SATU listener saja!)
// ─────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const name   = query.from.first_name || 'User';
  const data   = query.data || '';

  // ── check_join ──
  if (data === 'check_join') {
    const joined = await hasJoined(userId);
    if (!joined) {
      return bot.answerCallbackQuery(query.id, {
        text      : '❌ Kamu belum join! Coba join dulu ya.',
        show_alert: true,
      });
    }

    await bot.answerCallbackQuery(query.id, {
      text      : '✅ Verifikasi berhasil! Selamat datang!',
      show_alert: true,
    });

    try {
      await bot.editMessageText(
        `✅ <b>Verifikasi Berhasil!</b>\n\nHalo <b>${name}</b>, kamu sudah bergabung!\nSekarang bisa gunakan bot ini. 🎉`,
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
      );
    } catch (_) { /* pesan mungkin sudah diedit, abaikan */ }

    return bot.sendMessage(chatId,
      `╔═══════════════════════════╗\n` +
      `║  🔐 <b>2FA SECRET BOT</b>  ║\n` +
      `║    by @RayzellStores       ║\n` +
      `╚═══════════════════════════╝\n\n` +
      `👋 Halo <b>${name}</b>! Bot siap digunakan.\n\n` +
      `✨ Pilih menu di bawah untuk mulai!\n\n` +
      `⚡ <i>Powered by RayzellStores</i>`,
      mainMenuOpts
    );
  }

  // ── gen_new ──
  if (data === 'gen_new') {
    await bot.answerCallbackQuery(query.id);
    const { base32, otp } = generateSecret('MyAccount', 'RayzellStores');
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    return bot.sendMessage(chatId,
      `╔══════════════════════════╗\n` +
      `║  ✅ <b>2FA SECRET GENERATED!</b>  ║\n` +
      `╚══════════════════════════╝\n\n` +
      `🔑 <b>Secret Key:</b>\n<code>${base32}</code>\n\n` +
      `⏱️ <b>OTP Sekarang:</b>\n<code>${otp}</code>\n\n` +
      `📋 <b>Info:</b>\n` +
      `├ Algorithm : SHA1\n` +
      `├ Digits    : 6\n` +
      `├ Period    : 30 detik\n` +
      `└ Type      : TOTP\n\n` +
      `🕐 <i>Generate: ${now} WIB</i>\n\n` +
      `⚡ <i>@RayzellStores</i>`,
      {
        parse_mode   : 'HTML',
        reply_markup : {
          inline_keyboard: [[
            { text: '🔄 Generate Lagi', callback_data: 'gen_new' },
            { text: '📱 QR Code',       callback_data: `qr_${base32}` },
          ]],
        },
      }
    );
  }

  // ── qr_<secret> ──
  if (data.startsWith('qr_')) {
    const secret = data.replace('qr_', '');
    await bot.answerCallbackQuery(query.id);
    try {
      const totp = new TOTP({
        issuer   : 'RayzellStores',
        label    : 'MyAccount',
        algorithm: 'SHA1',
        digits   : 6,
        period   : 30,
        secret   : Secret.fromBase32(secret),
      });
      const qrBuffer = await QRCode.toBuffer(totp.toString(), { width: 300, margin: 2 });
      return bot.sendPhoto(chatId, qrBuffer, {
        caption   : `📱 <b>QR Code untuk Google Authenticator</b>\n\n🔑 Secret: <code>${secret}</code>\n\n📌 Scan QR ini dengan app authenticator kamu!`,
        parse_mode: 'HTML',
      });
    } catch (e) {
      return bot.sendMessage(chatId, '❌ Gagal generate QR Code.', { parse_mode: 'HTML' });
    }
  }

  await bot.answerCallbackQuery(query.id);
});

// ─────────────────────────────────────────
//   TEXT MESSAGE HANDLER
// ─────────────────────────────────────────

const userState = {};

bot.on('message', async (msg) => {
  if (!msg.text) return;
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text.trim();

  if (text.startsWith('/')) return; // ditangani onText

  // Force join check
  const ok = await requireJoin(msg);
  if (!ok) return;

  // ── MENU: Generate 2FA Secret ──
  if (text === '🔐 Generate 2FA Secret') {
    const { base32, otp } = generateSecret('MyAccount', 'RayzellStores');
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    return bot.sendMessage(chatId,
      `╔══════════════════════════╗\n` +
      `║  ✅ <b>2FA SECRET GENERATED!</b>  ║\n` +
      `╚══════════════════════════╝\n\n` +
      `🔑 <b>Secret Key:</b>\n<code>${base32}</code>\n\n` +
      `⏱️ <b>OTP Sekarang:</b>\n<code>${otp}</code>\n\n` +
      `📋 <b>Info:</b>\n` +
      `├ Algorithm : SHA1\n` +
      `├ Digits    : 6\n` +
      `├ Period    : 30 detik\n` +
      `└ Type      : TOTP\n\n` +
      `🕐 <i>Generate: ${now} WIB</i>\n\n` +
      `💡 Copy secret key di atas lalu masukkan ke Google Authenticator / Authy!\n\n` +
      `⚡ <i>@RayzellStores</i>`,
      {
        parse_mode  : 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔄 Generate Lagi', callback_data: 'gen_new' },
            { text: '📱 QR Code',       callback_data: `qr_${base32}` },
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
      `📌 <i>Contoh format:</i>\n<code>JBSWY3DPEHPK3PXP</code>\n\n` +
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
      `📌 <i>Contoh:</i>\n<code>JBSWY3DPEHPK3PXP</code>`,
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
        parse_mode  : 'HTML',
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
        `⛔ <b>Error: This is not a 2FA Secret!</b>\n\n` +
        `📌 Secret yang valid:\n` +
        `├ Format : Base32 (huruf A-Z dan angka 2-7)\n` +
        `├ Panjang : minimal 16 karakter\n` +
        `└ Contoh : <code>JBSWY3DPEHPK3PXP</code>\n\n` +
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
        `⛔ <b>Error: This is not a 2FA Secret!</b>\n\n` +
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
      `🔢 <b>Kode OTP:</b>\n<code>${otp}</code>\n\n` +
      `⏰ Kode berlaku <b>30 detik</b>\n` +
      `🕐 <i>${now} WIB</i>\n\n` +
      `⚡ <i>@RayzellStores</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── INPUT LANGSUNG — auto-detect secret ──
  const raw = text.toUpperCase().replace(/\s+/g, '');
  if (raw.length >= 16 && isValid2FASecret(raw)) {
    const otp = getOTP(raw);
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    return bot.sendMessage(chatId,
      `╔════════════════════════╗\n` +
      `║  ✅ <b>SECRET TERDETEKSI!</b>  ║\n` +
      `╚════════════════════════╝\n\n` +
      `🔑 <b>Secret:</b>\n<code>${raw}</code>\n\n` +
      `⏱️ <b>OTP Sekarang:</b>\n<code>${otp}</code>\n\n` +
      `🕐 <i>${now} WIB</i>\n\n` +
      `⚡ <i>@RayzellStores</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // ── Tidak dikenal ──
  return bot.sendMessage(chatId,
    `❓ <b>Perintah tidak dikenal.</b>\n\n` +
    `Gunakan menu di bawah atau kirim secret 2FA kamu langsung.\n\n` +
    `⛔ <b>Error: This is not a 2FA Secret!</b>\n\n` +
    `💡 Ketik /start untuk kembali ke menu utama.`,
    { parse_mode: 'HTML' }
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
