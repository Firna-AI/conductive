# The chat page can report a ResizeObserver loop

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from branch `calummoore/tab-size-on-hover`, a problem outside the scope of its review round 1.
- **Location:** The chat development page, `src/chat/dev/`. The part of the chat that causes the error is not known.
- **Reason:** The review of a fix of the tab styles found the error, but that fix does not cause it: the error showed with the old and the new tab styles.

- **Terms:**
  - **Chat development page:** the page under `src/chat/dev/` that runs the chat of a workspace on a fake API, without the Worker. `src/chat/dev/README.md` gives the command that serves it.
  - **ResizeObserver loop error:** the error event `ResizeObserver loop completed with undelivered notifications.` that a browser sends to `window` when a resize callback changes the layout again in the same frame.
- **Background:** A browser calls each `ResizeObserver` callback after layout. When a callback changes the size of an observed element, the browser keeps the new size for the next frame and sends the loop error to `window`. The Vite client prints each such error in the terminal of the development server. The app uses `ResizeObserver` in `src/terminal/TerminalScreen.tsx` and `src/shell/layout/ResizeHandle.tsx`. React Native for Web, under `@firna/ui`, also uses it for `onLayout`.
- **Problem:** A review run loaded the chat development page in headless Chrome at 1440 × 900 px, through the Chrome DevTools Protocol with `Emulation.setDeviceMetricsOverride`. The page sent the loop error once, and Vite printed `[vite] (client) [Unhandled error] Error: ResizeObserver loop completed with undelivered notifications.` A second run through Playwright, at the same size and at six other window widths, sent no error.
- **Impact if no action:** The development server, and later the error reports of the app, can show a false error. If a real loop of resize and layout is the cause, a part of the chat can jump for one frame. No report shows such a jump.
- **Root question:** Which part of the chat changes its own size in a resize callback, and must it do so?
- **Options:**
  - **A.** Change nothing, because the loop error is harmless when the layout settles in the next frame. A real loop stays hidden. Effort: Small.
  - **B.** Reproduce the error, find the callback that changes the layout, and move that change out of the callback, for example to the next animation frame. Effort: Medium.
  - **C.** Ignore this one error message in the error reports of the app. It also hides a real loop. Effort: Small.
- **Left out:** None.
- **Wider fix:** None, because the cause is not known yet.
- **Previous examples:** None found.
- **Recommendation:** B. A reproduction shows whether the loop is real before anyone ignores it.
- **Action:** fix after merge, apply B, because the error is outside the scope of the tab fix and its cause is not known.
