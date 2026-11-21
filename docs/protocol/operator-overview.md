# Operator section: the Overview

This doc holds the requirements and the decisions in force for the
Overview, the first tab of the operator section. It covers the live
counts and the long runs of cloud computers. It belongs to
[Operator section](operator-section.md), which covers the access, the
other tabs, and the pages of an org and a user. The terms are those of
the [architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue-operator.md) draws the Overview at
`app/operator` and `app/operator/long-runs`.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A long runs
decision number, such as long runs decision 1, names the dated record of
one decision of the change that adds Long runs. Its plan keeps these
records while the change is open. Its pull request keeps them after the
merge.

## The read

- The Overview reads live counts across every org each time it opens, and
  again on Refresh (decision 144). It reads the long runs at the same
  time.
- It keeps no history of the counts or of the runs, and it shows no costs.
- A failed read shows no number and no long runs. Try again reads them
  again. Reason: a count that did not load is not zero, and a list that
  did not load is not empty.

## The counts

- The Overview shows these counts:
  - The users, the orgs, and the workspaces, each with the new ones of the
    last 7 days.
  - The people who wait, in a line under the users. The line opens the
    Waitlist tab (decision 160). As that tab does, the count leaves out
    suspended people.
  - The cloud computers that run now, for the Running workspaces and for
    each unfinished build or refresh of an org image.
  - The workspaces by state: Running, Stopped, Failed, Archived, and
    Removed. They add up to the workspace total.
  - The new workspaces and the new users of each UTC day of the last 30
    days, each with its total for the 30 days.
  - The five orgs with the most workspaces. Their counts hold every
    workspace, also the archived and the removed ones.
- A build that waits runs no cloud computer, so the count of cloud
  computers that run now leaves it out until its wait ends. This covers a
  build of an admin that waits for a switch build, as
  [What members see](switch-account.md#what-members-see) says. A switch
  build that runs counts as each build does.
- The count of users keeps every account, by join day, also each person
  who waits. Reason: decision 144 chose the counts, and the two numbers
  still show who can use the app.
- Running holds the
  [workspace states](workspace-life.md#workspace-states)
  starting, ready, working, needs input, and finished with unread output.
  Failed holds the error state. Removed holds the
  [removed workspaces](workspace-life.md#removed-workspaces), with the mark
  of Archived, and Archived holds the other archived workspaces.
- Reason: the app keeps the data of a removed workspace, so the operator
  sees it. Its row keeps it apart from the archives that the lists show.
- The 7 days are the 7 times 24 hours before the read.
- The 30 days are UTC days, so that the counts need no time zone of the
  operator. The last of them is the current UTC day.
- The counts read only the records that exist now. So the count of a past
  day can go down, for example after the purge of a deleted org or a
  failed first start.
- The counts include a deleted org and its workspaces while their records
  exist. Only the five largest orgs leave out a deleted org.
- Among the five largest orgs, a tie goes in the order of the org names.
- The Overview lists no suspensions (decision 148). The Orgs and Users
  tabs find a suspended org or user. A long run of a suspended org or
  owner still shows its mark, as [Long runs](#long-runs) says.

## Long runs

- Long runs lists the workspaces whose cloud computers have run the
  longest since their last start (long runs decision 1). A start is a
  create or a resume, as the [architecture doc](../architecture.md#terms)
  says.
- A run of a workspace begins at the last start of its cloud computer. Its
  run length is the time since that start.
- Reason: the user asked on 16 November 2026 how long each cloud computer
  has run. Activity or a turn can keep a cloud computer running for days,
  as [Stop and resume](workspace-life.md#stop-and-resume) allows.
- These ways were rejected (long runs decision 1):
  - The idle time of each running workspace. It shows no run length, and
    it misses a run that activity keeps alive.
  - A read of the running cloud computers and their costs from the
    [provider](workspaces-and-sandboxes.md#the-provider). It adds a route
    of the provider, and the costs that decision 144 left out. It also
    gives no exact start.
  - A history of the runs. The Overview keeps no history (decision 144),
    and a history needs a rule for how long it stays.
- Long runs is a part of the Overview, below the workspaces by state. A
  tab of its own was rejected, because it changes the tabs that decisions
  147 and 160 chose.
- The list holds only Running workspaces, as [The counts](#the-counts)
  defines Running. So it leaves out each archived, stopped, or failed
  workspace.
- It also leaves out the cloud computers of org image builds, refreshes,
  and software image builds. Reason: each of them stops at its time limit
  of 60 minutes.
- The list shows up to 10 runs, the longest first. Runs with the same
  start go in the order of their workspace IDs.
- The list has no minimum run length. Reason: the longest runs come first,
  so the list needs no limit of its own.
- Each row gives:
  - the org name, with a Deleted or Suspended mark when the org is deleted
    or suspended
  - the GitHub login of the workspace owner, with a Suspended mark when
    the owner is suspended
  - the workspace number, such as `W-12`
  - the cloud computer ID, with Copy
  - the last activity, from which the
    [stop time](stop-and-resume.md#the-stop) counts
  - the run length, with the state mark of the workspace
- A deleted org shows Deleted, also when it is suspended.
- A run whose cloud computer has no ID yet shows a dash in place of the
  ID, and no Copy.
- With Copy, the operator can search for the cloud computer on the
  [Orgs tab](operator-section.md#orgs-and-users), or in the tools of the
  provider.
- The state mark gives the shape and the word of the state.
  [Workspace states](workspace-life.md#workspace-states) requires a shape
  of its own for each state.
- No row names its workspace. Reason: an agent can write that name from
  the chat, which
  [What the section shows](operator-section.md#what-the-section-shows)
  keeps out of the section.
- The org name opens the page of the org, also when the org is deleted.
  The login opens the page of the user.
- The list keeps the run of a deleted or suspended org, and of a suspended
  owner, while its cloud computer runs. Reason: a deletion or a suspension
  must stop these cloud computers, so these runs need the operator most.
- On a phone, a row keeps the org and the run length with the state mark.
  For a suspended owner, the login and the Suspended mark also show under
  the org. Reason: a phone has no owner column, and a mark without the
  login reads as the state of the org.
- The rows have no Stop action. Reason: a Stop is a new operator action,
  which needs its own decision.
  [Suspend](operator-section.md#suspend-and-lift-on-a-page) on the page of
  an org or a user already stops its cloud computers.
- An empty list says "The workspaces with the longest runs show here." It
  does not say that no cloud computer runs. Reason: the cloud computers
  that run now also include the builds, which the list leaves out. A run
  without a known start does not show either.

## The start of a run

- For the list, the app keeps only the start of the current run of each
  workspace. It keeps no past run.
- The list follows the app's record of each workspace. It reads nothing
  from the provider.
- A run shows only when that record holds its start. The list never shows
  a guessed start, such as the time of a release.
- So a workspace that already ran at the release of the list joins it when
  the app next records its state. In an org that is not deleted, that
  takes up to the stop time, or up to 5 minutes during a turn.
- A cloud computer that the provider stopped can still show for up to
  about the stop time, until the app finds the stop.
- A cloud computer that runs while that record says stopped does not
  show. An example is the restart near day 14 of a stop.
