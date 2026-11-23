# Merge queue: the GitHub stack

This page belongs to [Merge queue](merge-queue.md). It holds the
requirements and the decisions in force for the GitHub stack of a queue,
its restacks, the restack turns, and the re-order of a queue. The terms are
those of [Merge queue](merge-queue.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The GitHub stack

- Each queue keeps its entries as one GitHub stack (decision 313). The
  bottom layer targets the trunk, and each layer above targets the branch
  of the layer below it.
- Reason: each queued pull request then fixes its conflicts with the work
  ahead of it once, while it waits. The waiting pull requests fix their
  conflicts in parallel, and one merge can land many of them.
- A layer that cannot merge blocks each layer above it, and a re-order
  rebuilds the stack (decision 313).
- Risk: GitHub merges a stack only with a linear history. A merge into the
  trunk from outside the queue, or a push to a lower layer, breaks it. Each
  layer above then needs a restack, one after another, before the next
  merge. So the queue works best when every merge of the repository goes
  through it.
- So while a workspace is queued, each prompt that moves its branch asks
  for a rebase, not a merge, as
  [The prompts of a queued workspace](merge-queue-in-the-app.md#the-prompts-of-a-queued-workspace)
  says.
- A new entry first restacks onto the branch of the layer below it. Its
  pull request then takes that branch as its base on GitHub, and then
  joins the GitHub stack.
- The queue never gives a pull request a base branch that already holds
  the head of that pull request. Reason: GitHub then shows the commits of
  the layer as removed.
- The bottom layer holds the newest head of the trunk when the stack forms.
- These ways were rejected (decision 313):
  - A "merge captain" agent with no change of the app. It is fragile, it
    keeps a cloud computer running, and it has no group in the list.
  - GitHub's own merge queue, with the app as its client, as
    [GitHub's own merge queue](merge-queue.md#githubs-own-merge-queue) says.
  - A queue with no stack. A first entry that needs a fix then holds the
    queue for the fix and a run of the checks.
  - A queue that the agents restack with no GitHub stack. GitHub then runs
    no checks on the combined work ahead, and each merge needs one call for
    each pull request.
  - A queue with no stack first, and stacks later. The user chose stacks
    in the first release.
- A merge with no order was left out, because two pull requests that
  change one file still loop. A combined branch that closes the original
  pull requests was left out, because Continue and the merge records then
  break. A second GitHub App, such as Mergify, Aviator, or Graphite, was
  left out, because each needs a second install in each org and drops a
  pull request on a conflict.

## Restacks

- After each read of GitHub, the queue keeps one rule. From the lowest
  layer that does not hold the newest head of the layer below it, it
  restacks each layer upward, one after another.
- Every cause uses this rule: a join, a re-order, a leave, a push to a
  lower layer, and a merge into the trunk from outside the queue.
- The queue first asks GitHub to rebase the layer on GitHub's servers
  (decision 319). It sends a restack turn only when that rebase has a
  conflict. This changes decision 220 for this one rebase, because the app
  asks GitHub to change the code of a branch.
- Reason: most restacks have no conflict. A turn for each one costs an
  agent turn, a running cloud computer, and minutes.
- A restack turn for every restack was rejected (decision 319). Each
  re-order and each push to a lower layer would then start one turn for
  each layer above, one after another. A rebase that the Worker runs in the
  cloud computer with no agent was left out. It changes decision 220 too,
  and the rebase on GitHub needs no cloud computer.
- On a conflict, the queue sends one restack turn as a message of the
  queuer (decision 321). When that turn ends and the conflict stays, the
  queue sends no second turn. The entry then waits in its place for a
  member, as [Failures](merge-queue.md#failures) says.
- Reason: each pull request then builds on the work ahead with no click,
  which is the goal of the queue. A failure of that turn still goes to the
  user.
- These ways were rejected (decision 321):
  - The user resolves each conflict of a restack, as any conflict. The
    entry and each layer above it then wait for a member.
  - The turn for a join and a re-order, which a member started, and the
    user for a push to a lower layer.
- A rebase with no agent was left out, because a conflict needs a decision
  about the code.
- The restack prompt names the new head of the branch below and the old
  base commit of the layer. It asks the agent to move only the commits of
  the layer with `git rebase --onto`, to resolve each conflict, to run the
  tests, and to push with `git push --force-with-lease`. It asks the agent
  not to merge another branch, and not to merge the pull request. When the
  branch below is at another commit than the prompt names, the agent stops
  and says so.
- Reason: the cloud computers have no `gh stack` extension, and `--onto`
  keeps only the commits of the layer, also after a squash merge below it.
- The mockups give the words of the restack prompt.

## Restack turns

- The queue sends each restack turn as a message of the queuer, to the
  newest open session of the workspace (decision 314). The message follows
  each rule of a message, and the chat shows it as a message of the
  queuer.
- The queue sends it only while no session of the workspace runs a turn.
  Reason: a message during a turn joins that turn, and pushes as the sender
  of that turn.
- A restack turn starts a stopped cloud computer, as a message from the
  agent tools does, as [The resume](stop-and-resume.md#the-resume) says.
- The turn runs on the agent login of its session, as each message does,
  not on a quota of the queuer.
- The sync after GitHub rewrites the branch of a queued workspace can also
  send a restack turn, as
  [The base of a queued workspace](base-branches.md#the-base-of-a-queued-workspace)
  says.

## Re-order

- A member with write access re-orders a queue with a drag in the group, as
  [Drags](merge-queue-in-the-app.md#drags) says.
- A re-order rebuilds the whole GitHub stack, because GitHub cannot unstack
  from a place inside a stack. No merge runs until the new stack exists.
- Each moved entry restacks first, from the bottom up, one after another.
  Its pull request then takes its new base on GitHub, and the layers join
  the stack again.
- A re-order cannot put an entry ahead of a layer that merges.
