// const express = require('express');
// const router = express.Router();
// const IQNorm = require('../models/tqNorms');

// router.post('/validateRawScore', async (req, res) => {
//   try {
//     console.log("Validation route called");
//     const { age, section, name, userRawScore } = req.body;
    
//     // 1. Basic Validation
//     if (userRawScore === undefined || isNaN(userRawScore)) {
//       return res.status(400).json({ error: 'userRawScore must be a number' });
//     }

//     // 2. Fetch data from MongoDB
//     const iqNorm = await IQNorm.findOne({ age, section, name });
//     if (!iqNorm) {
//       return res.status(404).json({ error: 'Norm data not found for provided inputs' });
//     }

//     // 3. Find Max Possible Score in the table
//     // Your old code used .flatMap(m => m.raw_scores), 
//     // but the JSON shows the field is "raw_score" (singular).
//     const maxMapping = iqNorm.mappings.reduce((prev, current) => 
//       (prev.raw_score > current.raw_score) ? prev : current
//     );

//     let matchedTQScores = [];

//     // 4. NEW HACKATHON RULE: If score is higher than max, use the max TQ score
//     if (userRawScore >= maxMapping.raw_score) {
//       matchedTQScores.push(maxMapping.tq_score);
//     } else {
//       // 5. Normal lookup for scores within range
//       const match = iqNorm.mappings.find(m => m.raw_score === Number(userRawScore));
//       if (match) {
//         matchedTQScores.push(match.tq_score);
//       }
//     }

//     // 6. Response
//     if (matchedTQScores.length === 0) {
//       return res.status(404).json({
//         valid: false,
//         message: 'No matching tq_score found.'
//       });
//     }

//     return res.status(200).json({
//       valid: true,
//       message: 'Raw score processed successfully.',
//       tqScores: matchedTQScores // Kept as array to support your existing frontend
//     });

//   } catch (err) {
//     console.error("Server Error:", err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const IQNorm = require('../models/tqNorms');

router.post('/validateRawScore', async (req, res) => {
  try {
    console.log("Validation route called");

    const { age, section, name, userRawScore } = req.body;

    // 1. Basic validation - convert once here
    const numericScore = Number(userRawScore);
    if (userRawScore === undefined || isNaN(numericScore)) {
      return res.status(400).json({ error: 'userRawScore must be a number' });
    }

    // 2. Fetch norm data from MongoDB
    const iqNorm = await IQNorm.findOne({ age, section, name });
    if (!iqNorm) {
      return res.status(404).json({ error: 'Norm data not found for provided inputs' });
    }

    // 3. Find max raw score mapping
    const maxMapping = iqNorm.mappings.reduce((prev, current) =>
      (prev.raw_score > current.raw_score) ? prev : current
    );

    console.log("User Raw Score:", numericScore);
    console.log("Max Raw Score:", maxMapping.raw_score);
    console.log("Loaded Norm:", iqNorm.age, iqNorm.section, iqNorm.name);

    let matchedTQScores = [];

    // 4. Hackathon rule: if user score >= max raw score, use max TQ score
    if (numericScore >= maxMapping.raw_score) {
      matchedTQScores.push(maxMapping.tq_score);
    } else {
      // 5. Normal exact lookup inside mappings
      const match = iqNorm.mappings.find(m => m.raw_score === numericScore);
      if (match) {
        matchedTQScores.push(match.tq_score);
      }
    }

    // 6. Response handling
    if (matchedTQScores.length === 0) {
      return res.status(404).json({
        valid: false,
        message: 'No matching tq_score found.'
      });
    }

    return res.status(200).json({
      valid: true,
      message: 'Raw score processed successfully.',
      tqScores: matchedTQScores
    });

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;