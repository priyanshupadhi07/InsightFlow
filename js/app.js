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
  const clearAllBtn = document.getElementById('clearAllBtn');

  // Clear All Data Event
  clearAllBtn.addEventListener('click', () => {
    clearDashboard();
  });



  // Load Demo Data Event
  loadDemoBtn.addEventListener('click', async () => {
    // Reset inputs
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = 'ALL';
    
    await initializeData(MOCK_FEEDBACK_DATA);
    
    // Provide visual feedback
    loadDemoBtn.innerText = 'Loaded 8 Demo Items! ✓';
    loadDemoBtn.classList.remove('bg-slate-700');
    loadDemoBtn.classList.add('bg-emerald-600');
    
    setTimeout(() => {
      loadDemoBtn.innerText = 'Load Demo Dataset';
      loadDemoBtn.classList.remove('bg-emerald-600');
      loadDemoBtn.classList.add('bg-slate-700');
    }, 2000);
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

  // Render Table Rows
  renderTable(currentFeedbackStore);
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
  renderTable(filtered);
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

function renderTable(data) {
  const tbody = document.getElementById('feedbackTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/60 transition';

    let badgeColor = 'bg-slate-700 text-slate-300';
    if (item.sentiment === 'Positive') badgeColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    else if (item.sentiment === 'Negative') badgeColor = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

    tr.innerHTML = `
      <td class="px-4 py-3 text-slate-400">${item.source}</td>
      <td class="px-4 py-3 font-medium text-slate-200">${item.customer_name}</td>
      <td class="px-4 py-3 max-w-md truncate" title="${item.feedback_text}">${item.feedback_text}</td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded-md text-xs bg-slate-800 border border-slate-700 text-indigo-300">${item.category}</span></td>
      <td class="px-4 py-3"><span class="px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor}">${item.sentiment}</span></td>
      <td class="px-4 py-3 text-slate-400 text-xs">${item.date}</td>
    `;
    tbody.appendChild(tr);
  });
}


function clearDashboard() {
  currentFeedbackStore = [];

  // Reset inputs
  document.getElementById('searchInput').value = '';
  document.getElementById('categoryFilter').value = 'ALL';
  document.getElementById('csvFileInput').value = '';

  // Reset KPIs
  document.getElementById('kpiTotal').innerText = '0';
  document.getElementById('kpiSentiment').innerText = '0%';
  document.getElementById('kpiCritical').innerText = '0';
  document.getElementById('kpiDriver').innerText = 'None';

  // Render empty charts and table
  renderCharts([]);
  renderTable([]);
}