# Command palette: actions and settings

This doc holds the requirements and the decisions in force for the
actions and the settings rows of the command palette. It belongs to
[Command palette](command-palette.md), which covers the key, the org of
the palette, its layouts, its tabs, its rows, and its search. The terms
are those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

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
- Import from Conductor shows only in the Mac app, on each page where the
  palette has an org that takes changes. The palette of a browser never
  shows it.
- The Go to rows show only where the page shows the right column.
- On the All tab and on the Actions tab, the actions come in this order:
  1. While a workspace is open, its actions: New session, Session history,
     a Go to row for each tab of the right column, and Archive workspace.
     The Go to rows lead to All files, Changes, Checks, Terminal, and
     Preview. Desktop has no Go to row while the app hides it, as
     [Desktop](workspace-tools.md#desktop) says. An archived workspace
     offers only Session history and Restore workspace.
  2. The actions of the org: New workspace and New section. In the Mac
     app, Import from Conductor follows them, as
     [Entry points](desktop-import.md#entry-points) says.
  3. Create org, then a Switch to row for each other org of the person, in
     the order of the org rail.
  4. In the Mac app, "Hide the sidebar" or "Show the sidebar", as the
     sidebar toggle of the window says. This row shows on each page where
     the sidebar can show.
- The Actions tab shows these parts as groups. Their labels are the name
  of the open workspace, the name of the org, "Orgs", and "Window".
- Archive workspace shows only to the workspace owner and the admins, as
  [Members and roles](orgs-and-members.md#members-and-roles) says.
- Restore workspace shows to every member until Restore of the archived
  workspace ends, as [Restore](workspace-life.md#restore) says.
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
  [This Mac](desktop-commands.md#saved-choices).
- A row of the org settings opens its tab. A row of the Account group
  opens the tab of the Account page that holds its section.
