# Continue

Continue moves a workspace to a new branch after its pull request merged.
It starts from the latest commit of the pull request's current base when
GitHub still has that branch. Otherwise, it uses the repository default.
The workspace keeps its
owner, name, sandbox, installed software, files, and sessions. The old
branch stays in the sandbox and on GitHub.
[Continue](../../docs/protocol/continue.md) and
[GitHub tokens](../../docs/protocol/github-tokens.md#continue) state the
requirements. This guide gives the durable job, the Git commands, and the
publication of this code. [Continue routes](continue-routes.md) gives the
routes and the errors. [Continue failures](continue-failures.md) gives the
failures, the recovery, and the stop causes.

## Routes

[Continue routes](continue-routes.md#routes) gives the two routes, their
requests and replies, and who may read a job.

## Admission

`reserveContinue` in [`continue-admission.ts`](continue-admission.ts)
admits a request in the chat queue:

- The object must be the object of that workspace, or the reply is 404
  `workspace_not_found`. Its member receiver must be active.
- `readMergeWorkspace` must find the workspace open to the member: an
  active member of an active org, a workspace that is not archived, and an
  installation that is not suspended. Every such member may continue.
- The workspace owner must be active, and the workspace must have a saved
  sandbox, because Continue can resume it.
- The job saves that sandbox and the provider account of the workspace
  record. Its commands use that saved account. Its resume and its check of
  local work go through the workspace record, and each phase checks that
  the record still names the saved account, as
  [Provider accounts](provider-accounts.md#routing) says.
- `expectedBranch` must be the current branch, or the reply is 409
  `workspace_branch_changed`.
- No turn may run or stop in the committed chat, or the reply is 409
  `workspace_turn_running`.
- Only one Continue runs at a time. A repeat by the same member from the
  same branch joins the running job. Any other request gets 409
  `workspace_continuing`.
- The new branch takes its name from `workspaceBranch` in
  [`workspace-branch.ts`](workspace-branch.ts), with the owner's current
  GitHub login, the workspace name, and the next task number. The publish
  write adds 1 to `workspaces.task_number`. It matches the earlier branch,
  so a repeated write changes nothing.
- An admitted Continue counts as activity of the workspace.

## The reservation

The running job is the reservation of the workspace, under
`lifecycle:continue`. Each job also keeps its own record under
`continue:job:<id>`, which the poll reads. `continue:branch:<old branch>`
names the job that moved that branch, for the replay of a repeat. While the
reservation exists:

- `turnDispatching` in
  [`workspace-integration.ts`](../chat/workspace-integration.ts) holds each
  turn in the chat queue, so no turn overlaps the branch change. Messages
  are still accepted, as normal chat rules allow.
- `Workspace.archiveWorkspace` in [`workspace.ts`](../workspace.ts) refuses
  Archive with 409 `workspace_continuing` while a Continue job is pending.
  The check runs in the same serialized run as the Archive.
- The lifecycle steps of the alarm run only to advance a queued start,
  such as the resume of Continue. A Resume of a member joins that start, or
  reads the running state.

When the job ends, the reservation ends, and the waiting runner commands
go out with the current branches.

## Phases

Each alarm run of the workspace object first runs the `continue` alarm
source, through `runWorkspaceAlarms` in
[`workspace-alarms.ts`](../workspace-alarms.ts). It advances the job one
phase at a time. A provider wait never holds the chat queue. Each phase
first checks, with `authorizeContinue` in
[`continue-data.ts`](continue-data.ts), that the member still has access,
that the repository, installation, and branch are unchanged, that the
owner is active, and that the sandbox and its provider account are the
same.

1. `verify` refreshes the GitHub state as the member, and needs a merged
   pull request, or the job ends with 409 `workspace_not_merged`. It reads
   the current default branch separately from the pull request's real base.
   `continueBase` in [`continue-base.ts`](continue-base.ts) checks that base
   with the member's fresh GitHub user token. Only a missing branch falls
   back to the default. A failed GitHub read ends the job before any move.
2. `resume` starts a stopped computer through the normal resume as the
   member. That resume renews a revoked workspace token and runs the normal
   startup and readiness steps. Continue waits outside the chat queue until
   the sandbox runs, and queues the resume again while it stays stopped.
3. `check` runs the [local-work check](#local-work). Local work without
   `allowLocalWork` ends the job with `confirmation-required`, and no fetch
   or move has run. Continue anyway sends a new request with
   `allowLocalWork: true`, and the check runs again.
4. `fetch` runs the [staged fetch](#the-fetch).
5. `move` runs the [branch move](#the-move).
6. `publish` stores and publishes the new branch, as
   [Publication](#publication) says.

## Local work

`localWorkCommand` in [`local-work.ts`](local-work.ts) is the local-work
check of Continue. Archive runs no such check. It lists each changed file,
also each untracked file, and counts the commits that no remote branch
holds, on every local branch. Each commit counts once. So a commit left on
an earlier branch still shows.

## The fetch

`continueFetchCommand` in [`continue-commands.ts`](continue-commands.ts)
fetches the selected base branch into a bare staging repository under
`/tmp/conductive-continue/`, never into the working repository.

- It runs through the isolated source command: an empty environment,
  absolute programs, no global or system Git config, and hooks off.
- Only the app's credential helper gets a credential. It sends the job's
  fetch ID as the turn ID, so the credential route gives the token of the
  member who pressed Continue, as
  [The git credential sender](git-credentials.md#continue) says.
- The fetch uses the `get` mode of that helper. So it also works on an
  older image, without the GitHub CLI.
- The scope of that ID opens before the fetch command starts. It closes
  when the fetch ends or fails, at a cancel, and when the object rebuilds.
- Before it starts the fetch or the move, Continue sets the auto-stop
  deadline of the sandbox to the stop time plus 60 seconds, as
  [The stop time](README.md#the-stop-time) says. Each command starts detached, and
  the job keeps its process ID and output offsets for the later steps.

## The move

`continueMoveCommand` runs in the working repository with no member token
in its environment.

- It checks that the repository is still on the old branch.
- It imports the staged objects with only the local file protocol, then
  creates the new branch from the fetched base with a normal checkout,
  without force, with `--no-track` and `--no-overwrite-ignore`. Changed
  files move with the branch. It runs no reset, clean, or stash, and writes
  no local base branch.
- After the checkout, it points `refs/remotes/origin/HEAD` at the fetched
  base. It sets the `gh-merge-base` Git setting of the new branch to the
  base branch. So the runner compares with that base, as
  [The comparison base](../../runner/file-reports.md#the-comparison-base)
  says. The GitHub CLI also opens a pull request into it by default, as
  [Base branches](../../docs/protocol/base-branches.md#the-base-branch-of-a-workspace)
  requires.
- When the changed files clash with the base, Git refuses. The old branch,
  its files, and its commits stay, and the job ends with 409
  `workspace_continue_failed`.
- An ignored file that the base tracks also makes Git refuse, such as an
  installed file that the base now adds. The bytes of that file stay as
  they were.
- The move keeps the Git text of a failed checkout only in a shell
  variable. It matches that text with fixed Git messages, and ends with
  the status of the message that matches. The isolated command runs Git in
  the C locale, so these messages stay in English.
  - A clash gives status 80: a changed, untracked, or ignored file that
    the checkout would overwrite.
  - An existing `.git/index.lock` gives status 81. Continue never removes
    the lock, because it can belong to another Git command, such as one in
    a terminal of a member.
  - Any other refusal gives status 1.
- A failed write of `origin/HEAD` or of the `gh-merge-base` setting gives
  status 82. This status names a metadata failure, never a clash.
- The move writes no output. So the command journal keeps only its exit
  status, with no Git text, path, or token.
- It removes the staging repository at the end.

## Publication

`publishContinue` in [`continue-publication.ts`](continue-publication.ts)
runs after a good move. It never runs Git again.

- `storeContinuedBranch` writes the new branch to D1 only while the row
  still names the old branch, the same sandbox, and the same provider
  account, in an active org and a workspace that is not archived. The
  selected branch becomes the base branch of the workspace. A base equal
  to the live default is stored as null. It records only the live default
  branch on the repository.
- One chat transaction then commits `workspace.updated`, one
  `workspace.continued` note for each stored session, open or closed, the
  saved `continued` reply with the range of its event numbers, and the
  marker of the old branch.
- A repeat of the publication finds the saved reply. It publishes the saved
  events again with their original numbers, and adds no event.
- Then it schedules a fresh GitHub read of the new binding, through the
  retry alarm of [the GitHub backend](../github/README.md#refresh-behavior),
  and only then ends the reservation. So no turn starts before the new
  branch is stored and published.

## Labels

The job and each stored `workspace.continued` note keep the real names.
Git and each request use them. The Worker adds a masked label beside each
name that a screen shows, as
[Secrets that users enter](../../docs/protocol/tokens-and-secrets.md#secrets-that-users-enter)
requires.

- `publishContinue` writes each new note with its real names only. It
  replays a saved note through the `publish` of its authorized operation.
- The chat backend adds `displayBranch` and `displayBaseBranch` with fresh
  values at the write and at each replay, as
  [Branch and path labels](../chat/integration/README.md#branch-and-path-labels)
  says. It labels a note again when a tab, a page of the session history,
  or a transcript gets it. `filterContinued` of
  [the output fields](../../src/shared/output-fields.ts) fills the labels,
  and leaves out a label that equals its real name.
- So a tab that opened before a new start gets the labels of that start. A
  note from before these labels gets labels too, also in the transcript
  copy and the agent reads.
- The routes label the question. They hide each secret value in the stop
  message of `workspace_continue_failed`, as
  [Continue routes](continue-routes.md#labels) says.

## Failures and recovery

[Continue failures](continue-failures.md#failures-and-recovery) gives the
failures of a job, its recovery, and its stop causes.

## After Continue

- GitHub webhooks follow the new branch, because they read the branch of
  the D1 row.
- A refresh that captured the old branch fails its binding check and
  publishes nothing.
- Each later runner command carries the new branch, as
  [History and event order](../chat/history.md) says.

## Errors

[Continue routes](continue-routes.md#errors) gives the error of each
refusal.

## Key code

- [`continue.ts`](continue.ts): `WorkspaceContinue`, the start, the poll,
  the serialized phase steps, the fetch grant, and the cancel. The cancel
  and each later save keep the `cancelled` stop cause. The end of a
  stopped job logs the safe warning.
- [`continue-admission.ts`](continue-admission.ts): `reserveContinue`, the
  stored admission checks, and the name of the new branch.
- [`continue-progress.ts`](continue-progress.ts): `advanceContinue`, the
  phases and the commands, and the stop cause of each stop.
- [`continue-failure.ts`](continue-failure.ts): `continueFailed`, the safe
  error `workspace_continue_failed`, with text from the stop cause and phase.
- [`continue-commands.ts`](continue-commands.ts): the fetch and move
  commands, and `continueBranchCommand`, the read of the actual branch,
  which also repairs `origin/HEAD` and the `gh-merge-base` setting on the
  new branch. The move and the read end with the reserved exit statuses,
  and write no Git text. The fetch and the move use the shared builders of
  [`base-change-commands.ts`](base-change-commands.ts), as a base move does.
- [`continue-stop-causes.ts`](continue-stop-causes.ts): `ContinueStopCause`,
  the closed list of stop causes, and `CONTINUE_EXIT_CODES`, the reserved
  exit statuses. `readContinueStopCause` reads a stored cause.
  `continueCommandStopCause` gives the cause of an ended command.
- [`continue-data.ts`](continue-data.ts): `authorizeContinue`, the access
  check of each phase, and `storeContinuedBranch`, the guarded D1 branch
  write with its read-back check.
- [`continue-publication.ts`](continue-publication.ts): `publishContinue`,
  which writes and replays each note with its real names. The chat backend
  adds the [labels](#labels).
- [`continue-output.ts`](continue-output.ts): `labelContinueResult`, which
  labels the question and the stop error of the routes.
- [`continue-types.ts`](continue-types.ts): the stored job, its keys, and
  `readContinueJob`, which reads an older job without a provider account
  as the `boat` account. For a job without a separate default branch, its
  saved base supplies the default, as that job fetched the default branch.
  It reads a missing or unrecognized stop cause as `unknown`.
- [`local-work.ts`](local-work.ts): the local-work command and its reader
  of NUL-separated records.
- [`workspace-branch.ts`](workspace-branch.ts): the branch name of a
  create and of Continue.
- [`continue.ts` route](../app-api/continue.ts): `continueRoute`.
- [`worker/workspace.ts`](../workspace.ts): composes Continue with Archive,
  GitHub, and the alarms, and gives its safe feature RPCs.
- [`worker/warning-continue.ts`](../warning-continue.ts): the fields of the
  safe warning of a stopped job: only fixed fields, and the normalized stop
  cause and phase.

## Tests

[Continue tests](continue-tests.md) gives the tests of Continue and their
fixtures.
