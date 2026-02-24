const mongoose = require('mongoose');

const IQNormSchema = new mongoose.Schema({
  age: {
    type: Number,
    required: true
  },
  section: {
    type: String,
    enum: ['verbal', 'performance'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  mappings: {
    type: [
      {
        raw_score: {
          type: Number, // Single value instead of an array
          required: true
        },
        tq_score: {
          type: Number, // Single value instead of an array
          required: true
        }
      }
    ],
    required: true
  }
});

module.exports = mongoose.model('IQNorm', IQNormSchema);
