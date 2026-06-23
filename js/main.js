// ===========================
// main.js — CP Scheduler
// Contest Dashboard Logic
// ===========================

import { initTheme } from './theme.js';
import { renderCalendar } from './calendar.js';
import { fetchContests } from './api.js';

initTheme();

// Platform filter state
let activeFilter = 'all';
let allContests = [];

// ── Render next contest ──────────────────────────────────────────
function renderNextContest(contests) {
  const el = document.getElementById('next-contest');
  const now = Date.now();

  const upcoming = contests
    .filter(c => c.startTime > now)
    .sort((a, b) => a.startTime - b.startTime);

  if (!upcoming.length) {
    el.innerHTML = `<div class="next-contest-inner">
      <div class="loading">No upcoming contests found. Check back soon!</div>
    </div>`;
    return;
  }

  const c = upcoming[0];
  const diff = c.startTime - now;

  el.innerHTML = `
    <div class="next-contest-inner">
      <div>
        <div class="next-platform-badge platform-pill ${c.platform}">${platformLabel(c.platform)}</div>
        <div class="next-contest-name">${c.name}</div>
        <div class="next-contest-meta">
          <span class="next-meta-item">🕐 ${formatDate(c.startTime)}</span>
          <span class="next-meta-item">⏱ ${formatDuration(c.duration)}</span>
        </div>
        ${c.url ? `<a href="${c.url}" target="_blank" class="next-contest-link">Open Contest →</a>` : ''}
      </div>
      <div class="countdown-block" id="main-countdown" data-end="${c.startTime}">
        <div class="countdown-label">Starts in</div>
        <div class="countdown-display" id="cd-display">
          ${buildCountdown(diff)}
        </div>
      </div>
    </div>`;

  startCountdown('cd-display', c.startTime);
}

function buildCountdown(ms) {
  const { d, h, m, s } = msToUnits(ms);
  return `
    <div class="cd-unit"><span class="cd-num">${pad(d)}</span><span class="cd-lbl">d</span></div>
    <span class="cd-sep">:</span>
    <div class="cd-unit"><span class="cd-num">${pad(h)}</span><span class="cd-lbl">h</span></div>
    <span class="cd-sep">:</span>
    <div class="cd-unit"><span class="cd-num">${pad(m)}</span><span class="cd-lbl">m</span></div>
    <span class="cd-sep">:</span>
    <div class="cd-unit"><span class="cd-num">${pad(s)}</span><span class="cd-lbl">s</span></div>`;
}

function startCountdown(elId, endTime) {
  const tick = () => {
    const el = document.getElementById(elId);
    if (!el) return;
    const diff = endTime - Date.now();
    if (diff <= 0) {
      el.innerHTML = `<span class="cd-num" style="color:var(--green)">LIVE</span>`;
      return;
    }
    el.innerHTML = buildCountdown(diff);
    requestAnimationFrame(() => setTimeout(tick, 1000));
  };
  tick();
}

// ── Render upcoming contests ─────────────────────────────────────
function renderUpcoming(contests) {
  const el = document.getElementById('upcoming-contests');
  const now = Date.now();

  const filtered = contests.filter(c => {
    const matchPlatform = activeFilter === 'all' || c.platform === activeFilter;
    return matchPlatform;
  }).sort((a, b) => a.startTime - b.startTime).slice(0, 12);

  if (!filtered.length) {
    el.innerHTML = `<div class="loading">No contests found for this filter.</div>`;
    return;
  }

  el.innerHTML = filtered.map((c, i) => {
    const isLive = now >= c.startTime && now <= c.startTime + c.duration * 1000;
    const isSoon = c.startTime - now < 3600000 && c.startTime > now;
    const status = isLive ? 'live' : isSoon ? 'soon' : 'upcoming';

    return `
    <div class="contest-card ${c.platform}" style="animation-delay:${i * 0.04}s">
      <div class="card-top">
        <span class="platform-pill">${platformLabel(c.platform)}</span>
        <span class="status-dot ${status}" title="${status}"></span>
      </div>
      <div class="contest-name">${c.name}</div>
      <div class="contest-info">
        <div class="contest-info-row">🕐 ${formatDate(c.startTime)}</div>
        <div class="contest-info-row">⏱ ${formatDuration(c.duration)}</div>
        ${isLive ? `<div class="contest-info-row" style="color:var(--green)">🟢 Live now!</div>` : ''}
      </div>
      <div class="contest-card-footer">
        <span class="card-duration">${formatDuration(c.duration)}</span>
        ${c.url ? `<a href="${c.url}" target="_blank" class="card-link">Register →</a>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── Platform cards mini-lists ────────────────────────────────────
function renderPlatformMinis(contests) {
  const platforms = ['leetcode', 'codeforces', 'codechef'];
  const now = Date.now();

  platforms.forEach(p => {
    const el = document.getElementById(`${p}-contests`);
    if (!el) return;
    const list = contests
      .filter(c => c.platform === p && c.startTime > now - 86400000)
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 3);

    el.innerHTML = list.length
      ? list.map(c => `<div class="mini-contest-item" title="${c.name}">${formatShortDate(c.startTime)} — ${truncate(c.name, 30)}</div>`).join('')
      : `<div class="mini-contest-item">No upcoming contests</div>`;
  });
}

// ── Platform filter buttons ──────────────────────────────────────
document.getElementById('platform-filter').addEventListener('click', (e) => {
  const btn = e.target.closest('.pf-btn');
  if (!btn) return;
  document.querySelectorAll('.pf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.platform;
  renderUpcoming(allContests);
});

// ── Init ─────────────────────────────────────────────────────────
async function init() {
  try {
    allContests = await fetchContests();
    renderNextContest(allContests);
    renderUpcoming(allContests);
    renderPlatformMinis(allContests);
    renderCalendar(allContests, new Date());
    setupCalendarNav(allContests);
  } catch (err) {
    console.error('Error loading contests:', err);
    document.getElementById('upcoming-contests').innerHTML =
      `<div class="loading">Could not load contest data. Check your connection.</div>`;
  }
}

// ── Calendar navigation ──────────────────────────────────────────
let calendarDate = new Date();

function setupCalendarNav(contests) {
  document.getElementById('prev-month').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar(contests, calendarDate);
    updateMonthLabel();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar(contests, calendarDate);
    updateMonthLabel();
  });
}

function updateMonthLabel() {
  document.getElementById('current-month').textContent =
    calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── Helpers ──────────────────────────────────────────────────────
function platformLabel(p) {
  return { leetcode: 'LeetCode', codeforces: 'Codeforces', codechef: 'CodeChef' }[p] || p;
}

function formatDate(ms) {
  return new Date(ms).toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  }) + ' IST';
}

function formatShortDate(ms) {
  return new Date(ms).toLocaleDateString('en-IN', {
    month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata'
  });
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h)      return `${h}h`;
  return `${m}m`;
}

function msToUnits(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60
  };
}

function pad(n) { return String(n).padStart(2, '0'); }
function truncate(str, n) { return str.length > n ? str.slice(0, n) + '…' : str; }

init();
