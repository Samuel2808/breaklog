import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { run } from '../src/app.js';

const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const at = (hour, minute = 0) => new Date(2026, 10, 17, hour, minute).getTime();

let folder;
let file;
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'breaklog-app-'));
  file = join(folder, 'data.json');
});
afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

function breaklog(argv, now, env = {}) {
  let stdout = '';
  let stderr = '';
  const code = run(argv, {
    env: { BREAKLOG_FILE: file, ...env },
    homeDir: folder,
    now,
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

function spawnCli(args, env = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: folder, USERPROFILE: folder, BREAKLOG_FILE: file, ...env },
  });
}

test('R1: the program declares no dependencies', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.dependencies, undefined);
  assert.equal(manifest.devDependencies, undefined);
});

test('R1: one node command runs the program', () => {
  const result = spawnCli(['report']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Work time: 0m/);
});

test('R2: start confirms the task', () => {
  const result = breaklog(['start', 'write spec'], at(9));
  assert.equal(result.code, 0);
  assert.match(result.stdout, /write spec/);
  assert.match(result.stdout, /09:00/);
});

test('R3: stop shows how long the session lasted', () => {
  breaklog(['start', 'write spec'], at(9));
  const result = breaklog(['stop'], at(9, 45));
  assert.equal(result.code, 0);
  assert.match(result.stdout, /write spec/);
  assert.match(result.stdout, /45m/);
});

test('R4: break confirms the recorded length', () => {
  const result = breaklog(['break', '15'], at(9));
  assert.equal(result.code, 0);
  assert.match(result.stdout, /15/);
});

test('R5: report shows work, breaks, and sessions together', () => {
  breaklog(['start', 'write spec'], at(9));
  breaklog(['break', '10'], at(9, 30));
  breaklog(['stop'], at(10));
  const { stdout } = breaklog(['report'], at(11));
  assert.match(stdout, /Work time: 50m/);
  assert.match(stdout, /Breaks: 1 \(10m total\)/);
  assert.match(stdout, /09:00-10:00 {2}50m {2}write spec/);
});

test('R5: report does not create the data file', () => {
  breaklog(['report'], at(9));
  assert.equal(existsSync(file), false);
});

test('R6: stop warns after more than 90 minutes', () => {
  breaklog(['start', 'write spec'], at(9));
  const result = breaklog(['stop'], at(10, 31));
  assert.equal(result.code, 0);
  assert.match(result.stdout, /WARNING/);
});

test('R6: stop does not warn at exactly 90 minutes', () => {
  breaklog(['start', 'write spec'], at(9));
  assert.doesNotMatch(breaklog(['stop'], at(10, 30)).stdout, /WARNING/);
});

test('R6: report warns during a long running session', () => {
  breaklog(['start', 'write spec'], at(9));
  const result = breaklog(['report'], at(10, 31));
  assert.equal(result.code, 0);
  assert.match(result.stdout, /WARNING/);
});

test('R6: report does not warn after a recent break', () => {
  breaklog(['start', 'write spec'], at(9));
  breaklog(['break', '5'], at(10, 30));
  assert.doesNotMatch(breaklog(['report'], at(10, 45)).stdout, /WARNING/);
});

test('R6: BREAKLOG_LIMIT_MINUTES changes the limit', () => {
  breaklog(['start', 'write spec'], at(9));
  const result = breaklog(['report'], at(9, 31), { BREAKLOG_LIMIT_MINUTES: '30' });
  assert.match(result.stdout, /WARNING/);
});

test('R7: history is kept between separate runs', () => {
  assert.equal(spawnCli(['start', 'write spec']).status, 0);
  assert.equal(spawnCli(['stop']).status, 0);
  assert.match(spawnCli(['report']).stdout, /write spec/);
});

test('R7: without BREAKLOG_FILE the history is saved in the home folder', () => {
  const result = spawnCli(['break', '5'], { BREAKLOG_FILE: '' });
  assert.equal(result.status, 0);
  assert.equal(existsSync(join(folder, '.breaklog', 'data.json')), true);
});

test('R8: an unknown command exits with code 1 and a clear message', () => {
  const result = spawnCli(['pause']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^breaklog: Unknown command "pause"/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test('R8: stop with no session started gives a clear error', () => {
  const result = breaklog(['stop'], at(9));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /^breaklog: No session is running/);
  assert.equal(result.stdout, '');
});

test('R8: an invalid break changes nothing', () => {
  const result = breaklog(['break', '-5'], at(9));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /1 to 1440/);
  assert.equal(existsSync(file), false);
});

test('R8: a second start keeps the running session', () => {
  breaklog(['start', 'first'], at(9));
  const result = breaklog(['start', 'second'], at(10));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /first/);
  assert.match(breaklog(['stop'], at(10, 30)).stdout, /first/);
});

test('R8: an invalid limit stops the command before it changes data', () => {
  breaklog(['start', 'write spec'], at(9));
  const result = breaklog(['stop'], at(10), { BREAKLOG_LIMIT_MINUTES: 'soon' });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /BREAKLOG_LIMIT_MINUTES/);
  assert.match(breaklog(['stop'], at(10, 15)).stdout, /write spec/);
});

test('R8: a corrupted data file is reported and never overwritten', () => {
  writeFileSync(file, '{oops');
  const result = breaklog(['start', 'write spec'], at(9));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /corrupted/);
  assert.equal(readFileSync(file, 'utf8'), '{oops');
});
