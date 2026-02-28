const express = require('express');
const OpenAI = require('openai');
const { auth } = require('../middleware/auth');
const Progress = require('../models/Progress');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GET /api/planner/queue  — today's review queue
router.get('/queue', auth, async (req, res) => {
  try {
    const now = new Date();
    const dueItems = await Progress.find({
      userId: req.user._id,
      nextReview: { $lte: now }
    }).sort({ nextReview: 1 }).limit(15);

    const allProgress = await Progress.find({ userId: req.user._id });
    const examReadiness = allProgress.length
      ? Math.round(allProgress.reduce((sum, p) => sum + p.masteryScore, 0) / allProgress.length)
      : 0;

    const subjectBreakdown = {};
    allProgress.forEach(p => {
      if (!subjectBreakdown[p.subject])
        subjectBreakdown[p.subject] = { topics: 0, avgMastery: 0, totalXP: 0 };
      subjectBreakdown[p.subject].topics += 1;
      subjectBreakdown[p.subject].avgMastery += p.masteryScore;
      subjectBreakdown[p.subject].totalXP += p.xp;
    });
    Object.keys(subjectBreakdown).forEach(k => {
      subjectBreakdown[k].avgMastery = Math.round(
        subjectBreakdown[k].avgMastery / subjectBreakdown[k].topics
      );
    });

    // Items due in next 7 days
    const upcoming = await Progress.find({
      userId: req.user._id,
      nextReview: { $gt: now, $lte: new Date(now.getTime() + 7 * 86400000) }
    }).sort({ nextReview: 1 }).limit(10);

    res.json({
      dueNow: dueItems,
      upcoming,
      examReadiness,
      totalTopics: allProgress.length,
      subjectBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/planner/review — record a review (SM-2)
router.post('/review', auth, async (req, res) => {
  try {
    const { topic, subject, quality } = req.body;
    if (quality === undefined || quality < 0 || quality > 5)
      return res.status(400).json({ error: 'Quality must be 0-5' });

    let progress = await Progress.findOne({ userId: req.user._id, topic, subject });
    if (!progress) {
      progress = new Progress({ userId: req.user._id, topic, subject });
    }

    progress.applyReview(quality);
    await progress.save();

    res.json({
      message: 'Review recorded ✅',
      nextReview: progress.nextReview,
      interval: progress.interval,
      masteryScore: progress.masteryScore,
      xp: progress.xp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/planner/add-topic
router.post('/add-topic', auth, async (req, res) => {
  try {
    const { subject, topic, initialMastery = 0 } = req.body;
    if (!subject || !topic)
      return res.status(400).json({ error: 'Subject and topic required' });

    const progress = await Progress.findOneAndUpdate(
      { userId: req.user._id, subject, topic },
      { masteryScore: initialMastery, nextReview: new Date() },
      { upsert: true, new: true }
    );
    res.json({ progress, message: `Added ${topic} to your study plan!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/planner/generate-plan — AI-generated study plan
router.post('/generate-plan', auth, async (req, res) => {
  try {
    const { examName, examDate, subjects, hoursPerDay = 4 } = req.body;

    const daysLeft = Math.ceil((new Date(examDate) - new Date()) / 86400000);
    const prompt = `Create a detailed ${daysLeft}-day study plan for a student preparing for ${examName}.

Subjects: ${subjects.join(', ')}
Hours per day available: ${hoursPerDay}
Days until exam: ${daysLeft}

Return ONLY valid JSON:
{
  "overview": "2-sentence motivating overview",
  "weeklyGoals": ["week 1 goal", "week 2 goal", "week 3 goal"],
  "dailySchedule": {
    "morning": "activity (X hours)",
    "afternoon": "activity (X hours)",
    "evening": "activity (X hours)"
  },
  "topicPriority": [
    {"subject": "...", "topic": "...", "priority": "high|medium|low", "reason": "..."}
  ],
  "milestones": [
    {"day": 7, "goal": "Complete chapters 1-3 of Physics"},
    {"day": 14, "goal": "..."},
    {"day": ${daysLeft}, "goal": "Final revision complete"}
  ],
  "revisionStrategy": "Brief description of revision approach",
  "warningTopics": ["topics that typically trip students up"]
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 1000
    });

    const plan = JSON.parse(completion.choices[0].message.content);
    res.json({ plan, daysLeft, examName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
