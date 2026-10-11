/**
 * InsightFlow — Main Controller with Supabase Auth & Cloud Data Persistence
 */

let currentFeedbackStore = [];
let currentUser = null;
let isSignUpMode = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const openAuthModalBtn = document.getElementById('openAuthModalBtn');
  const closeAuthModal = document.getElementById('closeAuthModal');
  const authModal = document.getElementById('authModal');
  const authForm = document.getElementById('authForm');
  const toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // Controls
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const csvFileInput = document.getElementById('csvFileInput');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');

  // Initialize Saved Theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      applyTheme(isDark ? 'light' : 'dark');
    });
  }

  // --- AUTHENTICATION LISTENERS ---
  if (openAuthModalBtn) openAuthModalBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
  if (closeAuthModal) closeAuthModal.addEventListener('click', () => authModal.classList.add('hidden'));

  if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener('click', () => {
      isSignUpMode = !isSignUpMode;
      document.getElementById('authTitle').innerText = isSignUpMode ? 'Register New Account' : 'Sign In to InsightFlow';
      document.getElementById('authSubmitBtn').innerText = isSignUpMode ? 'Create Account' : 'Sign In';
      toggleAuthModeBtn.innerText = isSignUpMode ? 'Already have an account? Sign In' : "Don't have an account? Register here";
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail').value;
      const password = document.getElementById('authPassword').value;
      const errorEl = document.getElementById('authError');
      errorEl.classList.add('hidden');

      try {
        if (isSignUpMode) {
          const { data, error } = await supabaseClient.auth.signUp({ email, password });
          if (error) throw error;
          alert('Registration successful! Check your email or sign in.');
        } else {
          const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
          if (error) throw error;
          currentUser = data.user;
          updateUserUI(currentUser);
          authModal.classList.add('hidden');
          await loadUserFeedbackFromCloud();
        }
      } catch (err) {
        errorEl.innerText = err.message;
        errorEl.classList.remove('hidden');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      currentUser = null;
      updateUserUI(null);
      clearDashboard();
    });
  }

  // Check existing session on boot
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    updateUserUI(currentUser);
    await loadUserFeedbackFromCloud();
  } else {
    // Default guest demo initialization
    initializeData(MOCK_FEEDBACK_DATA, false);
  }

  // Action listeners
  if (downloadTemplateBtn) downloadTemplateBtn.addEventListener('click', downloadCsvTemplate);
  if (clearAllBtn) clearAllBtn.addEventListener('click', handleClearAll);

  if (loadDemoBtn) {
    loadDemoBtn.addEventListener('click', async () => {
      if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
      if (document.getElementById('categoryFilter')) document.getElementById('categoryFilter').value = 'ALL';
      await initializeData(MOCK_FEEDBACK_DATA, true);
    });
  }

  if (csvFileInput) {
    csvFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const parsedData = await parseCSVFile(file);
        await initializeData(parsedData, true);
      }
    });
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', generatePdfReport);
});

// Update Header User UI
function updateUserUI(user) {
  const openAuthModalBtn = document.getElementById('openAuthModalBtn');
  const userInfo = document.getElementById('userInfo');
  const userEmailTag = document.getElementById('userEmailTag');

  if (user) {
    if (openAuthModalBtn) openAuthModalBtn.classList.add('hidden');
    if (userInfo) {
      userInfo.classList.remove('hidden');
      userInfo.classList.add('flex');
    }
    if (userEmailTag) {
      userEmailTag.innerText = user.email;
      userEmailTag.className = 'text-xs font-semibold';
    }
  } else {
    if (openAuthModalBtn) openAuthModalBtn.classList.remove('hidden');
    if (userInfo) {
      userInfo.classList.add('hidden');
      userInfo.classList.remove('flex');
    }
  }
}

// Process and optionally persist data to Supabase cloud
async function initializeData(rawData, persistToCloud = false) {
  const processedBatch = await processFeedbackBatchWithAI(rawData);
  currentFeedbackStore = processedBatch;

  if (currentUser && persistToCloud) {
    const dbPayload = processedBatch.map(item => ({
      user_id: currentUser.id,
      source: item.source,
      customer_name: item.customer_name,
      feedback_text: item.feedback_text,
      category: item.category,
      sentiment: item.sentiment,
      date: item.date
    }));

    const { error } = await supabaseClient.from('feedback').insert(dbPayload);
    if (error) {
      console.error('Error persisting feedback:', error);
    } else {
      await loadUserFeedbackFromCloud();
      return;
    }
  }

  updateKPIs(currentFeedbackStore);
  renderCharts(currentFeedbackStore);
  renderActionItems(currentFeedbackStore);
  renderTable(currentFeedbackStore);
}

// Fetch user's historical saved records from Cloud
async function loadUserFeedbackFromCloud() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user feedback:', error);
    return;
  }

  currentFeedbackStore = data || [];
  updateKPIs(currentFeedbackStore);
  renderCharts(currentFeedbackStore);
  renderActionItems(currentFeedbackStore);
  renderTable(currentFeedbackStore);
}

// Clear local & database state
async function handleClearAll() {
  if (currentUser) {
    const confirmDelete = confirm("Are you sure? This will delete all your stored feedback from the database.");
    if (!confirmDelete) return;

    await supabaseClient.from('feedback').delete().eq('user_id', currentUser.id);
  }
  clearDashboard();
}

function clearDashboard() {
  currentFeedbackStore = [];
  if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
  if (document.getElementById('categoryFilter')) document.getElementById('categoryFilter').value = 'ALL';
  if (document.getElementById('csvFileInput')) document.getElementById('csvFileInput').value = '';

  if (document.getElementById('kpiTotal')) document.getElementById('kpiTotal').innerText = '0';
  if (document.getElementById('kpiSentiment')) document.getElementById('kpiSentiment').innerText = '0%';
  if (document.getElementById('kpiCritical')) document.getElementById('kpiCritical').innerText = '0';
  if (document.getElementById('kpiDriver')) document.getElementById('kpiDriver').innerText = 'None';

  renderCharts([]);
  renderActionItems([]);
  renderTable([]);
}

function updateKPIs(data) {
  if (document.getElementById('kpiTotal')) document.getElementById('kpiTotal').innerText = data.length;
  
  const positiveCount = data.filter(d => d.sentiment === 'Positive').length;
  const negativeCount = data.filter(d => d.sentiment === 'Negative').length;
  const netSentiment = data.length > 0 ? Math.round(((positiveCount - negativeCount) / data.length) * 100) : 0;
  
  if (document.getElementById('kpiSentiment')) document.getElementById('kpiSentiment').innerText = `${netSentiment}%`;
  if (document.getElementById('kpiCritical')) document.getElementById('kpiCritical').innerText = negativeCount;

  const recommendations = generateAIRecommendations(data);
  if (document.getElementById('kpiDriver')) document.getElementById('kpiDriver').innerText = recommendations.primaryDriver;
}

function applyFilters() {
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const selectedCat = document.getElementById('categoryFilter')?.value || 'ALL';

  const filtered = currentFeedbackStore.filter(item => {
    const matchesSearch = item.feedback_text.toLowerCase().includes(query) || item.customer_name.toLowerCase().includes(query);
    const matchesCategory = selectedCat === 'ALL' || item.category === selectedCat;
    return matchesSearch && matchesCategory;
  });

  renderCharts(filtered);
  updateKPIs(filtered);
  renderActionItems(filtered);
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

function renderActionItems(data) {
  const container = document.getElementById('actionItemsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.innerHTML = `<p class="text-xs text-muted italic col-span-3">No active feedback data available to generate recommendations.</p>`;
    return;
  }

  const recommendations = generateAIRecommendations(data);

  if (!recommendations.actionItems || recommendations.actionItems.length === 0) {
    container.innerHTML = `<p class="text-xs text-muted italic col-span-3">No critical action items flagged for this dataset.</p>`;
    return;
  }

  const isDark = document.documentElement.classList.contains('dark');

  recommendations.actionItems.forEach(item => {
    const card = document.createElement('div');
    
    let priorityBadge = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    if (item.priority === 'High' || item.priority === 'Critical') {
      priorityBadge = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    } else if (item.priority === 'Medium') {
      priorityBadge = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
    }

    const cardBg = isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200';

    card.className = `p-4 rounded-lg border ${cardBg} space-y-2 flex flex-col justify-between`;
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-2">
          <h4 class="font-semibold text-sm text-heading">${item.title}</h4>
          <span class="px-2 py-0.5 rounded text-xs font-semibold border ${priorityBadge}">${item.priority}</span>
        </div>
        <p class="text-xs text-muted leading-relaxed">${item.recommendation}</p>
      </div>
    `;
    container.appendChild(card);
  });
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
    renderActionItems(currentFeedbackStore);
    renderTable(currentFeedbackStore);
  }
}