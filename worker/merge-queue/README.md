# Merge queue backend

The merge queue stores an ordered list of workspaces for one repository
of an org. [Merge queue](../../docs/protocol/merge-queue.md) gives the
requirements.

The queue object uses the name `merge-queue:<orgId>:<githubRepositoryId>`
in the `Workspace` class. It checks that name on each call. The object runs
member changes, leave requests, and alarms in one sequence. A wake keeps
the earliest saved alarm. The alarm can run after the object restarts.

D1 stores the trunk, the optional GitHub stack number, entries, and step
times. Admission checks for entries of another org in the same D1 batch
that records the new entries. The browser gets a fixed refusal when the
repository is in use. It gets no entry or org details for that queue.

Admission reads the current pull requests and trunk rules with the
requesting member's token. It checks their base chain and verifies a
member stack that GitHub records. A new unit joins at the end. An extension
keeps the same unit and fills the places after its lower entries. A move
uses a workspace in the next unit as its anchor, or null for the end.

The leave step removes a member stack's affected suffix and compacts the
places. A merge removes its completed layer. A stale wake must match the
entry's branch and any pull request number that the wake names.
Archive, Continue, and workspace repository change send the binding
from before the move. Org suspension empties the queues. Member
departure and GitHub repository changes wake their affected queues.

## Development

Run `npm run test -- worker/merge-queue`.

### Key Code

- [The member routes](../app-api/merge-queue.ts) use the app gate and send
  each change to its queue object.
- [QueueCoordinator](coordinator.ts) owns member changes and alarms.
- [Admission](admission.ts) reads the unit and adds its entries.
- [Queue steps](step.ts) select and run a leave, a trunk check, or the
  completion of a saved write. Future GitHub steps use this alarm and
  sequence.
- [Queue reads](read.ts) project the list entries and bar state.
