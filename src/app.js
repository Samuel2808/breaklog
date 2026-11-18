import { parseArgs, parseLimit } from './args.js';
import { BreaklogError } from './errors.js';
import { formatClock, formatDuration, formatReport, formatWarning } from './format.js';
import { isLongStretch, stretchMs, summarizeDay } from './stats.js';
import { readDataFile, resolveDataPath, writeDataFile } from './store.js';
import { addBreak, startSession, stopSession } from './tracker.js';

function warningLines(data, now, limit) {
  const stretch = stretchMs(data, now);
  return isLongStretch(stretch, limit) ? [formatWarning(stretch, limit)] : [];
}

/** Applies one command and returns any new data with the lines to print. */
function execute(request, data, now, limit) {
  switch (request.command) {
    case 'start':
      return {
        data: startSession(data, request.task, now),
        lines: [`Started "${request.task}" at ${formatClock(now)}.`],
      };
    case 'stop': {
      const { data: stopped, session } = stopSession(data, now);
      return {
        data: stopped,
        lines: [
          `Stopped "${session.task}" after ${formatDuration(session.durationMs)}.`,
          ...warningLines(stopped, now, limit),
        ],
      };
    }
    case 'break':
      return {
        data: addBreak(data, request.minutes, now),
        lines: [`Recorded a break of ${request.minutes} min.`],
      };
    default:
      return { lines: [formatReport(summarizeDay(data, now), now), ...warningLines(data, now, limit)] };
  }
}

/** Runs the program with its outside world passed in and returns the exit code. */
export function run(argv, { env, homeDir, now, stdout, stderr }) {
  try {
    const request = parseArgs(argv);
    const limit = parseLimit(env.BREAKLOG_LIMIT_MINUTES);
    const path = resolveDataPath(env, homeDir);
    const result = execute(request, readDataFile(path), now, limit);
    if (result.data) {
      writeDataFile(path, result.data);
    }
    stdout(`${result.lines.join('\n')}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof BreaklogError ? error.message : `Unexpected error: ${error.message}`;
    stderr(`breaklog: ${message}\n`);
    return 1;
  }
}
