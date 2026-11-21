# Chat backend key code: tool details

This page is part of the [chat backend](README.md), beside
[Chat backend key code](key-code.md). It names the entry points of the
private tool details. A runner with complete tool details can send the
complete source of a long tool detail in private `tool.detail.part`
messages. The Worker filters the parts of each runner stream, then makes
one `tool.updated`. Each path is relative to `worker/chat/`, the folder of
this page.
[Tool detail secrets](../../docs/protocol/tool-detail-secrets.md) gives the
requirements.

- `tool-detail-input.ts`, `tool-detail-filter.ts`, and
  `tool-detail-records.ts`: the parse of each private `tool.detail.part`,
  `filterToolDetail`, and the encrypted header of the assembly of each
  runner stream in `runner-output-state.ts`. The header keeps the turn, the
  tool with its target masked at receipt, and the cursor. It also keeps the
  source generation, the record count, the held end, and a random salt of
  the source. It keeps no value list.
- `tool-detail-source.ts` and `tool-detail-source-records.ts`:
  `appendToolDetailSource`, `readToolDetailSource`, and
  `ToolDetailSourceRecords`. The text of each part before the last, masked
  with the values that are active at its receipt, goes into the source
  records of the assembly.
  The plaintext of each record holds at most 16,384 UTF-16 code units. Its
  encryption context binds the workspace, the stream, the generation, and
  the index.
- `tool-detail-scan.ts`: `scanToolText` and `scanHeld`, the scanner of a
  private source. The held end is the end that a later part can still
  complete or extend. Examples are the start of a value and a literal
  `[redacted]`. Matching memory follows the held end, not the source length.
- `tool-detail-held.ts`, `tool-detail-match.ts`, and
  `tool-detail-identity.ts`: the held end after a cleanup. Each erased
  character belongs to an unknown run. The saved `held` text has
  `[redacted]` in place of each run, so an older Worker reads a marker
  there. `heldMatches` keeps the runs and the entries.
- An entry names a remaining value, or the literal marker, at an offset.
  `agrees` lets a value cross a run only through its own entry, and checks
  each known character. A match or a held end can start inside a run. Each
  part of a run that no match covers shows as one marker.
- `toolCandidates` gives each value an HMAC identity under the app key. Its
  input separates the purpose, the workspace, the stream, and the salt of
  the source. The salt and the entries live only in the encrypted header,
  so a reader without the app key cannot test a guessed value.
- At the last part, `filterToolDetail` scans all source records, the held
  end, the new text, and the target again with the current values. Only
  then does it cut the longest prefix, count the omitted bytes, and make the
  one `tool.updated`.
- `tool-detail-cleanup.ts`: `maskOpenToolDetails`, which
  `RunnerOutputState.maskTools` runs with two value sets. The expiry,
  removal, and archive callers read the set before the change, change the
  temporary records, and read the set after it. One transaction holds these
  steps and the cleanup.
- The cleanup rescans each open assembly with the set from before the
  change. When nothing in the held end can continue into a later part, it
  finishes the end with that set. Otherwise it erases every whole copy of an
  ended value in the end. It keeps the entries of the remaining values and
  the marker whose match crosses a run. It writes a new source generation,
  and removes the old one in the same transaction. It keeps all other
  source text.
- `RunnerOutputState.saveTool` with no header clears the header and every
  source record of a stream. The last part, a refusal, an interrupted
  sequence, and a new stream use it. A refusal of a later part first reads
  its session and turn from `RunnerOutputState.toolContext`.
