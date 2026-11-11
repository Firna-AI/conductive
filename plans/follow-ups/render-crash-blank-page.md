# A render crash leaves a blank page

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the options check of the Better Stack error reporting plan on the branch `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `src/main.tsx:25` and `desktop/renderer/main.tsx`.
- **Reason:** The error reporting work reports render crashes but adds no recovery screen, because a new screen needs a mockup and its own requirement.

- **Terms:**
  - **Error boundary:** a React component that catches a render error in the components below it and shows a fallback in their place.
  - **Root:** the React root that `createRoot` makes. It holds the whole app.
- **Background:**
  - `src/main.tsx` renders `App` into one root with `createRoot`, and no error boundary wraps it. `desktop/renderer/main.tsx` renders the same `App` for the Mac window.
  - In React 19, an uncaught render error removes the whole tree of the root. The page then shows nothing.
  - On 9 November 2026, the user chose to report the web app's errors to Better Stack, with no new error screen. So the operator learns of a render crash, but the user still sees a blank page.
  - Bookfolio, the user's other product in `futex-ai/accounting`, wraps its routes in its own error boundary and shows its existing retry view.
- **Problem:** A render error in any screen leaves the user with a blank page and no visible way to recover.
- **Impact if no action:** A user who meets a render bug sees an empty window and may not think to reload. In the Mac app, no address bar suggests a reload.
- **Root question:** What does the user see when a screen of the app fails to render?
- **Options:**
  - **A.** Change nothing. The page stays blank after a render crash. Effort: Small.
  - **B.** One error boundary around the whole app, with a fallback screen that says that the page failed and offers Reload. It needs a mockup and a requirement. Effort: Medium.
  - **C.** Error boundaries for each area, such as the workspace panel, the files, and the settings, so that the rest of the app keeps working. Each fallback needs a mockup. Effort: Large.
- **Left out:** An automatic reload, because a crash at start would reload in a loop.
- **Wider fix:** C. A crash in one area then never takes down the other areas.
- **Previous examples:** None found in this repository. Bookfolio's boundary is `ts/app/src/errorTracking/ReportingErrorBoundary.tsx` in `futex-ai/accounting`.
- **Recommendation:** B. It gives every screen a way back for a small cost, and C can follow where one area crashes often.
- **Action:** ask the user, because a recovery screen is new user-visible behaviour that no requirement covers.
