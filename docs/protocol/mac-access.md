# Mac access

This doc holds the requirements and the decisions in force for Mac access:
the requests that agents send to a Mac, and the Mac access switch of the
Capabilities control in the Mac app. The switch starts or stops a grant of
one workspace on this Mac. This doc belongs to
[Capabilities](capabilities.md), which covers the control.
[Permissions and Mac commands](desktop-commands.md) states the choices and
the grants on the Mac. [Mac command requests](mac-command-requests.md)
states the requests. The [mockup catalogue](../mockups/catalogue-secrets.md)
draws the switch. The terms are those of [Secrets](secrets.md#terms) and of the
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

In this doc, a grant is a grant of a Mac, as
[The choices](desktop-commands.md#the-choices) says. It runs every command
from one workspace on one Mac with no question, for 15 minutes or until
Stop. It is not a grant of a secret.

## Agents can always ask

- An agent in each workspace can ask for a command on the Mac of the
  sender of its turn (Mac access decision 7). This includes a new
  workspace, an automation run, and a workspace that an agent creates.
- The Worker refuses no request because of Mac access. The Mac app asks
  before each command that Always allow or a grant does not cover, as
  [The choices](desktop-commands.md#the-choices) says. The member can deny
  each such request.
- Reason: the user chose that a workspace can always ask, because the
  member can easily deny a request.
- A switch of each workspace that lets its agents ask only while it is on
  was rejected for that reason. [Risks](#risks) states what this choice
  leaves open.

### The stored value

- Each workspace keeps a Mac access value for older pages. An older page,
  such as the page of an older Mac app, shows it as a switch that every
  member shares. The capabilities API reads and changes the value.
- The value allows and refuses no request. A change of the value ends no
  request that waits or runs.
- So the switch of an older page does not keep agents from asking. It
  starts and stops no grant.
- The value is off in each new workspace, also in a workspace that an
  agent or an automation creates (secrets decision 18 A). It went off one
  time in each workspace that existed before that rule (secrets decision
  19 B).
- The reason of both decisions was that agents could reach a Mac only
  after a member chose it for the workspace. The value no longer gates a
  request, so neither decision keeps agents from asking.
- A request that the Worker refused while the value was off keeps that
  result, as [Results](mac-command-requests.md#results) says.

## The switch

- In the Mac app, the Capabilities control of New workspace and of each
  workspace ends with the Mac access part: one switch, with no hint (Mac
  access decision 7). The switch acts only on this Mac, the Mac of the
  member who uses the page.
- On starts a grant until Stop of the workspace on this Mac (Mac access
  decision 1 C). Off stops that grant, as Stop does. The Macs of the other
  members still ask.
- Reason: the user asked for one switch that gives access, in place of a
  shared switch and a second line for this Mac. The user also asked that
  the switch stops the questions on the Mac of the member who turns it on.
- A switch that only lets agents ask, with a clearer hint, was rejected
  for that reason. So was no change, with Allow all commands until I stop
  at the first question.
- A switch that stops the questions on the Mac of every member, or that
  starts a grant on every connected Mac of the org, was rejected. Reason:
  the choice of one member would then run commands on the Mac of another
  member.
- The switch reads its state from the settings of this Mac. It is on only
  while the settings list a grant until Stop of the workspace. Each member
  sees and changes only the state of their own Mac.
- While the 15 minutes run, the switch is off, and the bar of the
  workspace gives the time left. A switch-on then keeps the grant until
  Stop.
- While the page cannot read the settings of this Mac, the switch is off
  and disabled. "This Mac is not available." shows under it, unless a
  result already says why. Reason: the switch never claims a grant that
  may not exist.
- While a change of the grant of this Mac waits, the switch takes no
  switch-on. A switch-off always goes. A start, a Keep, or an Extend of the
  workspace that still waits in this page then never goes to the Mac.
- Reason: a slow Mac or a waiting change must not keep the member from
  stopping the grant.
- The Worker relays a start only for a member of the org of the
  workspace, whatever the stored value is.

### Results

- The part has no hint, and it shows only short results (Mac access
  decision 7). Reason: the user asked to remove the long text.
- A failed start leaves the switch off. Not started and the cause show
  under it. The switch stays, so the result has no Try again.
- The result of a failed start stays until the next start or Stop of the
  workspace on this Mac.
- The result of a switch-off, which is a Stop, shows under the switch,
  such as Stopped.

### When the Mac is not available

- When a start finds this Mac not available, the start fails (Mac access
  decision 3 A). The switch stays off. Not started shows with the cause:
  this Mac is not available, so each command still asks first.
- A start that the Worker keeps for the next connection was rejected.
  Reason: the server would then store a grant, and the grant would outlive
  a restart of the Mac app.

## In New workspace

- In New workspace in the Mac app, the switch is a choice of the draft. It
  starts off. The create does not take it.
- After the create returns the new workspace, the page of the Mac app
  starts its grant, only while the switch is on. Reason: a grant covers
  one workspace that exists.
- A failed start after the create shows as a notice over the composer of
  the new workspace, with the cause and Try again. Reason: the control of
  New workspace closes at the create. The switch in the Capabilities of the
  new workspace shows the same result.

## In a browser

- Only the page of the Mac app on that Mac starts a grant (Mac access
  decision 5 A). A browser never starts one, also a browser on the same
  Mac.
- Reason: a start from a browser lets a stolen web session remove every
  question on the Mac of its member.
- A start that the Worker relays from any signed-in session was rejected
  for that reason. The same start with a confirmation on the Mac was
  rejected, because it adds a dialog over the app. A question that a
  browser puts on the page of the Mac app was rejected, because a stolen
  web session could then put one there.
- A choice that a browser saves on the server for the first question of
  the Mac was rejected. Reason: the Mac still asks once, at the first
  command, with no new path.
- A pairing of a browser with the Mac app and a local server of the Mac
  app were rejected, because a stolen browser session or any web page
  could then start a grant. A server record that lets the Mac skip its
  question was rejected, because no record on the server can allow a
  command.
- A browser shows no Mac access part (Mac access decision 7). Reason: a
  browser cannot change what runs on a Mac.
- The control chooses its parts by where it runs: the Mac app or a
  browser. So the Mac app with no device connection shows the switch,
  disabled.
- A link in the control of a browser that opens the workspace in the Mac
  app was rejected for now. It is the next step if members create
  workspaces in a browser on their Mac.

## When a grant ends

- A grant until Stop ends at Stop, also at a switch-off on this Mac, at a
  quit of the Mac app, and at a sign-out, as
  [The choices](desktop-commands.md#the-choices) says.
- A switch-off acts only on this Mac. It ends no grant on the Mac of
  another member (Mac access decision 7). Reason: the switch of each
  member acts only on their own Mac, as its switch-on does.

## Risks

- Risk: agents can ask from the first turn of each workspace. Text that
  steers the agent can make it ask, also in an automation run that no
  person watches and in a workspace that an agent creates. A command that
  the sender set to Always allow then runs with no question, in the folder
  that the request names, as [The choices](desktop-commands.md#the-choices)
  says. Secrets decisions 18 A and 19 B do not protect against this,
  because the stored value gates no request.
- Risk: while a grant runs on the Mac of a member, each turn of the
  workspace that the member sends can run any command on that Mac with no
  question. Text that steers the agent, another process in the sandbox,
  and a message of the session calls from another workspace can all use
  it, as
  [Who gets a request](mac-command-requests.md#who-gets-a-request) says.
  The switch makes such grants common.
- Risk: an automation run acts as its owner, so the requests of its first
  turn go to the Mac of the owner, as
  [A run acts as its owner](automation-runs.md#a-run-acts-as-its-owner)
  says. Text in a pull request, or in a page that the run reads, can steer
  them. Through the session calls, the agent of the run can also start a
  turn as the owner in a workspace where the Mac of the owner holds a
  grant. Each command of that turn then runs with no question.
