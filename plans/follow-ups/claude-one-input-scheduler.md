# One input scheduler for Claude member input, notes, and continuations

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Kind:** Wider fix of review finding 4, and a problem outside its scope.
- **Added:** 2026-11-27, from the review of branch `calummoore/background-task-missing-work-zqja`.
- **Location:** `runner/sdk-helper/src/providers/claude-input-window.ts` and the stream-drop continuation in `claude.ts`.
- **Reason:** the stream-drop continuation is on `origin/main`, outside the diff of the branch.

- **Source:** Review. **Category:** Product bug.
- **Background:** One result of the pinned agent program lists at most 64 input UUIDs, so the adapter keeps at most 64 inputs in flight. Branch `calummoore/background-task-missing-work-zqja` made the orphan note take a slot of that window.
- **Problem:** The stream-drop continuation still enters the SDK input through `continue()`, outside the window. A dropped wake-up reply maps to no member message, so its continuation can put a 65th input in flight.
- **Impact if no action:** In that rare case, a result can omit one input, and the turn can wait for a receipt that never comes.
- **Root question:** How does every input of the agent go through one capacity rule?
- **Options:**
  - **A.** Count the continuation against the window, as the note does. Effort: Small.
  - **B.** One scheduler for member messages, notes, and continuations. It tracks the outstanding SDK UUIDs and keeps the member associations of a continuation. Effort: Medium.
- **Left out:** A bigger window, because the program still lists at most 64 UUIDs.
- **Wider fix:** B.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the continuation code is outside the diff.
