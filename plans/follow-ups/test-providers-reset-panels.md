# Test providers reset the panel layout

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from branch `calummoore/milan-hmhx`, a problem outside the scope of its review.
- **Location:** `src/shell/test-render.tsx`, `AppProviders`, the `PanelContext.Provider`.
- **Reason:** The helper predates the branch, and a fix changes the providers of every rendered test.

- **Terms:**
  - **Panel layout:** `PanelLayout` in `src/app/panels.ts`. It keeps the widths of the panels, and whether the sidebar and the right column show.
- **Background:** `AppProviders` of `src/shell/test-render.tsx` writes `new PanelLayout(app.services.storage)` inline as the value of `PanelContext.Provider`. Each render of the providers then makes a new layout. The app itself makes one layout for its life, in `src/App.tsx`.
- **Problem:** A re-render of the test providers resets a hidden sidebar and a hidden right column, which the app never does.
- **Impact if no action:** A test that re-renders its providers can pass or fail for a reason that the app does not have.
- **Root question:** Does a rendered test keep one panel layout for its life, as the app does?
- **Options:**
  - **A.** Keep the layout in state, as `src/App.tsx` does, with `useState(() => new PanelLayout(...))`. Effort: Small.
- **Left out:** Only one approach is real, because the app already shows the right shape.
- **Wider fix:** None, because this is one helper.
- **Recommendation:** A. The tests then hold the layout as the app does.
- **Action:** fix after merge, apply A, because the helper is outside the scope of the branch that found it.
