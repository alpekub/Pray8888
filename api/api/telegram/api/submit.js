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
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { user, name, country, phone } = req.body || {};

    if (!user?.id || !name || !country || !phone) {
      return res.status(400).json({ ok: false, error: 'Не хватает данных' });
    }

    const applicantId = String(user.id);
    const username = user.username ? `@${user.username}` : 'без username';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const tgName = `${firstName} ${lastName}`.trim() || '—';

    const text =
`🚨 Новая заявка в Step of Faith

👤 Имя: ${name}
🌍 Страна: ${country}
📱 Телефон: ${phone}

🆔 Telegram ID: ${applicantId}
🔗 Username: ${username}
📌 Telegram name: ${tgName}`;

    await telegram('sendMessage', {
      chat_id: process.env.ADMIN_CHAT_ID,
      text,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅ Одобрить',
              callback_data: `approve:${applicantId}`
            },
            {
              text: '❌ Отклонить',
              callback_data: `decline:${applicantId}`
            }
          ]
        ]
      }
    });

    return res.status(200).json({
      ok: true,
      joinLink: process.env.GROUP_JOIN_LINK
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Server error'
    });
  }
}
