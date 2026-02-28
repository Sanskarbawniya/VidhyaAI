const express = require('express');
const { auth, teacherOnly } = require('../middleware/auth');
const Progress = require('../models/Progress');
const { Session, Submission } = require('../models/Session');
const User = require('../models/User');

const router = express.Router();

// GET /api/teacher/analytics
router.get('/analytics', auth, teacherOnly, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const activeToday = await User.countDocuments({
      role: 'student',
      lastActive: { $gte: new Date(Date.now() - 86400000) }
    });

    const topicsNeedingHelp = await Progress.aggregate([
      { $group: { _id: { subject: '$subject', topic: '$topic' }, avgMastery: { $avg: '$masteryScore' }, count: { $sum: 1 } } },
      { $match: { avgMastery: { $lt: 60 }, count: { $gte: 2 } } },
      { $sort: { avgMastery: 1 } },
      { $limit: 10 }
    ]);

    const recentSubmissions = await Submission.find()
      .sort({ createdAt: -1 }).limit(20)
      .populate('userId', 'name email grade');

    const subjectEngagement = await Session.aggregate([
      { $group: { _id: '$subject', sessions: { $sum: 1 }, avgXP: { $avg: '$xpEarned' } } },
      { $sort: { sessions: -1 } }
    ]);

    const totalSubmissions = await Submission.countDocuments();
    const avgScore = await Submission.aggregate([
      { $group: { _id: null, avg: { $avg: '$feedback.overallScore' } } }
    ]);

    res.json({
      totalStudents, activeToday,
      topicsNeedingHelp,
      recentSubmissions,
      subjectEngagement,
      totalSubmissions,
      avgScore: avgScore[0]?.avg ? Math.round(avgScore[0].avg) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
