# Resize the Explain popover

Status: Active. On branch `calummoore/resize-popup-kd67`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On a computer, the popover of an explanation is a panel by its mark. It is
400 px wide and at most 420 px high. A long answer shows only a few lines
at a time, so the member scrolls a small box or presses Expand, which
hides the parent chat. This change lets the member drag the free edges of
the panel to make it larger or smaller. The browser keeps the size for
the next popovers. The panel still opens by its mark and never covers the
marked text. The phone sheet does not change, because a drag of its
handle already takes it to full height.

Contract owners:

- [Explain](../docs/protocol/explain.md), section "The popover".
- The [Explain README](../src/chat/explain/README.md).
- The [chat design](../docs/mockups/design-chat.md) and the public
  [sessions guide](../src/marketing/docs/sessions-and-chat.md).

## Terms

- **Popover:** the panel by a mark that shows the chat of an
  explanation. `src/chat/explain/ExplainPopover.tsx` draws it.
- **Mark:** the lasting highlight of an explained quote in the chat.
- **Free edge:** an edge of the panel that is not at its mark. Below the
  mark, the bottom edge is free. Above the mark, the top edge is free.
  From the start of the mark, the right edge is free. Where the panel ends
  at the end of the mark, the left edge is free.
- **Anchor positioning:** the CSS that keeps the panel at the box of the
  open mark. A browser without it gets the same place from `placePanel` in
  `src/chat/explain/popover-place.ts`.

## Decisions

A popover resize decision number names a decision of this change. The
protocol docs cite it so, as
[Decision numbers](../docs/architecture.md#decision-numbers) says. The
options check of 24 November 2026 reworded the root question, added the
options I, J, and K, and changed the recommendation from D to J. Its
report is in `.context/explain-popover-resize/options-check-report.md`.

### 1. Explain popover cannot change size

- **Answer:** D, on 24 November 2026. The options check then added J,
  which is D on shared handle code. The choice between D and J waits for
  the user.
- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/ui/components/explain/ExplainPopover.module.css`
  line 19, `src/chat/explain/popover-place.ts` line 8.
- **Background:** Anchor positioning keeps the panel at its mark, below
  it or above it where the frame has more room. A press outside the panel
  closes it. A press that starts inside the panel keeps it.
- **Problem:** A member cannot make the panel larger or smaller. A long
  answer shows only a few lines at a time.
- **Impact if no action:** Members scroll a small box, or press Expand and
  lose the parent chat.
- **Root question:** How can a member on a computer read a long answer by
  its mark and still see the parent chat around it?
- **Options:**
  - **B.** Raise the fixed limits, with no control. Every long answer
    covers more of the chat, and no member can choose. Effort: Small.
  - **C.** A header button switches between the normal size and a tall
    size, which the browser keeps. Only two sizes, and a third icon by
    Expand. Effort: Medium.
  - **D.** Drag handles on the free edges and on their corner, which the
    keys also move. The browser keeps one size for all popovers. The code
    must find the free edges, and a drag must not push the panel to the
    other side of the mark. Effort: Medium.
  - **J.** D, built on one shared handle. `src/shell/layout/ResizeHandle.tsx`
    and `src/shell/layout/SplitHandle.tsx` each have their own copy of the
    pointer drag and the keys. One hook takes that code, and the column
    handles and the popover handles all use it. One stored-size class
    takes the storage rule that `PanelLayout` and `ColumnSplit` repeat.
    The member sees the same feature as D. Cost: a refactor of the two
    column handles, which their tests cover. Effort: Medium.
  - **K.** D with the height handle only. The width stays 400 px. No width
    rule, no corner, and no jump to the other side of the mark. Wide code
    blocks and tables still scroll sideways. Effort: Medium.
  - **I.** D, with the size saved on the account. The size then follows
    the member to another browser and the Mac app. Cost: a migration of
    the `user_preferences` table, a Worker route, a change to the Privacy
    page, and a rule that differs from the column widths. Effort: Large.
- **Left out:**
  - Change nothing: the panel stays too small.
  - The browser's own `resize: both`: its grip is always at the bottom
    right, so above the mark the panel grows away from it. It has no keys.
  - Shorter answers from the prompt: the member still cannot see more.
  - The answer in a side panel: it replaces the popover by the mark that
    the user chose on 20 November 2026.
  - A panel that moves: it can cover the marked text.
- **Wider fix:** J. One change to the keys, the steps, the drag end, or
  the storage then reaches every handle of the app.
- **Previous examples:** The column widths in `src/app/panels.ts`, and the
  split of the right column from commit `ade62e35e`. Both made a fixed
  panel resizable, with a size that the browser keeps.
- **Recommendation:** J, which replaces the first recommendation, D. It
  gives the feature of D, and it adds no third copy of the handle code.

## Design calls

All of these are my calls, made on 24 November 2026.

- **One size for all popovers.** The browser keeps one width and one
  height under `conductive.explain-width` and `conductive.explain-height`,
  as it keeps the column widths. Reason: the next long answer opens at
  the size that the member chose. A refused storage keeps the size until
  the page closes.
- **The height stays a highest height.** The chosen height replaces the
  420 px limit, so a short answer still gets a short panel. While a drag
  runs, and until that popover closes, the panel keeps the dragged
  height, so the edge follows the pointer. Reason: the edge must follow
  the pointer, and a short answer must not open in a tall empty box.
- **Limits.** The width goes from 320 px to 720 px. The height goes from
  200 px to 960 px. The room on the side of the mark, less the 6 px
  margins, still caps the height, as today. The defaults stay 400 px by
  420 px. Reason: 200 px holds the header, the field, and a few lines.
  720 px keeps it a panel.
- **A panel with no shown mark** stands 64 px below the top of the frame.
  Its height also stops 12 px above the bottom of the frame. Reason:
  otherwise a tall chosen height cuts off the follow-up field.
- **The width keeps its side.** A drag stops where the panel would no
  longer fit on its side of the mark, so the panel never jumps to the
  other side while it moves. A kept width shows at most as wide as the
  larger room on the two sides of the mark, and at most as wide as the
  frame less the margins. Reason: a jump under the pointer loses the
  drag. A panel that fits on neither side would pass the end of the frame
  and hide Close.
- **Three handles.** One handle sits on the free top or bottom edge. One
  sits on the free left or right edge. A corner handle between them moves
  both. A panel with no shown mark stands at the top right, so its bottom
  and left edges are free. Reason: the edges at the mark cannot move.
- **Keys.** Each edge handle is a separator in the order of Tab, after the
  follow-up field. Up and Down move the height handle. Left and Right move
  the width handle. Shift takes a larger step, and Home and End go to the
  ends of the range, as on the column handles. The corner takes only the
  pointer. Escape on a handle still closes the popover. Reason: one rule
  for every handle of the app.
- **Look.** The handles draw the hairline and grip of the column handles
  on hover, on focus, and while a drag runs. They lie inside the card,
  because the card cuts off what passes its edge. The grip uses the
  strong neutral border colour, not the accent, because it sits on the
  edge of a card. The pointer shows the resize cursor of each edge.
- **Labels.** The handles are named "Resize the height of the panel" and
  "Resize the width of the panel", in
  `src/ui/components/explain/explainCopy.ts`.
- **No reset.** No control sets the defaults again, as the column handles
  have none. Home and End reach the ends of the range.
- **Read-only workspaces** show the handles too, because a resize changes
  nothing in the workspace.
- **A drag that ends where it started** stores nothing, as on the column
  handles.

## Components

- `src/app/panels.ts` and a new `src/app/explain-size.ts`: the store of
  the chosen width and height, with the browser storage and the rule of
  each move, as `PanelLayout` has for the columns. `usePanelLayout` gives
  it. A hook gives a store for the page where the panel layout is
  missing, such as the test kits and the chat development page.
- `src/chat/explain/popover-edges.ts`: the free edges from the boxes of
  the panel, the mark, and the frame, and the room for the width on the
  side of the mark.
- `src/chat/explain/PopoverResize.tsx`: the three handles, with the drag
  and the keys.
- `src/chat/explain/ExplainPopover.tsx`: it sets the chosen size as CSS
  custom properties of the panel, finds the free edges after each layout,
  scroll, and resize in the next frame, and shows the handles on a
  computer.
- `src/chat/explain/popover-place.ts`: `placePanel` uses the chosen
  height in place of the fixed 420 px.
- `src/ui/components/explain/ExplainPopover.module.css`: the width and the
  height from the custom properties, and the look of the handles, which
  the mockups share.
- With J only: one hook in `src/shell/layout/` takes the pointer drag and
  the keys of `ResizeHandle.tsx` and `SplitHandle.tsx`, and the popover
  handles use it too. One stored-size class in `src/app/` takes the
  storage rule of `PanelLayout` and `ColumnSplit`, and the store of the
  popover size uses it.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The chat mockups show a resized popover with a focused handle.

- [ ] Add the handles to the mockup popover in
      `docs/mockups/src/components/explain/ExplainPopover.tsx`, with the
      shared CSS. Draw them at rest, and the height handle with focus.
- [ ] Add the state `popover-resized` to `explainOpen` in
      `docs/mockups/src/screens/explainState.ts`. It draws the panel at
      560 px by 600 px with the height handle in focus. Add its page under
      `docs/mockups/src/entries/app/chat/explain/popover/resized/`.
- [ ] Update the popover lines of `docs/mockups/design-chat.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages at
      `http://127.0.0.1:4173`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update "The popover" in `docs/protocol/explain.md`: the default
      size, the drag of the free edges and their keys, the limits, the size
      that the browser keeps, and popover resize decision 1.
- [ ] Update the popover lines of `src/chat/explain/README.md`.
- [ ] Update "Explain chat text" in
      `src/marketing/docs/sessions-and-chat.md`.
- [ ] Read the Terms and the Privacy pages in full. Update each sentence
      that restates a changed fact.

## Milestone 3: The resize of the popover

Tags: ui

Depends on: 2

- [ ] With J only: move the drag and the keys of the column handles into
      the shared hook, and the storage rule into the shared stored-size
      class. The tests of the column handles and of the split must pass
      with no change of what they check.
- [ ] Add the store of the chosen size, with its tests for the storage,
      the limits, a drag, and the keys.
- [ ] Add `popover-edges.ts` with its tests for each placement, the
      panel with no shown mark, and the room of the width.
- [ ] Add the handles and wire them into `ExplainPopover.tsx`, the shared
      CSS, and `placePanel`.
- [ ] Add DOM tests: the handles show on a computer and not on a phone,
      a key changes the size and the storage, and a press on a handle
      keeps the popover open.
- [ ] Update the comments of `ExplainPopover.tsx` and of the shared CSS.
- [ ] Check in a browser with anchor positioning: below and above the
      mark, at the end of the frame, with no shown mark, and a narrow
      window. Check the fallback by a forced `placePanel`. Save the
      screenshots under `.context/explain-popover-resize/`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, `npm run check`, and the Rust checks only if
      the Cargo workspace changed.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.
