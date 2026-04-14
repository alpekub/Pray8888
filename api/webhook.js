const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

// временно храним данные заявки между mini app и контактом
const pendingByUser = globalThis.pendingByUser || new Map();
globalThis.pendingByUser = pendingByUser;

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

function decodeBase64Url(input = '') {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '==='.slice((normalized.length + 3) % 4);
    return decodeURIComponent(escape(Buffer.from(padded, 'base64').toString('utf8')));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const body = req.body || {};

    // 1) обычный /start без данных
    if (body.message?.text === '/start') {
      await telegram('sendMessage', {
        chat_id: body.message.from.id,
        text: 'Сначала откройте ссылку регистрации и заполните форму.'
      });

      return res.status(200).json({ ok: true });
    }

    // 2) /start с данными из mini app
    if (body.message?.text && body.message.text.startsWith('/start ')) {
      const from = body.message.from;
      const payload = body.message.text.split(' ')[1] || '';
      const decoded = decodeBase64Url(payload);

      let parsed = null;
      try {
        parsed = decoded ? JSON.parse(decoded) : null;
      } catch {
        parsed = null;
      }

      if (!parsed?.name || !parsed?.country) {
        await telegram('sendMessage', {
          chat_id: from.id,
          text: 'Сначала откройте ссылку регистрации и заполните форму.'
        });

        return res.status(200).json({ ok: true });
      }

      pendingByUser.set(String(from.id), {
        name: parsed.name,
        country: parsed.country,
        createdAt: Date.now()
      });

      await telegram('sendMessage', {
        chat_id: from.id,
        text: 'Для завершения регистрации нажмите кнопку ниже и поделитесь своим номером телефона.',
        reply_markup: {
          keyboard: [
            [
              {
                text: 'Поделиться номером',
                request_contact: true
              }
            ]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });

      return res.status(200).json({ ok: true });
    }

    // 3) человек поделился контактом
    if (body.message?.contact) {
      const from = body.message.from;
      const contact = body.message.contact;
      const key = String(from.id);
      const pending = pendingByUser.get(key);

      if (!pending) {
        await telegram('sendMessage', {
          chat_id: from.id,
          text: 'Сначала откройте ссылку регистрации и заполните форму.',
          reply_markup: {
            remove_keyboard: true
          }
        });

        return res.status(200).json({ ok: true });
      }

      if (contact.user_id && String(contact.user_id) !== String(from.id)) {
        await telegram('sendMessage', {
          chat_id: from.id,
          text: 'Пожалуйста, отправьте именно свой номер телефона.',
          reply_markup: {
            keyboard: [
              [
                {
                  text: 'Поделиться номером',
                  request_contact: true
                }
              ]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        });

        return res.status(200).json({ ok: true });
      }

      const phone = contact.phone_number.startsWith('+')
        ? contact.phone_number
        : `+${contact.phone_number}`;

      const username = from.username ? `@${from.username}` : 'нет username';
      const tgName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || '—';

      const text =
`🚨 Новая заявка в Step of Faith

👤 Имя: ${pending.name}
🌍 Страна: ${pending.country}
📱 Телефон: ${phone}

🆔 Telegram ID: ${from.id}
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
                callback_data: `approve_${from.id}`
              },
              {
                text: '❌ Отклонить',
                callback_data: `decline_${from.id}`
              }
            ]
          ]
        }
      });

      pendingByUser.delete(key);

      await telegram('sendMessage', {
        chat_id: from.id,
        text:
`Ваша заявка отправлена на рассмотрение.
В случае одобрения вам будет отправлен ответ в личные сообщения.
Время ожидания — до 24 часов.`,
        reply_markup: {
          remove_keyboard: true
        }
      });

      return res.status(200).json({ ok: true });
    }

    // 4) кнопки в группе заявок
    if (body.callback_query) {
      const callback = body.callback_query;
      const data = callback.data || '';
      const adminMessageChatId = callback.message?.chat?.id;
      const adminMessageId = callback.message?.message_id;

      await telegram('answerCallbackQuery', {
        callback_query_id: callback.id
      });

      if (data.startsWith('approve_')) {
        const userId = data.split('_')[1];

        const invite = await telegram('createChatInviteLink', {
          chat_id: process.env.GROUP_CHAT_ID,
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

        await telegram('editMessageText', {
          chat_id: adminMessageChatId,
          message_id: adminMessageId,
          text: '✅ Заявка одобрена. Одноразовая ссылка отправлена.'
        });

        return res.status(200).json({ ok: true });
      }

      if (data.startsWith('decline_')) {
        await telegram('editMessageText', {
          chat_id: adminMessageChatId,
          message_id: adminMessageId,
          text: '❌ Заявка отклонена.'
        });

        return res.status(200).json({ ok: true });
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
