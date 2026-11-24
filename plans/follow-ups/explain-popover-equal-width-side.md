# Equal widths lose the fixed edge

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/resize-popup-kd67`, review round 1, finding 2.
- **Location:** `src/chat/explain/popover-edges.ts:67-68`, the `atStart` comparison of `popoverLayout`. `src/chat/explain/usePopoverResize.ts:99`, where `start()` keeps the measured side. `docs/protocol/explain-popover.md:132-135`, the rule that a move of the width keeps its side.
- **Reason:** The bug needs a panel exactly as wide as its mark, and its fix changes both placement paths of the panel.

- **Terms:**
  - **Explain popover:** the panel that `src/chat/explain/ExplainPopover.tsx` draws by the marked text in the workspace chat, with the chat of an explanation.
  - **Mark:** the lasting highlight of an explained quote in the parent chat, with a box that the popover keeps to.
  - **Side of the mark:** the start side, where the panel starts where its mark starts, or the end side, where it ends where its mark ends.
  - **Width room:** the widest that the panel can be and still fit on its side of the mark, `widthRoom` of `popoverLayout` in `src/chat/explain/popover-edges.ts`.
  - **Placement paths:** CSS anchor positioning, or `placePanel` in `src/chat/explain/popover-place.ts` in a browser without anchor positioning.
- **Background:**
  - On a computer, the member drags the free edges of the popover to change its size. On 24 November 2026, the user chose these handles, built on one shared handle hook. The protocol names this choice popover resize decision 1 J.
  - On the start side, the right edge of the panel is free. On the end side, the left edge is free. The width handle lies on the free edge.
  - The panel starts at the start of its mark. Where it would pass the end of the window, it ends at the end of the mark instead.
  - `docs/protocol/explain-popover.md` gives the rule under "The size on a computer". It says: "A move of the width, by a drag or by a key, never moves the panel to the other side of the mark."
  - `popoverLayout` finds the side from the boxes of the panel and the mark. It takes the start side when the distance between the left edges is not more than the distance between the right edges. So a tie gives the start side.
  - `start()` in `src/chat/explain/usePopoverResize.ts` measures the layout at the start of each move of the width. It keeps the measured side for the open popover.
  - On the end side, the class `endFirst` of `src/chat/explain/explain.module.css` makes the browser try the end of the mark first. `placePanel` gets the same side.
- **Problem:** A panel exactly as wide as its mark has its edges on the edges of the mark. Both distances are then zero, and `popoverLayout` reports the start side. The width handle moves to the right edge. The next move of the width then keeps the start side, although the member kept the end side.
- **Evidence:**
  - A Node run of `popoverLayout` at commit `7d82811e9` gives this table. The frame is 1000 px wide. The mark goes from 570 px to 980 px, so it is 410 px wide. Each panel ends at 980 px, at the end of the mark.

    | Panel width | Panel box | `inline` | `widthRoom` | `widthCap` |
    | --- | --- | --- | --- | --- |
    | 600 px | 380 px to 980 px | `left` | 974 px | 974 px |
    | 480 px | 500 px to 980 px | `left` | 974 px | 974 px |
    | 411 px | 569 px to 980 px | `left` | 974 px | 974 px |
    | 410 px | 570 px to 980 px | `right` | 424 px | 974 px |
    | 409 px | 571 px to 980 px | `left` | 974 px | 974 px |

  - `inline` names the free edge. `left` is the end side, and `right` is the start side.
  - At the tie, the width room drops from 974 px to 424 px. 974 px is the room of the end side, and 424 px is the room of the start side.
  - From the tie, End stops at 424 px. Without the tie, End goes to 720 px, the top of the range. `moveInRange` in `src/app/panel-drag.ts` gives both results.
  - A grow from the tie moves the right edge. The member kept that edge at the end of the mark.
  - During a drag, `usePopoverLayout` measures each new size. At the width of the mark, the grip draws on the right edge.
- **Impact if no action:** The grip can jump to the other edge during a drag. A later move of the width can move the edge that the member kept fixed, and it stops at the smaller room.
- **Root question:** How should the popover keep its fixed edge when both sides line up with the mark?
- **Options:**
  - **A.** At a tie of the edges, use the side that the current move keeps. This adds a tie rule to the comparison of `popoverLayout`. Effort: Small.
  - **B.** Keep the last side that distinct edges showed, until the edges part again. This needs a state for each open panel, and a first choice before the first clear reading. Effort: Medium.
  - **C.** Decide the side once, from the rooms and the side that the panel keeps. Give that side to both placement paths and to the handles. Add a regression test at equal widths. Effort: Medium.
    - Take the side from the rooms and the kept side. Change the side only when the kept side no longer fits.
    - Use one fit test for both paths. Today the two paths use different tests, as `plans/follow-ups/explain-popover-placement-paths-flip-apart.md` says.
    - Today the CSS path gives no side to `usePopoverLayout`. `usePopoverResize.ts:69` passes `place` only in a browser without anchor positioning.
- **Left out:**
  - Skip the width of the mark. The member then cannot choose every size of the supported range.
  - Prefer the end side at a tie, with `<` in place of `<=`. A panel on the start side then takes the end side at equal widths, so the defect only moves.
  - Keep the edge of the width handle while the handle has the focus. The tie still sets the side at the next move after the focus leaves. The handle must also follow a real change of side, as `plans/follow-ups/explain-popover-side-change-reverses-keys.md` says.
  - Predict the side from the rooms with the rule of `placePanel`. In the CSS path, the browser flips at the edge of the frame, and `placePanel` flips 6 px inside it. So a prediction can name the wrong side, and C is better on every point.
- **Wider fix:** C. The handles use the side that placement chose, also when the two positions coincide.
- **Previous examples:** The change that added the resize handles met the same class. A panel at the end of its mark that got narrower fitted at the start again, and it jumped there. The fix made each move of the width keep the side that the panel shows, through `side` in `usePopoverResize.ts` and the class `endFirst`.
- **Related:**
  - `plans/follow-ups/explain-popover-side-change-reverses-keys.md`: the same code. Both items read the side in `start()` of `usePopoverResize.ts`. Option C here and option C there are one change.
  - `plans/follow-ups/explain-popover-placement-paths-flip-apart.md`: a shared wider fix. One fit test for both paths, as option C here asks, also ends the 6 px difference of that item.
  - `plans/follow-ups/explain-popover-fallback-edge-lags-width.md`: the same code. Option B there sets the inset of the side that option C here decides.
- **Recommendation:** C. It gives both placement paths and the handles the same side, so a tie of the boxes cannot change it.
- **Action:** fix after merge, apply C, because the likelihood is Rare: the defect needs an exact width match, and the fix changes both placement paths.
