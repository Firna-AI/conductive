# Keyboard shortcuts

This doc holds the requirements and the decisions in force for keyboard
shortcuts. A shortcut is a key that runs a command of the app, such as ⌘K,
which opens the command palette. Each person can change the keys of the
commands on the Keyboard shortcuts tab of the Account page. The terms are
those of the [architecture doc](../architecture.md#terms) and the terms
below. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

Three pages belong to this doc:

- [Keyboard shortcuts: the keys](keyboard-shortcuts-keys.md) gives the
  default keys of each command, the keys of Windows and Linux, the keys
  that each browser keeps, the keys that the app leaves to each browser,
  the fixed keys, and the text keys.
- [Keyboard shortcuts: matching a press](keyboard-shortcuts-matching.md)
  gives how a press matches a key, also on other keyboard layouts and
  while a layout switch key is down.
- [Keyboard shortcuts: the settings tab](keyboard-shortcuts-tab.md) gives
  the tab where a person changes the keys.

The [mockup catalogue](../mockups/catalogue.md) draws the tab at
`app/account/shortcuts` in a browser, and at `mac-app/shortcuts` in the Mac
app.

## Terms

- **Key:** a press of one key with its modifiers, such as ⌥⌘N or
  Ctrl+Shift+T.
- **Command:** an action of the app that keys can run, such as New
  workspace.
- **Keyboard:** the keys of one kind of system. The app has two keyboards:
  the Mac keyboard, and the Windows and Linux keyboard.
- **Host:** the place where the app runs: the Mac app, an installed app, or
  a normal browser tab.
- **Installed app:** the app in its own window, installed from Chrome or
  Edge.
- **Kept key:** a key that a browser acts on in a normal tab, so that the
  page cannot use it.
- **Second key:** a default key that every normal tab lets through, for a
  command whose keys from Conductor do not work in a normal tab.
- **Fixed key:** a key that no person can give to a command, such as the
  send key.
- **Text key:** a key that the text fields of a system use to edit or to
  move in text, such as ⌘C or ⌥←.
- **Layout switch key:** a key that switches the keyboard layout of the
  system, such as from English to Russian. The browser reports its press
  as GroupNext, GroupPrevious, GroupFirst, or GroupLast.

## Commands

- Keys run only what the app already does: its controls, and the moves
  between the tabs, the workspaces, and the orgs that it shows. Reason:
  decision 144 set this rule for the palette.
- So the keys of Conductor for features that the app lacks stay out, such
  as a theme, a zen mode, the pull request actions, and search in the chat.
- The default keys copy the keys of Conductor, except where
  [The keys](keyboard-shortcuts-keys.md) gives another key and its reason.
- A command without a key in Conductor starts with no key. The person can
  give it one.
- Go to Desktop has no command while the app hides Desktop, as
  [Desktop](workspace-tools.md#desktop) says.
- The commands come in five groups, as in Conductor: General, View,
  Navigation, Workspace, and Chat.
  [The default keys](keyboard-shortcuts-keys.md#the-default-keys) lists
  each command with its group.
- Switch to org 1 to 9 and Open workspace 1 to 9 are nine commands each,
  one for each place.
- The labels use the words of the app and of macOS, such as Stop the agent,
  Switch to org 1, Open workspace 1, and Reopen closed session.
- A command holds at most four keys, in an order.
- A person can change the keys of each command, also the keys of the
  command palette (decision 190).

## Where a command runs

- A key runs its command only where the page offers that command. The key
  then does what the control of the page does.
- A command that the palette lists runs where the palette offers it, as
  [Actions](command-palette.md#actions) and
  [Settings](command-palette.md#settings) say. So a key and its row in the
  palette do the same thing. For example, Archive workspace runs only for
  the workspace owner and the admins.
- [The default keys](keyboard-shortcuts-keys.md#the-default-keys) gives
  where each other command runs: on every page, in a workspace, on a page
  of an org, or only in the Mac app.
- The key of each of these commands does this:
  - Workspace list opens the list page of the org.
  - Previous tab and Next tab show the tab before or after the shown tab
    of the [tab row](agents-and-sessions.md#the-tab-row).
  - Close tab closes the shown tab, as the close control of that tab does.
  - Reopen closed session reopens the session that closed last. The
    session history lists that session first.
  - Switch to org 1 to 9 opens the org at that place in the org rail,
    counted from the top.
  - Open workspace 1 to 9 opens the workspace at that place among the rows
    that the workspace list shows, counted from the top. A collapsed
    section and a closed Archived group add no row.
  - Previous workspace and Next workspace open the workspace above or
    below the open workspace, among the rows that the list shows.
  - Next workspace that needs input opens the next workspace of the list
    that needs input. With no open workspace, it starts from the top of
    the list.
  - Focus the message field moves the focus to the message field of the
    workspace.
  - Next effort level chooses the next effort of the model in the model
    picker.
- A key that steps through a list wraps at its end: from the last item to
  the first, and from the first to the last. This holds for Previous and
  Next tab, Previous and Next workspace, Next workspace that needs input,
  and Next effort level. Reason: the menus of the app and the tabs of the
  palette wrap too.

## Hosts

- The app runs in three hosts: the Mac app, an installed app, and a normal
  browser tab. The supported browsers are Chrome, Edge, Firefox, and
  Safari.
- The Mac app and an installed app give the page every key, except a key
  that the system takes first, such as ⌘Space on a Mac. So every default
  key works there.
- A web app of Firefox or Safari is not an installed app. It keeps the
  keys of a normal tab of its browser.
- A normal tab keeps some keys for the browser, such as ⌘T, which opens a
  new tab of the browser.
  [Keys that a tab keeps](keyboard-shortcuts-keys.md#keys-that-a-tab-keeps)
  lists the default keys that each browser keeps.
- In a normal tab, a kept key runs no command, also when the page gets it.
  Reason: the browser acts on the key anyway.
- An unknown browser counts each key that a supported browser keeps as
  kept.
- Each command whose key from Conductor a supported browser keeps also
  gets a second key, which every normal tab lets through (decision 191).
  For example, New workspace has ⌘N and the second key ⌥⌘N. The Mac app
  and an installed app take both keys.
- Reason: a person then reaches each command from the keyboard in every
  host, as in VS Code for the Web. One set of keys for every host was
  rejected, because the Mac app would then lose ⌘N, ⌘T, and ⌘W. The keys of
  Conductor alone were rejected, because these commands would then have no
  key in a normal tab.
- In a normal tab, the app leaves some keys to the browser (decision 192).
  They are the keys that the browser uses on its system to select a tab or
  to open its address bar. Such a key runs no command there, as a kept key
  does.
- [Keys that the app leaves to the browser](keyboard-shortcuts-keys.md#keys-that-the-app-leaves-to-the-browser)
  lists these keys for each browser and system, such as ⌘1 to ⌘9 and ⌘L
  on a Mac.
- So Open workspace 1 to 9 and Focus the message field use their second
  keys where the browser uses their keys from Conductor. The Mac app and
  an installed app take both keys.
- Reason: people use these keys of the browser the most. After ⌘L, an
  address that the person types and sends would go to the agent. A tab
  that takes every key that the browser lets through was rejected for
  these reasons.
- Chrome, Edge, and Firefox on Linux select a tab on Alt+1 to Alt+9. So in
  a normal tab on Linux, Switch to org 1 to 9 have no default key that
  works (decision 196). An installed app takes Alt+1 to Alt+9.
- Firefox on Linux has no action on Ctrl+1 to Ctrl+9. So in Firefox on
  Linux, Open workspace 1 to 9 keep Ctrl+1 to Ctrl+9.
- Reason: the person keeps each tab key of the browser, and the Switch to
  rows of the palette still open every other org. Alt+1 to Alt+9 for the
  orgs in a Linux tab were rejected for this reason. Other org keys were
  rejected: Ctrl+Alt+1 to Ctrl+Alt+9 would work on Linux only, and a layout
  switch can take Ctrl+Shift+1 to Ctrl+Shift+9.
- Each other key of the browser that a tab lets the page take stays a
  default key, such as ⇧⌘A, which is tab search in Chrome. Where the page
  offers the command, the key runs the command in place of the action of
  the browser. Reason: these keys of the browser cost little, and the
  person can remove any key.
- In a normal tab, Back and Forward stay with the browser. Only the Mac app
  has the commands Back and Forward, because only the Mac app has their
  buttons.

## Where a key goes

- While a dialog or a sheet is open, a key runs only the command that owns
  that layer. Reason: that layer holds the focus, and the page under it
  takes no input. So the palette key closes the open palette, and it does
  nothing over another dialog.
- An open menu closes first, and the key then runs its command. A menu
  that does not close, such as during a change that it runs, keeps the key.
- The terminal keeps every key that a program in it can read:
  - On a Mac, only a key with ⌘ goes to the app from the terminal. So ⌘K
    opens the palette from the terminal. ⌃Tab goes to the terminal.
  - On Windows and Linux, the terminal keeps every key. So no shortcut
    runs while the terminal has the focus, also not Ctrl+K.
  - Reason: shells read these keys, such as Ctrl+K to delete to the end of
    the line, Alt+B and Alt+F to move by word, and Alt+1 for a count.
    Readline reads Alt+Shift with a letter as Alt with that letter.
  - A terminal that keeps only a list of keys, such as the keys with Ctrl
    or Alt, was rejected. A recorded key outside the list, such as P or
    F2, would then not reach the program.
  - A ⌘K that clears the terminal, as in the terminal apps of a Mac, was
    rejected, so that the palette key works the same everywhere. `clear`
    or Ctrl+L clears the screen.
- A key works also in a text field, except a text key of the system.
  [Text keys](keyboard-shortcuts-keys.md#text-keys) lists the text keys. So
  ⌘K opens the palette from the message field. ⌘C still copies there.
- A key without ⌘, Ctrl, or Alt runs its command only outside text fields.
- Enter with any modifier and Space with no modifier run no command,
  because they are [fixed keys](keyboard-shortcuts-keys.md#fixed-keys). So
  the message field and a focused control get them.
- On a Mac, a key with ⌥ and without ⌘ or ⌃ also runs only outside text
  fields. Reason: such a key types a character, such as ¡ for ⌥1.
- While a port preview or the live desktop has the focus, every key goes
  to its frame. Reason: the frame comes from another origin, so the page
  does not get its keys. A click outside the frame gives the keys back to
  the app.
- While the recorder of the tab waits for a key, no key runs a command.
  [Recording a key](keyboard-shortcuts-tab.md#recording-a-key) gives the
  recorder.
- A held key runs its command once.
- During text composition, a key goes to the text.
- A key that runs a command goes no further. The browser's own action for
  that key does not run. No element of the page gets the key.
- Reason: the message field and the terminal act on a key after the app
  hears it. Without this rule, a key could run its command and also edit
  the text or reach the shell.
- Each other key goes on to the page and to the browser.
  [The layout switch](keyboard-shortcuts-matching.md#the-layout-switch)
  gives the exception while a layout switch key is down.
- No key allows or denies a Mac command (decision 62). Reason: a stray key
  must never run a command on the Mac of the person.

## The Mac app

- The page of the Mac app hears each key before the menus of the Mac app.
  A menu acts on a key only when the page leaves the key.
- So ⌘N, ⌘T, and ⌘W run their commands in the Mac app. ⌘R still reloads
  the page.
- The keys of the menus of the Mac app are fixed keys, as
  [Fixed keys](keyboard-shortcuts-keys.md#fixed-keys) says.
- The menu bar of the Mac app has no item for a command that keys run,
  such as a Search item. Reason: the page hears each key itself. A menu
  cannot run an action inside the page, because the page has no bridge, as
  [Permissions](desktop-commands.md#permissions) says.

## Key hints

- The palette shows keys in its rows and in its Search row, as
  [Rows](command-palette.md#rows) and
  [Entry points](command-palette.md#entry-points) say.
- The tooltip of a control shows the first key of its command that works
  where the page runs. A screen reader hears that key too.
- Each hint shows the keys of the person, with their changes.
- In the phone layout, no hint shows outside the Keyboard shortcuts tab.
- The keys work in every layout. Reason: the phone layout also serves a
  narrow desktop window, which has a keyboard.

## Storage

- The changes of a person belong to the account (decision 190). So they
  apply in every browser and in the Mac app.
- Reason: the keys then work the same everywhere, and the browser still
  stores only the panel widths. Changes that stay on each device were
  rejected, because a new browser, a private window, and the Mac app would
  each start from the default keys.
- One set of keys for the whole org was rejected, because the keys are a
  setting of each person.
- The account holds one set of changes for each keyboard. Reason: ⌘ and
  Ctrl differ, as VS Code keeps its keys apart for each system. So a change
  on a Mac applies on every Mac, and not on Windows or Linux.
- The account stores only the changes: each command whose keys differ from
  its default keys, with its keys in their order.
- A command can have no key. The account then keeps that command with an
  empty list of keys.
- The account reply carries the changes of both keyboards.
- A save takes a list of changes for one keyboard. It saves all of them
  or none. So Replace and Reset all never save half.
- The Worker checks each command and each key of a save, and that a
  command has at most four keys. It rejects a fixed key, and a keypad key
  other than a digit, as
  [How a key matches](keyboard-shortcuts-matching.md#how-a-key-matches) says.
  A list with one wrong change saves nothing.
- The account reply skips a stored command that the app no longer has.
  It also drops a stored key that a save would reject, such as a key that
  became fixed.
- Another open tab or window of the person uses a change after its next
  read of the account.
- A person reads and changes only their own changes.
- The changes go with the account when the account is deleted.
