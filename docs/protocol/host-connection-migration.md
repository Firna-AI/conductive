# The migration job

This page belongs to [Host connection](host-connection.md). It holds the
requirements and the decisions in force for the migration job: the job
that brings each machine onto the host connection when the change that
adds it deploys. The terms are those of the
[architecture doc](../architecture.md#terms). An own computer decision
number names a decision of the change that adds own computers and the
host connection, as [Host connection](host-connection.md) says.

## The job

- At the deploy that adds the host connection, the migration job installs
  the host program on each machine that runs, and on each machine that a
  workspace keeps (own computer decision 7 D). The
  [bootstrap](host-connection.md#the-bootstrap) covers each machine that
  the job does not reach.
- Reason: the job ends the move to the host connection when it completes,
  and it finds failures before members open their workspaces. The
  bootstrap stays for each build from a base image and for each later
  change of the host protocol.
- These ways were rejected (own computer decision 7):
  - The provider path for each machine that does not open the host
    connection. Two paths then stay for good, because a stopped disk on
    E2B and a build from a base image never get the host program by
    themselves.
  - The bootstrap alone. It misses each machine that runs at the deploy.
  - The bootstrap at the first operation of each machine, with the host
    protocol version of each image. It needs more special logic.
- These ways were left out (own computer decision 7):
  - A refusal of each old machine, because older runners must keep
    working.
  - A build of each org image before the deploy, because a stopped disk
    keeps its old software.
  - A release with the host program before the deploy, because the change
    switches on at once (own computer decision 6 C), and that release
    misses each machine that stopped before it.
  - Provider commands for the start steps only, with a wait for the install
    at idle. The terminal, the previews, and the files then fail until that
    install, and a busy runner can delay it for hours.
- The job starts after the deploy publishes the release of the Worker. It
  installs that release, as the bootstrap does.
- A later change of the host protocol runs the job again.

## Running machines

- On each running machine, the job downloads the release of the Worker,
  then restarts the runner, as [Restart](restart-the-software.md#restart)
  does (own computer decision 8 A).
- Each running turn ends, and so does each process that an agent started
  under the runner, as after any restart of the runner. The shells of the
  terminals and the services keep running.
- Reason: the user chose the simple path, with the same steps as Restart.
- These ways were rejected (own computer decision 8):
  - A wait for the install at idle. A busy machine then has no terminal,
    no previews, and no files until its turns end, for up to hours.
  - An install beside the running release that starts only the host
    program. It needs more work.
- A deploy that waits until no turn runs was left out, because the turns of
  automations and background work can run at any time.
- A workspace whose Restart failed counts as running.
- The job does the running machines first.

## Brief starts

- The job starts each stopped machine briefly, installs, and stops it
  again: the machine of a stopped workspace, and of a workspace in the
  error state whose stop is confirmed.
- It does the same for each archived workspace while its Restore lasts.
- A brief start gets only a new machine token. It gets no workspace token,
  no env var, and no secret. It runs no startup script and no agent.
- Reason: nobody works in the machine, as in the restart near day 14 of an
  archived sandbox.
- The install is done when the host program connects with the current host
  protocol version. The job then stops the machine, and its machine token
  stops working.
- A brief start lasts at most 30 minutes.
- An open, an Archive, or a Restore of the workspace ends its brief start
  first. A resume then starts as usual, with the bootstrap when it needs
  it.
- On Boat, the next restart near day 14 counts from the stop of the brief
  start, as it counts from each stop. A restart near day 14 that falls due
  during the job does the install in place of a brief start.
- A brief start is a second start that no user asked for, after the restart
  near day 14. Resume and Restore still make no start that the user did
  not ask for.
- Risk: the job costs one start and some minutes for each stopped or
  archived workspace, also for a workspace that nobody opens again. Each
  start counts toward the starts that the orgs of its provider account
  share.

## Skips

- Before each step, the job checks the owner and the org of the workspace.
  It skips a workspace whose owner or org is suspended. That workspace
  gets the bootstrap at its first start after the lift.
- The job skips and reports each of these:
  - a workspace that is creating or starting
  - a workspace with no sandbox, or with a sandbox that the app deletes
  - a workspace of a deleted org
  - a workspace on an account that is not configured
  - a provider error, or a missing disk
  - an archived workspace whose Restore ends within one day
- The bootstrap covers each skipped workspace at its next start.

## Org images

- The job refreshes each org image once, on the current account of its
  org, as the daily timer does. It skips an image that is already new.
- It refreshes no image on an old account of an org.
- It reports each org with no active admin, because such an org gets no
  refresh.

## Pace and control

- The job paces its starts on each provider account by two operator
  settings: the starts in each hour, and the machines at once. Both have a
  low default. Each workspace counts toward the pace of its own account.
- Reason: the app knows no limit of either account.
- The job waits longer after each refusal of a provider for its rate limit
  or its capacity.
- Before its first start, the job counts the machines of each account by
  state and kind. It shows an operator the counts, the expected starts,
  and the expected days.
- An operator can pause and continue the job, and can limit it to one
  org. The operator sees its progress and its failures.

## Work at the deploy

- Work that ran a provider command when the change deployed goes on after
  the deploy. Its next step runs the bootstrap, then reads the result of
  that command over the host connection.
