# GitHub refresh and saved state

This guide belongs to the [GitHub banner backend](README.md).

## Refresh behavior

Each webhook triggers a fresh read instead of applying old payload state.
Resolving or unresolving a review thread refreshes its pull request branch.
An `edited` pull request webhook refreshes the head branch and reads the current base from GitHub.
Repository and installation IDs must match active local records.
A foreign fork's same-named branch cannot update a workspace in the base repository.
Push routing sends the active repository workspaces to their coordinators as candidates.
A coordinator with a stored state of its current branch decides without GitHub.
It reads when the pushed branch is its head or the base of its open pull request.
A push to an explicit workspace base reads it even without an open pull request, so a deleted base can move.
Other pushes to a base of a merged or closed pull request, or to a branch without a pull request, are skipped.
Without that stored state, the coordinator reads the current head branch, head commit, pull request, and base branch.
It refreshes when the pushed branch is the head, the live base of an open pull request, or the stored target.
A push to the earlier target can thus follow a retarget that the current GitHub read finds.
An unrelated push returns `null` and stores no snapshot or event.
A check event that names a branch reaches only the workspaces of that branch.
A check suite names `head_branch`, a check run names the branch of its suite, and a status names its `branches`.
A check event that names no branch, such as a status of a test merge commit, reaches each workspace.
That workspace reads only for an open pull request, or when it has no stored state of its branch.
The routing never uses the payload's pull request list.
A changed banner or check publishes one fresh event.
A later identical read publishes none.
Retrying an already committed delivery republishes its original event without another GitHub read.
An unchanged delivery receipt has no envelope to publish.
For a push, each workspace refresh runs even when an earlier workspace fails.
The image refresh runs after those workspace steps, also when a workspace fails.
A push can complete when a `github_pending` workspace has scheduled its bounded fresh read.
Other workspace failures and image refresh failures leave the delivery retryable.
The handler returns the error after the independent steps run.
For other events, the handler marks a delivery processed only after all workspace refreshes succeed.
A failed read or commit of those events leaves the delivery retryable.
A failure after the commit also leaves it retryable.
The retry then replays the receipt.
A failed send to one tab does not fail the refresh.
[History and event order](../chat/README.md#history-and-event-order) says how that tab gets the missed event.

Pull request lookup prefers an open request for the exact repository and branch.
It then considers merged and closed requests, in GitHub's newest-created order.
Each lookup page reads five pull requests with their banner fields, both check rollups, and latest opinionated reviews.
Each check and review connection includes its first 100 entries.
When those first pages are complete, an open pull request needs one GraphQL query.
A merged or closed pull request needs two lookup queries, including the empty open lookup.
Further lookup pages and later pages of the chosen check rollup or reviews need additional queries.
Without a pull request, a GraphQL comparison uses the explicit head commit and the workspace base branch.
It reads the commit count and repository identity.
It selects no file patches.
The reader follows every lookup, review, and check connection page.
The combined GitHub check rollup supplies check runs and status contexts in returned order.
The reader chooses the test merge commit's rollup when it has at least one check run or status context.
Otherwise, it chooses the head commit's rollup.
The banner and Checks response use that same chosen list.
Each chosen rollup page must keep the captured head and test merge commit IDs.
Check runs use their completed and started times for duration.
Commit status contexts supply no run start time, so their duration remains null.
All links point to GitHub.

The reader maps BEHIND and BLOCKED to the shared `blocked` banner.
Terminal, draft, conflict, review, and check states take priority over `blocked`.
The banner keeps the pull request's GitHub link and the existing shared fields.
Its `pullRequest.headSha` is the head commit that the reader captured, which a merge sends back.
The banner read adds no blocker reasons. The separate member routes own merge writes.
An unresolved merge condition still returns `github_pending` with HTTP 503.
UNKNOWN mergeability or merge state remains retryable when no earlier state applies.
UNSTABLE remains retryable if the read checks show no failed, running, or queued check.
It keeps the previous stored state until a read can confirm the current state.
The bounded scheduled reads retry that state without a browser request.

The webhook candidate query skips archived workspaces: `archived_at` is set or the state is `archived`.
An archived workspace still reads GitHub when a tab asks, and its scheduled reads still run.
No other workspace state limits a GitHub read or webhook refresh.
This includes a workspace in `input` while its agent waits for the user.

## The base of an open pull request

An open pull request, including a draft, supplies the target for the workspace and its banner.
A merged or closed pull request leaves the stored target in use.
The private `pullBaseBranch` snapshot field still gives Continue the GitHub base of that pull request.
[Base branches](../../docs/protocol/base-branches.md#the-base-of-an-open-pull-request) states the follow rule.

The refresh compares the pull request base with the stored target.
It resolves a null target against the default branch from the same GitHub read.
When the target changes, [writeWorkspaceTarget](base-data.ts) checks the earlier base before it writes to D1.
It stores a target on the live default branch as null.
[saveWorkspaceTargetChange](../lifecycle/base-change-job.ts) then saves the move and its alarm in the snapshot transaction.
It replaces the earlier saved move and clears its repair marker.
The workspace refresh queue runs this sequence one read at a time.

If GitHub renames its default branch and the open pull request follows that rename, a null target still matches.
The repository webhook saves the cloud move in that case.
[Moved bases](../lifecycle/moved-bases.md) describes the fetch and retry.

## A deleted base

When the workspace branch has no open pull request, the reader checks its explicit base through [checkRepositoryBranch](branch-check.ts).
Only `branch_not_found` moves the base to GitHub's live default branch.
A failed read or missing repository access keeps the base.
[Base branches](../../docs/protocol/base-branches.md#a-base-branch-that-github-deleted) states the requirement.

The snapshot records its private `baseChange` repair marker with one saved `baseChange:job` and its alarm source in the same transaction.
The native alarm registers before that transaction commits.
[moveWorkspaceBase](base-data.ts) then writes a null workspace base and records the live repository default in one D1 batch.
Its guards bind the write to the repository, installation, workspace branch, and earlier base.
Replaying an applied move does not overwrite a newer repository default.
Each refresh reads the current stored base, so a saved refresh binding cannot restore the deleted base.
The refresh repairs an earlier deleted-base snapshot when it sees no open pull request or skips an unrelated event.
The job also repairs D1, so a failed D1 write has a saved retry.
The snapshot keeps the marker until the cloud move completes.

The public banner's optional `baseMoved` field names the deleted branch, and `filterGitHubBanner` adds its masked label `displayBaseMoved`.
The Worker keeps it across reads and object rebuilds until a pull request opens.
The app can use it with `barMessageText` and the `baseMoved` fact of the shared bar model.
The banner names the default branch and compares commits with it.

The GitHub read runs no cloud command.
A cloud failure cannot fail a banner read, a merge reply, or the verify read of Continue.
[Moved bases](../lifecycle/README.md#moved-bases) describes the shared isolated fetch and reference installation, the owner credential, resume, and the one retry job.

## The summary copy

[The GitHub state](../../docs/protocol/github-banner.md#the-github-state) states that the summary is the bar state.
`githubSummary` in the [shared contracts](../../src/shared/github.ts) gives the value from a banner: its state, or null without a pull request and for a closed pull request.
`pullBanner` uses `checksSummary` for `checks-failed` and `checks-running` after its draft, conflict, and review checks.
So the bar and the copy cannot disagree.
After a commit, an unchanged read, or a receipt replay, `WorkspaceGitHubState` reads the committed `github:state` again.
It checks access once more and calls the copy callback with that snapshot, before the next refresh starts.
So a replay of an older receipt copies the current state, not the snapshot of its receipt.
The replay still publishes the original event of that receipt.
An unchanged read publishes no event, but it still repairs a missing or old copy.
The base-change job clears its private marker when the cloud move completes.
A read that returns `null` leaves the committed snapshot in place.
`saveWorkspaceGitHubSummary` updates only `github_summary`, when the value differs and the workspace still has the snapshot's branch.
Continue and a repository change clear the summary when they store the new branch, so an old branch's copy cannot restore its mark.
The summary copy changes no activity time, update time, or list position.
A failed copy rejects the refresh, so the delivery stays retryable.
The retry of a committed delivery replays its receipt and copies again, without a GitHub request or a fresh event.

## The merge record

[The merge record](../../docs/protocol/account-stats.md#the-merge-record) gives the requirements.
[merge-record-data.ts](merge-record-data.ts) writes one row of `pull_request_merges` for each merged pull request, keyed by the GitHub repository ID and the number.
A repeated write changes nothing, so the first workspace and its owner at that time keep the merge.
Each write reads the owner from the workspace row and skips a workspace of a deleted org.
The copy callback of the refresh writes the row after the summary copy, when the committed banner is `merged` and has a merge time.
So a merge from the app, a merge on GitHub, a tab read after a missed event, and a receipt replay all write it.
The merged `pull_request` event writes the row for the oldest workspace of its repository, installation, and head branch, also an archived one, with no GitHub read.
It takes `merged_at` from the event, and the delivery time when the event has none.
A failed write fails the delivery after the other work of the event, so the delivery stays retryable.
GitHub does not resend a failed delivery by itself, so the next refresh of a workspace that is not archived repairs a missed row.
The org purge removes the rows through the foreign key of the org.
