# Keyboard shortcuts: the keys

This doc holds the requirements and the decisions in force for the keys of
the keyboard shortcuts: the default keys, the second keys, the keys of
Windows and Linux, and the keys chosen by hand. It belongs to
[Keyboard shortcuts](keyboard-shortcuts.md), which gives the rules and the
terms. [The keys of the browsers](keyboard-shortcuts-browser-keys.md)
lists the keys that each browser keeps, and the keys that the app leaves
to each browser. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A fast mode
decision number names a decision of the change that adds
[fast mode](fast-mode.md), as that doc says. A terminal tabs decision
number names a decision of the change that adds terminal tabs to the
Terminal tool, as [Terminal](terminal.md) says.

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
  - **Pull request bar:** where the pull request bar shows the button of
    the command, and the button can take a click. On a phone, the top of
    the Checks tab holds these buttons.
  - **Pull request link:** where a link to the pull request on GitHub
    shows, such as the number of the pull request in the bar.
  - **Workspace label:** where the header of a workspace shows the label
    of its number, which is the Copy link button.
  - **Session tab:** where the shown tab of a workspace is a session.
  - **Selection:** where a selection in the chat shows Explain, as
    [The selection and Explain](explain.md#the-selection-and-explain) says.
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
| General | Send feedback | ⌥⌘F | Alt+Shift+F | Palette |
| View | Hide or show the sidebar | ⌘B, [ | Ctrl+B, [ | Palette |
| View | Hide or show the right column | ⌥⌘B, ] | Alt+Shift+B, ] | Workspace |
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
| Workspace | Restore workspace | – | – | Palette |
| Workspace | Copy link | ⇧⌘C | Ctrl+Shift+C | Workspace label |
| Workspace | Open workspace 1 to 9 | ⌘1 to ⌘9, ⌥⌘1 to ⌥⌘9 | Ctrl+1 to Ctrl+9, Alt+Shift+1 to Alt+Shift+9 | Org page |
| Workspace | Previous workspace | ⌥⌘↑, ⌃⌘↑ | Alt+Shift+↑, Alt+Shift+PageUp | Org page |
| Workspace | Next workspace | ⌥⌘↓, ⌃⌘↓ | Alt+Shift+↓, Alt+Shift+PageDown | Org page |
| Workspace | Next workspace that needs input | ⌥⌘L | Alt+Shift+L | Org page |
| Workspace | Create PR | ⇧⌘P, ⌥⇧⌘P | Ctrl+Shift+P, Alt+Shift+P | Pull request bar |
| Workspace | Fix checks | ⌥⌘X | Alt+Shift+X | Pull request bar |
| Workspace | Resolve conflicts | – | – | Pull request bar |
| Workspace | Merge latest target branch | – | – | Palette |
| Workspace | Address review | – | – | Pull request bar |
| Workspace | Commit and push | ⇧⌘Y | Ctrl+Shift+Y | Pull request bar |
| Workspace | Mark PR ready for review | – | – | Pull request bar |
| Workspace | Merge PR | ⇧⌘M | Ctrl+Shift+M | Pull request bar |
| Workspace | Add to merge queue | – | – | Palette |
| Workspace | Remove from queue | – | – | Palette |
| Workspace | Continue after merge | – | – | Pull request bar |
| Workspace | Open PR on GitHub | ⇧⌘G | Ctrl+Shift+G | Pull request link |
| Workspace | Go to All files | – | – | Palette |
| Workspace | Go to Changes | ⌥⌘U | Alt+Shift+U | Palette |
| Workspace | Go to Checks | – | – | Palette |
| Workspace | Go to Terminal | ⌘J | Ctrl+J | Palette |
| Workspace | Go to Preview | – | – | Palette |
| Workspace | New terminal | – | – | Palette |
| Chat | New session | ⌘T, ⌥⌘T | Ctrl+T, Alt+Shift+T | Palette |
| Chat | Session history | – | – | Palette |
| Chat | Focus the message field | ⌘L, ⇧⌘L | Ctrl+L, Ctrl+Shift+L | Workspace |
| Chat | Attach files | ⌘U | Ctrl+U | Workspace |
| Chat | Model picker | ⌘/ | Alt+Shift+M | Workspace |
| Chat | Next effort level | ⌃⌘/ | Ctrl+Shift+/ | Workspace |
| Chat | Fast mode | ⇧⌘E | Ctrl+Shift+E | Session tab |
| Chat | Stop the agent | ⌃⌘⌫ | Alt+Shift+S | Workspace |
| Chat | Copy concise transcript | ⌥⌘C | Alt+Shift+C | Session tab |
| Chat | Copy full transcript | – | – | Session tab |
| Chat | Explain the selection | ⌥⌘E | Alt+Shift+E | Selection |

- Fast mode has ⇧⌘E, the key of the Fast row of Conductor, and its twin
  Ctrl+Shift+E (fast mode decision 258). Reason: members who move from
  Conductor press that key. No key, a row of the palette, and a key that
  opens the model menu were rejected for that reason.
- Explain the selection has ⌥⌘E and its twin Alt+Shift+E. Conductor has no
  such command, but the user chose a keyboard start for Explain on
  17 November 2026, as [The keyboard start](explain.md#the-keyboard-start)
  says. Reason: E names Explain, and Fast mode has ⇧⌘E. Chrome, Edge, and
  the Mac app have no action on these keys.
- ⌘E and Ctrl+E were rejected. On a Mac, Chrome and Safari use the
  selection for Find on ⌘E. On Windows and Linux, Chrome searches from its
  address bar on Ctrl+E.
- Risk: Firefox opens its Network Monitor on ⌥⌘E, and Safari empties its
  caches on ⌥⌘E while its Develop menu shows. Where Explain shows, the app
  takes the key.
- New terminal has no default key. Reason: Conductor opens a terminal tab
  on ⌘T while its terminal has the focus, but ⌘T runs New session in this
  app. On Windows and Linux, no key reaches the app while the terminal has
  the focus, as [Where a key goes](keyboard-shortcuts.md#where-a-key-goes)
  says.
- A default key of New terminal that also works while the terminal has
  the focus was rejected (terminal tabs decision 3). Reason: such a key
  must be free in each browser, in each shell, on each keyboard layout,
  and in the message field. Such a key is hard to find.
- Hide or show the sidebar runs in every host, with ⌘B and [ on a Mac and
  their twins Ctrl+B and [ on Windows and Linux (list popover decision 5 A,
  16 November 2026). Reason: the browser has the sidebar toggle too, and
  the keys follow the rules in force, as for Hide or show the right
  column. Risk: Firefox opens its bookmarks sidebar on ⌘B and Ctrl+B, and
  the app takes that key while the command runs.
  [The hidden sidebar](org-rail-order.md#the-hidden-sidebar) defines the
  list popover decisions.
- No two commands share a default key on the same keyboard.
- The command Commit and push also presses Push, which the bar shows in
  its place when the local work is only commits, as
  [Actions](github-banner.md#actions) says. The tooltip of each button
  names its own label.
- No default key is a text key of its system, except Ctrl+U on Linux, as
  [Keys chosen by hand](#keys-chosen-by-hand) says.
- No default key on a Mac is a key that macOS takes first in its default
  settings.
- Risk: a person who turns on the macOS keys that switch between desktops
  loses ⌃1 to ⌃9 in every host.

## Second keys

- The second keys on a Mac are ⌥⌘N, ⌥⌘W, ⌥⇧⌘T, ⌥⌘[, ⌥⌘], ⌥⌘1 to ⌥⌘9, ⌃⌘↑,
  ⌃⌘↓, ⌥⌘T, ⇧⌘L, and ⌥⇧⌘P. The table gives each one after the keys of
  Conductor.
- Open workspace 1 to 9 get the second keys ⌥⌘1 to ⌥⌘9. Reason: Chrome and
  Firefox have no command on them, and a digit matches by its physical
  key, so ⌥ does no harm. ⌃⌘1 to ⌃⌘9 were the other choice. They break the
  pattern of ⌥⌘N, ⌥⌘T, and ⌥⌘W, and Safari uses ⌃⌘1 and ⌃⌘2 for its
  sidebars.
- Previous workspace and Next workspace get the second keys ⌃⌘↑ and ⌃⌘↓.
  Reason: Firefox keeps ⌥⌘↑ and ⌥⌘↓, and Chrome and Firefox have no
  command on ⌃⌘↑ and ⌃⌘↓.
- Focus the message field has the second key ⇧⌘L in every browser.
- Create PR gets the second key ⌥⇧⌘P. Reason: Firefox keeps ⇧⌘P for its
  private window. The key adds ⌥ to the key of Conductor, as ⌥⇧⌘T does
  for Reopen closed session. ⌥⌘P was the other choice. Chrome on a Mac
  opens the print dialog of the system on it.

## Windows and Linux

- A Mac uses the Mac keys. Windows and Linux use the Windows and Linux
  keys.
- Some rules differ between Windows and Linux:
  [the keys that the app leaves to the browser](#keys-that-the-app-leaves-to-the-browser),
  [the text keys](keyboard-shortcuts-fixed-keys.md#text-keys), and Ctrl+U in
  a single-line text field. For each such rule, Android counts as Linux. An
  unknown system on the Windows and Linux keyboard counts as Windows and as
  Linux.
- Reason: an unknown browser already counts the keys of each supported
  browser. A missed key would take a key of the browser or of a text field
  from the person.
- The Windows and Linux keys follow the Mac keys (decision 194):
  - Ctrl takes the place of ⌘, and Shift stays.
  - A Mac key with ⌥ becomes Alt+Shift with the same key.
  - Each second key becomes Alt+Shift with the same key.
  - Switch to org 1 to 9 use Alt+1 to Alt+9. In a normal tab on Linux, the
    app leaves these keys to the browser, as
    [Hosts](keyboard-shortcuts-hosts.md#hosts) says.
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
- Fix checks is ⌥⌘X. ⇧⌘X, the key of Conductor, was rejected, because
  Firefox switches the text direction of the focused text field on it.
  ⌃⌘X was the other choice. Chrome on a Mac uses it for its tab groups, and
  it has no twin on Windows and Linux.

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
- Fix checks is Alt+Shift+X, the twin of ⌥⌘X. Ctrl+Shift+X was rejected,
  because Firefox switches the text direction of the focused text field on
  it.
- Previous workspace and Next workspace also get Alt+Shift+PageUp and
  Alt+Shift+PageDown. Reason: the Orca screen reader on Linux takes
  Alt+Shift with the arrows in every mode. A person who uses Orca then has
  no other default key for these commands.
- Attach files keeps Ctrl+U. In a single-line text field on Linux, Firefox
  deletes to the start of the line on Ctrl+U. So Ctrl+U is a text key
  there, and only there. It is not a fixed key.

## Keys that a tab keeps

[Keys that a tab keeps](keyboard-shortcuts-browser-keys.md#keys-that-a-tab-keeps)
lists the default keys that each browser keeps in a normal tab.

## Keys that the app leaves to the browser

[Keys that the app leaves to the browser](keyboard-shortcuts-browser-keys.md#keys-that-the-app-leaves-to-the-browser)
lists the keys that the app leaves to each browser in a normal tab.
