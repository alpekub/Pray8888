export default async function handler(req, res) {
  try {
    const webhookUrl = `${process.env.PUBLIC_BASE_URL}/api/webhook`;

    const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to set webhook'
    });
  }
}
