# Continue

Continue moves a workspace to a new branch from the latest default branch
of its repository, after its pull request merged. The workspace keeps its
owner, name, sandbox, installed software, files, and sessions. The old
branch stays in the sandbox and on GitHub.
[Continue](../../docs/protocol/continue.md) and
[GitHub tokens](../../docs/protocol/github-tokens.md#continue) state the
requirements. This guide gives the routes, the durable job, the Git
commands, the publication, and the recovery of this code.

## Routes

`workspacePaths` in [the shared contracts](../../src/shared/workspaces.ts)
builds both routes under `/api/orgs/:orgId/workspaces/:workspaceId`.
`continueRoute` in [`continue.ts`](../app-api/continue.ts) serves them
after the browser gate, beside the Archive route.

| Route | Method | Reply |
| --- | --- | --- |
| `/continue` | POST with `ContinueWorkspaceRequest` | 202 with `{ "state": "pending", "continueId": "<job ID>" }` |
| `/continue/:continueId` | GET or HEAD | 200 with a `ContinueWorkspaceResponse` |

- The request gives `expectedBranch`, the branch that the caller shows,
  and an optional `allowLocalWork` boolean for Continue anyway. Another
  body returns 400 `invalid_request`.
- A poll returns `pending`, `confirmation-required` with `branch`,
  `baseBranch`, and `localWork`, or `continued` with the updated
  `workspace` and the `eventNumber` of its update. A failed job returns its
  safe app error. HEAD returns the status with an empty body.
- Only the member who started a job can read it. An unknown or foreign job
  ID returns 404 `workspace_continue_unavailable`.
- A repeat from a branch that already continued returns the saved
  `continued` reply, and moves nothing.
- The workspace link of a `continued` reply uses the app origin of the
  request. No origin is saved in the job or in the events.
- The reply holds no fetch ID, token, command output, or GitHub error text.

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
- `expectedBranch` must be the current branch, or the reply is 409
  `workspace_branch_changed`.
- No turn may run or stop in the committed chat, or the reply is 409
  `workspace_turn_running`.
- Only one Continue runs at a time. A repeat by the same member from the
  same branch joins the running job. Any other request gets 409
  `workspace_continuing`.
- The new branch takes the name rule of a create from `workspaceBranch` in
  [`workspace-branch.ts`](workspace-branch.ts), with the owner's current
  GitHub login.
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
- `WorkspaceArchive` in [`archive.ts`](../features/archive.ts) refuses
  Archive with 409 `workspace_continuing`.
- The lifecycle steps of the alarm run only to advance a queued start,
  such as the resume of Continue. A Resume of a member joins that start, or
  reads the running state.

When the job ends, the reservation ends, and the waiting runner commands
go out with the current branches.

## Phases

The `continue` alarm source of the workspace object advances the job one
phase at a time. A provider wait never holds the chat queue. Each phase
first checks, with `authorizeContinue` in
[`continue-data.ts`](continue-data.ts), that the member still has access,
that the repository, installation, and branch are unchanged, that the
owner is active, and that the sandbox is the same.

1. `verify` refreshes the GitHub state as the member, and needs a merged
   pull request, or the job ends with 409 `workspace_not_merged`. It reads
   the current default branch of the repository.
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

`localWorkCommand` in [`local-work.ts`](local-work.ts) is the one check of
Archive and Continue. It lists each changed file, also each untracked
file, and counts the commits that no remote branch holds, on every local
branch. Each commit counts once. So a commit left on an earlier branch
still shows.

## The fetch

`continueFetchCommand` in [`continue-commands.ts`](continue-commands.ts)
fetches the default branch into a bare staging repository under
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
  deadline of the sandbox to 30 minutes. Each command starts detached, and
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
- When the changed files clash with the base, Git refuses. The old branch,
  its files, and its commits stay, and the job ends with 409
  `workspace_continue_failed`.
- An ignored file that the base tracks also makes Git refuse, such as an
  installed file that the base now adds. The bytes of that file stay as
  they were.
- It removes the staging repository at the end.

## Publication

`publishContinue` in [`continue-publication.ts`](continue-publication.ts)
runs after a good move. It never runs Git again.

- `storeContinuedBranch` writes the new branch to D1 only while the row
  still names the old branch and the same sandbox, in an active org and a
  workspace that is not archived. It also records the fetched default
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

## Failures and recovery

- A refused phase before a command ends the job with a safe error, which
  the poll returns. `workspace_continue_failed` names the clash of a move.
  In the other phases it says that Continue could not finish.
- Once a fetch or a move started, each later step settles that command
  first. A failed access check then closes the fetch scope and keeps the
  error, but the command result is still read.
- A fetch that ends after a cancel or a kept error ends the job with that
  error. A move that ended well goes on to its publication, also after a
  cancel.
- After a lost provider reply or a lost process, Continue only reattaches
  to the saved command journal. A command that never reached the sandbox
  fails the job, so no operation starts again with an old identity.
- When a move loses its process or ends with an error, Continue first
  reads the actual branch of the working repository with
  `continueBranchCommand`. A HEAD on the new branch means that the move is
  done, so publication runs without another checkout. A HEAD on the old
  branch keeps the rules above. Any other answer keeps the reservation, and
  the step retries until the read names one of the two branches.
- A failure during publication or during a started command retries after
  one second. The move stays done, so no second branch starts.
- A member or org suspension and a lifecycle stop cancel the job. The fetch
  scope closes at once.

## After Continue

- GitHub webhooks follow the new branch, because they read the branch of
  the D1 row.
- A refresh that captured the old branch fails its binding check and
  publishes nothing.
- Each later runner command carries the new branch, as
  [History and event order](../chat/history.md) says.

## Errors

| Status | Code | Cause |
| --- | --- | --- |
| 400 | `invalid_request` | The request body is not a `ContinueWorkspaceRequest` |
| 409 | `workspace_branch_changed` | The workspace is on another branch than the caller saw, or its binding changed |
| 409 | `workspace_turn_running` | A turn runs or stops in a session |
| 409 | `workspace_continuing` | Another Continue runs, or Archive waits for it |
| 409 | `workspace_not_merged` | The pull request of the branch is not merged |
| 409 | `workspace_continue_failed` | A phase failed, or Git refused the move |
| 409 | `sandbox_unavailable` | The workspace has no sandbox, or it changed |
| 404 | `workspace_continue_unavailable` | The job is unknown or belongs to another member |

The existing gate errors still apply, such as `workspace_not_found`,
`org_suspended`, and `workspace_archived`.

## Key code

- [`continue.ts`](continue.ts): `WorkspaceContinue`, the start, the poll,
  the serialized phase steps, the fetch grant, and the cancel.
- [`continue-admission.ts`](continue-admission.ts): `reserveContinue`, the
  stored admission checks, and the name of the new branch.
- [`continue-progress.ts`](continue-progress.ts): `advanceContinue`, the
  phases and the commands.
- [`continue-commands.ts`](continue-commands.ts): the fetch and move
  commands, and `continueBranchCommand`, the read of the actual branch.
- [`continue-data.ts`](continue-data.ts): `authorizeContinue`, the access
  check of each phase, and `storeContinuedBranch`, the guarded D1 branch
  write with its read-back check.
- [`continue-publication.ts`](continue-publication.ts): `publishContinue`.
- [`continue-types.ts`](continue-types.ts): the stored job and its keys.
- [`local-work.ts`](local-work.ts): the shared local-work command and its
  reader of NUL-separated records.
- [`workspace-branch.ts`](workspace-branch.ts): the branch name of a
  create and of Continue.
- [`continue.ts` route](../app-api/continue.ts): `continueRoute`.
- [`worker/workspace.ts`](../workspace.ts): composes Continue with Archive,
  GitHub, and the alarms, and gives its safe feature RPCs.

## Tests

These entries test Continue. The code report gives their commands and
results.

- [`continue-routes.test.ts`](../features/continue-routes.test.ts) runs
  Continue through the real routes of the production Worker: the resume,
  the hold of sends and Archive, the credentials after recovery, and the
  routing of webhooks to the new branch.
  [`continue-entry.test-support.ts`](../features/continue-entry.test-support.ts)
  gives its workspace object the fixed future clock of the fixtures, so the
  native alarms stay in the future while the test drives each phase.
  [`continue-routes.test-support.ts`](../features/continue-routes.test-support.ts)
  builds its production Worker fixture with the fake GitHub repository.
- [`continue.test.ts`](continue.test.ts): a Continue by another member, the
  note in every open and closed session, the local-work question, a failed
  move, a publication that lost its reply, and a move that lost its exit
  result. [`continue.test-support.ts`](continue.test-support.ts) builds its
  chat fixture with the Continue hold, the fake GitHub repository, and the
  fake Boat.
- [`continue-access.test.ts`](continue-access.test.ts): the admission
  checks, and a member removed while Continue waits for the chat queue.
- [`continue-concurrency.test.ts`](continue-concurrency.test.ts): the hold
  of dispatch and of a second Continue, a move after a member removal, and a
  saved resume.
- [`continue-credentials.test.ts`](continue-credentials.test.ts): the fetch
  grant and its end, also when membership ends during the token refresh.
- [`continue-native.test.ts`](continue-native.test.ts) runs the commands
  with real Git: the isolated fetch, the kept files and commits, a clash
  with the new base, and the count of every local branch.
  [`continue-native.test-support.ts`](continue-native.test-support.ts)
  builds its real Git repositories.
- [`branch-context.test.ts`](../chat/branch-context.test.ts): the current
  branches of each runner command.
