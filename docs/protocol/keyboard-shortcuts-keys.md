# Keyboard shortcuts: the keys

This doc holds the requirements and the decisions in force for the keys of
the keyboard shortcuts: the default keys, the keys of Windows and Linux,
the keys that each browser keeps, the fixed keys, and the text keys. It
belongs to [Keyboard shortcuts](keyboard-shortcuts.md), which gives the
rules and the terms. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## The default keys

- The table gives each command, its group, its default keys on each
  keyboard in their order, and where it runs.
- The words of the Where column mean:
  - **Every page:** each page of the signed-in app.
  - **Palette:** where the palette offers the command, as
    [Where a command runs](keyboard-shortcuts.md#where-a-command-runs)
    says.
  - **Workspace:** the page of an open workspace.
  - **Org page:** a page of an org.
  - **Org rail:** each page that shows the org rail, as the tile of the
    org does.
  - **Mac app:** only the Mac app has the command.
- A dash means that the command has no default key.
- Switch to org 1 to 9 and Open workspace 1 to 9 stand for nine commands
  each. Switch to org 1 has ⌃1, and so on.

| Group | Command | Mac | Windows and Linux | Where |
| --- | --- | --- | --- | --- |
| General | Command palette | ⌘K | Ctrl+K | Every page |
| General | Keyboard shortcuts | ⌥⌘/ | Alt+Shift+/ | Palette |
| General | Account page | ⌘, | Ctrl+, | Every page |
| General | Create org | – | – | Palette |
| View | Hide or show the sidebar | ⌘B | – | Palette, Mac app |
| View | Hide or show the right column | ⌥⌘B | Alt+Shift+B | Workspace |
| Navigation | Back | ⌘[ | – | Mac app |
| Navigation | Forward | ⌘] | – | Mac app |
| Navigation | Workspace list | ⇧⌘H | Ctrl+Shift+H | Org page |
| Navigation | Previous tab | ⌃⇧Tab, ⇧⌘[, ⌥⌘←, ⌥⌘[ | Ctrl+Shift+Tab, Ctrl+Shift+[, Alt+Shift+←, Alt+Shift+[ | Workspace |
| Navigation | Next tab | ⌃Tab, ⇧⌘], ⌥⌘→, ⌥⌘] | Ctrl+Tab, Ctrl+Shift+], Alt+Shift+→, Alt+Shift+] | Workspace |
| Navigation | Close tab | ⌘W, ⌥⌘W | Ctrl+W, Alt+Shift+W | Workspace |
| Navigation | Reopen closed session | ⇧⌘T, ⌥⇧⌘T | Ctrl+Shift+T, Alt+Shift+Z | Workspace |
| Navigation | Switch to org 1 to 9 | ⌃1 to ⌃9 | Alt+1 to Alt+9 | Org rail |
| Navigation | Repositories settings | ⌥⌘A | Alt+Shift+A | Palette |
| Workspace | New workspace | ⌘N, ⌥⌘N | Ctrl+N, Alt+Shift+N | Palette |
| Workspace | New section | – | – | Palette |
| Workspace | Archive workspace | ⇧⌘A | Ctrl+Shift+A | Palette |
| Workspace | Open workspace 1 to 9 | ⌘1 to ⌘9, ⌥⌘1 to ⌥⌘9 | Ctrl+1 to Ctrl+9, Alt+Shift+1 to Alt+Shift+9 | Org page |
| Workspace | Previous workspace | ⌥⌘↑, ⌃⌘↑ | Alt+Shift+↑, Alt+Shift+PageUp | Org page |
| Workspace | Next workspace | ⌥⌘↓, ⌃⌘↓ | Alt+Shift+↓, Alt+Shift+PageDown | Org page |
| Workspace | Next workspace that needs input | ⌥⌘L | Alt+Shift+L | Org page |
| Workspace | Go to All files | – | – | Palette |
| Workspace | Go to Changes | ⌥⌘U | Alt+Shift+U | Palette |
| Workspace | Go to Checks | – | – | Palette |
| Workspace | Go to Terminal | ⌘J | Ctrl+J | Palette |
| Workspace | Go to Preview | – | – | Palette |
| Chat | New session | ⌘T, ⌥⌘T | Ctrl+T, Alt+Shift+T | Palette |
| Chat | Session history | – | – | Palette |
| Chat | Focus the message field | ⌘L, ⇧⌘L | Ctrl+L, Ctrl+Shift+L | Workspace |
| Chat | Attach files | ⌘U | Ctrl+U | Workspace |
| Chat | Model picker | ⌘/ | Alt+Shift+M | Workspace |
| Chat | Next effort level | ⌃⌘/ | Ctrl+Shift+/ | Workspace |
| Chat | Stop the agent | ⌃⌘⌫ | Alt+Shift+S | Workspace |

- No two commands share a default key on the same keyboard.
- No default key is a text key of its system, except Ctrl+U on Linux, as
  [Keys chosen by hand](#keys-chosen-by-hand) says.
- No default key on a Mac is a key that macOS takes first in its default
  settings.
- Risk: a person who turns on the macOS keys that switch between desktops
  loses ⌃1 to ⌃9 in every host.

## Second keys

- The second keys on a Mac are ⌥⌘N, ⌥⌘W, ⌥⇧⌘T, ⌥⌘[, ⌥⌘], ⌥⌘1 to ⌥⌘9, ⌃⌘↑,
  ⌃⌘↓, ⌥⌘T, and ⇧⌘L. The table gives each one after the keys of Conductor.
- Open workspace 1 to 9 get the second keys ⌥⌘1 to ⌥⌘9. Reason: Chrome and
  Firefox have no command on them, and a digit matches by its physical
  key, so ⌥ does no harm. ⌃⌘1 to ⌃⌘9 were the other choice. They break the
  pattern of ⌥⌘N, ⌥⌘T, and ⌥⌘W, and Safari uses ⌃⌘1 and ⌃⌘2 for its
  sidebars.
- Previous workspace and Next workspace get the second keys ⌃⌘↑ and ⌃⌘↓.
  Reason: Firefox keeps ⌥⌘↑ and ⌥⌘↓, and Chrome and Firefox have no
  command on ⌃⌘↑ and ⌃⌘↓.
- Focus the message field has the second key ⇧⌘L in every browser.

## Windows and Linux

- A Mac uses the Mac keys. Windows and Linux use the Windows and Linux
  keys.
- The Windows and Linux keys follow the Mac keys (decision 194):
  - Ctrl takes the place of ⌘, and Shift stays.
  - A Mac key with ⌥ becomes Alt+Shift with the same key.
  - Each second key becomes Alt+Shift with the same key.
  - Switch to org 1 to 9 use Alt+1 to Alt+9.
- When two commands would get the same key, or a key fails a check, a key
  chosen by hand takes its place, as
  [Keys chosen by hand](#keys-chosen-by-hand) says.
- Reason: these keys type no character. Ctrl+Alt with the same key, as in
  VS Code on Linux, was rejected, because Ctrl+Alt types characters on
  AltGr keyboards, such as ł on a Polish keyboard. Ctrl+Shift with the same
  key was rejected, because many Mac keys then clash, and Ctrl+Shift with
  an arrow selects a word.
- On a Mac, ⌃ never takes the place of ⌘. So Ctrl+K does not open the
  palette on a Mac. Reason: ⌃K deletes to the end of the line in the text
  fields of a Mac.

## Keys chosen by hand

On a Mac:

- Next effort level is ⌃⌘/. ⇧⌘/ was rejected, because it is the macOS key
  of the Help menu. Chrome, Edge, and the Mac app never give it to the page
  when the shortcut list of the system holds it.
- Stop the agent is ⌃⌘⌫. ⇧⌘⌫ was rejected, because it deletes to the start
  of the line in a text field, so it would not run from the message field.

On Windows and Linux:

- New session keeps Alt+Shift+T, and Reopen closed session gets the second
  key Alt+Shift+Z. Reason: both Mac second keys become Alt+Shift+T. New
  session is used more, and every browser keeps Ctrl+T in a tab.
- Next workspace that needs input keeps Alt+Shift+L, and Focus the message
  field gets the second key Ctrl+Shift+L. Reason: both Mac keys become
  Alt+Shift+L. Ctrl+Shift+L is the plain twin of ⇧⌘L, and no browser keeps
  it.
- Stop the agent is Alt+Shift+S. Ctrl+Shift+Backspace was rejected,
  because Chrome and Firefox on Linux delete to the start of the line on
  it.
- Model picker is Alt+Shift+M. Ctrl+/ was rejected, because Firefox on
  Linux selects all text on it.
- Next effort level is Ctrl+Shift+/. Reason: the rules above give ⌃⌘/ no
  twin, and no browser has a command on Ctrl+Shift+/.
- Previous workspace and Next workspace also get Alt+Shift+PageUp and
  Alt+Shift+PageDown. Reason: the Orca screen reader on Linux takes
  Alt+Shift with the arrows in every mode. A person who uses Orca then has
  no other default key for these commands.
- Attach files keeps Ctrl+U. In a single-line text field on Linux, Firefox
  deletes to the start of the line on Ctrl+U. So Ctrl+U is a text key
  there, and only there. It is not a fixed key.

## Keys that a tab keeps

The table lists the default keys that each browser keeps in a normal tab.
Every other default key reaches the page there. The app also leaves to the
browser the keys of its tabs and of its address bar, as
[Hosts](keyboard-shortcuts.md#hosts) says.

| Browser | Mac | Windows and Linux |
| --- | --- | --- |
| Chrome and Edge | ⌘N, ⌘T, ⇧⌘T, ⌘W, ⌃Tab, ⌃⇧Tab, ⇧⌘[, ⇧⌘], ⌥⌘←, ⌥⌘→ | Ctrl+N, Ctrl+T, Ctrl+Shift+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab |
| Firefox | ⌘N, ⌘T, ⌘W, ⌃Tab, ⌃⇧Tab, ⇧⌘[, ⇧⌘], ⌥⌘←, ⌥⌘→, ⌥⌘↑, ⌥⌘↓ | Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab |
| Safari | ⌘N, ⌘T, ⇧⌘T, ⌘W, ⌃Tab, ⌃⇧Tab, ⇧⌘[, ⇧⌘] | – |

- Chrome and Edge act on ⇧⌘T and Ctrl+Shift+T only while a closed tab of
  the browser can open again. These keys count as kept, because the page
  cannot tell when.
- Firefox lets the page take ⇧⌘T and Ctrl+Shift+T.

## How a key matches

- A key without ⌥ matches by the character that it types. A key with ⌥
  matches by its physical key. Reason: on a Mac, ⌥ changes the character,
  so ⌥⌘N types no N.
- A digit matches by its physical key in the top row. Reason: French
  keyboards type digits with Shift.
- A letter or a digit whose key types another script, such as Cyrillic or
  Greek, matches by its physical key. Reason: on a Russian layout, Ctrl+K
  arrives as Ctrl+л, so every letter key would fail, also the palette key.
- A keypad key counts as the key that it types. So the keypad / with ⌘ is
  ⌘/, the keypad 8 with Num Lock off is ↑, and the keypad Enter is Enter, a
  fixed key. Reason: each press then has one key, so the conflict line,
  Replace, Reset, and the fixed keys see every key that a press can run. A
  keypad key of its own was rejected, because two keys could then run on
  one press.
- A keypad digit stays a key of the keypad, so ⌘ with the keypad 8 does
  not run Open workspace 8. Reason: a digit matches by its physical key.
- A punctuation key, such as the / of ⌘/, can sit at another place on
  another layout. The person can then record another key.
- On German and French layouts, [ and ] need AltGr. So the bracket keys of
  Previous tab and Next tab do not work there. Their arrow keys still work.

## Fixed keys

No person can give a fixed key to a command. The fixed keys are:

- Enter, which sends, and Shift+Enter, which adds a line, as
  [The send key](create-a-workspace.md#the-send-key) says (decision 143)
- Enter with any modifier, the keypad Enter, and Space with no modifier,
  which press or choose a focused control, such as a button, a switch, or
  a menu item
- Escape, which closes a dialog, a menu, or the palette
- Up, Down, Home, End, and Enter in a menu and in the palette, and Left and
  Right on the tabs of the palette, as
  [Keys inside the palette](command-palette.md#keys-inside-the-palette)
  says
- Enter, which saves a rename, and Escape, which cancels it
- Shift+F10 and the Menu key on a focused tab, which open the tab menu, as
  [The tab row](agents-and-sessions.md#the-tab-row) says
- on a focused workspace row, Alt with Up or Down and no other modifier,
  which moves the workspace
- on a focused panel divider, Left and Right with no modifier or with
  Shift, and Home and End, which move the divider
- the text keys of each system, as [Text keys](#text-keys) lists them
- the keys of the menus of the Mac app: ⌘Q, ⌘H, ⌥⌘H, ⌘M, ⌘R, ⇧⌘R, ⌘0,
  ⌘+, ⌘-, ⌃⌘F, and ⌥⌘I

Enter with a modifier and Space are fixed on both keyboards, so that a
focused control keeps them. A recorded key that runs only where no control
has the focus was rejected, because the key would then do two things. For
example, ⌘Enter would run a command, but send an unfinished message from
the message field.

Each keyboard has one list of fixed keys, the same in every host and on
every system. So the Mac list holds the keys of the menus of the Mac app
also in a browser, and the Windows and Linux list holds the text keys of
both systems. Reason: the account holds one set of changes for each
keyboard, so a key that the person records in one host also applies in
the others. A key that the Mac app keeps for its menus, such as ⌘R, would
otherwise stop working there.

The keys of a focused row and of a focused divider match exactly
(decision 193). So a key with more modifiers, such as ⌥⌘↑, runs its command
also while a row or a divider has the focus. Reason: a click on a row
leaves the focus on it. A row that kept ⌥⌘↓ would then move the workspace
for the whole org when the person asked for the next workspace.

## Text keys

These lists hold the text keys with a modifier that a person could record
by mistake. Each other key that edits or moves in text is a text key too.

On a Mac:

- Edit: ⌘Z, ⇧⌘Z, ⌘X, ⌘C, ⌘V, ⌘A, and in the Mac app ⌥⇧⌘V.
- Delete: ⌘⌫, ⇧⌘⌫, ⌥⌫, ⇧⌥⌫, ⌃⌫, ⌘⌦, ⌥⌦, ⌃H, ⌃D, and ⌃K.
- Move and select: ⌘, ⌥, or ⇧ with an arrow, and ⌘ or ⌥ with ⇧ and an
  arrow. An arrow with both ⌘ and ⌥ is not a text key.
- Emacs keys: ⌃A, ⌃E, ⌃B, ⌃F, ⌃N, ⌃P, ⌃T, ⌃O, ⌃Y, ⌃V, and ⌃L, and ⌃A, ⌃B,
  ⌃E, ⌃F, ⌃N, ⌃P, and ⌃V with ⇧.
- Other: ⌘., ⌃⌥⌘←, ⌃⌥⌘→, and ⌃⌥⌘↓.

On Windows and Linux:

- Edit: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Ctrl+X, Ctrl+C, Ctrl+V,
  Ctrl+Shift+V, Ctrl+A, Ctrl+Insert, Shift+Insert, and Shift+Delete.
- Delete: Ctrl+Backspace and Ctrl+Delete.
- Move and select: Ctrl or Shift with an arrow, Ctrl+Home, Ctrl+End, and
  each of these Ctrl keys with Shift added.
- Other: Ctrl+.
- On Windows only: Alt+Backspace and Alt+Shift+Backspace.
- On Linux only: Ctrl+Shift+Backspace, Ctrl+Shift+Delete, Ctrl+/, and
  Ctrl+Shift+U.

In a single-line text field on Linux, Ctrl+U is a text key too, as
[Keys chosen by hand](#keys-chosen-by-hand) says.
