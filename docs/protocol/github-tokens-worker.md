# GitHub tokens: the Worker as a member

This page belongs to [GitHub tokens](github-tokens.md). It states how the
Worker acts on GitHub as a member: a merge, Ready for review, the branch
reads, the fetches of Continue and of a moved base, and the steps of the
merge queue. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Merge as the member

- The Worker reads, for each member, the access of that member to the
  repository and the merge method that GitHub gives that member
  (decision 221). It reads with the member's own GitHub token, and the
  answer goes only to that member.
- A member may merge when GitHub gives that member write access or more.
  GitHub still checks the rules of the branch at the merge.
- Reason: GitHub reports no single field for the right to merge.
- The Worker merges with the GitHub token of the member who clicks Merge
  (decision 220). GitHub then shows that member as the merger, and checks
  the rights of that member.
- The merge queue merges with the stored GitHub token of a queuer, or with
  the token of the member who clicks Merge on a queued workspace, as
  [The merge queue](#the-merge-queue) says (decisions 314 and 316).
- A merge with a token of the app was rejected. GitHub would then show the
  app as the merger, and skip the rights of the member.
- The Worker refuses a merge for a person who is not a member of the org,
  in a suspended org, and in an archived workspace.
- No GitHub error text reaches the browser. The Worker gives each refusal
  of GitHub as an error code of the app.
- The Worker also marks a draft ready for review with the GitHub token of
  the member who clicks Ready for review, as
  [Ready for review](github-banner-merge.md#ready-for-review) says. The same
  access rule, refusals, and error codes of the app apply. The user chose
  this on 17 November 2026.

## Branch reads

- The picker of New workspace lists the branches of one repository of the
  org. The Worker reads them live from GitHub with the GitHub user token of
  the member who opens the picker. It stores no list.
- The live branch reply holds only branches that GitHub lists, newest
  commit first. The picker gets its default row from the saved repository.
- The Worker answers only a member of the org, and only for a repository
  of that org. The answer goes only to that member.
- Reason: the browser gets no GitHub token, and each member sees only the
  branches that GitHub shows to that member.
- The branch check of a create asks GitHub for each named branch with the
  GitHub user token of the sender, as
  [The branch check](start-from-a-branch.md#the-branch-check) says. The
  sender of a create call is the sender of the calling turn.
- GitHub then checks the read access of that member. When the token cannot
  read the repository, the app says so, and it does not claim that a
  branch is missing.
- The Worker gives each refusal of GitHub as an error code of the app, as
  for a merge.

## Continue

- Continue reads the merged pull request with the GitHub token of the
  member who pressed Continue. With that token, it also asks GitHub whether
  the base branch of that pull request still exists.
- Continue fetches the latest commit of its base branch with the same
  token (decision 226). GitHub then checks the read access of that member.
  [The base and the new branch](continue.md#the-base-and-the-new-branch)
  gives that base branch (decision 300).
- The workspace runs this fetch as a trusted Continue job, as it runs the
  fetch of a create. The credential route gives the token to that job only
  while its fetch runs.
- The token reaches only that fetch. No Git setting and no hook of the
  repository folder runs with it. Reason: agent code can change the Git
  settings and the hooks of the repository folder.
- Every member may press Continue (decision 224). So the token of a member
  who is not the owner reaches the sandbox of the owner for the fetch, as
  it does for a message of that member.
- A [repository change](repository-change.md) fetches the latest default
  branch of the new repository in the same way, with the token of the
  member who changes the repository.
- These ways were rejected (decision 226):
  - The token of the workspace owner, through the mode that `gh` uses
    outside a turn. It works only in a workspace from a newer org image.
  - An installation token that reads only the one repository. A workspace
    sandbox then gets an installation token, and the fetch needs the revoke
    steps of image builds.

## A moved base

- When GitHub deletes the base branch of a workspace, the Worker moves the
  base branch to the default branch (decision 304). The cloud computer
  then fetches the latest commit of the default branch, as
  [The move in the cloud computer](base-branches.md#the-move-in-the-cloud-computer)
  says.
- That fetch gets the GitHub token of the workspace owner (decision 307).
  The owner's account is the one that `gh` already uses outside an agent
  turn.
- Reason: no member starts the move. The Worker starts it after a GitHub
  read, such as the read after a GitHub webhook. The saved retry of the
  move or a resume runs the fetch. So no turn and no press of a member
  gives a token.
- The workspace runs this fetch as a trusted job, as it runs the fetch of
  Continue. The credential route gives the token to that job only while
  its fetch runs. GitHub then checks the read access of the owner.
- As for Continue, the token reaches only that fetch. No Git setting and
  no hook of the repository folder runs with it.
- These ways were rejected (decision 307):
  - A fetch only with the token of a turn or of the member who presses
    Continue. A move after a GitHub webhook, at a retry, or at a resume
    then gets no token.
  - A base commit that the Worker reads from GitHub and gives to the agent
    runner. It changes the contract of the agent runner.
  - The move at the next agent turn, with the token of the sender of that
    turn. A workspace that waits for review then keeps the old comparison.
  - A button on the message of a moved base, which fetches with the token
    of the member who presses it. Changes then wait for that press.

## The merge queue

- The merge queue acts as the queuer of each entry (decision 314). It
  merges with the stored GitHub token of the queuer of the highest layer
  that it merges, and with the merge method of that queuer. GitHub then
  shows that queuer as the merger, and checks the rights of that queuer.
- Reason: no member clicks the merges of the queue. Automations act with
  the stored token of their owner in the same way.
- This changes decision 228 for the merges of the queue: a merge carries
  the head that the queue last read and checked, as
  [The merge](merge-queue.md#the-merge) says.
- One merge can land the layers of several queuers, with the token of the
  queuer of its highest layer. Reason: each of those queuers asked for a
  merge.
- A click on Merge on a queued workspace merges with the GitHub token and
  the merge method of the member who clicks (decision 316).
- The queue sends each restack turn as a message of the queuer. So Git and
  `gh` in that turn use the token of the queuer, as in each turn of a
  sender (decision 50).
- Add to merge queue on a draft marks it ready for review with the GitHub
  token of the member who adds, as Ready for review does.
- The workspace list reads saved queue facts. Its background refresh uses
  the viewer's GitHub token to check write access. It shares pull request
  and branch rule facts within the org with viewers whose write access
  GitHub confirmed in the last two minutes. Only a successful permission
  check renews this access to the facts.
  Each queue write still checks current access.
- At each step, the Worker checks that the queuer of the entry is still a
  member of the org with write access to the repository, and that the org
  is not suspended. When a check fails, the entry leaves, as
  [Leaving the queue](merge-queue.md#leaving-the-queue) says.
- After a failed refresh of the stored token of the queuer, the entry
  waits, and the line under its bar names the reason.
- Each base move of a queued workspace fetches with the token of the
  workspace owner, as for [a moved base](#a-moved-base) (decision 307).
  Reason: no member starts the move. The sync of the local branch after
  GitHub rewrites it fetches with the same token.
- The other GitHub writes of the queue for an entry use the stored token of
  the queuer of that entry: the base changes and the calls on the GitHub
  stack. Reason: the queue acts as the queuer
  (decision 314).
- When the queuer can no longer act, such as after a leave of the org, the
  leave step resets the base with the token of the member whose action
  caused the leave, such as Remove from queue. With no such member, it uses
  the token of the workspace owner, as for a moved base. When that write
  fails too, the line under the bar names the branch that the pull request
  still targets.
- When the queue removes its GitHub stack, it first uses the token of the
  member who created it. If that member cannot act, the queue tries the
  member whose action caused the leave, followed by the workspace owner
  (decision 323). Each attempt checks that the member still belongs to
  the org and has GitHub write access to the repository. The queue keeps
  the leave actor and workspace with the saved stack for cleanup retries.
- A GitHub close or draft event only asks the queue to read the pull
  request again. The event supplies no member for a base reset.
- These ways were rejected (decision 314):
  - Restack turns as the queuer, but a click on "Merge next" for each
    merge. The queue then stops each time nobody is there.
  - No step without a click. A queue that only shows an order does not
    stop the loop of conflicts.
- A bot account of the app was left out, because work on GitHub always
  runs as a member (decision 50). The workspace owner was left out, because
  the owner did not ask for the merge.
