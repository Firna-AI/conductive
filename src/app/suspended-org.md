# A suspended org

The [web app README](README.md) links here. The operator can suspend an
org. [Operator actions](../../docs/protocol/operator-actions.md) states the
rules. This page gives how the app knows of a suspension and what its
screens show.

## What the app knows

- The org list reads `suspension` of each org summary. The app keeps the
  summary as the server sends it.
- A request of an org that the API refuses with `org_suspended` also marks
  the org. `AppModel.refusedOrgs` holds the IDs of such orgs. A refusal
  gives no time of the suspension, so it changes no summary. So a page with
  an old org list shows the suspended org at once.
- The client of `OrgModel` reports each such refusal. `noteOrgRefusals` in
  `suspension.ts` wraps it. The kept chat of a workspace uses the same
  client. So do the rename, the delete, the restore, and the leave of an
  org in `AppModel`. The create of an org and the account actions use the
  client of the app.
- `OrgModel.suspension.suspended` follows the summary and the refusals.
  `useOrgAccess` in `../shell/context.ts` gives a screen the role of the
  person and the suspension. `permissions.ts` holds the rules:
  `mayChangeSettings`, `showsAdminOnly`, and `mayArchive`.
- A workspace of a suspended org sends no Resume, no read mark, and no
  activity. An `org_suspended` refusal stays after an owner change. Only a
  `user_suspended` refusal ends with a new owner.
- `AppModel.leaveOrg` sends the leave, the one write that a suspended org
  takes, and takes the org out of the list. The API refuses the leave of
  the last active admin with `last_admin`.

## What the screens show

- The list shows the notice of the org: at the top of the list page, and
  in the main area of a wide desktop. It has no New workspace, no section
  menu, and no drag. A section collapses in this view only.
- The rail names the org as suspended.
- The settings show the notice above each tab. Each tab is read-only, also
  for an admin, and General has no Delete org. A save that the API refuses
  with `org_suspended` closes the open forms of the tab, and a toast tells
  what was not saved.
- General offers Leave org to a person whom the last-admin rule lets
  leave: a member who is not an admin, or an admin while the members list
  another admin. The question counts the person's workspaces from the
  list. A `last_admin` refusal shows words that name no step that the
  suspended org refuses.
- A deleted org that is also suspended shows the notice of the org above
  the day of the delete, and offers no Restore. A Restore that the API
  refuses with `org_suspended` gives the same page at once.
- New workspace shows the refused bar in place of the composer.
- A workspace shows the refused bar of the org in place of the composer,
  also while the stop of its cloud computer runs. The files and the tools
  show the refused state. Resume and Archive do not show. An archived
  workspace keeps its bar, with the notice of the org above it.
- The chat shows its history read-only, as
  [the chat README](../chat/README.md#rules-for-this-code) says.

## Development

`?suspended=1` suspends Acme in the dev fake. Each write of Acme gets
`org_suspended`, except a leave. A leave of the only admin gets
`last_admin`.
