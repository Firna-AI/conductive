# Merge queue: the GitHub stack

This page belongs to [Merge queue](merge-queue.md). It holds the
requirements and the decisions in force for the GitHub stack of a queue,
its restacks, the restack turns, and the re-order of a queue. The terms are
those of [Merge queue](merge-queue.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The GitHub stack

- Each queue keeps its own GitHub stack (decision 313). The bottom layer
  targets the trunk. Each layer above targets the branch of the layer
  below it.
- Reason: each queued pull request then fixes its conflicts with the work
  ahead of it once, while it waits. The waiting pull requests fix their
  conflicts in parallel, and one merge can land many of them.
- A layer that cannot merge blocks each layer above it, and a re-order
  rebuilds the stack (decision 313).
- A queued unit below unqueued pull requests in a member's GitHub stack
  keeps that stack (decision 322). The queue merges its ready layers
  directly from the member's stack when the unit reaches place 1. A member
  can include unqueued layers with
  [Merge stack](merge-queue-in-the-app.md#merge-stack) (decision 324).
- The queue merges the units ahead of that unit first. The units after it
  wait for it to merge. The next unit then restacks onto the trunk.
- Breaking up the member's stack would remove GitHub's stack checks and
  automatic rebases for its upper pull requests (decision 322).
- Each queue owns its saved stack number. A later queue for the same
  repository leaves that stack to its owner, even when the owner has no
  entries. If cleanup fails, the owning queue retries with a delay that
  doubles from 30 seconds up to 15 minutes.
- Risk: GitHub merges a stack only with a linear history. A merge into the
  trunk from outside the queue, or a push to a lower layer, breaks it. Each
  layer above then needs a restack, one after another, before the next
  merge. So the queue works best when every merge of the repository goes
  through it.
- So while a workspace is queued, each prompt that moves its branch asks
  for a rebase, not a merge, as
  [The prompts of a queued workspace](merge-queue-in-the-app.md#the-prompts-of-a-queued-workspace)
  says.
- An entry that joins the queue's stack first restacks onto the branch of
  the layer below it. Its pull request then takes that branch as its base
  on GitHub and joins the stack.
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
- The queue keeps each queued layer of a member's partial stack on its
  existing GitHub base.
- Every cause uses this rule: a join, a re-order, a leave, a push to a
  lower layer, and a merge into the trunk from outside the queue.
- Each restack is one restack turn of the queue (decision 319 A, chosen on
  25 November 2026). After a merge of a layer, GitHub moves and rebases the
  layers above it by itself, so that move needs no turn.
- Reason: a live check showed that GitHub's server rebase replays the
  commits of a layer that was squash-merged below, and stops with a
  conflict. An agent skips those commits.
- GitHub's server rebase first, with a turn only on a conflict, was
  rejected (decision 319 B). It failed the live check after a squash merge
  below. A rebase that the Worker runs in the cloud computer with no agent
  was left out, because it changes decision 220.
- When a restack has a conflict, the queue sends one restack turn as a message of the
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
- The restack prompt shows the branch with its masked label. It fetches
  the pull request below by number, or GitHub's `HEAD` for the trunk.
  It names the verified head and the old base commit. The agent moves only
  the layer's commits with `git rebase --onto`. It resolves each conflict,
  runs the tests, and pushes with `git push --force-with-lease --force-if-includes`.
  The prompt keeps the branch history linear and the pull request open.
  The agent stops and reports a moved base head or a refused push.
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
  says. The turn fetches the rewritten head by pull request number and
  checks its commit. It rebases only the local work
  with `git rebase --onto`, using the old GitHub head as the cutoff. It then
  uses a plain push and stops if Git refuses it.

## Re-order

- A member with write access re-orders a queue with a drag in the group, as
  [Drags](merge-queue-in-the-app.md#drags) says.
- A re-order rebuilds the queue's own GitHub stack, because GitHub cannot
  unstack from a place inside a stack. A merge waits for the queue to
  prepare the units that are first in the new order.
- Each moved entry restacks first, from the bottom up, one after another.
  Its pull request then takes its new base on GitHub, and the layers join
  the stack again.
- A re-order cannot put an entry ahead of a layer that merges.
