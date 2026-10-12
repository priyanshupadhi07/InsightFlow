/**
 * InsightFlow — Pure Gemini AI Engine
 * 100% Dynamic LLM Processing via Gemini 3.8 Flash
 */

const GEMINI_API_KEY = 'AQ.Ab8RN6Lz6Ga3h_wS2A1XuA3zjs2f-qeR_-asOgY5NaS9bLJPfw';

let latestAIRecommendations = [];

async function processFeedbackBatchWithAI(feedbackArray) {
  if (!feedbackArray || feedbackArray.length === 0) {
    latestAIRecommendations = [];
    return [];
  }

  const itemsToAnalyze = feedbackArray.map((item, idx) => ({
    id: idx,
    feedback: item.feedback_text,
    customer: item.customer_name,
    source: item.source
  }));

  const promptText = `
You are an advanced customer feedback intelligence engine.
Analyze each feedback entry in the dataset.

For each item, determine:
1. "category": A concise, contextual category (e.g., "Payment Gateway", "Navbar Bug", "Customer Support", "Performance", "Feature Request", etc. — create appropriate categories dynamically).
2. "sentiment": Strictly "Positive", "Negative", or "Neutral" based on customer context (e.g., failing payments or broken checkouts are strictly "Negative").

Also, generate 3-4 overall actionable business recommendations for the dataset:
• "title": Action title.
• "priority": "Critical", "High", "Medium", or "Low".
• "recommendation": A detailed, tailored solution.

Input Dataset:
${JSON.stringify(itemsToAnalyze)}

Return ONLY a raw JSON object matching this schema without markdown fences or additional text:
{
  "classifications": [
    {"id": 0, "category": "CategoryName", "sentiment": "SentimentName"}
  ],
  "actionItems": [
    {
      "title": "Title",
      "priority": "Critical",
      "recommendation": "Solution text"
    }
  ]
}
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API Error Response:', response.status, errorBody);
      alert(`Gemini API Error (${response.status}): Check browser console for details.`);
      return feedbackArray;
    }

    const data = await response.json();
    const rawContent = data.candidates[0].content.parts[0].text;
    
    // Clean markdown wrappers if returned
    const cleanJson = rawContent
      .replace(/^```json/g, '')
      .replace(/^```/g, '')
      .replace(/```$/g, '')
      .trim();

    const parsedResponse = JSON.parse(cleanJson);

    latestAIRecommendations = parsedResponse.actionItems || [];
    const classifications = parsedResponse.classifications || [];

    return feedbackArray.map((item, idx) => {
      const aiMatch = classifications.find(r => r.id === idx) || {};
      return {
        ...item,
        category: aiMatch.category || 'Uncategorized',
        sentiment: aiMatch.sentiment || 'Neutral'
      };
    });

  } catch (error) {
    console.error('Gemini AI Processing Error:', error);
    alert('Failed to process data with Gemini API. Check console logs.');
    return feedbackArray;
  }
}

function generateAIRecommendations(data) {
  if (!data || data.length === 0) {
    return { primaryDriver: 'None', actionItems: [] };
  }

  const categoryCounts = {};
  data.forEach(item => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });

  let primaryDriver = 'None';
  let maxCount = 0;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count > maxCount) {
      maxCount = count;
      primaryDriver = cat;
    }
  }

  return {
    primaryDriver,
    actionItems: latestAIRecommendations
  };
}