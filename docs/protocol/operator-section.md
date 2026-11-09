# Operator section

This doc holds the requirements and the decisions in force for the
operator section. In this part of the web app, an operator sees the whole
app and acts on one org or one user (decision 142).
[Operator actions](operator-actions.md) states who is an operator, and
what a suspension and a lift do. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Access

- Only an operator sees and opens the section. The `OPERATOR_GITHUB_IDS`
  setting of the Worker lists the operators, as
  [The operator](operator-actions.md#the-operator) says.
- The section lives in the web app at `/operator`, behind the sign-in and
  the gate of the app.
- A hosted tool for internal pages and a hostname of its own were
  rejected (decision 142). A hosted tool gives user data to a third party.
  A hostname of its own needs a second gate and a second sign-in.
- An operator opens the section from the rail, above the account. On a
  phone, the operator opens it from the org switcher, under Account.
  Other people see no link to it.
- A signed-in person who is not an operator gets the not-found page of the
  app at `/operator`, as at any unknown address (decision 146).
- A page that says that the section is for operators was rejected,
  because it tells every user that the section exists.
- Each request of the section is an operator request. So everyone else
  gets HTTP 403 with the code `operator_required`, as
  [The operator](operator-actions.md#the-operator) says.
- The section changes no setting of the app (decision 143). It cannot
  change who is an operator. Reason: a stolen session of an operator then
  cannot add an operator.

## What the section shows

- The section has the tabs Overview, Orgs, and Users (decision 147).
- The section shows only counts, names, IDs, dates, roles, and states. It
  shows no chat, file, env value, agent login, or email address. Reason:
  the section then holds the least personal data.

## The Overview

- The Overview reads live counts across every org each time it opens, and
  again on Refresh (decision 144). It keeps no history of the counts, and
  it shows no costs.
- It shows these counts:
  - The users, the orgs, and the workspaces, each with the new ones of the
    last 7 days.
  - The cloud computers that run now, for the Running workspaces and for
    each unfinished build or refresh of an org image.
  - The workspaces by state: Running, Stopped, Failed, and Archived. They
    add up to the workspace total.
  - The new workspaces and the new users of each UTC day of the last 30
    days, each with its total for the 30 days.
  - The five orgs with the most workspaces, archived workspaces included.
- Running holds the
  [workspace states](workspace-life.md#workspace-states)
  starting, ready, working, needs input, and finished with unread output.
  Failed holds the error state.
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
  tabs find a suspended org or user.
- A failed read shows no number. Try again reads the counts again. Reason:
  a count that did not load is not zero.

## Orgs and Users

- The Orgs tab searches every org by its name or its org ID. It also finds
  the org of a cloud computer ID or of a preview address (decision 147).
- It finds each preview address and each cloud computer ID that the app
  still has a record of. This covers a preview that is open or closed, and
  a cloud computer that runs or not.
- Reason: an abuse report names a cloud computer or a preview address, as
  [The operator](operator-actions.md#the-operator) says. The report can
  come after the preview closed.
- The Users tab searches every user by GitHub login, name on GitHub, or
  numeric GitHub ID (decision 147).
- With no search, each tab lists the newest first, 20 at a time, with Show
  more (decision 147). A search lists its matches in the same way.
- Each org and each user has a page in the section.
- The page of an org gives its ID, its creation day, and the number of
  its repositories. It also gives its workspaces by state and its cloud
  computers that run now, as the Overview counts them. It lists the
  members, each with their name on GitHub and their role
  (decisions 147 and 149).
- The page of a user gives the GitHub login, the name on GitHub, the GitHub
  ID, and the join day. It gives the number of workspaces that the user
  owns, and how many of them run now. It lists the orgs of the user, each
  with the role of the user (decisions 147 and 149).
- An account with no name on GitHub shows its login and no name
  (decision 149).
- The page of a suspended org or user shows the suspension, with its time
  and its operator. The page of a deleted org shows the deletion.

## Suspend and Lift on a page

- The page of an org or a user has Suspend. When the org or the user is
  suspended, Lift takes its place (decisions 145 and 147).
- [Suspend a user](operator-actions.md#suspend-a-user),
  [Suspend an org](operator-actions.md#suspend-an-org), and
  [Lift a suspension](operator-actions.md#lift-a-suspension) state what
  each action does.
- Each action asks first. The question before a suspension says what stops
  and what the members keep. It also says that a stopped workspace then
  gets no restart near day 14, so that its files can be deleted.
- The question before a lift says what comes back. It also says that a
  workspace that stopped 14 days ago or more may have lost its files.
- On the page of the operator's own account, the question before a
  suspension warns that the operator is then signed out. It also warns
  that another operator must lift the suspension. The page still allows
  it, because a warning is enough.
- The page of a deleted org still has Suspend, as
  [Suspend an org](operator-actions.md#suspend-an-org) allows.
- After a suspension, the page shows the suspension and the number of
  cloud computers that are still stopping. The reply of the suspension
  names them, as [Suspend a user](operator-actions.md#suspend-a-user)
  says.
