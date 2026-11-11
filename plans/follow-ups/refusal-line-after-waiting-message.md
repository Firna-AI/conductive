# A lost line goes after a waiting message

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the branch `calummoore/tool-calls-collapsing-issue`, a new problem that the check of review finding 1 found.
- **Location:** `src/shared/transcript/refused-events.ts`, `foldRefused`, which appends the lost line at the end of the items.
- **Reason:** The branch did not change how a lost line is placed, and `origin/main` places it the same way.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Lost line:** the line that reports a runner event that the workspace refused, such as a tool update that was too large.
  - **Waiting message:** a message of a member that no turn has taken yet. A new item of the running turn goes before it, because the agent reads it at its next tool call.
  - **Part of a turn:** the items of a turn between two of its messages. When the turn ends, the work before the answer of each part folds into one line.
- **Background:** `src/chat/transcript.md` says that each item stays with its turn, before a message that no turn has taken yet. `placeOf` in `src/shared/transcript/item-placement.ts` places each new agent message and tool call of a running turn that way. `foldRefused` in `src/shared/transcript/refused-events.ts` instead appends each lost line at the end of the items, also when it names the running turn. A refused end of the running turn goes there too.
- **Problem:** A lost line of the running turn that arrives while a message waits goes after that message. The later calls of the turn go before the message. So the lost line shows after later items of its own turn. When the turn later takes the message, the lost line falls into the next part of the turn and can fold with the wrong work. A read-only replay showed this order.
- **Impact if no action:** In this rare order of events, a lost line shows below the message and the later calls, away from the work that it belongs to.
- **Root question:** Where does a lost line of the running turn go while a message waits?
- **Options:**
  - **A.** Place a lost line that names the running turn with the other items of its turn, through `placeOf`, before a waiting message. Keep the event order for a lost line of no turn. Update the tests of lost lines. Effort: Medium.
  - **B.** Keep waiting messages out of the ordered list of items, and draw them after the list until a turn takes them. Each item of the running turn then goes at the end. This rewrites how waiting messages are placed and drawn, and many chat tests change. Effort: Large.
  - **C.** Change nothing, and state in `src/chat/transcript.md` that a lost line keeps the event order, also after a waiting message. Effort: Small.
- **Left out:** None. The three options cover a move of the lost line, a move of the waiting message, and no move.
- **Wider fix:** A. One placement rule then holds for every item of a running turn.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/tool-run-growth-after-refusal.md`, the same order of events. Its option C is this option A.
- **Recommendation:** A. A lost line then stays with the work that it belongs to.
- **Action:** fix after merge, apply A, because the branch that found it did not change how a lost line is placed.
