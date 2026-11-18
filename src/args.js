import { BreaklogError } from './errors.js';

export const DEFAULT_LIMIT_MINUTES = 90;
const MAX_BREAK_MINUTES = 1440;

const USAGE = `Usage:
  breaklog start "<task>"
  breaklog stop
  breaklog break <minutes>
  breaklog report`;

function parseStart(args) {
  if (args.length === 0) {
    throw new BreaklogError('Missing task. Usage: breaklog start "<task>"');
  }
  if (args.length > 1) {
    throw new BreaklogError('Put the task in quotes. Usage: breaklog start "<task>"');
  }
  const task = args[0].trim();
  if (task === '') {
    throw new BreaklogError('The task cannot be blank. Usage: breaklog start "<task>"');
  }
  return { command: 'start', task };
}

function parseBreak(args) {
  if (args.length !== 1) {
    throw new BreaklogError('Give the break length once. Usage: breaklog break <minutes>');
  }
  const minutes = /^\d+$/.test(args[0]) ? Number(args[0]) : NaN;
  if (!(minutes >= 1 && minutes <= MAX_BREAK_MINUTES)) {
    throw new BreaklogError(
      `Break length must be a whole number of minutes from 1 to ${MAX_BREAK_MINUTES}, got "${args[0]}".`,
    );
  }
  return { command: 'break', minutes };
}

function parseNoArguments(command, args) {
  if (args.length > 0) {
    throw new BreaklogError(`The ${command} command takes no arguments. Usage: breaklog ${command}`);
  }
  return { command };
}

/** Turns command-line arguments into a validated command object. */
export function parseArgs(argv) {
  const [command, ...args] = argv;
  switch (command) {
    case undefined:
      throw new BreaklogError(`Missing command.\n${USAGE}`);
    case 'start':
      return parseStart(args);
    case 'break':
      return parseBreak(args);
    case 'stop':
    case 'report':
      return parseNoArguments(command, args);
    default:
      throw new BreaklogError(`Unknown command "${command}".\n${USAGE}`);
  }
}

/** Reads the warning limit in minutes from the environment variable's text. */
export function parseLimit(value) {
  if (value === undefined || value === '') {
    return DEFAULT_LIMIT_MINUTES;
  }
  const limit = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!(limit >= 1 && Number.isSafeInteger(limit))) {
    throw new BreaklogError(`BREAKLOG_LIMIT_MINUTES must be a positive whole number, got "${value}".`);
  }
  return limit;
}
