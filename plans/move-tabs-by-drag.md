# Move tabs by drag

Status: Active. On branch `calummoore/tab-drag-and-drop`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The tab row above the centre column of a workspace holds the session tabs,
then the file and diff tabs. No tab can move. The saved view of each user
already keeps one order for all tabs, but the row always draws the sessions
first. This change lets the user drag any tab to any place in the row
(decision 142). The order saves in the saved view, so it stays after a
reload and on the user's other devices. A new tab of any kind opens at the
end of the row. The mockups already draw a new session after the open file
tab, so the row then matches them.

Two decisions are open: how a full row shows its last tabs (decision 143),
and how a user who does not drag moves a tab (decision 144). The change does
not cover a drag out of the row into a split view or a new window, pinned
tabs, a live update of the order in a second window, or new close rules. The
"File Preview Tabs Brainstorm" workspace has an open item about a temporary
tab for a file that the user only glances at. That item changes the same
row. The change that merges second aligns the drag with temporary tabs.

## Decision 142: Where in the row a tab can move

Added on 8 November 2026 from the brainstorm of this change.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `src/chat/components/SessionTabs.tsx:105` and
  `docs/protocol/chat-and-events.md:60`.
- **Background:** The saved view keeps one order for all tabs. The row
  draws the session tabs first, then the file and diff tabs as one block.
  The chat protocol says that session tabs show in the order of creation
  (decision 77). The workspace list already moves rows by drag and drop.
- **Problem:** No tab can move. To change the order, the user must close
  tabs and open them again.
- **Impact if no action:** The row keeps the order in which the user
  opened things.
- **Root question:** Where in the row can the user move each tab?
- **Options:**
  - **A.** Drag a tab only inside its group: sessions among sessions, and
    files among files. Chats always stay at the start. A file never goes
    before a chat. Effort: Large.
  - **B.** Drag any tab to any place in the row. The row draws the one
    order of the saved view. A new tab opens at the end of the row, so a
    new session opens after the open files. Effort: Large.
  - **C.** Added by the options check: B, and the row keeps the shown tab
    in view. The row scrolls to each new or shown tab, and a drag near an
    end scrolls it. The mockups then draw a row that scrolls. Effort:
    Large.
- **Left out:**
  - Drag only the file tabs, because the session tabs could not move.
  - A Pin action, because it gives no free order and no drag.
  - An automatic order, because the user chooses the order. Decision 77
    already chose the order of creation over an order of activity.
  - Move actions with no drag, because the user asked for drag. Decision
    144 asks how a user who does not drag moves a tab.
  - An order that only the browser keeps, because `docs/architecture.md`
    keeps all state except the panel widths on the server.
  - A drag out to a split view or a new window, because it is B plus a
    split view and windows that the app does not have, and the task does
    not ask for them.
  - Two rows, one for chats and one for files, because decision 19 and the
    mockups put the sessions beside the files in one row. Two rows also
    keep the rule of A.
  - The two groups swap places as blocks, because a drop across the border
    moves tabs that the user did not drag.
  - B with a new session after the last session tab, because the mockups
    draw a new session last, after the open file.
  - Change nothing, because it fails the goal.
- **Shared assumptions:**
  - The user moves a tab by dragging it. Source: the task message.
  - The saved view keeps the order. Source: `docs/architecture.md`. The
    Worker stores the list of tabs as the app sends it, so no option needs
    a Worker change.
  - A new tab opens at the end. Source: decision 77 for sessions, and the
    code for files. The mockups give the reason: they draw each new tab
    last.
  - A tab moves only inside the tab row. Source: the task message.
  - Sessions and files share one row. Source: decision 19.
  - The order belongs to one user in one workspace. Source: the code, which
    keeps one saved view for each user and workspace.
  - A phone row shows only session tabs. Source: the code and the mockups.
  - Every tab shows in the row. Source: a comment in the mockup CSS. It
    holds only while every tab fits at its minimum width. C drops it.
- **Wider fix:** None, because this is new behaviour.
- **Previous examples:** Workspace rows move between sections by drag and
  drop in `src/shell/list/useRowDrag.ts`. No earlier plan or workspace
  asked to move tabs.
- **Recommendation:** B. It lets a file go before a chat, as the user's
  screenshot needs, and it works like tabs in a browser.
- **Chosen:** B, by the user on 8 November 2026. It replaces the order of
  creation of decision 77. A new tab still opens at the end of the row.
- **Options check, 8 November 2026:** the check kept B and added C. C also
  answers a second question, how the user reaches a tab that a full row
  hides. Decision 143 asks that question on its own, so the choice of B
  stands.

## Decision 143: A full row hides its last tabs

Added on 8 November 2026 from the options check of decision 142. Open.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review. **Category:** Docs or spec.
- **Location:** `docs/mockups/src/components/workspace/WorkspaceTabs.module.css:14`.
- **Background:** Each tab shrinks to a minimum width: 64 px on desktop and
  44 px on a phone. The shown tab does not shrink on desktop. When the tabs
  still do not fit, the row hides the last ones, because it clips what
  overflows. Today only new file and diff tabs open at the end of the row.
  With decision 142, a new session opens there too. The Rename button shows
  only on the shown session tab, so it can hide with that tab.
- **Problem:** In a full row, a new tab opens out of sight. A hidden tab
  cannot take a click or a drag, and no drop can reach a hidden place.
- **Impact if no action:** A user with many open tabs does not see the tab
  of a new session, and cannot reach the hidden tabs without closing
  others.
- **Root question:** When the tabs do not fit, how does the user keep the
  shown tab in sight and reach every other tab?
- **Options:**
  - **B.** Let the row scroll sideways when the tabs do not fit. The row
    scrolls each new or shown tab into view, and a drag near an end
    scrolls it. A vertical mouse wheel scrolls the row, a fade marks a
    clipped end, and a finger can scroll the row. The mockups change from
    a row where every tab shows to a row that scrolls. Effort: Medium.
  - **C.** Add a button at the end of a full row. Its menu lists the hidden
    tabs, and a click shows one. A shown tab can still hide, with its
    Rename and Close buttons, unless the row also scrolls it into view as
    in B. A drag cannot reach a hidden place. It needs a new menu and a
    mockup. Effort: Medium.
  - **D.** Added by the second options check: let the row wrap onto a
    second line when the tabs do not fit. Every tab shows and takes a
    click and a drop. The chat moves down one line when a tab opens, and
    back up when one closes. On a phone, each line takes 44 px of a short
    screen. The mockups change. Effort: Medium.
- **Left out:**
  - **A.** Keep the row as it is, because it fails the goal: a pointer
    cannot reach a hidden tab, and a new session opens out of sight.
  - Scroll only the shown tab into view, because a pointer still cannot
    reach the other hidden tabs. B and C both need this scroll.
  - A new tab opens next to the shown tab, because decision 142 keeps the
    rule that a new tab opens last, and it reaches no other hidden tab.
  - A smaller minimum width, because it only moves the point where tabs
    hide.
  - Close the oldest tab, because it closes a tab that the user chose. The
    protocol also asks before it closes a session whose turn runs.
  - List the open tabs in the session history menu, because the protocol
    says that the history lists the closed sessions.
  - Temporary tabs for files that the user only glances at, because they
    only delay a full row. That idea is an open item of the "File Preview
    Tabs Brainstorm" workspace.
  - Vertical tabs in a side list, because it replaces the row that
    decisions 19 and 142 build on.
- **Shared assumptions:**
  - Each tab keeps its minimum width. Source: the mockup CSS. The 44 px of
    a phone is the touch minimum.
  - A new tab opens at the end. Source: decision 142.
  - The row keeps one line. Source: the mockups. It is not a requirement,
    because decision 19 asks for one row, not one line. D drops it.
- **Wider fix:** B, because it keeps the shown tab in view whatever put it
  out of sight: a new tab, a pick in the Files panel, a reopened session,
  or a narrower column.
- **Previous examples:** `src/files/ui/LinkTabs.module.css` and
  `src/previews/PreviewToolbar.module.css` scroll a row of tabs sideways,
  with a hidden scrollbar. `src/shell/ui/links.tsx` wraps the tabs of the
  org settings into three columns on a phone.
- **Related:** Decision 142. Its option B opens each new tab at the end,
  where a full row hides it.
- **Recommendation:** B. It keeps the shown tab in sight on one line, and a
  pointer can reach every tab and every drop place. C fits best later, as
  an addition to B.
- **Action:** ask the user, because B and D change the mockups, which draw
  a row where every tab shows, and each option has a real trade-off.
- **Options check, 8 November 2026:** the second check kept B and added D.
  It moved A under Left out, because A fails the goal. It added the wheel,
  the fade, and the touch scroll to B.

## Decision 144: How a user who does not drag moves a tab

Added on 8 November 2026 from the options check of decision 142. Open.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Review. **Category:** Docs or spec.
- **Location:** `src/shell/list/SectionList.tsx:83`.
- **Background:**
  - The workspace list moves a row with Alt and Up or Down, and a screen
    reader hears the new place. A pointer moves a row only by drag.
  - On 5 November 2026, the user's mockup feedback replaced the "Move to
    section" menu action of the workspace list with drag and drop.
  - Browsers on Windows and Linux use Alt with Left or Right for Back and
    Forward. Most browsers give the focus to a clicked button or link, so a
    tab keeps the focus after a click.
  - [WCAG 2.2 success criterion 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html),
    at level AA, asks for a way to do each drag with a pointer and no drag.
    No protocol doc sets a WCAG level.
- **Problem:** A drag alone leaves keyboard users, and pointer users who
  cannot drag, without a way to move a tab. Alt with Left or Right would
  take Back and Forward from a user whose focus is on a tab.
- **Impact if no action:** Either these users cannot move tabs, or Back and
  Forward stop working after a click on a tab.
- **Root question:** How does a user who does not drag move a tab?
- **Options:**
  - **A.** Alt with Left or Right, as Alt with Up or Down moves a workspace
    row. After a click on a tab, these keys move the tab instead of going
    Back or Forward. Effort: Small.
  - **B.** Alt and Shift with Left or Right. No browser uses them for Back
    or Forward. The
    [Orca](https://help.gnome.org/users/orca/stable/commands_structural_navigation.html.en)
    screen reader on Linux uses them to move between table cells. A Linux
    user who switches the keyboard layout with Alt and Shift can lose
    them. Effort: Small.
  - **C.** "Move left", "Move right", "Move to start", and "Move to end" in
    a menu of each tab. The keyboard and a pointer that cannot drag can
    both use it. It needs a new menu on each tab and a mockup. Effort:
    Medium.
  - **D.** Added by the second options check: one control at the end of the
    row opens a list of all tabs, each with the same four moves. A phone
    shows the list as a sheet. The controls sit far from the tab, and the
    list needs a small sheet or dialog. Effort: Medium.
  - **E.** Added by the second options check: B and C together. The keys
    give fast moves, and the menu serves the users that the keys miss.
    Effort: Medium.
  - **F.** Added by the second options check: the shared drag hook also
    holds the move without a drag: the step, the kept focus, and the
    announcement. The keys and any menu call the same step, and the
    workspace list moves its own key move into the hook. It goes with any
    of A to E. Effort: Medium.
- **Left out:**
  - No way to move a tab without a drag, because it fails keyboard users.
    Close and reopen moves a tab only to the end, and the close of a
    running session stops its turn.
  - Ctrl and Shift with Page Up or Page Down, because it is the approach of
    A and B with other keys, and browsers use these keys to move their own
    tabs. Most laptops also need Fn for them.
  - A keyboard grab mode, where one key lifts the tab and the arrows move
    it, because B is better on every point here. The mode still needs keys
    or a menu to start, and screen readers keep the plain arrows for
    reading.
- **Wider fix:** F, because every drag surface on the shared hook then gets
  the same move without a drag, focus, and announcement.
- **Previous examples:** `src/shell/list/SectionList.tsx` moves a workspace
  row with Alt and Up or Down.
- **Recommendation:** B. It gives keyboard users a fast move that does not
  clash with Back and Forward, and it adds no menu action of the kind that
  the user removed from the workspace list. E gives the widest access,
  because only a menu serves pointer users who cannot drag, and Orca
  users. F best protects the codebase, but the list and the row share
  little of the step: their keys, targets, and announcements differ.
- **Action:** ask the user, because the keys are new behaviour that no
  requirement covers, and each option has a real trade-off.
- **Options check, 8 November 2026:** the second check added D, E, and F,
  and recommended E. The agent kept B, for the reason in the
  recommendation.

## Design

### Row order

- The row shows the tabs of the saved view in their order: a session tab
  for each session that has a tab, and a file or diff tab where the host
  draws one. The sessions that have a tab are the open sessions. In a
  read-only workspace, they are the tabs that the browser keeps.
- The saved order holds a place for each open session, and for no other
  session. When the chat loads, and when an open session first arrives,
  the chat adds each missing place at the end. It also drops the place of
  each session that is not open. In a read-only workspace, this changes
  the browser copy only.
- So a new file tab opens after each session that is already there. A
  reopened session opens at the end, also when the saved view still held
  an old place for it.
- A tab that shows but has no place, such as a session of the session
  history that a reader of an archived workspace opens, goes at the end.
- A new tab goes at the end of the saved order, as today: a new session, a
  reopened session, a linked session, and a new file or diff tab.
- A move takes the tab out of the saved order and puts it beside its
  neighbour in the row: before the tab after the drop place, or after the
  last tab. A phone leaves the file tabs out of the row. So a move there
  changes only the place of the dragged session, and each file tab keeps
  its place.
- A move saves through the one writer of the view in the chat, so a later
  write of the chat keeps it. Before the view loads, a move changes
  nothing. In a read-only workspace, a move changes nothing.
- After a move, the open sessions sort by the new order. So Close picks
  its neighbour from the order that the row shows.

### Parts

- `src/chat/state/tab-order.ts`: the row order, the places of the
  sessions, and the move, as pure functions.
- `ChatController.moveTab`: the move and its save.
- `SessionTabs` draws the row. A `renderTab` prop of `WorkspaceChat` and
  `WorkspaceChatView` draws a file or diff tab at its place. It replaces
  `extraTabs`. Without it, the row shows only sessions, as on a phone and
  on the chat development page.
- `FileTabItem` takes the drag props of its list item as plain list item
  props. So the Files code imports nothing from the chat.
- A shared pointer drag hook holds the press, the start after a move or a
  long press, Escape, the click after a drag, and the scroll lock of
  touch. The tab row and the workspace list both use it.
- The tab row measures the tab boxes along the row to find the drop
  place. A lifted copy follows the pointer along the row. The tab keeps
  its place as a faint copy, and a line marks the drop place. The line
  takes no space, so no tab moves during the drag.

### Design calls

The agent made each call below on 8 November 2026.

- Build the drag on pointer events, with no new dependency. Move the
  pointer and touch mechanics of `src/shell/list/useRowDrag.ts` into a
  hook that the list and the tab row share, in `src/app/pointer-drag.ts`,
  beside other hooks that the chat and the shell share, such as
  `useWorkspaceStore`. Reason: one feel, and one place to fix a drag bug.
- A mouse starts a drag after a 4 px move. A finger starts it after a
  450 ms long press. Escape cancels it. Reason: the workspace list uses
  these values.
- On a phone, a long press lifts a session tab. Phones show no file tabs.
  Reason: a long press lifts a workspace row, as
  `docs/protocol/orgs-and-members.md` says.
- The tabs take the touch CSS of the drag surface of the workspace list,
  so a long press opens no link menu and selects no text. A row that
  scrolls sideways under decision 143 uses `touch-action: pan-x`, not the
  `pan-y` of the list. Reason: a finger must still scroll the row.
- A drag does not change the shown tab. The click at the end of a drag
  selects nothing. Reason: a drag in the workspace list opens no
  workspace.
- The look follows the workspace list: a raised lifted tab, a faint copy
  at 0.35 opacity, and a line in the primary colour. Reason: one look for
  every drag in the app. The mockup milestone draws it first.
- A drag starts only on the tab itself, not on its Close or Rename button.
  Reason: those controls keep their own press.
- While a tab shows its rename field, no drag and no move key acts on it.
  Reason: in the field, the arrow keys with Option, or with Option and
  Shift, move the caret or select by word on macOS.
- A read-only workspace moves no tab. Reason: a read-only workspace list
  moves no row, and a move there would last only until the next reload.
- Close keeps its current rules: a closed session shows the next session,
  and a closed file tab shows the next file tab. Reason: a close keeps the
  kind of page that shows, and the chat and the Files screens need no new
  way to show each other's tabs. The options check asked for a decision.
  The agent kept the call, because the user asked only about the order and
  the current rule stays predictable.
- Two windows on one workspace keep "the last save wins", as open and
  close do now. Reason: the saved view has no live update.
- This change does not split the protocol docs that it touches. Reason:
  `plans/follow-ups/protocol-docs-split.md` splits them in one change
  after the open branches merge.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md#sessions).
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md#files-and-changes).
- The [chat README](../src/chat/README.md).
- The [Files README](../src/files/README.md).
- The [workspace screen README](../src/shell/workspace/README.md).

Replaced ways:

- `extraTabs`, one block of tabs after the sessions → `renderTab`, one tab
  at its place in the saved order. Consumers: `src/chat/WorkspaceChat.tsx`,
  `src/chat/components/SessionTabs.tsx`, `src/shell/workspace/ChatArea.tsx`,
  `src/shell/workspace/files/chat-files.tsx`, and `src/chat/README.md`.
  Moved and deleted in Milestone 4.
- The private pointer mechanics of `useRowDrag` → the shared pointer drag
  hook. Consumer: `src/shell/list/useRowDrag.ts`. Moved and deleted in
  Milestone 5.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the drag of a tab and the row after a move, on desktop and on a phone.
The full row waits for decision 143, and a tab menu waits for decision 144.

- [ ] Add the drag states to
      `docs/mockups/src/components/workspace/WorkspaceTabs.tsx` and its
      CSS module: a lifted tab, a faint copy, and a drop line. Take the
      look from the drag of the workspace list.
- [ ] Add a "Move tabs" page under `docs/mockups/src/entries/app/tabs/`,
      beside the Sessions and Files pages, with at most five screens. Each
      screen shows a phone and desktop.
  - [ ] Drag a tab: on desktop, the code file tab moves between the two
        sessions. On a phone, a long press lifts the second session.
  - [ ] After the move: the file tab sits between the two sessions, and a
        new session opens at the end of the row.
  - [ ] A full row, in the form that decision 143 chooses. Waits for
        decision 143.
  - [ ] The menu of a tab or of the row, when decision 144 chooses C, D,
        or E. Waits for decision 144.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages at
      `http://127.0.0.1:4173`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the rules of the row before the code changes.

- [ ] In the Sessions section of `docs/protocol/chat-and-events.md`,
      replace the order of creation with the rules of decision 142: one
      order for all tabs of the row, and a new tab at the end. Add the
      move of any tab by drag, and by a long press on a phone. Add the
      order kept for each user and workspace, and no move in a read-only
      workspace. Give the rejected group order and its reason.
- [ ] Add the rules of decisions 143 and 144 to the same section.
- [ ] In the Files and changes section of
      `docs/protocol/workspaces-and-sandboxes.md`, say that a file or diff
      tab opens at the end of the row. Link to the rules of the row.
- [ ] Add a line to decision 77 in `plans/boat-native-remote-workspaces.md`
      that says decision 142 changed it on 8 November 2026.
- [ ] Check the relative links of each changed Markdown file.

## Milestone 3: Tab order in the chat state

Depends on: 2

Add the row order, the places of the sessions, and the move to the chat
state, with no UI.

- [ ] Add `src/chat/state/tab-order.ts` with the row order, the places of
      the sessions, and the move of the design.
- [ ] Give the open sessions their places at the load and when an open
      session first arrives. Drop the places of the sessions that are not
      open.
- [ ] Add `ChatController.moveTab`, with the save and the sort of the open
      sessions. It changes nothing in a read-only workspace.
- [ ] Test through the controller on the fake API:
  - [ ] A session tab moves after a file tab, and the saved view keeps the
        new order.
  - [ ] A move in a row without file tabs keeps the place of each file
        tab.
  - [ ] In a new workspace, a file tab opens after the first session.
  - [ ] A reopened session opens at the end, also when the saved view held
        an old place for it.
  - [ ] After a move, a new session opens at the end, and Close of the
        shown session shows its neighbour in the new order.
  - [ ] A move in a read-only workspace changes nothing and sends no
        write.
- [ ] Update `src/chat/README.md`.

## Milestone 4: Drag and keys in the tab row

Tags: ui

Depends on: 1, 3

Draw the row in the saved order, and add the drag and the way to move a tab
that decision 144 chooses.

- [ ] Add the shared pointer drag hook of the design, with its tests.
- [ ] Make `SessionTabs` draw the row order. Replace `extraTabs` with
      `renderTab` in `WorkspaceChat`, `WorkspaceChatView`, `ChatArea`,
      and `src/shell/workspace/files/chat-files.tsx`.
- [ ] Give `FileTabItem` the drag props of its list item.
- [ ] Add the drag of the tab row: the drop place along the row, the
      lifted tab, the faint copy, the drop line, and the touch CSS, as the
      mockup draws them. Bind no drag in a read-only workspace or on a tab
      that shows its rename field.
- [ ] Add the move without a drag that decision 144 chooses, with the kept
      focus and the announcement. Waits for decision 144.
- [ ] Add the full row that decision 143 chooses. Waits for decision 143.
- [ ] Test the mounted chat:
  - [ ] A pointer drag of a file tab before a session tab saves the new
        order, and the click at its end selects nothing.
  - [ ] Escape during a drag keeps the order.
  - [ ] The move without a drag moves the focused tab left and right,
        keeps the focus in both directions, and announces the new place.
  - [ ] A long press of a touch pointer lifts a session tab.
- [ ] Update `src/chat/README.md`, `src/files/README.md`, and
      `src/shell/workspace/README.md`.

## Milestone 5: Share the drag mechanics with the workspace list

Tags: ui

Depends on: 4

- [ ] Move `useRowDrag` onto the shared pointer drag hook. Keep its API and
      its behaviour. Delete its own copy of the mechanics.
- [ ] Smoke-test the drag of a workspace row in a browser, with a mouse
      and with touch emulation. Save the evidence under
      `.context/move-tabs-by-drag/`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`. Then run
      the targeted tests and `npm run check`.
- [ ] Smoke-test `npm run dev` on desktop and at a phone size. Drag a file
      tab before a session tab, and check that the view write holds the
      new order. Move a tab without a drag. Cancel a drag with Escape.
      Save the screenshots under `.context/move-tabs-by-drag/`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives decisions 142, 143,
      and 144 and the design calls of this plan with their dates, a
      permalink to this plan, and the follow-up items that the change
      adds: `plans/follow-ups/session-click-overwrites-unread-view.md`,
      `plans/follow-ups/read-only-session-click-over-file.md`, and
      `plans/follow-ups/sideways-tab-rows-ignore-vertical-wheel.md`.

## Post-merge follow-up (non-blocking)

- [ ] On `conductive.build`, drag a file tab before a session tab, then
      reload. Open the same workspace on a phone. The order stays, and the
      phone shows the sessions in the new order.
