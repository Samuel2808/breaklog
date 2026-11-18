#!/usr/bin/env node
import { homedir } from 'node:os';
import { run } from './app.js';

process.exitCode = run(process.argv.slice(2), {
  env: process.env,
  homeDir: homedir(),
  now: Date.now(),
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
});
