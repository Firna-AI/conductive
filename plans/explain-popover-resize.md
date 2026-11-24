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

- [The Explain popover](../docs/protocol/explain-popover.md), which
  took the section "The popover" of
  [Explain](../docs/protocol/explain.md) on 24 November 2026.
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

- **Answer:** J, on 24 November 2026. The user first answered D on the
  same day. The options check then added J, which is D on shared handle
  code, and the user chose J.
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
- **The width keeps its side.** A drag or a key move stops where the
  panel would no longer fit on its side of the mark, so the panel never
  jumps to the other side while it moves. The key stop was added on 24
  November 2026 from the Milestone 2 docs work: otherwise Right or End
  near the end of the frame moves the panel, and the arrows turn round. A kept width shows at most as wide as the
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
  because the card cuts off what passes its edge. Neither takes the
  accent, because they sit on the edge of a card. The hairline uses the
  strong neutral border colour, and the grip uses the muted ink, as
  "A grip in the muted ink" below says. The pointer shows the resize
  cursor of each edge.
- **Labels.** The handles are named "Resize the height of the panel" and
  "Resize the width of the panel", in
  `src/ui/components/explain/explainCopy.ts`.
- **No reset.** No control sets the defaults again, as the column handles
  have none. Home and End reach the ends of the range.
- **Read-only workspaces** show the handles too, because a resize changes
  nothing in the workspace.
- **A drag that ends where it started** stores nothing, as on the column
  handles.

The mockups of Milestone 1 showed the problems that the next calls
settle. These are my calls too, made on 24 November 2026.

- **Each move starts from the shown size.** A move of a handle, by the
  pointer or by a key, starts from the size that the panel shows. A move
  of the height stops at the room on the side of the mark. The value of
  a handle is the size that shows. Reason: the room by the mark often
  caps a kept height. The catalogue frame, 718 px high, shows only 416 px
  of a kept 600 px below the mark. A move from the kept size would then
  change nothing that the member sees. The column handles also start
  from the width that shows.
- **A key keeps the height too.** From the first move of a handle, by a
  drag or by a key, until the popover closes, the panel keeps the chosen
  height. Reason: over a short answer, a key that changes only the
  highest height moves nothing that the member sees.
- **The width handle lies over the scrollbar.** The width handle on the
  right edge covers the outer 7 px of the scrollbar of the chat, which
  lies at that edge. A press there starts a drag of the width, and the
  rest of the scrollbar still works. Reason: the handle must lie inside
  the card, and a gap at the edge for the scrollbar would push the chat
  away from the edge of the card.
- **A grip in the muted ink.** The grip takes the muted ink colour,
  `--ui-muted`, in place of the strong neutral border colour of the first
  look, and it lies on the hairline. Reason: the grip is the only focus
  mark of a handle. The border colour stands out only about 1.5:1 from
  the card, so the focused height handle of the mockups was hard to see,
  most of all in dark. The muted ink stands out about 6:1 in both
  schemes, and it is not the accent. On the hairline, the grip keeps
  3 px clear of the follow-up field.

The work of Milestone 3 settled the next calls. These are my calls too,
made on 24 November 2026.

- **The moved height starts with a move of the height.** The panel keeps
  its moved height from the first move of the height handle or of the
  corner. A move of the width alone leaves the height to the chat. Reason:
  only a move of the height has a moved height to keep, and a fixed height
  after a move of the width makes a short answer jump to the chosen
  height.
- **A narrower panel keeps its side too.** Each move of the width makes
  the side of the mark that the panel shows the side that it tries first,
  until the popover closes. Reason: a panel at the end of its mark that
  gets narrower fits at the start again, and it would jump there. A
  panel with no shown mark keeps no side, so its mark, when it shows
  again, gets the usual place.
- **The popover keeps its own moved size.** While a drag runs, the open
  popover shows the dragged size, and the chosen size of all popovers
  changes only at each key step and at the end of each drag. Reason: a
  drag back to its start must show the panel as before, also over a
  short answer, whose panel is lower than the chosen height.

- **A grow from under the range.** A grow from a panel that shows
  smaller than the range goes at least to the smallest size, or to the
  room where the room is smaller, and the browser keeps a size in the
  range. My call, on 24 November 2026, from Milestone 3. Reason: the
  protocol sets the range, and one key on a 150 px panel kept 158 px.
- **Only a move of the height fixes the height.** The protocol sentence
  now says so. My call, on 24 November 2026, from Milestone 3. Reason:
  the reason of that rule, an edge that follows the pointer, applies only
  to a move of the height.

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
  and the keys. `src/chat/explain/usePopoverResize.ts`: the size of the
  panel, the side that it keeps, and the moves of its handles.
- `src/chat/explain/ExplainPopover.tsx`: it sets the chosen size as CSS
  custom properties of the panel, finds the free edges after each layout,
  scroll, and resize in the next frame, and shows the handles on a
  computer.
- `src/chat/explain/popover-place.ts`: `placePanel` uses the chosen
  height in place of the fixed 420 px.
- `src/ui/components/explain/ExplainPopover.module.css`: the width and the
  height from the custom properties, and the look of the handles, which
  the mockups share. `.panel` reads `--explain-width` and
  `--explain-height`. `popoverSizeStyle` of
  `src/ui/components/explain/popoverSize.ts` sets them in the app and in
  the mockups, with the default size where no size is given, so the CSS
  holds no default size. `fixedHeight`
  holds the chosen height. `edge` with `edgeTop`, `edgeBottom`,
  `edgeLeft`, or `edgeRight` draws an edge handle. `corner` with
  `cornerTopLeft`, `cornerTopRight`, `cornerBottomLeft`, or
  `cornerBottomRight` draws the corner. `resizing` marks the handle of a
  drag that runs.
- `docs/mockups/src/components/explain/PopoverResize.tsx`: the handles of
  the mockup popover below its mark, with the default size and the ranges
  for now.
- One hook, `useResizeHandle` in `src/shell/layout/useResizeHandle.ts`,
  takes the pointer drag and the keys of `ResizeHandle.tsx` and
  `SplitHandle.tsx`, and the popover handles use it too. One stored-size
  class, `StoredSize` in `src/app/stored-size.ts`, takes the storage rule
  of `PanelLayout` and `ColumnSplit`, and the store of the popover size
  uses it.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The chat mockups show a resized popover with a focused handle.

- [x] Add the handles to the mockup popover in
      `docs/mockups/src/components/explain/ExplainPopover.tsx`, with the
      shared CSS. Draw them at rest, and the height handle with focus.
- [x] Add the state `popover-resized` to `explainOpen` in
      `docs/mockups/src/screens/explainState.ts`. It draws the panel at
      560 px by 600 px with the height handle in focus. Add its page under
      `docs/mockups/src/entries/app/chat/explain/popover/resized/`.
- [x] Update the popover lines of `docs/mockups/design-chat.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages at
      `http://127.0.0.1:4173`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

The screenshots of the smoke test are in `.context/explain-popover-resize/`,
such as `resized-popover-light.png`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Update "The popover" in `docs/protocol/explain.md`: the default
      size, the drag of the free edges and their keys, the limits, the size
      that the browser keeps, and popover resize decision 1.
- [x] Update the popover lines of `src/chat/explain/README.md`.
- [x] Update "Explain chat text" in
      `src/marketing/docs/sessions-and-chat.md`.
- [x] Read the Terms and the Privacy pages in full. Update each sentence
      that restates a changed fact.

## Milestone 3: The resize of the popover

Tags: ui

Depends on: 2

- [x] Move the drag and the keys of the column handles into
      the shared hook, and the storage rule into the shared stored-size
      class. The tests of the column handles and of the split must pass
      with no change of what they check.
- [x] Add the store of the chosen size, with its tests for the storage,
      the limits, a drag, and the keys.
- [x] Keep one copy of the default size and the ranges of the handles.
      `docs/mockups/src/components/explain/PopoverResize.tsx` has them
      now. Move them where the store and the mockup handles can both
      import them, such as `src/ui/components/explain/`.
- [x] Start each move of a handle, by the pointer or by a key, from the
      size that the panel shows. Stop a move of the height at the room on
      the side of the mark. Test both, with a kept height that the room
      caps.
- [x] Add `popover-edges.ts` with its tests for each placement, the
      panel with no shown mark, and the room of the width.
- [x] Add the handles and wire them into `ExplainPopover.tsx`, the shared
      CSS, and `placePanel`.
- [x] Add DOM tests: the handles show on a computer and not on a phone,
      a key changes the size and the storage, and a press on a handle
      keeps the popover open.
- [x] Update the comments of `ExplainPopover.tsx` and of the shared CSS.
- [x] Check in a browser with anchor positioning: below and above the
      mark, at the end of the frame, with no shown mark, and a narrow
      window. Check the fallback by a forced `placePanel`. Check that the
      scrollbar of the chat still drags beside the width handle. Save the
      screenshots under `.context/explain-popover-resize/`.
- [x] Find the free edges again in the next frames until the layout
      settles, and when the pointer or the focus comes into the panel.
      The browser check found the handles on the wrong edges after a
      resize of the window, because the page laid its columns out again
      one frame later, with no event for the popover.
- [x] Make the mockup type `ResizeAxis` local. The exports check rejects
      it as an export that no module imports.

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
