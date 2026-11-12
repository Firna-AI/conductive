# Phone lists do not scroll during a drag

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-12, from branch `calummoore/riga-188n`, the mockups of the org rail order.
- **Location:** `src/app/pointer-drag.ts:98`, `src/shell/list/useRowDrag.ts`, `src/shell/list/HomeList.tsx:20`.
- **Reason:** Each option adds a behaviour that no requirement covers, and it changes the workspace list too, so the user decides.

- **Terms:**
  - **Shared pointer drag:** the drag code in `src/app/pointer-drag.ts`. The tab row, the workspace list, and the org rail and the phone org sheet use it.
  - **Phone org sheet:** the sheet that lists the orgs on a phone, which has no org rail.
- **Background:**
  - On a phone, a long press lifts a workspace row or an org, and a move of the finger drops it at a new place.
  - The shared pointer drag holds the page still while a finger holds a lifted item.
  - The tab row has its own rule: near an end of the row, a drag scrolls the row, so every place is in reach (`docs/protocol/agents-and-sessions.md`, "The tab row").
  - The workspace list and the phone org sheet have no such rule.
- **Problem:** In a vertical list that is longer than the screen, one drag cannot reach a place out of view.
- **Impact if no action:** A person who moves an item far needs several drags, with a scroll between them.
- **Root question:** How does one drag on a phone reach every place in a long vertical list?
- **Options:**
  - **A.** Change nothing. The person drags to the edge, drops, scrolls, and drags again. Effort: Small.
  - **B.** Only the phone org sheet scrolls when a finger is near its top or bottom edge during a drag. Effort: Small.
  - **C.** The shared pointer drag scrolls the list under the pointer near its top or bottom edge, so every vertical list gets it. Effort: Medium.
- **Left out:** A finger that scrolls during a drag, because one move of the finger cannot both scroll and move the drop line.
- **Wider fix:** C. It covers every list that uses the shared pointer drag.
- **Previous examples:** The edge scroll of the tab row in `src/chat/components/useTabDrag.ts`.
- **Recommendation:** C. One rule then holds for every drag in the app, as the tab row already has it.
- **Action:** ask the user, because each option adds a behaviour that no requirement covers.
