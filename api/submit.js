export default async function handler(req, res) {
  const data = req.body;

  const message = `
Новая заявка

Имя: ${data.name}
Фамилия: ${data.surname}
Страна: ${data.country}
Телефон: ${data.phone}
Комментарий: ${data.comment}
`;

  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      chat_id: process.env.ADMIN_CHAT_ID,
      text: message
    })
  });

  res.status(200).json({ ok: true });
}
