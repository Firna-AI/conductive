# Moved bases

This guide belongs to the [workspace lifecycle README](README.md). It gives
the job that moves the base of a workspace in its cloud computer. The job
handles a deleted base, a renamed default branch, and a new target.
[Base branches](../../docs/protocol/base-branches.md) states the
requirements.

`WorkspaceBaseChanges` in [`workspace-base.ts`](workspace-base.ts) runs each saved move.
[`saveBaseChangeJob`](base-change-job.ts) saves a deleted-base move with the GitHub snapshot marker and alarm source.
[`baseChangeChatStorage`](base-change-storage.ts) registers the native alarm in that same transaction.
For a deleted base, the job repairs D1 before it changes the cloud computer.
Each workspace has one saved move at `baseChange:job`.
It retains the same job ID after a D1 failure, a cloud failure, or object hibernation.
Its retry delay starts at one second, doubles after each failure, and stops growing at 15 minutes.
A stopped computer keeps the job until it can run again.
Each resume attempts the same job before startup, even when its retry time is later.
A failed attempt leaves the job and does not fail the resume.

[`writeWorkspaceTarget`](../github/base-data.ts) compares the earlier stored base before it writes the new target in D1.
It stores null for the live default branch from the same GitHub read.
[`saveWorkspaceTargetChange`](base-change-job.ts) takes the result of that write.
It saves the job and alarm source in a chat transaction and clears any old repair marker.
The optional `target` field holds the new stored base. `change.from` holds the earlier branch name.
The job reads D1 to check the target before it fetches and installs the branch.
It ends when the record moves to another target.
A move to the live default can run while the repository row still has its earlier default name.

The previous Worker reads the original job fields.
The guarded D1 write has already moved the record away from `change.from`.
The previous Worker drops a move to a non-default target.
It can finish a move to the saved default with the workspace base already null.
Its D1 statements match zero rows in both cases.

[`saveRepositoryDefaultChange`](repository-default-change.ts) saves a default-branch move before the webhook changes the repository row.
It rechecks the workspace binding, null base, and archive state when it saves the move.
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
A new target replaces an unfinished move with a new job ID.
The old fetch loses its credential scope, and an unfinished rename delivery stays with its webhook.

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
[Target move tests](base-change-job.test.ts) check the guarded record write, replacement, and the previous Worker format.
[Target resume tests](../features/base-moved-target.test.ts) check the fetch on resume after hibernation and installation after a failed fetch.
[Credential tests](../features/base-moved-credentials.test.ts) check the owner scope and secret handling.
[Overlap tests](repository-default-race.test.ts) check delivery ordering, unfinished default changes, stale fetches, and interrupted metadata saves.
