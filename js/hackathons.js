// ===========================
// hackathons.js — CP Scheduler
// Event storage (localStorage)
// ===========================

const STORAGE_KEY = 'cp-scheduler-events';

export function getEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveEvent(event) {
  const events = getEvents();
  event.id = event.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  events.push(event);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  return event;
}

export function deleteEvent(id) {
  const events = getEvents().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function getStats(events) {
  const now = Date.now();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  const total = events.length;
  const upcoming = events.filter(e => new Date(e.startDate).getTime() > now).length;
  const thisMonth = events.filter(e => {
    const t = new Date(e.startDate).getTime();
    return t >= startOfMonth.getTime() && t < endOfMonth.getTime();
  }).length;

  let totalPrize = 0;
  events.forEach(e => {
    if (e.prize) {
      const match = e.prize.replace(/,/g, '').match(/[\d.]+/);
      if (match) totalPrize += parseFloat(match[0]);
    }
  });

  return { total, upcoming, thisMonth, totalPrize };
}
