// ===========================
// hackathons.js — CP Scheduler
// Event storage (now backend API instead of localStorage)
// ===========================

import { API_BASE, authHeaders, isLoggedIn } from './auth.js';

// Fetch all events for the logged-in user from the backend
export async function getEvents() {
  if (!isLoggedIn()) return []; // not logged in -> no events to show

  try {
    const res = await fetch(`${API_BASE}/events`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) return [];
    const events = await res.json();
    // backend sends "_id", frontend code expects "id" — map it so existing UI code still works
    return events.map(e => ({ ...e, id: e._id }));
  } catch {
    return [];
  }
}

// Save a new event to the backend
export async function saveEvent(event) {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to save event');
  }

  const saved = await res.json();
  return { ...saved, id: saved._id };
}

// Delete an event from the backend
export async function deleteEvent(id) {
  await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
}

// Stats are still calculated on the frontend from whatever events we fetched
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
