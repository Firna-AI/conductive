# The build machine

This page belongs to [Image builds](image-builds.md). It gives the machine
token of a build, its replay and its revoke, and the path of each build
command.

Each build and refresh has its own machine object, as the
[machine area](../machines/README.md#access-and-lifetime) says. Its build
sandbox gets the
[machine token](../../docs/protocol/host-connection.md#the-machine-token) of
that object for its host connection.

- `beginBuildAllocation` in [`build-phase-data.ts`](build-phase-data.ts)
  issues the token when the job leaves `create`. It saves the token
  encrypted, with [`build-machine-token.ts`](build-machine-token.ts), in the
  D1 batch that moves the job to `allocating`.
- `buildSandboxIntent` in [`resource-intents.ts`](resource-intents.ts) adds
  the token and the machine origin to the env of the create. Each replay of
  the create, also a replay in cleanup, sends the same token.
- The build code clears the saved token when it saves the sandbox ID.
  A database trigger also clears it when any writer sets the job phase
  to `done`, including Delete org. A job that holds its sandbox ID makes
  no new create.
- A create that the previous Worker began has no saved token. Its replay
  sends no token, so that build keeps the provider path.
- `advanceBuildStep` in [`image-build-steps.ts`](image-build-steps.ts) sends
  the source commands, the software and install commands, and the journal
  clear through the [machine channel](../machines/README.md#the-machine-channel)
  of the build machine. The readiness read, the auto-stop, the snapshot, and
  the Deletes stay provider calls.
- The job saves the route of each process with its process ID. Each status
  read uses that route, and a saved process without a route reads as
  `provider`.
- The install command loads the build env, then removes the machine token
  and origin. So the install script gets only the folder variables, as
  [Repository folders](../../docs/protocol/repository-folders.md#folder-variables)
  says.
- [`build-output-redaction.ts`](build-output-redaction.ts) holds a possible
  token start at the end of each stream while the command runs or more output
  remains. It saves the raw byte offset before the held part so the next
  read returns it. It masks machine tokens as `[hidden]` in the joined text
  of stdout and stderr in each reply.
- A failed job that ends with no build computer and no provider client
  revokes the token before it ends. Each other job revokes it in cleanup
  before it deletes any sandbox. A failed revoke keeps sandbox deletion
  pending while snapshot cleanup can continue, as
  [Build jobs](image-builds.md#build-jobs) says.
- The revoke through the computer ledger also finds a build machine. So the
  stop of a deleted org also revokes the token of a build machine.
