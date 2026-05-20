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

// ── Active OTP sessions ──
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

// Period index — berubah tiap 30 detik
function currentPeriod() {
  return Math.floor(Date.now() / 1000 / 30);
}

// Sisa detik dalam period ini
function secondsLeft() {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

// Bar animasi countdown
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
//   STOP session
// ─────────────────────────────────────────

function stopSession(userId) {
  if (sessions[userId]) {
    clearInterval(sessions[userId].timer);
    delete sessions[userId];
  }
}

// ─────────────────────────────────────────
//   START OTP session
// ─────────────────────────────────────────

async function startOtpSession(userId, chatId, base32) {
  stopSession(userId);

  let otp;
  try {
    otp = getOTP(base32);
  } catch {
    return bot.sendMessage(chatId, `Error: This is not 2FA Secret !`, { parse_mode: 'HTML' });
  }

  const startPeriod = currentPeriod();
  const secs        = secondsLeft();
  const icon        = secs <= 5 ? '🔴' : secs <= 10 ? '🟡' : '🟢';

  const sent = await bot.sendMessage(chatId,
    `🔐 2FA Code: <code>${otp}</code>\n` +
    `${icon} Status: <b>Active</b>\n\n` +
    `<code>${timerBar(secs)}</code>`,
    {
      parse_mode   : 'HTML',
      reply_markup : { inline_keyboard: [[
        { text: `⏱ ${secs}s`, callback_data: `refresh_${base32}` },
      ]]},
    }
  );

  const msgId = sent.message_id;

  // Update tiap 2 detik
  const timer = setInterval(async () => {
    try {
      const nowPeriod = currentPeriod();
      const nowSecs   = secondsLeft();

      // Period berubah = OTP expired → stop timer, tampil tombol Refresh
      if (nowPeriod !== startPeriod) {
        clearInterval(sessions[userId]?.timer);
        if (sessions[userId]) sessions[userId].timer = null;

        await bot.editMessageText(
          `🔐 2FA Code: <code>${otp}</code>\n` +
          `⏳ Status: <b>Expired</b>\n\n` +
          `Tap Refresh to get a new OTP.`,
          {
            chat_id      : chatId,
            message_id   : msgId,
            parse_mode   : 'HTML',
            reply_markup : { inline_keyboard: [[
              { text: '🔄 Refresh', callback_data: `refresh_${base32}` },
            ]]},
          }
        );
        return;
      }

      // Masih period yang sama → update countdown
      const ic = nowSecs <= 5 ? '🔴' : nowSecs <= 10 ? '🟡' : '🟢';
      await bot.editMessageText(
        `🔐 2FA Code: <code>${otp}</code>\n` +
        `${ic} Status: <b>Active</b>\n\n` +
        `<code>${timerBar(nowSecs)}</code>`,
        {
          chat_id      : chatId,
          message_id   : msgId,
          parse_mode   : 'HTML',
          reply_markup : { inline_keyboard: [[
            { text: `⏱ ${nowSecs}s`, callback_data: `refresh_${base32}` },
          ]]},
        }
      );
    } catch (e) {
      const m = e.message || '';
      if (m.includes('message to edit not found') || m.includes('MESSAGE_ID_INVALID')) {
        stopSession(userId);
      }
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
      { text: '📢 Join Channel', url: 'https://t.me/RayzellStores' },
      { text: '✓ Sudah Join',   callback_data: 'check_join' },
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
      `To use this bot, you must join our channel first.`,
      joinOpts
    );
  }

  stopSession(msg.from.id);
  return bot.sendMessage(chatId, `Hello, please enter your 2FA Secret.`, { parse_mode: 'HTML' });
});

// ─────────────────────────────────────────
//   CALLBACK QUERY
// ─────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const name   = query.from.first_name || 'there';

  // ── check_join ──
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
      await bot.editMessageText(`Hello, please enter your 2FA Secret.`,
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' });
    } catch {
      await bot.sendMessage(chatId, `Hello, please enter your 2FA Secret.`, { parse_mode: 'HTML' });
    }
    return;
  }

  // ── refresh_<base32> ──
  if (query.data && query.data.startsWith('refresh_')) {
    const base32 = query.data.slice(8);

    // Cek apakah session user masih punya timer (timer null = sudah expired, boleh refresh)
    const sess = sessions[userId];

    // Kalau timer masih jalan = belum expired
    if (sess && sess.timer !== null) {
      const secs = secondsLeft();
      return bot.answerCallbackQuery(query.id, {
        text      : `OTP masih aktif. Tunggu ${secs} detik lagi.`,
        show_alert: false,
      });
    }

    // Expired → hapus pesan lama, mulai session baru
    await bot.answerCallbackQuery(query.id, { text: 'Refreshed!' });
    try { await bot.deleteMessage(chatId, msgId); } catch (_) {}
    await startOtpSession(userId, chatId, base32);
    return;
  }

  await bot.answerCallbackQuery(query.id).catch(() => {});
});

// ─────────────────────────────────────────
//   MESSAGE HANDLER
// ─────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text.trim();

  if (!(await hasJoined(userId))) {
    return bot.sendMessage(chatId, `To use this bot, you must join our channel first.`, joinOpts);
  }

  const input = text.toUpperCase().replace(/\s+/g, '');

  if (!isValid2FASecret(input)) {
    return bot.sendMessage(chatId, `Error: This is not 2FA Secret !`, { parse_mode: 'HTML' });
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
console.log('  2FA Secret Bot — started');
console.log(`  Bot      : @${BOT_USERNAME}`);
console.log(`  Owner    : ${OWNER_ID}`);
console.log(`  Channel  : ${CHANNEL}`);
console.log('');
