# Command palette: actions and settings

This doc holds the requirements and the decisions in force for the actions
and the settings that the command palette offers. It also covers the Help
group, with Send feedback. It belongs to
[Command palette](command-palette.md), which covers the other parts of the
palette. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A terminal tabs decision number names a decision of the change that
adds terminal tabs to the Terminal tool, as [Terminal](terminal.md) says.
A merge latest decision is a decision of the change that added
[Merge latest](#merge-latest).
The [mockup catalogue](../mockups/catalogue-palette.md) draws the
actions at `app/command-palette/actions`, and the settings at
`app/command-palette/settings`.

## Actions

- The palette offers the main actions that the app has today
  (decision 144).
- View commands were rejected for this version, because each needs its
  own mockups and stored state. Layout toggles, a focus mode, and a theme
  choice are view commands. Hide and Show the sidebar are the one
  exception, because the toggle has its mockups and keeps no state (list
  popover decision 5 A).
  [The hidden sidebar](org-rail-order.md#the-hidden-sidebar) defines the
  list popover decisions.
- The palette offers only the actions that the current page offers to the
  person. Send feedback and Merge latest are the exceptions, as
  [Help](#help) and [Merge latest](#merge-latest) say.
- New workspace also shows on each page where the palette has an org that
  takes changes. It uses the
  [saved view of New workspace](create-a-workspace.md#page-or-dialog).
- New section shows only where the page shows the workspace list.
- The Go to rows show only where the page shows the right column.
- New terminal shows only where the Go to rows show (terminal tabs
  decision 3 B). There, it shows only while the + of the Terminal tool
  takes a press: while the cloud computer runs, its terminal service
  opens more than one shell, and the workspace has fewer than 10
  terminals, as [Terminal tabs](terminal.md#terminal-tabs) says.
- A phone shows the + on its Terminal page, but its palette offers no New
  terminal, because a phone has no Go to rows.
- New terminal opens a terminal, as that + button does. It then shows the
  new terminal in the Terminal tool, also when another tool showed.
- Reason: the palette offers each control of an open workspace, as it
  offers New session beside the + of the sessions. A Go to row for each
  terminal was left out, because it switches terminals and opens none.
- On the All tab and on the Actions tab, the actions come in this order:
  1. While a workspace is open, its actions: New session, Session history,
     a Go to row for each tab of the right column, New terminal, Merge
     latest, Add to merge queue or Remove from queue, and Archive
     workspace. The Go to rows lead to All files,
     Changes, Checks, Terminal, and Preview. Desktop has no Go to row while
     the app hides it, as [Desktop](workspace-tools.md#desktop) says. An
     archived workspace offers only Session history and Restore workspace.
  2. The actions of the org: New workspace and New section.
  3. Create org, then a Switch to row for each other org of the person, in
     the order of the org rail.
  4. "Hide the sidebar" or "Show the sidebar", as the
     [sidebar toggle](org-rail-order.md#the-hidden-sidebar) says. This row
     shows on each page where the sidebar can show.
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
  opens New workspace, as the rest of the app does. Send feedback and
  Merge latest are the exceptions, as [Help](#help) and
  [Merge latest](#merge-latest) say.
- The palette does not offer Resume, the owner picker, Sign out, or the
  pull request actions. They stay where they are:
  - Resume shows on the stopped workspace itself.
  - The owner picker acts on a person.
  - Sign out sits in Account settings, which the Sign-in row opens.
  - A pull request action runs from the pull request bar, or from its key,
    as [Keyboard shortcuts](keyboard-shortcuts.md#commands) says.
- Merge latest is not an action of the pull request bar, so this rule
  does not cover it.
- Add to merge queue and Remove from queue are the exceptions among the
  pull request actions. The menus of a workspace offer them too, so the
  palette offers them, as
  [Commands](merge-queue-in-the-app.md#commands) says (decision 317).

## Merge latest

- The Merge latest row names its target branch, such as "Merge latest
  main". A click reads the stored workspace state to choose its prompt.
- The row sends a fixed prompt as an
  [agent action](github-banner.md#agent-actions) of the bar does (merge
  latest decision 1 A, 17 November 2026). Outside the queue, the prompt
  asks the agent to fetch the base branch from GitHub and merge it. When the branch
  already has each commit, the agent says so and stops. Otherwise it
  resolves each conflict, runs the tests, then commits and pushes.
- While the workspace is in the merge queue, the row names the branch
  selected by queue order. The prompt rebases this layer onto that branch,
  as
  [The prompts of a queued workspace](merge-queue-in-the-app.md#the-prompts-of-a-queued-workspace)
  says.
- It follows the rules of
  [Messages from the bar](messages-and-attachments.md#messages-from-the-bar).
- Reason: the agent does each step that changes code, on a fixed prompt
  (decision 220).
- These ways were rejected for merge latest decision 1:
  - The row puts the prompt into the message field as a draft. It then
    needs one more press, and no other agent action works that way.
  - The app runs the merge in the sandbox itself. It then needs a new
    runner message and a new way to name who pushed. Decision 220
    rejected this way for the bar.
  - The app asks GitHub to update the branch of the pull request. A branch
    without a pull request then gets nothing, and the sandbox stays behind
    GitHub.
- No control of the page offers Merge latest. It shows only in the
  palette, and it has a command of its own without a default key, as
  [the default keys](keyboard-shortcuts-keys.md#the-default-keys) say
  (merge latest decision 2 A, 17 November 2026).
- Reason: the bar shows one main action for each state (decision 220). A
  second control there needs its own design.
- A control on the page beside the palette row was rejected for merge
  latest decision 2. It needs a new mockup and a change of the bar.
- The row shows while the page shows the GitHub state of the branch. It
  shows only to a member who sees the agent actions of the bar, as
  [Agent actions](github-banner.md#agent-actions) says.
- An archived workspace and a workspace of a suspended org offer no
  Merge latest. A merged pull request offers none either. Reason: a merged
  branch continues from the target branch, as
  [Continue](continue.md) says.

## Help

- The Help group holds one action, Send feedback. It opens the
  [Feedback dialog](feedback.md#the-dialog) over the current page.
- The search words of Send feedback are "bug", "idea", "support",
  "contact", "help", and "report".
- Help is the last group of the Actions tab. On a page where the sidebar
  cannot show, no Window group shows, so Help comes after Orgs. On the All tab, Send
  feedback is the last action.
- Reason: feedback is about the product, not about a workspace, an org, or
  the window.
- Send feedback shows on each page where the palette opens, also without
  an org and in a suspended org. Reason: feedback changes no org.
- Send feedback is not a link, because the Feedback dialog has no address.
- Send feedback is an exception to three rules of the palette. The first
  two are rules of [Actions](#actions):
  - An action does what the same control does in the app. The app has no
    other control for feedback.
  - An action shows only where the current page offers it. The app offers
    Send feedback on each page.
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

- The Settings tab shows two groups. The first group holds the six tabs
  of the org settings: General, Repositories, Cloud computer, Agents,
  Secrets, and Members. Its label is the name of the org and "settings",
  such as "Acme settings".
- The second group, Account, holds five sections of [Account settings](settings.md):
  Sign-in, GitHub, Agents, Favourites, and New workspaces. It also holds
  Keyboard shortcuts, the fourth tab of Account settings.
- Favourites opens the Preferences tab, which holds the
  [Favourites section](model-favourites.md#the-favourites-section) above
  New workspaces. Its search words hold "favorites", the American
  spelling, and "model menu".
- A Favourites row that opens the model menu was rejected, because the
  menu adds no favourite, as
  [The model menu](model-favourites.md#the-model-menu) says.
- In the Mac app, the Account group also holds
  [This Mac](desktop-commands.md#saved-choices), the sixth tab, which only
  Account settings of the Mac app have.
- The Stats tab of Account settings has no row, as
  [Account stats](account-stats.md#where-the-tab-shows) says.
- The Deleted orgs section of Account settings has no row. Reason: it
  shows only while the person has a deleted org, and the palette treats a
  deleted org as absent.
- The Account group lists its rows in the order of Account settings
  (decision 198). It goes tab by tab, and in each tab in the order of its
  sections. So Favourites comes before New workspaces, Keyboard shortcuts
  follows New workspaces, and in the Mac app This Mac ends the group.
- Reason: the person already knows the order of the tabs, and a later row
  then has one clear place. A row in another place was rejected, because
  the group then leaves the order of the tabs.
- A row of the org settings opens its tab of Settings. A row of the
  Account group opens the tab of Account settings that holds its section.
