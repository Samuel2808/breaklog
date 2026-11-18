import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLongStretch, stretchMs, summarizeDay, workedMs } from '../src/stats.js';

const MINUTE = 60000;
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute).getTime();
const iso = (ms) => new Date(ms).toISOString();

const session = (id, start, end, task = `task ${id}`) => ({
  id,
  task,
  start: iso(start),
  end: end === null ? null : iso(end),
  durationMs: null,
});
const pause = (minutes, end, sessionId = null) => ({ minutes, end: iso(end), sessionId });
const log = (sessions, breaks = []) => ({ version: 1, sessions, breaks });

test('R3: work time is the elapsed time without breaks', () => {
  const one = session(1, at(17, 9), at(17, 10));
  assert.equal(workedMs(one, [pause(15, at(17, 9, 30), 1)], at(17, 10)), 45 * MINUTE);
});

test('R4: two breaks recorded together subtract both lengths', () => {
  const one = session(1, at(17, 9), at(17, 10));
  const breaks = [pause(10, at(17, 9, 50), 1), pause(10, at(17, 9, 50), 1)];
  assert.equal(workedMs(one, breaks, at(17, 10)), 40 * MINUTE);
});

test('R4: a break longer than the session stops at the session start', () => {
  const one = session(1, at(17, 9), at(17, 9, 30));
  assert.equal(workedMs(one, [pause(10, at(17, 9, 5), 1)], at(17, 9, 30)), 25 * MINUTE);
});

test('R4: a break from another session does not change this session', () => {
  const one = session(1, at(17, 9), at(17, 10));
  assert.equal(workedMs(one, [pause(15, at(17, 9, 30), 2)], at(17, 10)), 60 * MINUTE);
});

test('R5: the summary adds up work time across sessions', () => {
  const data = log([session(1, at(17, 9), at(17, 10)), session(2, at(17, 11), at(17, 11, 30))]);
  assert.equal(summarizeDay(data, at(17, 12)).workMs, 90 * MINUTE);
});

test('R5: the summary counts and totals today\'s breaks', () => {
  const data = log([], [pause(10, at(17, 9)), pause(5, at(17, 10)), pause(30, at(16, 10))]);
  const summary = summarizeDay(data, at(17, 12));
  assert.equal(summary.breakCount, 2);
  assert.equal(summary.breakMinutes, 15);
});

test('R5: the summary lists today\'s sessions only', () => {
  const data = log([session(1, at(16, 9), at(16, 10)), session(2, at(17, 9), at(17, 10), 'today')]);
  assert.deepEqual(summarizeDay(data, at(17, 12)).sessions.map((s) => s.task), ['today']);
});

test('R5: a running session counts up to now and is marked as running', () => {
  const data = log([session(1, at(17, 9), null)]);
  const summary = summarizeDay(data, at(17, 9, 40));
  assert.equal(summary.workMs, 40 * MINUTE);
  assert.equal(summary.sessions[0].running, true);
});

test('R5: a session crossing midnight counts only today\'s part', () => {
  const data = log([session(1, at(16, 23), at(17, 1))]);
  const summary = summarizeDay(data, at(17, 12));
  assert.equal(summary.workMs, 60 * MINUTE);
  assert.equal(summary.sessions[0].workMs, 60 * MINUTE);
});

test('R5: a session crossing midnight counts only its part of the earlier day', () => {
  const data = log([session(1, at(16, 23), at(17, 1))]);
  assert.equal(summarizeDay(data, at(16, 23, 59)).workMs, 60 * MINUTE);
});

test('R5: a session ending exactly at midnight is not listed for the new day', () => {
  const data = log([session(1, at(16, 23), at(17, 0))]);
  assert.deepEqual(summarizeDay(data, at(17, 12)).sessions, []);
});

test('R6: the stretch adds work across sessions without a break', () => {
  const data = log([session(1, at(17, 9), at(17, 10)), session(2, at(17, 11), at(17, 11, 45))]);
  assert.equal(stretchMs(data, at(17, 12)), 105 * MINUTE);
});

test('R6: time between sessions does not count as work', () => {
  const data = log([session(1, at(17, 9), at(17, 9, 30)), session(2, at(17, 12), at(17, 12, 30))]);
  assert.equal(stretchMs(data, at(17, 13)), 60 * MINUTE);
});

test('R6: a recorded break resets the stretch', () => {
  const data = log([session(1, at(17, 9), null)], [pause(1, at(17, 11), 1)]);
  assert.equal(stretchMs(data, at(17, 11, 20)), 20 * MINUTE);
});

test('R6: a break with no running session resets the stretch', () => {
  const data = log(
    [session(1, at(17, 9), at(17, 11)), session(2, at(17, 11, 30), at(17, 12))],
    [pause(5, at(17, 11, 10))],
  );
  assert.equal(stretchMs(data, at(17, 12)), 30 * MINUTE);
});

test('R6: the stretch resets at local midnight', () => {
  const data = log([session(1, at(16, 22), null)]);
  assert.equal(stretchMs(data, at(17, 0, 30)), 30 * MINUTE);
});

test('R6: exactly the limit is not a long stretch', () => {
  assert.equal(isLongStretch(90 * MINUTE, 90), false);
});

test('R6: just over the limit is a long stretch', () => {
  assert.equal(isLongStretch(90 * MINUTE + 1, 90), true);
});
