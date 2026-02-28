/**
 * VidyaAI Seed Script
 * Creates demo users and sample data for hackathon demo
 * Run: node scripts/seed.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true, lowercase: true },
  password: String, role: { type: String, default: 'student' },
  language: { type: String, default: 'en' }, grade: String, school: String,
  totalXP: { type: Number, default: 0 }, streak: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});
const User = mongoose.model('User', UserSchema);

const ProgressSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId, subject: String, topic: String,
  masteryScore: { type: Number, default: 0 }, xp: { type: Number, default: 0 },
  interval: { type: Number, default: 1 }, easeFactor: { type: Number, default: 2.5 },
  reviewCount: { type: Number, default: 0 }, nextReview: { type: Date, default: Date.now }
});
const Progress = mongoose.model('Progress', ProgressSchema);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clean existing demo data
    await User.deleteMany({ email: { $in: ['student@demo.com', 'teacher@demo.com'] } });

    const hashedPass = await bcrypt.hash('demo123', 12);

    // Demo student
    const student = await User.create({
      name: 'Arjun Mehta', email: 'student@demo.com', password: hashedPass,
      role: 'student', language: 'en', grade: 'Class 12',
      school: 'Delhi Public School', totalXP: 420, streak: 4
    });

    // Demo teacher
    await User.create({
      name: 'Dr. Priya Iyer', email: 'teacher@demo.com', password: hashedPass,
      role: 'teacher', language: 'en', school: 'Delhi Public School'
    });

    // Sample progress data for the student
    const subjects = [
      { subject: 'Mathematics', topics: ['Quadratic Equations', 'Trigonometry', 'Calculus Basics', 'Matrices'] },
      { subject: 'Physics', topics: ['Newton\'s Laws', 'Thermodynamics', 'Wave Optics'] },
      { subject: 'Chemistry', topics: ['Organic Chemistry', 'Periodic Table', 'Chemical Bonding'] },
    ];

    const progressDocs = [];
    subjects.forEach(({ subject, topics }) => {
      topics.forEach((topic, i) => {
        const mastery = Math.floor(30 + Math.random() * 60);
        const daysAgo = Math.floor(Math.random() * 14);
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() - Math.floor(Math.random() * 3) + i);
        progressDocs.push({
          userId: student._id, subject, topic,
          masteryScore: mastery, xp: mastery * 3,
          reviewCount: Math.floor(Math.random() * 5) + 1,
          lastReviewed: new Date(Date.now() - daysAgo * 86400000),
          nextReview
        });
      });
    });

    await Progress.insertMany(progressDocs);

    console.log('\n🎓 Demo accounts created:');
    console.log('   Student → student@demo.com / demo123');
    console.log('   Teacher → teacher@demo.com / demo123');
    console.log('\n✅ Seed complete! Run: npm start');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
