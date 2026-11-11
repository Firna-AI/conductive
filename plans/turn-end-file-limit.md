# Turn end file limit

Status: Active. On branch `calummoore/file-badges-display-limit`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The chat ends each finished turn with one row: the time that the turn ran,
then one file chip for each file that the turn changed. A click on a chip
opens the diff of its file. Today the row shows every file in the end event
of the turn. The agent runner puts at most 200 files in that event, and the
chat shows plain text, such as "47 more files", for the rest. So a turn that
changes 150 files shows 150 chips on many rows, and its answer moves far
from the next message.

This change limits the row to five files on a desktop and three on a phone
(decisions 270 and 271). When the row would hide two or more files, it shows
the first files up to the limit, then a button with the count of the rest,
such as "9 more files". The button shows the other listed files below it,
and "Show fewer" hides them again. The runner limit of 200 files, the chat
events, and the stored history do not change. Decision 272 keeps the chat
drawn but hidden behind a file or diff tab, so the open row, the folds, and
the place of the reader survive a visit to a diff. Decision 273 is open:
which files show first. The change
does not cover the line counts on a chip, which count the whole branch, not
only the turn. The follow-up item
[turn-chip-line-counts-cover-branch.md](follow-ups/turn-chip-line-counts-cover-branch.md)
holds that question.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md#what-the-chat-shows).
- The [transcript rules](../src/chat/transcript.md) of the chat.
- The [chat integration](../src/chat/integration.md) rules, for the chat
  behind a file or diff tab.
- The [mockups](../docs/mockups/README.md), the visual spec.

## Decisions

The report of each options check is under `.context/turn-end-file-limit/`.

### Decision 270. How the turn end limits its chips

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. Item 1 of the brainstorm of 2026-11-10. The options check of 2026-11-10 added options E and F.
- **Category:** Docs or spec.
- **Location:** `src/chat/components/TurnEnd.tsx:56` and `docs/protocol/chat-and-events.md:62`.
- **Terms:**
  - **Turn end:** the row at the end of a finished turn, with the duration and the file chips. The app draws it in `src/chat/components/TurnEnd.tsx`.
  - **File chip:** a box with a file name and its line counts, such as "+4 −3". A click opens the diff of the file.
  - **Fold:** a chat line that hides a list until a click, such as "8 tool calls, 7 messages". The line stays in place when the list opens or closes.
- **Background:** The chat protocol says "A finished turn ends with its duration and the files that it changed." It sets no display limit. The only limit is the 200 files of the runner, with a count of the rest. In a desktop chat, two or three chips fit in one row. A phone fits about one.
- **Problem:** A turn that changes many files shows one chip for each file, up to 200, on many rows.
- **Impact if no action:** A large turn pushes its answer far from the next message. The reader scrolls past rows of chips, and past more rows on a phone.
- **Root question:** How does the end of a finished turn stay short when the turn changed many files, while each file stays reachable from the chat?
- **Options:**
  - **A.** Show the first chips. A button, such as "9 more files", then shows the rest, and "Show fewer" hides them again. It reuses the chips and the fold behaviour of the chat. An open list of a large turn still makes the chat long. Effort: Medium.
  - **B.** Past the limit, show one fold line, such as "14 files changed", in place of the chips. A click opens all chips below the line. A large turn end is always one line. The reader sees no file name without a click. The line cannot give a line total, because the line counts cover the whole branch. Effort: Medium.
  - **C.** Show the chips that fit in two rows at the current width, then the button of option A. The row has the same height on every screen. It needs a layout measurement that the unit tests cannot run. The count changes with the window width. Effort: Medium.
  - **D.** Show the first chips. The button opens a list of every file in a popover, or in a sheet on a phone. The chat never grows, and the list can show the folder of each file. It adds two overlays with their focus handling, and mockups for both. The sheet and menu parts in `src/chat/ui/` can carry part of it. Effort: Medium, the largest of the first four.
  - **E.** Past the limit, show one fold line with the count and the first names as text, such as "14 files: TurnEnd.tsx, lostCopy.ts, …". All chips open below the line. The row is one line on every screen. Each file then takes two clicks, and a phone line shows only one or two names. Effort: Medium.
  - **F.** Show the first chips. The button opens the Changes list of the Files panel, filtered to the files of this turn, with a way back to all changes. The chat never grows, and on a desktop the list stays beside each diff. It needs a filter across the chat and the Files panel, mockups for both layouts, and a protocol rule. On a phone it leaves the chat, and it lists only the files that the branch still changes. Effort: Large.
- **Left out:**
  - A lower runner limit. The files past it would leave the chat, so the button could show nothing. It drops the assumption that the limit changes the display only.
  - The first chips and a plain count with no button. The files past the limit would leave the chat.
  - A link to the unfiltered Changes tab. That tab lists every change of the branch, not the files of this turn. Option F is the filtered list.
  - One row that scrolls sideways. It gives no count, and a mouse user sees no sign of hidden chips.
  - Chips for folders in place of files. Many folders still give many chips. It can join a limit later.
  - A CSS height limit with "Show all". With a measurement, it is option C. Without one, it cannot count the hidden chips, and the clipped chips stay in the keyboard order.
  - A height limit with its own scroll on the open row. A scroll area in the transcript catches the wheel and the touch while the reader scrolls the chat.
  - A row that folds only after a newer turn starts. At the bottom of the chat, the chips of the newest turn would still push its answer out of view.
  - No change. The user asked for a maximum.
- **Wider fix:** None. The other long chip rows have their own follow-up items: the sent files of a message in `plans/follow-ups/sent-files-row-no-display-limit.md`, and the attached files of New workspace in `plans/follow-ups/dialog-content-outside-window.md`.
- **Previous examples:** The work fold of decision 150 and the fold of a run of tool calls shorten an ended turn in the same way.
- **Related:** Decision 271 sets the number of files. With option C, a row count would replace it. Decisions 272 and 273 settle two details of option A.
- **Recommendation:** A. It is the smallest change, keeps the first file names in view, and acts like the folds that the chat has. The options check kept A. D best protects the height of the chat, E keeps the row shortest on a phone, and F suits a review of many files.
- **Action:** ask the user, because the options trade the height of the chat against names in view and effort, and no option is clearly best.
- **Answer:** The user chose A on 2026-11-10, before the options check added E and F.

### Decision 271. How many files show before the button

- **Severity:** Low. **Effort:** Small.
- **Source:** Design. Item 2 of the brainstorm of 2026-11-10. The options check of 2026-11-10 added options E and F, replaced the root question, and changed the recommendation.
- **Category:** Docs or spec.
- **Location:** None. The value becomes one constant of the turn end.
- **Background:** The limit applies with options A, B, and D of decision 270. In a desktop chat, each chip is about 150 to 260 pixels wide. On a phone, each chip takes its own row of 44 pixels, with a gap of 6 pixels. Guess: most turns change five files or fewer. The project has no real turns to count.
- **Problem:** The limit sets how many names show at a glance and how tall a large turn end gets.
- **Impact if no action:** The plan cannot set the value. A low value hides names that the reader wants. A high value keeps rows of chips, most of all on a phone.
- **Root question:** How many names should a closed turn end show, so that the reader sees enough files and the row stays short on each screen?
- **Options:**
  - **A.** 3 files: about one row on a desktop, and about four rows on a phone. Many ordinary turns fold. Effort: Small.
  - **B.** 5 files: about two rows on a desktop, and about six rows on a phone, near 300 pixels. Effort: Small.
  - **C.** 8 files: about three rows on a desktop. Only large turns fold. Effort: Small.
  - **D.** 5 files on a desktop and 3 on a phone, near 200 pixels. The chat knows its screen size already. Members on different screens see different counts. Effort: Small.
  - **E.** Show chips until their names pass a length budget, such as 80 characters. Long names then show fewer chips, so a desktop row stays near two rows. The count changes from turn to turn, and a phone needs its own budget. Effort: Small.
  - **F.** Each reader sets the count on the Preferences tab of the Account page, with five as the default. It needs a database migration, a route, a mockup, and a protocol rule, all for a small display choice. Effort: Large.
- **Left out:** A share of the files, because a large turn still shows many chips. A row count at the current width, because the user chose A over that approach in decision 270.
- **Wider fix:** None. The value is one display constant.
- **Previous examples:** None found.
- **Related:** Decision 270. With its option C, a row count replaces this value.
- **Recommendation:** D. The options check changed it from B, because on a phone five files take about six rows, near 300 pixels, and D takes about four. D keeps the desktop count of B and costs one more value. B gives every member the same count.
- **Action:** ask the user, because each value trades names in view against height, and no value is clearly best.
- **Answer:** The user chose B on 2026-11-10, before the options check. After the options check, the user chose D on 2026-11-11.

### Decision 272. What a return from a diff shows

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design. From the options check of decisions 270 and 271 on 2026-11-10. Its own options check of 2026-11-10 replaced the root question, added options D to G, and changed the recommendation.
- **Category:** Docs or spec.
- **Location:** `src/chat/WorkspaceChat.tsx:157` on a desktop, and `src/shell/workspace/WorkspaceScreen.tsx:245` on a phone.
- **Terms:**
  - **Fold:** a chat line that hides a list until a click, such as "8 tool calls, 7 messages".
  - **Chat controller:** the object that holds the chat of one workspace for as long as the browser tab keeps it. Its code is in `src/chat/state/controller.ts`.
  - **`Activity`:** a React part that keeps its children drawn but hidden, with their state, while it does not show them. No file of the app uses it yet.
- **Background:** A click on a file chip opens the diff of the file in place of the chat. When the reader goes back to the session, the app draws the chat again. Each part of the chat then starts from its first state, and the chat starts at its bottom, because nothing keeps its scroll position. The work fold of a turn starts closed again, as the protocol allows: "the fold keeps that choice while the chat shows it." The open row of decision 270 would also start closed again.
- **Problem:** A reader who opens a hidden file, reads its diff, and comes back finds the row closed. For an older turn, the reader also lands at the bottom of the chat, far from the row.
- **Impact if no action:** A reader who checks the hidden files of a large turn one by one presses the button again before each file. After each return to an older turn, the reader also scrolls back to the row.
- **Root question:** How does a reader who checks the files of a large turn one by one get from each diff to the next file?
- **Options:**
  - **A.** The row starts closed each time the chat draws again, as the work fold does. It needs no new state. Effort: Small.
  - **B.** The chat controller keeps the open rows of each session for as long as the browser tab keeps the chat. A return from a diff shows the row as the reader left it, and a reload starts closed. The reader of an older turn still lands at the bottom of the chat. It adds a controller field, its action, and a test, and the row then acts unlike the work fold. Effort: Medium.
  - **C.** The chat controller keeps every open or closed choice of the chat: the work folds, the runs of tool calls, the message lines, and the file rows. It changes the protocol rule of the folds, and each part needs its own state. Effort: Large.
  - **D.** Each chip becomes a link to the address of its diff, as the workspace chips of a message are. A click with a modifier key, or a long press on a phone, then opens the diff in a new browser tab, and the chat stays as the reader left it. A plain click works as today, so most readers get no help, and each new browser tab loads the whole app. Effort: Small.
  - **E.** Keep the chat of the session drawn but hidden, with `Activity`, while a file or diff tab shows in its place, on a desktop and on a phone. The row, the work folds, the runs of tool calls, and the message lines then stay as the reader left them. This needs no new state, and it also covers parts that later changes add. The fold rule needs a new sentence. `Activity` is new here, so the hidden composer, the menus, the keeper of the reading place, and the scroll position need a check. A hidden box can lose its scroll position. Effort: Medium.
  - **F.** Option B, and the chat controller also keeps the chip that opened the last diff. A return from that diff draws the row open and scrolls that chip into view, so the reader of an older turn lands at the row. A return while a turn runs moves the reader away from the newest message. It adds state, a scroll on return, a mounted test, and a protocol rule. Effort: Medium.
  - **G.** Add Next file and Previous file controls to a diff tab that a chip opened. They walk the files of its turn, so the reader needs no return to the chat. A saved diff tab holds only a path, so the tab needs a new way to know its turn. Each diff still shows the whole branch. Effort: Large.
- **Left out:**
  - A choice that survives a reload, kept in the browser storage or on the server. B, E, and F reach the goal with less work, and a choice past a reload serves no part of the goal.
  - A diff that opens beside the chat. It is a new layout of the centre column, which shows the content of one tab at a time. E keeps the chat drawn without a new layout.
- **Wider fix:** E. It removes the redraw that resets each choice, so a part that a later change adds keeps its choice too. C must give each part its own state.
- **Previous examples:** The work fold and the runs of tool calls start closed again after a return from a diff, because the chat draws again.
- **Related:** Decision 270 chose the row. Milestone 4 builds the answer.
- **Recommendation:** E. It keeps the row and every fold as the reader left them, with no new state, for about the effort of B. The options check changed it from B. B stays the narrow choice if the change must touch only the turn end, or if the check of `Activity` fails.
- **Action:** ask the user, because E changes how the app keeps the chat behind a diff and gives the folds a new rule, and the options trade that reach against effort.
- **Answer:** The user chose E on 2026-11-11.

### Decision 273. Which files show before the button

- **Severity:** Low. **Effort:** Small.
- **Source:** Design. From the options check of decisions 270 and 271 on 2026-11-10. Its own options check of 2026-11-10 replaced the root question and added options E and F.
- **Category:** Docs or spec.
- **Location:** `runner/src/checkpoint.ts:67`.
- **Terms:**
  - **Runner order:** the order of the files in the end event of a turn. The files that existed before the turn come first, in path order, then the files that are new in this turn, in path order.
  - **Kind of change:** the `change` field of each file, which compares the file with the default branch. A file that is new on the branch has the kind `added`, or `untracked` when nobody committed it.
- **Background:** The agent runner lists the changed files of a turn in the runner order, and the chat shows them in that order. With the limit of decision 271, the row of decision 270 folds from seven listed files on a desktop and shows only the first five. On a phone, it folds from five listed files and shows the first three. Each chip shows the file name and its line counts, not its folder or its kind of change.
- **Problem:** A turn that lists seven or more files hides the end of the runner order first, and the files that are new in this turn stand there.
- **Impact if no action:** A reader of a turn that builds a feature sees the edited files and misses the new files at a glance.
- **Root question:** How does the reader of a large turn see at a glance the files that matter, such as the new ones, while the row hides the rest?
- **Options:**
  - **A.** Keep the runner order. Nothing changes, and the new files are the first to hide. Effort: Small.
  - **B.** Show first the files that are new on the branch, with the kind `added` or `untracked`, then the other files, each group in the runner order. New work shows before the button. It also moves first a file that an earlier turn added. A turn that adds many generated files, such as snapshots, hides its edits instead. Effort: Small.
  - **C.** Show every file in one path order. The order is neutral, but the chips show no folder, so the reader cannot see it. Effort: Small.
  - **D.** Put the files that are new in this turn first in the runner itself. The chat and the 200-file limit of the runner then keep the same files, so an end event with more than 200 files keeps its new files. It adds an order rule to the runner protocol, and it reaches only the turns that a new runner sends. Effort: Medium.
  - **E.** Keep the runner order, and let the button name the new files that it hides, such as "7 more files, 2 new". The reader learns without a click that new files exist, but does not see their names. The button gets longer, most of all on a phone. Effort: Small.
  - **F.** Order the files by the first write or edit call of the turn that touched each one, and put the files that only a command changed after them. The row then follows the work that the fold lists. Both agents need new parsing in the runner, and stored turns keep the runner order. Effort: Large.
- **Left out:** A sort by the line counts, because the counts cover the whole branch, not the turn. It can come back if `plans/follow-ups/turn-chip-line-counts-cover-branch.md` chooses counts of the turn.
- **Wider fix:** D. It orders the list before the runner cuts it at 200 files. It adds to B, because it does not reach the turns that the Worker already stored.
- **Previous examples:** None found.
- **Related:** Decision 270 chose the row, and decision 271 sets how many files show. Milestones 1 to 3 wait for this answer.
- **Recommendation:** B. It is the smallest option that shows the new files by name, and it orders every stored turn. It rests on a guess that new files are often the centre of a turn, because the project has no real turns to count. The options check kept B. D best protects the codebase, but more than 200 files in one turn is rare.
- **Action:** ask the user, because each order hides different files, and no order is clearly best for every turn.

## Design

The closed turn end shows at most five chips on a desktop and three on a
phone. The chat passes its `mobile` value to the turn end, which picks the
limit. One pure helper beside
`docs/mockups/src/components/chat/lostCopy.ts` holds the limit and the split
of a row: the files that show, the count of the button, and whether the row
folds. The mockup turn end and the app turn end both use it, so they cannot
drift. The mockup turn end takes an `open` prop for the static open screen,
and its button links the closed and the open screens. The app turn end keeps
the open state in its own state. Decision 272 keeps the chat drawn but hidden
behind a file or diff tab, so that state survives a visit to a diff. The
button gives itself to the keeper of the reading place of the chat, as
`useFold` does for the line of a fold.

Design calls, each my call on 2026-11-10:

- The limit changes the display only. The runner keeps its 200-file limit,
  and the events and the stored history do not change. Reason: the chat can
  still show each listed file, and no stored format changes.
- The row folds only when the button would hide two or more files, so a turn
  of six files shows all six on a desktop, and a turn of four files shows
  all four on a phone. Reason: a "1 more file" button takes the place of one
  chip and saves no space.
- The button stays after the last chip of the closed row in both states. The open row shows
  the other chips after the button, from a new line, as the list of a fold
  opens below its line. The button keeps its place on the screen, also at
  the bottom of the chat. Reason: decision 270 reuses the fold behaviour of
  the chat. The reader goes on at the sixth file, and a screen reader meets
  the new chips right after the button. This call replaces my call of the
  brainstorm, which put the button after the last chip. The options check
  showed that a large turn then opens at its last chips.
- The closed button counts every file that the row hides, with the files
  that the runner left out, such as "242 more files". The open row ends with
  the runner count in the words of a stopped turn, such as "47 changed files
  not listed". Reason: one phrase then names one set of files, and the open
  row still counts the data that the runner limit omits, as the protocol
  requires.
- The button reads "9 more files" while the row is closed, and "Show fewer"
  while it is open. Reason: the words match the runner count of today, and
  "fewer" fits a count of files. The mockups show the words for review.
- The button is a real button with `aria-expanded`, and it controls the list
  of the other chips. Its name is its visible text. Reason: a screen reader
  then says what the button does and whether the row is open.
- The limit applies to the file row of a late turn end too. The line of a
  stopped turn shows only a count today, so it does not change. Reason: one
  part draws both file rows.
- The helper lives in the mockups, as `lostCopy.ts` does, and the app
  imports it. Reason: the app already imports the pure chat parts of the
  mockups, so the limit has one home.

Design calls for decision 272, each my call on 2026-11-11:

- On a phone, the chat stays drawn behind each view that takes its place:
  the Files view and the tool view. Reason: one swap draws these views, and
  the reader expects the chat as they left it after each of them.
- The chat keeps its scroll position across a visit. When the browser loses
  the position of the hidden chat, the chat brings back the row that the
  reader read. Reason: option E keeps the chat as the reader left it.
- While hidden, the chat takes no key, no focus, and no pointer, and it
  moves no scroll. Its menus and sheets close. Reason: the shown tab owns
  the input.
- A switch to another session tab, or to another workspace, still draws
  that chat again. Reason: option E covers the tabs and views that take the
  place of the chat of one session, and a drawn chat for each session would
  grow the memory with each tab.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the limited row, its button, and its open row, on the desktop and the
phone, with the answers to decisions 271 and 273. The page
`app/chat/lost-data` changes, and the page `app/chat/turn-files` is new.

- [ ] Add the pure helper beside `docs/mockups/src/components/chat/lostCopy.ts`.
      It holds the limit, the order of decision 273, and the split of a
      row. When decision 273 orders by the kind of change, the helper counts
      `untracked` as new, and the mockup `ChangeKind` in
      `docs/mockups/src/fixtures/files.ts` gets `untracked`.
- [ ] Update the mockup turn end, `docs/mockups/src/components/chat/TurnEnd.tsx`
      and `TurnEnd.module.css`. Draw the closed row: the first five chips
      on a desktop or three on a phone, then the button. Draw an `open`
      state: the same first chips, the button as "Show fewer", every other
      listed chip from a new line, then
      the runner count, such as "47 changed files not listed". The button
      has the height of a chip and the touch size on a phone. It links the
      closed and the open screens with `ScreenLink`.
- [ ] Add a fixture turn that changes twelve files, two of them added, and
      a mark on a turn-end item that draws the open row.
- [ ] Add the screen-spec page `app/chat/turn-files`. Its canonical screen
      is the closed row of the twelve-file turn. Its variants are the open
      row of that turn and the open row of the 247-file turn. Link the page
      from the chat page as the other chat sub-pages are linked.
- [ ] Update the `files` variant of `app/chat/lost-data`. It now shows the
      closed row: the first five files and "242 more files" on a desktop,
      and the first three files and "244 more files" on a phone. Update its
      description and its rationale.
- [ ] Check every other chat page. On a desktop, the six-file turn of
      `app/chat` still shows all six chips. On a phone, it now shows three
      chips and "3 more files". Update the descriptions that this changes.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`, on the desktop and the phone. Save the
      screenshots under `.context/turn-end-file-limit/`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the limit and its decisions in the chat protocol, and align the docs
that restate the turn end.

- [ ] Update "What the chat shows" in `docs/protocol/chat-and-events.md`.
      State the limit of five files on a desktop and three on a phone, the
      fold at two hidden files, the button after the
      last shown file and its count with the files that the runner left
      out, the open row with the other files after the button and the
      runner count, the button that keeps its place, and the order of
      decision 273. In "The work of a turn", state that the chat keeps its
      folds, its file rows, and its place while a file or diff tab, or
      another view on a phone, takes its place. Add the reasons and the
      rejected options of decisions 270 to 273.
- [ ] Update the rule of the runner count in `src/chat/transcript.md`. The
      closed row counts those files in the button, and the open row names
      them, such as "47 changed files not listed".
- [ ] Update `docs/mockups/README.md` and `src/chat/README.md` where they
      name the chat pages or the key code that this change touches.
- [ ] Read both legal pages, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates the
      files of a turn end. A search during the brainstorm found none.
- [ ] Check the rows in `src/marketing/from-conductor/` for a listed feature
      that this change ships, starts, or drops.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 3: The turn end of the app

Tags: ui

Depends on: 2

Limit the file row of the turn end of the app with the shared helper, and
keep the place of the reader.

- [ ] Draw the closed row, the button, and the open row in
      `src/chat/components/TurnEnd.tsx` with the shared helper. The row
      starts closed.
- [ ] Keep the open state in the state of the turn end. Milestone 4 keeps
      it across a visit to a diff.
- [ ] Keep the button in place. On a click, give the button to the keeper
      of the reading place of the chat, and settle after the render, as
      `src/chat/components/useFold.ts` does. Share that code with `useFold`
      when both stay simple.
- [ ] Add the cases to `src/chat/components/TurnEnd.test.tsx`. On a
      desktop, twelve listed files show five chips, then "7 more files". A
      click shows "Show fewer" after the fifth chip and the other seven
      chips after it, and a second click shows five chips again. Six files
      show six chips and no button. On a phone, twelve files show three
      chips and "9 more files", and four files show four chips.
      A turn of 200 listed files and 47 left out shows "242 more files" when
      closed, and "47 changed files not listed" after the 200 chips when
      open. The chips follow the order of decision 273. See each new case
      fail first.
- [ ] Test that the button keeps its place when the row opens and when it
      closes, in the chat, as the fold tests in
      `src/chat/components/OpenFold.dom.test.tsx` check the line of a fold.
- [ ] Run each new mounted test 10 times. Record the pass count under
      `.context/turn-end-file-limit/`.
- [ ] Run `npm run test -- src/chat`.
- [ ] Smoke-test the chat development page with `scenario=loss`, at a
      desktop and a phone width. On a desktop, the 247-file turn shows five
      chips and "242 more files". On a phone, it shows three chips and "244
      more files". It opens with the next file after the button, and it
      closes. Save the screenshots under `.context/turn-end-file-limit/`.

## Milestone 4: The chat behind a file or diff tab

Tags: ui

Depends on: 3

Keep the chat of the session drawn but hidden while a file or diff tab, or
another view on a phone, takes its place (decision 272). A return then
shows the chat as the reader left it.

- [ ] In `src/chat/WorkspaceChat.tsx`, draw the session chat inside React
      `Activity`. Hide it while `content` shows, and draw `content` beside
      it.
- [ ] In `src/shell/workspace/WorkspaceScreen.tsx`, keep the chat drawn
      inside `Activity` while the phone shows the Files view or the tool
      view.
- [ ] Check the hidden chat, and fix each problem that the check finds. The
      composer takes no key and no focus. Its menus and sheets close. The
      keeper of the reading place moves nothing. A running turn still
      updates the hidden chat.
- [ ] Check once in Chrome whether the chat keeps its scroll position across
      a visit to a diff, at a desktop and a phone width. Save the result
      under `.context/turn-end-file-limit/`. When the browser loses the
      position, keep the row that the reader read, and bring it back when
      the chat shows again.
- [ ] Add a mounted test in `src/chat/`. Open a work fold and a file row,
      show a diff as `content`, remove it, and see both still open. When the
      chat brings back the place of the reader, test that too. See the test
      fail first.
- [ ] Update `src/chat/integration.md`, where `content` shows in place of
      the chat.
- [ ] Run each new mounted test 10 times. Record the pass count under
      `.context/turn-end-file-limit/`. Run
      `npm run test -- src/chat src/shell/workspace`.
- [ ] Smoke-test the workspace screen in a browser. Open a file from a turn
      end, go back to the session tab, and see the row, the folds, and the
      place as before. Save the screenshots under
      `.context/turn-end-file-limit/`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4

Merge `main`, prove the whole change, review it, and open the pull request.

- [ ] Merge `origin/main` into the branch with the `git-merge` skill.
- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record follow-up
      items under `plans/follow-ups/` for the rest, re-review once, and
      report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives decisions 270 to 273
      and the design calls of this plan with their dates, a permalink to
      this plan, and the follow-up items that the change adds.
