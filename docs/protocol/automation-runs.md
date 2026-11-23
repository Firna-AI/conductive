# Automation runs

This doc holds the requirements and the decisions in force for the runs of
an automation. It belongs to [Automations](automations.md), which covers an automation,
its access, and its schedules. [Pull request runs](pull-request-runs.md)
adds the rules of the runs that pull request events start. The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. An org login decision number
names a decision of the change that adds the org logins, as
[Tokens and secrets](tokens-and-secrets.md) says. An automation
capabilities decision number names a decision of the change that adds
Capabilities to automations, as [Automations](automations.md) says.

## A run is a workspace

- Each run creates a new workspace (decision 501 A). The workspace gets the
  repository, the section, the model, the effort, and the
  [fast mode](fast-mode.md) of the automation.
- A run workspace is a normal workspace (decision 504 A). It shows in the
  workspace list of its section, and it stays until someone archives it.
- Every member can open a run workspace and send messages there, as in
  each workspace.
- A workspace list that hides run workspaces was rejected. The section of
  the automation groups them instead.
- Automatic archives of clean run workspaces were rejected, because they
  change the archive rule and the restart near day 14 (decisions 16
  and 43).
- A new cloud computer in place of the restart of a clean workspace was
  rejected. It loses the ignored files and the memory of the agent.
- So on Boat, the restarts of kept run workspaces stay a cost, as
  [Limits](automations.md#limits) says.
- A line under the header of a run workspace says "Run of" and the name of
  the automation, with a link to the automation.
- For a pull request run, the line adds "for" and the number of the pull
  request, with a link to the pull request on GitHub.

## A run acts as its owner

- The owner of the automation is the workspace owner of each run workspace.
  The owner is also the starter of its first session and the sender of its
  first message.
- So the first session takes the default login of the owner: the personal
  login of the owner, or the org login (org login decision 5 A).
- The first turn uses the owner's GitHub access. So its pushes and pull
  requests show as the owner.
- Reason: a new session takes the default login of its starter, as
  [The default login](org-logins.md#the-default-login) says. Pushes show
  as the sender of the turn (decision 50).
- A run that uses only the personal login of the owner was rejected.
  Reason: a member who relies on the org login could then save an automation
  whose runs all fail. One rule for the default login serves the sessions,
  the agent tools, and the automation runs.
- The owner starts the first session, so no share setting blocks it.
- A later message of another member follows the rules of the login of
  the session, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says.
- [The secrets of a run](#the-secrets-of-a-run) states which secrets the
  run uses with no request.

## The secrets of a run

- A run workspace starts with the
  [chosen secrets](automations.md#chosen-secrets) of its automation as
  pre-approvals (automation capabilities decision 1 A). So each session
  there uses them with no request, as [Grants](secrets.md#grants) says.
- The run workspace records the owner as the member who pre-approved each
  of them. Every member can remove each one in the Capabilities of the run
  workspace, as for each pre-approval (secrets decision 8 B).
- The run takes the chosen secrets of its automation at its create, and it
  keeps them for each retry of that create. A later change of the chosen
  secrets changes no run workspace that exists.
- A secret that a member deletes during the start leaves the list, and the
  run goes on without it. Reason: the run can still do the work that needs
  no such secret. A deleted secret ends each of its grants anyway, as
  [Storage](secrets.md#storage) says.
- A run workspace starts with no grant on any Mac. An automation has no
  choice of Mac access (automation capabilities decision 2 A), as
  [The control of an automation](capabilities.md#the-control-of-an-automation)
  says.
- The agents of a run can still ask for a command on the Mac of the
  sender of their turn, from the first turn of the run, as
  [Agents can always ask](mac-access.md#agents-can-always-ask) says. The
  owner sends the first turn. [Risks](mac-access.md#risks) states the
  risk.
- A workspace that the agent of a run creates with the workspace tools
  gets no capability. It starts with no pre-approval, as
  [Grants](secrets.md#grants) says, and with no grant on any Mac. Reason:
  the owner chose the secrets for the run workspaces only.
- A request of a run for each other secret waits for a member, as each
  request does (secrets decision 5 C).
  [Turns that no person started](secrets.md#turns-that-no-person-started)
  gives the reason and the risks.
- A grant that ends with the first turn of the run was rejected, as a run
  grant and as a session approval of the first session. With it, each
  later turn in the run workspace asks again, and it costs more work.
- A run workspace that reads the current chosen secrets of its automation
  at each use was rejected, because a member could then not remove one of
  them in one run workspace.
- Pre-approvals that serve only the turns that the owner sends were
  rejected. They still stay in each kept run workspace, and they would be
  the first grant that depends on the sender.
- Allow for this automation on a request card was rejected, because the
  first run still waits for a member.

## When a run starts

- A schedule starts a run at each of its times, while the automation is on.
- A pull request event starts a run while the automation is on, as
  [Pull request runs](pull-request-runs.md) says.
- Run now starts a run at once, also while the automation is off. Its answer
  holds the new run.
- A run starts once for each schedule time, each GitHub delivery, and each
  Run now request. A repeat gives the same run and one workspace.
- Missed schedule times give one run, not one for each missed time.
- Reason: after an outage, one late run does the work, and a burst of runs
  only spends starts.
- Each minute, the app starts at most 50 due automations and at most 50 queued
  runs. The rest wait for a later minute.
- A run that stays queued for more than a minute gets another start. This
  covers a Worker that stopped before the create.

## Checks before the create

- Before each create, the app checks that the owner is still a member of
  the org. It also checks that neither the owner nor the org is suspended
  or deleted.
- It then checks that a login serves the owner for the agent of the run,
  as [The default login](org-logins.md#the-default-login) says. It also
  checks the owner's GitHub access.
- Each turn of the first session uses that login through the
  [model gateway](model-gateway.md). The sandbox gets
  a turn token, as [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says.
- A run takes the agent, the model, the effort, and the fast mode of its
  automation at its first start, and keeps them for its check and its create.
- Reason: a change of the automation during the start cannot give the check
  and the create two different agents.
- When no login serves the owner for the agent of the run, the run fails
  with the code `agent_login_required`. Expired GitHub access fails it
  with the code `github_reconnect_required`.
- Reason: the run fails before it spends a start, and the Runs list names
  the real cause.
- A run that fails a check creates no workspace.

## The run text

- The first message of a run is the run text: the prompt, a separator line
  `---`, and the trigger facts.
- Each fact is one line with a label. `Automation:` names the automation, and
  `Trigger:` names the trigger.
- A pull request run adds four facts:
  - `Pull request:` the number and the address of the pull request
  - `Head:` its head branch, with the head commit
  - `Merges into:` the branch that the pull request merges into
  - `Your work goes to:` the base branch of the run workspace, as
    [Base branches](base-branches.md) says
- Reason: the word "base" then names one branch only.
- The run text copies no title and no body of a pull request.
- Reason: the agent reads the pull request itself, and the facts stay
  short.
- The run text names no chosen secret. Reason: the agent instructions of
  the first session already name the secrets that it uses with no request,
  as [The capabilities](agent-instructions-changes.md#the-capabilities)
  says. `list_secrets` gives the whole list.

## Run states

- A run shows one of these states:
  - queued, while it waits for its workspace
  - the state of its workspace, once it has one, as
    [Workspace states](workspace-life.md#workspace-states) says,
    or archived
  - failed, with its cause
  - skipped, with its reason
- A run whose first turn fails shows as failed, with the cause of the turn.
  It does not show as finished or ready.
- Reason: a failed turn counts as output for the state of a workspace. So
  the state of the workspace would hide the failure.
- A run fails for one of these causes:
  - No login serves the owner for the agent of the run.
  - The owner's GitHub access expired.
  - The cloud computer did not start.
  - The first turn failed.
- The owner sees the one action that fixes the cause, when one exists, such
  as Connect Claude. Another member reads whose login or access it is.
- The cause names the agent and the owner of the run, also after the
  automation changes its agent or its owner.
- A run is skipped when the author or the sender of its pull request event
  is outside the org.
  [Who may start a run](pull-request-runs.md#who-may-start-a-run) states
  that rule.
- A queued run becomes skipped when it cannot start, because its automation
  is off, its owner left or is suspended, or its org is suspended or
  deleted. Its row shows that reason, and the app stops its attempts to
  start it.

## Failed runs

- A run that fails a check before the create has no workspace (decision
  512 B). Its row shows its cause, with the action that fixes it when one
  exists.
- A run whose first start fails keeps its workspace in the error state,
  with its accepted messages and Try again, as
  [A failed first start](create-a-workspace.md#a-failed-first-start) says
  (decisions 130 D and 512 B).
- The run shows as failed with its cause and a link to that workspace.
  Try again there starts a new sandbox for the same workspace.
- A run whose first turn fails keeps its workspace too. Try again there
  retries the turn, as [Messages](messages-and-attachments.md#messages) says.
- A failed run keeps its failed outcome after an in-workspace retry.
- Every failed check, start, and first turn counts toward the turn-off
  after three failed runs (decision 513 B).
- Decision 509 F puts the retry of a failed run in its workspace. Run again
  in the Runs list was rejected. An automatic retry, and an automatic start
  after a reconnect, were rejected, because they spend starts that nobody
  asked for.
- A kept workspace for the failed starts of runs alone was rejected,
  because the app would then have two rules for a failed first start.

## Turn off after failed runs

- An automation turns off after three runs in a row fail (decision 513 B).
- Each failed run counts: a failed check, a failed start, and a failed
  first turn. A failure that clears by itself counts too.
- A run whose first turn finishes resets the count. A skipped run and a
  queued run do not count.
- The automation page then says that the automation turned off after three
  failed runs in a row. The owner reads that they can fix the cause and
  turn it on. Another member reads that only the owner can turn it on.
- Only the owner turns the automation on again. That resets the count.
- Reason: runs that keep failing for one cause would go on spending starts
  until a person fixes the cause.
- A count that leaves out the failures that clear by themselves was
  rejected.
- A wait that grows after each failed run was rejected, because a forgotten
  automation still adds a run each day. A notice to the owner alone was
  rejected, because the cost goes on while the owner is away.

## The Runs list

- The Runs list shows the newest 50 runs, the newest first. Show older
  runs reaches the rest.
- Each row shows the trigger, the time, and the state of its run. The row
  of a run with a workspace opens that workspace.
- A failed run shows its cause, and a skipped run shows its reason.
- The row of a pull request run names the pull request, with a link to it
  on GitHub.
- While the automation page shows, it reads the runs again every 10 seconds,
  and also when it gets the focus.
