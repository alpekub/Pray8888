export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  const url = process.env.PUBLIC_BASE_URL;

  const webhookUrl = `${url}/api/webhook`;

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: webhookUrl
    })
  });

  const data = await response.json();

  res.status(200).json(data);
}
