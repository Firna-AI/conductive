# Find in the shown tab

Status: Active. On branch `calummoore/oslo-xo4l`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The centre column of a workspace shows one tab at a time: a session (the
chat), a file, a Markdown preview, or a diff. The app has no find of its
own. In a browser tab, the browser's find searches the whole page, with the
sidebar, the right column, and the message box. In the Mac app, nothing
finds text, because its menu has no Find item. This change adds a find bar
to the shown tab, in the browser and in the Mac app. ⌘F or Ctrl+F opens it.

The user asked for "find and search in the open/active chat/code tab" on
13 November 2026. A brainstorm on the same day gave three approaches, and
the user chose find decision 1 B. The brainstorm notes are in
`.context/find-in-tab/`.

This change does not cover a search across sessions or across the files
of the repository, find in the terminal, find in a port preview or in the
live desktop, regular expressions, or replace. It also does not cover find
in the Mac app outside the shown tab, such as on the Account page.
`plans/follow-ups/mac-app-find-outside-tabs.md` records that gap.

Contract owners:

- `docs/protocol/find-in-tab.md`, which Milestone 2
  creates.
- [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md#commands)
  and [The keys](../docs/protocol/keyboard-shortcuts-keys.md#the-default-keys).
- [The tab row](../docs/protocol/agents-and-sessions.md#the-tab-row).
- [Files and changes](../docs/protocol/workspace-tools.md#files-and-changes).
- The [chat README](../src/chat/README.md), the
  [files README](../src/files/README.md), and the
  [shortcut layer README](../src/shell/shortcuts/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md), at `app/chat`,
  `app/files`, and `app/tabs`.

## Decisions

This plan names its decisions after the change, as find decision 1, as
[Decision numbers](../docs/architecture.md#decision-numbers) says.

### 1. Choose how find works in the open tab

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/keyboard-shortcuts.md:61`
- **Terms:**
  - **Fold:** a closed line, such as "8 tool calls", that hides a run of tool calls or the work of an ended turn. It is a `<details>` element (`src/chat/components/WorkFold.tsx`, `ToolGroup.tsx`).
  - **Keeper:** the code that keeps the reader's row in place when the chat changes size (`src/chat/components/reading-place.ts`).
- **Background:**
  - The protocol lists "search in the chat" as a Conductor feature that the app lacks (`docs/protocol/keyboard-shortcuts.md` lines 61-63).
  - In a browser, ⌘F and Ctrl+F open the browser's find. It searches the whole page. Current browsers open a closed `<details>` element when a match is inside it.
  - The Mac app menu has no Find item (`desktop/src/menu.ts` lines 25-27). Electron gives `webContents.findInPage`, but no find bar.
  - The chat draws its whole history, with no windowing. The code view draws every line of a file of up to 5 MiB.
  - Conductor has ⌘F for "Search chat" and "Find in file", and ⌘G and ⇧⌘G for the next and previous match.
- **Problem:** In the Mac app, a person cannot find a word in a long chat or file. In a browser, matches from outside the tab mix with the matches in the tab.
- **Impact if no action:** People scroll long chats by hand. The comparison rows for chat search and file search stay at "under consideration".
- **Root question:** How does a person find text in the chat or the file that is open in the centre column?
- **Options:**
  - **A.** Keep the browser's own find, and fix the chat so that browser find works well in it. Add Find to the Edit menu of the Mac app, with a native find bar on `findInPage`. Matches still come from the whole page. The Mac app needs a new bridge and new fixed keys, which change two rules in force. Effort: Large.
  - **B.** Add a find bar at the top of the shown tab, in both hosts. ⌘F or Ctrl+F opens it. It shows a count such as "3 of 17", goes to the next and previous match, and opens the fold that holds the current match. The tab menu gets a Find item, and the file page header gets a Find button. While a tab with text shows, ⌘F opens this bar and not the browser's find. Effort: Large.
  - **C.** Add a panel, or a sheet on a phone, that lists each match with the text around it. A press on a result jumps to the match. It needs the most UI and mockups, and the panel covers part of the tab. Effort: Large.
  - **D.** Added by the options check. The bar of B, but each view gives find its text from its data, not from the drawn page. The code and diff views give their lines, and the chat gives the text of each row. Find still works if the chat later draws only the rows near the view, and a 5 MiB file becomes one string search. The text of each row must stay equal to what the row draws, or the count disagrees with the screen. Effort: Large.
  - **E.** Added by the options check. The bar of B for the chat and the Markdown preview, and a read-only code editor, such as CodeMirror 6, for the code and diff views. The bar uses the search of the editor there. The editor draws only the lines near the view, so a large file searches fast. It adds a dependency, new code and diff views with their tests and mockups, and two search engines behind one bar. Effort: Large.
- **Left out:**
  - Change nothing. It fails the goal in the Mac app, where ⌘F does nothing.
  - A list of matches in the command palette. The palette opens empty each time and a row closes it (`docs/protocol/command-palette.md`), and C gives the same list without these limits.
  - A search on the server. The tab already holds the full text, so a server search only adds delay, a new route, and its access checks.
  - An editor component alone, for the file tabs. It finds nothing in the chat or the Markdown preview. With the bar of B in the chat, it came back as E.
  - The browser's own find, limited to the tab with `inert` on the other columns. The page cannot tell when the browser's find opens or closes, and `inert` blocks every press outside the tab.
- **Wider fix:** None. This is a new feature, not a defect class.
- **Previous examples:**
  - No earlier plan, follow-up item, or commit proposes find in a tab.
  - Decision 144 limits keys to what the app already does. That rule kept search in the chat out.
  - Decision 195 recorded that the Mac app has no find.
- **Related:** Option C of `plans/follow-ups/chat-renders-whole-transcript.md` would draw only the chat rows near the view. Options A and B read the page, so they would then miss the rows that the chat does not draw.
- **Recommendation:** B. It searches only the shown tab, works the same in both hosts, and opens folds, with no new bridge. C does the first two too, but needs more UI and covers part of the tab. D and E pay for a windowed chat or a windowed code view that no plan has chosen.
- **Chosen:** B, by the user on 13 November 2026. The options check of the same day added D and E after that choice and kept B as its recommendation. It advised that the scope of a view gives text and a map from an offset to a DOM range, so that a view can move to D later. The design below follows that advice.

## Design

The mechanics below are the design of this change. The protocol docs get
only the requirements, in Milestone 2.

### Terms

- **Shown tab:** the one tab that the centre column draws.
- **Find bar:** the bar at the top of the shown tab, with a field, a count,
  Previous, Next, and Close.
- **Scope:** the element of the shown tab that find searches.
- **Block:** an element whose text a match cannot leave, such as one line
  of code or one paragraph.
- **Current match:** the one match that the bar counts as "3" in "3 of 17".

### The parts

- A find engine in `src/app/find/`. It has no React. It reads the text
  under a scope element, finds the matches, and gives each match as a DOM
  `Range`. It has unit tests in happy-dom.
- A `FindProvider` in the centre column, in `WorkspaceChat.tsx`. It holds
  the state of the bar: open or closed, the query, and the current match.
  It offers the commands to the keys. It gives `openFind` to the tab menu
  and to the file page header through a context.
- A `useFindScope(ref)` hook. The session view and the file, Markdown, and
  diff views call it with the element that holds their text. A view that
  calls it offers Find. An image, a binary file, a file over the size
  limit, a file that did not load, and an empty session offer no Find, so
  ⌘F goes on to the browser there.
- A `FindBar` component, at the top of the shown tab, above the scroll box
  of the tab. It does not scroll with the content.

### Matching

- The engine walks the text nodes of the scope with a `TreeWalker`.
- It skips each element with the `data-find-skip` marker, each element
  that is `aria-hidden`, and the find bar. Find skips the text that a
  person does not see or does not read as content:
  - text that only screen readers hear, such as the hidden copy in
    `MessageLine.tsx`, the hidden words of the chat chips ("File ",
    "Session "), and the list marks of `TurnEnd.tsx`. The shared helper
    of visually hidden text gets the marker, so each use of it is skipped.
  - the line numbers, and the + and − signs of a diff.
  - the labels of controls, such as Copy.
- The visible text of a chip, such as the name of a changed file, stays.
- The scope of a view gives the engine its text and a map from each
  offset to a DOM range. Today each view builds them from the drawn page.
  A view that later draws only part of its text can give them from its
  data, as find decision 1 D describes.
- A match stays inside one block. A block ends at each element of a block
  tag, such as `div`, `p`, `li`, `pre`, `td`, `th`, `h1` to `h6`,
  `summary`, and `details`. So a match can cross the coloured token spans
  of one line of code, but not two lines.
- A match ignores case. The engine folds each character with
  `toLowerCase` only when the fold keeps its length, so each offset still
  points into the text. It has no regular expressions and no "whole word"
  option.
- An empty field finds nothing and shows no count.
- A closed message line draws all its blocks in one `<summary>`. So a
  match there can cross two paragraphs. When the bar opens that line, the
  page changes, and the bar finds again. It keeps the match with the same
  text nearest the old place.
- The engine counts every match. It colours at most 5,000 matches: the
  ones nearest the current match. Milestone 3 measures a 5 MiB file and
  changes the number when it is too high or too low.

### Highlights

- The bar colours the matches with the CSS Custom Highlight API: one
  `Highlight` named `find-match` for all matches and one named
  `find-current` for the current match. The styles use `::highlight()`
  with colours from the theme tokens of `@firna/ui`.
- The API changes no element of the page, so React keeps its DOM.
- Where the API is missing, the bar still counts and goes to each match,
  and colours nothing.

### Going to a match

- Enter or Next goes to the next match. Shift+Enter or Previous goes to the
  previous match. Both wrap around the ends.
- A new query makes the first match below the top of the view the current
  match, so the reader does not jump far.
- To show the current match, the bar first opens each closed `<details>`
  ancestor of the match. It sets `open` on the element, so the existing
  toggle handler of `useFold` sets the state, as a find of the browser
  does. A match inside the `<summary>` of a closed message line opens that
  line too, because the line cuts its text with "…".
- `useFindScope` takes a `show(range)` callback from the view. The
  `FindProvider` sits above `ChatPane`, which gives the keeper only to its
  children. So the chat gives a `show` that uses the keeper.
- In the chat, `show` gives the row of the match to the keeper with
  `keep` before it opens a fold, and calls `settle` after the render. Then
  it scrolls the match to the middle of the view. The scroll moves the
  noted row of the keeper, so the next change of size keeps the match in
  place.
- At the bottom of the chat, the keeper notes no row, so the newest
  message stays in view. A match in the last screen then moves up while
  the agent writes, as every other row does.
- A fold that the bar opens stays open, as after a click.

### Changes while the bar is open

- A `MutationObserver` on the scope finds the matches again at most every
  150 ms, such as while the agent writes or after the file changes.
- The search again reads only the blocks that the records of the observer
  name. Reason: while a turn runs, its clock changes each second and its
  answer streams up to 25 parts each second. A full search of a long chat
  each time costs too much.
- A new search keeps the current match by its block and its offset inside
  that block, not by its offset in the whole text. So text that arrives
  above the match, such as the earlier pages of a session, does not move
  the current match. The search never scrolls the view, so the reader
  does not move while the agent writes.
- When the earlier pages of a session arrive, the count changes once.

### Keys and controls

- New commands, in `src/shared/shortcut-commands.ts` and
  `src/app/shortcuts/defaults.ts`, in the Chat group:
  - Find: ⌘F on a Mac, Ctrl+F on Windows and Linux. The shown tab offers
    it while it has a scope.
  - Find next: ⌘G, and Ctrl+G. The bar offers it while it is open.
  - Find previous: ⌥⌘G, and Alt+Shift+G. ⇧⌘G, the key of Conductor, is
    already Open PR on GitHub, and two commands do not share a default
    key. So it gets a key chosen by hand, as
    [Keys chosen by hand](../docs/protocol/keyboard-shortcuts-keys.md#keys-chosen-by-hand)
    does for other clashes. Milestone 4 checks that no browser keeps
    either key. When a browser keeps one, Milestone 4 picks another key
    and records the reason.
- Find, while the focus is outside the field and the bar is open, puts
  the focus in the field and selects its text.
- While the field has the focus, the bar does not offer Find. So a second
  ⌘F or Ctrl+F opens the browser's own find, for text outside the tab.
- Enter, Shift+Enter, and Escape in the field are fixed keys of the bar.
- Escape closes the bar, removes the colours, and puts the focus back
  where it was before Find.
- The visible controls of Find, as the key rule needs:
  - A Find item in the tab menu of a session, file, or diff tab.
  - A Find button with a search icon in the file page header, beside Copy
    and Download. On a phone, the file page shows no tab row, so this
    button is its control.
- The tooltips and `aria-keyshortcuts` show the keys of Find, Find next,
  and Find previous, as the other controls do.
- The Mac app gets no Find menu item, because its page hears ⌘F first.

### Accessibility

- The field has the label "Find in this tab". The count is a live region,
  such as "3 of 17", or "No matches".
- Previous, Next, and Close are icon buttons with labels.

### Phone

- The bar sits at the top of the shown tab, so the on-screen keyboard does
  not cover it.
- A session tab opens Find from its tab menu sheet, after a long press. A
  file page opens it from its header button.

### Tabs

- The bar belongs to the centre column, not to one tab. When the shown tab
  changes, the bar closes and keeps its query. The next Find fills the
  field with that query.
- The query stays in memory only. It is never saved or sent.

### Design calls

Each call below is the agent's call of 13 November 2026, under the
decision test of the `decisions-and-findings` skill.

- The keys are ⌘F and Ctrl+F, because the default keys copy Conductor.
- Find next is ⌘G and Ctrl+G. Find previous is ⌥⌘G and Alt+Shift+G,
  because ⇧⌘G already opens the pull request on GitHub. The options check
  raised this as a user decision. The rule that default keys copy
  Conductor, with a key chosen by hand for a clash, settles it.
- A second ⌘F or Ctrl+F from the field opens the browser's own find, so
  the person can still find text outside the tab.
- A match ignores case and uses no regular expressions, as the palette
  search ignores case.
- Find skips line numbers, diff signs, the labels of controls, and hidden text for
  screen readers, because a person does not read them as text.
- Find searches only the text that the tab shows, never the stored text.
  Reason: a file path label can hide a secret, as `src/files/labels.md`
  says.
- A fold that find opens stays open, as after a click.
- In the session tab menu, Find goes first in the second group, before
  Copy link. In the file and diff tab menu, Find is its own group before
  Move left and Move right.
- A read-only workspace keeps Find, because it changes nothing (decision
  214). So the tab menu of a file or diff tab there holds only Find.
- The terminal keeps its keys on Windows and Linux. On a Mac, ⌘F from the
  terminal opens the bar of the shown tab.
- The bar closes on a change of the shown tab and keeps the query in
  memory.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The find bar on the chat, the code view, the Markdown preview, and the
diff, on desktop and on a phone. The new items of the tab menu, the Find
button of the file page header, and the new rows of the Keyboard shortcuts
tab.

- [ ] Add the find bar to the `app/chat` mockups: a long chat with a
      query, its count, the current match, and an opened fold. Add the
      state "No matches".
- [ ] Add the find bar to the `app/files` mockups: `code`, `markdown`, and
      `diff`. Add the Find button to the file page header.
- [ ] Add the Find item to the session tab menu and to the file and diff
      tab menu in `app/tabs`. Add the read-only file tab menu with only
      Find.
- [ ] Add the phone layout: the bar over a session and over a file page,
      with the on-screen keyboard.
- [ ] Add Find, Find next, and Find previous to the rows of the Keyboard
      shortcuts tab mockup in `app/account/shortcuts`.
- [ ] Update `docs/mockups/catalogue.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol states the requirements of find and of its keys and controls.

- [ ] Create `docs/protocol/find-in-tab.md` with the requirements: the
      shown tab only, the tab kinds, the bar, matching, folds, the reader's
      place, live changes, accessibility, the phone, and find decision 1.
      List it in `docs/architecture/protocol-docs.md`.
- [ ] Update `docs/protocol/keyboard-shortcuts.md` "Commands": remove
      "search in the chat" from the features that the app lacks.
- [ ] Update `docs/protocol/keyboard-shortcuts-keys.md`: add Find, Find
      next, and Find previous to the table, with their Where words, and the
      reason for no default key of Find previous.
- [ ] Update `docs/protocol/keyboard-shortcuts-fixed-keys.md`: Enter,
      Shift+Enter, and Escape in the find field.
- [ ] Update `docs/protocol/agents-and-sessions.md` "The tab row": the
      Find item of each tab menu, and the read-only file tab menu.
- [ ] Update `docs/protocol/workspace-tools.md` "Files and changes": the
      Find button of the file page header.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full,
      and update each sentence that restates a changed fact.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Find engine

Depends on: 2

The engine finds the matches under a scope element. It has no UI.

- [ ] Add `src/app/find/` with the text index, the blocks, the skip
      markers, the case fold, the matches as ranges, and the next and
      previous moves with wrap. Add a `README.md`.
- [ ] Add the search again after a change, which keeps the current match
      by its offset.
- [ ] Add unit tests: a match across token spans of one line, no match
      across two lines, skipped line numbers and diff signs, case, a
      character whose fold changes its length, a change that keeps the
      current match, and an empty query.
- [ ] Add the search again of only the changed blocks, with its tests.
- [ ] Measure the index and the search of a 5 MiB file in happy-dom and in
      Chrome. Set the limit of coloured matches. Save the numbers in
      `.context/find-in-tab/`.

## Milestone 4: Commands and keys

Depends on: 2

The new commands exist in the shared list, the defaults, and the checks of
the Worker. No part offers them yet.

- [ ] Add `find`, `find-next`, and `find-previous` to
      `src/shared/shortcut-commands.ts`, and their labels and group to
      `src/app/shortcuts/commands.ts`.
- [ ] Add their default keys to `src/app/shortcuts/defaults.ts`. Check
      that no default key clashes, and that the browser keys of
      `src/app/shortcuts/browser-keys.ts` allow ⌘F, Ctrl+F, ⌘G, Ctrl+G,
      ⌥⌘G, and Alt+Shift+G where the page offers them. Check ⌥⌘G and
      Alt+Shift+G in Chrome, Edge, Firefox, and Safari, and record the
      result in `docs/protocol/keyboard-shortcuts-keys.md`.
- [ ] Add the tests of the defaults and of the Worker check of saved keys.
- [ ] Update `src/app/shortcuts/README.md` and
      `src/shell/shortcuts/README.md`, with the owners of the new
      commands.

## Milestone 5: The find bar and the chat

Tags: ui

Depends on: 1, 3, 4

The bar works in a session tab.

- [ ] Add `FindProvider`, `useFindScope`, and `FindBar`, with the
      highlights, the count, the keys, and the focus rules.
- [ ] Make the session view a scope, with a `show` that uses the keeper.
      Mark the visually hidden text and the labels of the controls of the
      chat with `data-find-skip`. Keep the visible text of the chips.
- [ ] Open the closed folds and the message line of the current match
      through `useFold`, and keep the place of the reader through the
      keeper.
- [ ] Add Find to the session tab menu, also in a read-only workspace.
- [ ] Offer Find while a session tab with text shows, and Find next and
      Find previous while the bar is open.
- [ ] Add DOM tests: open and close, the count, next and previous with
      wrap, a match in a closed fold and in a closed message line, a
      change of the shown tab, a new message while the bar is open, the
      earlier pages arriving above the current match, a second Find from
      the field, and the keys.
- [ ] Measure the search again in a chat of 4,200 items while a turn runs.
      Save the numbers in `.context/find-in-tab/`.
- [ ] Check in Chrome, Firefox, and Safari, and in the Mac app, that the
      keeper keeps the match in view. Save the screenshots in
      `.context/find-in-tab/`.
- [ ] Update `src/chat/README.md`, `src/chat/transcript.md`, and the tab
      menus in `src/chat/tab-row.md` and `src/chat/loads-and-sends.md`.
      The second still says "two copy items", where the session tab menu
      has three.

## Milestone 6: The file, Markdown, and diff tabs

Tags: ui

Depends on: 5

The bar works in each tab of a file with text.

- [ ] Make the code view, the Markdown preview, and the diff view scopes.
      Mark their line numbers and the signs of the diff with
      `data-find-skip`.
- [ ] Add the Find button to the file page header, and Find to the file
      and diff tab menu. A read-only workspace opens that menu with only
      Find.
- [ ] Offer no Find for an image, a binary file, a file over the size
      limit, or a file that did not load.
- [ ] Add DOM tests for each view and for the phone file page.
- [ ] Check a 5 MiB file in Chrome. Save the screenshots in
      `.context/find-in-tab/`.
- [ ] Update `src/files/README.md` and
      `src/shell/workspace/screen-parts.md`.

## Milestone 7: Public guides and the comparison page

Depends on: 5, 6

The public docs say what the shipped feature does.

- [ ] Update `src/marketing/docs/sessions-and-chat.md` and
      `src/marketing/docs/files-and-changes.md`, under the rules of
      [Website docs](../docs/protocol/website-docs.md). Read each other
      guide in full, and update each sentence that restates a changed
      fact.
- [ ] Update the comparison rows, under the rules of
      [Conductor comparison](../docs/protocol/conductor-comparison.md#statuses):
      `chat-navigation` in `src/marketing/from-conductor/areas/agents-and-chat.ts`,
      the file tabs row in `src/marketing/from-conductor/areas/files.ts`,
      and the note in `navigation-and-appearance.ts`. `search-across-files`
      and `transcript-sql-search` stay.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate, `npm run check`.
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

- [ ] Find a word in a long session and in a large file on
      `conductive.build`, in a browser and in the Mac app.
