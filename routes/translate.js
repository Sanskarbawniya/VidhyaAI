const express = require('express');
const OpenAI = require('openai');
const axios = require('axios');
const { auth } = require('../middleware/auth');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LANGUAGE_NAMES = {
  'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu', 'bn': 'Bengali',
  'mr': 'Marathi', 'kn': 'Kannada', 'gu': 'Gujarati', 'pa': 'Punjabi',
  'or': 'Odia', 'ml': 'Malayalam', 'as': 'Assamese', 'en': 'English'
};

// POST /api/translate
router.post('/', auth, async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = req.body;
    if (!text || !targetLanguage)
      return res.status(400).json({ error: 'text and targetLanguage required' });
    if (targetLanguage === sourceLanguage)
      return res.json({ translated: text, targetLanguage, source: 'passthrough' });

    const langName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

    // Try Bhashini first
    if (process.env.BHASHINI_API_KEY && process.env.BHASHINI_API_KEY !== 'your_bhashini_api_key') {
      try {
        const bhashiniRes = await axios.post(
          'https://dhruva-api.bhashini.gov.in/services/inference/pipeline',
          {
            pipelineTasks: [{
              taskType: 'translation',
              config: {
                language: { sourceLanguage, targetLanguage },
                serviceId: process.env.BHASHINI_TRANSLATION_SERVICE_ID || 'ai4bharat/indictrans-v2-all-gpu--t4'
              }
            }],
            inputData: { input: [{ source: text }] }
          },
          {
            headers: {
              Authorization: process.env.BHASHINI_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 8000
          }
        );
        const translated = bhashiniRes.data?.pipelineResponse?.[0]?.output?.[0]?.target;
        if (translated) return res.json({ translated, targetLanguage, source: 'bhashini' });
      } catch (bhashiniErr) {
        console.log('Bhashini failed, falling back to OpenAI:', bhashiniErr.message);
      }
    }

    // Fallback: OpenAI translation
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{
        role: 'user',
        content: `Translate the following educational content to ${langName}. 
Keep technical/math terms in English. Use simple, clear vocabulary suitable for students.
Return ONLY the translation, no explanation.

Text: ${text}`
      }],
      max_tokens: 1000,
      temperature: 0.3
    });

    const translated = completion.choices[0].message.content.trim();
    res.json({ translated, targetLanguage, langName, source: 'openai' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/translate/languages
router.get('/languages', (req, res) => {
  res.json({
    languages: Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({ code, name }))
  });
});

module.exports = router;
