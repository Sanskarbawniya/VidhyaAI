const express = require('express');
const OpenAI = require('openai');
const { auth } = require('../middleware/auth');
const { Submission } = require('../models/Session');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/integrity/check
router.post('/check', auth, async (req, res) => {
  try {
    const { content, checkAI = true, submissionId } = req.body;
    if (!content || content.trim().length < 30)
      return res.status(400).json({ error: 'Content too short to analyse (min 30 characters)' });

    const wordCount = content.split(/\s+/).length;

    const prompt = `Analyse this student submission for academic integrity. Be fair and educational in your assessment.

SUBMISSION (${wordCount} words):
"""
${content.substring(0, 4000)}
"""

Return ONLY valid JSON:
{
  "originalityScore": <0-100, where 100 is fully original>,
  "aiDetectionScore": <0-100, probability this was AI-generated>,
  "verdict": "PASS | REVIEW | FAIL",
  "verdictReason": "1-2 sentence explanation of the verdict",
  "flaggedSentences": ["sentence that seems copied or AI-generated (max 3)"],
  "flaggedReasons": ["reason for flagging each sentence"],
  "citationSuggestions": [
    {"claim": "factual claim made", "suggestedCitation": "suggested source type e.g. 'NCERT Biology Ch.4' or 'peer-reviewed journal'"}
  ],
  "improvements": ["specific way to make the writing more original and personal"],
  "positives": ["what the student did well in terms of their own voice"],
  "educationalNote": "Helpful, non-judgmental note about academic integrity for this student"
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 700
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // Update submission record if provided
    if (submissionId) {
      await Submission.findOneAndUpdate(
        { _id: submissionId, userId: req.user._id },
        {
          originalityScore: result.originalityScore,
          aiDetectionScore: result.aiDetectionScore,
          integrityVerdict: result.verdict,
          citations: result.citationSuggestions?.map(c => c.suggestedCitation) || []
        }
      );
    }

    res.json({ ...result, wordCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrity/cite — generate citations
router.post('/cite', auth, async (req, res) => {
  try {
    const { source, style = 'APA', type = 'website' } = req.body;
    if (!source) return res.status(400).json({ error: 'Source information required' });

    const prompt = `Generate a properly formatted ${style} citation for this source:
Source info: "${source}"
Source type: ${type}

Return ONLY valid JSON:
{
  "apa": "Full APA format citation",
  "mla": "Full MLA format citation", 
  "chicago": "Full Chicago format citation",
  "inText": "In-text citation example for ${style}",
  "notes": "Any important notes about this citation"
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 400
    });

    const citations = JSON.parse(completion.choices[0].message.content);
    res.json(citations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
