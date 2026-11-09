# Keyboard shortcuts

Status: Active. On branch `calummoore/keyboard-shortcuts-settings`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductive gets keyboard shortcuts like Conductor's, and each person can
change them on a new Keyboard shortcuts tab of the Account page. The keys
run the actions that Conductive already has, with Conductor's keys as the
defaults. A person's changes follow the account to every browser and to
the Mac app (decision 180). Where a normal browser tab keeps Conductor's
key for itself, the command also gets a second default key that the
browser lets through (decision 181). The palette key ⌘K becomes one of
these shortcuts, and the palette rows show the key of each command. The
change adds no new feature behind a key, such as a theme or a zen mode.
Decisions 182 to 184 are open: the browser's own keys in a tab, the
workspace row move, and the keys of Windows and Linux.

This workspace owns all shortcuts of the app. On 2026-11-08 the user said
so, and the command palette work (decision 145) left the other keys to it.
The palette session confirmed which of its parts this plan extends.

Contract owners:

- `docs/protocol/keyboard-shortcuts.md`, new in Milestone 2.
- [Command palette](../docs/protocol/command-palette.md).
- [Mac app](../docs/protocol/desktop-app.md).
- The [web app README](../src/app/README.md) and
  [screens](../src/app/screens.md).

Replaced ways:

- The palette's own key code → the keymap and the shortcut listener of
  this plan. The palette key stays ⌘K or Ctrl+K by default.
  Consumers, moved in Milestone 5:
  - `usePaletteKey` in `src/shell/palette/PaletteProvider.tsx`.
  - `paletteKeyHint` and `paletteKeyShortcut` in
    `src/shell/palette/SearchRow.tsx`.
  - `usePaletteTerminal` in `src/shell/workspace/tools/ToolsPart.tsx`.
  - `pressPaletteKey` in `src/shell/palette/palette-test-kit.tsx`, and
    the palette tests that call it.
  - The key cases of `src/app/palette/palette-keys.test.ts`.

  `src/app/palette/palette-keys.ts` is deleted in Milestone 5.

## Decisions

### Decision 180: Where a person's shortcut changes live

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** The Worker stores the other Account preferences of each
  person in D1. The architecture doc says that the browser stores only the
  panel widths.
- **Problem:** A person's changes can live with the account or on each
  device.
- **Impact if no action:** The plan cannot start.
- **Root question:** On which devices and in which windows does a
  person's change of a shortcut apply? The options check wrote this
  question, because A and B build the same tab.
- **Options:**
  - **A.** The changes follow the account. A Keyboard shortcuts tab lists
    each command with its keys. A press on a key records a new one. The
    Worker stores only the changes, so they apply in every browser and in
    the Mac app. Every key except the fixed ones can change, the palette
    key too. The palette rows show each key. Cost: a table, a write route,
    and their tests, beside the tab. Effort: Large.
  - **B.** The changes stay on each device. The same tab, but each browser
    and the Mac app keep their own changes. It saves about a day of Worker
    work. It changes the rule that the browser stores only the panel
    widths. A new browser, a private window, and the Mac app each start
    from the defaults. Effort: Large.
  - **C.** Added by the options check. The changes follow the account, as
    in A. A row can also keep a change for this device only, in the
    browser storage, for example for a French keyboard. Cost: a second
    layer in the keymap, in Reset, and in the tab. It changes the
    architecture rule, as B does. Effort: Large.
- **Left out:** A keymap as JSON text, because the UI rules keep file
  formats out of the main settings screen. It can come later as an import
  and export. Preset keymaps only, because the person cannot choose a key.
  A list that the person can only read, because the request asks to edit
  keys. Keys in the Mac app menu bar, because the menu cannot run an action
  in the page (decision 62). One keymap for the org, because the request
  says user settings.
- **Wider fix:** None. This is a design question, not a class of defect.
- **Previous examples:** Decision 143 rejected a send key that each person
  sets, and kept one fixed rule. Conductor's Keyboard shortcuts page.
  [VS Code's Keyboard Shortcuts editor](https://code.visualstudio.com/docs/configure/keybindings).
- **Related:** Decision 181 sets the defaults that this editor changes.
- **Recommendation:** A. The keys work the same everywhere, and the
  architecture rule stays. The options check kept A, also because the
  Preferences change (PR #73) rejected browser storage for an Account
  setting.
- **Action:** ask the user, because A and B trade the keys on every device
  against a day of work and a change of an architecture rule.
- **Answer:** A, chosen by the user on 2026-11-09.

### Decision 181: Default keys where a browser tab keeps Conductor's key

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** A normal Chrome tab never gives the page ⌘N, ⌘T, ⌘W,
  ⌘⇧T, ⌘Q, or the keys that switch browser tabs. `kReservedCommandIds` in
  Chromium's `accelerator_table.cc` lists them. The Mac app and a Chrome
  or Edge installed app give the page every key ("In Apps mode, no keys
  are reserved" in Chromium, and Electron's key routing). Six commands use
  such a key in Conductor: New workspace, New session, Close tab, Reopen
  session, Previous tab, and Next tab. After the answer, the options check
  found more kept keys: Firefox switches tabs on ⌥⌘↑, ⌥⌘↓, ⇧⌘[, and ⇧⌘]
  before the page, and Safari keeps ⌘L and ⌘R.
- **Problem:** With Conductor's keys only, those commands have no key that
  works in a browser tab.
- **Impact if no action:** The plan cannot fix its key table.
- **Root question:** How does a person reach a command from the keyboard
  in each supported browser, when that browser keeps the command's
  Conductor key? The options check wrote this question, because Firefox
  and Safari keep other keys than Chrome.
- **Options:**
  - **A.** One key set for every host, with only keys that a browser tab
    allows. The Mac app loses ⌘N, ⌘T, and ⌘W too. Effort: Small.
  - **B.** Conductor's keys, plus a second default key for the six
    commands that a browser tab allows, such as ⌥⌘N for New workspace, as
    [VS Code for the Web](https://code.visualstudio.com/docs/remote/vscode-web)
    does. The Mac app and the installed app take both keys. In a browser
    tab, the list marks the kept key. Cost: six more keys to choose and
    learn, and free keys are scarce. Effort: Medium.
  - **C.** Conductor's keys only. In a browser tab, the six commands have
    no key until the person sets one. The list says that the Mac app and
    the installed app take those keys. Effort: Small.
  - **D.** Added by the options check. Default keys for each host. The Mac
    app gets Conductor's keys alone. A browser tab and an installed app
    get both keys, as in B. Cost: Reset and a stored change need a rule
    for each host. Effort: Medium.
  - **E.** Added by the options check. Conductor's keys only, as in C. In a
    browser tab, the Keyboard shortcuts tab offers the installed app.
    Cost: a new install offer with its mockup. Firefox on a Mac has no
    installed app. Effort: Medium.
  - **F.** Added by the options check. Two-step keys, with a first key
    that is not the palette key, for each command whose key a browser
    keeps. Cost: a waiting state in the listener and the recorder, and
    slower presses. Effort: Large.
  - **G.** Added by the options check. B, with the kept keys of each
    supported browser in the model, chosen by the browser and the display
    mode. Each command whose key any supported browser keeps gets a second
    key. The kept-key line names the right browser and host. Effort:
    Medium.
- **Left out:** Keys only in the Mac app, because they fail the goal in a
  browser tab. Two-step letter keys, such as G then W, because letters type
  into the message field, which holds the focus. Keys after ⌘K, because
  the palette's field takes the next key. Chrome's Keyboard Lock, because
  it holds the keys only in full screen.
- **Wider fix:** G. One table of kept keys for each browser serves the
  listener and the tab.
- **Previous examples:** Decision 145 asked this question for the palette,
  and the user chose only ⌘K. [code-server issue 112](https://github.com/coder/code-server/issues/112)
  lists the same kept keys.
- **Related:** Decision 180. Its editor can replace each of these
  defaults.
- **Recommendation:** G, changed from B by the options check. G keeps B,
  and B as first written misses ⌘L in Safari and the tab keys of Firefox.
- **Action:** ask the user, because each option trades Conductor's keys
  against one key set for every host.
- **Answer:** B, chosen by the user on 2026-11-09, before the check added
  D to G. Agent call, 2026-11-09: this plan applies B to the kept keys of
  each supported browser, which is G. Reason: B's reason is a working key
  in every browser tab, and only G gives it in Firefox and Safari.

### Decision 182: The browser's own keys in a browser tab

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** A browser tab gives the page some keys first, but the
  browser also uses them. In Chrome and Firefox, ⌘1 to ⌘9 switch browser
  tabs, and ⌘L goes to the address bar. Chrome also uses ⇧⌘H, ⌥⌘L, ⌥⌘U,
  ⇧⌘A, ⇧⌘⌫, ⇧⌘/, ⌥⌘N, ⌥⌘B, ⌥⌘↑, ⌥⌘↓, and ⌘,. Conductor's defaults use
  all of them. VS Code for the Web leaves ⌘0 to ⌘9 to the browser in a
  tab. The facts come from Chrome on a Mac. Other browsers and keyboards
  use other keys, such as Ctrl+J for downloads on Windows.
- **Problem:** When Conductive takes these keys, the person loses the
  browser's feature while Conductive has the focus. Tab switching with ⌘1
  to ⌘9 is the most used.
- **Impact if no action:** Milestone 1 cannot fix the keys of Workspace 1
  to 9 and Focus the message field in a browser tab.
- **Root question:** In a browser tab, which of the browser's own keys may
  Conductive take?
- **Options:**
  - **A.** Take each key that a browser tab lets through, as Conductor's
    defaults say. The person can remove a key in the tab. Effort: Small.
  - **B.** Leave ⌘1 to ⌘9 and ⌘L to the browser in a tab. There, Workspace
    1 to 9 and Focus the message field use second keys, as decision 181
    does. The Mac app and an installed app take Conductor's keys. Effort:
    Medium.
  - **C.** Leave each browser key to the browser in a tab. Each command
    with such a key uses a second key there. Effort: Medium.
  - **D.** A switch on the Keyboard shortcuts tab, "Use Conductive's keys
    over the browser's keys". In a browser tab it starts off, and the
    commands use second keys. Cost: one more stored setting and its
    mockup. Effort: Medium.
  - **E.** Added by the options check. Leave ⌘1 to ⌘9 and ⌘L to the
    browser in a tab, as in B, but give Workspace 1 to 9 no second key, as
    VS Code for the Web does. The person can record a key, also ⌘1 to ⌘9.
    Focus the message field keeps its second key from decision 181. Cost:
    Workspace 1 to 9 has no default key in a tab. Effort: Small.
  - **F.** Added by the options check. It goes with any other option. The
    table of each browser also holds the keys that the browser uses but
    lets the page take. The Keyboard shortcuts tab marks each default key
    that hides a browser feature, and names the feature. Cost: Milestone 1
    collects these keys for each browser and keyboard, and the mockups get
    one more row state. Effort: Medium.
- **Left out:** Conductor's keys in a full-screen tab with Chrome's
  Keyboard Lock, because it holds the keys only in full screen.
- **Wider fix:** F. One table of the keys of each browser lets the tab mark
  each default key that hides a browser feature, also for later commands.
- **Previous examples:** VS Code for the Web drops its ⌘0 to ⌘9 and
  ⌘⌥← and ⌘⌥→ defaults in a browser tab, in `keybindingService.ts`.
- **Related:** Decision 181 gives the second keys.
- **Recommendation:** B. Tab switching and the address bar are the browser
  keys that people use most. ⌘L costs the most: after ⌘L, an address that
  the person types and sends goes to the agent. The other browser keys
  cost little, and the person can remove any key. F best protects the
  codebase, and it goes with B.
- **Action:** ask the user, because each option trades Conductor's keys
  against the browser's keys, and no option is clearly best.

### Decision 183: Arrow keys of a focused workspace row or divider

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/list/SectionList.tsx:83` and
  `src/shell/layout/ResizeHandle.tsx:75`
- **Background:** On a focused workspace row, ⌥↑ and ⌥↓ move the
  workspace, and a screen reader hears the new place. The code checks only
  ⌥, so ⌘⌥↑ and ⌘⌥↓ also move the row today. A focused panel divider
  steps on Left and Right with any modifier, so ⌥⌘← and ⌥⌘→ move it too.
  No doc states these keys. Conductor uses ⌥⌘↑ and ⌥⌘↓ for Previous and
  Next workspace, and ⌥⌘← and ⌥⌘→ for the tabs.
- **Problem:** On a focused row or divider, a shortcut key either acts on
  that control, as today, or runs its command. The same clash hits the
  Windows and Linux twins of these keys, and each key that a person
  records with Alt and an arrow.
- **Impact if no action:** Milestone 5 cannot wire Previous and Next
  workspace, or the tab keys.
- **Root question:** On a focused workspace row or divider, how do its own
  arrow keys and the shortcuts share the keys with modifiers, on every
  keyboard? The options check wrote this question, because the clash is
  not only ⌘⌥↑ on a Mac.
- **Options:**
  - **A.** They open the previous or next workspace everywhere. The row
    move needs ⌥ without ⌘. This changes behaviour on `main`. Effort:
    Small.
  - **B.** On a focused row they move the row, as today. Elsewhere they
    open the previous or next workspace. A click on a row can leave the
    focus on it, so the key then moves the workspace. Effort: Small.
  - **C.** Previous and Next workspace get other default keys. The row
    move stays. The keys differ from Conductor's. Effort: Small.
  - **D.** Added by the options check. A, made exact and moved into the
    key model. The row move takes Alt with Up or Down and no other
    modifier, through the matcher of the model. The divider takes Left and
    Right with no modifier or with Shift. The list shows these keys as
    fixed, so the recorder refuses them. Then ⌥⌘↑, its Windows and Linux
    twin, and each recorded key reach their commands. Cost: it changes
    behaviour on `main`, as A does. Effort: Small.
  - **E.** Added by the options check. The row move becomes two commands
    that a person can change, Move workspace up and Move workspace down,
    offered only while a row has the focus. Their default keys are Alt
    with Up and Down, matched exactly. Cost: the model and the listener
    need a focus scope, and the tab and its mockup get two more rows. It
    changes behaviour on `main`, as A does. Effort: Medium.
- **Left out:** No keyboard move of a row, because it deletes the only
  keyboard way to reorder the list. A row menu with Move up and Move down
  in place of the keys, because D frees the same keys and keeps the fast
  move. B only when the focus came from the keyboard, because the same
  press on the same row then does two things.
- **Wider fix:** D. The control keys go through the one matcher and the
  list of fixed keys, so the clash does not come back when a key changes.
- **Previous examples:** None found.
- **Recommendation:** D, changed from A by the options check. D costs about
  the same as A, and it also covers Windows and Linux, the second keys,
  and recorded keys. Under B, a click on a row leaves the focus on its
  link, so ⌥⌘↓ then moves the workspace for the whole org.
- **Action:** ask the user, because each option except C changes
  behaviour that is on `main`, and that needs the user's approval.

### Decision 184: The keys of Windows and Linux

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Conductor's list has only Mac keys. Ctrl takes the place
  of ⌘. Ctrl+Alt types characters on AltGr keyboards, such as ł on a
  Polish keyboard, and Ubuntu opens a terminal on Ctrl+Alt+T. Chrome keeps
  Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Shift+N, Ctrl+Shift+T, and Ctrl+Shift+W.
  Firefox opens its menus on Alt and a letter. The Mac keys ⌃1 to ⌃9 and
  ⌘1 to ⌘9 both become Ctrl+1 to Ctrl+9.
- **Problem:** The Mac keys with ⌥ or ⌃, and the second keys of decision
  181, have no clear twin on Windows and Linux.
- **Impact if no action:** Milestone 1 cannot fix the Windows and Linux
  keys.
- **Root question:** Which default key does each command get on a Windows
  or Linux keyboard, so that the key reaches the page and types no
  character? The options check wrote this question, because one key table
  holds all three cases. Decision 182 also sets the Ctrl twins of the
  browser's own keys, such as Ctrl+1 to Ctrl+9.
- **Options:**
  - **A.** Alt+Shift with the same key for each Mac key with ⌥ and for
    each second key. Alt+1 to Alt+9 for the orgs. Cost: a Linux layout that
    switches on Alt+Shift loses these keys. Chrome's own Alt+Shift keys
    give way in Conductive. Effort: Small.
  - **B.** Ctrl+Shift with the same key where the browser does not keep
    it, and a chosen key where it does. Alt+1 to Alt+9 for the orgs. Cost:
    keys clash, such as ⇧⌘A and ⌥⌘A, which both become Ctrl+Shift+A, so
    many keys need a choice by hand. Effort: Small.
  - **C.** Ctrl+Alt with the same key, as VS Code does on Linux. Cost: on
    AltGr keyboards, a key that types a character runs a command instead.
    Effort: Small.
  - **D.** Two-step keys after a first key that is not the palette key, as
    VS Code for the Web does on Windows with Ctrl+K and then N. Cost: a
    waiting state in the listener and the recorder. Effort: Large.
  - **E.** No default key on Windows and Linux for these commands. The
    person sets one. Effort: Small.
- **Left out:** Alt with the same key, because Alt with Left or Right is
  Back and Forward on Windows and Linux, and Firefox opens its menus on Alt
  with a letter. The function keys, because browsers use many of them and
  the free ones are too few. Separate tables for Windows and for Linux,
  because both need the same family.
- **Wider fix:** None. This is a design question, not a class of defect.
- **Previous examples:** VS Code for the Web uses Ctrl+K and then N on
  Windows for a new file, to avoid AltGr.
- **Related:** Decision 181 gives the second keys that this decision
  places on Windows and Linux. Decision 183 D keeps Alt+Shift+↑ and
  Alt+Shift+↓ away from the row move.
- **Recommendation:** A. No key types a character, and Firefox's menus need
  Alt without Shift. The options check found three costs:
  - ⌥⌘T and ⌥⇧⌘T both become Alt+Shift+T, so one needs a key chosen by
    hand.
  - Alt+Shift+↑ and Alt+Shift+↓ land on the row move, unless decision 183
    takes D.
  - The Orca screen reader on Linux uses Alt+Shift with Left and Right, the
    twins of ⌥⌘← and ⌥⌘→.

  Under B, Ctrl+Shift with Left or Right selects a word, so its arrow keys
  do not run from the message field.
- **Action:** ask the user, because no key family is clearly best.

## Design

### Commands and default keys

Agent call, 2026-11-08: keys go only to what Conductive already does, its
controls, and the moves between the tabs, workspaces, and orgs that it
shows. Conductor's keys for missing features stay out, such as the theme,
zen mode, the pull request actions, queues, plan mode, and search in the
chat. Reason: decision 144 set this rule for the palette.

Agent call, 2026-11-08: the defaults copy Conductor's keys. A command
without a Conductor key starts with no key, and the person can give it
one: Go to All files, Checks, Preview, and Desktop, New section, Session
history, and Create org.

"Kept" names the browsers that keep a key in a normal tab. "Second key"
is the key of decision 181 that a browser tab lets through.

| Group | Command | Mac keys | Where |
| --- | --- | --- | --- |
| General | Command palette | ⌘K | Every page |
| General | Keyboard shortcuts | ⌥⌘/ | Every page |
| General | Account page | ⌘, | Every page |
| View | Hide or show the sidebar | ⌘B | Mac app |
| View | Hide or show the right column | ⌥⌘B | Workspace, after PR #79 merges |
| Navigation | Back, Forward | ⌘[, ⌘] | Mac app |
| Navigation | Workspace list | ⇧⌘H | Org pages |
| Navigation | Previous tab | ⌃⇧Tab, ⇧⌘[, ⌥⌘← (all kept), second key ⌥⌘[ | Workspace |
| Navigation | Next tab | ⌃Tab, ⇧⌘], ⌥⌘→ (all kept), second key ⌥⌘] | Workspace |
| Navigation | Close tab | ⌘W (kept), second key ⌥⌘W | Workspace |
| Navigation | Reopen the last closed session | ⇧⌘T (kept in Chrome), second key ⌥⇧⌘T | Workspace |
| Navigation | Org 1 to 9 | ⌃1 to ⌃9 | Every page |
| Navigation | Repositories settings | ⌥⌘A | Org pages, admins |
| Workspace | New workspace | ⌘N (kept), second key ⌥⌘N | Org pages |
| Workspace | Archive workspace | ⇧⌘A | Workspace, owner and admins |
| Workspace | Workspace 1 to 9 | ⌘1 to ⌘9, see decision 182 | Org pages |
| Workspace | Previous, next workspace | ⌥⌘↑, ⌥⌘↓ (kept in Firefox), second key in Milestone 1 | Org pages |
| Workspace | Next workspace that needs input | ⌥⌘L | Org pages |
| Workspace | Go to Changes | ⌥⌘U | Workspace |
| Workspace | Go to Terminal | ⌘J | Workspace |
| Chat | New session | ⌘T (kept), second key ⌥⌘T | Workspace |
| Chat | Focus the message field | ⌘L (kept in Safari), second key in Milestone 1 | Workspace |
| Chat | Attach files | ⌘U | Workspace |
| Chat | Model picker | ⌘/ | Workspace |
| Chat | Next effort level | ⇧⌘/ | Workspace |
| Chat | Stop the turn | ⇧⌘⌫ | Workspace |

Fixed shortcuts, which show in the list with "Fixed shortcut":

- Enter sends and Shift+Enter adds a line (decision 143).
- Escape closes a dialog, a menu, or the palette.
- Up, Down, Home, End, and Enter in menus and in the palette. Left and
  Right on the palette tabs.
- Enter saves and Escape cancels a rename.
- On a focused workspace row, Alt with Up or Down moves the row. On a
  focused divider, the arrows, Home, and End move it. Decision 183 sets
  their modifiers.
- The text keys: ⌘C, ⌘V, ⌘X, ⌘A, ⌘Z, and ⇧⌘Z, and in the Mac app also
  ⌥⇧⌘V, from its Edit menu.
- In the Mac app only: the menu keys ⌘Q, ⌘H, ⌥⌘H, ⌘M, ⌘R, ⇧⌘R, ⌘0,
  ⌘+, ⌘-, ⌃⌘F, and ⌥⌘I.
- The tab menu key ⇧F10, if the tab drag change
  (`calummoore/tab-drag-and-drop`) merges first.

Decision 184 sets the Windows and Linux keys. Ctrl takes the place of ⌘
in each case.

Agent call, 2026-11-09: the second keys of decision 181 on a Mac are ⌥⌘N,
⌥⌘T, ⌥⌘W, ⌥⇧⌘T, ⌥⌘[, and ⌥⌘]. Milestone 1 chooses the second keys of
Previous workspace, Next workspace, and Focus the message field. It checks
each key against the kept keys of Chrome, Edge, Firefox, and Safari, and
against the keys that macOS takes first, such as ⇧⌘/ for the Help menu.

### Where a key goes

Agent calls, 2026-11-08, from the palette rules:

- A key runs its command only where the page offers that command, and it
  does what the control of the page does. The palette's offers give both.
- A key does nothing while a dialog or a sheet of another owner is open.
  An open menu closes first. A menu that refuses to close keeps the key.
- The terminal keeps every key with Ctrl and without ⌘, also ⌃ keys on a
  Mac, as it keeps Ctrl+K today. Shells use these keys. On a Mac, ⌘ keys
  go to the app also from the terminal.
- A port preview or the live desktop keeps every key while it has the
  focus, because it comes from another origin.
- Keys also work in a text field, except the keys that the system uses to
  edit or move in text. Examples: ⌘A, ⌘C, ⌘V, ⌘X, ⌘Z, ⇧⌘Z, ⌥⌫, an arrow
  with ⌘, ⌥, or ⇧, or with ⇧ and one of them, and ⌃A, ⌃E, ⌃K, and ⌃T on
  a Mac. An arrow with both ⌘ and ⌥ is not a text key. A key without ⌘,
  Ctrl, or Alt runs only outside text fields. On a Mac, a key with ⌥ and
  without ⌘ or ⌃ also runs only outside text fields, because it types a
  character, such as ¡ for ⌥1.
- A held key acts once. A key during text composition goes to the text.
- The browser's own action does not run for a key that runs a command.
- In a browser tab, Back and Forward stay with the browser. Only the Mac
  app has their buttons.

Agent call, 2026-11-08: no key allows or denies a Mac command. Reason: a
stray key must never run a command on the person's Mac (decision 62).

Agent call, 2026-11-09: a key without ⌥ matches by the character that it
types. A key with ⌥, and a digit, match by the physical key. Reason: on a
Mac, ⌥ changes the character, so ⌥⌘N gives "Dead" in Chrome and "~" in
Firefox. French keyboards type digits with Shift. `KeyPress` in
`src/app/services.ts` gets the physical key for this. A punctuation key,
such as ⌘/, can sit elsewhere on another layout, and the person can
record another key.

Agent call, 2026-11-09: the Mac app and a Chrome or Edge installed app
give the page every key. In a normal browser tab, the kept keys come from
a table for each browser: Chromium, Firefox, and Safari. The app tells
the hosts apart by the Mac app's own marker, the display mode of an
installed app, and the browser's name. An unknown browser uses all three
tables.

Decision 183 sets what ⌥⌘↑ and ⌥⌘↓ do on a focused workspace row.

### The Keyboard shortcuts tab

Agent calls, 2026-11-08 and 2026-11-09:

- The Account page gets a third tab, Keyboard shortcuts, at
  `/account/shortcuts`, beside General and Preferences.
- The tab shows in every layout. Reason: the phone layout also serves a
  narrow desktop window, which has a keyboard. This changes the brainstorm
  call that hid the tab on a phone.
- The key hints outside the tab hide in the phone layout, as the palette's
  Search row does.
- The tab groups the commands as Conductor does: General, View,
  Navigation, Workspace, and Chat. Each row shows its keys.
- A press on a key, or on Add key, records the next key. Escape cancels
  the recording. Each change saves at once, as Preferences does.
- A command holds at most four keys.
- A changed row shows Reset. The tab has Reset all, for the keyboard of
  this device.
- When a recorded key belongs to another command that can run in the same
  place, the row names that command and offers Replace. Replace moves the
  key in one save.
- The recorder does not take a fixed key. The row says which fixed key it
  is.
- In a browser tab, a kept key shows as kept, with one line that names
  where it works: the Mac app, and in Chrome and Edge also the installed
  app. Firefox has no installed app on a Mac.
- A failed save shows its error on the row. The row keeps the saved keys.
- The palette's Settings tab gets a Keyboard shortcuts row, and ⌘⌥/ opens
  the tab.
- The palette rows, the Search row, and the tooltips show the person's
  key of each command.

### Storage

Agent calls, 2026-11-09:

- A new D1 table holds one row for each changed command, for each person
  and each keyboard: Mac, or Windows and Linux. Reason: ⌘ and Ctrl
  differ, as VS Code keeps its keys apart by platform.
- An empty key list in a row means that the person removed every key.
- The account reply carries the changes of both keyboards.
- One write route takes a list of changes for one keyboard and saves them
  in one batch. So Replace and Reset all never save half.
- The Worker checks each command, each key, and the size of the list.
  It rejects a fixed key.
- The Worker skips a stored command that the app no longer has.
- Another open tab of the person sees a change at its next account read.
- The rows go with the account when the person deletes it.

### Code

- `src/shared/` gets the command ids, the key text, and the request and
  reply types, so that the Worker can check a change.
- `src/app/shortcuts/` holds the pure model: the commands, the default
  keys, the kept keys, the keymap of a person, the conflicts, and the
  decision for one key press. Node tests cover it.
- `src/shell/shortcuts/` holds the one key listener on `AppServices.onKey`
  and the recorder. The tab lives with the other Account tabs in
  `src/shell/account/`.
- The palette's offers carry the runs of the commands. A key-only command,
  such as Focus the message field, is an offer that the palette does not
  list.

## Milestone 1: Mockups

Tags: mockup

Depends on: the answers to decisions 182, 183, and 184, PR #73 (the
Preferences tab) merged into `main`, and `main` merged into this branch.

The Keyboard shortcuts tab, its states, and the keys in the palette.

- [ ] Fix the key table for each keyboard: the Windows and Linux keys of
      decision 184, the second keys that Milestone 1 chooses, and the keys
      of decision 182. Check each key against the kept keys and the menu
      keys of Chrome, Edge, Firefox, and Safari, and against the keys that
      macOS takes first, from their sources and help pages. Also check
      that Firefox on Linux switches tabs on Alt+1 to Alt+8, and that
      Windows switches the input language on the left Alt with Shift. Run
      Chrome and Firefox where a check needs a browser. Mark each key that
      no source confirms. Record the evidence under
      `.context/keyboard-shortcuts/`.
- [ ] Draw the Keyboard shortcuts tab of the Account page, desktop and
      phone, at `app/account/shortcuts`.
- [ ] Draw its states as sub-pages, with five screens or fewer on each
      page: recording, a conflict with Replace, a browser tab with kept
      keys, a changed row with Reset and a failed save, and the Mac app
      with its fixed menu keys.
- [ ] Draw the palette rows with their keys, and the Search row with the
      person's palette key.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages in light
      and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Write `docs/protocol/keyboard-shortcuts.md`: the commands, the
      fixed keys, where a key goes, the kept keys and the second keys
      (decision 181), the tab (decision 180), and the storage scope.
- [ ] Update `docs/protocol/command-palette.md`: the palette key is a
      shortcut with ⌘K or Ctrl+K as its default, and the rows show the
      keys. Remove "Only the palette has a key" and the rejection of keys
      for other commands.
- [ ] Update `docs/protocol/desktop-app.md`: the page hears each key
      first, and the menu keys are fixed.
- [ ] Add the doc to the protocol lists of `docs/architecture.md` and
      `README.md`.
- [ ] Read both legal pages in full. Confirm that "settings that you and
      your team make" covers the stored keys, or update the sentence.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: The key model

Depends on: 2

- [ ] Add the shared command ids, the key text, and the request and reply
      types under `src/shared/`.
- [ ] Add the model under `src/app/shortcuts/`: the commands, the
      defaults for each keyboard, the kept keys of each browser, the
      keymap of a person, the conflicts, and the decision for one key
      press.
- [ ] Add the host to `AppServices`: the Mac app, an installed app, or a
      browser tab with its browser. Add the physical key to `KeyPress`.
- [ ] Node tests: the decision for a key press, the keymap with changes,
      the conflicts, and the kept keys. Name the break that each test
      catches.

## Milestone 4: Storage on the Worker

Depends on: 2

- [ ] Add the migration of the shortcut table, with a free prefix after
      the newest migration on `main`, and its line in
      `migrations/README.md`.
- [ ] Add the write route and the changes in the account reply. Check the
      commands, the keys, and the sizes.
- [ ] Add the route to the dev fake routes and to the test fakes.
- [ ] Add a case to the existing account isolation test: one person's
      changes never reach another person's reply.
- [ ] Worker tests: a list with one wrong change saves nothing, and a
      fixed key is rejected.

## Milestone 5: Keys in the app

Tags: ui

Depends on: 1, 3

- [ ] Add the shortcut listener on `AppServices.onKey`, with the rules of
      "Where a key goes". Move the palette key into it, and move each
      consumer of "Replaced ways". Delete `palette-keys.ts`.
- [ ] Offer each command from the part of the page that owns its control.
      Add the key-only commands as offers that the palette does not list.
- [ ] Apply decision 183 to the row move, the divider, and the keys of
      the workspaces and the tabs.
- [ ] If PR #79 merged, offer its right column toggle with ⌘⌥B.
- [ ] Show the keys in the palette rows, the Search row, the tooltips, and
      `aria-keyshortcuts`. Hide the hints in the phone layout.
- [ ] Happy-dom tests: one key runs its command, a dialog keeps the key,
      the terminal keeps a Ctrl key, and a browser tab skips a kept key.
- [ ] Update `src/app/README.md`, `src/app/screens.md`, and the README of
      each changed area.

## Milestone 6: The Keyboard shortcuts tab

Tags: ui

Depends on: 1, 4, 5

- [ ] Add the tab at `/account/shortcuts` with its groups and rows. List
      the fixed keys too, also those of changes that merged first, such
      as the tab menu key ⇧F10.
- [ ] Add the recorder, Replace, Reset, Reset all, the kept-key line, and
      the save errors. Save through the account model.
- [ ] Apply the person's changes to the keymap from the account reply.
- [ ] Add the Keyboard shortcuts row to the palette's Settings tab.
- [ ] Happy-dom tests: a recorded key saves and runs, Replace moves a key,
      and Reset brings back the default.
- [ ] Smoke-test in Chrome on desktop and phone, in light and dark. Save
      the screenshots under `.context/keyboard-shortcuts/`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
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

- [ ] On a Mac, check in the Mac app that ⌘N, ⌘T, and ⌘W reach the page,
      and that ⌘R still reloads.
- [ ] Check an installed app window in Chrome, and a browser tab in
      Chrome, Firefox, and Safari, on the deployed app.
