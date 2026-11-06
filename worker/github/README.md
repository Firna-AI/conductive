# GitHub banner backend

This module reads GitHub branch state for the shared banner and checks API.
It also verifies GitHub App webhooks and finds their workspace targets.
It does not have production routing yet.
Milestone 15i connects it to the Worker and the workspace Durable Object.

The [banner protocol](../../docs/protocol/github-banner.md) states the requirements.
The [shared contracts](../../src/shared/github.ts) define the response bodies.

## Public boundaries

- [handleGitHubWebhook](webhook.ts) accepts `POST /api/github/webhooks` on `MACHINE_ORIGIN`.
  It verifies `X-Hub-Signature-256` against the raw body before parsing or D1 access.
  It authenticates machines with `GITHUB_WEBHOOK_SECRET`, without the app gate.
- [handleGitHubRead](app-handler.ts) accepts GET and HEAD for both `githubPaths` routes.
  It runs the existing app gate and checks the workspace's org before a read.
  It returns the shared banner or checks response, with private response headers.
- [refreshWorkspace](workspace-state.ts) runs inside the target workspace Durable Object.
  It checks active org, installation, repository, branch, and optional user access before reading.
  It repeats the access check before storage and publication.
- [WorkspaceGitHubState](workspace-state.ts) serializes reads and commits within one workspace.
  Its port stores the snapshot, a common workspace stream event, and a delivery receipt in one transaction.
  It publishes the committed envelope to every open tab.
  A retry republishes that same envelope and keeps its event number.
- [installationTokenProvider](credentials.ts) signs the app JWT and gets an installation token for one repository.
  Its permissions allow repository content, pull request, check, and commit status reads only.
  The token stays on the server.
  This module has no sandbox credential endpoint.

## Wiring in Milestone 15i

1. Add `GITHUB_WEBHOOK_SECRET` and `GITHUB_APP_PRIVATE_KEY` as Worker secrets.
   Keep `GITHUB_CLIENT_ID` as the app's client ID.
   `GITHUB_APP_PRIVATE_KEY` must contain PKCS#8 PEM.
   Convert a downloaded RSA key with `openssl pkcs8 -topk8 -nocrypt -in github-app.pem -out github-app-pkcs8.pem`.
   The current environment interface and Wrangler configuration do not declare these new secrets.
2. Populate `github_installations` and `repositories.installation_id` from trusted GitHub App installation setup.
   Keep suspension and repository access records current.
   No active installation means no read or webhook publication.
3. Route the machine webhook path to `handleGitHubWebhook` before the machine stub.
   Subscribe to `push`, `pull_request`, `pull_request_review`, `check_run`, `check_suite`, and `status`.
   Keep the raw request body intact.
4. Route both app read paths to `handleGitHubRead` before the existing general app gate dispatch.
   This handler already owns its gate.
   Use a refresh callback that calls the workspace Durable Object's internal refresh operation.
   Preserve its `userId` argument for the repeated membership check.
5. Keep one `WorkspaceGitHubState` instance in each workspace Durable Object.
   Implement `GitHubStatePort.transaction` with the object's storage transaction.
   Implement `appendEvent` with the same stored event sequence that chat and files use.
   Write the event and advance that common cursor inside the supplied transaction.
   Do not create a separate GitHub event sequence.
   Implement `publish` with the existing workspace tab broadcaster.
6. Have the Durable Object's internal refresh operation call `refreshWorkspace`.
   Pass D1, its workspace binding, the refresh signal, its state instance, and the read dependencies.
   Construct `installationTokenProvider` in the server's credential boundary.
   Inject another server-only token provider in tests when needed.
7. On tab open, read the banner and checks through the shared app routes.
   Read the stored workspace stream before subscribing after its common event number.
   Reconnect with that number, so a repeated publication shows only once.
   Keep stored delivery receipts with the event stream for webhook retries.

Example refresh operation inside the workspace Durable Object:

```ts
const token = installationTokenProvider(credentials, serverFetch, now)
const dependencies = { fetch: serverFetch, token, now }
return refreshWorkspace(env.DB, workspace, signal, githubState, dependencies)
```

The Worker callback forwards only the workspace binding and refresh signal to this operation.
It sends no function or token over the Durable Object boundary.
Neither public HTTP handler accepts a caller-supplied workspace token or installation token.
The existing Worker entry points and empty workspace Durable Object do not call this module yet.

## Refresh behavior

Each webhook triggers a fresh read instead of applying old payload state.
Repository and installation IDs must match active local records.
A foreign fork's same-named branch cannot update a workspace in the base repository.
A default branch push refreshes all workspaces of that repository.
SHA-only events read current workspace heads without relying on the payload's pull request list.
An old SHA produces no stored update.
The handler marks a delivery processed only after all workspace refreshes succeed.
Failed reads and broadcasts remain retryable.

Pull request lookup prefers an open request for the exact repository and branch.
It then considers merged and closed requests, in GitHub's newest-created order.
The reader follows every lookup, review, and check connection page.
The combined GitHub check rollup supplies check runs and status contexts in returned order.
Check runs use their completed and started times for duration.
Commit status contexts supply no run start time, so their duration remains null.
All links point to GitHub.

The reader maps BEHIND and BLOCKED to the shared `blocked` banner.
Terminal, draft, conflict, review, and check states take priority over `blocked`.
The banner keeps the pull request's GitHub link and the existing shared fields.
It adds no blocker reasons or GitHub write action.
An unresolved merge condition still returns `github_pending` with HTTP 503.
UNKNOWN mergeability or merge state remains retryable when no earlier state applies.
UNSTABLE remains retryable if the read checks show no failed, running, or queued check.
It keeps the previous stored state until a read can confirm the current state.
The app can retry that read.

Workspace state does not limit a GitHub read or webhook refresh.
The workspace queries read repository and access bindings without selecting or filtering workspace state.
This includes a workspace in `input` while its agent waits for the user.

## Verification

Run `npm run test -- worker/github` from the repository root with Node 24.
The app and webhook tests use the existing sign-in fake and real local D1 harness.
[RepositoryGitHub](fake-repository.ts) adds repository replies without changing that fake.
[MemoryWorkspace](test-harness.ts) is a unit-test port double.
It does not replace the production Durable Object storage adapter.

[Recorded routing fields](recorded-webhooks.ts) come from the MIT-licensed
[Octokit webhook examples](https://github.com/octokit/webhooks/tree/main/payload-examples/api.github.com).
The fixtures retain the payload shapes and use one test installation.
The push fixture targets the test branch.

API references:

- [Webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [Pull request fields](https://docs.github.com/en/graphql/reference/pulls)
- [Check fields](https://docs.github.com/en/graphql/reference/checks)
- [Combined status rollup](https://docs.github.com/en/graphql/reference/commits#statuscheckrollup)
- [Installation tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)

### Key Code

- [contracts.ts](contracts.ts) defines the server-side integration ports.
- [webhook.ts](webhook.ts) verifies deliveries and starts workspace refreshes.
- [app-handler.ts](app-handler.ts) serves protected banner and checks reads.
- [workspace-state.ts](workspace-state.ts) coordinates storage and publication.
- [client.ts](client.ts) reads current GitHub state and follows pagination.
- [credentials.ts](credentials.ts) gets server-only installation read tokens.
