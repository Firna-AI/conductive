# Account stats

This doc holds the requirements and the decisions in force for the Stats
tab of the Account page, where a person sees counts of their own activity.
A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. "Account
stats decision" names a decision of the change that added the tab. The
[mockup catalogue](../mockups/catalogue.md) draws the tab at
`app/account/stats`.

## Where the tab shows

- The Account page has a fifth tab, Stats, after Keyboard shortcuts. Its
  address is `/account/stats` (account stats decision 1).
- Reason: the person sees their own activity next to their other account
  pages. A Stats page on the operator's page of a user was rejected,
  because only operators see it.
- The tab shows in every host and in every layout. In the Mac app, This Mac
  comes after it, so the tabs of a browser keep their places.
- The command palette has no row for the tab. Reason: the rows of the
  Settings tab of the palette hold settings, and Stats holds no setting.

## What the tab shows

- The tab shows only counts that the app already records for other needs
  (account stats decision 2). The app records nothing new for the tab,
  except the [merge record](#the-merge-record) (merge stats decision 1).
- Reason: the counts are then correct for all past work. A new record of
  each session and each turn was rejected, because its counts start only
  on the day it ships. A count from each workspace at read time was
  rejected, because each read then wakes every workspace of the person.
- So the tab shows no agent sessions, turns, tokens, or costs.
- It shows these counts of the person signed in:
  - The workspaces that the person owns, with the new ones of the last
    7 days.
  - The workspaces that run now.
  - The automations that the person owns.
  - The orgs of the person.
  - The workspaces by state, as
    [The workspaces by state](#the-workspaces-by-state) says.
  - The new workspaces of each UTC day of the last 30 days, with their
    total for the 30 days.
  - The automation runs of the person on each UTC day of the last 30 days,
    with their total for the 30 days.
- The 7 days are the 7 times 24 hours before the read.
- The 30 days are UTC days. The last of them is the current UTC day.
- A workspace counts for the person who owns it now. Reason: an admin can
  reassign a workspace, and the owner is the person who is responsible for
  it.
- A automation counts for its automation owner now.
- A automation run counts for the automation owner at the time of the run, in
  whose name the run acted. Reason: a later change of the automation owner then
  does not move past runs to another person.
- The automation runs leave out skipped runs, because a skipped run started no
  agent. [Automation runs](automation-runs.md) states when a run is skipped.
- The counts leave out deleted orgs and their workspaces and automations.
  Reason: the person can no longer open them.
- The counts include each org of the person, also a suspended org.

## The workspaces by state

- The tab shows the workspaces that the person owns in five rows, in this
  order: Running, Stopped, Failed, Archived, and Removed (decision 521).
- Running holds the [workspace states](workspace-life.md#workspace-states)
  starting, ready, working, needs input, and finished with unread output.
  Stopped holds the stopped state, and Failed holds the error state.
- Removed holds the
  [removed workspaces](workspace-life.md#removed-workspaces), with the mark
  of Archived. Archived holds the other archived workspaces.
- Each workspace that the person owns counts in one row. So the rows add
  up to the workspace total, and the total keeps the removed workspaces.
- Reason: the app keeps the data of a removed workspace, and it shows the
  workspace as Removed from the end of its Restore. The total then does
  not go down 14 days after each Archive.
- These ways were rejected (decision 521):
  - A removed workspace in the Archived row. The tab then counts as
    Archived a workspace that the app shows as Removed.
  - No removed workspace on the tab, as on the
    [screens of an org](orgs-and-members.md#sections). The total then goes
    down 14 days after each Archive.
  - A switch for each person between the Removed row and no removed
    workspaces. It needs a new saved choice of each person, with its save
    and its control.
  - No Removed row anywhere, so that the
    [Overview](operator-overview.md#the-counts) of the operator section
    and the page of an org also count a removed workspace as Archived. The
    operator then no longer sees the removed workspaces apart from the
    other archives.
- The rows, the 7 days, and the 30 UTC days of the tab are its own. Taking
  them from the Overview of the operator section was rejected
  (decision 521). Reason: a change of the Overview for the operator then
  changes the tab of each person without a decision.

## The merge record

- The app records each merged pull request of a workspace branch, for the
  Stats tab (merge stats decision 1). The user chose this on
  17 November 2026.
- Reason: the app keeps no other record of past merges with their times.
  A count from GitHub at each read was rejected, because it counts work
  outside the app and waits for GitHub. A count from the records that
  exist was rejected, because it misses most past merges and gives no
  merge days.
- A record holds the pull request, its org and workspace, the workspace
  owner at the time of the record, and the merge time from GitHub.
- A pull request counts once, also when two workspaces have its branch.
  The first record keeps it.
- A merge in the app and a merge on GitHub both count. A pull request
  that closed without a merge does not count. A later revert removes no
  merge.
- The app recovers no merge from before the release of the record (merge
  stats decision 2). The user chose this on 17 November 2026. Reason: a
  recovery wakes each workspace once and adds work.
- Deleting an org removes its records. Archive and the removal of a
  workspace keep them.
- [The merge record](github-banner.md#the-merge-record) of the GitHub
  banner says when the app records a merge.

## Reads

- The tab reads the counts each time that it opens. It keeps no history of
  the counts, and it has no Refresh.
- The counts read only the records that exist now. So the count of a past
  day can go down, for example after the purge of a deleted org.
- The read returns the counts of the person signed in only. It takes no ID
  of a person or an org.
- A failed read shows a notice with Try again and no number. Reason: a
  count that did not load is not zero.
