import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { BreaklogError } from '../src/errors.js';
import { parseData, readDataFile, resolveDataPath, serializeData, writeDataFile } from '../src/store.js';

const START = '2026-11-17T15:00:00.000Z';
const END = '2026-11-17T16:00:00.000Z';
const validData = () => ({
  version: 1,
  sessions: [{ id: 1, task: 'write spec', start: START, end: END, durationMs: 3600000 }],
  breaks: [{ minutes: 10, end: END, sessionId: 1 }],
});

let folder;
beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'breaklog-store-'));
});
afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

const isClearError = (pattern) => (error) => error instanceof BreaklogError && pattern.test(error.message);

test('R7: the default file is in the home folder', () => {
  assert.equal(resolveDataPath({}, '/home/sam'), join('/home/sam', '.breaklog', 'data.json'));
});

test('R7: BREAKLOG_FILE selects another file', () => {
  assert.equal(resolveDataPath({ BREAKLOG_FILE: '/tmp/log.json' }, '/home/sam'), '/tmp/log.json');
});

test('R7: serialized data parses back to the same history', () => {
  assert.deepEqual(parseData(serializeData(validData()), 'log.json'), validData());
});

test('R7: a missing file is an empty history', () => {
  assert.deepEqual(readDataFile(join(folder, 'missing.json')), { version: 1, sessions: [], breaks: [] });
});

test('R7: a saved file can be read back', () => {
  const file = join(folder, 'log.json');
  writeDataFile(file, validData());
  assert.deepEqual(readDataFile(file), validData());
});

test('R7: saving creates missing folders', () => {
  const file = join(folder, 'new', 'nested', 'log.json');
  writeDataFile(file, validData());
  assert.deepEqual(readDataFile(file), validData());
});

test('R7: saving leaves no temporary files behind', async () => {
  writeDataFile(join(folder, 'log.json'), validData());
  assert.deepEqual(await readdir(folder), ['log.json']);
});

const corrupted = {
  'text that is not JSON': '{oops',
  'an empty file': '',
  'a JSON array': '[]',
  'an unknown version': JSON.stringify({ ...validData(), version: 2 }),
  'missing sessions': JSON.stringify({ version: 1, breaks: [] }),
  'a session without a task': JSON.stringify({
    ...validData(),
    sessions: [{ id: 1, start: START, end: END, durationMs: 1 }],
  }),
  'a session with an invalid start': JSON.stringify({
    ...validData(),
    sessions: [{ id: 1, task: 'a', start: 'soon', end: END, durationMs: 1 }],
  }),
  'a session ending before it starts': JSON.stringify({
    ...validData(),
    sessions: [{ id: 1, task: 'a', start: END, end: START, durationMs: 1 }],
  }),
  'duplicate session ids': JSON.stringify({
    ...validData(),
    sessions: [validData().sessions[0], validData().sessions[0]],
  }),
  'two running sessions': JSON.stringify({
    version: 1,
    breaks: [],
    sessions: [
      { id: 1, task: 'a', start: START, end: null, durationMs: null },
      { id: 2, task: 'b', start: START, end: null, durationMs: null },
    ],
  }),
  'a break with invalid minutes': JSON.stringify({
    ...validData(),
    breaks: [{ minutes: 0, end: END, sessionId: 1 }],
  }),
  'a break linked to an unknown session': JSON.stringify({
    ...validData(),
    breaks: [{ minutes: 5, end: END, sessionId: 9 }],
  }),
};

for (const [name, text] of Object.entries(corrupted)) {
  test(`R8: ${name} is reported as a corrupted file`, () => {
    assert.throws(() => parseData(text, 'log.json'), isClearError(/log\.json.*corrupted|corrupted.*log\.json/));
  });
}

test('R8: reading a corrupted file leaves it unchanged', async () => {
  const file = join(folder, 'log.json');
  await writeFile(file, '{oops');
  assert.throws(() => readDataFile(file), isClearError(/corrupted/));
  assert.equal(await readFile(file, 'utf8'), '{oops');
});

test('R8: a path that cannot be read gives a clear error', async () => {
  const path = join(folder, 'a-folder');
  await mkdir(path);
  assert.throws(() => readDataFile(path), isClearError(/Cannot read/));
});

test('R8: a path that cannot be written gives a clear error', async () => {
  const blocker = join(folder, 'file');
  await writeFile(blocker, 'x');
  assert.throws(() => writeDataFile(join(blocker, 'log.json'), validData()), isClearError(/Cannot save/));
});
