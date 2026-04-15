module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const BOT_TOKEN     = process.env.BOT_TOKEN;
  const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

  if (!BOT_TOKEN || !GROUP_CHAT_ID) {
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  const body = req.body || {};

  // Handle /start command
  if (body.message) {
    const msg  = body.message;
    const text = msg.text || '';
    const chatId = msg.chat && msg.chat.id;

    if (text.startsWith('/start') && chatId) {
      await tgCall(BOT_TOKEN, 'sendMessage', {
        chat_id: chatId,
        text: '👇 Нажмите кнопку ниже чтобы подать заявку в группу <b>Step of Faith — Шаг веры</b>',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '📋 Подать заявку',
              web_app: { url: 'https://pray8888.vercel.app' }
            }
          ]]
        }
      });
    }

    return res.status(200).json({ ok: true });
  }

  // Handle callback_query (approve / decline buttons)
  if (!body.callback_query) {
    return res.status(200).json({ ok: true });
  }

  const cb     = body.callback_query;
  const data   = cb.data || '';
  const msgId  = cb.message && cb.message.message_id;
  const chatId = cb.message && cb.message.chat && cb.message.chat.id;

  const answerCb = () => tgCall(BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id });

  if (data.startsWith('approve_')) {
    const userId = data.replace('approve_', '');

    let inviteLink = null;
    try {
      const expireDate = Math.floor(Date.now() / 1000) + 86400;
      const linkRes = await tgCall(BOT_TOKEN, 'createChatInviteLink', {
        chat_id: GROUP_CHAT_ID,
        member_limit: 1,
        expire_date: expireDate
      });
      if (linkRes.ok) {
        inviteLink = linkRes.result.invite_link;
      } else {
        console.error('createChatInviteLink failed:', JSON.stringify(linkRes));
      }
    } catch (e) {
      console.error('createChatInviteLink error:', e);
    }

    if (inviteLink) {
      try {
        await tgCall(BOT_TOKEN, 'sendMessage', {
          chat_id: userId,
          text: 'Ваша заявка одобрена.',
          reply_markup: {
            inline_keyboard: [[{ text: '🕊 Войти в группу', url: inviteLink }]]
          }
        });
      } catch (e) {
        console.error('sendMessage to user error:', e);
      }
    }

    try {
      await tgCall(BOT_TOKEN, 'editMessageText', {
        chat_id: chatId,
        message_id: msgId,
        text: '✅ Заявка одобрена. Одноразовая ссылка отправлена.',
        parse_mode: 'HTML'
      });
    } catch (e) {
      console.error('editMessageText approve error:', e);
    }

  } else if (data.startsWith('decline_')) {
    try {
      await tgCall(BOT_TOKEN, 'editMessageText', {
        chat_id: chatId,
        message_id: msgId,
        text: '❌ Заявка отклонена.',
        parse_mode: 'HTML'
      });
    } catch (e) {
      console.error('editMessageText decline error:', e);
    }
  }

  await answerCb();
  return res.status(200).json({ ok: true });
};

async function tgCall(token, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}
