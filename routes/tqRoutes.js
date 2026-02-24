const express = require('express');
const router = express.Router();
const IQNorm = require('../models/tqNorms') // adjust path as per your project
const classifyTQ = require('../helpers/tqClassifier');

router.post('/getAllTQScores', async (req, res) => {
  const { age, section, tests } = req.body;

  if (!age || !section || !Array.isArray(tests)) {
    return res.status(400).json({ error: 'Missing or invalid input data' });
  }

  const results = [];

  const normalizeCanonicalName = (originalName) => {
    const lower = String(originalName || '').toLowerCase();
    if (['digit_span', 'digit span', 'digitspan'].includes(lower.replace(/\s+/g, '_'))) {
      return 'Digit_Span';
    }
    return originalName;
  };

  const getAliasCandidates = (name) => {
    const lower = String(name || '').toLowerCase();
    // aliases for Digit Span
    if (lower === 'digit_span' || lower === 'digit span' || lower === 'digitspan') {
      return ['Digit_Span', 'Digit Span', 'DigitSpan'];
    }
    // default: only the provided name
    return [name];
  };

  for (const test of tests) {
    const { name, raw_score } = test;

    try {
      const candidates = getAliasCandidates(name);
      let doc = null;
      let usedName = name;

      // Try each alias until a document is found
      for (const candidate of candidates) {
        doc = await IQNorm.findOne({ age: parseInt(age), section, name: candidate });
        if (doc) {
          usedName = candidate;
          break;
        }
      }

      if (!doc) {
        results.push({ name: normalizeCanonicalName(name), error: 'Test not found' });
        continue;
      }

      const mapping = doc.mappings.find(m => Number(m.raw_score) === Number(raw_score));
      if (!mapping) {
        results.push({ name: normalizeCanonicalName(usedName), error: 'Raw score not found' });
      } else {
        results.push({ name: normalizeCanonicalName(usedName), raw_score, tq_score: mapping.tq_score });
      }

    } catch (err) {
      results.push({ name: normalizeCanonicalName(name), error: 'Internal error' });
    }
  }

  res.json({ results });
});

router.get('/classify/:score', (req, res) => {
  const score = parseInt(req.params.score);

  if (isNaN(score)) {
    return res.status(400).json({ error: "Invalid TQ value" });
  }

  const { old } = classifyTQ(score);
  res.json({ tqValue: score, traditionalClassification: old });
});


module.exports = router;
