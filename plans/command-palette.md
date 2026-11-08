# Command palette

Status: Active. On branch `calummoore/command-palette-mockups`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 8 November 2026 the user asked for a command palette like the one in
Conductor, with four screenshots, and asked for the mockups first. The
screenshots show a search box over the app with four tabs: All,
Workspaces, Actions, and Settings. The All tab starts with recent
workspaces, then actions with their keys. The Workspaces tab has a filter
for the project and one for archived workspaces. The Settings tab lists
the settings pages. The request chose this approach, so no brainstorm
ran.

This change adds the palette to the web app, and so to the Mac app, which
shows the web app. A key or the new Search row of the workspace list opens
it. It finds the workspaces of the current org, runs the actions of the
current page, and opens the settings pages. It does not cover a search of
chat text or of files, a search across orgs, new view commands, or keys
for each command. The user chose this scope on 8 November 2026, in
decisions 144, 145, and 146. More keys come later, in another workspace.

Contract owners:

- The new protocol doc `docs/protocol/command-palette.md`. Milestone 2
  creates it, because no protocol doc owns the navigation of the app.
- The [mockup catalogue](../docs/mockups/catalogue.md) and
  [the design](../docs/mockups/design.md).
- The [web app README](../src/app/README.md) and its
  [Screens](../src/app/screens.md) page.

## Design

Each line that starts with "Agent call" is a design call of the agent,
made on 8 November 2026. The user can change it before the plan is
approved.

### Opening and closing

- Agent call: ⌘K on a Mac, and Ctrl+K on Windows and Linux, opens the
  palette, and the same key closes it. Escape closes it too. ⌘K is the key
  of Conductor's palette and of most palettes, and browsers leave it to
  the page.
- Agent call: Ctrl+K in the terminal stays with the terminal, because
  shells use it to delete to the end of the line. A Mac uses ⌘K, so Ctrl+K
  keeps its meaning in the text fields of a Mac.
- Agent call: a Search row under New workspace opens the palette, in the
  sidebar and in the list page. On desktop the row shows ⌘K, so the row
  teaches the key. A phone has no key, so its row shows none. A search
  button in the header of a phone workspace was rejected, because that
  header has no room. A phone opens the palette from the list.
- Agent call: on a Mac, ⌘K opens the palette also from the terminal, so
  the key works the same everywhere. Terminal apps on a Mac use ⌘K to
  clear the screen. In the terminal of a workspace, `clear` or Ctrl+L
  does that.
- Agent call: while a port preview or the live desktop has the focus, its
  frame gets the keys, because it comes from another origin. So ⌘K does
  not open the palette there. A click outside the frame gives the keys
  back to the app.
- Agent call: the menu bar of the Mac app gets no Search item. The page
  hears ⌘K itself, and the menu can not run an action inside the page,
  because the page has no bridge, as
  [Mac app](../docs/protocol/desktop-app.md#the-window) says.
- Agent call: the palette opens on the All tab with an empty field each
  time. It has no address, and it closes when the address changes, such
  as after Back.
- Agent call: ⌘K works on each page of the signed-in app. On a page
  without an org, such as the Account page, the palette works on the org
  that the person opened last in this tab, or else on the first org that
  is not deleted, as the Mac app keeps its sidebar. Without such an org,
  it offers Create org and the settings of the Account. A deleted org
  offers no workspace and no action of the org.

### Layout

- Agent call: on desktop the palette is a dialog near the top of the
  window, about 640 px wide, as in Conductor. The app under it gets a
  lighter dim than under a dialog that asks a question, because the
  palette is a quick tool. On a phone it is a page that fills the screen,
  with the search field and Cancel at the top, because the phone keyboard
  leaves no room for a dialog.
- Agent call: the empty search field of the All tab says "Search
  workspaces, actions, and settings" on desktop, and only "Search" on a
  phone, which has no room for the long words. Each other tab names what
  it finds, such as "Search workspaces".
- Agent call: the tabs use the tab style of the app, in the monospace
  font in capitals. Each group has a label in the same style.
- Agent call: a workspace row shows the state mark, the name, the
  repository, and the age of the last activity, as the list does. An
  action row shows an icon and its label. A setting row shows an icon and
  its label. On the All tab and in a search, it also shows the page that
  holds it. An org row shows the tile of the org. Conductor marks workspaces with a coloured bar at their left edge.
  The palette does not, because the `product-ui` skill forbids that
  pattern, and the state mark already gives the state.
- Agent call: results show no highlight of the matched letters. The state
  mark and the bold name of an unread workspace keep the meaning that they
  have in the list.

### Workspaces

- Agent call: the palette finds the workspaces of the current org, as
  Conductor's palette finds those of its current org. Each other org shows
  as a "Switch to" action. A search across orgs was rejected for this
  version, because the sidebar and the rail work one org at a time, and
  it needs the list of every org.
- Agent call: a search looks at the name, the branch, and the repository
  of each workspace. It ignores case. Each word of the query must match,
  in any order. A match at the start of a word ranks first.
- Agent call: the Workspaces tab groups the workspaces by section, in the
  order of the list, also in a collapsed section. Its two filters choose
  the repository, all or one, and the state, Active or Archived. They
  follow the project and archive filters of Conductor.
- Agent call: a search on the All tab also finds archived workspaces. They
  show in their own group after the other results, so the person finds an
  old workspace without a change of tab, and the active ones stay first.
- Agent call: Recent workspaces shows up to five workspaces, without the
  open one. They come by their latest activity, as decision 146 chose.

### Actions and settings

- Agent call: the palette offers only what the current page offers to
  that person. Archive shows only for the owner of the workspace and the
  admins. A suspended org offers nothing that changes it. The sidebar
  toggle shows only in the Mac app. The actions of a workspace show only
  while a workspace is open.
- Agent call: the actions of an open workspace come first: New session,
  Session history, a Go to row for each tab of the right column, and
  Archive workspace. The actions of the org follow: New workspace and New
  section. Create org and a switch to each other org come last.
- Agent call: Resume, the owner picker, Sign out, and the pull request
  actions stay where they are in this version. Resume shows on the
  stopped workspace itself. The owner picker acts on a person. Sign out
  sits on the Account page, which the Sign-in row opens. A pull request
  action changes GitHub.
- Agent call: the Settings tab groups the four tabs of the org settings
  under the name of the org, such as "Acme settings". It groups the
  sections of the Account page under "Account": Sign-in, GitHub, Agents,
  and New workspaces. The Mac app adds This Mac.
  Each setting has hidden search words, such as "Claude" for Agents and
  "env" for Cloud computer.
- Agent call: a row that opens a page is a link, so ⌘-click or Ctrl-click
  opens it in a new tab.

### Keys inside the palette

- Agent call: the search field keeps the focus. The first result is
  highlighted. Up and Down move the highlight, and Enter runs it. The
  pointer can choose any row. Tab moves to the tabs and the filters, and
  the focus stays inside the palette, as in the other dialogs of the app.

### States

- Agent call: a search without results says "Nothing matches" with the
  query, and "Try a workspace name, a branch, or a repository."
- Agent call: the palette reads only the data that the app already shows
  the person, so it adds no request that reaches another org.

### The Preferences change

The branch `calummoore/user-preferences-screen` plans a Preferences tab on
the Account page and a New workspace dialog, with decisions 142 and 143.
So this plan starts its decisions at 144.

- Agent call: when that change merges first, the New workspace action of
  the palette uses its shared way to open New workspace, so it opens the
  page or the dialog as the person chose. The Settings tab then lists the
  General and Preferences tabs of the Account page, and New workspaces
  moves under Preferences.

## Decisions

The user answered the three decisions on 8 November 2026: option A of
each. The mockups of Milestone 1 already show these answers: the main
actions that the app has today, no keys on the rows, and recent
workspaces by their latest activity.

The options check of the `plans` skill ran over the three decisions on 8
November 2026. It added option D to decisions 144 and 145, and option E to
decision 146. It changed the recommendation of decision 145 from A to D,
and of decision 146 from B to E. It also corrected facts about the keys of
the Mac app and the read time of the Worker. Its report is
`.context/command-palette/options-check.md`.

The answers add no milestone. The user plans more keys in another
workspace, so this plan adds no follow-up item for them.

### 144. Choose the commands of the first palette

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Terms:**
  - **View command:** a command that changes the look or the layout of the app, such as the toggles for the sidebars, the theme, and zen mode in Conductor.
- **Background:** Conductor's palette lists actions such as Create workspace, Toggle theme, Toggle left sidebar, Toggle right sidebar, and Toggle zen mode. Conductive has none of these view commands in the browser. The Mac app has one, its sidebar toggle. The app always follows the light or dark scheme of the system.
- **Problem:** The palette can offer only the actions that the app has today, or it can add the view commands of Conductor as new features.
- **Impact if no action:** The documentation milestone can not state the commands of the palette, so the work after the mockups waits.
- **Root question:** Which commands can a person run from the palette in its first version?
- **Options:**
  - **A.** Offer the main actions that the app has today. They are New workspace, New section, Create org, and a switch to each other org. In a workspace they add New session, Session history, the tabs of the right column, and Archive. The Mac app adds its sidebar toggle. Each new command can follow as its own change. Effort: Small.
  - **B.** A, plus the layout commands of Conductor in the browser and the Mac app: hide or show the sidebar, hide or show the right column, and a focus mode that hides both. Each command needs mockups of its layout. Its state lasts until a reload, as the sidebar toggle of the Mac app does today. A state that the browser stores changes the rule that the browser keeps only the panel widths. Effort: Medium.
  - **C.** B, plus a theme choice: system, light, or dark. The Worker stores it for each person, and the Account page shows it. The app then no longer always follows the scheme of the system. The choice arrives with the account reply, so each page load first shows the scheme of the system. Effort: Large.
  - **D.** Added by the options check. A, plus a theme choice alone, without the layout commands. The Worker stores it for each person. After the Preferences change merges, the choice is one more column of its preferences table, and its Preferences tab shows it. The palette offers the three themes. Each page load first shows the scheme of the system. Effort: Medium after the Preferences change merges, Large before it.
- **Left out:** Commands of Conductor that Conductive has no use for, such as Bulk transfer to local, Submit a prompt, and Send feedback, because they fail the goal: Conductive has no local copy, no saved prompts, and no feedback channel. A theme that the browser stores, because it breaks a rule that stays: the browser keeps only the panel widths, as the Preferences plan also says. A theme kept only in memory, because it fails the goal: each page load loses the choice. Show keyboard shortcuts goes with decision 145.
- **Wider fix:** None. The item is a design question, not a class of defect.
- **Previous examples:** None found.
- **Related:** Decision 145, the same scope: the keys of view commands wait for this answer.
- **Recommendation:** A. It ships the palette with the main actions of the app, and each view command is a feature that deserves its own mockups. When the user wants a theme, D gives it without the layout commands.
- **Action:** ask the user, because the request points at Conductor's palette, whose actions include view commands that Conductive lacks, and a wrong guess wastes the work.
- **Chosen:** A, by the user on 8 November 2026.

### 145. Choose the keys of the commands

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Conductor shows a key beside most actions, such as ⌘N for Create workspace. Conductive has no keyboard shortcut today. A browser tab keeps some keys for itself, such as ⌘N, ⌘T, and ⌘W, so the page never gets them there. The page of the Mac app gets those keys, because the menu of the Mac app does not use them. The menu can load the address of a page, as a click on a notification does, but it can not run an action inside the page. In every option, ⌘K or Ctrl+K opens the palette.
- **Problem:** A palette row can show a key only when its command has one.
- **Impact if no action:** The documentation milestone can not state the keys, so the work after the mockups waits.
- **Root question:** Which commands get their own key, other than the palette key, in a browser tab and in the Mac app? The options check widened the question, because the two hosts get different keys.
- **Options:**
  - **A.** Only the palette gets a key: ⌘K on a Mac, and Ctrl+K on Windows and Linux. The rows show no keys. Effort: Small.
  - **B.** A, plus keys for the most used commands, in the browser and the Mac app, from the few keys that browsers leave free. Each row shows its key. The keys must also stay clear of the terminal and the composer. Free keys are hard to find: Chrome uses ⌥⌘N, and Ctrl+Alt types characters on many Windows keyboards. Effort: Medium.
  - **C.** A, plus items with native Mac keys in the menu bar of the Mac app, such as ⌘N and ⌘ comma. An item loads the address of its command, as a click on a notification does. An action inside the page, such as New session, needs a bridge into the page, which the Mac app protocol rejects. So the menu offers only the commands that have an address. Effort: Medium.
  - **D.** Added by the options check. A, plus native Mac keys in the Mac app only, such as ⌘N for New workspace and ⌘T for New session. The page hears them itself, as it hears ⌘K. The terminal and the composer do not use these keys. A browser tab keeps only ⌘K or Ctrl+K, and its rows show no keys. So the rows differ between the browser and the Mac app, and the Mac app protocol gets a rule of its own. Effort: Medium.
- **Left out:** Keys that a browser tab keeps, such as ⌘N, because a page in a tab never gets them. Single letters without a modifier, as GitHub and Linear use them, because they fail the goal in a workspace, where the composer holds the focus. A key map that each person sets, because it needs default keys first. A list of the keys, Show keyboard shortcuts, because the rows already show each key under B, C, and D, and A has no keys.
- **Wider fix:** None. The item is a design question, not a class of defect.
- **Previous examples:** None found.
- **Related:** Decision 144, the same scope: view commands would need keys too.
- **Recommendation:** D. The options check changed it from A. D gives the Mac app the keys that the screenshots show, and it takes no key from a browser, the terminal, or the composer. A stays the smallest first step.
- **Action:** ask the user, because the screenshots show a key beside each action, and speed and scope pull in opposite directions.
- **Chosen:** A, by the user on 8 November 2026. The user plans more keys in another workspace.

### 146. Choose the order of recent workspaces

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Terms:**
  - **Recent workspaces:** the first group of the All tab while the search field is empty: up to five workspaces.
  - **Read time:** the time when a person last read the output of a workspace. The Worker keeps one for each person and workspace.
- **Background:** The All tab of Conductor's palette starts with recent workspaces. In the screenshot, the group skips workspaces with newer activity, so it follows the visits of the person. Conductive shows the time of the latest activity of each workspace in the list. The first show of a workspace in each tab sets the read time of the person, and so does new output that the person sees. The list reply does not give the read time today. The browser keeps only the widths of the panels, as the [architecture](../docs/architecture.md#web-app) says.
- **Problem:** "Recent" can mean the latest activity of each workspace, or the workspaces that the person opened last.
- **Impact if no action:** The implementation milestone can not build the group.
- **Root question:** Which workspaces does the palette offer first, before the person types?
- **Options:**
  - **A.** The workspaces with the latest activity, the same times as in the list. It needs no new data. A working agent, and also an idle stop, can push the workspace that the person just left down the group. Effort: Small.
  - **B.** The workspaces that this tab opened, the last one first, then the latest activity. It stores nothing. A reload or a new tab starts again from the latest activity. The Mac app loads its page again after a sign-in, a click on a notification, and a reload. Effort: Small.
  - **C.** The browser stores the workspaces that the person opened last. The order survives a reload, but each browser keeps its own. It changes the rule that the browser keeps only the panel widths. Effort: Small.
  - **D.** The Worker records each time that a person opens a workspace, and the list reply gives that time. The order survives a reload and follows the person to each browser and to the Mac app. It needs a new write on each open, a field in the reply, and their tests. Effort: Medium.
  - **E.** Added by the options check. B, but after the workspaces of this tab come the others by the read time of the person, not by the latest activity. The list reply adds the read time, which the Worker already stores. The order survives a reload, a new tab, and a new window, and it follows the person. It adds no table and no new write. A return to a workspace in the same tab without new output does not move its read time, but B covers that tab. Effort: Medium.
- **Left out:** An order by the last message of the person, because D is better on every point: both need a time for each person, and that order misses the workspaces that the person only reads. No Recent group, because it fails the goal: Conductor's All tab starts with it.
- **Wider fix:** None. The item is a design question, not a class of defect.
- **Previous examples:** None found.
- **Recommendation:** E. The options check changed it from B. E keeps the order of the person, as Conductor does, also after a reload or in a new tab, with data that the Worker already stores.
- **Action:** ask the user, because each option trades effort against how long the order lasts, and no option is clearly best.
- **Chosen:** A, by the user on 8 November 2026.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The catalogue gets the palette at `app/command-palette`, with a child page
for each other tab and one for search. The workspace list gets its Search
row, and a user flow opens a workspace from the palette. Each screen has
its desktop and its phone view.

- [x] Add the palette part in `docs/mockups/src/components/palette/`: the
      dialog of a desktop, the page of a phone, the tabs, the filters, the
      groups, the rows, and the empty state.
- [x] Add the Search row to the sidebar and to the list page, with ⌘K on
      desktop.
- [x] Add a `palette` state to `WorkspaceListScreen` and `WorkspaceScreen`.
- [x] Add archived workspaces of Acme to the fixtures, for the Archived
      filter and the search.
- [x] Add the entries: `app/command-palette` with the All tab, then
      `workspaces` with the `repository` and `archived` variants,
      `actions` with the `workspace` variant, `settings`, and `search`
      with the `no-results` variant.
- [x] Add the user flow `user-flows/open-workspace-from-palette`.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run file-length:check`. Smoke-test the changed pages in
      light and dark, on desktop and on a phone. Save the screenshots
      under `.context/command-palette/`. Screenshots:
      `.context/command-palette/shots/`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol states the palette before the code changes.

- [ ] Add `docs/protocol/command-palette.md` with the requirements and
      the decisions in force: the keys, the entry points, the layouts,
      the tabs, what a search finds, the archived results, the commands
      of each person and page, the settings, the recent workspaces, the
      keys inside the palette, and the empty state.
- [ ] Link the new doc from the protocol lists of `docs/architecture.md`
      and `README.md`.

## Milestone 3: The palette in the web app

Tags: ui

Depends on: 2

The web app and the Mac app get the palette, wired to the existing
actions.

- [ ] Add a pure command model in `src/app/`. It builds the rows from the
      org, its sections, workspaces, and repositories, the person, the
      route, and the Mac app. Test in Node that the actions follow the
      role, the suspension, and the page, and that archived workspaces
      and recent workspaces come out right.
- [ ] Add the matcher: case, word order, and the rank of a match at the
      start of a word. Test it in Node.
- [ ] Hear ⌘K and Ctrl+K through a new key listener of `AppServices`, so
      that no unit test needs a browser page. The listener stops the own
      action of the browser on that key. The input listener of the page
      can not, because it is passive and gets no event. Keep Ctrl+K in
      the terminal.
- [ ] Add the palette layer in `src/shell/` on `OverlayHost`: the dialog
      of a desktop, the page of a phone, the tabs, the filters, the rows,
      the empty state, the focus, and the keys. Reuse the CSS modules of
      the mockup part.
- [ ] Add the Search row to `src/shell/list/Sidebar.tsx` and to the list
      page.
- [ ] Wire each action to the existing one: New workspace, New section,
      Create org, the switch of org, New session, Session history, the
      tabs of the right column, Archive, and the sidebar toggle of the
      Mac app.
- [ ] Order Recent workspaces by their latest activity, as decision 146
      chose.
- [ ] Keep the org that the person opened last in the tab, for the pages
      without an org, as the Mac app does for its sidebar.
- [ ] Test with happy-dom: the key opens and closes the palette, Escape
      closes it, and the focus goes back. The arrows and Enter run a row.
      The tabs and the filters work. A search finds a workspace by its
      name, branch, and repository, and archived matches come last. The
      empty state shows. A member and a suspended org get only their
      actions. Ctrl+K in the terminal stays there. A phone gets the page.
      Run each new test 10 times.
- [ ] Capture the marketing pictures again with `npm run marketing:pictures`,
      as [the marketing site README](../src/marketing/README.md) says. The
      Search row changes the sidebar and the phone list that the pictures
      show.
- [ ] Add the rules of the palette layer to `src/app/screens.md`: the
      focus, the inert frame, Escape, and the close on a change of
      address. Milestone 2 left this to the code, because the page
      describes the code.
- [ ] Update the Key code of `src/app/README.md`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Open the deployed app in a browser and in the Mac app. Check that
      ⌘K opens the palette and that a workspace opens from it.
