// Full Telegram backend handler code goes here

const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 3000;
const token = process.env.TELEGRAM_TOKEN;

const bot = new TelegramBot(token);

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
    const chatId = req.body.message.chat.id;
    const text = req.body.message.text;

    // Process the received message and respond
    bot.sendMessage(chatId, 'You said: ' + text);

    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});