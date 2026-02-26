const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are a helpful and professional customer support assistant for Transkom, a foreign currency exchange platform.
Your goal is to assist users with their questions regarding currency exchange, our features, and how to use the platform.
- Tone: Professional, helpful, concise, and trustworthy.
- Key Features to Remember: We offer Direct Remittance, Multi-Currency Support (hold 40+ currencies), and Enterprise Security (SOC 2, HIPAA ready). We process payments via Razorpay.
- Boundaries: Do not provide financial advice. If you do not know the answer or the user asks something complex about their specific account, politely tell them to contact support at support@transkom.com.
- NEVER output raw HTML tags or script tags. Respond only in plain text.
Please keep your answers relatively brief and easy to read.
`;

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_LENGTH = 20;

router.post('/', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required and must be a string.' });
        }

        // Sanitize and limit message length
        const sanitizedMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH);
        if (sanitizedMessage.length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty.' });
        }

        // Format and limit history
        const formattedHistory = Array.isArray(history)
            ? history.slice(-MAX_HISTORY_LENGTH).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: String(msg.content || '').slice(0, MAX_MESSAGE_LENGTH) }]
            }))
            : [];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                ...formattedHistory,
                { role: 'user', parts: [{ text: sanitizedMessage }] }
            ],
            config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.2,
            }
        });

        res.json({ reply: response.text });
    } catch (error) {
        console.error('Chatbot error:', error.message);
        res.status(500).json({ error: 'Failed to process message. The AI service might be unavailable.' });
    }
});

module.exports = router;
