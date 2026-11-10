# Sideways tab rows ignore a vertical wheel

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the second options check of the plan `plans/move-tabs-by-drag.md`, branch `calummoore/tab-drag-and-drop`.
- **Location:** `docs/mockups/src/components/common/LinkTabs.module.css:6`, which `src/shell/ui/links.tsx` and `src/shell/workspace/tools/ToolsPart.tsx` use. `src/files/ui/LinkTabs.module.css:6`. `src/previews/PreviewToolbar.module.css:18`.
- **Reason:** These rows overflow only in a narrow panel or with many previews, and the change that found it does not touch them.

- **Background:**
  - Three rows of link tabs scroll sideways when their tabs do not fit: the shared link tabs of the mockups, which the org settings and the tools panel use, the list tabs of the Files panel, and the preview tabs of the preview tool.
  - Each row sets `overflow-x: auto` and `scrollbar-width: none`. So the row scrolls, but it shows no scrollbar.
  - No code of the app handles the `wheel` event for these rows. A search for `onWheel` in `src/` finds none.
  - A trackpad scrolls such a row with a sideways swipe. As far as the agent knows, Chrome and Firefox scroll such a row with a vertical wheel only while Shift is held. Nobody tested this case in a browser yet.
- **Problem:** A user with a plain mouse cannot see that a row scrolls, and cannot scroll it with the wheel alone. The tabs past the edge stay out of reach until the panel grows.
- **Impact if no action:** In a narrow panel, a mouse user can miss a tab, such as a preview of another port.
- **Root question:** How does a user with a plain mouse reach the tabs past the edge of a sideways row?
- **Options:**
  - **A.** Turn a vertical wheel turn into a sideways scroll in these rows, through one shared handler that each row uses. Leave a sideways swipe as it is. Add a mounted test that turns the wheel over a full row. Effort: Small.
  - **B.** Show a thin scrollbar while the pointer is over a row. It changes the look that the mockups draw. Effort: Small.
  - **C.** Add a scroll button at each clipped end of a row. It needs a mockup. Effort: Medium.
- **Left out:** Wrap the rows onto more lines, because it changes the layout of each panel. The org settings tabs already wrap into columns on a phone through the `wrap` prop of `src/shell/ui/links.tsx`.
- **Wider fix:** A, because every sideways row then uses the one handler, also a new row.
- **Previous examples:** None found.
- **Recommendation:** A. It keeps the look of the mockups, and one handler serves every sideways row.
- **Action:** fix after merge, apply A, because the rows overflow only in a narrow panel, and the change that found it does not touch them.
