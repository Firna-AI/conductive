# The catalogue: Archive and Restore

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives `app/archive` and its child pages.
[Orgs and members](orgs-and-logins.md#orgs-and-members) gives who may
archive and restore a workspace, and
[the design of the workspace](design-workspace.md) gives the bar.

`app/archive` draws Archive and Restore of Checkout address autocomplete,
from decisions 1 and 2 of PR #138, and the removal of an archived workspace
after its 14 days, from decisions 518 D, 519 B, and 520 A of 13 November
2026. Its canonical screen has the archived workspace, whose bar gives the
last day of Restore, with Restore, and says that the workspace leaves the
list on that day. Its child pages:

- `app/archive/just-archived` has the workspace just after Archive from the
  pull request bar, with the toast, the day when the workspace leaves the
  list, and Restore. Archive on a row and in the palette leads there too.
- `app/archive/group` has the list with the Archived group open, and
  Restore on the hover of a row. The group holds only the workspaces of the
  last 14 days, so it has no row for Postcode lookup for the shipping and
  billing forms.
- `app/archive/restored` has the workspace back in its section, stopped,
  where Restore leads from each archived workspace on the cloud computer.
  The catalogue draws no restored workspace on an own computer, so Restore
  there has no link.
- `app/archive/pending` has the archived workspace while an unresolved
  create request, or a delete that tries again, can still hold a cloud
  computer that the workspace does not name, as after Archive during a
  first start. The bar promises only the chat history, offers no Restore,
  and gives the day when the workspace leaves the list.
- `app/archive/no-computer` has the archived workspace after the app
  deleted its cloud computer, as after a failed first start. The bar offers
  no Restore, and it still gives the day when the workspace leaves the
  list.
- `app/archive/removed` has Postcode lookup for the shipping and billing
  forms, `W-372`, after its 14 days, as its chip in `app/workspace-links`
  opens it. The list has no row for it, the bar gives the day of the
  removal, and the cloud computer is deleted. Its `deleting` variant has the
  same workspace on that day, while a failed delete of its cloud computer
  tries again. The same bar shows while an unresolved create request can
  still hold a cloud computer after the 14 days. The flow
  `user-flows/open-a-removed-workspace` goes from the chip to this page.
- `app/archive/computer-removed` has Checkout address autocomplete,
  archived on old-runner, an own computer that an admin removed from Acme.
  The bar says that the files stay on old-runner, gives the day when the
  workspace leaves the list, and gives no day of a delete. Nothing offers
  Restore, which is the recommendation while Cal has not chosen yet.
  Its `removed` variant has the same workspace after its 14 days,
  with the bar "Removed on" and the same words of the files.
  [Own computers](catalogue-own-computers.md) gives the decisions.
