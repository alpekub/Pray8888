export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const BOT_TOKEN    = process.env.BOT_TOKEN;
  const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

  if (!BOT_TOKEN || !GROUP_CHAT_ID) {
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  const body = req.body || {};

  if (!body.callback_query) {
    return res.status(200).json({ ok: true });
  }

  const cb     = body.callback_query;
  const data   = cb.data || '';
  const msgId  = cb.message?.message_id;
  const chatId = cb.message?.chat?.id;

  // Always answer callback to remove loading spinner
  const answerCb = () => tgRequest(BOT_TOKEN, 'answerCallbackQuery', {
    callback_query_id: cb.id
  });

  if (data.startsWith('approve_')) {
    const userId = data.replace('approve_', '');

    let inviteLink = null;
    try {
      const expireDate = Math.floor(Date.now() / 1000) + 86400;
      const linkRes = await tgRequest(BOT_TOKEN, 'createChatInviteLink', {
        chat_id: GROUP_CHAT_ID,
        member_limit: 1,
        expire_date: expireDate
      });

      if (!linkRes.ok) {
        console.error('createChatInviteLink failed:', linkRes);
      } else {
        inviteLink = linkRes.result.invite_link;
      }
    } catch (e) {
      console.error('createChatInviteLink error:', e);
    }

    if (inviteLink) {
      try {
        const msgRes = await tgRequest(BOT_TOKEN, 'sendMessage', {
          chat_id: userId,
          text: 'Ваша заявка одобрена.',
          reply_markup: {
            inline_keyboard: [[
              { text: '🕊 Войти в группу', url: inviteLink }
            ]]
          }
        });
        if (!msgRes.ok) {
          console.error('sendMessage to user failed:', msgRes);
        }
      } catch (e) {
        console.error('sendMessage to user error:', e);
      }
    }

    const editedText = '✅ Заявка одобрена. Одноразовая ссылка отправлена.';
    try {
      const editRes = await tgRequest(BOT_TOKEN, 'editMessageText', {
        chat_id: chatId,
        message_id: msgId,
        text: editedText,
        parse_mode: 'HTML'
      });
      if (!editRes.ok) {
        console.error('editMessageText (approve) failed:', editRes);
      }
    } catch (e) {
      console.error('editMessageText (approve) error:', e);
    }

  } else if (data.startsWith('decline_')) {
    const editedText = '❌ Заявка отклонена.';
    try {
      const editRes = await tgRequest(BOT_TOKEN, 'editMessageText', {
        chat_id: chatId,
        message_id: msgId,
        text: editedText,
        parse_mode: 'HTML'
      });
      if (!editRes.ok) {
        console.error('editMessageText (decline) failed:', editRes);
      }
    } catch (e) {
      console.error('editMessageText (decline) error:', e);
    }
  }

  await answerCb();
  return res.status(200).json({ ok: true });
}

async function tgRequest(token, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}
