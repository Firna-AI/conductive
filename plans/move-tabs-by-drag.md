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

When the tabs do not fit, the row scrolls sideways and keeps the shown tab
in view (decision 143). A right click on a tab opens a tab menu with Rename
and the moves of the tab, for a user who does not drag (decision 144). The
change does not cover a drag out of the row into a split view or a new
window, pinned tabs, a live update of the order in a second window, other
actions in the tab menu, or new close rules. The
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
- **Chosen:** B, by the user on 9 November 2026.

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
  - **G.** Added by the user on 9 November 2026: a right click on a tab
    opens a menu, as the tab menu of Conductor does. For now, the menu holds
    a move option and a rename option. Effort: Medium.
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
- **Chosen:** G, by the user on 9 November 2026, in these words: "right
  clicking should open up a menu (for now we can just have a move option
  and rename option)". The user sent a screenshot of the tab menu of
  Conductor: Mark as unread, Rename chat, three copy actions, Close tab,
  and Close others, in groups with lines between them. The keys of B are
  not part of the choice.
- **Also chosen:** the user removed the Rename button of the shown session
  tab on 9 November 2026, in these words: "we can remove". So the tab menu
  is the one way to rename a session.

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

### Full row

- The tabs first shrink to their minimum width, as today. When they still
  do not fit, the row scrolls sideways. It shows no scrollbar.
- The row scrolls each new or shown tab into view: a new tab, a tab that
  the Files panel or the session history shows, and a tab after a move.
- When the row gets narrower, for example when the window shrinks, the row
  scrolls the shown tab back into view. Decision 143 names this case.
- A vertical turn of the mouse wheel over the row scrolls it sideways. A
  sideways swipe on a trackpad scrolls it as before.
- A fade marks each end of the row that clips tabs.
- During a drag, the pointer near an end of the row scrolls the row, so a
  drop can reach every place.
- A finger scrolls the row, also on a phone.

### Tab menu

- A right click on a tab opens the tab menu at the pointer. The Menu key,
  or Shift and F10, on a focused tab opens it at the tab, on every
  system.
- The menu of a session tab holds "Rename session", a line, then "Move
  left" and "Move right". The menu of a file or diff tab holds "Move left"
  and "Move right".
- On the first tab, "Move left" is off. On the last tab, "Move right" is
  off. An item that is off keeps its place.
- "Move left" and "Move right" move the tab one place in the row, and save
  the order as a drag does. A screen reader hears "<title> moves to place
  2 of 4." The focus goes back to the moved tab.
- "Rename session" opens the rename field in that tab, also when the tab
  does not show. The Rename button of the shown session tab goes, so the
  menu is the one way to rename a session.
- Escape or a click outside the menu closes it.
- A read-only workspace opens no tab menu, so the browser shows its own
  menu. A tab with its rename field open opens no tab menu, so the field
  keeps the text menu of the browser.
- On a phone, a long press lifts the tab. When the finger lets go without
  a move, the tab menu opens as a sheet. When the finger moves, the tab
  drags.

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
- The `Menu` part of the chat gets an item that is off, and a placement
  at a point, for the tab menu. The CSS of the off item goes in the menu
  CSS of the mockups, which the app shares.
- A small helper turns a vertical wheel turn into a sideways scroll.
- The row is a scroll container with a fade mask, so it clips and fades
  what it holds. So the lifted tab and the tab menu draw in a portal above
  the page, as the lifted row of the workspace list does. Script scrolls
  the row, and sets `.fadeStart` and `.fadeEnd` from its scroll position.
- The app takes these classes of the mockups: `.scroll`, `.fadeStart`,
  `.fadeEnd`, `.drop`, `.line`, `.lineEnd`, `.lifted`, `.placeholder`,
  `.menuOpen`, and `.disabled` of the menu. It does not take
  `.scrolledToEnd`, `.float`, or `.clipSides`, which only let a static
  mockup show a state that needs script.

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
  so a long press opens no link menu and selects no text. The row uses
  `touch-action: pan-x`, not the `pan-y` of the list. Reason: a finger
  must still scroll the row sideways.
- A drag does not change the shown tab. The click at the end of a drag
  selects nothing. Reason: a drag in the workspace list opens no
  workspace.
- The look follows the workspace list: a raised lifted tab, a faint copy
  at 0.35 opacity, and a line in the primary colour. Reason: one look for
  every drag in the app. The mockup milestone draws it first.
- A drag starts only on the tab itself, not on its Close button. Reason:
  that button keeps its own press.
- While a tab shows its rename field, no drag and no tab menu acts on it.
  Reason: the field keeps its own pointer and text actions, such as the
  text menu of the browser.
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

The agent made each call below on 9 November 2026, after the user chose G
of decision 144.

- The move option of the tab menu is the pair "Move left" and "Move
  right". Reason: the pair reaches every place, in the flat menu style of
  the Conductor screenshot. The mockup shows it before any code.
- An item that is off stays in the menu, greyed. Reason: each item keeps
  its place, as "Close others" does in the Conductor screenshot.
- "Rename session" shows only on session tabs. Reason: a file tab has no
  title of its own. The product calls a chat a session, as "New session"
  and "Session history" do.
- No tab menu in a read-only workspace. Reason: a read-only workspace
  moves no tab and renames no session.
- No key moves a tab. Reason: the user chose the menu, not the keys of B.

After the user removed the Rename button on 9 November 2026, the agent
made these calls the same day:

- On a phone, a long press that ends without a move opens the tab menu as
  a sheet. A long press that moves drags the tab. Reason: a phone has no
  right click, and the menu is now the one way to rename a session.
  Android also sends a right click on a long press.
- The tab opens its menu on Shift and F10, and on the Menu key, through
  its own key handler. Reason: a Mac keyboard has no Menu key, and a
  browser on a Mac may send no right click for Shift and F10. Without the
  Rename button, a keyboard needs this way to rename a session.
- The selected tab gets narrower, because it loses the 44 px of the Rename
  button. The minimum width of the selected tab on a phone changes with
  it. Reason: the CSS of the mockups gives that width for the button.

The agent made these calls on 9 November 2026, in Milestone 1:

- The lifted copy hangs just below the row, under the pointer, and shows
  the whole title. Reason: the titles of the neighbours stay whole.
- On a phone, a long press lifts the tab at its own place. Reason: a copy
  at the start of the row would hide the shown tab.
- During a drag, a hidden status tells a screen reader "Moving <title> to
  place 2 of 3." Reason: the workspace list tells its drag in the same
  way.
- The items of the tab menu have icons: a pencil for "Rename session", and
  arrows for the moves. Reason: the section menu has icons.
- An item that is off shows at half opacity. Reason: the off items of the
  shell menu look the same.
- Each fade is 32 px wide, and a tab that scrolls into view stops 32 px
  from the edge. Reason: the tab then stays clear of the fade.
- At its minimum width, a phone tab shows only its icon, as the comment of
  `.phone .tab` says. Reason: the full row of the mockups showed one
  letter and an ellipsis there, which looks unfinished.
- A tab that holds the rename field has no fill. The border of the field
  marks it, and the field keeps a usable width. Only the shown tab keeps
  the fill. Reason: the mockups showed that the fill of today's field made
  a second shown tab, and pushed the shown tab out of a phone row.
  Showing the session first, as the Rename button did, was rejected,
  because a rename must not switch the chat.
- The rename field of the app takes its look from the shared `.rename`
  rule of the mockups. Reason: one look then has one rule.
- The wheel helper is shared. Reason:
  `plans/follow-ups/sideways-tab-rows-ignore-vertical-wheel.md` can then
  use it for the other rows that scroll sideways.

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
- The Rename button of the shown session tab → "Rename session" in the tab
  menu. The user approved the removal on 9 November 2026. Consumers: `Tab`
  in `src/chat/components/SessionTabs.tsx`, `Tab` in
  `docs/mockups/src/components/workspace/WorkspaceTabs.tsx`, the width of
  the selected phone tab in `WorkspaceTabs.module.css`, the rationale of
  `docs/mockups/src/entries/app/sessions/index.mockup.tsx`, the read-only
  case of `src/chat/components/ReadOnlyChat.dom.test.tsx`, and the
  read-only rule of `src/chat/README.md`. Moved in Milestones 1 and 4.
  Deleted in Milestones 1 and 4.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the drag of a tab, the row after a move, the full row, and the tab
menu, on desktop and on a phone. The app shares the CSS modules of the tabs
and of the menu. So this milestone adds new classes for the new states and
changes no rule that the app uses. The app keeps working until Milestone 4
adopts them.

- [x] Add the drag states to
      `docs/mockups/src/components/workspace/WorkspaceTabs.tsx` and its
      CSS module: a lifted tab, a faint copy, and a drop line. Take the
      look from the drag of the workspace list.
- [x] Draw the full row with new classes: a row that scrolls sideways when
      its tabs do not fit, and a fade at each end that clips tabs.
- [x] Add an item that is off to the menu CSS of the mockups, in
      `docs/mockups/src/components/common/Menu.module.css`.
- [x] Remove the Rename button from the shown session tab of the mockups.
      Update the rationale of the Sessions page, which names the pencil,
      and the lines about tabs in `docs/mockups/design.md`.
- [x] Add a "Move tabs" page under `docs/mockups/src/entries/app/tabs/`,
      beside the Sessions and Files pages, with at most five screens. Each
      screen shows a phone and desktop.
  - [x] Drag a tab: on desktop, the code file tab moves between the two
        sessions. On a phone, a long press lifts the second session.
  - [x] After the move: the file tab sits between the two sessions, and a
        new session opens at the end of the row.
  - [x] A full row: the row scrolls, the shown tab is in view, and a fade
        marks the end that clips tabs.
  - [x] The tab menu: a right click on the first session tab shows "Rename
        session", a line, "Move left" off, and "Move right". On a phone,
        the same menu shows as a sheet after a long press.
  - [x] Rename a session: after "Rename session", the rename field shows
        in a tab that does not show. The mockups showed that no screen
        drew this field.
- [x] Add `app/tabs` to `docs/mockups/catalogue.md` and to the order in
      `docs/mockups/src/entries/app/_folder.json`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages at
      `http://127.0.0.1:4173`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: the screenshots in `.context/move-tabs-by-drag/mockups/`, and the
logs of the checks in `.context/move-tabs-by-drag/m1-*.log`.

## Milestone 2: Documentation and protocol

Depends on: 1

State the rules of the row before the code changes.

- [x] In the Sessions section of `docs/protocol/chat-and-events.md`,
      replace the order of creation with the rules of decision 142: one
      order for all tabs of the row, and a new tab at the end. Add the
      move of any tab by drag, and by a long press on a phone. Add the
      order kept for each user and workspace, and no move in a read-only
      workspace. Give the rejected group order and its reason.
- [x] Add the full row of decision 143 to the same section: the row
      scrolls sideways and keeps the shown tab in view.
- [x] Add the tab menu of decision 144 to the same section: a right
      click, Shift and F10, or a long press on a phone opens Rename
      session, Move left, and Move right. Say that the user renames a
      session from the tab menu. A read-only workspace opens no tab
      menu.
- [x] In the Files and changes section of
      `docs/protocol/workspaces-and-sandboxes.md`, say that a file or diff
      tab opens at the end of the row. Link to the rules of the row.
- [x] Add a line to decision 77 in `plans/boat-native-remote-workspaces.md`
      that says decision 142 changed it on 8 November 2026.
- [x] Check the relative links of each changed Markdown file.

## Milestone 3: Tab order in the chat state

Depends on: 2

Add the row order, the places of the sessions, and the move to the chat
state, with no UI.

- [x] Add `src/chat/state/tab-order.ts` with the row order, the places of
      the sessions, and the move of the design.
- [x] Give the open sessions their places at the load and when an open
      session first arrives. Drop the places of the sessions that are not
      open.
- [x] Add `ChatController.moveTab`, with the save and the sort of the open
      sessions. It changes nothing in a read-only workspace.
- [x] Test through the controller on the fake API:
  - [x] A session tab moves after a file tab, and the saved view keeps the
        new order.
  - [x] A move in a row without file tabs keeps the place of each file
        tab.
  - [x] In a new workspace, a file tab opens after the first session.
  - [x] A reopened session opens at the end, also when the saved view held
        an old place for it.
  - [x] After a move, a new session opens at the end, and Close of the
        shown session shows its neighbour in the new order.
  - [x] A move in a read-only workspace changes nothing and sends no
        write.
- [x] Update `src/chat/README.md`.

## Milestone 4: Drag, tab menu, and full row

Tags: ui

Depends on: 1, 3

Draw the row in the saved order, and add the drag, the tab menu, and the
full row.

- [ ] Add the shared pointer drag hook of the design, with its tests.
- [ ] Make `SessionTabs` draw the row order. Replace `extraTabs` with
      `renderTab` in `WorkspaceChat`, `WorkspaceChatView`, `ChatArea`,
      and `src/shell/workspace/files/chat-files.tsx`.
- [ ] Give `FileTabItem` the drag props of its list item.
- [ ] Add the drag of the tab row: the drop place along the row, the
      lifted tab, the faint copy, the drop line, and the touch CSS, as the
      mockup draws them. Bind no drag in a read-only workspace or on a tab
      that shows its rename field.
- [ ] Add the full row: the sideways scroll, the scroll of each new or
      shown tab into view, also when the row gets narrower, the shared
      wheel helper, the fades, and the scroll of a drag near an end.
- [ ] Add the item that is off and the placement at a point to the `Menu`
      part of the chat.
- [ ] Remove the Rename button from `Tab` in
      `src/chat/components/SessionTabs.tsx`. Then narrow the selected phone
      tab in `WorkspaceTabs.module.css`, which the app shares.
- [ ] Give the row of the app the `.scroll` class of Milestone 1, set
      `.fadeStart` and `.fadeEnd` by script, and update the comment of
      the row in `WorkspaceTabs.module.css`.
- [ ] Make a phone tab at its minimum width show only its icon, in
      `WorkspaceTabs.module.css`, which the app shares.
- [ ] Draw the lifted tab and the tab menu in a portal above the page.
- [ ] Give the tab with the rename field the `.renaming` state of
      Milestone 1. Make `RenameField` use the shared `.rename` rule, and
      delete its copy in `src/chat/components/tabs.module.css`. The rule
      sizes the field with `field-sizing: content`, which only Chromium
      supports. Other browsers fall back to the default width of the
      input, within the 168 px cap.
- [ ] Add the tab menu of the design: its own handler for Shift and F10
      and the Menu key, the sheet after a long press on a phone, the focus
      back to the tab after a move, and the announcement of the new
      place.
- [ ] Test the mounted chat:
  - [ ] A pointer drag of a file tab before a session tab saves the new
        order, and the click at its end selects nothing.
  - [ ] Escape during a drag keeps the order.
  - [ ] A long press of a touch pointer lifts a session tab. A release
        without a move opens the tab menu as a sheet.
  - [ ] Shift and F10 on a focused tab opens the tab menu.
  - [ ] A right click on a tab opens the tab menu. "Move left" moves the
        tab one place, saves the order, announces the new place, and gives
        the focus back to the tab.
  - [ ] "Move left" is off on the first tab, and "Rename session" shows
        only on a session tab.
  - [ ] "Rename session" on a tab that does not show opens its rename
        field.
  - [ ] A read-only workspace opens no tab menu. Move the read-only case
        of `src/chat/components/ReadOnlyChat.dom.test.tsx` from the Rename
        button to the tab menu.
  - [ ] A vertical wheel turn over the row scrolls it sideways.
- [ ] Update `src/chat/README.md`, `src/files/README.md`,
      `src/shell/workspace/README.md`, and
      `src/shell/workspace/screen-parts.md`, which says that the file tabs
      come after the session tabs.

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
- [ ] Smoke-test `npm run dev` on desktop and at a phone size:
  - [ ] Drag a file tab before a session tab, and check that the view
        write holds the new order. Cancel a drag with Escape.
  - [ ] Open the tab menu with a right click, and with Shift and F10 in
        Chrome on Linux. Move a tab and rename a session with the menu.
  - [ ] At a phone size with touch emulation, open the menu with a long
        press, and rename a session.
  - [ ] Fill the row until it scrolls. Check the wheel, the fades, a new
        tab in view, and a drag near an end.
  - [ ] Save the screenshots under `.context/move-tabs-by-drag/`.
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
- [ ] On a Mac, in Chrome, Safari, and the Mac app, check that Shift and
      F10, with Fn on a laptop keyboard, opens the tab menu, also with
      VoiceOver on.
