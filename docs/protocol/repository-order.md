# Repository order

This doc holds the requirements and the decisions in force for the order
of the chosen repositories of an org, and for the row menu of each chosen
repository. It belongs to
[Orgs and members](orgs-and-members.md), which covers orgs, sections,
roles, and the first run. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A repository-order decision number names a decision of the change
that adds this order. A row-remove decision number names a decision of
the change that adds Remove to the row menu. The pull request of each
change keeps its records.

- The chosen repositories of an org have one order, the same for each
  member. The user asked for it on 18 November 2026.
- The first repository of the order is the default repository of the org.
  New workspace picks it, as
  [Waiting repositories](new-workspace-notices.md#waiting-repositories)
  says. A new automation gets it, as [Automations](automations.md) says.
- The Repositories tab lists the chosen repositories in the order. The
  first row shows Default, for every person. The tab has no description
  of the order, because the Default label shows it. The user asked for
  this on 20 November 2026.
- The New workspace repository menu, the repository menu of an
  automation, and each other list of the chosen repositories follow the
  order. The agent tool list follows it too, as
  [Repositories](create-call-lists.md#repositories) says.
- Only an admin changes the order (decision 57). Other members see it
  read-only. Reason: the order sets the default of the whole org.
- An admin moves a chosen repository in three ways
  (repository-order decision 1 F):
  - A drag of its row. Its handle shows where it lifts. On a phone, a long
    press lifts the row. A press on the row menu starts no drag. The lifted row, its faint copy, and the line where it lands look
    like the drag of an org tile. Escape ends the drag, and the order
    stays as it was.
  - The row menu: Make default, Move up, and Move down. Make default moves
    the row to the top. On the first row, Make default and Move up are
    off. On the last row, Move down is off. A phone opens the menu as a
    sheet. The menu ends with Remove, as
    [Remove in the row menu](#remove-in-the-row-menu) says.
  - Alt and Up or Down, with no other modifier key, on a focused row. The
    focus stays on the row.
- After a move, a screen reader hears the name and the new place, such as
  "acme/web moves to place 1 of 3".
- Each move saves at once. A move starts no build, and the cloud computer
  does not change. Reason: the order is a setting of the app lists, not of
  the cloud computer.
- The moves show outside Edit only. Edit lists every repository that the
  GitHub App reaches, by name.
- A newly chosen repository goes to the end of the order. A repository
  that the org removes and adds again also goes to the end. So an add
  never changes the default.
- Create org saves its chosen repositories in the order of their names.
- A member sees an order that an admin changed at the next read of the
  list, as for a section move.

## Remove in the row menu

- The row menu of an admin ends with Remove, after a divider. The user
  asked for it on 24 November 2026. Remove is never off, also on the
  first and the only row. Reason: Edit removes these rows too.
- Remove opens a question that names the repository, such as "Remove
  acme/web?" (row-remove decision 1 E). It says what adding the
  repository again does not bring back:
  - New workspace no longer offers it.
  - Each active automation of the repository turns off, and only its
    owner can turn it on again, as [Automations](automations.md) says.
    The question gives the number of these automations, and leaves the
    sentence out when there is none. While the app does not know the
    number, the question says that each automation of the repository
    turns off, with no number.
  - On the first row, the question names the next repository, which
    becomes the default.
  - On the only row, the question says that no new workspace can start
    until an admin adds a repository.
- Remove in the question removes the repository at once, as Done removes
  it after Edit. The removal starts no build, as
  [Removed repositories](org-image-repositories.md#removed-repositories)
  says. Cancel, Escape, and a press outside change nothing.
- The question shows that the removal runs, and stays open, until the
  answer comes. A failed removal keeps the question and the row, and a
  toast gives the error.
- After a removal, the focus goes to the row that takes the place of the
  removed row, else to the row before it. When no row is left, Edit takes
  the focus. A screen reader hears that the repository is removed, such as
  "acme/web is removed".
- Reason: the admin alone cannot undo all of a removal. Adding the
  repository again puts it at the end of the order, and each automation
  stays off until its owner turns it on. So the question names these
  losses before anything saves.
- A removal at once, an Undo in a toast, and a Remove that opens Edit were
  rejected (row-remove decision 1 E). Reason: a slip then costs what the
  admin alone cannot undo, an Undo cannot turn the automations on again,
  and one menu item would open a whole mode. A question only for a
  removal that loses something was rejected too, because the admin then
  cannot predict when the app asks.
