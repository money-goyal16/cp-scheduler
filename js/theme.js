// ===========================
// theme.js — CP Scheduler
// Dark / Light theme toggle
// =========================== 

export function initTheme() {
  const btn = document.getElementById('theme-toggle-btn');
  const saved = localStorage.getItem('cp-scheduler-theme') || 'dark';

  applyTheme(saved);

  btn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('cp-scheduler-theme', next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
