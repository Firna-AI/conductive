# Capabilities

This doc holds the requirements and the decisions in force for the
Capabilities control of New workspace and of each workspace. It covers the
control, its secrets part, and Mac access. It belongs to
[Secrets](secrets.md), which covers the secrets, their rights, and their
grants. The [mockup catalogue](../mockups/catalogue-secrets.md) draws the
control. The terms are those of [Secrets](secrets.md#terms) and of the
[architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says.

## The control

- New workspace has a small Capabilities icon, with its label on hover
  (secrets decision 6 G). It opens a control with two parts for now: the
  secrets to pre-approve, and Mac access.
- Reason: the icon keeps the page and the dialog plain, and later
  features, such as MCP servers, add their parts to the same control. A
  separate picker of secrets in New workspace was rejected for that
  reason.
- The create takes the choices of the control, as
  [The create](create-a-workspace.md#the-create) says.
- Each workspace shows the same icon beside its message box
  (secrets decision 8 B). Every member can see and change the
  pre-approvals and Mac access there.
- In a workspace, the control also lists each session approval, with its
  session, the member who allowed it, and the time. It lists each value
  for this workspace, with the member who gave it. Each of them has
  Remove.
- A value for 15 minutes is not in the list. It ends by itself.
- A secret for all agents shows as checked, with the words "All agents",
  and its checkbox does not change. The control links to the Secrets tab,
  or to Add a secret when the org has no secret.
- A change in the control applies to each session of the workspace from
  that moment.
- Reason: the control gives the undo of a wrong grant, and it keeps each
  capability of a workspace in one place. A control that only the
  workspace owner and the admins change was rejected, because every member
  can already allow a request in each session (secrets decision 4 B).


## Mac access

- Mac access is on in each new workspace, also in a workspace that an
  agent or an automation creates (secrets decision 9 A).
- Reason: the Mac app still asks before each command that its user did
  not always allow. So the switch only adds a stop, and each Mac still
  decides, as decision 62 says.
- While Mac access is off, the Worker refuses each Mac command request of
  the workspace, as [Mac commands](agent-tools.md#mac-commands) says.
- Mac access that starts off was rejected, in each new workspace and in a
  workspace that an agent or an automation creates. So was Mac access that a
  new workspace copies from the workspace that creates it. Reason: each
  of them adds a refusal to the behaviour of decision 62.
- A Mac access switch that each member keeps for each workspace was
  rejected, because one control would then have a shared part and a
  personal part.
- Risk: any member can turn Mac access on again after another member
  turned it off.
- Risk: an agent in a workspace with Mac access off can create a new
  workspace, where Mac access is on. The first turn there has the same
  sender, so its requests reach the Mac of that sender.
- Risk: a run workspace starts with Mac access on, and the automation owner
  sends its first turn. So text that steers the agent of a run can ask for
  a command on the Mac of the owner. A command that the owner always
  allowed then runs with no question, as
  [The choices](desktop-commands.md#the-choices) says.
