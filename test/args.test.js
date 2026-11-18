import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs, parseLimit } from '../src/args.js';
import { BreaklogError } from '../src/errors.js';

const rejects = (fn, pattern) =>
  assert.throws(fn, (error) => error instanceof BreaklogError && pattern.test(error.message));

test('R2: start returns the task', () => {
  assert.deepEqual(parseArgs(['start', 'write spec']), { command: 'start', task: 'write spec' });
});

test('R2: start removes spaces around the task', () => {
  assert.equal(parseArgs(['start', '  write spec ']).task, 'write spec');
});

test('R3: stop takes no arguments', () => {
  assert.deepEqual(parseArgs(['stop']), { command: 'stop' });
});

test('R4: break returns whole minutes', () => {
  assert.deepEqual(parseArgs(['break', '15']), { command: 'break', minutes: 15 });
});

test('R4: break accepts the smallest and largest lengths', () => {
  assert.equal(parseArgs(['break', '1']).minutes, 1);
  assert.equal(parseArgs(['break', '1440']).minutes, 1440);
});

test('R5: report takes no arguments', () => {
  assert.deepEqual(parseArgs(['report']), { command: 'report' });
});

test('R6: the limit defaults to 90 minutes', () => {
  assert.equal(parseLimit(undefined), 90);
  assert.equal(parseLimit(''), 90);
});

test('R6: the limit can be set to a positive whole number', () => {
  assert.equal(parseLimit('45'), 45);
});

for (const value of ['0', '-5', '1.5', 'abc']) {
  test(`R8: the limit rejects ${value}`, () => {
    rejects(() => parseLimit(value), /BREAKLOG_LIMIT_MINUTES/);
  });
}

test('R8: no command is an error that shows usage', () => {
  rejects(() => parseArgs([]), /Usage:/);
});

test('R8: an unknown command is named in the error', () => {
  rejects(() => parseArgs(['pause']), /Unknown command "pause"/);
});

test('R8: start without a task is an error', () => {
  rejects(() => parseArgs(['start']), /task/i);
});

test('R8: start with a blank task is an error', () => {
  rejects(() => parseArgs(['start', '   ']), /task/i);
});

test('R8: start with an unquoted task is an error', () => {
  rejects(() => parseArgs(['start', 'fix', 'bug']), /quotes/i);
});

test('R8: stop with extra arguments is an error', () => {
  rejects(() => parseArgs(['stop', 'now']), /stop/);
});

test('R8: report with extra arguments is an error', () => {
  rejects(() => parseArgs(['report', 'today']), /report/);
});

test('R8: break without minutes is an error', () => {
  rejects(() => parseArgs(['break']), /minutes/i);
});

test('R8: break with extra arguments is an error', () => {
  rejects(() => parseArgs(['break', '5', '10']), /minutes/i);
});

for (const value of ['0', '-5', '1.5', 'abc', '+5', '1e2', '1441', '']) {
  test(`R8: break rejects the length "${value}"`, () => {
    rejects(() => parseArgs(['break', value]), /1 to 1440/);
  });
}
