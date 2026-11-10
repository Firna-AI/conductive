# Turn chip line counts cover the whole branch

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the brainstorm of the turn end file limit on branch `calummoore/file-badges-display-limit`.
- **Location:** `runner/src/checkpoint.ts:58`, `src/chat/components/TurnEnd.tsx:33`, and `docs/protocol/chat-and-events.md:62`.
- **Reason:** The turn end file limit changes how many chips show, not what their counts mean, so this question needs its own change.

- **Terms:**
  - **Turn end:** the row at the end of a finished turn in the chat, with the duration and one file chip for each file that the turn changed.
  - **File chip:** a box with a file name and its line counts, such as "+4 −3". A click opens the diff of the file against the default branch.
  - **Agent runner:** the program in the sandbox that runs the agent and sends the chat events. Its code is under `runner/`.
- **Background:** When a turn ends, the agent runner compares two checkpoints of the repository to find the files that the turn changed, in `changedSince` of `runner/src/checkpoint.ts`. It takes the line counts of each file from the changes of the branch against the default branch, in `branchChanges` of `runner/src/repository-changes.ts`. It does not count the lines of the turn. A click on the chip opens the diff of the file against the default branch, so the counts match that diff. No protocol doc says what the counts on a turn chip mean.
- **Problem:** A reader can take "+4 −3" on a turn chip for the lines that this turn changed. When an earlier turn already changed the file, the counts include that earlier work.
- **Impact if no action:** A reader can misjudge the size of the work of one turn. The counts of a file that each turn changes again grow with each turn.
- **Root question:** What should the line counts on a turn chip tell the reader?
- **Options:**
  - **A.** Keep the counts. State in `docs/protocol/chat-and-events.md` that each chip shows the lines that the branch adds and removes in the file, as its diff shows. Effort: Small.
  - **B.** Remove the counts from the turn chips, so that the chips show only the file names. The Changes list keeps its counts. Effort: Small.
  - **C.** Count the lines of the turn in the runner, from the two checkpoints, and show those counts. The diff that a chip opens still shows the whole branch, so the counts and the diff differ. Effort: Medium.
- **Left out:** A chip that opens a diff of the turn alone. It needs a stored copy of each file at the start of the turn and a new diff route, which is much larger than the question.
- **Wider fix:** None. The question concerns one display.
- **Previous examples:** None found.
- **Recommendation:** A. The counts then match the diff that the chip opens, and the doc removes the doubt. C best fits a reader who wants the size of one turn.
- **Action:** ask the user, because each option sets what a user sees on a chip, and no requirement covers it.
