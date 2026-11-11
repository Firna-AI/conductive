# Keyboard shortcuts

Status: Active. On branch `calummoore/keyboard-shortcuts-settings`, pull request #216. Commit `a1a0b63c` deleted this plan; it came back on 2026-11-11 for decision 199 and the correction of two default keys. The pull request deletes it again before it merges, as the `plans` skill says.

Conductive gets keyboard shortcuts like Conductor's, and each person can
change them on a new Keyboard shortcuts tab of the Account page. The keys
run the actions that Conductive already has, with Conductor's keys as the
defaults. A person's changes follow the account to every browser and to
the Mac app (decision 190). Where a normal browser tab keeps Conductor's
key for itself, the command also gets a second default key that the
browser lets through (decision 191). The palette key ⌘K becomes one of
these shortcuts, and the palette rows show the key of each command. The
change adds no new feature behind a key, such as a theme or a zen mode.
On 2026-11-10 the user answered the last open decisions: 192 = B, 193 =
D, 194 = A, and 195 = E. With the answers the user also set a
requirement: the shortcuts must not take the keys of the terminal or of
the message field. "Where a key goes" applies it. The key research of
Milestone 1 raised decisions 196 and 197 about Linux, and the
implementation raised decision 198 about the palette. On 2026-11-10 the
user chose the recommendation of each: 196 = B with D, 197 = D, and 198 =
C. Milestones 1, 2, 3, and 9 apply them. On 2026-11-11 the user asked
whether the defaults are Conductor's keys. Two keys differed by mistake,
and Milestone 12 fixes them. The user also chose decision 199 C: the
features that `main` added after the plan get keys in this pull request.
Milestones 13 to 15 apply it.

On 2026-11-09 this plan's decisions moved from 180 to 184 to 190 to 194,
because `main` uses 181, 182, 184, and 185 for the workspace titles of PR
#87. The user answered decisions 190 and 191 by their item numbers 1 and
2, so the answers stay.

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

### Decision 190: Where a person's shortcut changes live

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
- **Related:** Decision 191 sets the defaults that this editor changes.
- **Recommendation:** A. The keys work the same everywhere, and the
  architecture rule stays. The options check kept A, also because the
  Preferences change (PR #73) rejected browser storage for an Account
  setting.
- **Action:** ask the user, because A and B trade the keys on every device
  against a day of work and a change of an architecture rule.
- **Answer:** A, chosen by the user on 2026-11-09.

### Decision 191: Default keys where a browser tab keeps Conductor's key

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
- **Related:** Decision 190. Its editor can replace each of these
  defaults.
- **Recommendation:** G, changed from B by the options check. G keeps B,
  and B as first written misses ⌘L in Safari and the tab keys of Firefox.
- **Action:** ask the user, because each option trades Conductor's keys
  against one key set for every host.
- **Answer:** B, chosen by the user on 2026-11-09, before the check added
  D to G. Agent call, 2026-11-09: this plan applies B to the kept keys of
  each supported browser, which is G. Reason: B's reason is a working key
  in every browser tab, and only G gives it in Firefox and Safari.

### Decision 192: The browser's own keys in a browser tab

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
    1 to 9 and Focus the message field use second keys, as decision 191
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
    Focus the message field keeps its second key from decision 191. Cost:
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
- **Related:** Decision 191 gives the second keys.
- **Recommendation:** B. Tab switching and the address bar are the browser
  keys that people use most. ⌘L costs the most: after ⌘L, an address that
  the person types and sends goes to the agent. The other browser keys
  cost little, and the person can remove any key. F best protects the
  codebase, and it goes with B.
- **Action:** ask the user, because each option trades Conductor's keys
  against the browser's keys, and no option is clearly best.
- **Answer:** B, chosen by the user on 2026-11-10.

### Decision 193: Arrow keys of a focused workspace row or divider

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
- **Answer:** D, chosen by the user on 2026-11-10. This approves the
  change of the row move and the divider keys on `main`.

### Decision 194: The keys of Windows and Linux

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
  191, have no clear twin on Windows and Linux.
- **Impact if no action:** Milestone 1 cannot fix the Windows and Linux
  keys.
- **Root question:** Which default key does each command get on a Windows
  or Linux keyboard, so that the key reaches the page and types no
  character? The options check wrote this question, because one key table
  holds all three cases. Decision 192 also sets the Ctrl twins of the
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
- **Related:** Decision 191 gives the second keys that this decision
  places on Windows and Linux. Decision 193 D keeps Alt+Shift+↑ and
  Alt+Shift+↓ away from the row move.
- **Recommendation:** A. No key types a character, and Firefox's menus need
  Alt without Shift. The options check found three costs:
  - ⌥⌘T and ⌥⇧⌘T both become Alt+Shift+T, so one needs a key chosen by
    hand.
  - Alt+Shift+↑ and Alt+Shift+↓ land on the row move, unless decision 193
    takes D.
  - The Orca screen reader on Linux uses Alt+Shift with Left and Right, the
    twins of ⌥⌘← and ⌥⌘→.

  Under B, Ctrl+Shift with Left or Right selects a word, so its arrow keys
  do not run from the message field.
- **Action:** ask the user, because no key family is clearly best.
- **Answer:** A, chosen by the user on 2026-11-10. Milestone 1 chooses the
  keys of the clashes by hand.

### Decision 195: Finding one command on the Keyboard shortcuts tab

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Mockup.
- **Location:** `docs/mockups/src/components/settings/ShortcutsSections.tsx`
- **Background:** The Mac app mockup of the tab lists about 50 commands
  that a person can change and more than 25 fixed keys, in eight groups.
  The tab is about 3,500 px high in the Mac window. The first view shows
  General, View, and the start of Navigation. The plan gives the tab no
  search.
- **Problem:** To find one command, such as Go to Checks, a person scrolls
  through most of the list.
- **Impact if no action:** Finding a command is slow, mostly in the long
  Workspace group.
- **Root question:** How does a person reach the row of one command
  quickly?
- **Options:**
  - **A.** A search field at the top of the tab. It filters the rows by
    their words and by their keys, as the Repositories tab filters its
    list. Cost: a field, an empty result line, a mockup screen, a protocol
    line, and a test. A search by keys also needs a way to enter a key,
    because a text field cannot type ⌘ or ⌥. Effort: Medium.
  - **B.** Each group can collapse, as the sections of the workspace list
    do. Cost: the state of each group, and a mockup screen. Effort: Medium.
  - **C.** Change nothing. The person scrolls, or uses the browser's own
    find. The Mac app has no find, because its Edit menu has none. Effort:
    Small.
  - **D.** Added by the options check. A row of links to the groups at the
    top of the tab. A link scrolls to its group. The person must know the
    group of the command. Effort: Small.
  - **E.** Added by the options check. A search field as in A, but it
    matches only the words of a row, its label and its search words, with
    the palette's matcher. So the two searches of the app agree. A person
    cannot find a command by its key. The conflict line already names the
    command that uses a recorded key. Effort: Medium.
  - **F.** Added by the options check. The palette's Settings tab finds
    each command by its words, shows its first key, and opens the tab with
    that row in view. Cost: a new kind of settings row, a link to one row,
    two mockup screens, and a change of the palette's Settings rules. A
    query such as "workspace" adds many rows beside the actions. Effort:
    Medium.
- **Left out:** A fold of the nine org rows and the nine workspace rows,
  because alone it fails the goal. Most rows stay, and Go to Checks moves
  up only a little. A fold can join B, D, or E later.
- **Wider fix:** None. This is a design question, not a class of defect.
- **Previous examples:** `RepositoryList` filters a long list with a search
  field. Conductor's settings have Search settings, and VS Code's
  Keyboard Shortcuts editor searches by words and by keys.
- **Recommendation:** E, changed from A by the options check. E finds the
  row with the palette's own matcher, and it drops A's search by keys,
  which has no clear way to enter a key.
- **Action:** ask the user, because A adds behaviour that no requirement
  covers.
- **Answer:** E, chosen by the user on 2026-11-10.

### Decision 196: Org keys in a Linux browser tab

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** On Linux, Chrome and Firefox select tab 1 to 8 on Alt+1
  to Alt+8, and the last tab on Alt+9. The page gets these keys first and
  can stop them, as a live check in Chrome and Firefox on Linux showed.
  Windows browsers have no Alt+digit keys. Firefox on Linux has no action
  on Ctrl+1 to Ctrl+9.
- **Problem:** Decision 194 A gives Alt+1 to Alt+9 to Switch to org 1 to
  9. Decision 192 B leaves the browser its tab keys in a tab, but it names
  only ⌘1 to ⌘9 and Ctrl+1 to Ctrl+9.
- **Impact if no action:** In a Linux browser tab, a person cannot switch
  browser tabs with Alt+1 to Alt+9 while Conductive has the focus.
- **Root question:** In a Linux browser tab, which tab keys stay with the
  browser, and which key does each command get when it loses its key
  there? The options check wrote this question. The first one took it as
  given that the browser keeps Alt+1 to Alt+9, and it missed that Firefox
  on Linux has no action on Ctrl+1 to Ctrl+9.
- **Options:**
  - **A.** Keep both decisions as written. Linux tabs lose the Alt+digit
    tab keys. Effort: Small.
  - **B.** In a Linux browser tab, leave Alt+1 to Alt+9 to the browser.
    Switch to org 1 to 9 has no default key there. An installed app keeps
    Alt+1 to Alt+9. The model tells Linux from Windows by the browser's
    user agent. Effort: Small.
  - **C.** As B, and give Switch to org 1 to 9 the second keys Ctrl+Alt+1
    to Ctrl+Alt+9 on Linux only. In the live check, Chrome and Firefox have
    no action on Ctrl+Alt+1, 3, 5, and 9, and edit no text. The sources
    cover the other five. GNOME, KDE, and Orca have no default on them. On
    Windows, Ctrl+Alt types the characters of AltGr, so these keys stay
    Linux only. Windows and Linux share one stored keyboard, so C also
    needs a rule for a changed org row that carries these keys to Windows.
    Effort: Medium.
  - **D.** Added by the options check. It goes with B, C, or E. Decision
    192 B leaves to each browser the keys that it uses on that system to
    select a tab or open its address bar. The table of kept keys of each
    browser holds this list too. On Linux and Android, Chrome and Edge use
    Ctrl+1 to Ctrl+9 and Alt+1 to Alt+9, and Firefox uses only Alt+1 to
    Alt+9. So Open workspace 1 to 9 keeps Ctrl+1 to Ctrl+9 in Firefox on
    Linux. Cost: one more list in each browser table, and its tests.
    Effort: Small.
  - **E.** Added by the options check. Switch to org 1 to 9 moves to
    Ctrl+Shift+1 to Ctrl+Shift+9 on Windows and Linux, in every host. No
    default then uses Alt+1 to Alt+9. Cost: the org keys change on Windows
    too, no live check has run, Windows lets a person set Ctrl+Shift with a
    digit as the key of one input language, and the Linux layout switch on
    Ctrl+Shift turns these keys into Ctrl+1 to Ctrl+9. Effort: Medium.
- **Left out:** A change on Windows for its own sake, because Windows
  browsers have no Alt+digit keys. The installed app, because its window
  has no browser tabs.
- **Wider fix:** D. One table of the tab keys of each browser sets what
  192 B leaves to the browser, also for a browser with other tab keys.
- **Previous examples:** Decision 192, for ⌘1 to ⌘9 and ⌘L.
- **Related:** Decision 197. With the Linux layout switch on Alt+Shift,
  Alt+Shift+1 to 9 arrive as Alt+1 to 9.
- **Recommendation:** B with D. The browser keeps its tab keys, no default
  key exists for only one system, and the palette's Switch to rows still
  reach each org from the keyboard. The options check recommended C with
  D, because in 192 the user chose second keys over no key. B with D best
  protects the codebase.
- **Action:** ask the user, because decisions 192 and 194 conflict on
  Linux, and no rule settles which one wins.
- **Answer:** B with D, the recommendation, chosen by the user on
  2026-11-10.

### Decision 197: The Linux layout switch on Alt+Shift

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** None.
- **Terms:**
  - **XKB:** the keyboard layout system of Linux.
  - **`grp:alt_shift_toggle`:** the XKB option that switches the layout on
    Alt+Shift.
- **Background:** The Debian, Ubuntu, and Fedora installers turn on
  `grp:alt_shift_toggle` when a person picks two layouts, such as English
  and Russian. XKB switches the layout as the second modifier goes down,
  and that modifier never becomes active. Chromium reports that key as
  "GroupNext".
- **Problem:** For these people, an Alt+Shift shortcut of decision 194 A
  arrives as another key. Alt+Shift+1 arrives as Alt+1, which runs Switch
  to org 1. Alt+Shift+← arrives as Alt+←, which is the browser's Back.
  Alt+Shift+↑ arrives as Alt+↑, which moves a focused workspace row. When
  Shift goes down first, the press types a character of the other layout
  into the message field.
- **Impact if no action:** These people run the wrong command, or leave
  the page, when they press a shortcut that the tab shows.
- **Root question:** When the Linux layout switch takes one modifier of a
  shortcut, how does the app stop the wrong action, and how does the
  person still reach the command? The options check wrote this question,
  because the first one asked only about the harm.
- **Options:**
  - **A.** Change nothing, and name the cost in the protocol doc. Effort:
    Small.
  - **B.** While a layout switch key is down, no shortcut runs, and the
    browser's own action of the key does not run either. Cost: one rule in
    the model and its tests. Whether Firefox reports "GroupNext" is not
    confirmed. These people still record other keys for the Alt+Shift
    commands. Effort: Small.
  - **C.** Give Linux its own key family without Alt+Shift. Cost: a third
    keyboard in storage and on the tab. Effort: Large.
  - **D.** Added by the options check. Run the shortcut that the person
    pressed. While a layout switch key is down, the model adds back the
    modifier that the switch key took, and it matches the press by its
    physical key, because the character comes from the other layout. So
    Alt+Shift+1 runs Open workspace 1, in either order of the modifiers. A
    press that then matches no command goes no further, as in B. Each
    press still switches the layout, and the page cannot stop that. Cost:
    the rule of B, the key-up of the switch key, a reset when the window
    loses the focus, and their tests. Effort: Medium.
  - **E.** Added by the options check. It goes with B or D. The first such
    press in a session shows one toast that says that Alt+Shift also
    switches the layout, with a link to the Keyboard shortcuts tab. Cost:
    the copy, a toast and its mockup, and tests. Effort: Medium.
  - **F.** Added by the options check. Linux gets second keys without
    Alt+Shift, such as Ctrl+Alt with the same key. Cost: more than 20 keys
    to choose and check, desktop keys on Ctrl+Alt, a clash with 196 C, and
    the same harm from the Ctrl+Alt layout switch. Effort: Large.
- **Left out:** Reading the XKB option, because a web page cannot read it.
  Moving only the keys whose Alt form runs something, because a press
  with Shift first still types a character.
- **Wider fix:** D, or B, with a rule that matches each name of a layout
  switch key: GroupNext, GroupPrevious, GroupFirst, and GroupLast. Then it
  also covers the Ctrl+Shift and Ctrl+Alt switches.
- **Previous examples:** None found.
- **Related:** Decision 196.
- **Recommendation:** D, changed from B by the options check. D stops the
  same wrong commands and lost pages as B, and the keys on the tab also
  work for these people.
- **Action:** ask the user, because B adds behaviour at the key boundary
  that no requirement covers.
- **Answer:** D, the recommendation, chosen by the user on 2026-11-10.

### Decision 198: The place of This Mac in the palette's Account group

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Mockup.
- **Location:** `src/app/palette/commands.ts` (`accountSettingIds`) and the
  mockup page `mac-app/command-palette`.
- **Background:** The palette's Settings tab lists the sections of the
  Account page in its Account group. In the Mac app the group also holds
  This Mac. On `main`, the app lists This Mac after New workspaces. This
  plan's mockup `mac-app/command-palette` draws This Mac after Sign-in, in
  the order of the General tab, where This Mac follows Sign-in.
- **Problem:** The mockup and the app put This Mac in different places.
  The protocol says only that the group holds This Mac in the Mac app, and
  that Keyboard shortcuts ends the group.
- **Impact if no action:** The mockup and the product disagree on one
  row.
- **Root question:** Which rule orders the rows of the palette's Account
  group, in a browser and in the Mac app, so that the app, the mockup, and
  the protocol agree, also for a row that only one host shows? The options
  check wrote this question, because no rule sets the order today.
- **Options:**
  - **A.** After Sign-in, as the General tab orders its sections. This
    changes one list and one test of the app. Effort: Small.
  - **B.** After New workspaces, as `main` has it. This changes the
    mockup. Effort: Small.
  - **C.** Added by the options check. A, and the rule in the Settings
    section of `docs/protocol/command-palette.md`: the Account group lists
    its rows in the order of the Account page, tab by tab, and in each tab
    in the order of its sections. A row of one host at the end of the group
    was rejected, because the group then leaves the order of the page.
    Cost: the list, its test, and two protocol sentences. Effort: Small.
  - **D.** Added by the options check. This Mac after Agents, under the
    rule that the sections of every host come first in each tab. Both the
    app and the mockup change. Effort: Small.
  - **E.** Added by the options check. C, and one list of the Account rows
    in the mockups that both palettes read, with their labels, search
    words, and order, so that the search words agree too. Effort: Medium.
  - **F.** Added by the options check. C, and each package builds its
    Account group from the list that draws its Account page, so the group
    cannot drift from the page. Effort: Medium.
- **Left out:** Change nothing, because the mockup and the product keep
  disagreeing. This Mac first, after GitHub, or after Keyboard shortcuts,
  because no rule gives these places, and Keyboard shortcuts ends the
  group. A group of its own, because each group holds the rows of one
  page.
- **Wider fix:** F. The group then follows the page also for a later
  section.
- **Related:** The mockup gives This Mac the search word "always allow",
  and the app does not. The same answer settles which list wins.
- **Previous examples:** None found.
- **Recommendation:** C, changed from A by the options check. The palette
  then follows the order of the Account page, which the person already
  knows, and the protocol states the rule, so a later row gets one place.
  F best protects the codebase.
- **Action:** ask the user, because the choice decides which side of a
  mismatch between the mockup and the product is right.
- **Answer:** C, the recommendation, chosen by the user on 2026-11-10.
  Agent call of the same day: the mockup wins also for the search words,
  so the app gives This Mac the search word "always allow". Reason: C
  makes the mockup the side that is right.

### Decision 199: Keys for features that came after the plan

- **Severity:** Low. **Effort:** Large.
- **Source:** Implementation, from the user's question of 2026-11-11
  whether the defaults are Conductor's keys.
- **Category:** Docs or spec.
- **Background:** The plan gave keys only to what Conductive did on
  2026-11-08. Since then, `main` added three features that have Conductor
  keys: Copy link on the workspace header (⇧⌘C), Copy transcript in the
  session tab menu (Copy concise transcript ⌥⌘C), and the actions of the
  pull request bar (Create PR ⇧⌘P, Merge PR ⇧⌘M, Open PR ⇧⌘G, Commit and
  push ⇧⌘Y, and Fix errors ⇧⌘X).
- **Problem:** These features have no keyboard shortcut in Conductive.
- **Impact if no action:** People who know Conductor's keys cannot use
  them for these features.
- **Root question:** Do these newer features get keyboard shortcuts, and
  in which change?
- **Options:**
  - **A.** Not in pull request #216. Record a follow-up item, and plan the
    keys as a separate change after #216 merges. Effort: Small.
  - **B.** Add Copy link ⇧⌘C and Copy transcript ⌥⌘C to #216. The pull
    request actions follow later. Effort: Medium.
  - **C.** Add all of them to #216, with keys chosen by hand where a key
    clashes. Effort: Large.
- **Left out:** Taking ⇧⌘L or ⇧⌘R from their current commands, because
  that breaks a browser key and the Mac app's reload.
- **Recommendation:** A, because #216 is already large.
- **Action:** ask the user, because this adds new scope that no decision
  covers.
- **Answer:** C, chosen by the user on 2026-11-11 as item 17.
- **Agent calls of the same day:**
  - Conductor's Pull latest (⇧⌘L) and Start review (⇧⌘R) get no command,
    because Conductive has neither action. So the two clashes that the
    question named do not arise. Address review is not Start review: it
    sends the review comments of GitHub to the agent.
  - Each action of the pull request bar becomes a command, as each palette
    action did (the call of 2026-11-10 for Restore workspace): Create PR,
    Commit and push, Fix checks, Resolve conflicts, Address review, Merge,
    Continue, and Open on GitHub. The bar's Archive button already runs
    Archive workspace. Copy link, Copy concise transcript, and Copy full
    transcript become commands too. A command without a Conductor key
    starts with no key.
  - A key runs a bar action only where the bar shows that action and lets
    a click run it now, and it does what the click does. Reason: the rule
    of "Where a key goes": a key does what the control of the page does.
  - The keys and their checks come from the key research in
    `.context/keyboard-shortcuts/key-table-newer.md`. Where a check fails,
    the key is chosen by hand under decisions 191 G and 194 A, and "Commands
    and default keys" records the call and its reason.

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

Agent call, 2026-11-10, from the fifth merge of `main`: Restore workspace,
which `main` added to the palette, becomes a command without a default
key, in the Workspace group after Archive workspace. It runs where the
palette offers it. Reason: the call above gives each palette action
without a Conductor key a command with no key, so that a key and its
palette row do the same thing.

Agent call, 2026-11-11, from the sixth merge of `main`: Send feedback,
which `main` added to the palette, becomes a command in the General group
after Create org. It runs where the palette offers it, which is each page.
Reason: the same rule as Restore workspace. Correction of the same day,
from the user's question whether the defaults are Conductor's keys:
Conductor gives Send feedback ⌥⌘F, so that is its default key, and
Alt+Shift+F on Windows and Linux. The first call missed Conductor's row.
The same check found that Conductor also toggles the sidebar with a plain
`[` and the right column with a plain `]`, so both join the defaults. A
key without ⌘, Ctrl, or Alt runs only outside text fields and the
terminal.

Decision 199 C, 2026-11-11, adds commands for the features that `main`
added after 2026-11-08: Copy link, Copy concise transcript, Copy full
transcript, and the actions of the pull request bar. So the call above
that left out "the pull request actions" no longer holds for them.

"Kept" names the browsers that keep a key in a normal tab. "Second key"
is the key of decision 191 that a browser tab lets through.

| Group | Command | Mac keys | Where |
| --- | --- | --- | --- |
| General | Command palette | ⌘K | Every page |
| General | Keyboard shortcuts | ⌥⌘/ | Every page |
| General | Account page | ⌘, | Every page |
| General | Send feedback | ⌥⌘F | Every page |
| View | Hide or show the sidebar | ⌘B, `[` | Mac app |
| View | Hide or show the right column | ⌥⌘B, `]` | Workspace |
| Navigation | Back, Forward | ⌘[, ⌘] | Mac app |
| Navigation | Workspace list | ⇧⌘H | Org pages |
| Navigation | Previous tab | ⌃⇧Tab, ⇧⌘[, ⌥⌘← (all kept), second key ⌥⌘[ | Workspace |
| Navigation | Next tab | ⌃Tab, ⇧⌘], ⌥⌘→ (all kept), second key ⌥⌘] | Workspace |
| Navigation | Close tab | ⌘W (kept), second key ⌥⌘W | Workspace |
| Navigation | Reopen closed session | ⇧⌘T (kept in Chrome), second key ⌥⇧⌘T | Workspace |
| Navigation | Switch to org 1 to 9, one row each | ⌃1 to ⌃9 | Every page |
| Navigation | Repositories settings | ⌥⌘A | Org pages, admins |
| Workspace | New workspace | ⌘N (kept), second key ⌥⌘N | Org pages |
| Workspace | Archive workspace | ⇧⌘A | Workspace, owner and admins |
| Workspace | Open workspace 1 to 9, one row each | ⌘1 to ⌘9 (left to the browser in a tab, decision 192), second keys ⌥⌘1 to ⌥⌘9 | Org pages |
| Workspace | Previous, next workspace | ⌥⌘↑, ⌥⌘↓ (kept in Firefox), second keys ⌃⌘↑, ⌃⌘↓ | Org pages |
| Workspace | Next workspace that needs input | ⌥⌘L | Org pages |
| Workspace | Go to Changes | ⌥⌘U | Workspace |
| Workspace | Go to Terminal | ⌘J | Workspace |
| Chat | New session | ⌘T (kept), second key ⌥⌘T | Workspace |
| Chat | Focus the message field | ⌘L (left to the browser in a tab, decision 192), second key ⇧⌘L | Workspace |
| Chat | Attach files | ⌘U | Workspace |
| Chat | Model picker | ⌘/ | Workspace |
| Chat | Next effort level | ⌃⌘/ | Workspace |
| Chat | Stop the agent | ⌃⌘⌫ | Workspace |

Fixed shortcuts, which show in the list with "Fixed shortcut":

- Enter sends and Shift+Enter adds a line (decision 143).
- Escape closes a dialog, a menu, or the palette.
- Up, Down, Home, End, and Enter in menus and in the palette. Left and
  Right on the palette tabs.
- Enter saves and Escape cancels a rename.
- On a focused workspace row, Alt with Up or Down and no other modifier
  moves the row. On a focused divider, Left and Right with no modifier or
  with Shift, Home, and End move it (decision 193 D).
- The text keys of each system, as section 10 of
  `.context/keyboard-shortcuts/key-table.md` lists them: the edit keys,
  such as ⌘C, ⌘V, ⌘X, ⌘A, ⌘Z, and ⇧⌘Z, and in the Mac app also ⌥⇧⌘V,
  from its Edit menu, and the keys that move and delete by word or line.
  Agent call, 2026-11-10, from the user requirement of the same day.
- In the Mac app only: the menu keys ⌘Q, ⌘H, ⌥⌘H, ⌘M, ⌘R, ⇧⌘R, ⌘0,
  ⌘+, ⌘-, ⌃⌘F, and ⌥⌘I.
- The tab menu keys ⇧F10 and the menu key of a keyboard, on a focused
  tab. The tab menu change is on `main`.

Decision 194 sets the Windows and Linux keys. Ctrl takes the place of ⌘
in each case.

Agent call, 2026-11-09: the second keys of decision 191 on a Mac are ⌥⌘N,
⌥⌘T, ⌥⌘W, ⌥⇧⌘T, ⌥⌘[, ⌥⌘], ⌃⌘↑, ⌃⌘↓, and ⇧⌘L. Chrome has no command on
⌥⌘T, ⌥⌘W, ⌥⇧⌘T, ⌥⌘[, ⌥⌘], ⌃⌘↑, or ⌃⌘↓. It uses ⌥⌘N and ⇧⌘L for
features that the page may take. No source confirms Safari's keys.
Milestone 1 also checks each key against the keys that macOS takes first,
such as ⇧⌘/ for the Help menu.

Agent calls of Milestone 1, 2026-11-10, from the key research. The
evidence and the sources are in `.context/keyboard-shortcuts/key-table.md`.

- The second keys of Open workspace 1 to 9 in a Mac browser tab are ⌥⌘1 to
  ⌥⌘9. Reason: Chrome and Firefox have no command on them, and a digit
  matches by its physical key, so ⌥ does no harm. ⌃⌘1 to ⌃⌘9 was the other
  candidate. ⇧⌘L stays the second key of Focus the message field in every
  browser.
- Next effort level becomes ⌃⌘/ on a Mac. Reason: ⇧⌘/ is the macOS key of
  the Help menu, and Chrome, Edge, and the Mac app never give it to the
  page when the system's key file lists it.
- Stop the agent becomes ⌃⌘⌫ on a Mac. Reason: ⇧⌘⌫ deletes to the start of
  the line in a text field, as Firefox's model of macOS says, so it would
  not run from the message field.
- The text keys that the tab and the recorder treat as fixed are the keys
  of section 10 of the evidence. The Text group shows the ones that a
  person could record by mistake.
- The tab menu key ⇧F10 and the menu key of a keyboard, on a focused tab,
  are fixed keys, because the tab menu change is on `main`.

The keys of Windows and Linux follow decision 194 A: Ctrl for ⌘, Shift
stays, Alt+Shift with the same key for a Mac key with ⌥ and for each
second key, and Alt+1 to Alt+9 for the orgs. Agent calls of 2026-11-10
change these keys, because a check failed or two commands clashed:

- Reopen closed session gets the second key Alt+Shift+Z, and New session
  keeps Alt+Shift+T. Reason: New session is used more, and every browser
  keeps Ctrl+T in a tab.
- Focus the message field gets the second key Ctrl+Shift+L, and Next
  workspace that needs input keeps Alt+Shift+L. Reason: Ctrl+Shift+L is the
  plain twin of ⇧⌘L, and no browser keeps it.
- Stop the agent is Alt+Shift+S. Reason: Chrome and Firefox on Linux
  delete to the start of the line on Ctrl+Shift+Backspace.
- Model picker is Alt+Shift+M. Reason: Firefox on Linux selects all text
  on Ctrl+/.
- Previous workspace and Next workspace also get Alt+Shift+PageUp and
  Alt+Shift+PageDown. Reason: the Orca screen reader on Linux takes
  Alt+Shift with the arrows in every mode, so a person who uses Orca has
  no other default key for them.
- Ctrl+U stays the key of Attach files. Firefox on Linux deletes to the
  start of the line on Ctrl+U only in a single-line field, so the model
  treats it as a text key only there.

Corrections from the research: Firefox also opens its menus on Alt+Shift
with a menu letter, and the page can stop it. Chrome keeps Ctrl+Shift+T
only while a closed tab can be reopened. Windows switches the input
language on Alt+Shift only when no third key follows, so Alt+Shift keys
reach the page. On German and French layouts, [ and ] need AltGr, so the
bracket keys of the tabs cannot be pressed there, and the arrow keys stay.
Decisions 196 and 197 hold the two Linux questions that the research
found.

User answer of 2026-11-10 to decision 196, B with D: in a normal tab,
decision 192 B leaves to each browser the keys that it uses on its system
to select a tab or to open its address bar. The table of each browser
holds this list:

- Chrome and Edge: ⌘1 to ⌘9 and ⌘L on a Mac, Ctrl+1 to Ctrl+9 and Ctrl+L
  on Windows, and Ctrl+1 to Ctrl+9, Alt+1 to Alt+9, and Ctrl+L on Linux
  and Android.
- Firefox: the same keys, except Ctrl+1 to Ctrl+9 on Linux and Android,
  which Firefox does not use there.
- Safari already keeps ⌘1 to ⌘9 and ⌘L.

So in a normal tab on Linux, Switch to org 1 to 9 has no default key that
works, and the tab dims Alt+1 to Alt+9. In Firefox on Linux, Open
workspace 1 to 9 keep Ctrl+1 to Ctrl+9. An installed app takes Alt+1 to
Alt+9. The palette's Switch to rows still reach each org.

Agent call, 2026-11-10: an unknown browser leaves to the browser the keys
of each supported browser on its system, and an unknown system on the
Windows and Linux keyboard counts as Windows and as Linux. Reason: an
unknown browser already counts the kept keys of each supported browser,
and a missed tab key would take a key of the browser from the person.
Agent call of the same day, from the docs work: this holds for every rule
that differs between Windows and Linux, also the text keys and the
single-line Ctrl+U text key, which before held only on Linux. Android
counts as Linux.

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

Agent call, 2026-11-10, from the options check: a letter or digit key
whose character is not a Latin letter or a digit, as on a Cyrillic or a
Greek layout, matches by its physical key. Reason: on Windows and Linux,
Ctrl+K arrives as Ctrl+л on a Russian layout, so every letter shortcut,
also the palette key on `main`, would fail there.

Agent call, 2026-11-09: the Mac app and a Chrome or Edge installed app
give the page every key. In a normal browser tab, the kept keys come from
a table for each browser: Chromium, Firefox, and Safari. The app tells
the hosts apart by the Mac app's own marker, the display mode of an
installed app, and the browser's name. An unknown browser uses all three
tables.

Decision 193 sets what ⌥⌘↑ and ⌥⌘↓ do on a focused workspace row.
The user chose D: the row move takes Alt with Up or Down and no other
modifier, and the divider takes the arrows with no modifier or with
Shift, through the matcher of the model. The list shows them as fixed.

Agent calls, 2026-11-10, from the questions of Milestone 2:

- Each keyboard has one list of fixed keys, the same in every host and on
  every system. The Mac list holds the keys of the menus of the Mac app
  also in a browser. The Windows and Linux list holds the text keys of
  both systems. Reason: the Worker knows only the keyboard, and a key
  recorded in a browser also applies in the Mac app, where ⌘R must still
  reload.
- Open workspace 1 to 9, and Previous and Next workspace, count only the
  rows that the workspace list shows. Reason: a key does what the control
  of the page does, and a hidden row has no control.
- A key that steps through a list wraps at its end. Reason: the menus of
  the app and the tabs of the palette wrap.
- A command that the palette lists runs where the palette offers it, so
  New workspace also runs from the Account page, and Repositories
  settings runs for each member who sees it in the palette. Reason: "The
  palette's offers give both."

User requirement, 2026-11-10: "make sure we don't clobber things like the
terminal or chat input". Agent calls of the same day apply it:

- The terminal keeps every key that a program in it can read. On a Mac,
  only keys with ⌘ go to the app from the terminal. On Windows and Linux,
  the terminal keeps every key with Ctrl or Alt, so no shortcut runs
  while it has the focus. Reason: shells read Alt keys too, such as Alt+B,
  Alt+F, and Alt+1 for a count, and readline reads Alt+Shift with a
  letter as Alt with that letter. So the Alt+Shift keys of decision 194
  and Alt+1 to Alt+9 stay with the terminal. This replaces the rule above
  that the terminal keeps only the keys with Ctrl.
- A key that runs a command goes no further. The listener stops the
  browser's own action, and it stops the press before an element of the
  page hears it. Reason: the message field and the terminal act on keys
  after the listener. For example, the message field deletes a line on
  ⌘⌫ and formats text on ⌘U, and the terminal sends each key to the
  shell. `KeyPress` gets a way to stop the press.
- Each default key is checked against the keys that the text fields use
  on each system, and against the keys that a shell reads. A default key
  that is a text key on one system gets another key there. Milestone 1
  records the check.
- The recorder treats the text keys of the system as fixed keys, as the
  Text group lists them.
- The tab says once which keys the terminal keeps.
- User answers of 2026-11-10 to review items 4 and 10 (the findings file
  of the branch holds them, with their options):
  - Item 4 = B: Enter with any modifier, the keypad Enter, and plain Space
    are fixed keys on both keyboards, because they press or choose a
    focused control and send or add a line in the message field. The
    recorder refuses them, the Worker rejects them, and the account reply
    drops a stored one.
  - Item 10 = B: a keypad key records as the key that it types, except a
    keypad digit, which stays a key of the keypad. Each press then has one
    key text, so the conflict check, Replace, Reset, and the fixed check
    compare exact keys. The recorder refuses the keypad twins of fixed
    keys, and the Worker refuses the other keypad names.
- Agent calls of 2026-11-10, from review round 1, findings 1 and 2: on
  Windows and Linux the terminal keeps every key, also a key that a person
  records without Ctrl or Alt, such as P or F2; this replaces "every key
  with Ctrl or Alt" above. In a text field, Enter with any modifier and
  the keypad Enter stay with the field, because the message field sends on
  ⌘Enter, Ctrl+Enter, and Alt+Enter, and a rename saves on each Enter.
  Making every Enter key a fixed key waited for the user, because it adds
  a rejection; the user answered it as review item 4 = B, above.

User answer of 2026-11-10 to decision 197, D: while a layout switch key is
down, the app adds back the modifier that the switch key took, and it
matches the press by its physical key. A press that then runs no command
goes no further. Agent calls of the same day apply it:

- A layout switch key is a press that the browser reports as GroupNext,
  GroupPrevious, GroupFirst, or GroupLast. Its physical key names the
  modifier that it took: Shift, Alt, Ctrl, or ⌘. Another physical key,
  such as Caps Lock, takes no modifier. Reason: the wider fix of the
  decision, which also covers the Ctrl+Shift and Ctrl+Alt switches.
- The switch key stays down until the key-up of its physical key, or
  until the window loses the focus. Reason: a key-up while another window
  has the focus never reaches the page.
- While a switch key is down, each key matches by its physical key, also
  a letter, a digit, or a punctuation key. Reason: the character comes
  from the other layout.
- The press of the switch key itself goes on untouched.
- The terminal still keeps its keys, the recorder still gets the press,
  and text composition still gets its key. Reason: the user requirement
  of 2026-11-10; on Windows and Linux the terminal keeps every key.
- In a text field, a press that runs no command goes no further, also a
  text key. Reason: the switch turns one text key into another, such as
  Ctrl+Shift+Z into Ctrl+Z, which undoes in place of redoing.
- The recorder records the key with the modifier added back. Reason: the
  person pressed that key, and the listener matches it the same way.
- Agent call, 2026-11-10, from the docs work of the answers: the restore,
  the physical match, and the stop apply only to a press that has Ctrl,
  Alt, or ⌘ after the restore. Every other press goes on as it does
  without a switch key, and types its character. The recorder follows the
  same rule. Reason: a fast typist presses the next letter before the
  switch key is up, such as after Caps Lock or with Shift still down after
  Alt+Shift, and the user requirement of 2026-11-10 keeps the keys of the
  message field. Each harmful press has Ctrl, Alt, or ⌘. A stop of every
  press was rejected, because it lost typed letters.

### The Keyboard shortcuts tab

Agent calls of Milestone 1, 2026-11-09:

- The Mac app pages come first, because no open decision changes what the
  Mac app shows. The browser and phone pages wait for decisions 192 and
  194. Until then, only the Mac app shows the third Account tab.
- Agent call, 2026-11-10: with decisions 192 and 194 answered, the
  browser and phone pages get the tab too. Decision 195 E adds a search
  field at the top of the tab in every host. It filters the rows by their
  labels and their search words with the palette's matcher, and a search
  without a match says so.
- The copy of the tab: "Select a shortcut to change it." as the intro,
  "Add shortcut" on a row with no key, "Press the keys" in the recorder,
  "Hide Conductive always uses ⌘H." for a refused fixed key, "Model picker
  uses ⌘/." for a conflict with Replace and Cancel, and "⇧⌘P wasn't saved.
  Try again." for a failed save.
- Labels follow the words of the app and of macOS: Stop the agent, Switch
  to org 1, Open workspace 1, Reopen closed session, Quit Conductive, and
  Hide Conductive.
- In each group, the fixed rows come after the rows that a person can
  change. The groups Text and Mac app hold only fixed keys, close the
  list, and say once that their keys are fixed.
- The key chips use Inter, which draws ⌘ on every system. Enter, Esc, and
  Tab show as words.
- A palette row shows the first key of its command. Workspace rows show no
  key, because the palette orders them by activity, not by their place in
  the list.

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
- A press on a key, or on Add shortcut, records the next key. Escape cancels
  the recording. Each change saves at once, as Preferences does.
- A command holds at most four keys.
- A changed row shows Reset. The tab has Reset all, for the keyboard of
  this device. Reset all shows only after a change, and it asks first
  with `ConfirmDialog`, as `docs/mockups/design.md` asks for an action that
  a person cannot simply undo. Agent call, 2026-11-09.
- When a recorded key belongs to another command that can run in the same
  place, the row names that command and offers Replace. Replace moves the
  key in one save.
- The recorder does not take a fixed key. The row says which fixed key it
  is. When several fixed rows share the key, such as Enter or Esc, the row
  says only that the key is fixed. Agent call, 2026-11-09.
- In a browser tab, a kept key shows as kept, with one line that names
  where it works: the Mac app, and in Chrome and Edge also the installed
  app. Firefox has no installed app on a Mac.
- A failed save shows its error on the row. The row keeps the saved keys.
- The palette's Settings tab gets a Keyboard shortcuts row, and ⌘⌥/ opens
  the tab.
- User answer of 2026-11-10 to decision 198, C: the Account group of the
  palette's Settings tab lists its rows in the order of the Account page,
  tab by tab, and in each tab in the order of its sections. So in the Mac
  app, This Mac follows Sign-in, and Keyboard shortcuts still ends the
  group.
- Agent calls, 2026-11-10, from the questions of Milestone 2:
  - While the recorder replaces a key, it offers Remove beside Cancel.
    Remove takes that key off the command and saves at once. Reason: the
    reason of decision 192 B and the storage of an empty key list need a
    way to remove a key. Backspace in the recorder was the other way, but
    it hides the control and stops a person from recording Backspace.
  - When another command holds a default key, Reset shows the conflict
    line of that key with Replace and Cancel. Reason: Reset then follows
    the conflict rule of a recorded key.
  - While a row names the command that holds a key, it offers only
    Replace and Cancel, and no Remove. Reason: the conflict then asks one
    question, and Remove beside the conflict line could read as taking the
    key from the other command.
  - Each save error names what failed: "Model picker wasn't reset. Try
    again.", "⌘/ wasn't removed. Try again.", and "The shortcuts weren't
    reset. Try again." under Reset all. Reason: the copy rules ask an
    error to name what failed.
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

Depends on: none for the Mac app TODOs. PR #73, the Preferences tab, is
on `main` and in this branch. The other TODOs depend on the answers to
decisions 192, 193, and 194, as each TODO says.

The Keyboard shortcuts tab, its states, and the keys in the palette.

- [x] Choose the Mac second keys of Previous workspace, Next workspace,
      and Focus the message field, and check them. Evidence:
      `.context/keyboard-shortcuts/key-checks.md`.
- [x] After decisions 192 and 194: fix the rest of the key table, the
      Windows and Linux keys and the keys of decision 192. Check each key
      against the kept keys and the menu keys of Chrome, Edge, Firefox,
      and Safari, and against the keys that macOS takes first, from their
      sources and help pages. Also check
      that Firefox on Linux switches tabs on Alt+1 to Alt+8, and that
      Windows switches the input language on the left Alt with Shift. Run
      Chrome and Firefox where a check needs a browser. Mark each key that
      no source confirms. Record the evidence under
      `.context/keyboard-shortcuts/`.
  - [x] Check each default key against the keys that the text fields use
        on each system and the keys that a shell reads, from the user
        requirement of 2026-11-10. Choose another key where a default
        clashes.
  - [x] Fix the Linux keys after decisions 196 and 197. Evidence:
        `.context/keyboard-shortcuts/key-table.md`, sections 14.1 and 14.2.
        The answers add no default key.
- [x] Draw the Keyboard shortcuts tab of the Account page in the Mac app,
      with its fixed menu keys, and its states: recording, a conflict with
      Replace, a changed row with Reset, and a failed save. No open
      decision changes the Mac app, because it takes every key.
- [x] Draw the palette in the Mac app with the key of each row, the Search
      row with a changed palette key, and the Keyboard shortcuts row of
      the Settings tab.
- [x] After decisions 192 and 194: draw the tab in a browser, desktop and
      phone, at `app/account/shortcuts`, with the kept keys and the second
      keys. Add the tab to the Account tabs of the browser pages. Draw the
      palette rows with their keys in a browser.
- [x] After decision 193: draw the keys of the row move and the divider.
- [x] Decision 195 E: draw the search field of the tab and a search
      without a match, in the Mac app, in a browser, and on a phone.
- [x] Draw the line of the tab that says which keys the terminal keeps,
      from the user requirement of 2026-11-10.
- [x] Draw Remove in the recorder and the conflict line of a Reset, from
      the agent calls of Milestone 2, in the Mac app and in a browser.
- [x] Draw the key of each org in the hover hint of its tile in the org
      rail, from the questions of Milestone 5 part B. Evidence:
      `.context/keyboard-shortcuts/shots/round4/`.
- [x] Draw the user's answers to review items 4 and 10: the fixed row of
      the keys of a focused control, the refused line of such a key, and
      the name of a keypad digit. Evidence:
      `.context/keyboard-shortcuts/shots/round5/`. No page draws a keypad
      digit. Agent call, 2026-11-10: a keypad digit shows as "Num 8", so
      that it differs from the top-row 8.
      Evidence: `.context/keyboard-shortcuts/shots/round3/`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages in light
      and dark.
  - [x] The Mac app pages: `mac-app/shortcuts`, its child pages, and
        `mac-app/command-palette`. Evidence: `.context/keyboard-shortcuts/m1/`
        and `.context/keyboard-shortcuts/shots/`.
  - [x] The browser and phone pages. Evidence:
        `.context/keyboard-shortcuts/shots/round2/` and
        `.context/keyboard-shortcuts/m1/mockups-check-round2.log`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.
  - [x] The Mac app pages: decision 195, the Reset all question, the fixed
        groups, the new fixed rows, and the follow-up
        `plans/follow-ups/search-row-key-symbols.md`.
  - [x] The browser and phone pages: the stale list of fixed shortcuts,
        and the Orca keys in the evidence. Reports:
        `.context/keyboard-shortcuts/reports/`.
- [x] Draw the answer to decision 196 on the browser pages of the tab:
      Chrome and Firefox in a normal tab on Linux. Both dim Alt+1 to Alt+9
      and Ctrl+L, and only Chrome dims Ctrl+1 to Ctrl+9. Update each note
      of the mockups that calls decisions 196 and 197 open. Decision 197 D
      changes nothing that a page draws. Pages: `app/account/shortcuts/linux`
      and its saved state `firefox`. Agent call, 2026-11-10: Firefox on
      Linux is a saved state of the Linux page, so the two Linux browsers
      sit side by side within the five screens of a folder page. Report:
      `.context/keyboard-shortcuts/reports/answers-196-198-mockups.md`.
- [x] Add the command Restore workspace, without a default key, to the
      rows of the tab, and its key to the Restore workspace row of the
      palette, from the agent call of the fifth merge of `main`.
- [x] Run `npm run mockups:check`. Smoke-test the new pages in light and
      dark, desktop and phone. Evidence:
      `.context/keyboard-shortcuts/shots/round6/`.
- [x] Update the design and the TODOs of this plan for each problem that
      the new pages show. The pages showed none.

## Milestone 2: Documentation and protocol

Depends on: 1. Agent call, 2026-11-10: Milestone 2 starts while the Linux
TODO of Milestone 1 waits for decisions 196 and 197. The open decisions
block only the Linux rules, which follow the answers.

- [x] Write `docs/protocol/keyboard-shortcuts.md`: the commands, the
      fixed keys, where a key goes, the kept keys and the second keys
      (decision 191), the browser's own keys (decision 192), the row move
      and the divider (decision 193), the keys of Windows and Linux
      (decision 194), the tab and its search (decisions 190 and 195),
      the keys that the terminal and the text fields keep (user
      requirement of 2026-11-10), and the storage scope.
- [x] Update `docs/protocol/command-palette.md`: the palette key is a
      shortcut with ⌘K or Ctrl+K as its default, and the rows show the
      keys. Remove "Only the palette has a key" and the rejection of keys
      for other commands.
- [x] Update `docs/protocol/desktop-app.md`: the page hears each key
      first, and the menu keys are fixed. Agent call, 2026-11-10: the new
      doc holds these rules in "The Mac app", and `desktop-app.md` stays
      as it is, because it states no key rule.
- [x] Add the doc to the protocol lists of `docs/architecture.md` and
      `README.md`.
- [x] Read both legal pages in full. Confirm that "settings that you and
      your team make" covers the stored keys, or update the sentence.
- [x] Check each relative link of each changed Markdown file. Evidence:
      `.context/keyboard-shortcuts/m2/link-check.log`.
- [x] Add the Linux rules after decisions 196 and 197. Agent call,
      2026-11-10: "How a key matches" and the new rule "The layout
      switch" move to the new page `docs/protocol/keyboard-shortcuts-matching.md`,
      because the keys page would pass 300 lines. Report:
      `.context/keyboard-shortcuts/reports/answers-196-198-docs.md`.
- [x] State the user's answers to review items 4 and 10 under "Fixed
      keys" and "How a key matches". The guides and the legal pages were
      read in full; none restates a changed fact.
- [x] Add Restore workspace, without a default key, to the default keys
      of `docs/protocol/keyboard-shortcuts-keys.md`.
- [x] State decision 198 C in the Settings section of
      `docs/protocol/command-palette.md`: the Account group follows the
      order of the Account page, tab by tab.
- [x] For the answers to decisions 196 to 198: read both legal pages and
      each public guide in full, and update each sentence that restates a
      changed fact. Check each relative link of each changed Markdown file.
      No legal page or guide restates a changed fact. Evidence:
      `.context/keyboard-shortcuts/m2/link-check-196-198.log`.

## Milestone 3: The key model

Depends on: 2. Agent call, 2026-11-10: Milestone 3 starts while the Linux
TODOs wait for decisions 196 and 197. It leaves out the Linux tab keys and
the layout switch rule until the answers.

- [x] Add the shared command ids, the key text, and the request and reply
      types under `src/shared/`.
- [x] Add the model under `src/app/shortcuts/`: the commands, the
      defaults for each keyboard, the kept keys of each browser, the
      keymap of a person, the conflicts, and the decision for one key
      press.
- [x] Add the host to `AppServices`: the Mac app, an installed app, or a
      browser tab with its browser. Add the physical key to `KeyPress`,
      and a way to stop the press before an element of the page hears it.
- [x] Node tests: the decision for a key press, the keymap with changes,
      the conflicts, and the kept keys. Name the break that each test
      catches. Cover the keys that the terminal keeps on each keyboard,
      and the text keys in a text field. Evidence:
      `.context/keyboard-shortcuts/reports/m3-non-ui.md`.
- [x] Add the Linux tab keys and the layout switch rule after decisions 196
      and 197. Report:
      `.context/keyboard-shortcuts/reports/answers-196-198-model.md`.
  - [x] Decision 196 B with D: the keys that each browser uses on each
        system to select a tab or to open its address bar, with tests.
  - [x] Decision 197 D: the layout switch rule in the model, the key-up
        and the focus loss of a switch key in `windowKeys`, and the stop of
        a press that runs no command, with tests. Agent calls, 2026-11-10:
        one key source for each window keeps the held switch keys, also
        between two listeners, and `onKey.layoutModifiers()` gives the
        recorder the same state; a stopped press closes an open menu first,
        as a key that runs a command does, and a menu that refuses keeps
        the key.
- [x] Add the command Restore workspace without a default key, and run it
      from the palette's Restore workspace action, with tests.
- [x] Apply the user's answers to review items 4 and 10 in the model and
      the shared contracts, with tests: the fixed rule of the keys of a
      focused control, and one key text for each press. Evidence:
      `.context/keyboard-shortcuts/reports/answers-model.md`.

## Milestone 4: Storage on the Worker

Depends on: 2, 3. Agent call, 2026-11-10: the Worker checks each command
and each key with the shared ids and key text of Milestone 3, so it waits
for them.

- [x] Add the migration of the shortcut table, with a free prefix after
      the newest migration on `main`, and its line in
      `migrations/README.md`.
- [x] Add the write route and the changes in the account reply. Check the
      commands, the keys, and the sizes.
- [x] Add the route to the dev fake routes and to the test fakes.
- [x] Add a case to the existing account isolation test: one person's
      changes never reach another person's reply.
- [x] Worker tests: a list with one wrong change saves nothing, and a
      fixed key is rejected. Evidence:
      `.context/keyboard-shortcuts/reports/m4-non-ui.md`.
- [x] Agent call, 2026-11-10, from the review of the milestone: a stored
      key that a later version cannot read, or that the fixed list now
      holds, is dropped from the account reply with a Worker warning, and
      a stored change that loses every key falls back to the defaults.
      Reason: graceful handling; a stale row must not break the account.

## Milestone 5: Keys in the app

Tags: ui

Depends on: 1, 3

- [x] Add the shortcut listener on `AppServices.onKey`, with the rules of
      "Where a key goes". Move the palette key into it, and move each
      consumer of "Replaced ways". Delete `palette-keys.ts`. Evidence:
      `.context/keyboard-shortcuts/reports/m5a-ui.md`.
- [x] Offer each command from the part of the page that owns its control.
      Add the key-only commands as offers that the palette does not list.
- [x] Apply decision 193 to the row move, the divider, and the keys of
      the workspaces and the tabs.
  - [x] The row move and the divider match their keys exactly.
  - [x] The keys of the workspaces and the tabs run their commands.
- [x] Fix the two findings of part A: a repeat of a command key reaches
      the browser (Medium, fix now: the model gives a repeat its own
      decision, and the listener stops it without running the command
      again), and the terminal mark covers the buttons of the Terminal
      tool (Low, fix now: mark only the screen of the terminal).
- [x] If PR #79 merged, offer its right column toggle with ⌘⌥B.
- [x] Show the keys in the palette rows, the Search row, the tooltips, and
      `aria-keyshortcuts`. Hide the hints in the phone layout.
- [x] Happy-dom tests: one key runs its command, a dialog keeps the key,
      the terminal keeps a Ctrl key, and a browser tab skips a kept key.
      Also: the terminal keeps an Alt key on Windows and Linux, a key that
      runs a command does not reach the message field or the terminal,
      and a text key in the message field still edits the text.
- [x] Update `src/app/README.md`, `src/app/screens.md`, and the README of
      each changed area. Evidence:
      `.context/keyboard-shortcuts/reports/m5a-ui.md` and `m5b-ui.md`.
- Agent calls of 2026-11-10, from the questions of part B:
  - Switch to org 1 to 9 runs on each page that shows the org rail, as
    the tile of the org does. Reason: a number key that always opens the
    same org is what people expect, and the tile is its control. This
    replaces "where the palette offers it" for these commands.
  - Next workspace that needs input starts from the top of the list when
    no workspace is open. Reason: the key then also works from the list
    page.
  - A tooltip is the browser's own tooltip, "Label (key)". Reason: no
    mockup draws a tooltip, and `@firna/ui` has none.
  - A held key that opens a dialog can reach the browser after the dialog
    opens. Follow-up item: `plans/follow-ups/held-key-after-dialog-opens.md`.

## Milestone 6: The Keyboard shortcuts tab

Tags: ui

Depends on: 1, 4, 5

- [x] Add the tab at `/account/shortcuts` with its groups and rows. List
      the fixed keys too, also those of changes that merged first, such
      as the tab menu key ⇧F10.
- [x] Add the recorder, Replace, Reset, Reset all, the kept-key line, and
      the save errors. Save through the account model.
- [x] Add the search field of decision 195 with the palette's matcher,
      and the line of a search without a match.
- [x] From the questions of Milestone 5 part B: Switch to org 1 to 9 runs
      on each page that shows the org rail; Next workspace that needs input
      starts from the top of the list with no open workspace (a model
      rule); the org tiles of the rail, the All files, Changes, and Checks
      tabs, and the Archive button of the pull request bar show their keys
      in their hints.
- [x] Apply the person's changes to the keymap from the account reply.
- [x] Add the Keyboard shortcuts row to the palette's Settings tab.
- [x] Happy-dom tests: a recorded key saves and runs, Replace moves a key,
      and Reset brings back the default.
- [x] Smoke-test in Chrome on desktop and phone, in light and dark. Save
      the screenshots under `.context/keyboard-shortcuts/`. Evidence:
      `.context/keyboard-shortcuts/reports/m6-ui.md` and
      `.context/keyboard-shortcuts/m6/shots/final/`.
- Agent calls of 2026-11-10, from Milestone 6:
  - A plain Tab and Shift+Tab leave the recorder, so a keyboard user
    reaches Remove and Cancel, and the recorder does not take them. Tab
    with a modifier records. Reason: no keyboard trap, and a plain Tab
    shortcut would take the key that moves the focus on every page.
  - A refused key names its one fixed row on the keyboard, also a Mac app
    row such as Reload in a browser; with several rows or none, the line
    says that the key is a fixed shortcut.
  - Keys that equal the defaults save as a reset, so the account stores
    only changes. A key that the row already has changes nothing.
  - While a recorder shows, no key runs a command, any Escape cancels, and
    a new search ends the recording. One save runs at a time.
  - The focus returns to the new key, to Add shortcut or +, to Replace, or
    after Reset all to the search field.
  - Next workspace that needs input also starts from the top when the open
    workspace is hidden in a collapsed section.

## Milestone 8: The review answers in the tab

Tags: ui

Depends on: 1, 3

- [x] Apply the user's answers to review items 4 and 10 in the tab: the
      fixed row, the refused line, and the name of a keypad digit, with
      tests. Evidence: `.context/keyboard-shortcuts/reports/m8-ui.md`. A
      keypad digit shows as "Num 8" everywhere a key shows, and
      `aria-keyshortcuts` names it by the digit that the browser reports.
- [x] Run the checks, the tests, and the complete gate. Delete the two
      follow-up items that the answers settle. Evidence:
      `.context/keyboard-shortcuts/m7/gate-3.log`.

## Milestone 9: The answers to decisions 196 to 198 in the app

Tags: ui

Depends on: 1, 3

- [x] Decision 198 C: list This Mac after Sign-in in the palette's Account
      group, with the search word "always allow", and update its test.
- [x] Happy-dom tests where the page shows the answers to decisions 196
      and 197: in a normal Chrome tab on Linux, Alt+1 switches no org and
      the tab dims Alt+1 to Alt+9; while the layout switch takes Shift, the
      recorder records Alt+Shift+K. Add each case to the existing test of
      its requirement. The model tests of Milestone 3 cover "Alt+1
      switches no org", the lowest level that fails. Report:
      `.context/keyboard-shortcuts/reports/m9-ui.md`. Agent call,
      2026-11-10: a Tab whose restored key has Ctrl, Alt, or ⌘ records, as
      a Tab with a modifier does.
- [x] Smoke-test the tab in Chrome on Linux, desktop and phone, in light
      and dark. Where the machine allows it, also press Alt+Shift+1 with
      the Alt+Shift layout switch on, in Chrome under a real X server.
      Evidence: `.context/keyboard-shortcuts/m9/shots/` and
      `.context/keyboard-shortcuts/m9/live/`. Xvfb could not load the
      us,ru keymap, so the live check ran on Xvnc: Alt+Shift+1 opened
      workspace 1 in both orders, and the recorder saved Alt+Shift+K.
- [x] Update the README of each changed area.

## Milestone 10: The Send feedback command in the mockups

Tags: mockup

Depends on: none. It comes from the agent call of the sixth merge of
`main`.

- [x] Add the command Send feedback, without a default key, to the rows of
      the tab after Create org, and its key to the Send feedback row of
      the palette. Run `npm run mockups:check`. Report:
      `.context/keyboard-shortcuts/reports/send-feedback-docs-mockups.md`.

## Milestone 11: The Send feedback command in the protocol and the model

Depends on: none. Agent call, 2026-11-11: it runs beside Milestone 10,
because a command row without a key raises no design question that the
mockup could find.

- [x] Add Send feedback, without a default key, to the default keys of
      `docs/protocol/keyboard-shortcuts-keys.md`.
- [x] Add the command Send feedback without a default key, and run it from
      the palette's Send feedback row, with tests. Report:
      `.context/keyboard-shortcuts/reports/send-feedback-model.md`.
- [x] Split `docs/protocol/keyboard-shortcuts.md` and
      `docs/protocol/keyboard-shortcuts-keys.md`, which pass the 250 lines
      of the `documentation` skill, into linked pages, from the docs
      report of Milestone 10. "Fixed keys" and "Text keys" moved to
      `keyboard-shortcuts-fixed-keys.md`, and "Hosts" to
      `keyboard-shortcuts-hosts.md`. Report:
      `.context/keyboard-shortcuts/reports/protocol-split.md`.

## Milestone 12: Conductor's keys for Send feedback and the sidebar toggles

Tags: mockup

Depends on: none. It comes from the correction of 2026-11-11 in "Commands
and default keys".

- [x] Give Send feedback ⌥⌘F (Alt+Shift+F on Windows and Linux), and add
      a plain `[` to Hide or show the sidebar and a plain `]` to Hide or
      show the right column: the mockups first, then the protocol table,
      the defaults, and the tests. Report:
      `.context/keyboard-shortcuts/reports/conductor-defaults-fix.md`.
      Agent call, 2026-11-11, from its one finding: the matching protocol
      also names the plain brackets of the View toggles in its limit for
      German and French layouts, where [ and ] need AltGr. Reason: the
      sentence named only the tab keys, and the behaviour does not change.

## Milestone 13: Decision 199 in the mockups

Tags: mockup

Depends on: the key research of decision 199.

- [ ] Add the new commands to the rows of the Keyboard shortcuts tab in
      both keyboards: Copy link and the bar actions in the Workspace group,
      and the two Copy transcript commands in the Chat group, as Conductor
      groups them.
- [ ] Show the key of each new command in the tooltip of its control, as
      "Key hints" in `docs/protocol/keyboard-shortcuts.md` says: the
      buttons of the pull request bar, as Archive does today, and the
      workspace label's Copy link. Agent call, 2026-11-11: the session tab
      menu shows no keys, and the palette gets no new rows. Reason: hints
      show only in tooltips and palette rows, the menus have no place for a
      key, and the palette has none of these actions.
- [ ] Run `npm run mockups:check`, and look at the changed screens in light
      and dark, on desktop and phone.

## Milestone 14: Decision 199 in the protocol and the model

Depends on: 13

- [ ] Add the new rows to the default keys table and the kept keys of each
      browser to `docs/protocol/keyboard-shortcuts-keys.md` and
      `keyboard-shortcuts-hosts.md`, and change the sentence of
      `docs/protocol/keyboard-shortcuts.md` that leaves out "the pull
      request actions". Read both legal pages and each public guide in
      full, and update each sentence that restates a changed fact.
- [ ] Add the command ids, the default keys of both keyboards, the second
      keys, and the browsers' kept keys to the key model, with tests.

## Milestone 15: Decision 199 in the app

Tags: ui

Depends on: 13, 14

- [ ] Offer each new command where its control shows and can run now: the
      buttons of the pull request bar, Copy link on the workspace label,
      and the two Copy transcript items of the open session's tab menu.
      Each key does what its control does. Show each key in its control's
      tooltip or menu item, as the mockups draw it.
- [ ] Tests: each offer runs its control's action, a key does nothing where
      the control does not show or cannot run, and the hints show the keys.
      Add each case to the existing test of its requirement.
- [ ] Update the README of each changed area.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests and `npm run check`. Evidence:
      `.context/keyboard-shortcuts/m7/gate-2.log`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report. Two rounds ran: round 1 found 3 (2 fixed, 1
      removed); round 2 found 5 (1 fixed, 1 removed, 3 open with the user
      as items 4 and 10). Findings file:
      `.context/reviews/calummoore/keyboard-shortcuts-settings/findings.md`.
- [ ] Merge `origin/main` before the work on the answers to decisions 196
      to 198, and again before the pull request. Merge justifications:
      `.context/keyboard-shortcuts/merge/justifications.md`.
  - [x] Before the work: the fifth merge, commit `cd88a525`.
  - [x] Before the pull request: the sixth merge, commit `bc88c36c`.
- [x] Run the targeted tests and `npm run check` on the tree with
      Milestones 1, 2, 3, and 9 and the last merge of `main`. Evidence:
      `.context/keyboard-shortcuts/m7/gate-5.log`, on `54c5f00f`.
- [x] Review the complete local diff against `origin/main` again with the
      `implementation-review` skill after the push, with a focus on the
      commits since review round 2: the answers to review items 4 and 10
      and to decisions 196 to 198. Then apply the fix rule. Round 3 found
      2 (both Medium and rare, confirmed, deferred after the two used fix
      rounds): `plans/follow-ups/browser-tab-keys-miss-keypad-and-address-keys.md`
      and the updated `plans/follow-ups/held-key-after-dialog-opens.md`.
- [x] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds. Pull request #216.
- [ ] After Milestones 12 to 15: merge `origin/main` again, run the
      targeted tests and `npm run check`, and push.
- [ ] Review the commits since `684c78a4` with the `implementation-review`
      skill after the push, then apply the fix rule.
- [ ] Update the description of pull request #216 with decision 199, the
      correction of 2026-11-11, the new keys, and the new follow-up items.
- [ ] Delete this plan again when the `plans` skill says, under "Deleting
      the plan".

## Post-merge follow-up (non-blocking)

- [ ] On a Mac, check in the Mac app that ⌘N, ⌘T, and ⌘W reach the page,
      and that ⌘R still reloads. Also check whether ⌘ with the keypad 0
      resets the zoom, as the fixed key ⌘0 of the View menu does. If it
      does, a recorded ⌘ with the keypad 0 takes that menu key, so making
      it a fixed key needs a decision of the user, because it adds a
      rejection. From the finding check of review round 3.
- [ ] Check an installed app window in Chrome, and a browser tab in
      Chrome, Firefox, and Safari, on the deployed app.
- [ ] On Linux with the Alt+Shift layout switch, check in Firefox that
      Alt+Shift+1 opens workspace 1, in either order of the modifiers, and
      that Firefox reports the switch key as GroupNext. Chrome passed this
      check before the merge.
