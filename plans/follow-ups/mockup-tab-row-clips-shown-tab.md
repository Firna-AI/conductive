# Mockup tab row cuts off the shown tab

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from the mockup milestone of the temporary file tabs change on branch `calummoore/oslo-k1ce`.
- **Location:** `docs/mockups/src/components/workspace/WorkspaceTabs.tsx`, the `endInView` rule near line 118, and `docs/mockups/src/components/workspace/TabScroll.module.css`, the `scrolledToEnd` class.
- **Reason:** The fix changes the shared mockup tab row, so it changes the narrow view of many pages that the temporary tab change does not touch.

- **Source:** Implementation.
- **Category:** Mockup.
- **Terms:**
  - **Catalogue:** the Mokly mockup site of `docs/mockups/`. It shows each screen in a phone frame and a desktop frame.
  - **Narrow frame:** the default desktop frame of the catalogue. It is about 945 px wide in a 1680 px window, and at most about 1180 px.
  - **Temporary tab:** the one file or diff tab of the tab row that the next press on a file replaces. Its title shows in italics.
- **Background:** The tab row of a workspace in the mockups is a static picture, so it cannot scroll. It shows the end of a row only in the `full` state of `tabRow`, through `scrolledToEnd`. The app scrolls the row so that the shown tab stays in view, as The tab row in `docs/protocol/agents-and-sessions.md` says. The app also draws the tab menu above the page.
- **Problem:** In the narrow frame, a row that does not fit shows its start and cuts off its end. On the page `app/files/temporary`, the `kept` variant shows only the icon of the new temporary tab, the `replaced` variant hides the Untitled session tab, and the `menu` variant cuts off the right side of the tab menu. Other pages with a long row clip in the same way.
- **Impact if no action:** A reviewer must press the expand control of the frame to see the tab that a screen is about.
- **Root question:** How can a reviewer see the important tab of each screen in the default frame when the row does not fit?
- **Options:**
  - **A.** Change nothing. Reviewers use the expand control of the frame, as `docs/mockups/README.md` says. Effort: Small.
  - **B.** Make the static row show what the app would scroll into view: the shown tab, the tab with an open menu, or the drop line. Let an open tab menu hang outside the row. Every page with a long row gets the fix, and Mokly lists those pages as changed once. Effort: Medium.
  - **C.** Give only `app/files/temporary` more room, for example by hiding the right column. Its screens then lose the list that the press came from. Effort: Small.
- **Left out:**
  - A static alignment in the CSS modules that the app shares, because the app scrolls that row with script, and the alignment would block that scroll.
  - Shorter fixture titles, because other pages share the fixtures, and the shown tab still clips.
- **Wider fix:** B. It fixes the class for every page with a long row.
- **Previous examples:** The `full` variant of `app/tabs` and the phone rename row already draw a row scrolled to its end with `scrolledToEnd`.
- **Recommendation:** B. It makes the mockups match the scroll rule of the tab row at every frame width.
- **Action:** fix after merge, apply B, because the fix changes the narrow view of many pages outside the temporary tab change.
