/**
 * InsightFlow — Dashboard & Chart.js Visualization Engine
 */

let sentimentChartInstance = null;
let categoryChartInstance = null;

function renderCharts(feedbackData) {
  // Aggregate Sentiment
  let posCount = 0, neuCount = 0, negCount = 0;
  const categoryCounts = {};

  feedbackData.forEach(item => {
    if (item.sentiment === "Positive") posCount++;
    else if (item.sentiment === "Neutral") neuCount++;
    else if (item.sentiment === "Negative") negCount++;

    const cat = item.category || "General";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Render Sentiment Donut Chart
  const ctxSentiment = document.getElementById('sentimentChart').getContext('2d');
  if (sentimentChartInstance) sentimentChartInstance.destroy();

  sentimentChartInstance = new Chart(ctxSentiment, {
    type: 'doughnut',
    data: {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [{
        data: [posCount, neuCount, negCount],
        backgroundColor: ['#10b981', '#64748b', '#f43f5e'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      }
    }
  });

  // Render Category Bar Chart
  const ctxCategory = document.getElementById('categoryChart').getContext('2d');
  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(ctxCategory, {
    type: 'bar',
    data: {
      labels: Object.keys(categoryCounts),
      datasets: [{
        label: 'Feedback Frequency',
        data: Object.values(categoryCounts),
        backgroundColor: '#6366f1',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}