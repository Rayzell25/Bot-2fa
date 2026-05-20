require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { TOTP, Secret } = require('otpauth');

const BOT_TOKEN    = process.env.BOT_TOKEN    || '8643566619:AAHy98hpFwLsjHZwTl5XogtgoY60mNzsh9A';
const OWNER_ID     = parseInt(process.env.OWNER_ID || '1334793299');
const BOT_USERNAME = process.env.BOT_USERNAME  || 'auotorderbot';
const CHANNEL      = process.env.CHANNEL       || '@RayzellStores';

const bot = new TelegramBot(BOT_TOKEN, {
  polling: { interval: 300, autoStart: true, params: { timeout: 10 } },
});

// ── Active OTP sessions: userId → { secret, chatId, msgId, timer } ──
const sessions = {};

// ─────────────────────────────────────────
//   HELPERS
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

// Sisa detik sebelum OTP berikutnya
function secondsLeft() {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

// Bar animasi countdown
function timerBar(secs) {
  const total  = 30;
  const filled = Math.round((secs / total) * 10);
  const empty  = 10 - filled;
  // Hijau kalau masih banyak, kuning kalau mau habis
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar}  ${secs}s`;
}

function buildOtpText(base32) {
  let otp;
  try {
    otp = getOTP(base32);
  } catch (e) {
    otp = '------';
  }
  const secs = secondsLeft();
  const bar  = timerBar(secs);
  const icon = secs <= 5 ? '🔴' : secs <= 10 ? '🟡' : '🟢';
  return (
    `🔐 <b>Your OTP Code</b>\n\n` +
    `☞ <code>${otp}</code>\n\n` +
    `${icon} <code>${bar}</code>`
  );
}

async function hasJoined(userId) {
  try {
    const m = await bot.getChatMember(CHANNEL, userId);
    if (m.status === 'kicked' || m.status === 'left') return false;
    return true;
  } catch { return false; }
}

// ─────────────────────────────────────────
//   STOP old session for a user
// ─────────────────────────────────────────

function stopSession(userId) {
  if (sessions[userId]) {
    clearInterval(sessions[userId].timer);
    delete sessions[userId];
  }
}

// ─────────────────────────────────────────
//   START a live OTP session
// ─────────────────────────────────────────

async function startOtpSession(userId, chatId, base32) {
  stopSession(userId);

  // Validasi dulu sebelum kirim
  let firstOtp;
  try {
    firstOtp = getOTP(base32);
  } catch (e) {
    return bot.sendMessage(chatId,
      `⚠️ <b>Invalid 2FA Secret.</b>\n\nCould not generate OTP from this secret.`,
      { parse_mode: 'HTML' }
    );
  }

  const sent = await bot.sendMessage(chatId, buildOtpText(base32), {
    parse_mode: 'HTML',
  });

  const msgId = sent.message_id;

  // Edit tiap 2 detik (lebih aman dari rate limit Telegram)
  const timer = setInterval(async () => {
    try {
      const text = buildOtpText(base32);
      await bot.editMessageText(text, {
        chat_id   : chatId,
        message_id: msgId,
        parse_mode: 'HTML',
      });
    } catch (e) {
      const msg = e.message || '';
      // Stop jika pesan dihapus
      if (msg.includes('message to edit not found') || msg.includes('MESSAGE_ID_INVALID')) {
        stopSession(userId);
      }
      // Rate limit — skip saja, coba lagi di iterasi berikutnya
    }
  }, 2000);

  sessions[userId] = { secret: base32, chatId, msgId, timer };
}

// ─────────────────────────────────────────
//   JOIN OPTS
// ─────────────────────────────────────────

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
//   /start
// ─────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const name   = msg.from.first_name || 'there';
  const joined = await hasJoined(msg.from.id);

  if (!joined) {
    return bot.sendMessage(chatId,
      `To use this bot, you must join our channel first.\n\n` +
      `👉 <a href="https://t.me/RayzellStores">t.me/RayzellStores</a>`,
      joinOpts
    );
  }

  stopSession(msg.from.id);

  return bot.sendMessage(chatId,
    `Hello, please enter your 2FA Secret.`,
    { parse_mode: 'HTML' }
  );
});

// ─────────────────────────────────────────
//   CALLBACK QUERY — check_join
// ─────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const name   = query.from.first_name || 'there';

  if (query.data === 'check_join') {
    const joined = await hasJoined(userId);
    if (!joined) {
      return bot.answerCallbackQuery(query.id, {
        text: 'You have not joined yet. Please join the channel first.',
        show_alert: true,
      });
    }

    await bot.answerCallbackQuery(query.id, { text: 'Verified! Welcome.' });

    try {
      await bot.editMessageText(
        `Hello, please enter your 2FA Secret.`,
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
      );
    } catch (_) {
      await bot.sendMessage(chatId,
        `Hello, please enter your 2FA Secret.`,
        { parse_mode: 'HTML' }
      );
    }
  }

  await bot.answerCallbackQuery(query.id).catch(() => {});
});

// ─────────────────────────────────────────
//   MESSAGE — accept secret input
// ─────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text.trim();

  // Force join check
  if (!(await hasJoined(userId))) {
    return bot.sendMessage(chatId,
      `To use this bot, you must join our channel first.\n\n` +
      `👉 <a href="https://t.me/RayzellStores">t.me/RayzellStores</a>`,
      joinOpts
    );
  }

  const input = text.toUpperCase().replace(/\s+/g, '');

  if (!isValid2FASecret(input)) {
    return bot.sendMessage(chatId,
      `Error: This is not 2FA Secret !`,
      { parse_mode: 'HTML' }
    );
  }

  // Start live OTP session
  await startOtpSession(userId, chatId, input);
});

// ─────────────────────────────────────────
//   POLLING ERROR
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
