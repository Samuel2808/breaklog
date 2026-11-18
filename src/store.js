import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { BreaklogError } from './errors.js';
import { emptyData } from './tracker.js';

const isDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isId = (value) => Number.isSafeInteger(value) && value > 0;

function isValidSession(session) {
  if (session === null || typeof session !== 'object') {
    return false;
  }
  const { id, task, start, end, durationMs } = session;
  if (!isId(id) || typeof task !== 'string' || task.trim() === '' || !isDate(start)) {
    return false;
  }
  if (end === null) {
    return durationMs === null;
  }
  return isDate(end) && Date.parse(end) >= Date.parse(start) && Number.isFinite(durationMs) && durationMs >= 0;
}

function isValidBreak(entry, sessionIds) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    Number.isSafeInteger(entry.minutes) &&
    entry.minutes > 0 &&
    isDate(entry.end) &&
    (entry.sessionId === null || sessionIds.has(entry.sessionId))
  );
}

function isValidData(data) {
  if (data === null || typeof data !== 'object' || data.version !== 1) {
    return false;
  }
  if (!Array.isArray(data.sessions) || !Array.isArray(data.breaks) || !data.sessions.every(isValidSession)) {
    return false;
  }
  const sessionIds = new Set(data.sessions.map((session) => session.id));
  const runningCount = data.sessions.filter((session) => session.end === null).length;
  return (
    sessionIds.size === data.sessions.length &&
    runningCount <= 1 &&
    data.breaks.every((entry) => isValidBreak(entry, sessionIds))
  );
}

/** Chooses the data file from the environment and home folder. */
export function resolveDataPath(env, homeDir) {
  return env.BREAKLOG_FILE ? resolve(env.BREAKLOG_FILE) : join(homeDir, '.breaklog', 'data.json');
}

/** Turns saved text into validated data. */
export function parseData(text, path) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!isValidData(data)) {
    throw new BreaklogError(`The data file ${path} is corrupted. Fix or move it, then try again.`);
  }
  return data;
}

/** Turns data into the text saved in the data file. */
export function serializeData(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

/** Reads the history, treating a missing file as an empty history. */
export function readDataFile(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return emptyData();
    }
    throw new BreaklogError(`Cannot read the data file ${path}: ${error.message}`);
  }
  return parseData(text, path);
}

/** Saves the history by replacing the file in one step. */
export function writeDataFile(path, data) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temporaryPath, serializeData(data));
    renameSync(temporaryPath, path);
  } catch (error) {
    removeIfPossible(temporaryPath);
    throw new BreaklogError(`Cannot save the data file ${path}: ${error.message}`);
  }
}

/** Cleans up after a failed save without hiding the original problem. */
function removeIfPossible(path) {
  try {
    rmSync(path, { force: true });
  } catch {
    // The save error is the one the user needs to see.
  }
}
