const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const upload = multer();
const cors = require("cors");
require("dotenv").config();

const IQNorm = require("./models/tqNorms");
const iqNormRoutes = require("./routes/tqRoutes");
const validateRawScoreRoutes = require("./routes/validateRawScore");
const classifyTQ = require("./helpers/tqClassifier");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Mongo error:", err));

  
// Example route to add a subtest
app.post("/add", async (req, res) => {
  try {
    const data = await IQNorm.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const normalize = (v) => {
  const s = (v ?? "").toString().trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (lower === "undefined" || lower === "null") return "";
  return s;
};

const getPronouns = (gender, overrides = {}) => ({
  he_she:
    overrides.he_she ||
    (gender === "female" ? "she" : gender === "other" ? "they" : "he"),
  him_her:
    overrides.him_her ||
    (gender === "female" ? "her" : gender === "other" ? "them" : "him"),
  his_her:
    overrides.his_her ||
    (gender === "female" ? "her" : gender === "other" ? "their" : "his"),
});

const buildReplacements = (body) => {
  const gender = (body.gender || "").toLowerCase();
  const pronouns = getPronouns(gender, {
    he_she: body.he_she,
    him_her: body.him_her,
    his_her: body.his_her,
  });

  const normVocabulary = normalize(body.Vocabulary);
  const normDigitSpan = normalize(body.DigitSpan);
  const verbalChoice = (body.verbalChoice || "").toString();

  // Logic for Informant (Requirement #1)
  // If 'Other' is selected in frontend, use the text from body.otherInformant
  const informantDisplay = body.informant === "Other" 
    ? (body.otherInformant || "Other") 
    : body.informant;

  let digitVocabLabel = "null";
  let digitVocabScore = "null";
  if (verbalChoice === "Vocabulary") {
    digitVocabLabel = "Vocabulary";
    digitVocabScore = normVocabulary || "null";
  } else if (verbalChoice === "Digit_Span" || verbalChoice === "Digit Span") {
    digitVocabLabel = "Digit Span";
    digitVocabScore = normDigitSpan || "null";
  } else {
    if (normVocabulary) {
      digitVocabLabel = "Vocabulary";
      digitVocabScore = normVocabulary;
    } else if (normDigitSpan) {
      digitVocabLabel = "Digit Span";
      digitVocabScore = normDigitSpan;
    }
  }

  return {
    "«Name»": body.name || "",
    "«Gender»": body.gender || "",
    "«Date_of_Testing»": body.dateOfTesting || "",
    "«Class»": body.class || "",
    "«Date_of_Birth»": body.dob || "",
    "«Informant»": informantDisplay || "", // Updated logic applied here
    "«Age»": body.age || "",
    "«School_Name»": (body.school === "Other" ? body.otherSchool : body.school) || "", // Updated School logic
    "«Tests_Administered»": body.testsadministered || "",
    "«Other_Test»": body.otherTest || "",
    "«Verbal_quotient»": body.verbalQuotient || "",
    "«suggests»": body.suggests || "",
    "«Information»": normalize(body.Information) || "N/A",
    "«Comprehension»": normalize(body.Comprehension) || "N/A",
    "«Arithmetic»": normalize(body.Arithmetic) || "N/A",
    "«Similarities»": normalize(body.Similarities) || "N/A",
    "«Vocabulary»": normVocabulary || "N/A",
    "«Digit_Span»": normDigitSpan || "N/A",
    
    // Level classifications using updated tqClassifier labels
    "«Information_Level»": body.Information ? classifyTQ(Number(body.Information)).old : "N/A",
    "«Comprehension_Level»": body.Comprehension ? classifyTQ(Number(body.Comprehension)).old : "N/A",
    "«Arithmetic_Level»": body.Arithmetic ? classifyTQ(Number(body.Arithmetic)).old : "N/A",
    "«Similarities_Level»": body.Similarities ? classifyTQ(Number(body.Similarities)).old : "N/A",
    "«Vocabulary_Level»": normVocabulary ? classifyTQ(Number(normVocabulary)).old : "N/A",
    "«Digit_Span_Level»": normDigitSpan ? classifyTQ(Number(normDigitSpan)).old : "N/A",
    
    "«DigitVocabLabel»": digitVocabLabel,
    "«DigitVocabScore»": digitVocabScore,
    
    "«performance_quotient»": normalize(body.performanceQuotient) || "",
    "«performance_quotient_Level»": body.performanceQuotient ? classifyTQ(Number(body.performanceQuotient)).old : "N/A",
    
    "«Picture_Completion»": normalize(body.Picture_Completion) || "N/A",
    "«Block_Design»": normalize(body.Block_Design) || "N/A",
    "«Object_Assembly»": normalize(body.Object_Assembly) || "N/A",
    "«Coding»": normalize(body.Coding) || "N/A",
    "«Mazes»": normalize(body.Mazes) || "N/A",
    
    "«Picture_Completion_Level»": body.Picture_Completion ? classifyTQ(Number(body.Picture_Completion)).old : "N/A",
    "«Block_Design_Level»": body.Block_Design ? classifyTQ(Number(body.Block_Design)).old : "N/A",
    "«Object_Assembly_Level»": body.Object_Assembly ? classifyTQ(Number(body.Object_Assembly)).old : "N/A",
    "«Coding_Level»": body.Coding ? classifyTQ(Number(body.Coding)).old : "N/A",
    "«Mazes_Level»": body.Mazes ? classifyTQ(Number(body.Mazes)).old : "N/A",
    
    "«Overall_Quotient»": normalize(body.overallQuotient) || "",
    "«Overall_Level»": body.overallQuotient ? classifyTQ(Number(body.overallQuotient)).old : "N/A",
    
    // Note: Verbal_Raw_Total, Performance_Raw_Total, and Overall_Raw_Score_Total
    // have been omitted to comply with Requirement #6 (Items to Remove).

    "«Points»": normalize(body.pointsDifference) || "",
    "«reading_age»": normalize(body.readingAge) || "",
    "«below_than»": normalize(body.belowReading) || "",
    "«Spelling_age»": normalize(body.spellingAge) || "",
    "«below_than1»": normalize(body.aboveSpelling) || "",
    "«Summery»": body.summary || "",
    "«Final_Level»": body.finalLevel || "",
    "«Recomodations»": body.recommend1 || "",
    "«Recomodations_2»": body.recommend2 || "",
    "«Recomodations_3»": body.recommend3 || "",
    "«he_she»": pronouns.he_she,
    "«him_her»": pronouns.him_her,
    "«his_her»": pronouns.his_her,
  };
};

app.use("/report_template", express.static(path.join(__dirname, "template")));

app.post("/generate-preview", upload.none(), (req, res) => {
  try {
    const templatePath = path.join(
      __dirname,
      "template",
      "complete_report.html"
    );
    let htmlContent = fs.readFileSync(templatePath, "utf8");

    const replacements = buildReplacements(req.body);
    for (const key in replacements) {
      htmlContent = htmlContent.replace(
        new RegExp(key, "g"),
        replacements[key]
      );
    }

    res.send(htmlContent);
  } catch (error) {
    console.error("Error generating preview:", error);
    res.status(500).send("Error generating preview");
  }
});

let browserInstance; // reuse browser for all requests
// app.post("/download-preview-pdf", upload.none(), async (req, res) => {
//   try {
//     const templatePath = path.join(
//       __dirname,
//       "template",
//       "complete_report.html"
//     );
//     let htmlContent = fs.readFileSync(templatePath, "utf8");

//     const replacements = buildReplacements(req.body);
//     for (const key in replacements) {
//       htmlContent = htmlContent.replace(
//         new RegExp(key, "g"),
//         replacements[key]
//       );
//     }

//     if (!browserInstance) {
//       browserInstance = await puppeteer.launch({ args: ["--no-sandbox"] });
//     }
//     const page = await browserInstance.newPage();
//     await page.setContent(htmlContent, { waitUntil: "networkidle0" });

//     const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
//     await page.close();

//     res.set({
//       "Content-Type": "application/pdf",
//       "Content-Disposition": "attachment; filename=Preview_Report.pdf",
//     });
//     res.send(pdfBuffer);
//   } catch (error) {
//     console.error("Error generating PDF:", error);
//     res.status(500).send("Failed to generate PDF");
//   }
// });

app.post("/download-preview-pdf", upload.none(), async (req, res) => {
  try {
    const templatePath = path.join(__dirname, "template", "complete_report.html");
    if (!fs.existsSync(templatePath)) {
      throw new Error("Template file missing at " + templatePath);
    }

    let htmlContent = fs.readFileSync(templatePath, "utf8");

    const replacements = buildReplacements(req.body);
    for (const key in replacements) {
      htmlContent = htmlContent.replace(new RegExp(key, "g"), replacements[key]);
    }

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    await page.close();
    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=Preview_Report.pdf",
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Failed to generate PDF: " + error.message);
  }
});

app.use("/api", iqNormRoutes);
app.use("/api", validateRawScoreRoutes);
app.listen(8000, () => console.log("Server running on port 8000"));
