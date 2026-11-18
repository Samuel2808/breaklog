# breaklog

Terminal work and break tracker. `spec.md` is the source of truth for behavior.

## Commands

- Run the tests: `npm test`
- Run the program: `node src/cli.js <start "task" | stop | break minutes | report>`
- Run against a throwaway file: `BREAKLOG_FILE=/tmp/breaklog-try.json node src/cli.js report`

## Standing rules

- Keep every project file at the repository root: `README.md`, `package.json`,
  `spec.md`, `CLAUDE.md`, `src/`, `test/`, `docs/`. Do not add a wrapper folder.
- Use Node.js with no dependencies. Tests use `node --test`, run by `npm test`.
- Keep logic in pure, testable functions. Only `src/store.js`, `src/app.js`, and
  `src/cli.js` may touch the file system, clock, environment, or console.
- Write a failing test before the code it covers.
- Start every test name with the requirement ID it checks, such as `R6:`.
- Tests must never touch the real data file. Use a temporary `BREAKLOG_FILE` and `HOME`.
- Record significant decisions in `docs/decisions/NNNN-title.md` as Y-statements.
- Commit in small steps with messages that say what changed and why, then push.
- Never undo or amend a commit. Fix mistakes with a new commit.
