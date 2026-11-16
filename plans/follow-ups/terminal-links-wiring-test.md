# No mounted test opens a terminal link

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from the check of review finding 4 of branch `calummoore/delft-vl39` (terminal links), option D.
- **Location:** `src/shell/workspace/tools/ToolsWiring.test.tsx`, `src/shell/workspace/tools/ToolsPart.tsx`, `src/terminal/TerminalTool.tsx`, `src/terminal/TerminalScreen.tsx`.
- **Reason:** The case needs output framed on the fake terminal socket and the layout stubs of xterm.js in a mounted app, which is more work than the review fix.

- **Terms:**
  - **Links prop:** the optional `links` of `TerminalTool` and `TerminalScreen`. Without it, no terminal link opens.
- **Background:** `ToolsPart` passes `links` from `useTerminalLinks` to `TerminalTool`, which passes it to `TerminalScreen`, which gives it to `watchLinks`. `src/terminal/xtermLinks.events.test.ts` drives the links through xterm.js events, and `src/shell/workspace/tools/terminal-links.test.tsx` tests the hook.
- **Problem:** No test mounts the chain. If one link of the chain is dropped, every terminal link stops working, and the types and the tests still pass.
- **Impact if no action:** A refactor can turn terminal links off with a green gate.
- **Root question:** Which test proves that a terminal link in the workspace screen reaches the Preview tool?
- **Options:**
  - **A.** Add a case to `ToolsWiring.test.tsx`: send a local address through the fake socket, press it with the key, and check that the address becomes `previewPortHref`. Effort: Medium.
- **Left out:** A browser journey: it needs a browser test harness for the same proof.
- **Wider fix:** None. The `testing` skill already asks for tests through the entry point of real callers.
- **Previous examples:** `plans/follow-ups/bar-button-fills-untested.md`.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the mounted harness needs new socket framing and layout stubs.
