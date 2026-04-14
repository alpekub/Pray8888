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

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
    const GROUP_JOIN_LINK = process.env.GROUP_JOIN_LINK;
    const CHANNEL_LINK = process.env.CHANNEL_LINK;

    if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
      return res.status(500).json({
        ok: false,
        error: 'Env variables missing'
      });
    }

    const tgUsername = username ? `@${username}` : 'нет username';
    const tgName =
      `${telegram_first_name || ''} ${telegram_last_name || ''}`.trim() || '—';

    const text = `
🚨 Новая заявка в Step of Faith

👤 Имя: ${name}
🌍 Страна: ${country}
📱 Телефон: ${phone}

🆔 Telegram ID: ${telegram_id}
🔗 Username: ${tgUsername}
📌 Telegram name: ${tgName}
`;

    // 🔥 ОТПРАВКА С КНОПКАМИ
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Одобрить",
                callback_data: `approve_${telegram_id}`
              },
              {
                text: "❌ Отклонить",
                callback_data: `decline_${telegram_id}`
              }
            ]
          ]
        }
      })
    });

    const data = await response.json();

    if (!data.ok) {
      return res.status(500).json({
        ok: false,
        error: data.description || 'Telegram error'
      });
    }

    return res.status(200).json({
      ok: true,
      joinLink: GROUP_JOIN_LINK || 'https://t.me/'
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Server error'
    });
  }
}
