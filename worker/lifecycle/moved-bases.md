# Moved bases

This guide belongs to the [workspace lifecycle README](README.md). It gives
the job that moves the base of a workspace in its cloud computer: after
GitHub deletes the base, after a rename of the default branch, and when
the merge queue changes the base.
[Base branches](../../docs/protocol/base-branches.md) states the
requirements.

`WorkspaceBaseChanges` in [`workspace-base.ts`](workspace-base.ts) owns deleted-base moves and default-branch changes.
[`saveBaseChangeJob`](base-change-job.ts) saves one `baseChange:job` with the GitHub snapshot marker and alarm source.
[`baseChangeChatStorage`](base-change-storage.ts) registers the native alarm in that same transaction.
The job repairs D1 before it changes the cloud computer.
It retains the same job ID after a D1 failure, a cloud failure, or object hibernation.
Its retry delay starts at one second, doubles after each failure, and stops growing at 15 minutes.
A stopped computer keeps the job until it can run again.
Each resume attempts the same job before startup, even when its retry time is later.
A failed attempt leaves the job and does not fail the resume.

[`saveRepositoryDefaultChange`](repository-default-change.ts) saves a default-branch move before the webhook changes the repository row.
It rechecks the workspace binding, null base, and archive state.
[`currentRepositoryDefaultJob`](repository-default-job.ts) resolves the target against the authoritative saved repository before each attempt.
After installation, it closes unfinished metadata-sync receipts and keeps its retry.
A rejected save prepares again with a fresh receipt before it can change the default.
Repeated preparation and target resolution retain one job ID and its retry count.
Each changed revision has its own isolated fetch stage.
Credential checks, retries, and completion reject an older revision.
The job checks its revision before installation and again before completion.
The guarded webhook write remains the owner of the repository values.
The job uses the same isolated fetch, target installation, and retry path as a deleted-base move.
The workspace base stays null, and the webhook adds no deleted-branch message to the banner.

The [merge queue's move](queue-base-change.ts) saves the base of its
workspace and reuses the same retry and owner fetch. It can store an
explicit base as well as a null base for the default branch.

The [guarded sync](queue-head-sync.ts) uses the same isolated fetch with
the owner's token when GitHub rewrites a queued branch. It checks that
no turn runs and the repository is clean before the fetch and again
before the local move. The fetch pins the new head. The local command
changes the checked-out branch only while it is still at the old head.
The checkout protects local files, including ignored files GitHub now
tracks. If the move needs a restack turn, the queue sends it as the
queuer.

[`base-change-commands.ts`](base-change-commands.ts) shares the isolated fetch and reference installation with Continue.
The fetch uses a bare stage outside the working repository.
Only that fetch exports the trusted job ID for the credential helper.
`credentialSender` maps that ID to the current workspace owner only while the fetch request runs.
It rechecks the org, owner, repository, branch, sandbox ID, and provider account.
A rebuilt object has no credential scope.
An owner who cannot read the repository leaves the fetch pending under the same retry.

The install command imports staged objects without a credential.
It updates `refs/remotes/origin/<base>` before `gh-merge-base` and `origin/HEAD`.
A failed write of these settings ends the install with the status of failed comparison settings.
Continue moves to its new branch through the same install, whose checkout names a clash and an index lock with their own statuses, as [Continue failures](continue-failures.md) says.
The missing-ref guard keeps both settings when the reference is absent.
The install keeps HEAD, the workspace branch, the index, and local files.
A pending Continue or repository change defers the move, so two operations cannot change the target together.
No token or provider output enters the saved job, command, logs, or reply.
[Native Git tests](base-change-native.test.ts) check merge-base comparisons after a merge commit and a refused fetch.
[Native workspace tests](../features/base-moved.test.ts) check D1 repair, retries, hibernation, and resume.
[Credential tests](../features/base-moved-credentials.test.ts) check the owner scope and secret handling.
[Overlap tests](repository-default-race.test.ts) check delivery ordering, unfinished default changes, stale fetches, and interrupted metadata saves.
