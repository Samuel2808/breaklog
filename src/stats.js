const MINUTE_MS = 60000;

/** Removes up to `amount` of work, walking backward from the end of a break. */
function removeWorkBefore(intervals, breakEnd, amount) {
  let remaining = amount;
  const kept = [];
  for (let i = intervals.length - 1; i >= 0; i -= 1) {
    const [from, to] = intervals[i];
    const cut = Math.min(to, breakEnd);
    const removed = Math.min(remaining, Math.max(0, cut - from));
    remaining -= removed;
    if (to > cut) {
      kept.unshift([Math.max(cut, from), to]);
    }
    if (cut - removed > from) {
      kept.unshift([from, cut - removed]);
    }
  }
  return kept;
}

/** Returns the [from, to] periods of a session that count as work. */
function workIntervals(session, breaks, now) {
  const start = Date.parse(session.start);
  const end = session.end === null ? now : Date.parse(session.end);
  if (end <= start) {
    return [];
  }
  return breaks
    .filter((entry) => entry.sessionId === session.id)
    .map((entry) => ({ end: Date.parse(entry.end), amount: entry.minutes * MINUTE_MS }))
    .sort((a, b) => a.end - b.end)
    .reduce((intervals, entry) => removeWorkBefore(intervals, entry.end, entry.amount), [[start, end]]);
}

function overlapMs(intervals, from, to) {
  return intervals.reduce(
    (total, [start, end]) => total + Math.max(0, Math.min(end, to) - Math.max(start, from)),
    0,
  );
}

function dayBounds(now) {
  const date = new Date(now);
  const [year, month, day] = [date.getFullYear(), date.getMonth(), date.getDate()];
  return { start: new Date(year, month, day).getTime(), end: new Date(year, month, day + 1).getTime() };
}

/** Returns a session's total work time in milliseconds. */
export function workedMs(session, breaks, now) {
  return overlapMs(workIntervals(session, breaks, now), -Infinity, Infinity);
}

/** Returns the work time since the latest break or local midnight. */
export function stretchMs(data, now) {
  const latestBreak = data.breaks
    .map((entry) => Date.parse(entry.end))
    .filter((end) => end <= now)
    .reduce((latest, end) => Math.max(latest, end), -Infinity);
  const from = Math.max(dayBounds(now).start, latestBreak);
  return data.sessions.reduce(
    (total, session) => total + overlapMs(workIntervals(session, data.breaks, now), from, now),
    0,
  );
}

/** Tells whether a stretch is strictly longer than the limit in minutes. */
export function isLongStretch(stretch, limitMinutes) {
  return stretch > limitMinutes * MINUTE_MS;
}

/** Adds up the local calendar day that contains `now`. */
export function summarizeDay(data, now) {
  const { start, end } = dayBounds(now);
  const sessions = data.sessions
    .filter((session) => {
      const sessionStart = Date.parse(session.start);
      const sessionEnd = session.end === null ? now : Date.parse(session.end);
      return sessionStart < end && (sessionEnd > start || sessionStart >= start);
    })
    .map((session) => ({
      task: session.task,
      start: Date.parse(session.start),
      end: session.end === null ? null : Date.parse(session.end),
      running: session.end === null,
      workMs: overlapMs(workIntervals(session, data.breaks, now), start, end),
    }));
  const breaks = data.breaks.filter((entry) => {
    const breakEnd = Date.parse(entry.end);
    return breakEnd >= start && breakEnd < end;
  });
  return {
    dayStart: start,
    workMs: sessions.reduce((total, session) => total + session.workMs, 0),
    breakCount: breaks.length,
    breakMinutes: breaks.reduce((total, entry) => total + entry.minutes, 0),
    sessions,
  };
}
