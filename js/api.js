// ===========================
// api.js — CP Scheduler
// Contest data fetching
// ===========================

/**
 * Fetch all contests from available sources.
 * - Codeforces: live API (CORS-friendly)
 * - LeetCode, CodeChef, GFG: rule-based generation
 *   (their APIs require proxies/auth — we generate the schedule)
 */
export async function fetchContests() {
  const [cfContests, lcContests, ccContests] = await Promise.all([
    fetchCodeforces(),
    generateLeetCode(),
    generateCodeChef(),

  ]);
  return [...cfContests, ...lcContests, ...ccContests,];
}

// ── Codeforces (public API, no auth) ────────────────────────────
async function fetchCodeforces() {
  try {
    const res = await fetch('https://codeforces.com/api/contest.list?gym=false');
    const data = await res.json();
    if (data.status !== 'OK') return [];

    const now = Date.now();
    return data.result
      .filter(c => {
        const start = c.startTimeSeconds * 1000;
        return (c.phase === 'BEFORE' || c.phase === 'CODING') &&
          start > now - 86400000 &&
          start < now + 30 * 86400000;
      })
      .map(c => ({
        id: `cf-${c.id}`,
        platform: 'codeforces',
        name: c.name,
        startTime: c.startTimeSeconds * 1000,
        duration: c.durationSeconds,
        url: `https://codeforces.com/contest/${c.id}`,
      }))
      .slice(0, 15);
  } catch {
    return generateCodeforcesFallback();
  }
}

// Fallback if CF API is blocked
function generateCodeforcesFallback() {
  const contests = [];
  const now = Date.now();
  for (let i = 1; i <= 5; i++) {
    const start = now + i * 5 * 86400000;
    contests.push({
      id: `cf-fallback-${i}`,
      platform: 'codeforces',
      name: `Codeforces Round (Div. ${i % 2 === 0 ? 2 : 3}) #${900 + i}`,
      startTime: snapTo(start, 19, 35), // 7:35 PM UTC typical CF time
      duration: 7200,
      url: 'https://codeforces.com/contests',
    });
  }
  return contests;
}

// ── LeetCode (rule-based) ─────────────────────────────────────────
async function generateLeetCode() {
  const contests = [];
  const now = Date.now();
  let weekNum = getWeekNumber(new Date());

  // Generate 6 weeks forward
  for (let i = 0; i < 6; i++) {
    const targetWeek = weekNum + i;
    const sunday = getSundayOfWeek(targetWeek);

    // Weekly — every Sunday 8:00 AM IST = 2:30 AM UTC
    const weekly = new Date(sunday);
    weekly.setUTCHours(2, 30, 0, 0);
    if (weekly.getTime() > now - 86400000) {
      contests.push({
        id: `lc-weekly-${targetWeek}`,
        platform: 'leetcode',
        name: `LeetCode Weekly Contest ${targetWeek}`,
        startTime: weekly.getTime(),
        duration: 5400,
        url: 'https://leetcode.com/contest/',
      });
    }

    // Biweekly — alternate Saturdays 8:00 PM IST = 14:30 UTC
    const biweeklyNum = Math.floor(targetWeek / 2);
    if (targetWeek % 2 === 0) {
      const saturday = new Date(sunday);
      saturday.setDate(saturday.getDate() - 1); // Saturday before Sunday
      saturday.setUTCHours(14, 30, 0, 0);
      if (saturday.getTime() > now - 86400000) {
        contests.push({
          id: `lc-biweekly-${biweeklyNum}`,
          platform: 'leetcode',
          name: `LeetCode Biweekly Contest ${biweeklyNum}`,
          startTime: saturday.getTime(),
          duration: 5400,
          url: 'https://leetcode.com/contest/',
        });
      }
    }
  }
  return contests;
}

// ── CodeChef (rule-based) ─────────────────────────────────────────
async function generateCodeChef() {
  const contests = [];
  const now = new Date();
  const starters = ['Starters', 'Starters', 'Starters', 'Starters'];

  for (let week = 0; week < 6; week++) {
    // Wednesday 8:00 PM IST = 14:30 UTC
    const d = new Date();
    d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7) + week * 7);
    d.setUTCHours(14, 30, 0, 0);

    if (d.getTime() > Date.now() - 86400000) {
      const num = 170 + Math.floor((d - new Date(2024, 0, 3)) / (7 * 86400000));
      contests.push({
        id: `cc-starters-${num}`,
        platform: 'codechef',
        name: `CodeChef ${starters[week % 4]} ${num}`,
        startTime: d.getTime(),
        duration: 7200,
        url: 'https://www.codechef.com/contests',
      });
    }
  }
  return contests;
}

// ── GFG (rule-based) ──────────────────────────────────────────────
// async function generateGFG() {
//   const contests = [];
//   const now = Date.now();
//   let weekNum = getWeekNumber(new Date());

//   for (let i = 0; i < 6; i++) {
//     const targetWeek = weekNum + i;
//     const sunday = getSundayOfWeek(targetWeek);

//     // GFG — Sunday 7:00 PM IST = 13:30 UTC
//     const start = new Date(sunday);
//     start.setUTCHours(13, 30, 0, 0);

//     if (start.getTime() > now - 86400000) {
//       contests.push({
//         id: `gfg-weekly-${targetWeek}`,
//         platform: 'gfg',
//         name: `GFG Weekly Coding Contest #${targetWeek % 200 + 100}`,
//         startTime: start.getTime(),
//         duration: 7200,
//         url: 'https://www.geeksforgeeks.org/events/rec/gfg-weekly-coding-contest',
//       });
//     }
//   }
//   return contests;
// }

// ── Helpers ───────────────────────────────────────────────────────
function getWeekNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date - start) / 86400000 + start.getDay() + 1) / 7) + date.getFullYear() * 100;
}

function getSundayOfWeek(weekNum) {
  const year = Math.floor(weekNum / 100);
  const week = weekNum % 100;
  const jan1 = new Date(year, 0, 1);
  const dayOffset = (7 - jan1.getDay()) % 7;
  const firstSunday = new Date(jan1);
  firstSunday.setDate(jan1.getDate() + dayOffset);
  firstSunday.setDate(firstSunday.getDate() + (week - 1) * 7);
  return firstSunday;
}

function snapTo(ms, utcHour, utcMin) {
  const d = new Date(ms);
  d.setUTCHours(utcHour, utcMin, 0, 0);
  return d.getTime();
}
