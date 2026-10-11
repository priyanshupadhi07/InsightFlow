/**
 * InsightFlow — Main Application Controller
 */

let currentFeedbackStore = [];

document.addEventListener('DOMContentLoaded', () => {
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const csvFileInput = document.getElementById('csvFileInput');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const exportPdfBtn = document.getElementById('exportPdfBtn');

  // Load Demo Data Event
  loadDemoBtn.addEventListener('click', async () => {
    await initializeData(MOCK_FEEDBACK_DATA);
  });

  // Upload CSV File Event
  csvFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const parsedData = await parseCSVFile(file);
      await initializeData(parsedData);
    }
  });

  // Search & Filter Listeners
  searchInput.addEventListener('input', applyFilters);
  categoryFilter.addEventListener('change', applyFilters);

  // Export PDF Event
  exportPdfBtn.addEventListener('click', generatePdfReport);

  // Initial Load
  initializeData(MOCK_FEEDBACK_DATA);
});

async function initializeData(rawData) {
  // Process through AI Pipeline
  currentFeedbackStore = await processFeedbackBatchWithAI(rawData);
  
  // Update KPI Cards
  updateKPIs(currentFeedbackStore);

  // Render Charts
  renderCharts(currentFeedbackStore);
}

function updateKPIs(data) {
  document.getElementById('kpiTotal').innerText = data.length;
  
  const positiveCount = data.filter(d => d.sentiment === 'Positive').length;
  const negativeCount = data.filter(d => d.sentiment === 'Negative').length;
  const netSentiment = data.length > 0 ? Math.round(((positiveCount - negativeCount) / data.length) * 100) : 0;
  
  document.getElementById('kpiSentiment').innerText = `${netSentiment}%`;
  document.getElementById('kpiCritical').innerText = negativeCount;

  const recommendations = generateAIRecommendations(data);
  document.getElementById('kpiDriver').innerText = recommendations.primaryDriver;
}

function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const selectedCat = document.getElementById('categoryFilter').value;

  const filtered = currentFeedbackStore.filter(item => {
    const matchesSearch = item.feedback_text.toLowerCase().includes(query) || item.customer_name.toLowerCase().includes(query);
    const matchesCategory = selectedCat === 'ALL' || item.category === selectedCat;
    return matchesSearch && matchesCategory;
  });

  renderCharts(filtered);
  updateKPIs(filtered);
}

function generatePdfReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("InsightFlow — Executive Customer Insights Report", 14, 20);

  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  doc.text(`Total Sampled Feedback: ${currentFeedbackStore.length}`, 14, 40);

  doc.text("Top AI-Identified Priorities:", 14, 55);
  const recommendations = generateAIRecommendations(currentFeedbackStore);
  
  recommendations.actionItems.forEach((item, index) => {
    doc.text(`${index + 1}. ${item.title} (${item.priority} Priority)`, 14, 65 + (index * 15));
    doc.text(`   ${item.recommendation}`, 14, 72 + (index * 15));
  });

  doc.save("InsightFlow_Executive_Report.pdf");
}