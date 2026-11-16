# Find in the shown tab

This doc holds the requirements and the decisions in force for find in
the shown tab of a workspace. Find searches the text of one session,
file, or diff, in a browser and in the Mac app. It covers which tabs offer
Find, the find bar, the matches, the keys, the phone, and the Mac app.

The terms are those of the [architecture doc](../architecture.md#terms)
and the terms below. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A find
decision number, such as find decision 1, names a decision of the change
that adds find in the shown tab. The
[mockup catalogue](../mockups/catalogue.md) draws find at `app/chat/find`
and at the `find` variants of `app/files/code`, `app/files/markdown`, and
`app/files/diff`, on desktop and on a phone. The `find` variant of
`app/account/shortcuts/search` draws its rows on the Keyboard shortcuts
tab.

## Terms

- **Shown tab:** the one tab of the tab row whose content the centre
  column of a workspace shows. On a phone, the tab row shows only the
  session tabs, and a file or a diff shows as a page of the Files tab.
  That page counts as the shown tab.
- **Find bar:** the bar at the top of the shown tab, with the find field,
  the count, Previous, Next, and Close. This doc also calls it the bar.
- **Find field:** the text field of the bar, which holds the query. This
  doc also calls it the field.
- **Current match:** the one match whose place the count gives, such as 3
  in "3 of 17".
- **Block:** a part of the text that a match cannot leave, such as one
  line of code, one paragraph, or one cell of a table.
- **Fold:** a line of the chat that hides a run of tool calls or the work
  of an ended turn.
  [The work of a turn](chat-and-events.md#the-work-of-a-turn) gives the
  folds.
- **Message line:** the line of one message in an open fold. A click
  opens it to the full text of the message.

## The shown tab only

- The app has its own find in the shown tab, in a browser and in the Mac
  app (find decision 1 B). The user chose it on 13 November 2026.
- Find searches only the shown tab. It never finds text in the sidebar,
  the right column, the message box, or another tab.
- Reason: the matches then come only from the tab that the person reads.
  Find works the same in both hosts, with no bridge to the Mac app. It
  also opens the folds that hold a match.
- The find of the browser was rejected, also with a Find item and a find
  bar in the Mac app. Its matches come from the whole page, and the
  Mac app would need a bridge to the page.
- A panel or a sheet that lists each match with the text around it was
  rejected. It needs the most new screens, and it covers part of the tab.
- A find that reads the data of each view, in place of the text on the
  page, was not chosen. A code editor with its own search for the file
  tabs was not chosen either.
- Reason: both prepare for a chat or a code view that draws only part of
  its text, and no plan has chosen such a view.

## Which tabs offer Find

- The shown tab offers Find while it shows the text of its session, its
  file, or its diff.
- A tab without such text offers no Find. Such tabs are:
  - a picture, and each other binary file
  - a file over the read limit
  - a file or a diff that did not load
  - a session with no message
- Where the shown tab offers no Find, ⌘F and Ctrl+F go on to the browser.
  [Where a key goes](keyboard-shortcuts.md#where-a-key-goes) gives this
  rule for each key whose command the page does not offer.
- While the field has the focus, the tab does not offer Find. So a second
  ⌘F or Ctrl+F from the field opens the find of the browser. Reason: the
  person can still find text outside the tab.
- A tab of a read-only workspace offers Find too, because find changes
  nothing.
- The tab menus offer Find as
  [The tab row](agents-and-sessions.md#the-tab-row) says.
- The header of a file or a diff has a Find button, as
  [Files and changes](workspace-tools.md#files-and-changes) says.

## The find bar

- Find opens the bar at the top of the shown tab, with the focus in the
  field.
- The bar does not scroll with the text of the tab.
- In a session, the bar sits under the tab row, above the chat. In a file
  or a diff, it sits under the header of the page, above the text.
- Reason: the header names the file and holds the Find button. The bar
  then stands next to the text that it searches.
- The bar spans the width of the tab. The user kept this bar on 13
  November 2026, after considering a bar over the text.
- The field, the count, Previous, Next, and Close stand together at the
  start of the bar. Reason: Close stays near the field, and the bar lines
  up with the tab row and the header of the page.
- The count gives the place of the current match and the number of
  matches, such as "3 of 17". A query without a match shows "No matches".
- An empty field finds nothing and shows no count.
- Previous and Next are off while the field finds no match.
- When the shown tab changes, the bar closes, and its colours go. The bar
  keeps its query.
- The next Find fills the field with that query. The first Find since the
  page loaded shows an empty field.
- The query stays only in the memory of the page. The app never saves it
  and never sends it.

## Matches

- A match ignores case. Reason: the search of the command palette ignores
  case too, as [Search](command-palette.md#search) says.
- Find matches the query as plain text. It has no regular expressions, no
  option for whole words, and no replace.
- A match stays inside one block. So a match can cross the syntax colours
  of one line of code, but not the end of the line.
- Find matches the text that the tab shows. It also matches the text that
  a click on a closed fold or a closed message line shows.
- Find never matches stored text that the tab does not show. So the
  preview of a Markdown file matches its rendered text, without the marks
  of Markdown. When the tab shows the source, find matches the source.
- Find matches the label of a path, and never the real path behind it.
  Reason: the label hides each secret value of the path, as
  [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  says.
- Find skips the text that a person does not read as the content of the
  tab:
  - the line numbers of a file or a diff
  - the + and − signs of a diff
  - the labels of controls, such as Copy
  - the text that only screen readers hear
- Reason: a person does not read these as text. The visible text of a
  chip, such as the name of a changed file, still matches.
- The count counts every match. The bar colours at most 5,000 matches: the
  ones nearest the current match.

## Colours

- Each match has a tint of amber. The fill of its line, such as the fill
  of an added line of a diff, shows through the tint. Its text keeps its
  colour.
- The current match is solid amber.
- Reason: amber is the usual colour of find, and it differs from the
  accent colour of the focus. The tint lets the fill of a diff line show
  through.
- A browser that cannot colour the matches still shows the count and goes
  to each match.

## Going to a match

- After a new query, the current match is the first match below the top
  of the visible part of the tab. Reason: the reader then does not jump
  far.
- Enter in the field and Next go to the next match. Shift+Enter in the
  field and Previous go to the previous match.
- Both wrap at the ends: from the last match to the first, and from the
  first to the last.
- The bar opens each closed fold and each closed message line that holds
  the current match.
- Each fold and each message line that the bar opens stays open, as after
  a click.

## The reader's place

- Each move to a match scrolls the current match to the middle of the
  visible part of the tab.
- On a phone, that middle is the middle of the part of the tab above the
  on-screen keyboard. Reason: the keyboard covers the bottom of the tab,
  so the middle of the whole tab can sit under it.
- After a move to a match in a session, the chat keeps the reader's place,
  as [The scroll of the chat](chat-and-events.md#the-scroll-of-the-chat)
  says. The row of the current match is then the row that the user reads.
- So the output of an agent and a fold that closes do not move the
  current match.
- At the bottom of the chat, the chat keeps the newest message in view.
  So a match in the last screen moves up while the agent writes, as each
  other row does.

## Changes while the bar is open

- While the bar is open, it finds the matches again after each change of
  the text of the tab. Examples are the output of an agent and a new read
  of a file.
- A new search after a change keeps the current match at its place in the
  text. So text that arrives above it, such as the earlier history of a
  session, does not change the current match.
- The count then gives the new place and the new number of matches.
- A new search after a change never scrolls the tab. Reason: the reader
  then does not move while the agent writes.

## Keys

- Find, Find next, and Find previous are commands of the Chat group, as
  [Commands](keyboard-shortcuts.md#commands) says. A person can change
  their keys.
- Their default keys are ⌘F, ⌘G, and ⌥⌘G on a Mac, and Ctrl+F, Ctrl+G,
  and Alt+Shift+G on Windows and Linux. ⌘F and ⌘G copy the keys of
  Conductor.
- [The default keys](keyboard-shortcuts-keys.md#the-default-keys) gives
  where each command runs.
  [Keys chosen by hand](keyboard-shortcuts-keys.md#keys-chosen-by-hand)
  gives the reason for ⌥⌘G.
- While the bar is open and the focus is outside the field, Find puts the
  focus in the field and selects its text.
- Find next and Find previous do what Next and Previous do. The bar offers
  them while it is open.
- On a Mac, ⌘F from the terminal opens the bar of the shown tab, because
  the terminal gives each key with ⌘ to the app. On Windows and Linux, the terminal keeps
  Ctrl+F, as [Where a key goes](keyboard-shortcuts.md#where-a-key-goes)
  says.
- Enter, Shift+Enter, and Escape in the field are
  [fixed keys](keyboard-shortcuts-fixed-keys.md#fixed-keys).
- Escape in the field does what Close does. The bar closes, its colours
  go, and the focus goes back to where it was before Find.
- The tooltips of Previous, Next, and the Find button show the keys of
  their commands, as [Key hints](keyboard-shortcuts.md#key-hints) says.
- The Keyboard shortcuts tab lists the three commands in the Chat group.
  After Send and New line, it lists the fixed keys of the field:
  - "Next match in the find field", with Enter
  - "Previous match in the find field", with Shift+Enter
  - "Close the find bar", with Escape
- The search words of these six rows are "search" and "text".

## Accessibility

- The bar is a search landmark with the label of its field.
- The field has the label "Find in this tab", and the empty field shows
  the same words.
- The count is a live region. So a screen reader hears each new count,
  such as "3 of 17" or "No matches".
- Previous, Next, and Close are icon buttons with the labels "Previous
  match", "Next match", and "Close the find bar".

## On a phone

- The bar sits at the top of the tab, so the on-screen keyboard does not
  cover it.
- The page of a file or a diff has no tab row. So the Find button of its
  header is the control of Find there.
- Find from a tab menu or from the Find button opens the bar with the
  on-screen keyboard. So the person can type at once.

## The Mac app

- The find bar works in the Mac app as in a browser (find decision 1 B).
- The Mac app has no Find menu item, because its page hears ⌘F first.
  [The Mac app](keyboard-shortcuts.md#the-mac-app) gives this rule.
- The Mac app has find only in a tab that offers Find (find decision 2 A).
  The user chose this on 13 November 2026.
- So in the Mac app, ⌘F does nothing on a page without such a tab, such as
  the workspace list or the Account page. A second ⌘F from the field does
  nothing either.
- Reason: these pages are short, and the command palette still finds the
  workspaces and the settings.
- A Find item in the Edit menu of the Mac app, with its own find bar, was
  rejected. It needs a bridge from the page to the Mac app, which
  [Permissions](desktop-commands.md#permissions) rules out.
- A find bar over the whole page, on the pages without such a tab, was
  rejected. Find would then cover more than the shown tab.
