import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, formatReport, formatWarning } from '../src/format.js';

const MINUTE = 60000;
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute).getTime();

const summary = (overrides = {}) => ({
  dayStart: at(17, 0),
  workMs: 125 * MINUTE,
  breakCount: 2,
  breakMinutes: 20,
  sessions: [
    { task: 'write spec', start: at(17, 9), end: at(17, 10, 30), running: false, workMs: 90 * MINUTE },
    { task: 'fix bug', start: at(17, 11), end: null, running: true, workMs: 35 * MINUTE },
  ],
  ...overrides,
});

test('R5: durations under an hour show minutes', () => {
  assert.equal(formatDuration(25 * MINUTE), '25m');
});

test('R5: durations of an hour or more show hours and minutes', () => {
  assert.equal(formatDuration(125 * MINUTE), '2h 5m');
});

test('R5: partial minutes round down', () => {
  assert.equal(formatDuration(MINUTE - 1), '0m');
});

test('R5: the report shows the date and total work time', () => {
  const report = formatReport(summary(), at(17, 11, 35));
  assert.match(report, /2026-11-17/);
  assert.match(report, /Work time: 2h 5m/);
});

test('R5: the report shows the number and total length of breaks', () => {
  assert.match(formatReport(summary(), at(17, 11, 35)), /Breaks: 2 \(20m total\)/);
});

test('R5: the report lists a finished session', () => {
  assert.match(formatReport(summary(), at(17, 11, 35)), /09:00-10:30 {2}1h 30m {2}write spec/);
});

test('R5: the report marks a running session', () => {
  assert.match(formatReport(summary(), at(17, 11, 35)), /11:00-now {2}35m {2}fix bug \(running\)/);
});

test('R5: the report shows the date of a session started on an earlier day', () => {
  const sessions = [{ task: 'late', start: at(16, 23), end: at(17, 1), running: false, workMs: 60 * MINUTE }];
  assert.match(formatReport(summary({ sessions }), at(17, 12)), /2026-11-16 23:00-01:00/);
});

test('R5: the report says when there are no sessions', () => {
  assert.match(formatReport(summary({ sessions: [] }), at(17, 12)), /Sessions: none/);
});

test('R6: the warning shows the stretch and tells the user to take a break', () => {
  const warning = formatWarning(95 * MINUTE, 90);
  assert.match(warning, /WARNING/);
  assert.match(warning, /1h 35m/);
  assert.match(warning, /90 minutes/);
  assert.match(warning, /[Tt]ake a break/);
});
