# Repository change

A repository change moves a workspace to a new branch in the folder of
another repository of its org, in the same sandbox. The workspace keeps
its sandbox, number, name, owner, sessions, and chat. The old branch, its
pull request, and the old folder stay as they are.
[Repository change](../../docs/protocol/repository-change.md) and
[GitHub tokens](../../docs/protocol/github-tokens.md#continue) state the
requirements. This guide gives the durable job, the commands, the
publication, and the recovery of this code. The job copies the shape of
[Continue](continue.md), and shares its fetch and its staging folder.

## Routes

`workspacePaths` in [the shared contracts](../../src/shared/workspaces.ts)
builds both routes under `/api/orgs/:orgId/workspaces/:workspaceId`.
`repositoryChangeRoute` in
[`repository-change.ts`](../app-api/repository-change.ts) serves them after
the browser gate, beside the Continue route.

| Route | Method | Reply |
| --- | --- | --- |
| `/repository` | POST with `ChangeRepositoryRequest` | 202 with `{ "state": "pending", "changeId": "<job ID>" }` |
| `/repository/:changeId` | GET or HEAD | 200 with a `ChangeRepositoryResponse` |

- The request gives `expectedRepositoryId` and `expectedBranch`, the
  repository and the branch that the caller shows, the new `repositoryId`,
  and an optional `allowWork` boolean for Change repository in the
  question. Another body returns 400 `invalid_request`.
- A poll returns `pending`, `confirmation-required`, or `changed` with the
  updated `workspace` and the `eventNumber` of its update. A failed job
  returns its safe app error. HEAD returns the status with an empty body.
- `confirmation-required` gives the new `repository` (`id` and
  `fullName`), the old `branch`, the new `baseBranch`, and `work`:
  `localWork` of the old folder, the open `pullRequest` of the old branch
  (`number` and `url`) or null, the `pushedCommits` of the old branch that
  its base does not hold, and the `carriedFiles` of the new folder.
- Only the member who started a job can read it. An unknown or foreign job
  ID returns 404 `workspace_repository_change_unavailable`.
- A repeat by the same member to the same repository from a repository and
  branch that already changed returns the saved `changed` reply, and moves
  nothing.
- The reply holds no fetch ID, token, command output, or GitHub error text.
- The view read of [the shell route](../app-api/shell.ts) gives
  `heldRepositoryIds`: the repositories of the folder record, or null
  without a record. The menu lists only those repositories, as repository
  change decision 4 G says.

## Admission

`reserveRepositoryChange` in
[`repository-change-admission.ts`](repository-change-admission.ts) admits a
request in the chat queue, in this order:

- The object must be the object of that workspace, and its member receiver
  must be active. `readMergeWorkspace` must find the workspace open to the
  member. Every member of the org may change the repository (repository
  change decision 2 B).
- A repeat by the same member with the same request joins the running
  job. Any other request while a change runs gets 409
  `workspace_repository_changing`. A pending Continue gives 409
  `workspace_continuing`.
- The record must name `expectedRepositoryId` and `expectedBranch`, or the
  reply is 409 `workspace_repository_changed`. The current repository
  gives 409 `workspace_repository_current`.
- The new repository must be chosen, with an installation that is not
  suspended, and the folder record of the workspace must hold it. A
  workspace without a folder record holds only its current repository.
  Otherwise the reply is 404 `repository_unavailable`.
- No turn may run or stop, or the reply is 409 `workspace_turn_running`.
  A running Restart gives 409 `workspace_restarting`.
- A connected runner whose hello has no `repositoryFolder` cannot move, so
  the reply is 409 `workspace_software_outdated` with "Restart the
  software, then try again." (repository change decision 5 A).
- The owner must be active, and the workspace must have a saved sandbox.
- The new branch takes its name from `workspaceBranch`, as for Continue,
  with the next task number. The publish write adds 1 to the task number.

## The reservation

The running job is under `lifecycle:repository-change`. Each job also
keeps its own record under `repository-change:job:<id>`, which the poll
reads. `repository-change:from:<repository>:<branch>` names the job that
moved the workspace away from that repository and branch, for the replay
of a repeat. `pendingWorkspaceChange` in
[`repository-change-types.ts`](repository-change-types.ts) is true while
Continue or a change runs:

- `turnDispatching` in
  [`workspace-integration.ts`](../chat/workspace-integration.ts) holds each
  turn in the chat queue.
- Archive and Restart refuse with 409 `workspace_repository_changing`, and
  Continue refuses in its admission.
- The lifecycle steps of the alarm run only to advance a queued start.

[`workspace-jobs.ts`](workspace-jobs.ts) owns both jobs for the workspace
object: their credential grant, their cancel, and the check of Archive.

## Phases

The `repository-change` alarm source advances the job one phase at a
time. Each phase before `publish` first runs `authorizeRepositoryChange`
in [`repository-change-data.ts`](repository-change-data.ts): the member
still has access, the record still names the old repository, branch,
sandbox, and provider account, and the org still chose the new repository.
Once the fetch or the move started, a failed check only saves the error,
and the command still settles.

1. `verify` reads the default branch of the new repository, and the open
   pull request and the pushed commits of the old branch, as the member.
   `branchWork` in [the GitHub feature](../features/github.ts) reads them.
   A merged pull request counts no pushed commits.
2. `resume` starts a stopped sandbox, as Continue does.
3. `runner` waits for the hello of the runner. A runner without
   `repositoryFolder` ends the job with `workspace_software_outdated`. No
   hello within 3 minutes ends the job.
4. `check` reads the local work of the old folder with the command of
   Continue, and the changed files of the new folder without its context
   folder. Work without `allowWork` ends the job with
   `confirmation-required`, and no fetch or move has run.
5. `fetch` runs the staged fetch of Continue for the new repository. Only
   the member who started the change gets the credential, while the fetch
   runs, as [The git credential sender](git-credentials.md#continue) says.
6. `move` runs the move command in the new folder.
7. `publish` stores and publishes the change.

## The move

`repositoryChangeMoveCommand` in
[`repository-change-commands.ts`](repository-change-commands.ts) runs in
the new folder with the isolated source command, in this order:

1. It adds `/.context/` to the local exclude file of the new folder, when
   the rule is missing. So Changes lists no copied file.
2. It copies the context folder of the old folder into the new folder with
   `cp --update=none`, which needs coreutils 9.3 or later. A file with the
   same path stays. Both context folders must be real folders, not links.
   A failed copy exits with code 81, and the job ends with "The context
   folder could not be copied". The copy comes before the checkout, so a
   failed copy changes no branch.
3. It imports the staged base and creates the new branch with the
   checkout of Continue. Changed files move with the branch. When Git
   refuses, the command exits with code 82, and the job ends with the
   clash message of `repositoryFailure` in the shared
   `repositoryMoveCopy.ts`.
4. It points `origin/HEAD` at the base and sets the `gh-merge-base`
   setting of the new branch.

After a lost process or a failed exit, `repositoryChangeBranchCommand`
reads the branch of the new folder. On the new branch it repairs the base
settings, and the move is done. Any other branch ends the job. A failed
read, such as in a removed folder or without `refs/remotes/origin/<base>`,
keeps the reservation, and the step retries until the end rule of
[Failures and recovery](#failures-and-recovery) ends it.

## Publication

`publishRepositoryChange` in
[`repository-change-publication.ts`](repository-change-publication.ts)
runs after a good move. It never runs Git again.

- `storeChangedRepository` writes the new repository, branch, and base
  branch, sets `github_summary` to NULL, and adds 1 to the task number. It
  writes only while the row still names the old repository and branch,
  the same sandbox and provider account, in an active org, a workspace
  that is not archived, and a new repository of the same org. The guard
  does not ask whether the org still chose the new repository. Each phase
  before the move checked it, and Git already moved, so the record
  follows Git also when an admin unchose the repository while the move
  ran. The installation follows the repository row.
- The same batch first closes the file and diff tabs and the temporary-tab
  mark in the saved view of every member, in `workspace_views`, because
  their paths belong to the old folder. The session tabs stay. An active
  file or diff tab leaves no active tab, so the chat shows the first open
  session. Its guard is the guard of the workspace write, so a repeat
  closes no tab of the new repository that a member opened after the
  change. A saved view that is not valid JSON stays as it is.
- One chat transaction commits `workspace.updated`, one
  `workspace.repository-changed` note for each stored session, the saved
  reply, and the marker. It also marks the stored file tree of the old
  folder unavailable and drops its stored changes, as
  [the files backend](../files/README.md) says.
- A repeat of the publication publishes the saved events again with their
  original numbers.
- The settle command then copies the context folder again, for a file
  that a turn attached during the change. It writes the new folder to
  `/run/conductive/repository` for new terminals, and sets
  `CONDUCTIVE_REPOSITORY_DIR` in the global tmux environment. A failure of
  this step only warns.
- It schedules a GitHub read of the new binding and ends the reservation.
  The job then sends `repository.move` to a connected runner, as
  [the runner check](../chat/key-code.md) says, and flushes the held turns.

## Labels

The job and each stored `workspace.repository-changed` note keep the real
names. Git and each request use them. The Worker adds a masked label
beside each name that a screen shows, as
[Secrets that users enter](../../docs/protocol/tokens-and-secrets.md#secrets-that-users-enter)
requires.

- `publishRepositoryChange` writes each new note with its real names
  only. It replays a saved note through the `publish` of its authorized
  operation. The chat backend adds `displayBranch` and
  `displayBaseBranch`, as
  [Branch and path labels](../chat/integration/README.md#branch-and-path-labels)
  says. `filterRepositoryChanged` of
  [the output fields](../../src/shared/output-fields.ts) fills them, and
  leaves out a label that equals its real name.
- `repositoryChangeRoute` passes each result of the workspace object
  through `labelRepositoryChangeResult` of
  [`repository-change-output.ts`](repository-change-output.ts). Only a
  `confirmation-required` reply and a `workspace_repository_change_failed`
  error get labels, so the route reads the secret values only for them.
- The question gets `displayUncommittedFiles` in `work.localWork` and
  `displayCarriedFiles` in `work`: the label of each path, in the same
  order. `filterRepositoryChangeResponse` of the output fields leaves out
  a list when each label equals its path. The `branch` and `baseBranch`
  of the question get no label, because no screen shows them.
- The route hides each secret value in the message of a
  `workspace_repository_change_failed` error. The saved error keeps the
  real names, such as the default branch in the message of a failed fetch.

## Failures and recovery

These rules are the rules of [Continue](continue.md#failures-and-recovery):
a started command settles first, a lost reply only reattaches to the saved
command journal, a failure during publication retries after one second,
and a suspension or a stop cancels the job. A failed change keeps the old
repository and branch, and its error message is the reason of the toast.

The repository change adds an end rule for the steps after the move, in
[`repository-change-end.ts`](repository-change-end.ts). Continue does not
have it.

- A failed publication and a failed branch read of the new folder are the
  steps after the move. The first such failure saves its time in
  `failingSince` of the job. A job of an older deploy has no
  `failingSince`, and its next failure saves it.
- The time starts again when the move is done and the job goes to
  `publish`.
- While less than 10 minutes passed, the step retries after one second.
- After 10 minutes, the job reads the record. When the record still names
  the old repository and the old branch, the job ends with its saved
  error, or with "The repository change could not finish. Try again.". It
  logs the warning `repository_change_ended` with the phase. The
  reservation then ends, so turns, Continue, Restart, and Archive go on.
- When the record no longer names the old repository and the old branch,
  as after the publish write, the publication keeps the retry. The record
  already changed, so the chat must still get the change. A failed read
  of the record also keeps the retry.
- A job that ended this way can leave the new folder on the new branch,
  while the record keeps the old repository.

## Tests

- [`repository-change.test.ts`](repository-change.test.ts): a change by
  another member, the notes, the question with both lists, a clash, a
  failed copy, a failed fetch, a publication that lost its reply, and a
  move that lost its exit result.
- [`repository-change-views.test.ts`](repository-change-views.test.ts):
  the saved views of every member lose their file and diff tabs, a repeat
  of a publication that lost its reply keeps a later tab, and a view that
  is not valid JSON stays.
- [`repository-change-access.test.ts`](repository-change-access.test.ts):
  the admission refusals, a runner that cannot move, and a runner that
  does not say hello.
- [`repository-change-recovery.test.ts`](repository-change-recovery.test.ts):
  a change that publishes after an admin unchose the new repository during
  the move, the end after 10 minutes of a publication whose guard never
  matches and of a failed branch read, the retry of a publication whose
  record already changed, and the new time of the publication after a
  failed branch read.
- [`repository-change-concurrency.test.ts`](repository-change-concurrency.test.ts):
  the hold of turns, Continue, Restart, and Archive, and the runner move
  after publication.
- [`repository-change-native.test.ts`](repository-change-native.test.ts)
  runs the commands with real Git: the exclude rule, the copy that skips a
  file, a linked context folder, a clash, and the settle command.
- [`repository-change-routes.test.ts`](../features/repository-change-routes.test.ts)
  runs a change through the real routes of the production Worker, with a
  runner that cannot move, and the GitHub events of the new repository.
- [`repository-change.test.ts` route](../app-api/repository-change.test.ts):
  the [labels](#labels) of both file lists of a question and of a failure
  message, in a POST and a GET reply. The request, the stored question, and
  the stored message keep the real names. A refusal and each other result
  pass unchanged, with no read of the secret values.
- [`repository-change-labels.test.ts`](../chat/repository-change-labels.test.ts):
  the [labels](#labels) of a new and a replayed note, also on a tab that
  opened before the secret values changed. The job, its keys, and the Git
  commands keep the real names. An old note without labels gets them in
  a new tab, a page of the session history, and both transcript copies.
  Its stored event does not change.
