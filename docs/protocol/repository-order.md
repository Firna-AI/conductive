# Repository order

This doc holds the requirements and the decisions in force for the order
of the chosen repositories of an org. It belongs to
[Orgs and members](orgs-and-members.md), which covers orgs, sections,
roles, and the first run. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A repository-order decision number names a decision of the change
that adds this order. The pull request of that change keeps its record.

- The chosen repositories of an org have one order, the same for each
  member. The user asked for it on 18 November 2026.
- The first repository of the order is the default repository of the org.
  New workspace picks it, as
  [Waiting repositories](new-workspace-notices.md#waiting-repositories)
  says. A new automation gets it, as [Automations](automations.md) says.
- The Repositories tab lists the chosen repositories in the order. The
  first row shows Default, for every person. The tab says that new
  workspaces and automations start in the first one, and that new
  workspaces start in the next ready one while it waits for a build.
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
    sheet.
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
