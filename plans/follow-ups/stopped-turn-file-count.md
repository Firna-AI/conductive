# Stopped turns can omit changed-file counts

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, during the session transcript branch's main-merge review.
- **Location:** `src/shared/transcript/turn-events.ts:199` and `src/shared/transcript/turn-words.ts:64`.
- **Reason:** The same stopped-completion behavior exists on main. A separate fix can reach every branch.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Completion:** The `turn.completed` event that saves the end of an agent turn and its changed files.
  - **Stopped summary:** The line that names who stopped the agent and counts changed files that the chat does not list.
  - **Omitted count:** `omittedFileCount`, the number of changed files beyond the event's `files` array.
- **Background:** The runner reports changed files after Stop. The chat deliberately shows a count instead of a file list for a stopped turn. `docs/mockups/design-chat.md` gives the example "You stopped the agent · 5 changed files not listed". Copied transcripts use the shared stopped summary.
- **Problem:** `foldTurn` saves a stopped completion in `turnCompletions` and creates a stopped item without a file row. `stoppedSummary` then reads only the omitted count. Files present in the completion's array contribute nothing to the summary.
- **Impact if no action:** A stopped turn with reported file changes can show no count in the chat or copied transcript. With a partial list, the count can be too small.
- **Root question:** How should the stopped summary account for every changed file that the chat does not list?
- **Options:**
  - **A.** Include the completion's `files.length` with its omitted count when no file row exists. Keep the shared summary owner and the current late-file-row rule. Add a focused regression case. Effort: Small.
  - **B.** Store a complete file-count presentation on each stopped transcript item. Update normal and late completions, then read it in the browser and formatter. This adds derived state to the fold. Effort: Medium.
  - **C.** Show file rows after Stop, with a matching full-copy representation. This changes the current no-file-list requirement and needs user approval. Effort: Medium.
- **Left out:**
  - Changing only copied Markdown leaves the browser count wrong.
  - Treating each reported file as omitted in the stored event changes the event's meaning and loses the distinction between listed and omitted files.
  - Ignoring the problem leaves a stopped turn's changed files uncounted.
- **Wider fix:** The shared summary owner is already in force. Option A fixes both browser and copied text through that owner. No additional mechanism is needed.
- **Previous examples:** None found in the existing follow-ups.
- **Recommendation:** A. It meets the current count-only design without adding derived fold state or changing stored events.
- **Action:** fix after merge, apply A, because this behavior predates the transcript changes and belongs in a separate branch.

For example, a normal stopped completion can contain two changed files and
an omitted count of zero. The shared fold keeps both files in the completion
record, but creates no `turn-end` item. The stopped summary therefore shows
the person who stopped the agent without a changed-file count.

`TurnLifecycle.stop` keeps a running turn in the `stopping` state, so its
runner completion takes this normal path. A completion classified as late
can take a different fold path. Preserve the rule that an existing file row
prevents the stopped summary from counting the same files again.

The browser has the same behavior on captured main `b25d8e0d`. Its helper
was then private in `src/chat/components/TranscriptItem.tsx`, and the fold
lived under `src/chat/state/`. The transcript branch moved these rules into
the shared folder without changing their result. The stored completion
still holds the files. This is a presentation defect, not lost file data.
