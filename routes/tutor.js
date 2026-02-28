const express = require('express');
const OpenAI = require('openai');
const { auth } = require('../middleware/auth');
const { Session } = require('../models/Session');
const Progress = require('../models/Progress');
const User = require('../models/User');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Build Socratic system prompt
const buildSystemPrompt = (subject, topic, language, bloomLevel) => `
You are VidyaAI — a warm, patient, deeply knowledgeable AI tutor for Indian students (Classes 6–12 and competitive exams like JEE, NEET, UPSC).

SUBJECT: ${subject || 'General Academics'}
CURRENT TOPIC: ${topic || 'Open Discussion'}
STUDENT'S CURRENT BLOOM LEVEL: ${bloomLevel || 'remember'}
LANGUAGE: Respond in ${language === 'en' ? 'English' : language + ' (use simple vocabulary)'}

═══ CORE TEACHING PHILOSOPHY ═══
• NEVER give direct answers. Always use the Socratic method — guide with questions.
• Use Bloom's Taxonomy progression: Remember → Understand → Apply → Analyse → Evaluate → Create
• Detect confusion signals and offer analogies from everyday Indian life (cricket, cooking, trains, festivals)
• Praise EFFORT and PROCESS, never just outcomes ("You're asking the right questions!" not "You're so smart")
• Keep responses concise: 80-120 words maximum. Students lose focus with long text.

═══ HINT SYSTEM (3-level) ═══
When student is stuck:
  • Hint 1: Redirect attention ("Think about what we know about X...")  
  • Hint 2: Offer an analogy or partial scaffold
  • Hint 3: Show a worked sub-step (NOT full solution). Say "Hint 3/3 — last one before I show you!"
After Hint 3: Show full worked solution with explanation.

═══ RESPONSE FORMAT ═══
• End EVERY response with exactly ONE question that pushes thinking forward
• Use bold for key terms: **quadratic formula**
• Use simple notation: x² not x^2, √ not sqrt()
• If student answers correctly, celebrate briefly then escalate difficulty
• Detect if student is frustrated (words like "I don't get it", "this is hard", "ughhh") and slow down

═══ MASTERY SIGNALS ═══
Mark [MASTERY_SIGNAL] at end if student demonstrates:
- Correctly used a concept unprompted
- Gave a full correct explanation
- Generalised to a new example
This helps the system update their mastery score.

═══ LANGUAGE RULES ═══
- If student writes in Hinglish or mixes languages, respond naturally in that mix
- Use Indian English idioms where natural ("Let us see...", "Shall we try?")
- For Hindi responses: use Devanagari script, keep math symbols in English
`.trim();

// POST /api/tutor/chat
router.post('/chat', auth, async (req, res) => {
  try {
    const {
      message, subject = 'General', topic = 'General',
      language = 'en', sessionId, bloomLevel = 'remember'
    } = req.body;

    if (!message || message.trim().length === 0)
      return res.status(400).json({ error: 'Message cannot be empty' });

    // Load or create session
    let session;
    if (sessionId) {
      session = await Session.findOne({ _id: sessionId, userId: req.user._id });
    }
    if (!session) {
      session = await Session.create({
        userId: req.user._id, subject, topic, language,
        messages: []
      });
    }

    // Build conversation history (last 10 messages)
    const history = session.messages.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: buildSystemPrompt(subject, topic, language, bloomLevel) },
        ...history,
        { role: 'user', content: message }
      ],
      max_tokens: 400,
      temperature: 0.7,
      presence_penalty: 0.3
    });

    const reply = completion.choices[0].message.content;
    const hasMasterySignal = reply.includes('[MASTERY_SIGNAL]');
    const cleanReply = reply.replace('[MASTERY_SIGNAL]', '').trim();

    // Save messages to session
    session.messages.push(
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: cleanReply, timestamp: new Date() }
    );
    session.hintsUsed += (cleanReply.toLowerCase().includes('hint') ? 1 : 0);
    session.xpEarned += 10;
    await session.save();

    // Update progress
    const masteryDelta = hasMasterySignal ? 8 : 2;
    await Progress.findOneAndUpdate(
      { userId: req.user._id, subject, topic },
      {
        $inc: { xp: 10, masteryScore: masteryDelta, reviewCount: 1 },
        $set: { lastReviewed: new Date(), updatedAt: new Date() }
      },
      { upsert: true, new: true }
    );

    // Update user XP
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalXP: 10 } });

    res.json({
      reply: cleanReply,
      sessionId: session._id,
      xpEarned: 10,
      masteryGain: masteryDelta,
      masterySignal: hasMasterySignal,
      tokensUsed: completion.usage?.total_tokens || 0
    });
  } catch (err) {
    console.error('Tutor chat error:', err);
    if (err.code === 'insufficient_quota')
      return res.status(402).json({ error: 'OpenAI quota exceeded. Check your API key billing.' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tutor/sessions
router.get('/sessions', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('-messages');
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tutor/sessions/:id
router.get('/sessions/:id', auth, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tutor/generate-quiz
router.post('/generate-quiz', auth, async (req, res) => {
  try {
    const { subject, topic, difficulty = 'medium', count = 5 } = req.body;

    const prompt = `Generate ${count} multiple-choice questions for ${subject} — ${topic} at ${difficulty} difficulty for Indian Class 10-12 students.

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "A",
      "explanation": "Brief explanation why this is correct",
      "bloomLevel": "understand|apply|analyse",
      "hint": "One-line hint without giving answer"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 1200
    });

    const data = JSON.parse(completion.choices[0].message.content);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
