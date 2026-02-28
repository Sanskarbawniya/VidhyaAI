const express = require('express');
const { auth } = require('../middleware/auth');
const Progress = require('../models/Progress');
const { Session, Submission } = require('../models/Session');
const User = require('../models/User');

const router = express.Router();

// GET /api/progress
router.get('/', auth, async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    const sessions = await Session.countDocuments({ userId: req.user._id });
    const submissions = await Submission.find({ userId: req.user._id })
      .select('type subject title feedback.overallScore feedback.grade createdAt')
      .sort({ createdAt: -1 }).limit(10);

    const totalXP = progress.reduce((s, p) => s + (p.xp || 0), 0);
    const avgMastery = progress.length
      ? Math.round(progress.reduce((s, p) => s + p.masteryScore, 0) / progress.length) : 0;

    // Build subject summary
    const bySubject = {};
    progress.forEach(p => {
      if (!bySubject[p.subject]) bySubject[p.subject] = { topics: [], avgMastery: 0 };
      bySubject[p.subject].topics.push({ topic: p.topic, mastery: p.masteryScore, xp: p.xp, nextReview: p.nextReview });
    });
    Object.keys(bySubject).forEach(s => {
      bySubject[s].avgMastery = Math.round(
        bySubject[s].topics.reduce((a, t) => a + t.mastery, 0) / bySubject[s].topics.length
      );
    });

    // Weekly activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const weeklyActivity = await Session.aggregate([
      { $match: { userId: req.user._id, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sessions: { $sum: 1 }, xp: { $sum: '$xpEarned' } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({ progress, bySubject, sessions, submissions, totalXP, avgMastery, weeklyActivity, user: req.user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
