# Temporary file tabs

Status: Active. On branch `calummoore/oslo-k1ce`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The tab row above the centre column of a workspace holds the session tabs
and the file and diff tabs in one order. A press on a file in All files, on
a changed file in Changes, or on a file chip in the chat opens a tab at the
end of the row, unless the file has a tab already. Each tab stays until the
user closes it. When the user clicks through files to find one, each glance
leaves a tab.

This change adds one temporary tab, as VS Code, Zed, and JetBrains have
(decision 284). A press opens a file or a diff in the temporary tab, which
shows its title in italics. The next press replaces its file in the same
place. A double-click on the file row or on the tab keeps the tab as a
normal tab, and nothing else shows on the tab (decision 285). Keep open
in the tab menu of the temporary tab also keeps it, for a keyboard user
(decision 286). A move of the temporary tab to another place keeps it too
(decision 287).

The decisions of this plan had the numbers 277 to 280 when the plan was
written on branch `calummoore/file-preview-tabs-brainstorm`. On 12
November 2026, `main` already used those numbers for other changes, so
the plan moved to this branch with the numbers 284 to 287.

The change does not cover a setting that turns temporary tabs off, keys
that keep a tab, bulk close actions, or temporary session tabs.

Contract owners:

- [Temporary tabs](../docs/protocol/temporary-tabs.md): the temporary
  tab, what opens and keeps it, and its mark in the saved view.
  [Tools of a workspace](../docs/protocol/workspace-tools.md#files-and-changes)
  links to it.
- [Agents and sessions](../docs/protocol/agents-and-sessions.md#the-tab-row):
  the place of the temporary tab in the tab row, its moves, and its tab
  menu.
- The mockup [design](../docs/mockups/design.md) and
  [catalogue](../docs/mockups/catalogue.md).
- The [Files README](../src/files/README.md), the
  [workspace screen README](../src/shell/workspace/README.md), and the
  [chat README](../src/chat/README.md).

## Terms

- **Temporary tab:** the one file or diff tab that the next press on a file
  or a diff replaces. VS Code calls it a preview tab.
- **Kept tab:** a normal tab, which stays until the user closes it. The
  user's request calls it permanent.
- **Saved view:** the open tabs in their order, the shown tab, the file
  list, and the tool of one member in one workspace. The Worker saves it
  in D1.
- **Tab menu:** the menu that a right click on a tab opens, and Shift+F10
  or the Menu key on a focused tab (decision 188).

## Decision 284: How the tab row treats a glanced file

Added on 8 November 2026 from the brainstorm of this change.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `src/shell/workspace/files/view-tabs.ts:43` and
  `docs/protocol/workspace-tools.md:17`.
- **Background:** The app adds a tab to the saved view for each file or
  diff that the user opens, at the end of the tab row. The protocol says
  that a file opens as a tab, and that a changed file opens its diff as a
  tab. When the tabs do not fit, the row scrolls sideways (decision 187).
- **Problem:** When the user clicks through files to find one, each glance
  leaves a tab. The user must close each tab by hand.
- **Impact if no action:** The row fills with tabs that the user did not
  want to keep. The tabs that the user wants scroll out of view.
- **Root question:** How should the tab row treat a file that the user
  opens only to glance at it?
- **Options:**
  - **A.** Limit the file tabs to a fixed number, such as 8. When the user
    opens one more file, the oldest file tab closes. There is nothing new
    to learn, and the saved view does not change. But a tab that the user
    wanted can close without a warning, and the row still fills up to the
    limit. Effort: Small.
  - **B.** Keep one temporary tab, as VS Code, Zed, and JetBrains do. A
    press opens the file in this tab, with an italic title, and the next
    press replaces it. A double-click on the file or on the tab keeps it.
    After a tab is kept, the next press opens a new temporary tab. The cost
    is a new mark in the saved view, a new mockup state, and a double-click
    that users must learn. Effort: Medium.
  - **C.** Show a pressed file with no tab. A double-click or a Keep open
    button adds a kept tab. The row holds only the tabs that the user
    chose, and it does not move while the user browses. But after the user
    goes to a chat, only Back or a new press brings the file back. Few
    tools work this way. Effort: Medium.
  - **D.** Added by the options check: a press shows the file in the right
    column under its list, with no tab, as the reading pane of a mail app
    does. A double-click opens it as a kept tab in the centre. The chat
    stays in view while the user browses. But the right column is narrow
    for code, and a phone has no right column. The layout needs new
    mockups and new protocol text. Effort: Large.
- **Left out:**
  - Change nothing, because each glance still leaves a tab.
  - Close others and Close all actions, because each press still adds a
    tab. These actions can come later with any option.
  - A press selects and a double-click opens, as in a desktop file
    manager, because each glance then needs a double-click and still
    leaves a tab. Its form where a press shows the file with no tab is C
    in the centre column and D in the right column.
  - Each press replaces the shown file tab, as a browser link does,
    because it overwrites a file that the user wanted to keep.
  - B with the mark only in the memory of the browser, because a reload
    or a second window turns the temporary tab into a kept tab.
- **Shared assumptions:**
  - Sessions, files, and diffs share one tab row in one order. Source:
    decisions 19 and 186. Kept.
  - Each file and diff has its own address, so Back and Forward work.
    Source: `docs/architecture/components.md`. Kept.
  - The saved view on the Worker holds the open tabs. Only the panel widths
    stay in the browser. Source: `docs/architecture/components.md`. Kept.
  - Session tabs keep their rules. Source: the request names files only.
    Kept.
  - One press opens a file. Source: the code only. The left-out "a press
    selects" approach drops it.
  - Each shown file has a tab. Source: `docs/protocol/workspace-tools.md`.
    C and D drop it.
  - A glanced file shows in the centre column. Source:
    `docs/protocol/workspace-tools.md`. It names a place, not a goal. D
    drops it.
- **Wider fix:** None, because this is new behaviour, not a class of
  defects.
- **Previous examples:** None in this repository or in earlier
  workspaces. [VS Code](https://code.visualstudio.com/docs/getstarted/userinterface),
  [Zed](https://zed.dev/docs/reference/all-settings), and
  [JetBrains](https://www.jetbrains.com/help/idea/using-code-editor.html)
  show a preview tab with an italic title. In all three, the next press
  replaces it, and a double-click or an edit keeps it.
- **Recommendation:** B. It keeps at most one glance tab, never closes a
  tab that the user chose, and most developers know it from their editor.
- **Chosen:** B, by the user on 11 November 2026. It changes the rule that
  a file opens as a tab: a press now opens a file with no tab in the
  temporary tab.
- **Options check, 11 November 2026:** the check kept B and added D. D
  costs more than B, and the request asks for the behaviour of B, so the
  choice of B stands. The report is in
  `.context/temporary-file-tabs/options-check.md`.

## Decision 285: How a person who does not double-click keeps a temporary tab

Added on 8 November 2026 from the second round of the brainstorm.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `src/files/tabs/FileTabItem.tsx:85`, the Close button of a
  file tab.
- **Background:** In option B of decision 284, a double-click on the file
  or on the tab keeps a temporary tab. Each tab already has a Close button
  that shows on the shown tab, on hover, and with keyboard focus.
- **Problem:** A keyboard user or a screen-reader user cannot double-click.
  A mouse user who does not know about the double-click sees only the
  italics, with no hint.
- **Impact if no action:** Keyboard and screen-reader users cannot keep a
  file open, so they only ever have one file tab from a press. Some mouse
  users lose tabs and do not know why.
- **Root question:** How can a person who does not double-click keep a
  temporary tab?
- **Options:**
  - **A.** Double-click only, as the request says. Nothing new shows. The
    impact above stays. Effort: Small.
  - **B.** A Keep open icon button on the temporary tab, before its Close
    button. It shows when the Close button shows. The cost is one more
    icon on one tab. A pin icon can also look like the pinned tabs of
    Chrome. Effort: Small.
  - **C.** A Keep open text button in the header of the file or the diff,
    beside Copy and Download, only while the tab is temporary. The button
    is far from the tab, and the header must stay on one line. Effort:
    Small.
  - **D.** A right-click menu on each file tab, with Keep open and Close.
    Few users find a hidden menu, and the menu is new work. Effort:
    Medium.
- **Left out:**
  - Enter on the temporary tab keeps it, because a screen reader in browse
    mode sends a click instead of the Enter key.
  - A shortcut such as Cmd+K Enter of VS Code, because users cannot find
    it without a hint, and Ctrl+K is a browser shortcut on Windows and
    Linux.
- **Wider fix:** D of decision 286, as the options check found: a keep is
  an action that only a pointer gesture does on a tab.
- **Previous examples:** VS Code keeps a preview tab with its Keep Open
  command, ⌘K Enter, as its
  [default keyboard shortcuts](https://code.visualstudio.com/docs/reference/default-keybindings)
  show.
- **Recommendation:** B. Every user can find it, and it is on the tab
  whose state it changes.
- **Chosen:** A, by the user on 11 November 2026. No button shows on the
  tab. The brainstorm read an older `main`, where no tab had a menu. On the
  current `main`, the tab menu of decision 188 exists, so D no longer
  needs a new menu. Decision 286 asks about that menu.
- **Options check, 11 November 2026:** the check added no option here. A
  second press and a menu on the file row show nothing new on the tab, so
  the choice of A does not rule them out. They are options C and E of
  decision 286, which holds the open part of this question.

## Decision 286: Keeping a temporary tab from the keyboard

Added on 11 November 2026, when this plan was written on the current
`main`. Chosen on 12 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `src/chat/components/useTabMenu.ts:50`, the items of the
  tab menu.
- **Background:** Decision 285 chose the double-click as the only way to
  keep a temporary tab, with nothing new on the tab. Its options assumed
  that no tab had a menu. The current `main` has the tab menu of decision
  188, where a file or diff tab holds Move left and Move right. A read-only
  workspace leaves out each menu item that changes something (decision
  214), so a file or diff tab there opens no menu.
- **Problem:** A keyboard user or a screen-reader user still cannot keep a
  temporary tab.
- **Impact if no action:** Each file that such a user opens replaces the
  last one, so the user cannot keep two files open from the lists.
- **Root question:** How can a person who does not double-click keep a
  temporary tab, with nothing new on the tab?
- **Options:**
  - **A.** Keep decision 285 as it is: the double-click is the only way to
    keep a tab. Effort: Small.
  - **B.** Add Keep open to the tab menu of the temporary tab, as VS Code
    has it. Nothing new shows on the tab. A read-only workspace leaves the
    item out, as decision 214 says, so only a double-click keeps a tab
    there. Effort: Small.
  - **C.** Added by the options check: a second press keeps the temporary
    tab. The press can be on the shown temporary tab, or on the row of its
    file in All files or Changes. Each input counts, also the click that a
    screen reader sends. Nothing new shows. But no editor works this way,
    nobody learns it without a hint, and a press on the shown tab by habit
    also keeps it. Effort: Small.
  - **D.** Added by the options check: B, and one new rule under The tab
    row. The rule says that each action that only a pointer gesture does
    on a tab also has an item in the tab menu. A drag and a double-click
    are such gestures. Each later gesture on a tab then needs a menu item
    too. Effort: Small.
  - **E.** Added by the options check: a menu on each file row of All
    files and Changes, which opens in the same ways as the tab menu. Its
    item opens the file as a kept tab, so a keyboard user keeps a file in
    one step from the list. It is a new menu, with new mockups. Effort:
    Medium.
  - **F.** Added on 12 November 2026, after the keyboard shortcuts of PR
    #216 merged: B, and a Keep tab open command with a default key on the
    Keyboard shortcuts tab. A key runs only a control that the app already
    has, so F needs the menu item of B. The key must be one that no
    browser keeps. Effort: Medium.
- **Left out:**
  - A button on the tab or in the header, because the user chose A over
    both in decision 285.
  - A key alone, with no menu item, because a key runs only a control that
    the app already has (decision 144). F holds the key together with B.
  - Enter on a file row opens a kept tab, as in the VS Code Explorer,
    because a screen reader in browse mode sends Enter as a click. Each
    glance from the keyboard would also leave a kept tab.
  - A tab that becomes kept after a time, or when the user comes back to
    it, because each long glance would then leave a kept tab. That is the
    problem of decision 284.
  - The command palette, because it offers only the actions that the page
    offers.
- **Shared assumptions:**
  - Nothing new shows on the tab. Source: decision 285. Kept.
  - The tab menu opens with a right click, Shift+F10, or the Menu key.
    Source: decision 188. Kept.
  - Each press opens the temporary tab, also Enter, so a keep always comes
    after the open. Source: a design call of this plan, from the text of
    decision 284. The left-out "Enter on a file row" approach drops it.
- **Wider fix:** D. Decision 188 closed the same gap for a drag with Move
  left and Move right.
- **Previous examples:** The tab menu of VS Code holds Keep Open for a
  preview tab, as its
  [editor contributions](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/browser/parts/editor/editor.contribution.ts)
  and [this guide](https://dev.to/brijeshshah13/prevent-opening-of-files-over-existing-tabs-in-vs-code-568l)
  show. Decision 188 gave the drag its items in the tab menu.
- **Related:** Decision 287. When a move keeps the tab, Move left and Move
  right also keep it, but only as a side effect of a move.
- **Recommendation:** B. It puts a named action in the menu where keyboard
  and screen-reader users look, and C stays hidden. D best protects the
  codebase, because each later pointer-only gesture on a tab then gets a
  menu item.
- **Chosen:** B, by the user on 12 November 2026. The user also
  confirmed that a double-click on the row of the file in the Files panel,
  or on the tab, keeps the tab, as decision 285 says.
- **Options check, 11 November 2026:** the check wrote the root question
  in the words of the goal, added C, D, and E, corrected the reasons of
  Left out, and kept B.

## Decision 287: A move of a temporary tab

Added on 11 November 2026. The plan of the tab moves left this question
to the change that merges second. Chosen on 12 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `src/chat/state/tab-order.ts:82`, the move of a tab in the
  saved order.
- **Background:** Decision 186 lets the user drag any tab to any place in
  the row. Decision 188 adds Move left and Move right to the tab menu.
  Decision 284 replaces the file of the temporary tab in its place at the
  next press.
- **Problem:** The user can move the temporary tab to a chosen place. The
  next press on a file then replaces it there, and the moved file leaves
  the row.
- **Impact if no action:** A user who moves a glanced file next to a chat
  loses that tab at the next press, and must find the file again.
- **Root question:** What happens to a temporary tab that the user moves?
- **Options:**
  - **A.** The tab stays temporary. The next press replaces its file in
    the new place. Only a double-click keeps a tab. Effort: Small.
  - **B.** A move keeps the tab, as VS Code does. A drag that changes the
    place, Move left, or Move right turns it into a kept tab, and its
    title turns upright. A drag that Escape cancels, or that ends in the
    same place, keeps it temporary. Effort: Small.
- **Left out:**
  - A temporary tab cannot move, because decision 186 lets every tab move.
  - A drag keeps the tab but Move left and Move right do not, because two
    ways to make one move would then act differently.
  - A fixed place for the temporary tab at the end of the row, so that a
    move out of that place keeps the tab, because a new tab of any kind
    must open at the end of the row (decision 186).
  - This item has two approaches, because a move either keeps the tab or
    does not.
- **Shared assumptions:**
  - Any tab moves to any place. Source: decision 186. Kept.
  - Move left and Move right make the same move as a drag. Source:
    decision 188, and the code: both send the move to `moveTab`. Kept.
- **Wider fix:** Already in force. The drag and the tab menu share one
  move path, so one rule in `moveTab` covers both.
- **Previous examples:** VS Code keeps a moved preview tab, but only when
  its place changes, as its
  [editor group](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/browser/parts/editor/editorGroupView.ts)
  shows. The reporter of
  [issue 238980](https://github.com/microsoft/vscode/issues/238980)
  expected the tab to stay a preview tab, so some users expect A.
  [Zed](https://zed.dev/docs/reference/all-settings) keeps a preview tab
  that the user drags to another pane.
- **Related:** Decision 286.
- **Recommendation:** B. A move shows that the user wants the file at that
  place, and VS Code works this way.
- **Chosen:** B, by the user on 12 November 2026.
- **Options check, 11 November 2026:** the check kept B, added one
  left-out approach, and named the wider fix that is already in force. It
  corrected the use of issue 238980, whose reporter expected A.

## Design

These are design calls of the agent, made on 11 November 2026 under the
decision test.

- The title of the temporary tab shows in italics. Nothing else on the tab
  changes. Reason: the user suggested italics, three editors use them, and
  decision 285 adds nothing else.
- A screen reader hears that the tab is temporary. The names that the tab
  menu and the move messages use stay the same. Reason: italics carry the
  state only for the eye.
- One press opens a file or a diff with no tab in the temporary tab. This
  holds for a row of All files, a row of Changes, a file chip of a
  finished turn, a file chip of a message, and the file link of a diff
  page. Reason: one rule for each press. The file mentions protocol
  already ties a chip to a press in All files.
- An address that shows a file or a diff with no tab opens it in the
  temporary tab too: Back, Forward, a reload, a pasted address, and a link
  that opens in a new browser tab. Reason: a visit by address is a glance
  too.
- A press on a file that has a tab shows that tab. The temporary tab stays
  as it is. A press on a session tab also leaves it. Reason: VS Code and
  Zed work this way.
- A double-click keeps the tab on a file row of All files, on a file row of
  Changes, and on the tab itself. A chip has no double-click. Reason: the
  user named the file and the tab, and a chip in the message field takes
  double-clicks for its text.
- The switch between Preview and Source keeps the state of the tab. Copy,
  Download, and a scroll do not keep the tab. Reason: decision 285 keeps a
  tab only on a double-click, and decisions 286 and 287 decide the menu
  and the moves.
- A new temporary tab opens at the end of the row, as each new tab does. A
  replaced temporary tab keeps its place. A keep does not move the tab.
  Reason: the tab row rules of decision 186.
- The saved view names the temporary tab in one field, by its kind and
  its path. The Worker stores the field. It reads a value that is not
  valid, or that names no open file or diff tab, as no temporary tab. A
  saved view from before this change has no field, so all its tabs stay
  kept. Reason: one field holds at most one mark by its type, and the kind
  and the path stay the same through a switch of mode. All view state
  except the panel widths lives on the Worker, and the change adds no
  rejection. The options check proposed the one field in place of a mark
  on each tab.
- The docs and the code say "temporary tab". Reason: "Preview" already
  names the Markdown view switch and the port Preview tool, and a file tab
  already has a `preview` mode.
- No setting turns temporary tabs off. Reason: the user asked for this
  behaviour, and a setting can come later.
- A press on a phone uses the temporary tab too, so each press on a phone
  replaces the last glance. A phone has no way to keep a file tab. Reason:
  a phone row shows no file tabs, so the files that the user opens on a
  phone do not fill the desktop row.
- The second click of a double-click does not open the file again, and a
  double-click selects no text. Reason: a keep must not add a second
  history entry for the same address. The follow-up item
  `plans/follow-ups/repeated-file-click-adds-history-entry.md` still
  covers a second single press, in its own branch.
- A temporary tab closes as each other tab closes. A read-only workspace
  uses the same rules in its browser copy of the view, and a double-click
  keeps a tab there too. Reason: a keep there changes only the browser
  copy, as an open does. Its tab menu follows decision 214, which decision
  286 B keeps.

These design calls were made on 12 November 2026, after the answers to
decisions 286 and 287.

- The tab menu of the temporary tab holds Keep open, then a line, then
  Move left and Move right. A kept tab has no Keep open. Reason: the tab
  menu groups its items by kind (decision 188), and Keep open changes
  only a temporary tab.
- After Keep open, the focus goes back to the tab, and a screen reader
  user hears the name of the tab and that it stays open, such as
  "README.md stays open". Reason: Move left and Move right give the same
  kind of message after a move.
- A read-only workspace leaves out Keep open, so a file or diff tab there
  still opens no tab menu. Reason: decision 214.
- A move keeps the temporary tab only when its place changes. A drag that
  Escape cancels, or that ends in the same place, keeps it temporary.
  Reason: the text of option B of decision 287.
- The public guide `src/marketing/docs/files-and-changes.md` and the File
  tabs and editor row of the Conductor comparison page describe the
  temporary tab. Reason: the repository rules say that a change updates
  each guide that it makes wrong, and the status of each listed feature
  that it ships.

These design calls were made on 12 November 2026, when the mockups were
drawn.

- A screen reader hears the name of the temporary tab, then "temporary",
  as in "README.md, temporary". Reason: VS Code reads "preview" after the
  name of its preview tab in the same way, so the name still starts with
  the file.
- Keep open has the icon of a bookmark with a check. Reason: each item of
  the tab menu has an icon, and a pin names the pinned tabs of a browser
  and of VS Code, which is another feature.
- A press on the chip of an attached file in a sent message opens the copy
  of the file in the temporary tab too. Reason: decision 264 B opens that
  chip as a file chip opens its file.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the temporary tab in the tab row on desktop. A phone row shows no
file tabs, so the phone variants change only where a page shows the row.

- [x] Add a temporary state to the mockup tab in
      `docs/mockups/src/components/workspace/TabItem.tsx`, with its title
      in italics. The copy that a drag lifts keeps the italics.
- [x] In `app/files`, draw the file or the diff that a list opened as the
      temporary tab: README.md in `markdown` and AddressForm.tsx in
      `diff`. The code file that stays open is a kept tab. Update the
      descriptions of the variants.
- [x] Add a page for the temporary tab, with at most five screens: a press
      opens a file in the temporary tab, a press on another file replaces
      it in its place, and a double-click keeps it while the next press
      opens a new temporary tab at the end. Make the page reachable from
      `app/files` and `app/tabs`.
- [x] On the new page, draw the tab menu of the temporary tab with Keep
      open, a line, then Move left and Move right (decision 286 B).
- [x] Update `docs/mockups/design.md` and `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages on
      desktop and on a phone.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the temporary tab as requirements, with decisions 284 and 285.

- [x] In `docs/protocol/workspace-tools.md`, under Files and changes, state
      the temporary tab: what opens it, the italics, the replace in place,
      the double-click that keeps it, the address rule, and that each
      press on a phone replaces the last glance. Give decision 284 with
      its rejected alternatives, and decision 285.
- [x] In `docs/protocol/agents-and-sessions.md`, under The tab row, state
      where a new and a replaced temporary tab go. State Keep open in the
      tab menu of the temporary tab (decision 286 B), and that a move to
      another place keeps the tab (decision 287 B).
- [x] Read the Terms page and the Privacy page in full, and update each
      sentence that restates a changed fact.
- [x] Read each public guide in `src/marketing/docs/` in full. In
      `files-and-changes.md`, describe the temporary tab, the
      double-click, and Keep open, as
      [Website docs](../docs/protocol/website-docs.md) says.
- [x] In `src/marketing/from-conductor/areas/files.ts`, change the note
      of the File tabs and editor row: temporary tabs ship with this
      change, as
      [Conductor comparison](../docs/protocol/conductor-comparison.md#statuses)
      says.
- [x] Check that `docs/protocol/file-mentions.md` still reads right: a
      press on a chip, also the chip of an attached file in a sent
      message, opens the file as a press in All files does.
- [x] Check each relative link of the changed Markdown files.

## Milestone 3: The saved view keeps the temporary mark

Depends on: 2

- [ ] In `src/shared/workspace-view.ts`, give the saved view an optional
      field that names the temporary tab by its kind and its path.
- [ ] In `worker/app-api/workspace-view.ts`, read and store the field.
      Read a value that is not valid, or that names no open file or diff
      tab, as no temporary tab. Add no rejection.
- [ ] Add Worker tests: the field stays through a save and a load, a view
      without the field loads with no temporary tab, and a value that is
      not valid or names no open tab loads as no temporary tab.
- [ ] Update `src/shared/README.md` where it describes the saved view.
- [ ] Run the targeted Worker tests and `npm run typecheck`.

## Milestone 4: Open, replace, and keep the temporary tab

Tags: ui

Depends on: 1, 3

- [ ] In `src/shell/workspace/files/view-tabs.ts`, open a file or a diff
      in the temporary tab: replace the tab that the field names in its
      place, or add a tab at the end and name it in the field. Show a tab
      that is open with no change to the field. Keep a tab by clearing the
      field. Clear the field when its tab closes. A switch of mode keeps
      the field, because the field names the kind and the path.
- [ ] In `src/files/navigation.ts` and
      `src/shell/workspace/files/files-navigation.ts`, make a press open
      the temporary tab, and make `useOpenTab` do the same for an address
      of a file with no tab. Add a keep for the double-click.
- [ ] In `src/files/panel/FileTree.tsx` and
      `src/files/panel/ChangeList.tsx`, keep the tab on a double-click of
      a file row. In `src/files/ui/FilesLink.tsx`, the second click of a
      double-click opens nothing again, and a double-click selects no
      text.
- [ ] In `src/files/tabs/FileTabItem.tsx`, draw the italic title with
      `.temporary` of the shared `WorkspaceTabs.module.css`, and keep the
      tab on a double-click. Tell a screen reader that the tab is
      temporary, as in "README.md, temporary", also in the `aria-label`
      of a diff tab. Keep `fileTabName` as it is, because the tab menu and
      the move messages use it. `LiftedFileTab` keeps the italics.
- [ ] Check each other way that opens a file or a diff: the chips of a
      finished turn, the chips of a message, the chips of attached files
      in a sent message, and the file link of a diff page. Each one opens
      the temporary tab.
- [ ] Add tests: the view functions, then the wiring of a press, a second
      press, a double-click, an address, a switch of mode, and a close.
- [ ] Update `src/files/README.md`, `src/shell/workspace/README.md`, and
      `src/chat/README.md`.
- [ ] Smoke-test in the browser. Save the screenshots under
      `.context/temporary-file-tabs/`.

## Milestone 5: Moves and the keyboard keep of a temporary tab

Tags: ui

Depends on: 4

- [ ] In `moveTab` of `src/chat/state/tab-order.ts`, or in its caller,
      keep the temporary tab when a drag, Move left, or Move right changes
      its place (decision 287 B).
- [ ] In `src/chat/components/useTabMenu.ts`, add Keep open to the tab
      menu of the temporary tab, before Move left and Move right, with a
      line between them, and with the icon of the mockups,
      `BookmarkCheck`. Leave it out in a read-only workspace. After
      Keep open, give the focus back to the tab and tell a screen reader
      that the tab stays open (decision 286 B).
- [ ] Add tests: a move that keeps the tab, a cancelled drag and a drop
      in the same place that do not, Keep open in the menu, no Keep open
      on a kept tab or in a read-only workspace, and the message.
- [ ] Update `src/chat/README.md` and `src/files/README.md`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, as CI
      does. Run the targeted tests, then `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Record a follow-up item under `plans/follow-ups/` for the tab row
      of the mockups in a narrow catalogue frame. A static view shows the
      start of a row that does not fit, so the shown tab and an open tab
      menu at the end of the row are cut off, as in the `kept` and `menu`
      variants of `app/files/temporary`. The fix draws the row in
      `WorkspaceTabs` of the mockups as the app scrolls it.
- [ ] Record a follow-up item under `plans/follow-ups/` to move The tab
      row out of `docs/protocol/agents-and-sessions.md` to its own page.
      This change takes that doc to 282 lines, over the 250-line target
      of the `documentation` skill. The move waits, because The tab row
      changes often on `main`.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, smoke-test a press, a second press, a
      double-click, and a reload with a temporary tab.
