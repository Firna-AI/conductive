# Command palette

This doc holds the requirements and the decisions in force for the command
palette. The palette is one search over the app. It finds the workspaces of
an org, runs the actions of the current page, and opens the settings
pages. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws the palette at
`app/command-palette`, on desktop and on a phone.

## Opening and closing

- The palette key is ⌘K on a Mac, and Ctrl+K on Windows and Linux
  (decision 145). Reason: most palettes use this key, also the palette of
  Conductor, and browsers let the page take it.
- Only the palette has a key. The rows of the palette show no keys.
- Keys for other commands were rejected for this version.
- The palette key opens the palette on each page of the signed-in app.
  [Where the key goes](#where-the-key-goes) gives the exceptions.
- The palette opens on the All tab, with an empty search field, each time.
- The palette key closes the palette. Escape closes it too.
- On desktop, a press outside the dialog closes the palette, as it closes
  the other dialogs of the app.
- A change of the address closes the palette, such as after Back.
- A row closes the palette first, then runs its action. So the result of
  the action, such as the Archive question, shows alone.
- When the palette key, Escape, Cancel, or a press outside closes the
  palette, the focus goes back to where it was before the palette opened.
- The palette has no address of its own. Unlike the other tabs of the app,
  its tabs and its filters do not change the address.
- When the palette key opens or closes the palette, the browser does not
  also run its own action for that key.

## Where the key goes

- While another dialog or a sheet is open, the palette key does nothing.
  Reason: that layer holds the focus, and the page under it takes no
  input.
- While a menu is open, the palette key closes it and opens the palette.
- While an open menu does not close, such as during a change that it runs,
  the palette key does nothing, as over a dialog.
- On a Mac, Ctrl+K does not open the palette. Reason: Ctrl+K keeps its
  meaning in the text fields of a Mac.
- Ctrl+K in the terminal goes to the terminal, and does not open the
  palette. Reason: shells use Ctrl+K to delete to the end of the line.
- On a Mac, ⌘K opens the palette also from the terminal.
- A ⌘K that clears the terminal, as in the terminal apps of a Mac, was
  rejected, so that the palette key works the same everywhere. In the
  terminal of a workspace, `clear` or Ctrl+L clears the screen.
- While a port preview or the live desktop has the focus, the palette key
  goes to its frame and does not open the palette. Reason: the frame comes
  from another origin, so the page does not get its keys.
- A click outside the frame gives the keys back to the app.
- The menu bar of the Mac app has no Search item. Reason: the page hears
  ⌘K itself. The menu cannot run an action inside the page, because the
  page has no bridge, as [Permissions](desktop-app.md#permissions) says.

## Entry points

- A Search row under New workspace opens the palette. The sidebar and the
  list page show it at the top of the workspace list.
- On desktop, the Search row shows the palette key: ⌘K on a Mac, and Ctrl K
  on Windows and Linux. Reason: the row teaches the key.
- On a phone, the Search row shows no key.
- A phone opens the palette from the list page.
- A search button in the header of a phone workspace was rejected, because
  that header has no room.

## The org of the palette

- On a page of an org, the palette works on that org.
- On a page without an org, such as the Account page, the palette works on
  the org that the person opened last in this tab.
- When that org is deleted, or the tab opened no org, the palette works on
  the first org that is not deleted.
- Without such an org, it offers only Create org and the Account settings.
- The palette treats a [deleted](orgs-and-members.md#delete-org) org as
  absent. Such an org has no Switch to row, and its settings do not show.
- On the page of a deleted org, the palette offers nothing of that org.
- The palette finds only the workspaces of its org, as the palette of
  Conductor does. Each other org of the person shows as a Switch to row.
- A search across orgs was rejected for this version, because it needs the
  workspaces of every org. The sidebar and the rail work one org at a time.

## Layouts

- On desktop, the palette is a dialog near the top of the window, over the
  dimmed app.
- On a phone, the palette is a page that fills the screen, with the search
  field and Cancel at the top. Cancel closes the palette.
- Reason: the keyboard of a phone leaves no room for a dialog.
- The empty search field of each tab names what the tab finds:
  - All: "Search workspaces, actions, and settings" on desktop, and only
    "Search" on a phone, which has no room for the long words.
  - Workspaces: "Search workspaces".
  - Actions: "Search actions".
  - Settings: "Search settings".

## Tabs and groups

- The palette has four tabs, in this order: All, Workspaces, Actions, and
  Settings.
- The query stays when the person changes the tab.
- The results come in groups. Each group has a label.
- With an empty search field, the All tab shows three groups, in this
  order: Recent workspaces, Actions, and Settings.
- Recent workspaces shows up to five workspaces of the org, the latest
  activity first, with the times of the workspace list (decision 146).
- Recent workspaces never shows the open workspace or an archived one.
- An order by the visits of the person was rejected for this version,
  because it needs data that the app does not keep or send.
- With a query, the All tab shows the matches in four groups, in this
  order: Workspaces, Actions, Settings, and Archived. Archived holds the
  archived workspaces that match. Reason: the person finds an old
  workspace without a change of tab, and the active workspaces stay first.
- With a query, each other tab shows its matches in its own groups.
- A group without a match does not show.

## Rows

- A workspace row shows the state mark, the name, the repository, and the
  age of the latest activity, as the workspace list does.
- The state mark and the bold name of an unread workspace mean what they
  mean in the list, as
  [Workspace states](workspaces-and-sandboxes.md#workspace-states) says.
- The results show no highlight of the letters that match.
- A coloured bar at the left edge of a workspace row, as in Conductor, was
  rejected, because the state mark already gives the state.
- An action row shows an icon and its label. A Switch to row shows the
  tile of its org.
- A setting row shows an icon and its label. On the All tab and in a
  search, it also shows the page that holds it, such as "Acme settings" or
  "Account".
- A workspace row opens its workspace.
- A row that opens a page is a link. So a ⌘-click on a Mac, or a Ctrl-click
  on Windows and Linux, opens the page in a new tab. In the Mac app,
  [Navigation](desktop-app.md#navigation) states where the page opens.

## Search

- A search looks only at these texts:
  - the name, the branch, and the repository of a workspace
  - the label and the search words of an action or a setting
- Search words are words that the row does not show, such as "Claude" and
  "Codex" for Agents, and "env" for Cloud computer.
- A search ignores case.
- Each word of the query must match one of these texts, in any order.
- A word of the query can match inside a word. In each group, a match at
  the start of a word ranks first.
- Rows of the same rank keep the order that the tab shows without a query.
  For workspaces, that is the order of the list.

## The Workspaces tab

- The Workspaces tab shows the workspaces of the org by section, in the
  order of the list. It also shows the workspaces of a collapsed section.
- Two filters choose what the tab shows: the repository, all repositories
  or one, and the state, Active or Archived.
- Reason: the filters follow the project and archive filters of Conductor.
  A section is not tied to a repository, so the repository is a filter.
- The filters start at All repositories and Active each time that the
  palette opens.
- With the Archived filter, the tab shows the archived workspaces in one
  Archived group, in the order of the list.

## Actions

- The palette offers the main actions that the app has today
  (decision 144).
- View commands were rejected for this version, because each needs its
  own mockups and stored state. Layout toggles, a focus mode, and a theme
  choice are view commands.
- The palette offers only the actions that the current page offers to the
  person.
- New workspace also shows on each page where the palette has an org that
  takes changes. It uses the
  [saved view of New workspace](create-a-workspace.md#page-or-dialog).
- New section shows only where the page shows the workspace list.
- The Go to rows show only where the page shows the right column.
- On the All tab and on the Actions tab, the actions come in this order:
  1. While a workspace is open, its actions: New session, Session history,
     a Go to row for each tab of the right column, and Archive workspace.
     The Go to rows lead to All files, Changes, Checks, Terminal, Preview,
     and Desktop.
  2. The actions of the org: New workspace and New section.
  3. Create org, then a Switch to row for each other org of the person, in
     the order of the org rail.
  4. In the Mac app, "Hide the sidebar" or "Show the sidebar", as the
     sidebar toggle of the window says. This row shows on each page where
     the sidebar can show.
- The Actions tab shows these parts as groups. Their labels are the name
  of the open workspace, the name of the org, "Orgs", and "Window".
- Archive workspace shows only to the workspace owner and the admins, as
  [Members and roles](orgs-and-members.md#members-and-roles) says.
- In a suspended org, the palette offers no action that changes the org.
  [What members of a suspended org keep](operator-actions.md#what-members-of-a-suspended-org-keep)
  states what they can still do.
- Each action does what the same control does in the app. So New workspace
  opens New workspace, as the rest of the app does.
- The palette does not offer Resume, the owner picker, Sign out, or the
  pull request actions. They stay where they are:
  - Resume shows on the stopped workspace itself.
  - The owner picker acts on a person.
  - Sign out sits on the Account page, which the Sign-in row opens.
  - A pull request action leads to GitHub, from the pull request bar.

## Settings

- The Settings tab shows two groups. The first group holds the four tabs
  of the org settings: General, Repositories, Cloud computer, and Members.
  Its label is the name of the org and "settings", such as "Acme settings".
- The second group, Account, holds the sections of the Account page:
  Sign-in, GitHub, Agents, and New workspaces.
- In the Mac app, the Account group also holds
  [This Mac](desktop-app.md#saved-choices).
- A row of the org settings opens its tab. A row of the Account group
  opens the tab of the Account page that holds its section.

## Keys inside the palette

- The search field has the focus when the palette opens. It keeps the
  focus while Up and Down move the highlight.
- The first result is highlighted.
- Up and Down move the highlight. Enter runs the highlighted row.
- Down on the last row moves the highlight to the first row. Up on the
  first row moves it to the last row, as the menus of the app do.
- The pointer can choose any row. A click or a tap runs it.
- Tab moves the focus to the tabs and the filters. The focus stays inside
  the palette, as in the other dialogs of the app.

## Empty and unavailable states

- [Command palette: empty and unavailable states](command-palette-states.md)
  gives what the palette shows while its workspace data loads or did not
  load, and when a tab or a search has no row.

## Access

- The palette shows only data that the app already shows the person.
- The palette sends no request that reaches another org.
  [Orgs and workspaces](access-and-security.md#orgs-and-workspaces) states
  which requests reach an org.
