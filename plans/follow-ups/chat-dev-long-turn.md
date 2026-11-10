# The chat development page has no long turn

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the finding check of review round 1 of branch `calummoore/tool-calls-and-thinking-collapse`.
- **Location:** `src/chat/dev/dev-agent.ts`, the scripted turn of the development page.
- **Reason:** the reviewed change did not edit the development page, so the review left this problem for a separate branch.

- **Terms:**
  - **Development page:** the page that runs the chat in a browser on a fake API, at `http://127.0.0.1:5181/src/chat/dev/` with `npx vite --config src/chat/dev/vite.config.js --port 5181 --strictPort`. `src/chat/dev/README.md` lists its options.
  - **Work fold:** the one line that holds the work of an ended turn before its answer, such as "8 tool calls, 7 messages". `docs/protocol/chat-and-events.md` states it under "The work of a turn".
- **Background:** The scripted agent of the development page answers a sent message with a short turn: one message and three tool calls. When that turn ends, its work folds into a line of about 35 px. A large fold, such as one of 16 messages and 16 tool calls, behaves differently in a chat that keeps its bottom in place: a fold that removes more height than the reader's distance from the top of the chat moves the scroll.
- **Problem:** The page cannot show a large fold, so a smoke test of the scroll behaviour at the end of a long turn needs a patch of the agent at run time.
- **Impact if no action:** Each smoke test of a long turn repeats that patch, and a regression of the reading position at the end of a long turn is easy to miss by hand.
- **Root question:** How does the development page let a developer see the end of a long turn?
- **Options:**
  - **A.** Add a page option, such as `turn=long`, that makes the scripted agent run a turn with many messages and tool calls. Document it in `src/chat/dev/README.md`. Effort: Small.
  - **B.** Make every scripted turn long. Effort: Small.
- **Left out:** A recorded long turn in `src/test-support/`, because the page then shows it only as stored history, not as a turn that ends live.
- **Wider fix:** None. This is one page.
- **Previous examples:** None found.
- **Recommendation:** A. The default turn stays short for the other smoke tests.
- **Action:** fix after merge, apply A, because the reviewed change did not edit the development page.
