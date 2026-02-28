const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  masteryScore: { type: Number, default: 0, min: 0, max: 100 },
  xp: { type: Number, default: 0 },
  // SM-2 spaced repetition fields
  interval: { type: Number, default: 1 },       // days until next review
  easeFactor: { type: Number, default: 2.5 },   // difficulty multiplier
  reviewCount: { type: Number, default: 0 },
  lastReviewed: { type: Date },
  nextReview: { type: Date, default: Date.now },
  // Bloom's taxonomy level reached
  bloomLevel: {
    type: String,
    enum: ['remember', 'understand', 'apply', 'analyse', 'evaluate', 'create'],
    default: 'remember'
  },
  hintsUsed: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  wrongAnswers: { type: Number, default: 0 },
}, { timestamps: true });

ProgressSchema.index({ userId: 1, subject: 1, topic: 1 }, { unique: true });

// SM-2 Algorithm
ProgressSchema.methods.applyReview = function (quality) {
  // quality: 0-5 (0=blackout, 5=perfect)
  if (quality >= 3) {
    if (this.reviewCount === 0) this.interval = 1;
    else if (this.reviewCount === 1) this.interval = 6;
    else this.interval = Math.round(this.interval * this.easeFactor);
    this.easeFactor = Math.max(1.3, this.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    this.reviewCount += 1;
  } else {
    this.interval = 1;
    this.reviewCount = 0;
  }
  const masteryDelta = quality >= 4 ? 8 : quality >= 3 ? 4 : quality >= 2 ? 0 : -6;
  this.masteryScore = Math.min(100, Math.max(0, this.masteryScore + masteryDelta));
  this.lastReviewed = new Date();
  const next = new Date();
  next.setDate(next.getDate() + this.interval);
  this.nextReview = next;
  this.xp += quality * 5;
  return this;
};

module.exports = mongoose.model('Progress', ProgressSchema);
