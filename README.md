# 🎓 VidyaAI — Personalised AI Tutor for Every Indian Student

<div align="center">

**Hackathon 2025 — AI in Education & Skilling**

*Learn smarter, not harder. In your language.*

[![Node.js](https://img.shields.io/badge/Node.js-18+-success?logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://cloud.mongodb.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-black?logo=openai)](https://platform.openai.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

---

## 🏆 What We Built

VidyaAI is a full-stack adaptive learning platform that personalises education for every student using **explainable AI**, **multilingual support in 12 Indian languages**, and **academic integrity built in**.

> **Problem:** 500M+ Indian students learn with one-size-fits-all content. Students from Tier-2/3 cities can't access quality tutors in their mother tongue. Anxiety from vague feedback kills motivation.

> **Solution:** An AI that *guides* rather than answers, adapts to each student's pace, and speaks their language.

---

## ✨ Five Core Modules

| Module | Description |
|--------|-------------|
| 🧠 **Adaptive Concept Coach** | Socratic stepwise hints (3-level system), Bloom's Taxonomy aligned, knowledge graph mastery tracking |
| 📝 **Rubric-Aware Feedback** | AI evaluates essays/code/labs against teacher rubrics — strengths, gaps, next steps |
| 📅 **Smart Study Planner** | SM-2 spaced repetition algorithm + exam readiness score + 7-day queue |
| 🗣️ **Multilingual Voice Tutor** | Full UI in Hindi, Tamil, Telugu, Bengali, Marathi + 7 more via Bhashini API |
| 🔒 **Academic Integrity Suite** | Originality scoring, AI detection, smart citation generator (APA/MLA/Chicago) |

---

## ⚙️ Tech Stack

```
Frontend:   HTML5 · CSS3 (Animations) · Vanilla JS · Chart.js · Socket.io client
Backend:    Node.js 18+ · Express.js · Socket.io
Database:   MongoDB Atlas (Mongoose ODM)
AI:         OpenAI GPT-4o (tutor, feedback, integrity)
Languages:  Bhashini API by MeitY (12 Indian languages)
Auth:       JWT + Bcrypt
Deploy:     Render (backend) · MongoDB Atlas M0 (DB)
```

---

## 📁 Project Structure

```
vidyaai/
├── server.js                 ← Express app entry point
├── package.json
├── .env.example              ← Environment variable template
├── Dockerfile                ← Docker containerization
├── render.yaml               ← One-click Render deployment
├── .gitignore
├── public/
│   └── index.html            ← Complete SPA frontend
├── routes/
│   ├── auth.js               ← Register, login, JWT
│   ├── tutor.js              ← GPT-4o Socratic engine + quiz gen
│   ├── feedback.js           ← Rubric-aware essay/code feedback
│   ├── planner.js            ← SM-2 spaced repetition
│   ├── integrity.js          ← Plagiarism + AI detection + citations
│   ├── translate.js          ← Bhashini + OpenAI fallback
│   ├── progress.js           ← Student analytics
│   └── teacher.js            ← Teacher dashboard API
├── models/
│   ├── User.js               ← User schema (student/teacher)
│   ├── Progress.js           ← SM-2 mastery tracking
│   └── Session.js            ← Chat sessions + submissions + rubrics
├── middleware/
│   └── auth.js               ← JWT auth + role guards
├── config/
│   └── socket.js             ← Real-time study rooms
└── scripts/
    └── seed.js               ← Demo data seeder
```

---

## 🚀 Local Setup (5 Minutes)

### Prerequisites
- **Node.js 18+** → https://nodejs.org/en/download
- **Git** → https://git-scm.com
- **MongoDB Atlas** (free) → https://cloud.mongodb.com
- **OpenAI API key** → https://platform.openai.com/api-keys

### Step 1 — Clone & Install

```bash
git clone https://github.com/your-team/vidyaai.git
cd vidyaai
npm install
```

### Step 2 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
MONGO_URI=mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/vidyaai
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxx
JWT_SECRET=run-this: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Bhashini API key is optional — the app auto-falls-back to OpenAI for translations.

### Step 3 — Seed Demo Data (Optional but Recommended)

```bash
node scripts/seed.js
```

This creates:
- **Student:** `student@demo.com` / `demo123`
- **Teacher:** `teacher@demo.com` / `demo123`

### Step 4 — Run

```bash
npm run dev     # Development with auto-reload (nodemon)
# OR
npm start       # Production
```

Open → **http://localhost:3000** 🎉

---

## ☁️ Production Deployment

### Option A: Render.com (Recommended — Free Tier)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
5. Add environment variables (MONGO_URI, OPENAI_API_KEY, JWT_SECRET)
6. Click **Deploy** → Get your live URL in ~3 minutes

> 💡 Alternatively, use the included `render.yaml` for automated config.

### Option B: Railway.app (One-Click)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Add env vars in Railway dashboard. Instant HTTPS URL provided.

### Option C: Docker

```bash
# Build
docker build -t vidyaai .

# Run
docker run -p 3000:3000 --env-file .env vidyaai
```

### Database — MongoDB Atlas (Free M0)

1. [cloud.mongodb.com](https://cloud.mongodb.com) → Create free account
2. Build a Database → Free M0 tier (no credit card needed)
3. Database Access → Add User (read/write)
4. Network Access → Add `0.0.0.0/0` (all IPs — fine for hackathon)
5. Connect → Drivers → Node.js → Copy URI → Paste in `.env`

---

## 🔌 API Reference

All protected endpoints require: `Authorization: Bearer <token>`

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/api/auth/register` | ❌ | Create student/teacher account |
| POST | `/api/auth/login` | ❌ | Login → receive JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| PUT | `/api/auth/profile` | ✅ | Update profile/language |
| POST | `/api/tutor/chat` | ✅ | Socratic AI tutoring session |
| POST | `/api/tutor/generate-quiz` | ✅ | Generate MCQ quiz for a topic |
| GET | `/api/tutor/sessions` | ✅ | List chat sessions |
| POST | `/api/feedback/evaluate` | ✅ | Rubric-aware submission grading |
| GET | `/api/feedback/submissions` | ✅ | List past submissions |
| POST | `/api/feedback/rubrics` | ✅ (teacher) | Create custom rubric |
| GET | `/api/planner/queue` | ✅ | Spaced repetition review queue |
| POST | `/api/planner/review` | ✅ | Record SM-2 review quality (0-5) |
| POST | `/api/planner/add-topic` | ✅ | Add topic to study plan |
| POST | `/api/planner/generate-plan` | ✅ | AI exam study plan generator |
| POST | `/api/integrity/check` | ✅ | Originality + AI detection |
| POST | `/api/integrity/cite` | ✅ | Generate APA/MLA/Chicago citations |
| POST | `/api/translate` | ✅ | Translate text to Indian language |
| GET | `/api/translate/languages` | ❌ | List supported languages |
| GET | `/api/progress` | ✅ | Full student progress dashboard |
| GET | `/api/teacher/analytics` | ✅ (teacher) | Class-level analytics |
| GET | `/api/health` | ❌ | Server health check |

---

## 🔑 Getting API Keys (All Free)

### OpenAI (Required)
1. [platform.openai.com/api-keys](https://platform.openai.com/api-keys) → Create key
2. Add $5 credits → enough for 500+ hackathon demo sessions

### Bhashini (Optional — Free from Govt. of India)
1. Register at [bhashini.gov.in/ulca/user-home](https://bhashini.gov.in/ulca/user-home)
2. Create App → Get API Key + Service ID
3. Supports: Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Gujarati, Punjabi, Odia, Malayalam, Assamese
4. If not configured → app automatically uses OpenAI for translation

### MongoDB Atlas (Required — Free M0 = 512MB)
1. [cloud.mongodb.com](https://cloud.mongodb.com) → Create account (no credit card)
2. Build a Database → M0 Free tier → Region: Mumbai (ap-south-1)

---

## 💡 Hackathon Judging Criteria

| Criterion | VidyaAI's Answer |
|-----------|-----------------|
| 🌍 **Social Impact** | 500M+ underserved Indian students, Tier-2/3 city access, mother tongue learning |
| 🔧 **Technical Depth** | GPT-4o + SM-2 algorithm + Socratic engine + Bhashini API + Socket.io |
| 💡 **Innovation** | Explainable stepwise hints, anti-cheat by learning design, mastery tracking |
| 📈 **Scalability** | MongoDB Atlas, stateless JWT, rate limiting, serverless-ready architecture |
| 🎨 **UX/Design** | Dark-mode SPA, animated UI, role-based views, multilingual, mobile responsive |
| ✅ **Completeness** | 5 modules, full auth, student + teacher roles, real API endpoints, seed data |

---

## 👥 Demo Accounts

After running `node scripts/seed.js`:

| Role | Email | Password |
|------|-------|----------|
| Student | student@demo.com | demo123 |
| Teacher | teacher@demo.com | demo123 |

---

## 📜 License

MIT — Free to use, learn from, and improve.

---

*Built with ❤️ for AI in Education Hackathon 2025*
