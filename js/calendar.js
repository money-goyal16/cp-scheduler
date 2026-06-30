// ===========================
// calendar.js — CP Scheduler
// Monthly calendar renderer
// ===========================

export function renderCalendar(contests, date) {
  const calEl = document.getElementById('calendar');
  const monthLabel = document.getElementById('current-month');
  if (!calEl) return;

  const year = date.getFullYear();
  const month = date.getMonth();

  if (monthLabel) {
    monthLabel.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();
  const today = new Date();

  // Build contest lookup by date string "YYYY-MM-DD"
  const contestMap = {};
  contests.forEach(c => {
    const d = new Date(c.startTime);
    // Convert to IST (UTC+5:30)
    const ist = new Date(c.startTime + 5.5 * 3600000);
    const key = `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
    if (!contestMap[key]) contestMap[key] = [];
    contestMap[key].push(c);
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let html = `
    <div class="calendar-header">
      ${days.map(d => `<div class="calendar-header-cell">${d}</div>`).join('')}
    </div>
    <div class="calendar-grid">`;

  // Prev month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = 0; i < startOffset; i++) {
    const dayNum = prevMonthDays - startOffset + 1 + i;
    html += `<div class="calendar-cell other-month"><div class="day-num">${dayNum}</div></div>`;
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
    const cellContests = contestMap[dateKey] || [];
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const hasEvents = cellContests.length > 0;

    html += `<div class="calendar-cell${isToday ? ' today' : ''}${hasEvents ? ' has-events' : ''}">
      <div class="day-num">${day}</div>
      <div class="calendar-events">
        ${cellContests.slice(0, 3).map(c =>
      `<div class="calendar-event ${c.platform}" title="${c.name} — ${formatTime(c.startTime)}">${platformShort(c.platform)}</div>`
    ).join('')}
        ${cellContests.length > 3 ? `<div class="calendar-event" style="background:var(--bg);color:var(--text-muted)">+${cellContests.length - 3} more</div>` : ''}
      </div>
    </div>`;
  }

  // Next month padding (fill remaining cells to complete grid)
  const totalCells = startOffset + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="calendar-cell other-month"><div class="day-num">${i}</div></div>`;
  }

  html += `</div>`;
  calEl.innerHTML = html;
}

function platformShort(p) {
  return { leetcode: 'LC', codeforces: 'CF', codechef: 'CC' }[p] || p.slice(0, 2).toUpperCase();
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  }) + ' IST';
}

function pad(n) { return String(n).padStart(2, '0'); }
