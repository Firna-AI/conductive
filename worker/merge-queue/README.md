# Merge queue backend

The merge queue stores an ordered list of workspaces for one repository
of an org. [Merge queue](../../docs/protocol/merge-queue.md) gives the
requirements.

The queue object uses the name `merge-queue:<orgId>:<githubRepositoryId>`
in the `Workspace` class. It checks that name on each call. The object runs
member changes, leave requests, and alarms in one sequence. A wake keeps
the earliest saved alarm. The alarm can run after the object restarts.

D1 stores the trunk, the last pull request seen on it, the optional GitHub
stack number, entries, and step times. It saves the head and wait reason
for the bar. Admission checks for entries or a stack creation in another
org in the same D1 batch that records the new entries. The browser gets a
fixed refusal without entry or org details for that queue.

Admission records the GitHub base and the common commit of the base and
pull request head. The list projects the planned base and unit suffix for
Remove from queue using the same rules as the leave step. The bar projects
the intended base from queue order and sends the saved old base commit
for the matching head. The app uses these facts for the rebase prompts.

Admission reads the current pull requests and trunk rules with the
requesting member's token. It checks their base chain and verifies a
member stack that GitHub records. A new unit joins at the end. An extension
keeps the same unit and fills the places after its lower entries. A move
uses a workspace in the next unit as its anchor, or null for the end.

When a member's stack has unqueued layers above a queued unit, the queue
uses that stack to merge the unit when it reaches the front. The queue
checks the live stack before it sends the merge. Other units wait in order.
After this unit merges, the next unit restacks onto the trunk. A member
can also select Merge stack on an unqueued upper layer. The queue verifies
the same ready prefix, the clicked head, the stack count, and local work
before submitting the merge as that member.

The leave step reads the lowest open pull request of each leaving unit
and resets its base to the stored trunk. It uses the queuer's token when
the queuer can act, then the member who caused the leave or the owner.
The step saves a notice for a failed base reset. Upper entries of a
member stack keep their member base. A signal for a member's own base
change keeps the new base. The leave step also keeps a member's new base
when another leave reaches the queue before the edited webhook.

The step removes the affected suffix and compacts the places. A merge
removes each completed layer. A wake names the entry's branch and can
name its pull request number. Archive, Continue, and a repository change
send the binding from before the move. A pull request webhook wakes the
queue. The live GitHub state decides whether a close or draft makes an
entry leave. The object saves leave signals from workspace actions that
arrive during a merge.

The queue reads the trunk and each layer again before it selects a merge.
It starts with the lowest layer that needs a restack. Commit comparisons
check that the layer includes the newest base and drops commits from any
old lower layer that the new base does not include. A restack sends the
fixed prompt once for that base and head. Its Git commands use pull request
refs and verified commits. The message shows the masked branch label.
If the turn leaves the commits out of order, the entry waits for a member.

The queue rechecks both refs before it changes a pull request's base.
It records the intended edit before GitHub receives the write. A new
stack starts with two pull requests. Further layers append in order.
A leave or a re-order unstacks the old stack before the remaining layers
join it again under a new number. After a re-order clears the old stack,
the ready prefix can merge while a later layer restacks. If a stack
creation loses its response, the next read can recover the new stack
number from GitHub. An empty queue can keep its saved stack for cleanup.
Another org can queue work in the repository and leaves that stack to
the owning queue. The leave that marks the stack for
cleanup saves its actor and workspace with the stack number. If the stack
writer cannot act, cleanup tries the saved actor and then the workspace
owner. Cleanup retries use a delay that doubles from 30 seconds up to 15
minutes.

An edited webhook wakes the queue. The queue checks the current GitHub
base against the saved base and the edit it requested. It also accepts
GitHub's retarget after a lower merge. An independent edit makes the
workspace leave and keeps its new base. Each workspace base change uses
[the saved owner-token move](../lifecycle/moved-bases.md). After GitHub
rewrites a branch, a guarded sync checks the local head before it moves.
When the local branch has additional work, the restack turn moves only
that work onto the rewritten head and asks for a plain push.

Each restack is one restack turn (decision 319 A). GitHub's server rebase
failed a live check after a squash merge below, so the queue does not use it.

The coordinator checks the ready layers from the trunk up. It reuses
the GitHub bar state and checks each workspace's local work. A dirty
repository and an unavailable local read have separate waits. Their
retries double from 30 seconds up to 15 minutes. The queue can wait 15
minutes for the next layer's checks. A member's request to
merge skips that wait. The coordinator verifies the live trunk and
stack before it starts the async merge. Each submission checks local work
again and saves the sent mark before calling GitHub. A pending submission
with a lost reply waits for clean workspaces before it can recover the job
through GitHub's conflict response. The queue saves the result ID and poll
time once GitHub supplies them. It reads the pull requests again at the
end and records the layers that merged. A refused layer stays in its place
with the refusal tied to the head of the saved merge job.

A caller gives the queue an ID for one restack and the commits that the
prompt needs. The coordinator saves the request and runs it on its alarm.
It uses the same message ID on each attempt. Before it sends, it checks
the entry and the queuer's current access. It retries a wait for a turn,
an agent login of the queuer, or a GitHub sign-in without a deadline.
The workspace saves the message with its receipt, in a new session of
the queuer, then the normal
accepted-message path resumes the cloud computer when necessary.

The workspace reports the final state of the turn from its own alarm.
The coordinator saves the result under the restack ID. The next step
checks the pushed branch against the latest base again.
If the branch still needs a rebase, the bar shows Resolve conflicts and
uses the intended base of the queue.

## Development

Run `npm run test -- worker/merge-queue`.
The [Worker smoke test](smoke.test.ts) runs a join, a re-order, a failed
check, and a merge through the app routes and a fake GitHub server.

### Key Code

- [The member routes](../app-api/merge-queue.ts) use the app gate and send
  each change to its queue object.
- [QueueCoordinator](coordinator.ts) owns member changes and alarms.
- [Admission](admission.ts) reads the unit and adds its entries.
- [Queue steps](step.ts) select and run a leave, a trunk check, or the
  completion of a saved write.
- [Restacks](restacks.ts) read the open layers and move them from the
  trunk up. [Stack changes](stack-changes.ts) manage membership and
  recover a stack creation after a retry.
- [Merge selection](merges.ts) checks the ready layers and starts a merge.
- [Member stack merges](merge-stack-top.ts) check the unqueued part of the
  stack against the ready queue prefix and the clicked head.
- [Merge jobs](merge-job.ts) start, poll, and resume a saved GitHub merge.
- [Base resets](leave-base.ts) check member access and reset a base on leave.
- [Fix turns](fix-turns.ts) save restack requests, waits, and turn results
  in the queue's sequence.
- [Fix reports](fix-report.ts) deliver the workspace's saved turn results
  and keep failed deliveries for its next alarm.
- [Queue reads](read.ts) project the list entries and bar state.
