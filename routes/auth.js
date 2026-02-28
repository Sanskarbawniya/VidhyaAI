const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

const signToken = (user) => jwt.sign(
  { id: user._id, role: user.role, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student', language = 'en', grade, school } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password, role, language, grade, school });
    const token = signToken(user);

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id, name, email, role, language,
        grade, school, totalXP: 0, streak: 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.isActive)
      return res.status(403).json({ error: 'Account deactivated. Contact support.' });

    // Update streak
    const today = new Date();
    const lastActive = new Date(user.lastActive);
    const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) user.streak += 1;
    else if (diffDays > 1) user.streak = 1;
    user.lastActive = today;
    await user.save({ validateBeforeSave: false });

    const token = signToken(user);

    res.json({
      message: `Welcome back, ${user.name}! 🎓`,
      token,
      user: {
        id: user._id, name: user.name, email: user.email,
        role: user.role, language: user.language,
        grade: user.grade, school: user.school,
        totalXP: user.totalXP, streak: user.streak
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user.toPublic() });
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, language, grade, school, subjects } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (language) updates.language = language;
    if (grade) updates.grade = grade;
    if (school) updates.school = school;
    if (subjects) updates.subjects = subjects;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ message: 'Profile updated!', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
