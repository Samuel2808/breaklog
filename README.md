# breaklog

breaklog is a small terminal tool for programmers who lose track of time. It records
work sessions and breaks, reports today's totals, and warns you when you have worked
more than 90 minutes without a break.

It needs only Node.js 20 or newer. There is nothing to install, no account, and no
internet connection.

## How to run it

From the repository root:

```bash
node src/cli.js start "write the parser"
```

```bash
node src/cli.js break 10
```

```bash
node src/cli.js stop
```

```bash
node src/cli.js report
```

| Command | What it does |
| --- | --- |
| `start "<task>"` | Starts a work session for a task. |
| `stop` | Ends the running session and shows how long you worked. |
| `break <minutes>` | Records a break that just ended, from 1 to 1440 minutes. |
| `report` | Shows today's work time, breaks, and sessions. |

`stop` and `report` show a warning when the current stretch is over the limit. Recording
a break of any length resets the stretch, and so does local midnight.

To use the short `breaklog` command, optionally run this once from the repository root:

```bash
npm link
```

## Settings

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `BREAKLOG_FILE` | `~/.breaklog/data.json` | Where the history is saved. |
| `BREAKLOG_LIMIT_MINUTES` | `90` | Minutes of work allowed before the warning. |

## Run the tests

```bash
npm test
```

The tests use temporary files and never touch your real history.

## Project documents

- `problem.md`: the problem and initial requirements
- `spec.md`: the detailed behavior
- `docs/decisions/`: decision records
