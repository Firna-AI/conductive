# Terminal font comment describes the wrong measure

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the independent check of PR #79, review finding 4.
- **Location:** `src/terminal/terminalTheme.ts:53`.
- **Reason:** The comment predates the panel-toggle change and needs a separate fix with the terminal font work.

- **Source:** Review.
- **Category:** Docs or spec.
- **Terms:**
  - **xterm.js:** The library that draws the terminal.
  - **Font probe:** The temporary DOM element that `terminalFont` measures to set the terminal line spacing.
- **Background:** `terminalFont` measures a font probe inside the terminal host. Its comment says that this measures the height as xterm.js measures it.
- **Problem:** The installed xterm.js 6 measures canvas text metrics first. Its DOM probe is a fallback. The comment describes the fallback as the general method.
- **Impact if no action:** A maintainer can assume that both measurements always use the same method.
- **Root question:** How should the comment describe the terminal's font measurement?
- **Options:**
  - **A.** Describe the method that `terminalFont` actually uses. Update it alongside any change to that method. Effort: Small.
  - **B.** Remove the claim that both measurements use the same method. Keep the line-spacing purpose and its calculation. Effort: Small.
- **Left out:** Changing nothing keeps an inaccurate comment. No third approach improves the description without changing the measurement code.
- **Wider fix:** None. The documentation skill already requires comments to match the implementation.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/hidden-terminal-line-spacing.md` chooses the measurement setup for terminals that mount while hidden. Its fix can update this comment in the same branch.
- **Recommendation:** A. It explains the calculation without assuming an identical library implementation.
- **Action:** fix after merge, apply A, with the terminal font fix, because this comment is outside the panel-toggle diff.

The installed `node_modules/@xterm/xterm/src/browser/services/CharSizeService.ts` selects `TextMetricsMeasureStrategy` first. That strategy uses `measureText` and the font bounding-box metrics. It selects `DomMeasureStrategy` when those canvas metrics are unavailable. The current app helper always measures a DOM probe. This evidence came from reading the installed source. No runtime check ran.
