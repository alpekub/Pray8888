export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const BOT_TOKEN    = process.env.BOT_TOKEN;
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  const { name, country, phone, telegram_id, username, telegram_first_name, telegram_last_name } = req.body || {};

  if (!name || !country || !phone) {
    return res.status(400).json({ ok: false, error: 'Missing required fields: name, country, phone' });
  }

  if (!telegram_id) {
    return res.status(400).json({ ok: false, error: 'telegram_id is required. Please open this app from Telegram.' });
  }

  const tgName    = [telegram_first_name, telegram_last_name].filter(Boolean).join(' ') || '—';
  const tgUsername = username ? `@${username}` : '—';

  const text =
    `🚨 <b>Новая заявка в Step of Faith</b>\n\n` +
    `👤 <b>Имя:</b> ${escapeHtml(name)}\n` +
    `🌍 <b>Страна:</b> ${escapeHtml(country)}\n` +
    `📱 <b>Телефон:</b> ${escapeHtml(phone)}\n\n` +
    `🆔 <b>Telegram ID:</b> ${telegram_id}\n` +
    `🔗 <b>Username:</b> ${escapeHtml(tgUsername)}\n` +
    `📌 <b>Telegram имя:</b> ${escapeHtml(tgName)}`;

  try {
    const tgRes = await tgRequest(BOT_TOKEN, 'sendMessage', {
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Одобрить', callback_data: `approve_${telegram_id}` },
          { text: '❌ Отклонить', callback_data: `decline_${telegram_id}` }
        ]]
      }
    });

    if (!tgRes.ok) {
      console.error('Telegram sendMessage failed:', tgRes);
      return res.status(502).json({ ok: false, error: 'Failed to notify admin' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('submit error:', e);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function tgRequest(token, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
