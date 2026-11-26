# Capabilities

This doc holds the requirements and the decisions in force for the
Capabilities control of New workspace, of each workspace, and of an
automation. It covers the control, its secrets part, and the control of an
automation. [Mac access](mac-access.md) covers the Mac access part of the
control in the Mac app. This doc belongs to [Secrets](secrets.md), which
covers the secrets, their rights, and their grants.
[Capabilities: what agents learn](capabilities-agents.md) covers what
agents learn of the capabilities. The
[mockup catalogue](../mockups/catalogue-secrets.md) draws the control. The
terms are those of [Secrets](secrets.md#terms) and of the
[architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. An automation capabilities
decision number names a decision of the change that adds Capabilities to
automations, as [Automations](automations.md) says.

## The control

- New workspace has a small Capabilities icon, with its label on hover
  (secrets decision 6 G). It opens a control with two parts for now: the
  secrets to pre-approve, and, in the Mac app, Mac access.
- Reason: the icon keeps the page and the dialog plain, and later
  features, such as MCP servers, add their parts to the same control. A
  separate picker of secrets in New workspace was rejected for that
  reason.
- The create takes the secrets that the control pre-approves, as
  [The create](create-a-workspace.md#the-create) says. It does not take
  the Mac access switch, which starts a grant on this Mac after the create,
  as [Mac access](mac-access.md) says.
- Each workspace shows the same icon beside its message box
  (secrets decision 8 B). Every member can see and change the
  pre-approvals there.
- In the Mac app, the Mac access part has one switch for this Mac, as
  [The switch](mac-access.md#the-switch) says. Each member sees and changes
  only the state of their own Mac. A browser shows no Mac access part.
- In a workspace, the control opens from the message box of one session.
  Under "This session", it lists each session approval of that session,
  with the member who allowed it and the time. It lists each value for
  this workspace, with the member who gave it. Each of them has Remove.
- The control does not list the session approvals of other sessions. A
  member opens a session to see or remove its approvals. A closed session
  opens again from History.
- The control does not list a session approval whose secret the workspace
  already allows, by a pre-approval or by the mark for all agents. The
  approval stays. It shows again when that wider grant ends.
- Reason: a session approval covers one session only, so it shows in that
  session. An approval that a wider grant covers changes nothing while
  that grant lasts. A list of the approvals of every session was
  rejected, because members read it as approvals for the whole workspace.
- A value for 15 minutes is not in the list. It ends by itself.
- A secret for all agents shows as checked, with the words "All agents",
  and its checkbox does not change. The control links to the Secrets tab,
  or to Add a secret when the org has no secret.
- The secrets part has no hint line, except in the control of an
  automation. Each secret shows its name and checkbox, with an info icon
  after the name (Cal, 20 November 2026). The description shows only in
  the info box of the icon, never in the row. The box floats under the
  icon. A mouse on the icon opens it, and a press, also a tap on a phone,
  keeps it open until a second press. A secret without a description
  shows no icon.
- Reason: one line for each secret fits more secrets in the small card.
  The box stays inside the card, because a press outside the card closes
  it.
- When the org has more than ten secrets, a Search secrets field shows
  above them (Cal, 20 November 2026). It narrows the list to the secrets
  whose name or description holds the search, with case ignored. A search
  that matches no secret says so. A secret that the search hides keeps
  its check. The control of an automation has the same search.
- Reason: the control is a small card, so a long list needs a scroll to
  find one secret. A member often knows what a secret is for, not its
  name, so the search also reads the description.
- A change in the control applies to each session of the workspace from
  that moment.
- Reason: the control gives the undo of a wrong grant, and it keeps each
  capability of a workspace in one place. A control that only the
  workspace owner and the admins change was rejected, because every member
  can already allow a request in each session (secrets decision 4 B).

## The control of an automation

- The automation page has the same Capabilities icon, in the bar of its
  prompt box before the model picker (automation capabilities decision
  1 A).
- Reason: one control keeps each capability in one place, and later parts
  can join it (secrets decision 6 G).
- Only the owner of the automation gets the icon and opens the control.
  Reason: only the owner changes an automation, as
  [Access](automations.md#access) says.
- Its control has only the secrets part. The checked secrets there are the
  [chosen secrets](automations.md#chosen-secrets) of the automation, which
  each run workspace starts with as pre-approvals.
- The line under its title says "What agents in each run can use." The
  hint of its secrets part says "Each run workspace starts with the
  checked secrets pre-approved, so agents use them with no question."
- Reason: a check acts on each later run workspace, not on a workspace
  that exists.
- The secrets part shows the secrets of the org and its links, as in New
  workspace. A secret for all agents shows as checked, with the words "All
  agents".
- A check changes the form of the automation, so Save turns on. Save
  stores the chosen secrets with the other fields.
- The control differs from the control of New workspace in the Mac app:
  it has no Mac access part (automation capabilities decision 2 A). So a
  run workspace starts with no grant on any Mac. Its agents can still ask
  for a command on a Mac, as
  [Agents can always ask](mac-access.md#agents-can-always-ask) says.
- Reason: no person watches the Mac of the owner during a run. A Mac
  access switch on the automation would start a grant on that Mac for each
  run workspace. So text that steers the agent of a run could run every
  command there with no question.
- As in New workspace, the control lists no session approval and no value
  for this workspace.
- Every other member reads the chosen secrets in a line under the prompt,
  as [The automation pages](automations.md#the-automation-pages) says.

## Mac access

[Mac access](mac-access.md) states the Mac access part of the control in
the Mac app: its switch, the grant that it starts on this Mac, and the
requests that agents can always send. It also states the risks of Mac
access.

## What agents learn

[Capabilities: what agents learn](capabilities-agents.md) states the
facts of a session that its agent learns. It also states the change note
that tells the agent and the members of each later change.
