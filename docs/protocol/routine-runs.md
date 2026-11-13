# Routine runs

This doc holds the requirements and the decisions in force for the runs of
a routine. It belongs to [Routines](routines.md), which covers a routine,
its access, and its schedules. [Pull request runs](pull-request-runs.md)
adds the rules of the runs that pull request events start. The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## A run is a workspace

- Each run creates a new workspace (decision 501 A). The workspace gets the
  repository, the section, the model, and the effort of the routine.
- A run workspace is a normal workspace (decision 504 A). It shows in the
  workspace list of its section, and it stays until someone archives it.
- Every member can open a run workspace and send messages there, as in
  each workspace.
- A workspace list that hides run workspaces was rejected. The section of
  the routine groups them instead.
- Automatic archives of clean run workspaces were rejected, because they
  change the archive rule and the restart near day 14 (decisions 16
  and 43).
- A new cloud computer in place of the restart of a clean workspace was
  rejected. It loses the ignored files and the memory of the agent.
- So the restarts of kept run workspaces stay a cost, as
  [Limits](routines.md#limits) says.
- A line under the header of a run workspace says "Run of" and the name of
  the routine, with a link to the routine.
- For a pull request run, the line adds "for" and the number of the pull
  request, with a link to the pull request on GitHub.

## A run acts as its owner

- The owner of the routine is the workspace owner of each run workspace.
  The owner is also the starter of its first session and the sender of its
  first message.
- So the first turn uses the owner's agent login and the owner's GitHub
  access. Its pushes and pull requests show as the owner.
- Reason: a session runs on the login of its starter (decision 105), and
  pushes show as the sender of the turn (decision 50).
- The first session runs on the owner's own login, so the share setting of
  that login does not block it.
- A later message of another member follows the share setting, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says (decision 116).

## When a run starts

- A schedule starts a run at each of its times, while the routine is on.
- A pull request event starts a run while the routine is on, as
  [Pull request runs](pull-request-runs.md) says.
- Run now starts a run at once, also while the routine is off. Its answer
  holds the new run.
- A run starts once for each schedule time, each GitHub delivery, and each
  Run now request. A repeat gives the same run and one workspace.
- Missed schedule times give one run, not one for each missed time.
- Reason: after an outage, one late run does the work, and a burst of runs
  only spends starts.
- Each minute, the app starts at most 50 due routines and at most 50 queued
  runs. The rest wait for a later minute.
- A run that stays queued for more than a minute gets another start. This
  covers a Worker that stopped before the create.

## Checks before the create

- Before each create, the app checks that the owner is still a member of
  the org. It also checks that neither the owner nor the org is suspended
  or deleted.
- It then checks the owner's agent login for the agent of the run, and the
  owner's GitHub access.
- Each turn of the first session uses that owner's login through the
  [model gateway](model-gateway.md). The sandbox gets
  a turn token, as [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says.
- A run takes the agent, the model, and the effort of its routine at its
  first start, and keeps them for its check and its create.
- Reason: a change of the routine during the start cannot give the check
  and the create two different agents.
- A missing agent login fails the run with the code `agent_login_required`.
  Expired GitHub access fails it with the code `github_reconnect_required`.
- Reason: the run fails before it spends a start, and the Runs list names
  the real cause.
- A run that fails a check creates no workspace.

## The run text

- The first message of a run is the run text: the prompt, a separator line
  `---`, and the trigger facts.
- Each fact is one line with a label. `Routine:` names the routine, and
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
  - The owner has no agent login for the agent of the run.
  - The owner's GitHub access expired.
  - The cloud computer did not start.
  - The first turn failed.
- The owner sees the one action that fixes the cause, when one exists, such
  as Connect Claude. Another member reads whose login or access it is.
- The cause names the agent and the owner of the run, also after the
  routine changes its agent or its owner.
- A run is skipped when the author or the sender of its pull request event
  is outside the org.
  [Who may start a run](pull-request-runs.md#who-may-start-a-run) states
  that rule.
- A queued run becomes skipped when it cannot start, because its routine
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

- A routine turns off after three runs in a row fail (decision 513 B).
- Each failed run counts: a failed check, a failed start, and a failed
  first turn. A failure that clears by itself counts too.
- A run whose first turn finishes resets the count. A skipped run and a
  queued run do not count.
- The routine page then says that the routine turned off after three
  failed runs in a row. The owner reads that they can fix the cause and
  turn it on. Another member reads that only the owner can turn it on.
- Only the owner turns the routine on again. That resets the count.
- Reason: runs that keep failing for one cause would go on spending starts
  until a person fixes the cause.
- A count that leaves out the failures that clear by themselves was
  rejected.
- A wait that grows after each failed run was rejected, because a forgotten
  routine still adds a run each day. A notice to the owner alone was
  rejected, because the cost goes on while the owner is away.

## The Runs list

- The Runs list shows the newest 50 runs, the newest first. Show older
  runs reaches the rest.
- Each row shows the trigger, the time, and the state of its run. The row
  of a run with a workspace opens that workspace.
- A failed run shows its cause, and a skipped run shows its reason.
- The row of a pull request run names the pull request, with a link to it
  on GitHub.
- While the routine page shows, it reads the runs again every 10 seconds,
  and also when it gets the focus.
