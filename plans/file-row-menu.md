# A menu on the rows of the Files panel

Status: Active. On branch `calummoore/perth-6s0l`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Files panel in the right column has two lists. All files is a tree of
the branch, and Changes lists the files that the branch changes. Today a
file row is a plain link and a folder row is a button. A right click on a
file row shows the menu of the browser, whose copy items copy the address
of the app, not the path. A member who wants the path of a file selects
its name by hand. On 16 November 2026 the user asked for a right-click
menu on these rows, with Copy path as one item, and asked what else could
go there.

This change adds a menu to each row of All files and of Changes, with
Add to chat and Copy path. It also adds Copy path to the tab menu of a
file or diff tab. The change does not cover Open changes, Open file,
Reveal in All files, Download, Copy link, file changes such as Rename or
Delete, or a visible button that opens the menu. The app still only reads
files.

Contract owners:

- [Workspace tools](../docs/protocol/workspace-tools.md), the section
  "Files and changes", and its page
  [File row menu](../docs/protocol/file-row-menu.md).
- [The tab row](../docs/protocol/agents-and-sessions.md#the-tab-row), for
  the tab menu of a file or diff tab.
- [Temporary tabs](../docs/protocol/temporary-tabs.md), for the record of
  decision 286, which did not choose a menu on each file row for Keep open.
- [File mentions](../docs/protocol/file-mentions.md), for the chip that
  Add to chat puts in the message field.
- [Path labels](../src/files/labels.md) and the
  [Files README](../src/files/README.md).
- The [chat README](../src/chat/README.md), for Add to chat.
- The [mockup catalogue](../docs/mockups/catalogue-attachments-and-files.md).
- The public guide
  [Files and changes](../src/marketing/docs/files-and-changes.md).

## Terms

- **Row menu:** the new menu of one row of All files or Changes.
- **Tab menu:** the menu of a tab in the row of tabs of the centre column.
- **Label:** the text that a screen shows for a path. It hides each exact
  secret value in the path. The browser still holds the real path. A label
  never becomes a path (decision 145).
- **Real path:** the path of the file relative to the root of the
  repository, such as `src/app.ts`.
- **Chip:** the box that the message field shows for a mention of a file
  or a folder, such as `@src/app.ts`.
- **Read-only workspace:** an archived workspace, or a workspace of a
  suspended org.

## Decisions

The brainstorm of 16 November 2026 found 33 candidate items. A separate
agent listed them without the working agent's ideas. The notes are in
`.context/file-menu/`.

### 1. Which actions the row menu offers

Answered on 16 November 2026: **A and Add to chat**. The row menu holds
Copy path and Add to chat.

- Root question: what actions should a member be able to take on a file or
  a folder straight from its row?
- A. Copy path only. Effort: Medium.
- B. Copy path, Open changes, Open file, and Reveal in All files. Effort:
  Medium. This was the recommendation.
- C. B and Add to chat. Effort: Large.
- D. C and Rename, Delete, New file, and New folder, with new write routes.
  Effort: Large.
- The user chose Copy path and Add to chat, without the open items of B.
- Left out: change nothing, and a Copy path button with no menu. Both fail
  the request.
- Later candidates, not chosen now: Open changes, Open file, Reveal in All
  files, Download, Copy link, Open in new tab, Copy name, Copy as mention,
  Collapse or expand all, Copy contents, Copy diff, Open on GitHub, Copy
  absolute path, New session with this file, Open in Terminal, and file
  changes. Each can come back as its own change.

### 2. Copy items on a row whose label hides a secret

Answered on 16 November 2026: **A**.

- Root question: what may leave the screen for a path whose label hides a
  secret value?
- A. Leave Copy path and Add to chat out of the menu of that row, as the
  `@` list leaves the entry out. A row with no item opens no menu. Effort:
  Small.
- B. Show those items as off, with a short reason. Effort: Small.
- C. Copy the real path anyway, because the address bar already shows it.
  Effort: Small.
- D. Copy the path with the name of the org's env var in place of each
  hidden value, such as `data/$STRIPE_KEY/a.json`. The Worker must then
  send the name of each hidden value, so the labels of decision 145
  change. Effort: Large. The options check added it.
- Left out: copy the label, because the copied text names no real file.
- Wider fix: one shared check, "the label of this row hides nothing",
  that the `@` list and each item of this change use. The check reads the
  record of the row, not only a path and a label, because a folder that
  the tree lacks has no label of its own. The options check added this
  rule.

### 3. Copy path in the tab menu of a file tab

Answered on 16 November 2026: **B**.

- Root question: where else should a member find Copy path for the open
  file?
- A. Only on the rows. Effort: Small.
- B. Also in the tab menu of a file or diff tab. A read-only file tab then
  opens a menu with only Copy path. Effort: Small.
- C. B, and a Copy path button in the header of the file page, which also
  works on a phone. Effort: Medium.
- D. B, and a Copy path action in the command palette while a file or
  diff tab shows. Effort: Medium. The options check added it.
- Recommendation before the answer: B. It adds one item to a menu that
  already has the read-only rule.

### 4. Which message field Add to chat writes into

Answered on 16 November 2026: **A**. The user chose A over the
recommended F.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/app/composer-focus.ts`,
  `src/chat/components/chip-field/focus-plugins.tsx:25-45`.
- **Background:** on desktop, the centre column shows one tab at a time. It
  can be a session tab, with a message field, or a file tab, with none. A
  workspace can have several session tabs, or none. On a phone, the Files
  tab and the chat are separate views.
- **Problem:** a message field exists only while its session shows. While
  a file tab shows, or a phone shows Files, no field is mounted. While a
  sandbox is stopped, the sandbox bar replaces the field. So no field is
  the clear target of the chip.
- **Impact if no action:** the build cannot choose where the chip goes, so
  Add to chat cannot ship.
- **Root question:** which draft gets the mention of Add to chat, and does
  the app then show that chat?
- **Options:**
  - **A.** The session tab that showed last. The app shows that tab, and
    the chip goes in at the caret of its field. A phone switches to that
    chat. With no session tab, the item starts a new session with the
    chip. Effort: Medium.
  - **B.** Always a new session with the chip. Effort: Medium.
  - **C.** Only the shown session tab. While a file tab shows, or on a
    phone, the item does not show. Effort: Small.
  - **D.** A submenu that lists the open session tabs, then New session.
    Effort: Medium.
  - **E.** The session that the member saw last, as for the pull request
    bar, and the view stays as it is. While its field shows, the chip goes
    in at the caret. Otherwise the mention goes at the end of its draft,
    and a toast says "Added to chat". With no open session, the chat
    shows. Cost: the member does not see the chip at once. Effort: Medium.
    The options check added it.
  - **F.** A, through the draft. The target, the change of view, and the
    new session stay as A says. While the field of that session shows, the
    chip goes in through the field, at its caret. Otherwise the chat
    controller writes the mention into the draft, and the field shows it
    as a chip when it mounts. It also works while a stopped sandbox hides
    the field. Cost: two ways to insert. Effort: Medium. The options check
    added it.
  - **G.** On desktop, the message field of the session that the member
    saw last stays below each file tab. A phone still needs A or E. Cost:
    a new layout of the centre column. Effort: Large. The options check
    added it.
- **Left out:**
  - A chip in each open field, because a member writes one message at a
    time.
  - A drag of the row onto the message field, because decision 1 chose a
    menu item. It can come back as its own change.
- **Wider fix:** F. It puts the insert in the chat controller beside
  `sendPrompt`, so each action from outside the chat that writes to a
  session reads one target.
- **Previous examples:**
  - The agent actions of the pull request bar send to the session that the
    member saw last, also while a file shows
    (`src/chat/state/prompt-actions.ts:14-33`,
    `docs/protocol/messages-and-attachments.md`, "Messages from the bar").
  - A drop of files goes only to the field of the open session
    (`docs/protocol/message-attachments.md`).
- **Recommendation:** F. It keeps the one press of A, uses the target that
  the pull request bar already uses, and also works while a field is not
  mounted. The first recommendation was A. The options check changed it.
- **Action:** answered by the user: A.

## Design

### The row menu

- A right click on a row opens the row menu at the pointer. On a focused
  row, Shift and F10, or the Menu key, opens it below the row. On a phone,
  a long press that ends with no move opens it as a sheet with the name of
  the row as its title. These are the ways that the tab menu opens.
- The menu opens on file rows and folder rows of All files, and on the
  rows of Changes.
- The row menu holds two groups, with a line between them: Add to chat,
  then Copy path. Reason: the tab menu groups its items by kind
  (decision 188), and an action comes before a copy item, as Rename
  session comes before Copy link. Working agent's call, 16 November 2026.
- Milestone 5 adds Add to chat. Before it, the menu held only Copy path.
- Escape, Tab, or a press outside closes the menu. The focus goes back to
  the row. The row of an open menu gets the mark that a tab with an open
  menu has: the fill of a hover. A phone keeps that fill on the row under
  the sheet, as a phone tab keeps it under its sheet. Working agent's call,
  16 November 2026, from the mockups.
- Add to chat has the icon of the `@` of a mention, and Copy path has the
  copy icon of the copy items of the tab menu. Reason: the speech bubble
  with a plus names New session in the app, and the chip that Add to chat
  puts in the field is a mention. Working agent's call, 16 November 2026,
  from the mockups.
- The browser's own menu does not open on the rows. A click with a
  modifier key, or a middle click, still opens the file in a new browser
  tab. A row with no item, such as a row whose label hides a secret,
  opens no menu, so the browser shows its own.
- A long press binds only to a touch pointer. A mouse can still select the
  text of a row.
- On desktop, a long press of a finger opens the row menu at the point of
  the press, as the tab menu does there. Only a phone draws the sheet.
  Working agent's call, 16 November 2026, from the tab menu.
- A row with a menu shows no link menu of the system at a long press. On a
  screen whose main pointer is a finger, its text does not select either,
  so the long press opens only the row menu. Working agent's call, 16
  November 2026.
- The menu reuses `PointMenu`, `Sheet`, and `MenuList` of `src/shell/ui/`,
  `opensMenu` of `src/shell/ui/menu-keys.ts`, and `useLongPress` of
  `src/app/long-press.ts`. The Files screens get the items as a prop from
  the shell, so `src/files/` keeps no tie to the chat.

### Copy path

- Copy path copies the real path relative to the root of the repository,
  with no `./`, no final `/`, and no quotes, such as `src/app.ts` or
  `src/lib`. Reason: the tree holds relative paths, and the terminal and
  both agents start in the repository folder (decision 94). Working
  agent's call, 16 November 2026.
- On a Changes row of a moved file, it copies the new path. On a deleted
  file, it copies the path that the file had.
- A toast gives the result: "Path copied", or "The path didn't copy. Try
  again." Reason: the menu closes at the press, as for Copy link of a
  workspace row. Working agent's call.
- The copy runs during the press, through `services.copy` of the org, so
  the Mac app copies too.
- The label "Copy path" stays, although the docs also name the "copy path"
  of an attached file (decision 262 D). The docs write "the Copy path
  item". Working agent's call.
- A read-only workspace shows no rows, so the row menu never opens there.
  An archived workspace has no file lists. In a suspended org the refused
  start takes the place of All files and Changes, in the app
  (`sandboxPlaceholder` of `src/shell/workspace/files/files-features.tsx`)
  and in the mockups (`app/orgs/suspended/workspace`). A read-only
  workspace keeps Copy path only in the tab menu of a file or diff tab,
  because a copy changes nothing (decision 214). Working agent's call, 16
  November 2026, from the mockups. It corrects an earlier call of the same
  day, which said that a workspace of a suspended org shows the row menu
  with only Copy path.

### Copy path in the tab menu

- The tab menu of a file or diff tab gets Copy path in its own group,
  after Keep open on the temporary tab and before Move left and Move
  right. Reason: the session tab menu has its copy items after Rename
  session and before the moves. Working agent's call.
- A read-only file or diff tab then opens a tab menu with only Copy path.
- A tab whose label hides a secret leaves out Copy path, as decision 2 A
  says.
- The tab menu in `src/chat/` knows only the title of a file tab. So the
  shell gives the Copy path item through `RenderTab`, as it gives `keep`
  in `src/shell/workspace/files/chat-files.tsx`.
- In a suspended org, the Worker refuses the file routes. A tab there takes
  its label from the stored file events of the workspace. A tab whose
  label these events do not give shows "File", so it opens no tab menu.
  Working agent's note, 16 November 2026.

### Labels

- One shared check says whether the label of a row hides a secret value.
  The `@` list, the row menu, and the tab menu use it. Add to chat also
  needs a path that a mention can hold, as `mentionable` of
  `src/chat/mentions/mention-rows.ts` checks.
- The check reads the record of the row. A folder that the tree lacks,
  which All files draws from the path of an entry inside it, has no label
  of its own. It counts as hiding when its name comes from the label of
  that entry (`src/files/model/tree-rows.ts`, `folderName`). A tab whose
  label is not known yet also counts as hiding. Reason: a missing label
  must not let a secret value through. Working agent's call, 16 November
  2026, from the options check.
- A row inside a folder that the tree moved can keep its old label for a
  while, so it can open no menu until the tree reads again. This errs on
  the safe side. Working agent's call.
- The menu shows only labels. It reads the real path only at the press.
- The Files lists run the check themselves. They ask the shell for no item
  of a row whose label hides a secret value, so no item of the shell gets
  the real path of such a row. Working agent's call, 16 November 2026.

### Add to chat

Decision 4 A sets the target. Milestone 5 builds it.

- Add to chat puts the chip of the file or the folder into the message
  field of the session tab that the member saw last, at its caret, with a
  space after it, as a pick from the `@` list does. A folder chip names
  the folder with a final `/`, as `mentionText` writes it.
- The app shows that session tab first. On a phone, it switches to the
  chat of that session. A field that mounts again has no caret, so the
  chip then goes at the end of the text.
- With no open session tab, the item starts a new session, through
  `newSession` of the chat controller, and the chip goes into its field.
- The item shows only for a path that the `@` list offers, as
  `findMentioned` of `src/chat/mentions/MentionsContext.tsx` checks.
  Reason: the field turns any other mention back into text.
- A Changes row of a deleted file leaves out Add to chat, because the chip
  would name a file that the branch does not hold. Working agent's call.
- A read-only workspace shows no rows, as the section "Copy path" says.
  Its bar also takes the place of the message field, so the rule below
  already leaves out Add to chat there. Working agent's call, 16 November
  2026, from the mockups.
- While a bar of the computer takes the place of the message field, such
  as while the computer is stopped, the item does not show. Reason: no
  field can take the chip, and decision 4 A chose the field, not the
  draft. Working agent's call, 16 November 2026.
- On a phone, the field does not take the focus after Add to chat, so no
  keyboard opens by itself. On desktop, the field takes the focus. Working
  agent's call.
- On desktop, the field takes the focus through the focus request of the
  app, which a click on a workspace in the sidebar also makes. So the
  field takes the focus unless the focus moved to another element before
  the field shows, as
  [the sidebar rule](../docs/protocol/orgs-and-members.md#sections)
  says. This matters only while a new session starts, because each other
  case shows the field at once. To give the request the row as its
  element, the row menu gives the focus back to the row before an item
  runs, and not only after the menu closes. Working agent's call, 16
  November 2026. Reason: the field never takes the focus from a later
  choice of the member.
- The item shows only after the chat loads. Before then, the chat does not
  know its session tabs, so a press could start a needless new session,
  and no field can take the chip. A failed load of the chat shows no
  field either. Working agent's call, 16 November 2026, from the rule for
  a bar that takes the place of the field.
- The chat keeps the chip as a request until the field of its session
  shows, and that field puts it in as an edit. So the draft gets the
  mention as typed text does, and the chip is one step of undo. A newer
  Add to chat takes the place of a request that still waits. An entry
  that leaves the list of `@` before its field shows, such as while a new
  session starts, gets no chip. Working agent's call, 16 November 2026,
  from decision 4 A, which writes through the field and not into the
  draft.
- A deleted file of Changes has no Add to chat, also while the tree still
  holds that file. The tree and Changes come from their own reports, so
  they can disagree for a while. Working agent's call, 16 November 2026.

## Milestone 1: Mockups (completed)

Tags: mockup

Depends on: none

Draw the row menu, the new tab menu item, and the result of Add to chat
in the `app/files` pages, on desktop and on a phone.

- [x] Add the page `app/files/menu`. Its canonical screen has the row menu
      of a file row of All files, with Add to chat, a line, and Copy path.
      The page with its six planned variants shows seven screens, and a
      catalogue page shows at most five. So each planned variant is a
      child page with the same path, such as `app/files/menu/folder`, and
      the page shows only its canonical screen. Working agent's call, 16
      November 2026, from the catalogue rules of `docs/mockups/catalogue.md`.
      - [x] Child page `folder`: the row menu of a folder row.
      - [x] Child page `changes`: the row menu of a row of Changes.
            - [x] Its variant `deleted`: the row menu of a deleted file,
                  with only Copy path. Working agent's call, 16 November
                  2026: it draws the rule of the design for a deleted file.
      - [x] Child page `copied`: the toast "Path copied" after the press.
            - [x] Its variant `failed`: the toast "The path didn't copy.
                  Try again." Working agent's call, 16 November 2026: it
                  draws the failure toast of the design.
      - [x] Child page `stopped`, in place of the variant `read-only`: the
            row menu with only Copy path while the bar of a stopped cloud
            computer takes the place of the message field. A read-only
            workspace shows no rows, as the section "Copy path" says, so
            the planned `read-only` state cannot happen. Working agent's
            call, 16 November 2026, from the mockups.
      - [x] Child page `added`: the session tab that Add to chat showed,
            with the chip of the file in its message field.
      - [x] The phone view: the row menu as a sheet with the name of the
            row, and the chat with the chip after Add to chat.
- [x] Update the `menu` variant of `app/files/temporary`: Keep open, a
      line, Copy path, a line, Move left and Move right, a line, Close tabs
      to the right.
- [x] Add a `read-only-tab` child page to `app/files/menu`: the tab menu of
      a file tab in a read-only workspace, with only Copy path.
- [x] Update `docs/mockups/catalogue-attachments-and-files.md` and the
      table row of `app/files` in `docs/mockups/catalogue.md`.
- [x] Update the other mockup texts that this change makes wrong. The
      texts of `app/tabs`, `app/transcripts`, and
      `docs/mockups/design-workspace.md` gave the old tab menu, and said
      that a read-only file tab opens no menu. `docs/mockups/design.md`
      and the mockups README name the parts that draw the menu and the
      toast. The menu at the pointer of a workspace row moved to a shared
      `PointMenu` in `docs/mockups/src/components/common/`, which the rows
      of the Files panel use too. Working agent's call, 16 November 2026.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol (completed)

Depends on: 1

State the row menu, Copy path, and Add to chat as requirements, with the
decisions of this plan.

- [x] `docs/protocol/workspace-tools.md`, "Files and changes": the row
      menu, how it opens, its items, Copy path, and the rule for a row
      whose label hides a secret (decisions 1 and 2). The row menu has its
      own page, `docs/protocol/file-row-menu.md`, which "Files and
      changes" links. Reason: `workspace-tools.md` already passes the
      length target of the `documentation` skill, and `temporary-tabs.md`
      was split out of it for the same reason. The index
      `docs/architecture/protocol-docs.md` lists the page. Working agent's
      call, 16 November 2026.
- [x] `docs/protocol/agents-and-sessions.md`, "The tab row": Copy path in
      the tab menu of a file or diff tab, and the read-only file tab that
      now opens a tab menu (decision 3).
- [x] `docs/protocol/temporary-tabs.md`: say that decision 286 did not
      choose a menu on each file row for Keep open. The row menu has no
      Keep open.
- [x] `docs/protocol/file-mentions.md`: Add to chat as a way to put a chip
      in the message field, with its target (decision 4 A).
- [x] `src/files/labels.md`, `src/files/README.md`, and
      `src/chat/README.md`. Also `src/chat/tab-row.md` and
      `src/chat/loads-and-sends.md`, which said that a read-only file tab
      opens no tab menu.
- [x] The public guide `src/marketing/docs/files-and-changes.md`.
- [x] Read the Terms page `src/marketing/terms.ts` and the Privacy page
      `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact. Both pages, with `terms-org.ts`,
      `privacy-uses.ts`, and `privacy-recipients.ts`, hold no sentence
      that restates a changed fact, so they stay as they are.
- [x] Read each other public guide in `src/marketing/docs/` in full.
      Update each sentence that restates a changed fact.

## Milestone 3: The row menu with Copy path (completed)

Tags: ui

Depends on: 2

Build the row menu on both lists, with Copy path only.

- [x] Add the shared check that a label hides no secret value. Use it in
      `mentionable` of `src/chat/mentions/mention-rows.ts`. It is
      `hidesSecret` of `src/files/model/file-labels.ts`, with
      `tabHidesSecret` for a tab. `TreeRow.hidesSecret` of
      `src/files/model/tree-rows.ts` applies it to the entry that names a
      folder that the tree lacks.
- [x] Add a row menu prop to `FilesPanel`, `FileTree`, and `ChangeList`.
      The prop gives the items of a row from its real path and kind. It is
      `rowMenu`, of type `RowMenuItems` in `src/files/panel/row-menu.ts`.
      It gets the real path, the kind, and the change of the row, and gives
      groups of items, so Add to chat can come as the first group.
- [x] Open the menu with a right click, the menu keys, and a long press of
      a finger. Reuse `PointMenu`, `Sheet`, `MenuList`, `opensMenu`, and
      `useLongPress`. `useRowMenu` of `src/files/panel/useRowMenu.tsx`
      does it for both lists.
- [x] Mark the row of the open menu. Give the focus back to the row when
      the menu closes.
- [x] In the shell, give Copy path through `services.copy`, with the
      toast of its result. `useCopyPath` and `useRowMenuItems` of
      `src/shell/workspace/files/copy-path.ts` do it.
- [x] Leave Copy path out on a row whose label hides a secret. The lists
      ask the prop for no item of such a row, as the section "Labels" says.
- [x] Tests: the items on file, folder, and Changes rows; each way to open;
      the copied text; the toast; a hidden-secret row that opens no menu;
      the saved lists of a stopped cloud computer. A read-only workspace
      shows no rows, so it needs no test here. Working agent's call, 16
      November 2026, from the mockups. The tests are
      `src/files/panel/RowMenu.mounted.test.tsx`,
      `src/shell/workspace/files/RowCopyPath.test.tsx`, and a case in
      `src/files/model/tree-rows.test.ts`.

## Milestone 4: Copy path in the tab menu (completed)

Tags: ui

Depends on: 3

- [x] Add Copy path to the tab menu of a file or diff tab in
      `src/chat/components/useTabMenu.ts`, in its own group after Keep
      open. The shell gives the item through `RenderTab`. The shell gives
      a `copyPath` with each tab, and the chat builds the item. The groups
      moved to `src/chat/components/tab-menu-items.ts`, because
      `useTabMenu.ts` would pass the length limit. Working agent's call, 16
      November 2026.
- [x] Keep it in a read-only workspace, so a read-only file tab opens a
      menu with only Copy path. Leave it out on a tab whose label hides a
      secret.
- [x] Tests: the items of each file tab menu, the copied text, and the
      read-only tab. The tests are
      `src/shell/workspace/files/TabCopyPath.test.tsx`, and the updated
      menus of `src/shell/workspace/files/TemporaryTabMenu.test.tsx`.

## Milestone 5: Add to chat (completed)

Tags: ui

Depends on: 3

- [x] Add Add to chat to the row menu, before Copy path, with a line
      between them. `useAddToChat` of
      `src/shell/workspace/files/add-to-chat.ts` gives the first group of
      `useRowMenuItems`.
- [x] Show the session tab that the member saw last, or start a new
      session when no session tab is open. On a phone, switch to its chat.
      `addToChat` of `src/chat/state/mention-actions.ts` does it behind
      `ChatController.addToChat`. `newSession` gives it the ID of the new
      session. `controller.ts` reached the length limit, so its runs moved
      to `ChatRuns` of `src/chat/state/chat-runs.ts`, which the controller
      extends. Working agent's call, 16 November 2026.
- [x] Put the chip into its message field with the insertion of a pick
      from the `@` list, once the field shows. Give the field the focus on
      desktop only. `FieldHandle.insertMention` puts the chip in, and
      `useRequestedMention` of `src/chat/components/composer-requests.ts`
      takes the request of `ChatSnapshot.mentionRequest`. The focus comes
      from the focus request of the app, as the section "Add to chat"
      says. The smoke test in Chrome found that a field that kept its
      caret took the focus on a phone at a later commit of the editor. So
      a field that takes no focus keeps no caret.
- [x] Leave the item out while a bar of the computer replaces the field,
      on a deleted file of Changes, and on a path that `findMentioned`
      refuses. A read-only workspace shows no rows, and its bar replaces
      the field too. Working agent's call, 16 November 2026, from the
      mockups. It also stays out until the chat loads, as the section
      "Add to chat" says. `barReplacesComposer` of
      `src/shell/workspace/sandbox-view.ts` gives the rule of the bar.
- [x] Tests: a file chip, a folder chip, a shown session, a session behind
      a file tab, no open session, the phone, and each row that leaves the
      item out. The tests are
      `src/shell/workspace/files/RowAddToChat.test.tsx` and
      `src/chat/components/chip-field/InsertMention.dom.test.tsx`. The
      first case of `src/shell/workspace/files/RowCopyPath.test.tsx` now
      expects Add to chat before Copy path.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`, after
      `npm --prefix desktop ci` and `npm ci --prefix runner`.
- [ ] Check the menu in a browser on desktop and in a phone layout.
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

## Post-merge follow-up (non-blocking)

- [ ] On `conductive.build`, open the row menu in the Mac app and in a
      phone browser. Check Copy path and Add to chat.
