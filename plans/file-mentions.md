# File mentions in the composer

Status: Active. On branch `calummoore/file-selector-list`, no pull request
yet. The pull request that completes the work deletes this plan, as the
`plans` skill says.

A person who writes to the agent cannot point at a file of the workspace
without typing its whole path. This change adds a list of the files and
folders of the workspace to the composer of a workspace chat. Typing `@`
opens the list, and the text after `@` filters it, as in Conductor. A pick
puts a chip with an icon and the name of the entry into the message. The
agent gets the path of each entry inside the repository, in the text of the
message. A press on a file chip opens the file, as a press in All files does. Each chip of
the composer, also a workspace chip and an attached file, swaps its icon
for a × under the pointer, and a press on the × removes the chip.

The change does not cover ignored files, the composer of New workspace, a
terminal row as in Conductor, or chips in agent answers. The brainstorm
notes are in `.context/file-mentions/`.

Contract owners:

- `docs/protocol/file-mentions.md`, a new protocol doc.
- [Workspace links](../docs/protocol/workspace-links.md), for the × of a
  chip in the message field.
- [Chat and events](../docs/protocol/chat-and-events.md), for the attached
  files of the composer.
- The [chat README](../src/chat/README.md) and the
  [Files README](../src/files/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).

## Decisions

Decisions 213 to 217 take the next free numbers on 9 November 2026. Before
the pull request, renumber them when `origin/main` uses these numbers, as
[Decision numbers collide](follow-ups/decision-numbers-across-plans.md)
says.

### 213. What a picked file puts into the message

- Asked on 9 November 2026 as item 1 of the brainstorm. The user chose B
  on 9 November 2026, with changes.
- **A.** Plain `@path` text at the caret. Recommended, not chosen.
- **B.** A file chip in the field and in the sent message. Chosen.
- **C.** A file reference in the row of attached files. Not chosen.
- The changes of the user to B:
  - The chip shows only an icon and the name of the entry.
  - The agent gets the absolute path of the entry. Later on 9 November
    2026, the user made this a preference, as decision 216 says.
  - A press on a file chip shows the file, as a press on the file in All
    files does.
- Reason: the chip keeps the file in the sentence with a short name, as
  decision 211 D does for workspace links.

### 214. Which files the list offers

- Asked on 9 November 2026 as item 2 of the brainstorm. The user chose A
  on 9 November 2026.
- **A.** The file tree that the workspace keeps: the files and folders
  that All files shows. Chosen.
- **B.** A live search on the cloud computer, with ignored files. Not
  chosen.
- **C.** The file tree, plus a list of ignored files that the runner
  reports. Not chosen.
- Reason: A needs no new backend, and it works while the cloud computer
  sleeps. Ignored files, such as `.context/`, do not show.

### 215. Each chip of the composer removes from its icon

- The user asked for it on 9 November 2026, with two Conductor screenshots
  of a folder chip, at rest and under the pointer.
- Each chip of the composer shows its icon. While a pointer is over the
  icon, a × takes its place. A press on the × removes the chip.
- The rule holds for file chips and workspace chips in the message field,
  and for the attached files above it. An attached file loses its × at the
  end. A chip in a sent message has no ×.

### 216. Where the absolute path of a mention is made

Answered on 9 November 2026 with D. It was item 3 of the message of
9 November 2026.

- **Answer of the user:** "absolute path is not a strict requirement, if
  relative is better we could go with that". The user also asked for my
  view.
- **My view:** the path inside the repository is better, so the plan
  follows D, which the answer added. Both agents start in the repository
  folder, and their instructions name that folder. So the agent reads
  `@src/app.ts` as one exact file. D needs no Worker change, keeps the
  stored text, the agent's text, and the titles short and equal, and works
  with every runner, also while the kept tree is out of date.
- The fields below are the record of the item as it was asked.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/chat/runner-delivery.ts:166-174`, where the
  workspace builds the message for the runner.
- **Background:** The draft and the sent message keep plain text, and
  each chip is a part of that text. The workspace gives the runner the text
  of each message. The runner adds a sender line and gives it to the agent.
  D1 records the repository folder of each workspace, such as
  `~/code/<folder>`. An older workspace keeps a folder under
  `~/conductive/repositories/`.
- **Problem:** Decision 213 says that the agent gets the absolute path of
  each mention. The text form of a mention, and the place that makes the
  absolute path, are open.
- **Impact if no action:** The list and the chips cannot be built, because
  their text form waits for this answer.
- **Root question:** How does the agent get the absolute path of each
  mention, and what do the stored message, a copy, and a title keep?
  Changed by the options check: a copy and a title are what people see of
  the stored text.
- **Options:**
  - **A.** The browser writes `@` and the absolute path into the draft.
    The Worker gives the browser the folder of the repository. The stored
    message, a copy, and a session title from the first line show the
    absolute path. The agent gets the stored text. Effort: Small.
  - **B.** The draft keeps `@` and the path inside the repository, such as
    `@src/app.ts`. When the workspace gives a message to the runner, it
    turns each mention of an entry of its file tree into the absolute
    path. For each message with a mention, it then reads the kept tree and
    the folder from D1. The stored message, a copy, and a title stay short.
    A mention of a file that the tree lacks, such as a new file, reaches the
    agent with its repository path. Effort: Medium.
  - **C.** As B, but the runner turns each mention into the absolute path,
    after it checks the path on the disk. A workspace keeps its runner
    until it starts from a new build of its org image. So each existing
    workspace gives the agent the repository path. Effort: Medium.
  - **D.** Added by the answer of the user. The draft, the stored message,
    and the agent all keep the path inside the repository, such as
    `@src/app.ts`. Nothing turns it into an absolute path. Chosen. Effort:
    Small.
- **Left out:**
  - A list of mentions beside the text. The text form already names each
    entry and its kind, so B and C give the same result from the text
    alone. They are better on every point.
  - A Worker that writes the absolute path into the stored message when it
    accepts the message. It breaks a requirement in force: the stored
    message keeps only the text that the member wrote, as
    [Agent instructions](../docs/protocol/agent-instructions.md) says.
  - A new field of the turn with the absolute paths, for the runner to
    write, as for attached files. C is better on every point, because the
    runner already has the folder and can check the disk.
- **Wider fix:** None. This is a new feature, not a class of defect.
- **Previous examples:** The sender line exists only in the text that
  reaches the agent, and the stored message keeps the text of the member,
  as [Agent instructions](../docs/protocol/agent-instructions.md) says.
  The runner also adds an `Attached file: <path>` line for each attached
  file.
- **Recommendation:** D, after the answer. It was B while the absolute
  path was a requirement. The options check kept B before the answer.
- **Action:** the user's answer chose D, on the condition that it is
  better. The plan follows D.

### 217. How a chip is removed on a device without hover

Answered on 9 November 2026: the user chose D, "on mobile, show the x
always at the end". It was item 4 of the message of 9 November 2026. The
recommendation was E. The fields below are the record of the item as it
was asked.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/mockups/src/components/chat/`
- **Background:**
  - Decision 215 swaps the icon of a chip for a × while a pointer is over
    it. A finger does not hover.
  - The app tells a phone from a desktop by the window width only. A tablet
    in the desktop layout also takes taps. A `hover: none` media rule finds
    each device without hover.
  - A chip in the text keeps the height of its line, about 20 px on a
    phone. A control of the phone layout is 44 px high.
  - Today an attached file has a × at its end on every device, and
    Backspace removes a chip in the text.
  - Attached files do not reach the cloud computer yet. Milestone 8p of
    [the main plan](boat-native-remote-workspaces.md) builds their uploads.
- **Problem:** No rule says how a person removes a chip with a finger.
- **Impact if no action:** With no touch rule, one tap on an icon removes
  the chip, and no × shows first. So a person removes chips by accident.
  The phone variants of the mockups wait.
- **Root question:** How does a person remove a chip of the composer with
  a finger, where no pointer hovers? Changed by the options check: the need
  comes from the input, not from the device.
- **Options:**
  - **A.** Where no pointer hovers, show the × in place of the icon at all
    times. One tap removes the chip. The composer then shows no chip icons
    there, also no state mark of a workspace chip. Effort: Small.
  - **B.** Keep the icons and show no × in the text. A tap on an icon does
    not remove the chip. Backspace removes a chip in the text. An attached
    file keeps its × at the end, as today. Phones and desktops then differ.
    Effort: Small.
  - **C.** Keep the icons. A first tap on an icon only shows the ×, and a
    second tap removes the chip. The × stays hidden until the first tap.
    Effort: Small.
  - **D.** Keep the icons, and add a × at the end of each chip. A tap on an
    icon does not remove the chip. The chips get wider, a phone line cuts
    long names sooner, and each × is a 20 px target. Effort: Small.
  - **E.** Added by the options check. Where no pointer hovers, an attached
    file always shows its × in place of its icon, 44 px high on a phone. A
    chip in the text keeps its icon, and a tap on the icon places the
    caret. Backspace removes the chip, as it does today on a phone. The
    text shows no ×, so the person must know Backspace. Effort: Small.
  - **F.** Added by the options check. Where no pointer hovers, a long
    press on a chip opens a sheet with Remove, and with Open for a file
    chip. The icons stay. The action is hidden, and the chip must take the
    long press from the text selection of the system. Effort: Medium.
- **Left out:**
  - No touch rule. It fails the goal, because one tap on an icon removes
    the chip with no × first.
  - A taller chip in the text on a phone, with a 44 px ×. It breaks the
    rule that a chip keeps the height of its line, as
    [Workspace links](../docs/protocol/workspace-links.md) says.
- **Wider fix:** None. The shared icon part of a chip holds the touch rule
  for every kind of chip.
- **Previous examples:** Attached files show a × at their end on every
  device today. A workspace chip in the text of a phone has no × today.
- **Recommendation:** E. It was A before the options check. E keeps the
  icons and the live state mark, which decision 211 requires also on a
  phone. It gives an attached file a × of full touch size, where Backspace
  cannot reach.
- **Action:** the user chose D.

## Design

### The list

- Only the composer of a workspace chat has the list.
- `@` opens the list at the start of the text, or after a space or a line
  break. The text from `@` to the caret is the query. A space, Esc, or a
  move of the caret out of the query closes the list.
- The list opens above the message box, as wide as the box. Each row shows
  the icon of the entry, its name, and its folder in a muted colour. A
  file uses the icon that All files gives it.
- The rows come from the kept file tree of the workspace. Each row shows
  labels only. An entry whose label hides a secret value stays out of the
  list, because the stored text would hold its real path.
- A query matches the start of a name first, then a part of a name, then a
  part of a path. Case does not count. Without a query, folders come first,
  then files, each in the order of their names.
- The list shows at most 100 rows and scrolls. A longer query narrows it.
- The up and down arrows move the highlight, and the first row starts
  highlighted. Enter or Tab picks the row. While the list is open, Enter
  picks and never sends. A press on a row picks it.
- Texts: "Loading files…" while the tree loads, "The list of all files is
  unavailable" when no tree is available, and "Nothing matches “<query>”".
- The list notes itself in the open layers of the app shell, as a menu of
  the chat does.
- The list builds on `@lexical/react/LexicalTypeaheadMenuPlugin`, which
  the installed `@lexical/react` 0.53 holds.

### The chips

- A pick replaces the query with a file chip or a folder chip, and a space
  follows it.
- A chip shows the icon and the label of the name. Its title is the label
  of the whole path. A screen reader hears "File" or "Folder" and the name.
- In the field, a chip is one unit of the text, as a workspace chip is.
  Backspace and Delete remove it whole. A press on the × of its icon
  removes it as one step of undo.
- A press on the name of a file chip opens the file, as a press in All
  files does. This holds in the field and in a sent message. A press on a
  folder chip shows All files with the folder open and in view.
- A sent message shows a chip for each mention that names an entry of the
  tree. Every other mention stays text. In an archived workspace, chips
  open nothing.
- A copy of a chip gives its text form. A paste of the text form gives a
  chip, at once or when the tree loads, as a pasted workspace link does.
- Each chip keeps its own text. An attached file keeps its size. A
  workspace chip keeps its label and its name.
- For an attached file, the button of the icon also shows the × while it
  has the keyboard focus. In the text, a keyboard user removes a chip with
  Backspace or Delete.
- Where no pointer hovers, each chip of the composer keeps its icon and
  shows a × at its end at all times, as decision 217 says. There the icon
  is not a button, and a tap on it acts as a tap on the name.

### The text form

- A mention is `@` and a path, at the start of the text or after a space
  or a line break. A folder path ends with `/`.
- A path with a space goes in quotes, as in `@"docs/My notes.md"`. An
  entry whose path holds a quote or a line break stays out of the list.
- A mention in inline code or in a code block stays code.
- The path is the path inside the repository, as decision 216 says. The
  agent gets the text of the message unchanged.
- One module of the chat reads and writes the form. Only the browser reads
  it, because the Worker and the runner pass the text on unchanged.

### The data

- The shell gives the chat the kept files of the workspace. The chat
  connects them while it shows, so the list and the chips work also on a
  phone, before a visit to Files. The Files part and the chat share one
  connection.
- The press on a file or a folder uses the navigation of the Files part.

### What the mockups changed

Milestone 1 drew the screens on 9 November 2026. These are my calls from
that work:

- The pages live at `app/file-mentions`, beside `app/workspace-links`, not
  under `app/composer`. Reason: `app/composer` already shows five screens,
  and a folder with child pages shows only its canonical screen, so child
  pages there would move its four states.
- On a phone an attached file keeps its × button of touch size at its end,
  as today. Reason: a × inside the chip is only as high as the chip, which
  is too small for a finger. A chip in the text keeps a × as high as its
  line, as decision 217 accepts.
- The words of the list are "Loading files…", "The list of all files is
  unavailable", and "Nothing matches “<query>”". Reason: they follow All
  files and the command palette.
- When the kept tree is marked unavailable but holds entries, the list
  shows those entries with no note. Reason: the entries are most likely
  still right, and the note belongs to All files.
- The cell of the icon takes the hover fill of a chip link,
  `--ui-selected`, under the pointer.
- The mockups keep the shared parts for the app: the pill of every chip in
  `InlineChip.module.css`, the cell and the end × in `ChipRemove.tsx`,
  `FileChip`, `FileMentionList`, and `EntryIcon`. `FileChip` imports no
  fixture code, so the app can use it, as it uses `WorkspaceChip`.
- A static view cannot nest the × button in a link, so the mockups draw
  the name of a chip in the field without its link. The app opens the
  file on a press on the name.

### Design calls

Each call is my own, made on 9 November 2026.

- The list sits only in the composer of a workspace chat. Reason: a new
  workspace has no file tree before its first start.
- The look of the list and its order without a query follow Conductor.
  Reason: the user asked for a list like the list of Conductor.
- The list has no terminal row. Reason: the user asked for files.
- An entry whose label hides a secret value stays out of the list. Reason:
  the stored text holds the real path, and the screens show labels only.
- The list shows at most 100 rows. Reason: a large tree must not slow the
  composer, and a longer query finds the rest.
- A press on a folder chip shows the folder in All files. Reason: a press
  in All files opens a folder there, and a folder has no page of its own.
- Each chip keeps its own text, and only its icon changes. Reason: the
  user's rule names the icon and the ×.
- Agent answers keep their text. Reason: the user asked for chips in the
  composer and its messages only.
- The chat connects the kept files while it shows. Reason: a phone shows
  the chat without the Files part.
- Decision 217 applies wherever no pointer hovers, as a `hover: none`
  media rule finds it, not only in the phone layout. Reason: a touch
  tablet in the desktop layout has no hover either, so the × under the
  pointer would never show there.
- The agent instructions get no line about mentions. Reason: both agents
  read `@` and a path as a file, and their instructions already name the
  repository folder that the path starts from.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the list, the file chips, and the × of each chip of the composer.

- [x] Add the page `app/file-mentions` with a query with matches, and its
      child page `list` with the list without a query, nothing matches,
      the loading list, and the unavailable list.
- [x] Add the child page `app/file-mentions/chips`: file and folder chips
      in the field, the × under the pointer, and a sent message with file
      chips.
- [x] Show the × under the pointer on a workspace chip and on an attached
      file. Remove the × at the end of each attached file in
      `app/composer`.
- [x] Draw the phone variant of each screen, with the × at the end of
      each chip, as decision 217 says.
- [x] Add the flow `user-flows/mention-a-file`.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Capture the marketing pictures again, because the `agents` picture
      shows attached files.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Write `docs/protocol/file-mentions.md` with the requirements of the
      list, the chips, the text form, the press, and the path that the
      agent gets. Link it from `docs/architecture.md` and from
      `docs/protocol/chat-and-events.md`.
- [ ] Update `docs/protocol/workspace-links.md` with the × of a chip in the
      message field.
- [ ] Update the attached files of the composer in
      `docs/protocol/chat-and-events.md`.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 3: The × of the existing chips

Tags: ui

Depends on: 2

Milestone 8p of [the main plan](boat-native-remote-workspaces.md) also
changes the attached files of the composer. The branch that merges second
keeps both changes.

- [ ] Use the shared icon part of a chip from the mockups,
      `ChipIconCell` and `ChipEndRemove` in
      `docs/mockups/src/components/chat/ChipRemove.tsx`, which swaps the
      icon for a × while a pointer is over it.
- [ ] Use it in the workspace chip of the message field, through the
      `removal` prop of `WorkspaceChip`. The × removes the chip as one step
      of undo.
- [ ] Use it in the attached files, with the classes of
      `AttachmentChips.module.css`. Remove the × at the end on desktop.
- [ ] Where no pointer hovers, show the × at the end of each chip, as
      decision 217 says. An attached file keeps its × button of touch
      size there.
- [ ] Add DOM tests for the removal from the field and from the files.

## Milestone 4: The list

Tags: ui

Depends on: 2

- [ ] Add the module of the text form to the chat, with unit tests. The
      mockup `fileMentions.ts` gives the order of the rows.
- [ ] Use the list of the mockups, `FileMentionList` and its styles.
- [ ] Give the chat the kept files of the workspace, connected while the
      chat shows.
- [ ] Add the match and the order of the rows, with unit tests.
- [ ] Add the list to the message field: the query, the keys, the rows,
      and the states. A pick inserts the text form.
- [ ] Add a file tree to the chat development page.
- [ ] Add DOM tests: the keys, a pick, Enter that does not send, and the
      states.
- [ ] Update `src/chat/README.md`.

## Milestone 5: File chips

Tags: ui

Depends on: 3, 4

- [ ] Add the file chip and the folder chip to the message field, with
      `FileChip` of the mockups: a pick, the draft, a paste, a copy, and
      the ×.
- [ ] Show the chips in sent messages.
- [ ] Open a file, or show a folder in All files, on a press.
- [ ] Add DOM tests for the chip, the draft, and the press.
- [ ] Update `src/chat/README.md` and `src/files/README.md`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Renumber decisions 213 to 217 if `origin/main` uses their numbers.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On `conductive.build`, pick a file and a folder with `@`, send the
      message, and check that the agent reads that file and that folder.
