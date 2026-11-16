# The workspace list as a popover of the org tile

Status: Active. On branch `calummoore/milan-hmhx`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The org rail at the far left of the app shows a tile for each org. The
sidebar beside it lists the workspaces of the current org. The Mac app can
hide the sidebar with the toggle beside the window buttons. A window
narrower than 900 px also hides it, in the browser and in the Mac app.
While the sidebar is hidden, the person has no short way to the workspace
list. On 13 November 2026 the user asked for this: when the sidebar is
collapsed, a click on the org tile opens the workspace list as a popover.
The user also asked for a sidebar toggle in the browser, next to Settings.

This change adds the popover and the browser toggle. It does not change the
phone, which has no rail, and it does not change the order of the rail or
the tile menu.

Contract owners:

- [Org rail order](../docs/protocol/org-rail-order.md#opening-an-org), for
  the click on a tile.
- [Mac app](../docs/protocol/desktop-app.md#the-window), for the toggle of
  the Mac app.
- [Command palette actions](../docs/protocol/command-palette-actions.md)
  and [Keyboard shortcuts: the keys](../docs/protocol/keyboard-shortcuts-keys.md),
  for the Hide or show the sidebar command, which decision 5 changes.
- The [mockup catalogue](../docs/mockups/catalogue.md).

## Decisions

The numbers are local to this plan.

1. **Which tile opens the popover.** The user chose B on 13 November 2026.
   - A. Every tile opens a popover with the list of its own org. Rejected.
   - B. Only the tile of the current org opens the popover. A tile of
     another org opens that org first, as it does now. A second click on
     it then opens the popover. **Chosen.**
   - C. Every tile opens its org, and the popover opens on top. Rejected.
2. **Which hidden states count.** The user chose B on 16 November 2026,
   after the item below. The user first chose A on 13 November 2026, on the
   belief that a narrow window already leads to the list. PR #353 merged on
   the same day and changed that, so the item went back to the user.
3. **What the popover holds.** The user chose A on 13 November 2026.
   - A. The full sidebar: the org name, Settings, New workspace, Automations,
     Search, and the sections with their rows and row menus. **Chosen.**
   - B. The org name and the workspace rows only. Rejected.
4. **A sidebar toggle in the browser.** The user asked for it on
   13 November 2026, "next to settings on web". The browser has no toggle
   today. The toggle is an icon button beside the Settings cog at the top
   of the sidebar.
5. **The command and the keys in the browser.** The user chose A on
   16 November 2026, as the item below gives it.

### 2. Which hidden states count as collapsed

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product behaviour.
- **Location:** `src/shell/layout/OrgRail.tsx`, `src/shell/list/OrgHome.tsx`,
  `docs/mockups/README.md:42`.
- **Background:** Below 900 px the sidebar hides, and the list page of an
  org shows the list in the main area. Since PR #353, a tile opens the last
  workspace of its org, not its list page. A narrow desktop window has no
  back link to the list on a workspace, Settings, Automations, or New
  workspace page. The Switch to rows of the palette leave out the current
  org. So only the Workspace list key leads to the list there.
- **Problem:** In a narrow window, a click on the tile of the current org
  opens the last workspace again. The person cannot reach the list with a
  click.
- **Impact if no action is taken:** With option A, a narrow window keeps
  this gap. The mockups README still says that the current org opens its
  list page below 900 px, which is no longer true.
- **Options:**
  - A. Only a sidebar that the toggle hid counts. A narrow window keeps the
    tile as it is now.
  - B. One rule for every way that the sidebar hides: on a page that has a
    sidebar and shows no workspace list, the tile of the current org opens
    the popover. This includes a narrow window. The list page of a narrow
    window already shows the list, so its tile opens no popover. In a
    narrow window the popover shows no toggle, because the sidebar cannot
    show there.
  - C. A sidebar that the toggle hid opens the popover. In a narrow window,
    the tile of the current org opens its list page, as before PR #353.
    Cost: the tile acts in two ways, and its link changes at 900 px.
  - D. A narrow window keeps the tile as it is now. Each org page of a
    narrow window gets the back link of a phone: All workspaces or
    Workspaces. Cost: one more control in each narrow header, and a click
    on the tile of the current org still does nothing new. Effort: Medium.
- **Left out:** Every tile opens its list page in a narrow window, as the
  org switcher of a phone does. It undoes PR #353, because each switch of
  org would lose the open workspace.
- **Recommendation:** B. It gives one rule for each way that the sidebar
  hides, and the workspace stays in view while the person chooses.
- **Outcome:** the user chose B on 16 November 2026.

### 5. The command and the keys in the browser

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Product behaviour.
- **Location:** `docs/protocol/keyboard-shortcuts-keys.md:45`,
  `docs/protocol/command-palette-actions.md:18` and `:38`,
  `docs/mockups/src/fixtures/shortcutCommands.ts:203`.
- **Background:** Hide or show the sidebar is a command of the Mac app only.
  It has the keys ⌘B and [ on a Mac, no key on Windows and Linux, and a row
  in the Window group of the palette. The browser leaves it out of the
  Keyboard shortcuts tab. Hide or show the right column has ⌥⌘B and ] on a
  Mac, and Alt+Shift+B and ] on Windows and Linux, in every host. It has no
  palette row. A key without ⌘, Ctrl, or Alt, such as [, works only outside
  text fields. On German and French layouts, [ needs AltGr.
- **Problem:** The browser gets a toggle button, but no command and no key.
- **Impact if no action is taken:** A keyboard user of the browser cannot
  hide or show the sidebar. A hidden sidebar shows again only through the
  popover or a reload.
- **Options:**
  - A. The command runs in every host. The palette offers its row in a
    Window group, and the Keyboard shortcuts tab shows it. It keeps ⌘B and
    [ on a Mac, and it gets Ctrl+B and [ on Windows and Linux. Risk:
    Firefox gives Ctrl+B and ⌘B to its bookmarks sidebar, so the app tab
    takes that key from it while the command runs. Chrome has no command on
    them. Edge and Safari are not checked.
  - B. As A, but Windows and Linux get only [. A Mac browser still takes
    ⌘B from Firefox. On Windows and Linux, no key then works in the message
    field or on German and French layouts.
  - C. The browser gets only the button. The command stays in the Mac app.
  - D. As A, but a Firefox tab leaves ⌘B and Ctrl+B to the browser, as it
    leaves ⌘L. Cost: Firefox users get only [ and the palette row.
- **Left out:** A key without a palette row, as for the right column. A is
  better on every point, because the palette row is the way back to a
  hidden sidebar.
- **Recommendation:** A. It follows the key rules in force, and its palette
  row is a visible way back to a hidden sidebar.
- **Outcome:** the user chose A on 16 November 2026.

The options check of
13 November 2026 added options C and D of decision 2 and option D of
decision 5, and it fixed the text of option B of decision 5. The
recommendations stayed the same. Its report is in the git-ignored file
`.context/sidebar-list-popover/options-check.md` of this workspace.

## Design

These are design calls of 13 November 2026, unless a decision above says
otherwise.

- One store holds whether the person hid the sidebar, in the panel layout
  of the app, beside the store of the right column. The Mac app toggle and
  the browser toggle both change it. Reason: one rule for both hosts. The
  state lasts until the page closes, as for the right column and the Mac
  app today.
- The popover opens when the page has a sidebar, no workspace list shows,
  and the person clicks the tile of the current org, as decision 2 B says.
  The list page of a narrow window shows its list, so its tile opens no
  popover. In a narrow window the popover shows no toggle. Another click on the tile, Escape, a
  click outside the popover, and a page that opens from the popover close
  it. The focus goes back to the tile as it closes.
- A click with a modifier key on the tile still opens the org in a new tab.
  Switch to org 1 to 9 still opens the org and no popover. Reason: a key
  that opens an org should not depend on the sidebar.
- The popover draws the `Sidebar` component in a `PopoverSurface`, beside
  the tile. It has the width of the sidebar and the height of the window.
  The sidebar of the frame stays mounted while it is hidden, and it offers
  no list action and no list key then. While the popover is open, its copy
  offers them. Reason: only the list that shows offers its actions, so two
  copies never offer the same action.
- While the sidebar is hidden and the popover is closed, the list keys,
  such as Open workspace 1 to 9, do not run, as in the Mac app today.
  Reason: no list shows, so a key would open a workspace that the person
  cannot see.
- New workspace, when it opens its dialog, and Search, which opens the
  palette, also close the popover. A row menu, a rename, and a drag inside
  the popover keep it open.
- The tile of the current org says `aria-expanded` while it can open the
  popover, and `aria-controls` while the popover is open. The name of the
  tile hides while the popover is open, so it does not cover the list.
- The popover uses the focus helper of every layer, `useLayerFocus`. The
  focus moves into it as it opens, to the current row, else to its first
  control. As it closes, the focus goes back to the tile, or to the new
  page. This replaced a first call of 13 November 2026 that moved the
  focus only after Enter, after review item 2 of 16 November 2026.
- Escape: the popover listens after the page, not on the Escape stack, so
  a rename field, the palette, a menu, a dialog, and an input method keep
  their Escape. Review item 1 of 16 November 2026 found that the stack
  took Escape from a rename field, which then saved the name. The wider
  fix, one stack for every Escape handler, waits in
  `plans/follow-ups/escape-on-one-stack.md`.
- The browser toggle sits in the top of the sidebar, beside Settings. In
  the popover it reads "Show the sidebar". The Mac app keeps its toggle
  beside the window buttons and shows none beside Settings. Reason: one
  toggle in each host.
- In the browser, a hidden sidebar shows again through the toggle in the
  popover, through the palette row of decision 5, and after a
  reload. Reason: the user placed the toggle beside Settings, and the
  popover holds that place while the sidebar is hidden.
- The list page of a narrow window shows no toggle, because it has no
  sidebar to show.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The browser sidebar gets the toggle beside Settings. The Panels page and
the Mac app Window page show the hidden sidebar and the open popover. A
phone has no rail, so its variants do not change.

- [x] Add the toggle beside Settings to the sidebar mockup, in the browser
      only.
- [x] Add the variants "Sidebar hidden" and "Workspace list popover" to
      `entries/app/panels`.
- [x] Add the variant "Sidebar hidden, list popover" to
      `entries/mac-app/window`.
- [x] Update the comment of `AppFrame` in the mockups for decision 2.
- [x] Update the mockup docs: `README.md`, `catalogue.md`, `design.md`,
      and `mac-app.md`.
- [x] Update the shortcut fixtures `shortcutCommands.ts` and
      `windowsShortcuts.ts` and the Keyboard shortcuts pages for
      decision 5.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. The Mac app had no mockup of a hidden sidebar, so
      the mockups now draw its window controls in the top left corner,
      with the top bar of the workspace after them. The screenshots are in
      `.context/sidebar-list-popover/shots/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Add the popover to `docs/protocol/org-rail-order.md`, in a new
      section "The hidden sidebar" after "Opening an org". No protocol doc
      covered the panels, so the toggle lives there too.
- [x] Add the section "Hide the workspace list" to the public guide
      `src/marketing/docs/orgs-and-members.md`.
- [x] Add the browser toggle to the protocol docs, and update
      `docs/protocol/desktop-app.md` where the toggle is no longer the
      Mac app's only one.
- [x] Update `command-palette-actions.md`, `keyboard-shortcuts-keys.md`,
      and `keyboard-shortcuts-tab.md` for decision 5: the command and its
      palette row in every host, and Ctrl+B and [ on Windows and Linux.
- [x] Update the code comments that still say the tile opens the list
      page: `src/shell/layout/frames.tsx:114` and
      `src/shell/OrgRoutes.tsx:147`.
- [x] Read each public guide in `src/marketing/docs/` and both legal pages
      in full. Update each sentence that restates a changed fact. Only
      "Switch between orgs" in the Orgs and members guide needed a change.
- [x] The comparison page with Conductor left `main` before this
      milestone, so its row needs no change.

## Milestone 3: The hidden sidebar in both hosts

Tags: ui

Depends on: 2

- [x] Move the hidden state of the sidebar from `MacChrome` to the panel
      layout, and keep the Mac app toggle on it.
- [x] Hide the sidebar of the browser frame when the person hides it.
- [x] Add the toggle beside Settings in the browser.
- [x] Apply decision 5 to the command, the palette row, and the keys.
- [x] Add tests: the toggle hides and shows the sidebar, in each host.

## Milestone 4: The popover

Tags: ui

Depends on: 3

- [x] Pass the sidebar of the frame to the rail.
- [x] Open the popover on a click on the tile of the current org, under
      the rule of decision 2.
- [x] Close it on a second click, Escape, a click outside, and a page that
      opens from it. Give the focus back to the tile.
- [x] Keep row menus, rename, and drag in the popover working.
- [x] Add tests for each case of this milestone and of decision 1, in
      `src/shell/layout/ListPopover.test.tsx`. Update the tests of the
      palette rows, the Keyboard shortcuts tab, and the browser entry of
      the Mac app for decisions 4 and 5.
- [x] Check the popover in a browser on the desktop of the cloud computer,
      on the development page: the toggle, the popover, a row, a row menu
      over the popover, Escape, and Ctrl+B.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests and `npm run check`. The static checks pass.
      Five Worker test files fail in this sandbox only: four time out under
      the load of the full run and pass alone, and the site build test
      needs its temporary folder on the disk of the repository. The log
      is in `.context/sidebar-list-popover/gate.md`.
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
