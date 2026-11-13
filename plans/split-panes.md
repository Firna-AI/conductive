# Split panes

Status: Active. On branch `calummoore/porto-r3jl`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The centre column of a workspace shows one tab row and one tab at a time.
A user who wants to watch two agents, or read a file beside a chat, must
switch tabs. This change splits the centre column into two panes, as the
editor groups of VS Code do. Each pane has its own tab row. A drag of a tab
over the left or right half of the content opens the second pane with that
tab.

Cal asked for this on 13 November 2026: "enable split pane support - like
in vs code where you can drag a tab over one half of the screen and then it
splits accordingly". He chose split panes decisions 1 C, 2 A, and 3 B in a
brainstorm on the same day. The brainstorm notes are in
`.context/split-panes/brainstorm.md`.

This change does not cover more than two panes, a split of the right
column, a pane above another pane, a second window of the Mac app, or one
tab in two panes.

Contract owners:

- [The tab row](../docs/protocol/agents-and-sessions.md#the-tab-row), which
  Milestone 2 moves to its own page.
- [Temporary tabs](../docs/protocol/temporary-tabs.md).
- [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md).
- [Messages](../docs/protocol/messages-and-attachments.md), for the prompts
  of the pull request bar.
- [Conductor comparison](../docs/protocol/conductor-comparison.md), the row
  `layout-and-zen-mode`.
- The [chat README](../src/chat/README.md) and its
  [tab row guide](../src/chat/tab-row.md).
- The [workspace README](../src/shell/workspace/README.md).
- The [mockup catalogue](../docs/mockups/README.md).

Replaced ways:

- One tab order and one shown tab in the saved view → a list of one or two
  panes, each with its own tab order and shown tab. Consumers: the Worker
  check of the saved view, `src/shared/workspace-view.ts`, the chat state
  of the tab order and the shown session, the tab keys, the session
  address, and the file features of the shell. Moved in Milestones 4 to 6.
  Deleted in Milestone 6. A saved view of the old shape reads as one pane,
  because the Worker stores the view as JSON.

## Decisions

This plan names its decisions after the change, as split panes decision 1,
as [Decision numbers](../docs/architecture.md#decision-numbers) says.

### Terms

- **Pane:** one part of the centre column, with its own tab row and the
  content of its shown tab.
- **Focused pane:** the pane that the user last clicked, typed in, moved
  the keyboard focus into, dropped a tab on, or opened a file in.
- **Temporary tab:** the one file or diff tab that the next press on
  another file replaces (decision 284 B).
- **Saved view:** the open tabs, their order, the shown tab, the file list,
  and the tool of one member in one workspace. The Worker stores it.

### 1. The split-pane approach

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/chat/state/chat-snapshot.ts:124`, `src/shared/workspace-view.ts`, `docs/protocol/agents-and-sessions.md`.
- **Background:** The chat state shows one session through `activeSessionId`. One event stream serves each workspace and puts each event in the log of its own session (`src/chat/stream/workspace-stream.ts:42`). So a second shown session needs no second stream. Decision 186 keeps one tab row in one order.
- **Problem:** The user cannot see two tabs of one workspace at once.
- **Impact if no action:** A user who watches two agents must switch tabs.
- **Root question:** How does a user see two tabs of one workspace at the same time, and make and undo that layout with a drag?
- **Options:**
  - **A.** One tab row for both panes. A click on a tab shows it in the focused pane. Effort: Large.
  - **B.** A drop joins two tabs into one item of the row, which shows both halves, as Chrome Split View does. Effort: Large.
  - **C.** Editor groups, as in VS Code. Each pane has its own tab row. It replaces decision 186, and the temporary tab, the keys, and the phone need new rules. Effort: Large.
- **Left out:**
  - The chat beside a file only. It cannot show two sessions.
  - Change nothing, because Chrome splits browser tabs. The Mac app has one window.
  - A second view in the right column. That column is too narrow, as `docs/protocol/temporary-tabs.md` and `plans/terminal-tabs.md` say.
  - Two chat engines. Each saves its whole copy of the saved view, so one pane would undo the moves of the other.
  - A tile mode. No drag makes the layout.
- **Wider fix:** None. This is a new feature.
- **Previous examples:** The comparison row `layout-and-zen-mode` says split views are under consideration.
- **Recommendation:** A. It costs least and keeps decision 186.
- **Chosen:** C, by the user on 13 November 2026. Reason: it gives the behaviour of VS Code, and a click on a tab never depends on the focus.

### 2. The layouts

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `docs/mockups/src/components/layout/ResizeHandle.tsx:8-11`.
- **Background:** With the org rail of 48 px, the default sidebar of 232 px, and the right column of 440 px, a 1440 px window leaves the centre column about 720 px.
- **Problem:** Each pane must stay wide enough for a chat or code.
- **Impact if no action:** The drop places and the saved shape stay open.
- **Root question:** How many panes, and in which directions, can a user make?
- **Options:**
  - **A.** Two panes, side by side only. Effort: Small.
  - **B.** Two panes, side by side or one above the other. Effort: Medium.
  - **C.** A grid of any size. Effort: Large.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Chosen:** A, by the user on 13 November 2026.

### 3. The pane that a press opens into

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `docs/protocol/temporary-tabs.md`.
- **Background:** A press on a file row or a file chip opens the file in the temporary tab. "+", the session history, and the palette open sessions.
- **Problem:** With two panes, each of these needs a target pane.
- **Impact if no action:** A file press can hide the chat that the user types in.
- **Root question:** Where does a tab, a new session, or a file that the user opens show when two panes are open?
- **Options:**
  - **A.** Every action uses the focused pane, as in VS Code. Effort: Small.
  - **B.** A new or reopened session uses the focused pane. A press on a file or a diff uses the pane that shows a file or a diff. When no pane or both panes show one, it uses the focused pane. Effort: Small.
- **Left out:** A fixed file pane and chat pane. Any tab can go in either pane.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** B.
- **Chosen:** B, by the user on 13 November 2026.
- **Known limit:** when both panes show a session, a file press goes to the focused pane, which is often the chat that the user types in. The options check of 13 November 2026 found this. The user chose B with this tie rule.
- **Under decision 1 C:** a press on a tab shows it in its own pane. The "+" of a row opens the new session in that pane. A press on a file or a diff that already has a tab shows that tab in its pane, as the rule of [Temporary tabs](../docs/protocol/temporary-tabs.md) says.

### 4. A split without a drag

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `docs/protocol/agents-and-sessions.md`, the tab menu.
- **Background:** The tab menu opens with a right click, or with Shift and F10 or the Menu key. Move left and Move right give a keyboard path for each move of a drag (decision 188). Under decision 1 C, a drop can also open a new pane on either side, or move a tab to the other pane. Keys that move a tab were rejected, because the user chose the menu.
- **Problem:** A split that only a drag makes is not available from the keyboard.
- **Impact if no action:** A keyboard user cannot split, or move a tab to the other pane.
- **Root question:** How does a user who cannot drag get each result of a drop: a new pane on either side, and a tab in the other pane? The options check of 13 November 2026 wrote this question again, because the first one hid the side of the new pane.
- **Options:**
  - **A.** Drag only. Effort: Small.
  - **B.** Add one item to the tab menu, in the group of Move left and Move right. With two panes, it reads "Move to the other pane". With one pane, it reads "Open in a new pane", and it opens the second pane on the right. The item is off when the pane holds only this tab and no other pane exists. A user gets a left pane only by moving the other tabs. Effort: Small.
  - **C.** Do B. Also add two commands to the Keyboard shortcuts tab: "Move tab to the other pane" and "Focus the other pane". They start with no key, as each command without a Conductor key does. A member can record a key, so this reverses the rejection of keys that move a tab. Focus the other pane puts the focus on the message field of its session, or on the content of its file. Effort: Medium.
  - **D.** Added by the options check. Do B, but name the side. With two panes, the item reads "Move to the right pane" or "Move to the left pane". With one pane, two items read "Move to a new left pane" and "Move to a new right pane". The labels are close to Move left and Move right. Effort: Small.
  - **E.** Added by the options check. A split button at the end of each tab row, as VS Code has. It moves the shown tab of its row to the other pane, or opens the second pane on the right. It adds a control to each row, and the protocol rejected a Rename button on a similar ground. Effort: Medium.
  - **F.** Added by the options check. Do B. Also add a palette row and a command, "Move tab to the other pane", with no default key. The palette key reaches it also where Shift and F10 do not reach the page. It reverses the rule that the palette holds no view commands. Effort: Medium.
- **Left out:**
  - A keyboard drag with keys that lift, move, and drop a tab. The user chose the menu over keys that move a tab.
  - An "open to the side" press on a file row or a file chip. The file lists have no menu, and the browser takes each modified click on a link.
- **Wider fix:** None. The rule that each pointer gesture on a tab gets a tab menu item, decision 286 D, was not chosen on 12 November 2026.
- **Previous examples:** Move left and Move right in the tab menu. The follow-up item `plans/follow-ups/tab-menu-keys-on-a-mac.md` says that Shift and F10 is not yet checked on a Mac.
- **Recommendation:** B. It extends the tab menu, which the user chose for each earlier keyboard path of a tab, in decisions 188 and 286 B. D is better when the user wants the keyboard to open a left pane. F also helps when the menu keys fail.
- **Action:** ask the user, because it adds a new menu item that the user did not ask for.

### 5. The temporary tab with two panes

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `docs/protocol/temporary-tabs.md:26-27`.
- **Background:** Decision 284 B keeps at most one temporary tab in the row. A press that replaces its file keeps the tab in its place. VS Code keeps one preview tab in each editor group. Decision 3 B sends a file press to the pane that shows a file, else to the focused pane.
- **Problem:** With two rows, the temporary tab can stand in one row while the press goes to the other pane.
- **Impact if no action:** The design of the file press and of the saved view stays open.
- **Root question:** With two panes, which temporary tab does a press on a file without a tab replace, and what may that press change in the other pane? The options check of 13 November 2026 wrote this question again, because the first one left out the other pane.
- **Options:**
  - **A.** One temporary tab for the workspace. A press that goes to the other pane moves the temporary tab to the end of that pane's row. So a press can change what the other pane shows, or close that pane when the temporary tab was its last tab. This changes the rule that a replaced temporary tab keeps its place. Effort: Small.
  - **B.** One temporary tab for each pane, as in VS Code. A press replaces the temporary tab of its pane. The column then holds at most two temporary tabs. A press never moves, hides, or closes a tab of the other pane. This changes decision 284 B. Effort: Small.
  - **C.** Added by the options check. One temporary tab for the workspace. In a tie, when no pane or both panes show a file, a press goes to the pane whose row holds the temporary tab. The temporary tab moves to the other row only when the press goes to a pane that shows a kept file, and the temporary tab stands behind a session in the other row. The limit stays at one, but this changes the tie rule of decision 3 B. Effort: Small.
- **Left out:**
  - A press that always replaces the one temporary tab in its own row. It breaks decision 3 B, because the press would go to that row also when only the other pane shows a file. C is the version that keeps decision 3 B.
  - A press that keeps the old temporary tab when it opens one in the other pane. Each file that the user only looks at could then leave a kept tab, which fails decision 284 B.
  - A press that closes the old temporary tab and opens a new one at the end of the target row. It gives the same result as A.
- **Wider fix:** B. Each rule of Temporary tabs then applies inside its own pane, such as the replace in place, the keep, and the Worker check.
- **Previous examples:** Decision 284 B. VS Code keeps one preview editor in each group.
- **Recommendation:** B. It matches VS Code, which the user chose in decision 1 C, and a press never changes the other pane.
- **Action:** ask the user, because each option changes a decision in force: decision 284 B, the place rule of the temporary tab, or the tie rule of decision 3 B.

## Design

These are design calls of the agent, made on 13 November 2026, unless a
line names a decision. The options check of the same day found gaps in the
first draft, and this text closes them.

### The panes

- The centre column holds one or two panes, side by side (decision 2 A).
  A divider between them moves the split. The browser keeps the share of
  the left pane, as it keeps the panel widths in `src/app/panels.ts`.
  Reason: the panel widths already stay in the browser.
- A pane is at least 320 px wide, the minimum of the right column. Reason:
  with default panels, a 1440 px window leaves about 720 px, and two panes
  must fit there.
- Each pane has its own tab row, with its own "+" (decision 1 C). The
  session history button stays at the far right of the right row, and it
  reopens a session in the focused pane (decision 3 B).
- The focused pane has a mark in its tab row, as VS Code marks the active
  group. The mockups choose the mark.
- A tab stands in one row only. A press on a file, a diff, or a session
  that already has a tab shows that tab in its pane. Reason: the rule of
  Temporary tabs for a file with a tab stays, and each tab keeps one
  reading place.
- When the last tab of a pane closes or moves out, the pane closes, and
  the other pane fills the column. This change adds no action that closes
  or joins panes. Reason: a drag or the item of decision 4 already moves
  tabs one at a time, and a close of all tabs of a pane would move
  sessions to the history. VS Code has commands that close and join
  groups. A later change can add them.
- Each pane that shows a session has its own message field and its own
  drop area for files.

### Moves between panes

- During a drag, the content of a pane shows a drop mark. With one pane,
  a drop on the left or right half opens the second pane on that side.
  With two panes, a drop on the content of a pane moves the tab to the end
  of that pane's row.
- A drop in the other row puts the tab at the drop place of that row.
- A move to the other pane, by a drop or by the item of decision 4, shows
  the moved tab in its new pane. That pane becomes the focused pane. The
  pane that the tab left shows the tab after it in its row, else the tab
  before it.
- A drop inside the same row keeps the shown tab, as now.
- The status of the row tells a screen reader the new pane and place, such
  as "app.ts moves to the right pane, place 2 of 3".
- Escape cancels the drag, and nothing moves.
- A move of the temporary tab to the other pane keeps it, as a move inside
  the row does (decision 287 B).

### The saved view

- The saved view holds a list of one or two panes. Each pane has its tabs
  in order and its shown tab. The view also holds the index of the focused
  pane. The temporary tab follows decision 5.
- The Worker reads a saved view of the old shape as one pane. It reads a
  wrong pane list as one pane with all tabs. Reason: the check of
  `worker/app-api/workspace-view.ts` already turns a wrong view into a
  usable one.
- The split saves for each member and loads on that member's other
  devices, as the tab order does.

### Keys and addresses

- Previous tab, Next tab, and Close tab act on the row of the focused pane.
  Reason: each pane has its own row, as in VS Code.
- The session keys, such as Focus the message field and the copy keys, act
  on the session of the focused pane. When the focused pane shows a file,
  they act on the session of the other pane, if it shows one. Otherwise
  they go on to the page, as a key that would do nothing does now.
- A press makes its target pane the focused pane. So the address always
  names the file or the diff of the focused pane, and Back and Forward
  move the focused pane.
- A visit by address uses the same pane as a press on that file, as
  decision 3 B says.
- A session address shows its session in the pane that holds its tab, or
  in the focused pane for a session without a tab.
- The prompts of the pull request bar go to the same session as the
  session keys. When no pane shows a session, they go to the last session
  of the focused row.

### One pane on a small screen

- A phone, and a centre column narrower than two panes of 320 px, show one
  row and one content area. The row holds the tabs of the left pane, then
  the tabs of the right pane. The phone row still shows only session tabs.
- The content area shows the shown tab of the focused pane. A press on a
  tab of the other pane makes that pane the focused pane.
- So no tab moves between panes on a small screen, and the saved split
  stays.
- A drop on a half of the content does nothing there, and the item of
  decision 4 is off. A drag or Move left and Move right across the border
  of the two parts moves the tab to the other pane, at that place.

### Read-only workspaces

- A read-only workspace shows the saved split, and binds no drag. Its tab
  menu leaves out the item of decision 4, as decision 214 says.

### The chat state

- The chat state replaces `activeSessionId` with the shown tab of each pane
  and the focused pane. The actions that act on the shown session act on
  the session that the session keys use: model changes, linked replies,
  Close, New session, and the prompts of the pull request bar.
- The history of each shown session loads, also the session of the pane
  that is not focused.
- One chat controller and one event stream feed both panes. So each event
  still shows once and in order.
- The chat stays the one writer of the saved view.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups draw the split column on desktop. The phone layout does not
change.

- [ ] Add a split workspace screen: two panes, two tab rows, the divider,
      and the mark of the focused pane. Draw a session beside a session,
      and a session beside a file.
- [ ] Draw the drag: the drop marks for the left half, the right half, and
      a pane of an open split, and a tab over the other row.
- [ ] Draw the control of decision 4 that the user chooses: the tab menu
      item, or the split button of each row.
- [ ] Draw the temporary tab as decision 5 says.
- [ ] Draw the one row of a narrow centre column, with the tabs of both
      panes.
- [ ] Draw a read-only workspace with a split.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the requirements of the split. The tab row section
moves to its own page first, as
`plans/follow-ups/split-the-tab-row-protocol-section.md` option A says.

- [ ] Move The tab row to `docs/protocol/tab-row.md`, with a short heading
      and a link left in `agents-and-sessions.md`. Add the page to
      `docs/architecture/protocol-docs.md`. Delete the follow-up item.
- [ ] Add the panes, the drag, the focus, and decisions 1 C, 2 A, and 3 B
      to `docs/protocol/tab-row.md`. Replace the one-order rule of decision
      186, and the rule that a drag does not change the shown tab.
- [ ] Update `docs/protocol/temporary-tabs.md` with decisions 3 B and 5.
- [ ] Update `docs/protocol/keyboard-shortcuts.md` for keys that act on the
      focused pane, and with decision 4 C or 4 F if the user chooses one.
- [ ] Update the prompts of the pull request bar in
      `docs/protocol/messages-and-attachments.md`.
- [ ] Read the Terms and Privacy pages and each guide in
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact, such as `sessions-and-chat.md` and
      `files-and-changes.md`.
- [ ] Update `src/chat/README.md`, `src/chat/tab-row.md`, and
      `src/shell/workspace/README.md`.

## Milestone 3: One owner of the read-only tabs

Depends on: 2

The split changes the tab state of read-only workspaces too. Fix the two
owners first, as `plans/follow-ups/read-only-tabs-have-two-owners.md`
option B says.

- [ ] Apply option B of the follow-up item, with its tests. Delete the
      item, and `plans/follow-ups/read-only-session-click-over-file.md`
      when B fixes it.

## Milestone 4: Panes in the saved view

Depends on: 3

The shared type, the Worker check, and the chat state hold panes. The
screen still draws one pane.

- [ ] Change `WorkspaceView` in `src/shared/workspace-view.ts` to hold the
      panes and the focused pane.
- [ ] Read the old shape and a wrong pane list in
      `worker/app-api/workspace-view.ts`, with Worker tests.
- [ ] Move the tab order of `src/chat/state/tab-order.ts` to the panes.
      Moves inside a row and between rows go through one pure function.
- [ ] Run the targeted tests and `npm run typecheck`.

## Milestone 5: Two shown tabs in the chat state

Depends on: 4

- [ ] Replace `activeSessionId` with the shown tab of each pane and the
      focused pane. Move each consumer.
- [ ] Load the history of each shown session.
- [ ] Point model changes, linked replies, Close, New session, and the
      prompts of the pull request bar at the focused pane.
- [ ] Add tests for an event of the session that is not focused, and for a
      dropped connection with two shown sessions.

## Milestone 6: The split column

Tags: ui

Depends on: 5

- [ ] Draw one or two panes from the saved view, each with its row, its
      content, its message field, and its file drop area.
- [ ] Add the divider, with the share kept in the browser.
- [ ] Mark the focused pane, and set it on a click, on typing, and on a
      drop.
- [ ] Show one pane on a phone and in a narrow centre column, as the design
      says.
- [ ] Delete the old single-row paths that Milestone 4 left.

## Milestone 7: The drag between panes

Tags: ui

Depends on: 6

- [ ] Add the drop marks over the content and the drop into the other row,
      on the shared `usePointerDrag`.
- [ ] Open, move, and close panes on a drop. Keep Escape and the status of
      the row for a screen reader.
- [ ] Add the control of decision 4 that the user chooses, unless the user
      chooses A.
- [ ] Add DOM tests for each drop place.

## Milestone 8: Presses, keys, and addresses

Tags: ui

Depends on: 7

- [ ] Send each press to its pane as decision 3 B says, and replace the
      temporary tab as decision 5 says.
- [ ] Make the tab keys and the session keys act on the panes as the design
      says. Add the commands of decision 4 C or 4 F when the user chooses
      one.
- [ ] Make the address, Back and Forward, and the session address follow
      the focused pane.
- [ ] Set the comparison row `layout-and-zen-mode` in
      `src/marketing/from-conductor/areas/navigation-and-appearance.ts` to
      the status that [Statuses](../docs/protocol/conductor-comparison.md#statuses)
      gives for shipped split views.
- [ ] Check the split in a browser and take screenshots for the pull
      request.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci`, `npm ci --prefix runner`, and
      `npm run check`.
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
