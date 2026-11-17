# No test renders the automatic terminal reconnect

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the review of the automatic terminal reconnect on branch `calummoore/investigate-error-m9o4`, finding 5.
- **Location:** `src/terminal/TerminalTool.tsx` (the Disconnected bar), `src/terminal/TerminalScreen.tsx` (the `lasted` value of `onClosed`).
- **Reason:** no test renders `TerminalTool` today, so the test needs a new harness with a fake workspace store and a fake transport, and the terminal tabs branch `calummoore/terminal-tabs-implementation-l5ml` changes that component.

- **Terms:**
  - **Automatic try:** after a terminal connection drops with no close of the server, the Terminal tool reads the terminal state again and connects once by itself. Cal chose this on 17 November 2026.
- **Background:**
  - `src/terminal/terminalReadiness.test.ts` tests the rules of the try with the reducer and `disconnected()`.
  - `src/app/terminal-transport.test.ts` tests how the transport sorts each close.
  - Nothing tests that `TerminalTool` shows the bar through `disconnected(snapshot)`, or that `TerminalScreen` reports the time since the first output.
  - `src/test-support/fake-terminal.ts` gives a fake transport. Its `close('lost')` ends it as a lost connection.
- **Problem:** A change back to `view.ended` for the bar, or a wrong `lasted`, fails no test.
- **Impact if no action:** A later change can break the automatic try or show Disconnected during it, and the gate stays green.
- **Root question:** Which test proves the wiring of the automatic try?
- **Options:**
  - **A.** One DOM test of `TerminalTool` with a fake fetch and `FakeTerminal`. Drop the connection with `close('lost')`. Check that no Disconnected shows and a second read starts. Then drop the new connection before its first output, and check that Disconnected shows. Effort: Medium.
  - **B.** Change nothing. Effort: Small.
- **Left out:** A browser spec, because the behaviour needs no real host or layout.
- **Wider fix:** None, because this is one missing test, not a class of defect.
- **Previous examples:** None found.
- **Recommendation:** A. It is the lowest test that covers the wiring.
- **Action:** fix after merge, apply A.
