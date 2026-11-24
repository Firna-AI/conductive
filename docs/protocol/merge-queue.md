# Merge queue

This doc holds the requirements and the decisions in force for the merge
queue. Each repository of an org has one queue that merges pull requests
into the default branch. This page covers who may join, member stacks,
the leave, the merge, and the failures.
[Merge queue: the GitHub stack](merge-queue-stack.md) holds the stack, its
restacks, the restack turns, and the re-order.
[Merge queue in the app](merge-queue-in-the-app.md) holds the Merge queue
group of the workspace list, the controls, and the bar of a queued
workspace.
[The base of a queued workspace](base-branches.md#the-base-of-a-queued-workspace)
holds its base branch.
[The merge queue](github-tokens-worker.md#the-merge-queue) in GitHub
tokens holds whose GitHub access each step uses.

The terms are those of the [architecture doc](../architecture.md#terms)
and the terms below. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. The
[mockup catalogue](../mockups/catalogue.md) draws the queue at
`app/merge-queue` and `app/banner/merge-queue`.

## Terms

- **Queue:** the ordered list of the queued workspaces of one repository
  of an org. They merge into the default branch of the repository.
- **Entry:** one queued workspace, with its open pull request, its place,
  and its queuer.
- **Queuer:** the member who added an entry to the queue.
- **Place:** the position of an entry in its queue. Place 1 merges first.
- **GitHub stack:** GitHub's own stacked pull requests. The bottom pull
  request targets the trunk. Each pull request above it targets the branch
  of the pull request below it. A merge of one pull request also merges
  each pull request below it, in one step.
- **Trunk:** the branch at the bottom of the GitHub stack of a queue. It is
  always the default branch of the repository (decision 320).
- **Layer:** one pull request of the GitHub stack. The entry at place 1 is
  the bottom layer.
- **Member stack:** pull requests that a member stacked without the queue,
  such as with a start from another branch (decisions 298 and 301).
- **Unit:** the entries of one member stack, or one entry alone. A unit
  joins and moves as one.
- **Restack:** a move of the commits of a layer onto the newest head of the
  branch below it. A rebase on GitHub or a restack turn makes the move.
- **Restack turn:** an agent turn that the queue sends as a message of the
  queuer, with the fixed restack prompt.

## One queue for each repository

- Each repository of an org has one queue. Its trunk is the default branch
  of the repository (decision 320).
- Reason: the queue lands work in the default branch, where the conflicts
  come from.
- A queue for each target branch was rejected (decision 320). It adds a
  block for each branch, and a rule for the trunk of each queue.
- A rename of the default branch keeps every entry. GitHub moves the base
  of each open pull request to the new name, and that move is not a leave.
  The queue then merges into the new name. Reason: decision 310 rejected a
  rename that makes members act again.
- The queue remembers the last pull request it saw targeting the trunk.
  It can use that pull request to confirm a rename after a leave or a
  re-order changes which entry comes first. Merges wait during the check.
- A switch of the default branch to another branch makes every unit leave,
  before any restack. Reason: the trunk of the stack is then not the
  default branch, and no member chose the new one.
- Every member of the org sees each queue of the org, in the same order.
  Reason: every member sees one order, as for sections.
- A member with write access or more to the repository can add, remove,
  and re-order its entries. Reason: Merge already needs that access
  (decision 221).
- A member reaches only the queues of the repositories of the org.
- Two orgs can save the same repository. A unit cannot join while another
  org has entries or is creating its GitHub stack for that repository.
  Reason: two active queues would interfere with the same GitHub stack.
  Each org sees only its own entries.
- In a suspended org, the Worker refuses each change of a queue, and every
  unit leaves.
- The steps of one queue never run at the same time. Reason: the steps
  read and change the same queue and pull requests.
- The agent tools do not add to, remove from, or re-order a queue.

## Who may join

- A workspace can join while its branch has an open pull request from the
  same repository. The pull request can join in any state, also with
  failed checks or a conflict. The entry then waits in its place until a
  member fixes it, as [Failures](#failures) says.
- Reason: the user asked that each workspace with a pull request can join.
- The bottom pull request of each unit must target the default branch on
  GitHub (decision 320). The upper pull requests of a member stack target
  the branch below them, and they join with their unit. A unit that targets
  another branch, such as `develop`, cannot join.
- The same rule holds at each read of GitHub: a unit stays while its bottom
  pull request targets the default branch on GitHub. Reason: outside the
  queue, the base branch of a workspace does not follow GitHub, as
  [Base branches](base-branches.md#the-base-branch-of-a-workspace) says.
- Add on a draft first marks it ready for review with the GitHub access of
  the member who adds, as
  [Ready for review](github-banner-merge.md#ready-for-review) does.
  Reason: GitHub does not merge a draft.
- A pull request from a fork cannot join. Reason: a GitHub stack needs
  every branch in one repository.
- A pull request into a default branch that needs GitHub's own merge queue
  cannot join, as [GitHub's own merge queue](#githubs-own-merge-queue)
  says.
- An archived workspace and a workspace of a suspended org cannot join.
- A new unit joins in the last place in the queue.
- A workspace that cannot join gets no Add to merge queue, and the drop
  target of the group names the reason, as
  [Add to merge queue](merge-queue-in-the-app.md#add-to-merge-queue) says.
  Reason: a control that is sure to fail helps nobody, as for Merge.

## Member stacks

- A member stack moves through the queue as one unit (decision 315). Its
  upper pull request always stays directly above its lower pull request.
- The queue reads a member stack from GitHub: the base of each pull request
  on GitHub, and a stack that a member made on GitHub. Reason: the base
  branch of a workspace does not follow a base change on GitHub outside the
  queue (decisions 301 and 304).
- Add on an upper workspace of a member stack also adds each lower pull
  request of the stack that is not queued yet, in stack order.
- If a queued unit is the lowest part of a member's GitHub stack and the
  upper pull requests are outside the queue, the queue merges from that
  stack (decision 322). An automatic merge lands only the queued layers
  and leaves the upper pull requests in the member's stack.
- The same rule applies if the member creates the stack after Add. Other
  units keep their queue order, as
  [The GitHub stack](merge-queue-stack.md#the-github-stack) says.
- A drag moves the whole unit, and a drop never splits a unit.
- When a lower entry leaves for another cause than its merge, each entry
  above it in its unit leaves with it, in the same leave step. Reason: those
  entries build on its branch. So Remove from queue on a lower entry also
  removes the entries above it in its unit, and its question says so.
- These ways were rejected (decision 315):
  - The upper pull request takes any place, and waits until the lower one
    merges. The queue can then hold a layer that cannot merge.
  - A stacked pull request cannot join until its lower one merged. This
    adds a refusal.

## Leaving the queue

- One leave step serves every cause. The causes are:
  - a merge, a close, or a change to draft of the pull request
  - an archive, a repository or branch change, or Continue of the workspace
  - Remove from queue
  - a base change on GitHub that the queue did not make
  - a queuer who left the org or lost write access, as
    [The merge queue](github-tokens-worker.md#the-merge-queue) says
  - a suspended org
  - a switch of the default branch
- A close or draft event wakes the queue, and the current GitHub state
  decides whether the entry leaves.
- When the cause is a base change on GitHub that the queue did not make,
  the leave step keeps the new base. Reason: a member chose that base.
- For each other cause, the leave step sets the GitHub base of the lowest
  open pull request of the leaving unit back to the trunk. An upper pull
  request of a member stack keeps the branch below it in its stack instead,
  also when it is the lowest pull request that leaves. Reason: no entry then
  keeps the branch of another entry as its base, and a removal does not
  break the stack that a member made (decision 315).
- The leave step then moves the units above onto the unit below, by the
  rule of [Restacks](merge-queue-stack.md#restacks).
- An entry that leaves loses its place. A later add puts it at the top of
  the stack again.
- A layer that merges offers no Remove from queue. Reason: a merge cannot
  stop for a removal.

## The merge

- The queue merges the highest layer whose bar state is ready to merge,
  when each entry ahead of it is in the same GitHub stack and ready to
  merge. GitHub then merges each layer below it in the same step.
- Reason: the bar state already reads the checks, the conflicts, the
  reviews, and the block of the rules of GitHub, such as unresolved
  threads, as [Banner states](github-banner.md#banner-states) says.
- While the layer directly above the highest ready layer runs its checks,
  the queue waits for it, up to 15 minutes. Reason: each merge makes GitHub
  rebase each layer above and run their checks again. So a merge at once
  would often land only the bottom layer.
- A click of Merge on a queued workspace asks the queue to merge up to that
  layer as its next step, without that wait, as
  [Merge on a queued workspace](merge-queue-in-the-app.md#merge-on-a-queued-workspace)
  says (decision 316).
- A click of [Merge stack](merge-queue-in-the-app.md#merge-stack) above a
  queued member unit asks this org's queue to merge through the clicked
  pull request (decision 324). The queue checks the ready prefix, the
  shown stack count and head, and the local work of the clicked workspace
  and each queued workspace before sending the merge. It uses the
  clicker's GitHub token and merge method.
- The merge is a direct merge under the rules of the branch, with no bypass
  of the rules. GitHub keeps the final say.
- The merge carries the head of the highest layer that the queue last read
  and checked (decision 314). This changes decision 228 for queued merges,
  where a merge carries the head that a member saw.
- An automatic merge uses the stored GitHub token and the merge method of the
  queuer of the highest layer, as
  [The merge queue](github-tokens-worker.md#the-merge-queue) says.
- A layer whose cloud computer holds local work is not ready. The queue
  waits for the workspace to have no unpushed work. The bar puts Commit and
  push before Merge.
  Reason: a merge must not leave that work behind (decision 228).
- The queue also waits if it cannot check local work. It retries either
  wait after 30 seconds and doubles the delay up to 15 minutes. A check with
  no local work clears the wait. This also lets a local revert clear it.
- The queue checks local work before each merge submission. If a reply is
  lost, it waits for this check to pass before it can retry the submission
  or recover the accepted job.
- After a re-order, a merge waits for the old stack to clear. It can then
  land the ready layers in the checked prefix while a higher layer restacks.
- A stack merge can stop partway. After each merge, the queue reads each
  layer again before its next step.
- Each merged layer leaves the queue and gets a merge record, as a merge
  from the bar does. [The merge record](github-banner-merge.md#the-merge-record)
  says when the Worker records a merge. Continue then works in each merged
  workspace.

## Failures

- The user handles each failure, as outside the queue. A member fixes the
  pull request, or removes the entry. The user chose this on 22 November
  2026.
- The queue sends no turn for failed checks or for requested changes. The
  bar of the workspace shows Fix checks or Address review, as outside the
  queue.
- A conflict of a restack gets one restack turn, as
  [Restacks](merge-queue-stack.md#restacks) says. When the conflict stays,
  the bar shows Resolve conflicts.
- An entry that cannot merge keeps its place. The layers below it still
  merge, and the layers above it wait for it. A member who wants the layers
  after it to merge first removes it, or drags it to a later place.
- Reason: the user asked for no part of the list of its own for failures,
  and for the user to decide.
- One fix turn of the queue, and then a move of the entry out of the stack
  as "Needs attention", was rejected for that reason.
- After a failed refresh of the stored GitHub token of the queuer, the
  entry waits. After GitHub refuses the merge, the entry keeps its place
  too. The refusal applies to the head sent in that merge request. A new
  head gets its own check.
- The line under the bar of a waiting entry says what the queue waits for.
  It also names a failed token or a refused merge, as
  [The bar of a queued workspace](merge-queue-in-the-app.md#the-bar-of-a-queued-workspace)
  says.

## GitHub's own merge queue

- The queue does not use the merge queue of GitHub.
- A pull request into a default branch whose rules need a GitHub merge
  queue cannot join. Reason: the queue would otherwise run every restack,
  and then fail at the merge.
- GitHub's merge queue, with the app as its client, was rejected
  (decision 313). It allows only a jump to the front, it drops a pull
  request on a conflict, and it needs a merge queue rule and a
  `merge_group` trigger of the checks in each repository.
