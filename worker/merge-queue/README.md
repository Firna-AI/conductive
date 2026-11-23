# Merge queue backend

The merge queue stores an ordered list of workspaces for one repository
of an org. [Merge queue](../../docs/protocol/merge-queue.md) gives the
requirements.

The queue object uses the name `merge-queue:<orgId>:<githubRepositoryId>`
in the `Workspace` class. It checks that name on each call. The object runs
member changes, leave requests, and alarms in one sequence. A wake keeps
the earliest saved alarm. The alarm can run after the object restarts.

D1 stores the trunk, the optional GitHub stack number, entries, and step
times. It saves the head and wait reason for the bar. Admission checks for
entries of another org in the same D1 batch
that records the new entries. The browser gets a fixed refusal when the
repository is in use. It gets no entry or org details for that queue.

Admission records the GitHub comparison's merge base against the exact
pull request head. A later read can carry the saved base to a new head
after GitHub confirms ancestry. The bar sends the base for the matching
head, so the conflict prompt can move the layer's own commits.

Admission reads the current pull requests and trunk rules with the
requesting member's token. It checks their base chain and verifies a
member stack that GitHub records. A new unit joins at the end. An extension
keeps the same unit and fills the places after its lower entries. A move
uses a workspace in the next unit as its anchor, or null for the end.

The leave step reads the lowest open pull request of each leaving unit
and resets its base to the stored trunk. It uses the queuer's token when
the queuer can act, then the member who caused the leave or the owner.
The step saves a notice for a failed base reset. Upper entries of a
member stack keep their member base. A signal for a member's own base
change keeps the new base.

The step removes the affected suffix and compacts the places. A merge
removes each completed layer. A wake names the entry's branch and can
name its pull request number. Archive, Continue, and a repository change
send the binding from before the move. A webhook can wake or leave the
queue. The object saves leave signals that arrive during a merge.

The coordinator checks the ready layers from the trunk up. It reuses
the GitHub bar state and checks each workspace's local work. The queue
can wait 15 minutes for the next layer's checks. A member's request to
merge skips that wait. The coordinator verifies the live trunk and
stack before it starts the async merge, then saves the result ID and
the poll time. It reads the pull requests again at the end and records
the layers that merged. A refused layer stays in its place.

A caller gives the queue an ID for one restack and the commits that the
prompt needs. The coordinator saves the request and runs it on its alarm.
It uses the same message ID on each attempt. Before it sends, it checks
the entry and the queuer's current access. It retries a wait for a turn,
an open session, an agent login, or a GitHub sign-in without a deadline.
The workspace saves the message with its receipt, then the normal
accepted-message path resumes the cloud computer when necessary.

The workspace reports the final state of the turn from its own alarm.
The coordinator saves the result under the restack ID for the next queue
step. A caller can read it by repeating the same request. The fix step
reads permissions and sends chat messages. Its caller decides when a
restack is necessary and checks GitHub after the result.

## Development

Run `npm run test -- worker/merge-queue`.

### Key Code

- [The member routes](../app-api/merge-queue.ts) use the app gate and send
  each change to its queue object.
- [QueueCoordinator](coordinator.ts) owns member changes and alarms.
- [Admission](admission.ts) reads the unit and adds its entries.
- [Queue steps](step.ts) select and run a leave, a trunk check, or the
  completion of a saved write.
- [Merge selection](merges.ts) checks the ready layers and starts a merge.
- [Merge jobs](merge-job.ts) start, poll, and resume a saved GitHub merge.
- [Base resets](leave-base.ts) check member access and reset a base on leave.
- [Fix turns](fix-turns.ts) save restack requests, waits, and turn results
  in the queue's sequence.
- [Fix reports](fix-report.ts) deliver the workspace's saved turn results
  and keep failed deliveries for its next alarm.
- [Queue reads](read.ts) project the list entries and bar state.
