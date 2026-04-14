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
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body || {};

    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const adminChatId = cq.message?.chat?.id;
      const messageId = cq.message?.message_id;

      if (!data.includes(':')) {
        await telegram('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: 'Неизвестная команда'
        });
        return res.status(200).json({ ok: true });
      }

      const [action, applicantId] = data.split(':');

      if (action === 'approve') {
        await telegram('sendMessage', {
          chat_id: applicantId,
          text: `💛 Ваша заявка одобрена\n\nДобро пожаловать в сообщество Step of Faith 🙏`
        });

        await telegram('editMessageReplyMarkup', {
          chat_id: adminChatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] }
        });

        await telegram('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: 'Заявка одобрена'
        });
      }

      if (action === 'decline') {
        await telegram('sendMessage', {
          chat_id: applicantId,
          text:
`💛 Ваша заявка рассмотрена

❌ Вам отказано в регистрации в сообщество Step of Faith в соответствии с внутренними критериями участия

Но вы по-прежнему можете быть частью нашего Telegram-канала 🙏`,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Перейти в канал',
                  url: process.env.CHANNEL_LINK
                }
              ]
            ]
          }
        });

        await telegram('editMessageReplyMarkup', {
          chat_id: adminChatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] }
        });

        await telegram('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: 'Заявка отклонена'
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      error: error.message || 'Webhook error'
    });
  }
}
