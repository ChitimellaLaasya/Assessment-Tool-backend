# Assessment Tool — Backend

A Node.js/Express REST API that handles TQ score lookups, raw score validation, and PDF report generation for the Assessment Tool. Built during an internal hackathon at **[Neuro-Paradigm](https://github.com/neuro-paradigm)**, a research-based startup.

---

## Related Repositories

| Repository | Description |
|---|---|
| [Assessment-Tool-frontend](https://github.com/ChitimellaLaasya/Assessment-Tool-frontend) | React frontend — form entry, score display, report download |
| **This repo** — [Assessment-Tool-backend](https://github.com/ChitimellaLaasya/Assessment-Tool-backend) | Express backend (this project) |

---

## Overview

This backend serves three core responsibilities:

1. **TQ Score Lookup** — Given a child's age, test section (verbal/performance), and raw subtest scores, it queries MongoDB and returns the corresponding TQ scores.
2. **Raw Score Validation** — Checks whether a submitted raw score is within the valid range for a given subtest, age, and section.
3. **Report Generation** — Populates an HTML report template with all patient and score data, then renders it to a downloadable PDF using Puppeteer.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB (via Mongoose 8) |
| PDF Rendering | Puppeteer Core + `@sparticuz/chromium` |
| File Handling | Multer |
| Environment | dotenv |
| CORS | cors |

---

## Project Structure

```
reports-backend/
├── helpers/
│   └── tqClassifier.js        # Maps a TQ score to its classification label
├── models/
│   └── tqNorms.js             # Mongoose schema for norm data (age + subtest → TQ mappings)
├── routes/
│   ├── tqRoutes.js            # POST /api/getAllTQScores, GET /api/classify/:score
│   └── validateRawScore.js    # POST /api/validateRawScore
├── template/
│   └── complete_report.html   # HTML report template with «Placeholder» tokens
├── index.js                   # App entry point — Express setup, report endpoints
├── package.json
└── .gitignore
```

---

## API Reference

### TQ Score Lookup

**`POST /api/getAllTQScores`**

Accepts an array of subtests with raw scores and returns the corresponding TQ score for each.

**Request body:**
```json
{
  "age": 10,
  "section": "verbal",
  "tests": [
    { "name": "Information", "raw_score": 18 },
    { "name": "Comprehension", "raw_score": 15 },
    { "name": "Digit_Span", "raw_score": 12 }
  ]
}
```

**Response:**
```json
{
  "results": [
    { "name": "Information", "raw_score": 18, "tq_score": 105 },
    { "name": "Comprehension", "raw_score": 15, "tq_score": 98 },
    { "name": "Digit_Span", "raw_score": 12, "tq_score": 95 }
  ]
}
```

---

### Raw Score Validation

**`POST /api/validateRawScore`**

Checks whether a submitted raw score is within the valid range for a subtest.

**Request body:**
```json
{
  "age": 10,
  "section": "verbal",
  "name": "Information",
  "userRawScore": 25
}
```

**Response (invalid):**
```json
{
  "valid": false,
  "message": "Entered raw score is too high. Max allowed for age 10, section verbal, subtest Information is 20."
}
```

---

### TQ Classification

**`GET /api/classify/:score`**

Returns the traditional classification label for a given TQ score.

**Example:** `GET /api/classify/115`

**Response:**
```json
{
  "tqValue": 115,
  "traditionalClassification": "High Average"
}
```

**Classification ranges:**

| TQ Score | Classification |
|---|---|
| 130+ | Very Superior |
| 120–129 | Superior |
| 110–119 | High Average |
| 90–109 | Average |
| 80–89 | Low Average |
| 70–79 | Borderline |
| Below 70 | Extremely Low |

---

### Report Generation

**`POST /generate-preview`**

Accepts all patient and score data as form fields. Returns an HTML preview of the assessment report with all placeholders populated.

**`POST /download-preview-pdf`**

Same input as `/generate-preview`. Uses Puppeteer to render the populated HTML template to an A4 PDF and returns it as a binary download (`Assessment_Report.pdf`).

**Key form fields accepted by both endpoints:**

| Field | Description |
|---|---|
| `name` | Patient name |
| `gender` | Patient gender (`male` / `female` / `other`) |
| `dob` | Date of birth |
| `dateOfTesting` | Date of assessment |
| `age` | Computed age |
| `class` | School grade |
| `school` | School name |
| `informant` | Name of informant |
| `testsadministered` | Test type (e.g., WISC) |
| `Information`, `Comprehension`, `Arithmetic`, `Similarities` | Verbal subtest TQ scores |
| `Vocabulary` / `DigitSpan` | Mutually exclusive verbal subtest TQ score |
| `verbalChoice` | Which of Vocabulary or Digit Span was used |
| `Picture_Completion`, `Block_Design`, `Object_Assembly`, `Coding`, `Mazes` | Performance subtest TQ scores |
| `verbalQuotient`, `performanceQuotient`, `overallQuotient` | Computed IQ quotients |
| `summary` | Clinical summary text |
| `recommend1`, `recommend2`, `recommend3` | Recommendation paragraphs |
| `readingAge`, `spellingAge` | Reading and spelling age scores |

---

## Database Schema

The `IQNorm` collection stores the norm data used for TQ lookups.

```js
{
  age: Number,                      // Child's age (6–15)
  section: "verbal" | "performance",
  name: String,                     // Subtest name (e.g., "Information", "Digit_Span")
  mappings: [
    {
      raw_score: Number,
      tq_score: Number
    }
  ]
}
```

Each document represents all raw-to-TQ mappings for a specific subtest, age, and section combination.

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- A running MongoDB instance (local or Atlas)

### Installation

```bash
git clone https://github.com/ChitimellaLaasya/Assessment-Tool-backend.git
cd Assessment-Tool-backend
npm install
```

### Environment Variables

Create a `.env` file at the project root:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
```

### Running the Server

```bash
npm start
```

The server starts on **port 8000** by default: `http://localhost:8000`

---

## Deployment

The backend is deployed on [Render](https://render.com). Puppeteer is configured to use `@sparticuz/chromium` for serverless/cloud compatibility, avoiding the need for a full Chrome installation on the server.

---

## Notes

- This project was built during an internal hackathon at [Neuro-Paradigm](https://github.com/neuro-paradigm), a research-based startup.
- The frontend and backend are maintained as separate repositories.
- The report template (`template/complete_report.html`) uses `«Placeholder»` tokens (guillemet-style) for template substitution — these are replaced at runtime via regex before PDF rendering.
- Digit Span aliasing (`Digit_Span`, `Digit Span`, `DigitSpan`) is handled automatically in the TQ lookup route.
