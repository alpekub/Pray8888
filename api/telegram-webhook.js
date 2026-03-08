export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BOT_TOKEN = '8695311162:AAF1wYNGMLyPHM6G-aPJApeu6O-3FrT8ovE';
  const GROUP_ID = '-5249064306';
  
  try {
    const body = req.body;
    
    // Проверяем, если это callback_query
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const callbackId = callbackQuery.id;
      const messageId = callbackQuery.message?.message_id;
      const chatId = callbackQuery.message?.chat?.id;
      const data = callbackQuery.data;
      const userId = callbackQuery.from?.id;
      const userName = callbackQuery.from?.first_name || 'Администратор';
      
      // Проверяем, если это отклонение заявки
      if (data && data.startsWith('reject_')) {
        const requestNumber = data.replace('reject_', '');
        
        // 1. Редактируем оригинальное сообщение в группе, показывая что заявка отклонена
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `🚫 <b>Заявка №${requestNumber}</b>\n\n<i>Отклонена ${userName}</i>\n<i>Место освобождено</i>`,
            parse_mode: 'HTML'
          })
        });

        // 2. Отправляем ответ пользователю, нажавшему кнопку
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackId,
            text: `✅ Заявка №${requestNumber} отклонена и место освобождено для новых заявок`,
            show_alert: false
          })
        });

        // 3. Отправляем сообщение в группу о том, что место освобождено
        const notificationMsg = `✅ <b>Место №${requestNumber} освобождено</b>\n\n📌 Это место теперь доступно для новой заявки.\n\nОтклонил: ${userName}`;
        
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: GROUP_ID,
            text: notificationMsg,
            parse_mode: 'HTML'
          })
        });

        return res.status(200).json({ 
          success: true, 
          message: `Заявка №${requestNumber} отклонена, место освобождено`,
          request_number: requestNumber
        });
      }
    }
    
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
