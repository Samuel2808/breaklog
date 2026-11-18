# breaklog specification

breaklog is a terminal tool that tracks work sessions and breaks and warns the user
after a long stretch of work without a break. Requirement IDs R1 to R8 come from
`problem.md`. The rules under each one record the answers given before implementation.

## Requirements

### R1: One command, Node.js only

- The program runs with `node src/cli.js <command>` from the repository root.
- It has no dependencies, account, or network use.
- `package.json` declares a `breaklog` bin, so `npm link` is an optional way to get the
  short `breaklog` command.

### R2: `breaklog start "<task>"`

- Starts a session for the task and records the start time.
- The task is exactly one non-blank argument. Surrounding spaces are removed.
- If a session is already running, the command fails, names the running task, and
  changes nothing.

### R3: `breaklog stop`

- Ends the running session and records its end time and how long it lasted.
- The recorded length is the work time: elapsed time minus breaks recorded during the
  session, never below zero.

### R4: `breaklog break <minutes>`

- Records a break that just ended, covering the given minutes before the command.
- Minutes must be a whole number from 1 to 1440.
- A break can be recorded with or without a running session.
- A break recorded during a session subtracts its minutes from that session's work
  time, working backward from the moment it was recorded and stopping at the session
  start.
- A break recorded with no running session does not change any stopped session.

### R5: `breaklog report`

- Shows today's total work time, the number and total length of breaks, and the
  sessions worked.
- "Today" is the local calendar day.
- A running session counts up to now and is marked as running.
- A session that crosses midnight is split, so each day counts only its own part.
- A break belongs to the day on which it ended.

### R6: Long-stretch warning

- `breaklog report` and `breaklog stop` show a clear warning when the current stretch
  is more than the limit. Exactly the limit gives no warning.
- The limit is 90 minutes unless `BREAKLOG_LIMIT_MINUTES` sets another positive whole
  number.
- The stretch is the work time since the latest recorded break of any length.
- Time between sessions is not work and does not reset the stretch.
- The stretch resets at local midnight.
- A warning does not change the exit code.

### R7: Saved history

- Sessions and breaks are saved as JSON in `~/.breaklog/data.json`.
- `BREAKLOG_FILE` selects a different file.
- A missing file means an empty history. The file and its folder are created on the
  first save.
- Saving replaces the file in one step, so a failed save leaves the old file intact.

### R8: Clear errors

- These cases print a message starting with `breaklog:` to stderr and exit with code 1:
  no command, an unknown command, missing or extra arguments, a blank task, `stop` with
  no running session, an invalid break length, an invalid `BREAKLOG_LIMIT_MINUTES`, and
  a data file that cannot be read, parsed, or written.
- A corrupted data file is never overwritten.
- Successful commands exit with code 0.

## Data file

```json
{
  "version": 1,
  "sessions": [
    {
      "id": 1,
      "task": "write spec",
      "start": "2026-11-17T15:00:00.000Z",
      "end": "2026-11-17T16:00:00.000Z",
      "durationMs": 3000000
    }
  ],
  "breaks": [
    { "minutes": 10, "end": "2026-11-17T15:40:00.000Z", "sessionId": 1 }
  ]
}
```

A running session has `"end": null` and `"durationMs": null`. A break recorded with no
running session has `"sessionId": null`.
