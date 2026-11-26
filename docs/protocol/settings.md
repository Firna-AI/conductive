# Settings

This doc holds the requirements and the decisions in force for Settings,
the one place for the settings of the person and of an org. A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. "Settings
decision" names a decision of the change that made Settings one place.
The [mockup catalogue](../mockups/catalogue.md) draws Settings at
`app/account`, `app/org-settings`, and `app/settings`.

## Terms

- **Settings:** the dialog of a desktop, or the screens of a phone, that
  hold Account settings and the org settings.
- **Account settings:** the Account group of Settings. Its tabs hold what
  every org of the person shares.
- **Org settings:** the group of Settings with the name of an org. Its
  tabs hold the settings of that org.
- **Tab:** one row of the list of Settings, and the content that it shows,
  such as Agents or Secrets. A tab holds sections, such as the Sign-in
  section of General.

## One place

- Settings holds Account settings and the org settings in one place
  (Settings decision 1 D).
- Reason: the person asked for one place that ⌘, opens, because ⌘, opened
  only the account. Two pages, each with its own list, were rejected,
  because they keep two places.
- Account settings come first, with the tabs General, Agents,
  Preferences, Keyboard shortcuts, and Stats. The Mac app adds This Mac
  as their last tab, as
  [Desktop commands](desktop-commands.md#saved-choices) says.
- The org settings follow, under the name of the org, with the tabs
  General, Repositories, Cloud computer, Agents, Secrets, and Members.
- The org of the org settings is the org of the page below Settings. On a
  page without an org, it is the org that the
  [command palette](command-palette.md) works on.
- A person without an org sees only Account settings.
- A member who is not an admin sees each tab of the org settings, with
  the edit actions that [Orgs and members](orgs-and-members.md) and
  [Secrets](secrets.md) give a member. A suspended org shows its notice
  above each tab of its org settings, and nobody changes its settings.
- Whether Settings also offers other orgs is open (Settings decision 2).
  Until the person answers, Settings shows only the one org above.

## On a desktop

- On a desktop, Settings is a dialog over the whole window, the rail and
  the sidebar too (Settings decision 1 D).
- Reason: the person chose the dialog over a page with the list in place
  of the sidebar, and over a page with the list beside the sidebar.
- The list of the tabs fills the left column of the dialog, in its two
  groups. The open tab fills the rest, under a bar with the name of the
  tab, the name of its group, and Close.
- The dialog lies over the page that the person last showed in the tab of
  the browser or the window of the Mac app.
- An address of Settings that opens first in its tab shows the dialog
  over the workspace list of the org of the org settings. With no org, it
  shows the dialog over Get started.
- Close and Esc close the dialog and show the page below at its address.
- While the dialog is open, only Esc and the keys of the fields and the
  dialogs of its tabs work. Reason: the layer rule of
  [Keyboard shortcuts](keyboard-shortcuts.md) gives the keys to the open
  dialog only. So ⌘, does nothing while the dialog is open.
- A dialog that a tab opens, such as Delete org, lies over Settings.

## On a phone

- A phone shows Settings as screens, not as a dialog. Reason: a dialog
  with two columns does not fit a phone, and New workspace also opens as
  a page there.
- The first screen lists the tabs in their groups, and its way back opens
  the workspace list.
- Each row opens its tab as a screen of its own, with the name of the tab,
  the name of its group, and a way back to the list.

## Addresses

- Each tab keeps its own address. Reason: links, palette rows, and
  bookmarks keep working.
- The tabs of Account settings are at `/account`, `/account/agents`,
  `/account/preferences`, `/account/shortcuts`, `/account/stats`, and, in
  the Mac app, `/account/this-mac`.
- The tabs of the org settings are at `/orgs/<org>/settings`,
  `/orgs/<org>/settings/repositories`,
  `/orgs/<org>/settings/cloud-computer`, `/orgs/<org>/settings/agents`,
  `/orgs/<org>/settings/secrets`, and `/orgs/<org>/settings/members`.
- `/settings` shows the list on a phone, and Account › General on a
  desktop. Reason: `/account` already means Account › General.
- A row of the list opens the address of its tab.

## Ways in

- The avatar of the rail opens Account › General.
- The Settings cog of the sidebar opens the General tab of its org.
- The Account row of the org switcher of a phone opens the list at
  `/settings`.
- The command Settings, with the keys ⌘, on a Mac and Ctrl+, elsewhere,
  opens Account › General. Its target is open (Settings decision 3).
  Until the person answers, it keeps this target in every layout.
- A row of the Settings tab of the
  [command palette](command-palette-actions.md#settings) opens the tab
  that holds its section.
