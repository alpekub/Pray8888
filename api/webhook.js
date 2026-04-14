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
    const body = req.body || {};
    const groupChatId = process.env.GROUP_CHAT_ID;

    if (body.callback_query) {
      const callback = body.callback_query;
      const data = callback.data || '';
      const adminMessageChatId = callback.message?.chat?.id;
      const adminMessageId = callback.message?.message_id;

      // Убирает "Неизвестная команда"
      await telegram('answerCallbackQuery', {
        callback_query_id: callback.id
      });

      // Одобрить
      if (data.startsWith('approve_')) {
        const userId = data.split('_')[1];

        // Одноразовая ссылка
        const invite = await telegram('createChatInviteLink', {
          chat_id: groupChatId,
          member_limit: 1,
          expire_date: Math.floor(Date.now() / 1000) + 60 * 60 * 24
        });

        await telegram('sendMessage', {
          chat_id: userId,
          text: 'Ваша заявка одобрена.',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Войти в группу',
                  url: invite.invite_link
                }
              ]
            ]
          }
        });

        await telegram('editMessageReplyMarkup', {
          chat_id: adminMessageChatId,
          message_id: adminMessageId,
          reply_markup: {
            inline_keyboard: []
          }
        });

        await telegram('editMessageText', {
          chat_id: adminMessageChatId,
          message_id: adminMessageId,
          text: '✅ Заявка одобрена. Одноразовая ссылка отправлена.'
        });
      }

      // Отклонить
      if (data.startsWith('decline_')) {
        await telegram('editMessageReplyMarkup', {
          chat_id: adminMessageChatId,
          message_id: adminMessageId,
          reply_markup: {
            inline_keyboard: []
          }
        });

        await telegram('editMessageText', {
          chat_id: adminMessageChatId,
          message_id: adminMessageId,
          text: '❌ Заявка отклонена.'
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
