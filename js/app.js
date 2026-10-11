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
  const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  
  // Initialize Saved Theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  }

  // Download Blank CSV Template
  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener('click', downloadCsvTemplate);
  }

  // Clear All Data Event
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      clearDashboard();
    });
  }

  // Load Demo Data Event
  if (loadDemoBtn) {
    loadDemoBtn.addEventListener('click', async () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('categoryFilter').value = 'ALL';
      
      await initializeData(MOCK_FEEDBACK_DATA);
      
      loadDemoBtn.innerText = 'Loaded 8 Demo Items! ✓';
      loadDemoBtn.classList.remove('bg-indigo-600');
      loadDemoBtn.classList.add('bg-emerald-600');
      
      setTimeout(() => {
        loadDemoBtn.innerText = 'Load Demo Dataset';
        loadDemoBtn.classList.remove('bg-emerald-600');
        loadDemoBtn.classList.add('bg-indigo-600');
      }, 2000);
    });
  }

  // Upload CSV File Event
  if (csvFileInput) {
    csvFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const parsedData = await parseCSVFile(file);
        await initializeData(parsedData);
      }
    });
  }

  // Search & Filter Listeners
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);

  // Export PDF Event
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', generatePdfReport);

  // Initial Load
  initializeData(MOCK_FEEDBACK_DATA);
});

async function initializeData(rawData) {
  currentFeedbackStore = await processFeedbackBatchWithAI(rawData);
  updateKPIs(currentFeedbackStore);
  renderCharts(currentFeedbackStore);
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

  const isDark = document.documentElement.classList.contains('dark');

  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'transition border-b border-slate-200 dark:border-slate-800';

    let badgeColor = isDark 
      ? 'bg-slate-800 text-slate-300 border border-slate-700' 
      : 'bg-slate-100 text-slate-700 border border-slate-200';

    if (item.sentiment === 'Positive') {
      badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
    } else if (item.sentiment === 'Negative') {
      badgeColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30';
    }

    const categoryBadgeStyle = isDark
      ? 'bg-slate-800 border border-slate-700 text-indigo-300'
      : 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium';

    const primaryTextStyle = isDark ? 'text-slate-100' : 'text-slate-900';
    const mutedTextStyle = isDark ? 'text-slate-400' : 'text-slate-600';

    tr.innerHTML = `
      <td class="px-4 py-3.5 ${mutedTextStyle}">${item.source}</td>
      <td class="px-4 py-3.5 font-semibold ${primaryTextStyle}">${item.customer_name}</td>
      <td class="px-4 py-3.5 max-w-md truncate ${primaryTextStyle}" title="${item.feedback_text}">${item.feedback_text}</td>
      <td class="px-4 py-3.5"><span class="px-2.5 py-1 rounded-md text-xs ${categoryBadgeStyle}">${item.category}</span></td>
      <td class="px-4 py-3.5"><span class="px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor}">${item.sentiment}</span></td>
      <td class="px-4 py-3.5 ${mutedTextStyle} text-xs">${item.date}</td>
    `;
    tbody.appendChild(tr);
  });
}

function clearDashboard() {
  currentFeedbackStore = [];

  document.getElementById('searchInput').value = '';
  document.getElementById('categoryFilter').value = 'ALL';
  document.getElementById('csvFileInput').value = '';

  document.getElementById('kpiTotal').innerText = '0';
  document.getElementById('kpiSentiment').innerText = '0%';
  document.getElementById('kpiCritical').innerText = '0';
  document.getElementById('kpiDriver').innerText = 'None';

  renderCharts([]);
  renderTable([]);
}

function downloadCsvTemplate() {
  const csvContent = "data:text/csv;charset=utf-8," 
    + "id,source,customer_name,feedback_text,date\n"
    + "1,Survey,John Doe,Checkout page takes too long to respond on mobile,2026-10-11\n"
    + "2,Support Ticket,Jane Smith,Was billed twice for subscription this month,2026-10-11\n";

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "InsightFlow_Feedback_Template.csv");
  document.body.appendChild(link);

  link.click();
  document.body.removeChild(link);
}

function applyTheme(theme) {
  const themeIcon = document.getElementById('themeIcon');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    if (themeIcon) themeIcon.innerText = '🌙';
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
    if (themeIcon) themeIcon.innerText = '☀️';
  }
  localStorage.setItem('theme', theme);

  if (typeof currentFeedbackStore !== 'undefined' && currentFeedbackStore.length > 0) {
    renderCharts(currentFeedbackStore);
    renderTable(currentFeedbackStore);
  }
}