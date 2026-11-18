import { BreaklogError } from './errors.js';
import { workedMs } from './stats.js';

/** Returns the history used before the first save. */
export function emptyData() {
  return { version: 1, sessions: [], breaks: [] };
}

function runningSession(data) {
  return data.sessions.find((session) => session.end === null);
}

/** Returns new data with a running session for the task. */
export function startSession(data, task, now) {
  const running = runningSession(data);
  if (running) {
    throw new BreaklogError(`A session is already running: "${running.task}". Stop it first with: breaklog stop`);
  }
  const id = data.sessions.reduce((highest, session) => Math.max(highest, session.id), 0) + 1;
  const session = { id, task, start: new Date(now).toISOString(), end: null, durationMs: null };
  return { ...data, sessions: [...data.sessions, session] };
}

/** Returns new data with the running session ended, plus that session. */
export function stopSession(data, now) {
  const running = runningSession(data);
  if (!running) {
    throw new BreaklogError('No session is running. Start one with: breaklog start "<task>"');
  }
  const endMs = Math.max(now, Date.parse(running.start));
  const ended = { ...running, end: new Date(endMs).toISOString() };
  const session = { ...ended, durationMs: workedMs(ended, data.breaks, endMs) };
  const sessions = data.sessions.map((entry) => (entry.id === session.id ? session : entry));
  return { data: { ...data, sessions }, session };
}

/** Returns new data with a break that ended at `now`. */
export function addBreak(data, minutes, now) {
  const running = runningSession(data);
  const entry = { minutes, end: new Date(now).toISOString(), sessionId: running ? running.id : null };
  return { ...data, breaks: [...data.breaks, entry] };
}
