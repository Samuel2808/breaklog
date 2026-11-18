import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BreaklogError } from '../src/errors.js';
import { addBreak, emptyData, startSession, stopSession } from '../src/tracker.js';

const at = (hour, minute = 0) => new Date(2026, 10, 17, hour, minute).getTime();
const iso = (ms) => new Date(ms).toISOString();

test('R2: start records the task and start time', () => {
  const data = startSession(emptyData(), 'write spec', at(9));
  assert.deepEqual(data.sessions, [
    { id: 1, task: 'write spec', start: iso(at(9)), end: null, durationMs: null },
  ]);
});

test('R2: start leaves the earlier data unchanged', () => {
  const before = emptyData();
  startSession(before, 'write spec', at(9));
  assert.deepEqual(before.sessions, []);
});

test('R2: each new session gets the next id', () => {
  let data = startSession(emptyData(), 'first', at(9));
  data = stopSession(data, at(10)).data;
  data = startSession(data, 'second', at(11));
  assert.equal(data.sessions[1].id, 2);
});

test('R2: start fails and names the task when a session is running', () => {
  const data = startSession(emptyData(), 'write spec', at(9));
  assert.throws(
    () => startSession(data, 'other', at(10)),
    (error) => error instanceof BreaklogError && /write spec/.test(error.message),
  );
});

test('R3: stop records the end time and elapsed length', () => {
  const data = startSession(emptyData(), 'write spec', at(9));
  const { data: stopped, session } = stopSession(data, at(10, 30));
  assert.equal(stopped.sessions[0].end, iso(at(10, 30)));
  assert.equal(stopped.sessions[0].durationMs, 90 * 60000);
  assert.equal(session.task, 'write spec');
});

test('R3: stop subtracts breaks recorded during the session', () => {
  let data = startSession(emptyData(), 'write spec', at(9));
  data = addBreak(data, 10, at(10));
  assert.equal(stopSession(data, at(10, 30)).session.durationMs, 80 * 60000);
});

test('R3: stop never records a negative length', () => {
  let data = startSession(emptyData(), 'write spec', at(9));
  data = addBreak(data, 30, at(9, 10));
  assert.equal(stopSession(data, at(9, 10)).session.durationMs, 0);
});

test('R8: stop fails when no session is running', () => {
  assert.throws(
    () => stopSession(emptyData(), at(9)),
    (error) => error instanceof BreaklogError && /No session is running/.test(error.message),
  );
});

test('R4: a break during a session is linked to that session', () => {
  let data = startSession(emptyData(), 'write spec', at(9));
  data = addBreak(data, 10, at(10));
  assert.deepEqual(data.breaks, [{ minutes: 10, end: iso(at(10)), sessionId: 1 }]);
});

test('R4: a break with no running session is not linked to a session', () => {
  let data = startSession(emptyData(), 'write spec', at(9));
  data = stopSession(data, at(10)).data;
  data = addBreak(data, 10, at(10, 5));
  assert.equal(data.breaks[0].sessionId, null);
  assert.equal(data.sessions[0].durationMs, 60 * 60000);
});
