// ===========================
// hackathons-page.js — CP Scheduler
// Hackathons & Events Page Logic
// ===========================

import { initTheme } from './theme.js';
import { getEvents, saveEvent, deleteEvent, getStats } from './hackathons.js';

initTheme();

let activeTypeFilter = 'all';
let activeTimeFilter = 'all';

// ── Init ─────────────────────────────────────────────────────────
function init() {
  renderAll();
  setupForm();
  setupFilters();
}

// ── Render everything ─────────────────────────────────────────────
function renderAll() {
  const events = getEvents();
  renderNextEvent(events);
  renderStats(events);
  renderEvents(events);
}

// ── Next event banner ─────────────────────────────────────────────
function renderNextEvent(events) {
  const el = document.getElementById('next-event');
  const now = Date.now();
  const upcoming = events
    .filter(e => new Date(e.startDate).getTime() > now)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  if (!upcoming.length) {
    el.innerHTML = `<div style="padding:24px 32px;font-family:var(--font-mono);font-size:0.85rem;color:var(--text-muted)">
      No upcoming events yet — add one below!
    </div>`;
    return;
  }

  const e = upcoming[0];
  const diff = new Date(e.startDate).getTime() - now;

  el.innerHTML = `
    <div class="next-event-inner">
      <div>
        <div class="event-type-badge" data-type="${e.type}">${typeEmoji(e.type)} ${capitalize(e.type)}</div>
        <div class="next-contest-name" style="margin-top:10px">${e.name}</div>
        <div class="next-contest-meta" style="margin-top:8px">
          ${e.organizer ? `<span class="next-meta-item">🏢 ${e.organizer}</span>` : ''}
          <span class="next-meta-item">🕐 ${formatDate(e.startDate)}</span>
          ${e.location ? `<span class="next-meta-item">📍 ${e.location}</span>` : ''}
        </div>
        ${e.url ? `<a href="${e.url}" target="_blank" class="next-contest-link" style="margin-top:14px">Open Event →</a>` : ''}
      </div>
      <div class="countdown-block">
        <div class="countdown-label">Starts in</div>
        <div class="countdown-display" id="evt-cd">
          ${buildCountdown(diff)}
        </div>
      </div>
    </div>`;

  startCountdown('evt-cd', new Date(e.startDate).getTime());
}

// ── Stats ─────────────────────────────────────────────────────────
function renderStats(events) {
  const { total, upcoming, thisMonth, totalPrize } = getStats(events);
  document.getElementById('total-events').textContent = total;
  document.getElementById('upcoming-events').textContent = upcoming;
  document.getElementById('this-month-events').textContent = thisMonth;
  document.getElementById('total-prize-pool').textContent = totalPrize > 0 ? `$${totalPrize.toLocaleString()}` : '$0';
}

// ── Events grid ───────────────────────────────────────────────────
function renderEvents(events) {
  const el = document.getElementById('hackathons-list');
  const now = Date.now();

  const filtered = events.filter(e => {
    const t = new Date(e.startDate).getTime();
    if (activeTypeFilter !== 'all' && e.type !== activeTypeFilter) return false;
    if (activeTimeFilter === 'today') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      return t >= today.getTime() && t < tomorrow.getTime();
    }
    if (activeTimeFilter === 'week') {
      const weekEnd = now + 7 * 86400000;
      return t >= now && t <= weekEnd;
    }
    if (activeTimeFilter === 'month') {
      const monthEnd = now + 30 * 86400000;
      return t >= now && t <= monthEnd;
    }
    return true;
  }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  if (!filtered.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <p>No events match your current filters.</p>
      </div>`;
    return;
  }

  el.innerHTML = filtered.map((e, i) => {
    const isPast = new Date(e.endDate || e.startDate).getTime() < now;
    return `
    <div class="event-card" style="animation-delay:${i * 0.04}s;${isPast ? 'opacity:0.6' : ''}">
      <div class="event-type-badge" data-type="${e.type}">${typeEmoji(e.type)} ${capitalize(e.type)}</div>
      <div class="event-name">${e.name}</div>
      <div class="event-meta">
        ${e.organizer ? `<div class="event-meta-row">🏢 ${e.organizer}</div>` : ''}
        <div class="event-meta-row">🕐 ${formatDate(e.startDate)}</div>
        ${e.endDate ? `<div class="event-meta-row">🔚 ${formatDate(e.endDate)}</div>` : ''}
        ${e.location ? `<div class="event-meta-row">📍 ${e.location}</div>` : ''}
      </div>
      ${e.description ? `<div class="event-description">${e.description}</div>` : ''}
      <div class="event-card-footer">
        <div>
          ${e.prize ? `<span class="prize-tag">🏆 ${e.prize}</span>` : ''}
          ${isPast ? `<span style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);margin-left:6px">Ended</span>` : ''}
        </div>
        <div class="event-actions">
          ${e.url ? `<a href="${e.url}" target="_blank" class="event-link-btn">Open →</a>` : ''}
          <button class="event-delete-btn" data-id="${e.id}" title="Remove event">✕ Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Delete handlers
  el.querySelectorAll('.event-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteEvent(btn.dataset.id);
      renderAll();
    });
  });
}

// ── Form ──────────────────────────────────────────────────────────
function setupForm() {
  const btn = document.getElementById('add-event-btn');
  btn?.addEventListener('click', () => {
    const name = document.getElementById('event-name').value.trim();
    const organizer = document.getElementById('event-organizer').value.trim();
    const startDate = document.getElementById('event-start').value;
    const endDate = document.getElementById('event-end').value;
    const url = document.getElementById('event-url').value.trim();
    const type = document.getElementById('event-type').value;
    const location = document.getElementById('event-location').value.trim();
    const prize = document.getElementById('event-prize').value.trim();
    const desc = document.getElementById('event-description').value.trim();

    if (!name || !startDate || !endDate) {
      showToast('Please fill in Name, Start & End date.', 'error');
      return;
    }

    saveEvent({ name, organizer, startDate, endDate, url, type, location, prize, description: desc });
    clearForm();
    renderAll();
    showToast(`"${name}" added!`, 'success');
  });
}

function clearForm() {
  ['event-name', 'event-organizer', 'event-url', 'event-location', 'event-prize', 'event-description']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['event-start', 'event-end'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

// ── Filters ───────────────────────────────────────────────────────
function setupFilters() {
  document.querySelectorAll('.filter-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTypeFilter = btn.dataset.type;
      renderEvents(getEvents());
    });
  });

  document.querySelectorAll('.filter-btn[data-time]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-time]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTimeFilter = btn.dataset.time;
      renderEvents(getEvents());
    });
  });
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const existing = document.getElementById('cp-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'cp-toast';
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${type === 'success' ? 'var(--green)' : 'var(--red)'};
    color:${type === 'success' ? '#0a1a12' : '#fff'};
    font-family:var(--font-mono);font-size:0.82rem;font-weight:700;
    padding:12px 20px;border-radius:var(--radius-sm);
    box-shadow:var(--shadow);animation:fadeUp 0.3s ease;
    max-width:300px;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Countdown ─────────────────────────────────────────────────────
function buildCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = n => String(n).padStart(2, '0');
  return `
    <div class="cd-unit"><span class="cd-num">${p(d)}</span><span class="cd-lbl">d</span></div>
    <span class="cd-sep">:</span>
    <div class="cd-unit"><span class="cd-num">${p(h)}</span><span class="cd-lbl">h</span></div>
    <span class="cd-sep">:</span>
    <div class="cd-unit"><span class="cd-num">${p(m)}</span><span class="cd-lbl">m</span></div>
    <span class="cd-sep">:</span>
    <div class="cd-unit"><span class="cd-num">${p(s)}</span><span class="cd-lbl">s</span></div>`;
}

function startCountdown(elId, endTime) {
  const tick = () => {
    const el = document.getElementById(elId);
    if (!el) return;
    const diff = endTime - Date.now();
    if (diff <= 0) { el.innerHTML = `<span class="cd-num" style="color:var(--green)">LIVE</span>`; return; }
    el.innerHTML = buildCountdown(diff);
    setTimeout(tick, 1000);
  };
  tick();
}

// ── Utils ─────────────────────────────────────────────────────────
function formatDate(str) {
  return new Date(str).toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function typeEmoji(t) {
  return { hackathon: '🚀', workshop: '🛠', conference: '🎤', meetup: '🤝', other: '📌' }[t] || '📌';
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

init();
