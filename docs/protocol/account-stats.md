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
  (account stats decision 2). The app records nothing new for the tab.
- Reason: the counts are then correct for all past work. A new record of
  each session and each turn was rejected, because its counts start only
  on the day it ships. A count from each workspace at read time was
  rejected, because each read then wakes every workspace of the person.
- So the tab shows no agent sessions, turns, tokens, or costs.
- It shows these counts of the person signed in:
  - The workspaces that the person owns, with the new ones of the last
    7 days.
  - The workspaces that run now.
  - The routines that the person owns.
  - The orgs of the person.
  - The workspaces by state: Running, Stopped, Failed, and Archived. They
    add up to the workspace total.
  - The new workspaces of each UTC day of the last 30 days, with their
    total for the 30 days.
  - The routine runs of the person on each UTC day of the last 30 days,
    with their total for the 30 days.
- The states, the 7 days, and the 30 UTC days are those of
  [The Overview](operator-section.md#the-overview) of the operator section.
- A workspace counts for the person who owns it now. Reason: an admin can
  reassign a workspace, and the owner is the person who is responsible for
  it.
- A routine counts for its routine owner now.
- A routine run counts for the routine owner at the time of the run, whose
  logins the run used. Reason: a later change of the routine owner then
  does not move past runs to another person.
- The routine runs leave out skipped runs, because a skipped run started no
  agent. [Routine runs](routine-runs.md) states when a run is skipped.
- The counts leave out deleted orgs and their workspaces and routines.
  Reason: the person can no longer open them.
- The counts include each org of the person, also a suspended org.

## Reads

- The tab reads the counts each time that it opens. It keeps no history of
  the counts, and it has no Refresh.
- The counts read only the records that exist now. So the count of a past
  day can go down, for example after the purge of a deleted org.
- The read returns the counts of the person signed in only. It takes no ID
  of a person or an org.
- A failed read shows a notice with Try again and no number. Reason: a
  count that did not load is not zero.
