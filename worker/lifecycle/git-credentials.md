# The git credential sender

`Workspace.credentialSender` maps the turn ID of a git credential request
to a sender, in the chat queue. `credentialSender` in
[`credential-sender.ts`](credential-sender.ts) holds the rules below for a
create and a chat turn. The [machine route](routes.md#machine-route)
gives the handler, which reads that turn ID from a request header. The
[Workspace Durable Object](workspace-object.md) guide gives the other
methods of the object.

- A create that prepares its repository has its own grant. The start job
  is a create in the `fetch` or `branch` phase, not cancelled or failed,
  and its `turnId` matches. The grant gives the sender of the admitted
  first message.
- A Continue fetch has its own grant too, as [Continue](#continue) says.
- Otherwise the turn must be the running stored chat turn: the active
  turn of an open session. `activeStoredTurn` in
  [`access.ts`](../devices/access.ts) reads it. So access ends with the
  turn, also after a queued Stop, a session close, or a login failure.
- A stopped or archived workspace gives no sender. The lifecycle admission
  keeps no turn record for the queued first message.
- An import activation has its own grant. The start job is the current
  activation attempt in the `import-restore` phase and epoch, not cancelled,
  failed, or past its deadline. Its users are current, and the workspace is
  not archived. The grant gives the activator.

`machine.test.ts` runs the route with `machineCredentialFixture` in
[`machine-test-support.ts`](machine-test-support.ts), over the production
chat and runner boundaries.

## Continue

`WorkspaceContinue.credentialSender` in [`continue.ts`](continue.ts)
answers first. It decides each ID that equals the fetch ID of the running
Continue job, and passes each other ID to the rules above.

- It gives the member who pressed Continue, never the workspace owner,
  while all of these hold: the fetch scope of the job is open, the job is
  in its `fetch` phase, it is not cancelled and has no outcome, and the job
  passes the access check of each phase. Once the job knows the process ID
  of its fetch, the provider account of the job must also report that
  command as running. The access check runs again before that read.
- Otherwise the fetch ID gets no sender, so the route refuses it.
- The scope lives only in the memory of the object. A rebuilt object has
  no open scope, so an earlier fetch ID never works again.
- [Continue](continue.md#the-fetch) gives the fetch that sends this ID.
