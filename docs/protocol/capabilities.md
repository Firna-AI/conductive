# Capabilities

This doc holds the requirements and the decisions in force for the
Capabilities control of New workspace, of each workspace, and of an
automation. It covers the control, its secrets part, the control of an
automation, and Mac access, with the line that allows all commands on a
Mac. It belongs to [Secrets](secrets.md), which covers the secrets, their
rights, and their grants. The
[mockup catalogue](../mockups/catalogue-secrets.md) draws the control. The
terms are those of [Secrets](secrets.md#terms) and of the
[architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. An automation capabilities
decision number names a decision of the change that adds Capabilities to
automations, as [Automations](automations.md) says. A Mac access decision
names a decision of the change that makes Mac access allow all commands.
Its plan keeps the dated record while the change is open. Its pull request
keeps it after the merge.

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
- In the Mac app, the Mac access part also has a line for the Mac of each
  member, as
  [Allow all commands on this Mac](#allow-all-commands-on-this-mac) says.
  Each member sees and changes only the line of their own Mac.
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
- The control differs from the control of New workspace: it has no Mac
  access part. Reason: each run workspace keeps Mac access off
  (automation capabilities decision 2 A).
- As in New workspace, the control lists no session approval and no value
  for this workspace.
- A Mac access switch on the automation was rejected. No person watches
  the Mac of the owner during a run, so text that steers the agent could
  run each command that the owner always allowed.
- A switch that turns on Mac access in each run workspace was rejected
  too, because each later member who sends a message there would expose
  their own Mac.
- Every other member reads the chosen secrets in a line under the prompt,
  as [The automation pages](automations.md#the-automation-pages) says.

## Mac access

In this section, a grant is a grant of a Mac, as
[The choices](desktop-commands.md#the-choices) says. It runs every command
from one workspace on one Mac with no question, for 15 minutes or until
Stop. It is not a grant of a secret.

### The switch

- Mac access is off in each new workspace, also in a workspace that an
  agent or an automation creates (secrets decision 18 A). A member turns
  it on in the Capabilities of the workspace, or in the Capabilities of
  New workspace before the create.
- Reason: agents can reach a Mac only after a member chooses it for the
  workspace. So text that steers an agent cannot reach a Mac through a
  new workspace or through an automation run.
- Mac access was turned off one time in each workspace that existed
  before this rule, also where a member had turned it on (secrets
  decision 19 B). Reason: the switch was new, so few members had chosen
  its value themselves.
- Keeping Mac access on in the workspaces that existed then was rejected,
  because they kept a default that no member chose.
- While Mac access is off, the Worker refuses each Mac command request of
  the workspace, as [Mac commands](agent-tools.md#mac-commands) says
  (Mac access decision 2 A).
- Agents that can always ask, with the question of the Mac as the only
  check, were rejected. Reason: an automation run or a steered agent could
  then ask from its first turn.
- While Mac access is on, the Mac app asks before each command, unless
  Always allow or a grant covers the command, as
  [The choices](desktop-commands.md#the-choices) says.
- Mac access that starts on in each new workspace was rejected, because
  agents could then reach a Mac before a member chooses it. Mac access
  that is on for workspaces that members create, and off only for
  workspaces that agents and automations create, was rejected. Reason: one rule for every new
  workspace is simpler, and the risk of a steered agent is the same.
- Mac access that a new workspace copies from the workspace that creates
  it was rejected, because a workspace that an agent creates could then
  reach a Mac with no member's choice.

### Allow all commands on this Mac

- In the Mac app, turning Mac access on also starts a grant until Stop of
  the workspace on that Mac (Mac access decision 1 C). The Macs of the
  other members still ask.
- Reason: the user asked that the switch also stops the questions on the
  Mac of the member who turns it on. A switch that only lets agents ask,
  with a clearer hint, was rejected for that reason. So was no change,
  with Allow all commands until I stop at the first question. An offer of
  the grant at the switch lost to the grant itself.
- A switch that stops the questions on the Mac of every member was
  rejected, because the choice of one member would then run commands on
  the Mac of another member.
- While Mac access is on, the control in the Mac app shows the line Allow
  all commands on this Mac under the switch (Mac access decision 4 A).
  Each member sees and changes the line of their own Mac.
- A check of the line starts a grant until Stop of the workspace on that
  Mac. An uncheck stops that grant, as Stop does. Mac access stays on.
- Reason: a member whose Mac still asks, after another member turned Mac
  access on, can then stop the questions on their own Mac. So the shared
  switch has a personal line.
- A grant only on the Mac of the member who turned the switch on was
  rejected. A start on every connected Mac of the org was rejected,
  because one member would then remove the questions on the Macs of other
  members.
- The line is checked only while the settings of this Mac list a grant
  until Stop of the workspace. While the 15 minutes run, the line stays
  unchecked. Its hint then gives the time left, and a check keeps them
  until Stop.
- While the page cannot read the settings of this Mac, the line shows
  unchecked and disabled, with "This Mac is not available." Reason: the
  line never claims a grant that may not exist.
- Turning the switch on in the Mac app saves Mac access first. Then it
  starts the grant.
- While a change of the grant of this Mac waits, the switch takes no
  switch-on. A switch-off always goes. Reason: a switch-on in that time
  would save Mac access and start no grant, and a waiting change must not
  keep the member from turning Mac access off.
- Turning the switch off in the Mac app also stops the grant of the
  workspace on that Mac.
  [When Mac access goes off](#when-mac-access-goes-off) covers the other
  Macs.
- The Worker relays a start only for a member of the org of the
  workspace, and only while Mac access of the workspace is on.
- A failed start keeps Mac access on, and the line stays unchecked. Not
  started and the cause show under the line. The line stays, so the
  result has no Try again.
- The result of a failed start stays until the next start or Stop of the
  workspace on this Mac, or until Mac access goes off.
- The result of an uncheck, which is a Stop, shows under the line.
- When the line appears or shows a result, the control scrolls it into
  view. Reason: the line sits below the secrets of a long control.

### In New workspace

- In New workspace, the line is a choice of the draft. Turning the switch
  on checks it. The create does not take it.
- After the create returns the new workspace, the page of the Mac app
  starts its grant, only while the line is checked. Reason: a grant covers
  one workspace that exists.
- A failed start after the create shows as a notice over the composer of
  the new workspace, with the cause and Try again. Reason: the control of
  New workspace closes at the create. The line in the Capabilities of the
  new workspace shows the same result.

### In a browser

- Only the page of the Mac app on that Mac starts a grant (Mac access
  decision 5 A). A browser never starts one, also a browser on the same
  Mac.
- In a browser, the switch saves, and the control shows a note in place
  of the line: "To allow all commands on your Mac, use Allow all commands
  on this Mac in the Mac app." The Mac of the member then asks at the
  first command.
- The control chooses the line or the note by where it runs: the Mac app
  or a browser. So the Mac app with no device connection shows the line,
  disabled.
- Reason: a start from a browser lets a stolen web session remove every
  question on the Mac of its member.
- A start that the Worker relays from any signed-in session was rejected
  for that reason. The same start with a confirmation on the Mac was
  rejected, because it adds a dialog over the app. A question that a
  browser puts on the page of the Mac app was rejected, because a stolen
  web session could then put one there.
- A choice that a browser saves on the server for the first question of
  the Mac was rejected. Reason: each option that keeps a check still asks
  once on the Mac, and the note asks at the first command with no new
  path.
- A pairing of a browser with the Mac app and a local server of the Mac
  app were rejected, because a stolen browser session or any web page
  could then start a grant. A server record that lets the Mac skip its
  question was rejected, because no record on the server can allow a
  command.
- A link in the note that opens the workspace in the Mac app was rejected
  for now. It is the next step if members create workspaces in a browser
  on their Mac.

### When the Mac is not available

- When this Mac is not available, the switch still saves Mac access
  (Mac access decision 3 A). The start fails, and the line stays
  unchecked. Its result says that this Mac is not available, so each
  command still asks first.
- A start that the Worker keeps for the next connection was rejected.
  Reason: the server would then store a grant, and the grant would
  outlive a restart of the Mac app.
- A switch that turns on only while the Mac is available was rejected,
  because members without a Mac could not turn it on.

### When Mac access goes off

- Each workspace counts its periods of Mac access. Each switch-off starts
  a new period (Mac access decision 6 C).
- Each request that reaches a Mac carries the current period of its
  workspace. A grant keeps the period of the request or the start that
  began it. It covers only the requests of that period, as
  [The choices](desktop-commands.md#the-choices) says.
- So a switch-off ends each grant of the workspace on every Mac for good,
  also on a Mac that was asleep or not connected. A later switch-on brings
  no grant back.
- Reason: a switch-off by one member must end the grants on the Macs of
  the other members too. Otherwise a later switch-on by another member
  would remove the questions on those Macs again, with no new choice.
- A grant that stays until its own Stop, with the bar and This Mac as its
  only sign, was rejected for that reason. A stop that the Worker sends to
  each connected Mac at a switch-off was rejected, because a Mac that was
  asleep keeps its grant.
- A grant that the Mac app ends at its next request after a switch-off
  was rejected, because the Mac app cannot tell a request from before the
  switch-off from one after it.
- The settings that the Worker relays to a page never list a grant of an
  older period, as
  [Settings results](desktop-commands.md#settings-results) says.
- Risk: a Mac app older than this rule ignores the period. On such a Mac,
  a grant from before a switch-off covers the requests of the workspace
  again after the next switch-on.

### Risks

- Risk: any member can turn Mac access on again after another member
  turned it off.
- Risk: while a grant runs on the Mac of a member, each turn of the
  workspace that the member sends can run any command on that Mac with no
  question. Text that steers the agent, another process in the sandbox,
  and a message of the session calls from another workspace can all use
  it, as [Who gets a request](agent-tools.md#who-gets-a-request) says. So
  can an automation run of that member, through the session calls. The
  switch makes such grants common.
- Risk: an automation that needs a Mac cannot use it in the first turn of
  a run. A member must turn Mac access on in the run workspace, then send
  a message.
- Risk: when a member turns Mac access on in a run workspace, text that
  steers the agent of the run can ask for a command on the Mac of the
  sender of the next turn. While the Mac of that sender holds a grant of
  the run workspace, such as the grant of the switch in the Mac app, each
  such command runs with no question. Otherwise only a command that the
  sender always allowed runs with no question, as
  [The choices](desktop-commands.md#the-choices) says.
