const mongoose = require('mongoose');

// ─── CHAT SESSION ─────────────────────────────────────
const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, default: 'General' },
  topic: { type: String, default: 'General' },
  language: { type: String, default: 'en' },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'] },
    content: String,
    hintsGiven: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
  }],
  hintsUsed: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  masteryGain: { type: Number, default: 0 },
  durationMinutes: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ─── SUBMISSION ───────────────────────────────────────
const SubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['essay', 'code', 'lab', 'presentation', 'short_answer'], default: 'essay' },
  subject: String,
  title: String,
  content: { type: String, required: true },
  rubric: String,
  feedback: {
    overallScore: Number,
    grade: String,
    strengths: [String],
    improvements: [String],
    rubricBreakdown: [{
      criterion: String,
      score: Number,
      maxScore: Number,
      feedback: String
    }],
    nextSteps: String,
    encouragement: String
  },
  originalityScore: { type: Number, default: null },
  aiDetectionScore: { type: Number, default: null },
  integrityVerdict: { type: String, enum: ['PASS', 'REVIEW', 'FAIL', null], default: null },
  citations: [String],
  wordCount: Number,
}, { timestamps: true });

// ─── RUBRIC ───────────────────────────────────────────
const RubricSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  subject: String,
  type: { type: String, enum: ['essay', 'code', 'lab', 'presentation'] },
  criteria: [{
    name: String,
    description: String,
    maxScore: Number,
    levels: [{
      score: Number,
      label: String,
      description: String
    }]
  }],
  totalScore: Number,
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = {
  Session: mongoose.model('Session', SessionSchema),
  Submission: mongoose.model('Submission', SubmissionSchema),
  Rubric: mongoose.model('Rubric', RubricSchema)
};
