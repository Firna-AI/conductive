# Arrow keys can reverse after the panel moves

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/resize-popup-kd67`, review round 1, finding 1.
- **Location:** `src/shell/layout/useResizeHandle.ts:86` and `:113`, where the shared hook reads the direction. `src/chat/explain/usePopoverResize.ts:96-110`, the measure in `start()`, and `:142-147`, the direction of the width handle. `src/chat/explain/popover-place.ts:137-141`, the observers of `usePopoverLayout`. `src/chat/explain/PopoverResize.tsx`, where `EdgeHandle` and `CornerHandle` draw the stored layout.
- **Reason:** The bug needs a change of side with no input, which normal use does not meet, and its fix costs the same after the merge.

- **Terms:**
  - **Explain popover:** the panel that `src/chat/explain/ExplainPopover.tsx` draws by the marked text in the workspace chat, with the chat of an explanation.
  - **Mark:** the lasting highlight of an explained quote in the parent chat, with a box that `AnchorBox` in `src/chat/explain/MarkParts.tsx` draws.
  - **Free edge:** an edge of the panel away from its mark, which a handle moves.
  - **Layout:** the free edges and the rooms of the panel, which `popoverLayout` in `src/chat/explain/popover-edges.ts` measures and `usePopoverLayout` keeps.
  - **Silent side change:** a move of the panel to the other side of its mark with no event that `usePopoverLayout` hears.
- **Background:**
  - On a computer, the member resizes the popover with a handle on each free edge and a corner between them. On 24 November 2026, the user chose these handles, built on one shared handle hook. The protocol names this choice popover resize decision 1 J.
  - `docs/protocol/explain-popover.md`, under "The size on a computer", says that Left and Right move the side edge in the direction of the arrow.
  - At the start of its mark, the panel has a free right edge. At the end of its mark, it has a free left edge.
  - `useResizeHandle` in `src/shell/layout/useResizeHandle.ts` is the shared hook. The column handles, the split of the right column, and the popover handles use it. Each axis gives it a `sign`: 1 when a move right or down grows the panel, and -1 otherwise.
  - `usePopoverResize` in `src/chat/explain/usePopoverResize.ts` builds the width axis at each render. Its `sign` comes from the stored layout: 1 at the start of the mark, and -1 at the end.
  - At the start of each key or drag, `start()` in `usePopoverResize.ts` measures the layout again. The starting size, the room, and the side that the panel keeps come from that measure.
  - The hook reads `sign` before `start()` runs. A key becomes a signed move at line 113 of `useResizeHandle.ts`. A pointer drag takes its factor at line 86, and `axis.drag()` measures only at line 87.
  - `usePopoverLayout` measures again after a size change of the panel or of the box of its mark. It also measures after a scroll and after a resize of the window. `ExplainPopover.tsx` measures when the pointer or the focus comes into the panel.
  - ⌘B or `[` on a Mac, and Ctrl+B or `[` on Windows and Linux, hide or show the sidebar. `toggleSidebar` in `src/app/panels.ts` only flips whether the sidebar shows, so the focus stays where it is.
  - The toggle moves the chat, and the box of the mark moves with its message. That box keeps its size while the chat keeps its width. The panel keeps its size, and no scroll and no resize of the window occur.
  - With CSS anchor positioning, the browser keeps the panel at its mark, and it can put the panel on the other side of the mark. The stored layout then keeps the old side.
- **Problem:** After a silent side change, the first key or drag takes the direction of the old side. So the free edge moves against the arrow or against the pointer. Until that input, the focused grip, the corner, and the `aria-valuemax` of the width handle also keep the old edges and the old room.
- **Evidence:**
  - A read of the code at commit `7d82811e9` shows the order above. The hook reads `sign`, and then `start()` measures.
  - A Node run at the same commit used `dividerMove` in `src/shell/layout/divider-move.ts` and `moveInRange` in `src/app/panel-drag.ts`. Right with the sign -1 gives a move of -8 px, and the width goes from 600 px to 592 px. With the sign 1, Right gives 608 px.
  - In both directions of a side change, Right then moves the free edge 8 px to the left. The browser keeps that width as the chosen width.
  - Nobody reproduced the side change in a browser yet. These steps try it on a computer:
    1. Open the popover of a mark in the workspace chat.
    2. Press Tab until the width handle has the focus. Keep the pointer outside the panel.
    3. Toggle the sidebar with its shortcut, so that the panel moves to the other side of its mark. The place of the mark and the width of the window decide whether a toggle does that.
    4. Press Right.
- **Impact if no action:** The member sees the panel move against the arrow, and a key step keeps that wrong width for the next popovers. A screen reader gives the old range of the width handle.
- **Root question:** How can the grip that the member sees, and the direction of each key or drag, stay on the free edge when the panel changes sides with no input?
- **Options:**
  - **A.** Measure again when the sidebar or the right column shows or hides. This covers those two toggles. Each other change that moves the mark needs a new signal. Effort: Small.
  - **B.** Give each input its direction, its starting size, and its room from one measure at its start. The shared hook takes them from that measure. The column handles in `src/shell/layout/ResizeHandle.tsx` and `src/shell/layout/SplitHandle.tsx` supply their fixed directions. Add a mounted regression test that moves the boxes after the focus. Effort: Small.
  - **C.** Use one calculation to place the panel and to give the handles their directions. This changes both placement paths of the panel, and it needs wider layout checks. Effort: Medium.
  - **D.** Observe the box of the chat that scrolls the mark, with the resize observer of `usePopoverLayout`. `scrollParent` in `src/chat/explain/scroll-parent.ts` finds that box. A toggle of the sidebar or of the right column changes its width, so the handles move to the new free edges with no input. A move of the mark that changes no box size stays unseen. Effort: Small.
  - **E.** Add a guard. An input that measures another side than the drawn side only draws the handles again, and it changes no size. This adds a behaviour that no requirement covers, a key that does nothing, so it needs the user's decision. Effort: Small.
  - **F.** Apply B and D together. Each input takes its direction from the same measure as its size and its room. The drawn handles follow the toggles of the sidebar and the right column with no input. Effort: Medium.
  - **G.** Track every move of the mark, for example with an `IntersectionObserver` around its box. The `autoUpdate` function of Floating UI works this way. The repository does not use that library, so the fix builds the observer or adds a dependency. Effort: Medium.
- **Left out:**
  - More measures in the next animation frames. Each run of frames still needs an event to start it, and a silent side change gives none.
  - Change nothing. The first input after a silent side change stays at risk.
- **Wider fix:** F. Each input reads its direction from the same measure as its size and its room. So no input can take the direction of an old side.
- **Previous examples:** The change that added the resize handles met the same class. A browser check found the handles on the old edges after a resize of the window. The page laid its columns out again one frame later, with no event for the popover. The fix measures again in the next frames until the layout settles, as `settleFrames` in `src/chat/explain/popover-place.ts` says. It also measures when the pointer or the focus comes into the panel.
- **Related:**
  - `plans/follow-ups/explain-popover-equal-width-side.md`: the same code. Both items read the side in `start()` of `usePopoverResize.ts`. Option C here and option C there are one change.
  - `plans/follow-ups/explain-popover-placement-paths-flip-apart.md`: the same code. Option C here changes both placement paths, and that item says that they choose the side 6 px apart.
- **Recommendation:** F. B makes every input follow the measured side, and D keeps the drawn handles on the free edge after the common toggles.
- **Action:** fix after merge, apply F, because a Medium product bug with the likelihood Rare waits for a later branch.
