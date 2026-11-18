# Software images

This area builds the shared sandbox software image for each app software
version. The image holds the provider's base image and the app software.
It holds no repository, org data, or credential.
Its build receives no app environment variable.
The [org lifecycle](../lifecycle/README.md) owns org builds and their pins.

## Responsibilities

- Compute the version from the release version and the exact release install command.
- Install the workspace CLI and MCP server as part of the release program.
- Keep each attempt, phase, resource intent, command offset, and output in D1.
- Build one image at a time in the default provider account.
- Recover resource requests and detached commands after a lost reply.
- Answer each deploy request within its reply budget.
- Remove failed resources and old images that no unfinished org build pins.

## Deploy route

`POST /v1/deploy/software-image` runs on the machine origin.
Its JSON body supplies `tokenDigest`. Its Bearer header supplies the deploy
run's token. The gate refuses browser headers. It checks the digest against
`CONDUCTIVE_DEPLOY_TOKEN_SHA256` and accepts the token for 30 minutes after
`CF_VERSION_METADATA.timestamp`.
A valid request reads the newest sandbox release and advances its build. It returns
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
The command journal keeps a repeated start attached to its original run.
The snapshot contains no command journal.

### Reply budget

The deploy run gives a request at most 30 seconds. So the route gives each
request a reply budget of 20 seconds. This budget starts before the token
check, the release lookup, and admission.

- Work that ends within the budget answers with its result or its error.
- At 20 seconds, the route answers with its checkpoint: the attempt as the
  request last read it from D1, and the output that the request collected.
- While the token check, the release lookup, or admission still runs, no
  checkpoint exists. The route then answers the retryable
  `503 service_unavailable`.
- `ExecutionContext.waitUntil` keeps the work running after the answer.
  The work then starts no new release lookup or provider call.
- A provider call that already runs can end, and the work saves its
  result. A command status that ends after the answer saves no output
  offset, so a later poll returns that output.
- Each network call stops 45 seconds after the request starts, also a long
  journal command. Cloudflare keeps work for at most 30 seconds after the
  answer, so about 5 seconds stay for D1 writes.
- The deploy log can still miss output. This happens when an answer is
  lost, or when an output save is in flight at the deadline.
- Near the end of its total wait, the deploy run gives its last request
  only the seconds that remain. That request can end before 20 seconds,
  with no answer.
- The Cron work has no reply budget.

## Cron work

The scheduled Worker entry advances unfinished attempts in the default
account after lifecycle repairs. It enforces the 60-minute build limit and
retries resource cleanup. It also deletes older ready images after all
unfinished org jobs release their pins. A software image error logs a fixed
warning and does not stop other scheduled work.

## Development

Run `npm run test -- worker/software-image worker/lifecycle/software-image-start.test.ts`
from the repository root with Node 24.
The tests use local D1 and the lifecycle fake provider.
[poll.test.ts](poll.test.ts) and [poll-admission.test.ts](poll-admission.test.ts)
test the reply budget. They hold provider replies and D1 reads, and move
fake timers. They use no real sleep.

### Key Code

- [version.ts](version.ts): the hash of the release version and software command.
- [route.ts](route.ts) and [deploy-gate.ts](deploy-gate.ts): the machine route and token gate.
- [poll.ts](poll.ts): `boundedSoftwareImagePoll`, the reply budget, the checkpoint answer, and the network stop.
- [result.ts](result.ts): `softwareImageResult`, the answer fields of an attempt.
- [build.ts](build.ts): admission, version replacement, and resumable advancement.
- [steps.ts](steps.ts): sandbox readiness, commands, snapshot, and publication.
- [resources.ts](resources.ts): persisted allocation and snapshot requests.
- [data.ts](data.ts): D1 queries and writes guarded by phase and revision.
- [cleanup.ts](cleanup.ts): attempt cleanup and guarded old-image deletion.
- [repair.ts](repair.ts): Cron advancement and cleanup.

### Related Docs

- [Org image](../../docs/protocol/org-image.md): requirements for first builds and shared software.
- [Automatic deploys](../../docs/automatic-deploys.md): the deploy run and its result.
- [Sandbox software](../../image/README.md): the installed software.
- [Migrations](../../migrations/README.md): the records and org-job pin.
