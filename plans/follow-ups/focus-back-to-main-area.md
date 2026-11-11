# A layer cannot give the focus back to the main area

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from the branch `calummoore/conductor-internal-tools-410`, review round 1, a problem outside the scope that the check of finding 2 found.
- **Location:** `useScreenFocus` in `src/shell/ui/screen-focus.ts:44`, and the cleanup of `useLayerFocus` in `src/shell/ui/Overlay.tsx:223`.
- **Reason:** The branch that found it changes neither file, and the same behaviour is on `origin/main`.

- **Terms:**
  - **Main area:** the `main` element of each desktop frame, in `src/shell/layout/DesktopLayers.tsx`. It can take the focus only for a move to a new screen, through `requestScreenFocus`.
  - **Layer:** a menu, a sheet, a dialog, or the command palette. `useLayerFocus` moves the focus into it as it opens, and back to the element that had the focus as it closes.
- **Background:**
  - When a layer closes with a move to another screen, the main area of the new screen takes the focus. `useScreenFocus` gives it a tabindex of -1 for that, and removes the tabindex when the focus leaves it, so that the main area is no tab stop.
  - A layer that opens records the element that had the focus. When it closes and no trigger takes the focus, it calls `focus()` on that element.
  - Nobody reproduced the problem. A read of the code shows it.
- **Problem:** When a layer opens while the main area has the focus, the main area loses its tabindex. When the layer closes, `focus()` on the main area does nothing in a browser, so the focus stays on the page.
- **Impact if no action:** After such a close, keyboard and screen reader users must start again from the top of the page.
- **Root question:** Where does the focus go when a layer closes and the element that had the focus can no longer take it?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** In the cleanup of `useLayerFocus`, give the focus back to the main area through the screen focus, so that the main area takes its tabindex again. Effort: Small.
  - **C.** Keep the tabindex of the main area while a layer that opened from it shows, and remove it when the focus moves elsewhere. Effort: Small.
- **Left out:** A permanent tabindex on the main area: a click inside the area would then take the focus, and the area would show as a target.
- **Wider fix:** B. One rule then serves each layer, also a later one.
- **Previous examples:** None found.
- **Recommendation:** B. The screen focus already owns the rule of when the main area can take the focus.
- **Action:** fix after merge, apply B, because the problem is outside the scope of the branch that found it.
