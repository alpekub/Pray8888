const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

async function telegram(method, body) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.description || `Telegram error: ${method}`);
  }

  return data.result;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        ok: false,
        error: 'Method not allowed'
      });
    }

    const {
      name,
      country,
      phone,
      telegram_id,
      username,
      telegram_first_name,
      telegram_last_name
    } = req.body || {};

    if (!name || !country || !phone || !telegram_id) {
      return res.status(400).json({
        ok: false,
        error: 'Missing data'
      });
    }

    const tgUsername = username ? `@${username}` : 'нет username';
    const tgName =
      `${telegram_first_name || ''} ${telegram_last_name || ''}`.trim() || '—';

    const text =
`🚨 Новая заявка в Step of Faith

👤 Имя: ${name}
🌍 Страна: ${country}
📱 Телефон: ${phone}

🆔 Telegram ID: ${telegram_id}
🔗 Username: ${tgUsername}
📌 Telegram name: ${tgName}`;

    await telegram('sendMessage', {
      chat_id: process.env.ADMIN_CHAT_ID,
      text,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅ Одобрить',
              callback_data: `approve_${telegram_id}`
            },
            {
              text: '❌ Отклонить',
              callback_data: `decline_${telegram_id}`
            }
          ]
        ]
      }
    });

    return res.status(200).json({
      ok: true
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Server error'
    });
  }
}
