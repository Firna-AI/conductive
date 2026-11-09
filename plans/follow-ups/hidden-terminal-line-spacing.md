# Hidden terminals keep incorrect line spacing

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from PR #79, review finding 4, after merging main into `calummoore/right-panel-close-icon`.
- **Location:** `src/shell/workspace/WorkspaceColumns.tsx:62`, `src/terminal/terminalTheme.ts:68`, `src/terminal/TerminalScreen.tsx:79`, and `src/terminal/xtermScreen.ts:120`.
- **Reason:** The branch completed two review fix rounds before this noncritical finding.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Right column:** The desktop workspace column that holds files and tools.
  - **xterm.js:** The library that draws the terminal.
  - **Font probe:** The temporary element that `terminalFont` measures to set the terminal line spacing.
- **Background:** Conductive keeps one right-column visibility choice for every workspace in a browser tab. The tools mount inside that column while it is hidden. Each workspace open creates a new terminal screen. The terminal measures its font when it mounts.
- **Problem:** Hide the right column, leave the workspace, open it again, and show the column. The hidden parent gives the font probe a zero height. `terminalFont` then sets `lineHeight` to `1`. Showing the column only fits the terminal box, so that spacing stays.
- **Impact if no action:** Rows use the font's natural height instead of the intended spacing of 1.6 times the font size. Open the workspace with its right column visible to restore normal spacing.
- **Root question:** How should a terminal opened while hidden get the correct line spacing?
- **Options:**
  - **A.** Recalculate font options when the terminal first gets visible dimensions. Add the navigation case to the existing Electron journey. Effort: Small.
  - **B.** Measure the font in an invisible element outside the hidden column. Use the terminal's computed font values. Add the same regression case. Effort: Small.
  - **C.** Separate the connection from the terminal screen. Create the screen only when it can receive layout measurements. This changes more of the terminal lifecycle. Effort: Medium.
  - **D.** Use canvas text metrics with the token's font and size, as xterm.js 6 does. Use `fontBoundingBoxAscent + fontBoundingBoxDescent`. Keep a fallback for browsers without those metrics. Add the same regression case. The app still calls `open` on a hidden host. Effort: Small.
  - **E.** Build the terminal, session, and connection at mount. Defer `xterm.open`, the font measure, and the first fit until the host gets a size. Keep output in xterm's buffer before that point. Attach `XtermScreen` focus listeners after `open`, because its current constructor skips them when no element or text area exists. Keep automatic focus replies separate from user input. Add the same regression case. Effort: Medium.
  - **F.** Read xterm's character height through its private `_core` API after `open`, then set `lineHeight`. This needs a cast into internals that can change. The DOM fallback can still measure zero while hidden. Effort: Small.
- **Left out:** Changing nothing leaves the visible defect. Unmounting hidden tools breaks connection preservation. A hide that keeps layout adds another hiding mechanism and misses the inactive-tool case. A fixed factor for Menlo fails when the font falls back.
- **Wider fix:** E. Every layout-dependent step at `open` receives a visible host, while the connection keeps running.
- **Previous examples:** The same zero-height measure can occur on main when a terminal becomes ready behind another tool tab. `src/shell/workspace/tools/ToolsPart.tsx` keeps that terminal inside a hidden element. Each option above also covers that case.
- **Related:** `plans/follow-ups/terminal-font-measurement-comment.md` records the outdated description of the font measure. Update that description when this fix chooses its method.
- **Recommendation:** E. It meets xterm's visible-parent requirement and preserves the connection. The first review recommended B. The independent check recommended E with Small effort. Reading `XtermScreen.watchFocus` showed the required focus-listener change, so the final effort is Medium.
- **Action:** fix after merge, apply E, because two review fix rounds already completed on this branch.

The mockup terminal uses `line-height: 1.6`, and `src/terminal/README.md` states the same requirement. `terminalFont` appends its probe to the host and reads its bounding rectangle. A `display: none` ancestor removes that rectangle. `TerminalScreen` calls the helper only during setup. Its ResizeObserver later calls only `fitVisible`.

The shared `[hidden] { display: none !important; }` rule must stay. It owns hiding for the column and inactive tools. Changing it would undo the existing layout fixes.

xterm.js 6 accepts output before `open` and draws the buffered rows when it opens. Its public API requires a visible parent for `open`. `XtermScreen.watchFocus` currently returns when `element` or `textarea` is absent. It never retries that attachment. The fix must retain parser hooks, output buffering, automatic replies, and user input classification.

No runtime reproduction ran during the review. The finding follows the app code, the installed xterm.js 6 source, and the hidden-element layout rule. The existing component regression uses happy-dom, which has no layout engine. Extend a real-browser journey to compare row spacing after hidden navigation with the spacing of a visible mount. Give that journey a working terminal socket so it reaches xterm setup.
