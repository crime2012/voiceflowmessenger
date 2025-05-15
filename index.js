const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VOICEFLOW_API_KEY = process.env.VOICEFLOW_API_KEY;
const VOICEFLOW_VERSION_ID = process.env.VOICEFLOW_VERSION_ID;

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        for (const entry of body.entry) {
            for (const event of entry.messaging) {
                const senderId = event.sender.id;
                const messageText = event.message?.text;

                if (messageText) {
                    const vfRes = await axios.post(
                        `https://general-runtime.voiceflow.com/state/${VOICEFLOW_VERSION_ID}/user/${senderId}/interact`,
                        { type: 'text', payload: messageText },
                        { headers: { Authorization: VOICEFLOW_API_KEY } }
                    );

                    for (const msg of vfRes.data) {
                        if (msg.type === 'text') {
                            await axios.post(
                                `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
                                {
                                    recipient: { id: senderId },
                                    message: { text: msg.payload.message }
                                }
                            );
                        }
                    }
                }
            }
        }
        res.sendStatus(200);
    }
});

app.listen(3000, () => console.log('Server pornit pe portul 3000'));
