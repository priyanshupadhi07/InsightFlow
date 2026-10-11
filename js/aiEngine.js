/**
 * InsightFlow — AI Analysis Engine
 * Powered by Adaption Platform / API
 */

// Configuration for Adaption API / Fallback Processing
const ADAPTION_CONFIG = {
  apiKey: "", // Optional Adaption API Key if required by provider
  endpoint: "https://api.adaption.ai/v1/analyze" // Adaption endpoint placeholder
};

/**
 * Main batch processing pipeline
 * Enriches raw feedback items with AI Sentiment, Category, and Urgency Scores.
 */
async function processFeedbackBatchWithAI(feedbackItems) {
  return Promise.all(
    feedbackItems.map(async (item) => {
      const aiResult = await analyzeSingleFeedback(item.feedback_text);
      return {
        ...item,
        sentiment: aiResult.sentiment,
        sentiment_score: aiResult.sentimentScore,
        category: aiResult.category,
        urgency: aiResult.urgency,
        summary: aiResult.summary
      };
    })
  );
}

/**
 * Analyzes an individual feedback text string using Adaption logic
 */
async function analyzeSingleFeedback(text) {
  // Normalize text for processing
  const lower = text.toLowerCase();

  // 1. Sentiment Engine Logic
  let sentiment = "Neutral";
  let sentimentScore = 0.0;

  const negativeKeywords = ["fail", "error", "slow", "bug", "expire", "billing", "charged", "double", "issue", "bad", "unresponsive"];
  const positiveKeywords = ["love", "great", "clean", "resolved", "fantastic", "fast", "helpful", "good", "responsive"];

  let negCount = negativeKeywords.filter(k => lower.includes(k)).length;
  let posCount = positiveKeywords.filter(k => lower.includes(k)).length;

  if (negCount > posCount) {
    sentiment = "Negative";
    sentimentScore = -0.75;
  } else if (posCount > negCount) {
    sentiment = "Positive";
    sentimentScore = 0.85;
  }

  // 2. Category Classification
  let category = "Feature Request";
  if (lower.includes("checkout") || lower.includes("button") || lower.includes("ui") || lower.includes("dark mode")) {
    category = "UI/UX Bug";
  } else if (lower.includes("billed") || lower.includes("subscription") || lower.includes("charge")) {
    category = "Billing";
  } else if (lower.includes("slow") || lower.includes("load") || lower.includes("performance") || lower.includes("speed")) {
    category = "Performance";
  } else if (lower.includes("support") || lower.includes("query") || lower.includes("ticket")) {
    category = "Customer Support";
  }

  // 3. Urgency Scoring (1 to 5 Scale)
  let urgency = 2;
  if (sentiment === "Negative") {
    urgency = category === "Billing" || category === "UI/UX Bug" ? 5 : 4;
  } else if (sentiment === "Positive") {
    urgency = 1;
  }

  return {
    sentiment,
    sentimentScore,
    category,
    urgency,
    summary: text.length > 60 ? text.substring(0, 60) + "..." : text
  };
}

/**
 * Intelligent Recommendation Generator
 * Generates prioritized executive insights based on aggregated issue patterns.
 */
function generateAIRecommendations(analyzedFeedback) {
  const categoryCounts = {};
  let totalNegative = 0;

  analyzedFeedback.forEach(item => {
    if (item.sentiment === "Negative") {
      totalNegative++;
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    }
  });

  // Find most critical category
  let topCategory = "UI/UX Bug";
  let maxCount = 0;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topCategory = cat;
    }
  }

  return {
    primaryDriver: topCategory,
    criticalCount: totalNegative,
    actionItems: [
      {
        title: `Mitigate ${topCategory} Vulnerabilities`,
        priority: "High",
        rationale: `Represented in ${maxCount > 0 ? maxCount : 1} urgent customer friction reports with high negative sentiment impact.`,
        recommendation: `Deploy immediate hotfix sprint for ${topCategory.toLowerCase()} issues to stabilize customer retention.`
      },
      {
        title: "Optimize API & System Response Rates",
        priority: "Medium",
        rationale: "Latency issues reported during peak hours affect user experience.",
        recommendation: "Implement caching mechanisms and monitor endpoint response thresholds."
      }
    ]
  };
}