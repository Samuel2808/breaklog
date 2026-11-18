# 0001: Store history in a single JSON file

Status: accepted, 2026-11-17

## Decision

In the context of a terminal tool that must keep its history between runs using only
Node.js,

facing the need to save sessions and breaks without dependencies and without losing
data when a save fails or the file is damaged,

we decided for one versioned JSON file at `~/.breaklog/data.json`, validated on every
read and replaced in one step through a temporary file and a rename,

and neglected a CSV or append-only log, a SQLite database, and a data file inside the
repository,

to achieve a history that is easy to read, survives failed saves, follows the user
across projects, and can be redirected to a temporary file in tests,

accepting that each command reads and rewrites the whole file, and that two commands
running at the same moment can overwrite each other's change.
