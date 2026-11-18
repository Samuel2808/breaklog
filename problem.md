# breaklog

## Problem

Programmers spend long hours in front of a terminal and can lose track of time very
quickly, working for hours without noticing it. Without a reminder they skip breaks,
which leaves them tired and less focused. They need a simple tool, in the terminal
where they already work, that keeps track of their work time and warns them to take
regular breaks and step away to something different.

## Initial requirements

- R1: The program runs in the terminal with one command and needs no installation, account or internet connection; only Node.js.
- R2: `breaklog start "<task>"` starts a work session for a task and records the start time.
- R3: `breaklog stop` ends the current work session and records how long it lasted.
- R4: `breaklog break <minutes>` records a break of that many minutes.
- R5: `breaklog report` shows today's total work time, the number and total length of breaks, and the sessions worked.
- R6: When the user has worked a long stretch without a break (more than 90 minutes by default), `breaklog report` and `breaklog stop` show a clear warning to take a break.
- R7: All sessions and breaks are saved in a file, so the history is kept between runs.
- R8: Wrong or missing arguments (such as an unknown command, `stop` with no session started, or a break that is not a positive number) give a clear error message instead of crashing.
