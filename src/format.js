const pad = (value) => String(value).padStart(2, '0');

function formatDate(ms) {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Formats a local time of day as HH:MM. */
export function formatClock(ms) {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Formats milliseconds as whole minutes, such as "25m" or "2h 5m". */
export function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatSession(session, today) {
  const startDate = formatDate(session.start);
  const start = startDate === today ? formatClock(session.start) : `${startDate} ${formatClock(session.start)}`;
  const end = session.running ? 'now' : formatClock(session.end);
  const suffix = session.running ? ' (running)' : '';
  return `  ${start}-${end}  ${formatDuration(session.workMs)}  ${session.task}${suffix}`;
}

/** Builds the text shown by the report command. */
export function formatReport(summary, now) {
  const today = formatDate(now);
  const lines = [
    `Report for ${today}`,
    `Work time: ${formatDuration(summary.workMs)}`,
    `Breaks: ${summary.breakCount} (${formatDuration(summary.breakMinutes * 60000)} total)`,
  ];
  if (summary.sessions.length === 0) {
    lines.push('Sessions: none');
  } else {
    lines.push('Sessions:', ...summary.sessions.map((session) => formatSession(session, today)));
  }
  return lines.join('\n');
}

/** Builds the long-stretch warning. */
export function formatWarning(stretch, limitMinutes) {
  return `WARNING: You have worked ${formatDuration(stretch)} without a break (limit: ${limitMinutes} minutes). Take a break and step away from the screen.`;
}
