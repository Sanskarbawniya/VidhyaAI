const express = require('express');
const OpenAI = require('openai');
const { auth } = require('../middleware/auth');
const { Submission, Rubric } = require('../models/Session');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/feedback/evaluate
router.post('/evaluate', auth, async (req, res) => {
  try {
    const { content, rubric, type = 'essay', subject, title, rubricId } = req.body;
    if (!content || content.trim().length < 20)
      return res.status(400).json({ error: 'Content too short (min 20 characters)' });

    let rubricText = rubric;
    if (rubricId) {
      const rubricDoc = await Rubric.findById(rubricId);
      if (rubricDoc) rubricText = JSON.stringify(rubricDoc.criteria);
    }

    const wordCount = content.split(/\s+/).length;

    const prompt = `You are an expert ${subject || 'academic'} evaluator assessing a student submission.

SUBMISSION TYPE: ${type}
SUBJECT: ${subject || 'General'}
WORD COUNT: ${wordCount}
RUBRIC: ${rubricText || 'Standard academic quality: clarity of argument, accuracy of content, logical structure, use of evidence, and critical thinking.'}

STUDENT SUBMISSION:
"""
${content.substring(0, 4000)}
"""

Evaluate thoroughly and return ONLY valid JSON (no markdown):
{
  "overallScore": <0-100 integer>,
  "grade": "<A+|A|B+|B|C+|C|D|F>",
  "percentile": "<estimated class percentile like '75th'>",
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
  "rubricBreakdown": [
    {"criterion": "Content Accuracy", "score": <0-10>, "maxScore": 10, "feedback": "specific feedback"},
    {"criterion": "Structure & Flow", "score": <0-10>, "maxScore": 10, "feedback": "specific feedback"},
    {"criterion": "Critical Thinking", "score": <0-10>, "maxScore": 10, "feedback": "specific feedback"},
    {"criterion": "Language & Clarity", "score": <0-10>, "maxScore": 10, "feedback": "specific feedback"},
    {"criterion": "Use of Evidence", "score": <0-10>, "maxScore": 10, "feedback": "specific feedback"}
  ],
  "nextSteps": "2 specific, actionable steps to improve this work",
  "encouragement": "Warm, specific encouragement referencing actual effort shown in the work",
  "suggestedRevision": "One paragraph showing how to improve the weakest section"
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 900
    });

    const feedback = JSON.parse(completion.choices[0].message.content);

    const submission = await Submission.create({
      userId: req.user._id, type, subject, title, content,
      rubric: rubricText, feedback, wordCount
    });

    res.json({ ...feedback, submissionId: submission._id, wordCount });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/submissions
router.get('/submissions', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).limit(20)
      .select('type subject title feedback.overallScore feedback.grade wordCount createdAt');
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/feedback/rubrics (teacher creates rubric)
router.post('/rubrics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher')
      return res.status(403).json({ error: 'Only teachers can create rubrics' });
    const { title, subject, type, criteria, isPublic } = req.body;
    const totalScore = criteria.reduce((sum, c) => sum + (c.maxScore || 10), 0);
    const rubric = await Rubric.create({
      teacherId: req.user._id, title, subject, type, criteria, totalScore, isPublic
    });
    res.status(201).json({ rubric });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/rubrics
router.get('/rubrics', auth, async (req, res) => {
  try {
    const rubrics = await Rubric.find({
      $or: [{ teacherId: req.user._id }, { isPublic: true }]
    }).sort({ createdAt: -1 });
    res.json({ rubrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
