# Delete org

This page belongs to [Orgs and members](orgs-and-members.md). It holds
the requirements and the decisions in force for Delete org, the 7 days
before the app deletes everything of the org, and the Restore of a
deleted org. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

- Delete org asks for the name of the org.
- It stops every sandbox of the org and hides the org at once
  (decision 30).
- The app deletes everything of the org after 7 days, unless an admin
  restores the org.
- Reason: the work of every member stays safe for 7 days, and a stopped
  sandbox costs no machine time.
- A delete at once was rejected, because an admin could then delete the
  unpushed work of a member.
- The delete also removes the saved snapshots of the org, with the org
  image.
- A deleted org leaves the org rail at once. Its other members cannot
  open it.
- For 7 days, the General tab of the Account page lists the deleted org
  for its admins, with Restore. The section shows only while the user has
  a deleted org.
- The address of a deleted org still opens its page, and that page also
  offers Restore. So an old link to the org is not a dead end.
- Reason: the faded tiles of deleted orgs stayed in the way after a
  delete, as the user said on 12 November 2026. A faded tile in the rail
  was the earlier rule. A new tab of the Account page was rejected,
  because it is empty on most days.
- Delete org then opens the next org that is not deleted, else Get
  started. Its question says that an admin restores the org from Account
  settings.
- A person whose orgs are all deleted counts as a person without an org.
  So the app opens Get started, as for a new person, and its org step
  offers Create org.
- While the person has a deleted org, Get started also lists it before
  its steps, with Restore, as the Account page does. Restore there opens
  the org. Without a deleted org, Get started shows no such list.
- Reason: a phone shows Get started without the rail, so it has no other
  way to the Account page. The user chose this on 13 November 2026.
  Opening the page of a deleted org, as before, was rejected, because a
  person who wants a new org then meets the deleted org first. A link to
  the Account page on the phone layout of Get started was rejected,
  because Restore then sits one page away from where the person lands.
- A suspended deleted org offers no Restore, in the Account page or on
  its page, because a suspended org refuses a restore.
- Restore brings the org back as it was. Its workspaces start again when
  they open. A workspace whose owner is suspended does not start, as
  [Operator actions](operator-actions.md#starts-stops-and-builds) says.
- The routines of a deleted org start no runs. After a Restore, each runs
  once for the schedule times that it missed, as
  [Suspensions and deleted orgs](routines.md#suspensions-and-deleted-orgs)
  says.
- An unfinished create continues when its workspace opens after Restore.
  It then gets a new start limit of 20 minutes, the limit of each start in
  [Time limits of builds and starts](workspace-life.md#time-limits-of-builds-and-starts).
  The workspace keeps its original creation date.
- Reason: the create makes no progress while its org is deleted.
