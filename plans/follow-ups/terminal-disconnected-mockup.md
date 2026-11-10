# The Disconnected terminal has no mockup

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the options check of the plan `plans/terminal-copy.md`, branch `calummoore/disconnected-terminal-text-selection`.
- **Location:** `src/terminal/TerminalTool.tsx:83-91`, `docs/mockups/src/entries/app/tools/index.mockup.tsx`
- **Reason:** the gap is older than the terminal copy change, and that change adds no screen state.

- **Source:** Design. **Category:** Mockup.
- **Terms:**
  - **Disconnected bar:** the bar under the terminal screen that shows "Disconnected" and a Reconnect button after the terminal connection ends.
  - **Mockup catalogue:** the visual spec of the app, in `docs/mockups/`, built with Mokly.
- **Background:** The Terminal tool shows the shell of a workspace. When its connection ends, it keeps the output and shows the Disconnected bar, in `src/terminal/TerminalTool.tsx:83-91`. The tools mockup, `docs/mockups/src/entries/app/tools/index.mockup.tsx`, shows only a running terminal. A search of `docs/mockups/src` for "Disconnected" and "Reconnect" finds nothing.
- **Problem:** A visible state of the product has no mockup, so the visual spec does not cover it.
- **Impact if no action:** A change to the bar, such as a new button, has no design to start from. A review can't compare the bar with a design.
- **Root question:** How does the visual spec show a terminal whose connection ended?
- **Options:**
  - **A.** Add a Disconnected state to the tools mockup, with the bar and Reconnect, in the panel and the phone layouts. Effort: Small.
  - **B.** A, plus a check of each other state of the Terminal tool for a mockup, with a mockup for each missing one. Effort: Medium.
- **Left out:** Change nothing, because the spec then misses a visible state.
- **Wider fix:** None, because the `mockups` skill already asks for a mockup of each screen state.
- **Previous examples:** None found.
- **Recommendation:** A. It covers the state that users meet after each dropped connection, at the smallest cost.
- **Action:** fix after merge, apply A, because the gap is outside the scope of the terminal copy change.

The plan of the change, before its deletion: https://github.com/Firna-AI/remote-code/blob/df8a3160206f427a810aeae476f121ca3264f9f8/plans/terminal-copy.md
