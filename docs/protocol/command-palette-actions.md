# Command palette: actions and settings

This doc holds the requirements and the decisions in force for the actions
and the settings that the command palette offers. It also covers the Help
group, with Send feedback. It belongs to
[Command palette](command-palette.md), which covers the other parts of the
palette. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue-palette.md) draws the
actions at `app/command-palette/actions`, and the settings at
`app/command-palette/settings`.

## Actions

- The palette offers the main actions that the app has today
  (decision 144).
- View commands were rejected for this version, because each needs its
  own mockups and stored state. Layout toggles, a focus mode, and a theme
  choice are view commands.
- The palette offers only the actions that the current page offers to the
  person. Send feedback is the one exception, as [Help](#help) says.
- New workspace also shows on each page where the palette has an org that
  takes changes. It uses the
  [saved view of New workspace](create-a-workspace.md#page-or-dialog).
- New section shows only where the page shows the workspace list.
- The Go to rows show only where the page shows the right column.
- On the All tab and on the Actions tab, the actions come in this order:
  1. While a workspace is open, its actions: New session, Session history,
     a Go to row for each tab of the right column, and Archive workspace.
     The Go to rows lead to All files, Changes, Checks, Terminal, and
     Preview. Desktop has no Go to row while the app hides it, as
     [Desktop](workspace-tools.md#desktop) says. An archived workspace
     offers only Session history and Restore workspace.
  2. The actions of the org: New workspace and New section.
  3. Create org, then a Switch to row for each other org of the person, in
     the order of the org rail.
  4. In the Mac app, "Hide the sidebar" or "Show the sidebar", as the
     sidebar toggle of the window says. This row shows on each page where
     the sidebar can show.
  5. Send feedback, as [Help](#help) says.
- The Actions tab shows these parts as groups. Their labels are the name
  of the open workspace, the name of the org, "Orgs", "Window", and
  "Help".
- Archive workspace shows only to the workspace owner and the admins, as
  [Members and roles](orgs-and-members.md#members-and-roles) says.
- Restore workspace shows to every member until Restore of the archived
  workspace ends, as [Restore](workspace-life.md#restore) says.
- In a suspended org, the palette offers no action that changes the org.
  [What members of a suspended org keep](operator-actions.md#what-members-of-a-suspended-org-keep)
  states what they can still do.
- Each action does what the same control does in the app. So New workspace
  opens New workspace, as the rest of the app does. Send feedback is the
  one exception, as [Help](#help) says.
- The palette does not offer Resume, the owner picker, Sign out, or the
  pull request actions. They stay where they are:
  - Resume shows on the stopped workspace itself.
  - The owner picker acts on a person.
  - Sign out sits on the Account page, which the Sign-in row opens.
  - A pull request action runs from the pull request bar, or from its key,
    as [Keyboard shortcuts](keyboard-shortcuts.md#commands) says.

## Help

- The Help group holds one action, Send feedback. It opens the
  [Feedback dialog](feedback.md#the-dialog) over the current page.
- The search words of Send feedback are "bug", "idea", "support",
  "contact", "help", and "report".
- Help is the last group of the Actions tab. Outside the Mac app, no
  Window group shows, so Help comes after Orgs. On the All tab, Send
  feedback is the last action.
- Reason: feedback is about the product, not about a workspace, an org, or
  the window.
- Send feedback shows on each page where the palette opens, also without
  an org and in a suspended org. Reason: feedback changes no org.
- Send feedback is not a link, because the Feedback dialog has no address.
- Send feedback is the one exception to three rules of the palette:
  - Each other action does what the same control does in the app. The app
    has no other control for feedback.
  - Each other action shows only where the current page offers it. The
    app offers Send feedback on each page.
  - Without an org, the palette offers only Create org, Send feedback, and
    the Account settings, as
    [The org of the palette](command-palette.md#the-org-of-the-palette)
    says.
- Reason: the palette is the place where a person sends feedback
  (decision 270), and it opens on each page.
- The menu bar of the Mac app has no feedback item. Reason: a menu item
  cannot open a dialog inside the page, because the page has no bridge, as
  [Permissions](desktop-commands.md#permissions) says.

## Settings

- The Settings tab shows two groups. The first group holds the four tabs
  of the org settings: General, Repositories, Cloud computer, and Members.
  Its label is the name of the org and "settings", such as "Acme settings".
- The second group, Account, holds four sections of the Account page:
  Sign-in, GitHub, Agents, and New workspaces. It also holds Keyboard
  shortcuts, the fourth tab of the Account page.
- In the Mac app, the Account group also holds
  [This Mac](desktop-commands.md#saved-choices), which only the Account
  page of the Mac app has.
- The Account group lists its rows in the order of the Account page
  (decision 198). It goes tab by tab, and in each tab in the order of its
  sections. So in the Mac app, This Mac follows Sign-in, and Keyboard
  shortcuts ends the group.
- Reason: the person already knows the order of the page, and a later row
  then has one clear place. This Mac after Agents or after New workspaces
  was rejected, because the group then leaves the order of the page.
- A row of the org settings opens its tab. A row of the Account group
  opens the tab of the Account page that holds its section.
