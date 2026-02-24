// tqClassifier.js
function classifyTQ(value) {
    if (value >= 130) {
      return { old: "Very Superior", wiscV: "Extremely High" };
    } else if (value >= 120) {
      return { old: "Superior", wiscV: "Very High" };
    } else if (value >= 110) {
      return { old: "High Average", wiscV: "High Average" };
    } else if (value >= 90) {
      return { old: "Average level of intelligence", wiscV: "Average" };
    } else if (value >= 80) {
      return { old: "Low Average", wiscV: "Low Average" };
    } else if (value >= 70) {
      return { old: "Borderline level of intelligence", wiscV: "Very Low" };
    } else {
      return { old: "Low level of intelligence", wiscV: "Extremely Low" };
    }
  }
  
module.exports = classifyTQ;
  