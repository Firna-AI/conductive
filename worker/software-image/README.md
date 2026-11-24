# Software images

This area builds the shared sandbox software image for each app software
version. The image holds the provider's base image and the app software.
It holds no repository, org data, or credential.
The Worker gives its build sandbox only two env vars: the machine token of
its [build machine](#the-build-machine), and the machine origin.
The token stays out of the image, as
[What a sandbox holds](../../docs/protocol/isolation.md#what-a-sandbox-holds) says.
The [org lifecycle](../lifecycle/README.md) owns org builds and their pins.

## Responsibilities

- Compute the version from the release version and the exact release install command.
- Install the workspace CLI and MCP server as part of the release program.
- Keep each attempt, phase, resource intent, command offset and route, and output in D1.
- Send the build commands through the machine channel of the build machine,
  and revoke its machine token at cleanup.
- Build one image at a time in the default provider account.
- Recover resource requests and detached commands after a lost reply.
- Answer each deploy request within its reply budget.
- Keep the progress and the output of work that ends after the answer.
- Remove failed resources.
- Keep the ready image of the current version and each pinned image, and
  retire each other ready image.

## Deploy route

`POST /v1/deploy/software-image` runs on the machine origin.
Its JSON body supplies `tokenDigest`. Its Bearer header supplies the deploy
run's token. The gate refuses browser headers. It checks the digest against
`CONDUCTIVE_DEPLOY_TOKEN_SHA256` and accepts the token for 30 minutes after
`CF_VERSION_METADATA.timestamp`.
A valid request reads the newest sandbox release and advances its build.
A later request of the same deploy uses the release that its attempt saved,
as [Reply budget](#reply-budget) says. It returns
`state`, `phase`, `version`, and new `output`. A failed attempt also returns
`error` and `keptOutput`. Responses disable caching.

The Worker reads `releases/latest/conductive/x86_64-unknown-linux-musl`.
`CONDUCTIVE_RELEASE_SERVER` sets the base URL and defaults to `https://runner.conductive.build`.
The saved job captures the verified program URL, digest, release version, and server.
The build uses the program for check, apply, and initial confirmation.
It always runs the apt part, which installs `gh`, `ttyd`, and `tmux`,
because the base image holds none of them. The row records the version of
that apt part when the command starts. A first org build from the image
then skips apt while that version is current, as
[The software step](../lifecycle/image-builds.md#the-software-step) says.
A release lookup failure fails the deploy request with a clear software-release error.

A ready image is reused. An older unfinished version fails before the new
version starts. A failed attempt restarts only for another token digest.
Each answer uses the attempt as the request last read it from D1. When a
read finds that the attempt no longer exists, the request goes through
admission again with the release that the attempt saved. A request cleans
up only its own attempt, such as its build sandbox. Only the
[Cron work](#cron-work) retires ready images.
The command journal keeps a repeated start attached to its original run.
The snapshot contains no command journal.

### Reply budget

The deploy run gives a request at most 30 seconds. So the route gives each
request a reply budget of 20 seconds. This budget starts before the token
check, the release lookup, and admission.

- Work that ends within the budget answers with its result or its error.
- At 20 seconds, the route answers with its checkpoint: the attempt as the
  request last read it from D1, and the output that the request took from D1.
- While the token check, the release lookup, or admission still runs, no
  checkpoint exists. The route then answers the retryable
  `503 service_unavailable`.
- `ExecutionContext.waitUntil` keeps the work running after the answer.
  The work then starts no new release lookup, provider call, or host call.
  Here a host call is each call to the machine object, also the token issue
  and the revoke. A call that already runs can end, and the work saves its
  result.
- Each provider or host call stops 45 seconds after the request starts, also
  a long journal command. Cloudflare keeps work for at most 30 seconds after the
  answer or a disconnect of the client, so about 5 seconds stay for D1
  writes.

Saved progress lets a poll go on where an earlier poll stopped:

- After admission, a poll finds the attempt of its deploy by the token
  digest. When admission reused an attempt of an earlier deploy, a link in
  `software_image_deploys` names it. The poll then uses the release that
  the attempt saved, with no release lookup. The link expires with the
  deploy token.
- A linked attempt that failed under an earlier deploy goes through
  admission again, with its saved release. So the later deploy still
  starts a new attempt.
- Before its main call, a step can need other provider calls: the
  readiness read, the auto-stop update, or a snapshot lookup that finds no
  snapshot. Each
  finished call is saved in `software_image_operations`, so a later poll
  does not repeat it.
- A saved operation holds only for the phase and revision of the attempt
  at its save. Each save of the attempt changes the revision, also a save
  by the previous Worker. The next step then starts again with the
  readiness read.
- A transient provider or host error also clears the saved operation. A
  call that the 45-second stop ends keeps it for the next poll.
- The next poll can start while the work of an earlier poll still runs.
  The phase and revision guards, the create key, the snapshot intent, the
  command journal, and the one-time claim of each output row keep the
  repeated work safe.

Build output reaches the deploy log through D1:

- Each command status saves its offsets and its new output in one D1
  batch. The output then waits in `software_image_output`.
- Before it answers, a poll takes all waiting output of its attempt. It
  uses bounded D1 statements, one for each saved command status. After its
  answer, a poll takes no output, so a later poll returns it.
- The deploy log can still miss output. This happens when an answer is
  lost, or when a poll takes output at its deadline. The attempt keeps its
  last 64 KiB of output, and a failed attempt returns it as `keptOutput`.

Limits that stay:

- Near the end of its total wait, the deploy run gives its last request
  only the seconds that remain. That request can end before 20 seconds,
  with no answer.
- A provider or host call that does not end within 45 seconds of the start
  of its poll cannot finish in a poll, for example a very slow journal command.
  The Cron work has neither the reply budget nor the 45-second stop.

## The build machine

The build sandbox has its own machine object, `software-image:<imageId>`,
which no org owns. Its commands go through the
[machine channel](../machines/README.md#the-machine-channel) of that object.
The readiness read, the auto-stop, the snapshot, and the deletes stay
provider calls.

- `beginSoftwareImageAllocation` in [machine-token.ts](machine-token.ts)
  makes the machine token when the attempt leaves `create`. It saves the
  token encrypted with the move to `allocating`.
- `allocateSoftwareImage` in [resources.ts](resources.ts) puts the token and
  the machine origin in the env of the create. Before each create request,
  it issues the digest of that token to the machine object. So each replay
  sends the same token.
- D1 clears the saved token when the attempt saves its sandbox ID or
  reaches `done`.
- An allocation that the previous Worker began has no saved token. Its
  create sends no env var, so its commands keep the provider path.
- The software command saves its process ID with its route, and each status
  read uses that route. The journal clear goes through the same channel.
- The saved output and the kept output hide each machine token as
  `[hidden]`. The saved offsets still count the bytes of the raw output.
- The cleanup of an attempt before its `done` phase revokes the token
  before it deletes the sandbox. A failed revoke keeps the attempt for a
  later cleanup, and the deletes still run.

## Cron work

After lifecycle repairs, the scheduled Worker entry reads the newest
release once and computes the current software version. Then, in
each provider account of `software_images`, it advances unfinished
attempts, enforces the 60-minute build limit, and retries resource cleanup.
It keeps the ready image of the current version and each image that an
unfinished org job pins. It retires each other ready image. When the
release lookup fails, it logs a warning and keeps every ready image in that
run. A software image error logs a fixed warning and does not stop other
scheduled work.

The Cron work saves the output of each command status in the same way, but
takes none. A later deploy poll of the same attempt returns it. The Cron
work also deletes expired deploy links and the saved operations of ended
attempts. It deletes the waiting output of an ended attempt that started
more than 30 minutes ago and that no deploy link names.

## Development

Run `npm run test -- worker/software-image worker/lifecycle/software-image-start.test.ts`
from the repository root with Node 24.
The tests use local D1, the lifecycle fake provider, and the lifecycle
[fake host](../lifecycle/tests.md#image-and-provider-boundaries).
[poll.test.ts](poll.test.ts) and [poll-admission.test.ts](poll-admission.test.ts)
test the reply budget. [poll-progress.test.ts](poll-progress.test.ts) tests
the progress of slow calls that succeed: the saved operations, a snapshot
lookup that finds no snapshot, and admission across slow release reads and
a reused attempt that fails.
[poll-host.test.ts](poll-host.test.ts) tests the stop of host calls after
the answer and at the 45-second stop.
[machine-token.test.ts](machine-token.test.ts) tests the token issue under
the same stops, a competing create, and an allocation of the previous Worker.
These tests hold provider and host replies and D1 reads, and move fake
timers. They use no real sleep.

### Key Code

- [version.ts](version.ts): the hash of the release version and software command.
- [route.ts](route.ts) and [deploy-gate.ts](deploy-gate.ts): the machine route, its lookup of the attempt of a deploy, and the token gate.
- [poll.ts](poll.ts): `boundedSoftwareImagePoll`, the reply budget, the checkpoint answer, and the network stop. `runNetworkCall` applies that stop to each call to the machine object.
- [result.ts](result.ts): `softwareImageResult`, the answer fields of an attempt.
- [response.ts](response.ts): `softwareImageResponse`, the JSON answer. It encodes each saved output part on its own, in the same `output` field.
- [build.ts](build.ts): admission, version replacement, and resumable advancement.
- [steps.ts](steps.ts): sandbox readiness, commands through the machine channel, snapshot, and publication.
- [channel.ts](channel.ts): `softwareImageChannel`, the machine channel of the build sandbox. In a deploy poll, each call goes through `runNetworkCall`.
- [machine-token.ts](machine-token.ts): `beginSoftwareImageAllocation`, which saves the encrypted machine token with the move to `allocating`.
- [resources.ts](resources.ts): persisted allocation and snapshot requests. The create carries the machine token, and each create request first issues its digest.
- [data.ts](data.ts): D1 queries and writes guarded by phase and revision, and `softwareImageForDeploy`, the attempt of a deploy.
- [operation-data.ts](operation-data.ts): the saved operations of one phase and revision.
- [output-data.ts](output-data.ts): the waiting output that each command status saves, with each machine token hidden, and its claim by a deploy poll.
- [deploy-data.ts](deploy-data.ts): the links from a deploy token digest to its attempt, and the Cron cleanup of the poll records.
- [cleanup.ts](cleanup.ts): attempt cleanup, which revokes the machine token before the deletes, and the guarded retirement of ready images of other versions.
- [repair.ts](repair.ts): the Cron work: the current version, then advancement, cleanup, and retirement in each account.

### Related Docs

- [The software image](../../docs/protocol/software-image.md): requirements for the image, its deploy run, and its retention.
- [Org image](../../docs/protocol/org-image.md): requirements for first builds.
- [Automatic deploys](../../docs/automatic-deploys.md): the deploy run and its result.
- [Sandbox software](../../image/README.md): the installed software.
- [Migrations](../../migrations/README.md): the records and org-job pin.
