# Workspace model gateway

This area forwards model requests and makes and checks workspace turn credentials.
The machine hostname serves one base for each agent.
Only a turn token authorizes a request.
Before it obtains a workspace endpoint, the gateway checks in D1 that the workspace is live and its resources remain accessible.
An unknown or unavailable workspace gets `turn_token_invalid` without a Durable Object call.
The gateway calls `checkTurnToken` through the trusted workspace runtime before each upstream request.
It replaces the token with the starter's real login.
Runner delivery gives a token in each `turn` command to a runner of protocol version 2.
A runner of protocol version 1 still gets the real login.
The packaged runner and new full image builds use version 2.
The [model gateway protocol](../../docs/protocol/model-gateway.md) states the requirements.

## Model requests

| Gateway base | Allowed method and suffix | Upstream base |
| --- | --- | --- |
| `/v1/model/claude` | `POST /v1/messages`, `POST /v1/messages/count_tokens` | `https://api.anthropic.com` |
| `/v1/model/codex` | `POST /responses` | `https://api.openai.com/v1` |

The gateway preserves the query and the request body.
It refuses every other suffix and method locally, including the connection probe and model discovery.

The Claude route accepts only a request with both markers of the `claude` program.
One marker is the exact value `claude-code-20250219` as an item of the comma-separated `anthropic-beta` list.
The check ignores spaces around each item.
The other marker is a `User-Agent` that starts with `claude-cli/`, with any client version.
The `x-app` and `x-claude-code-*` headers are not markers.
The route checks the markers after the method and the suffix, and before it reads the turn token.
A request that lacks either marker gets HTTP 403 with `model_client_not_allowed`, in the Anthropic error shape.
It gets no D1 workspace check, no turn check, and no upstream call.
The Codex route has no marker check.

A turn token starts with the prefix of a real login of its kind.
So an agent program can use its normal login mode, and send the token in the header of that mode.
Claude can also read the token from its [profile](../../docs/protocol/model-gateway.md#how-the-agents-reach-the-gateway).
In profile mode, Claude sends each token as a bearer token, also for an API key.

| Login kind | Token prefix | Turn token header | Upstream login header |
| --- | --- | --- | --- |
| Claude API key | `sk-ant-api-` | `x-api-key` or `Authorization: Bearer` | `x-api-key` |
| Claude subscription token | `sk-ant-oat01-` | `Authorization: Bearer` | `Authorization: Bearer` |
| OpenAI API key | `sk-` | `Authorization: Bearer` | `Authorization: Bearer` |

The signature covers the prefix.
A token whose prefix does not match the login kind of its turn gets `turn_token_invalid`.
A token in a header that the table does not give for its login kind gets the same refusal.
The upstream gets the real login in the header of the last column.

For a Claude API key, the gateway removes only the `oauth-2025-04-20` value from the `anthropic-beta` list.
It keeps each other value.
Claude sends two of these values only in profile mode: `prompt-caching-scope-2026-01-05` and `cache-diagnosis-2026-04-07`.
They stay because the body of a profile request uses their features.
That body uses a `cache_control` scope of `global` and a top-level `diagnostics` field.
Do not remove them to match the normal API-key mode of Claude.
The other login kinds keep `anthropic-beta` unchanged.

The Codex upload reader checks for one valid JSON object as bytes arrive.
It checks each top-level `background` key after JSON string unescaping, including repeated keys.
That field must be absent or hold the literal `false`.
Nested keys pass unchanged.
The request owner refuses a Codex body with a `content-encoding` other than `identity` before the upstream fetch.
These refusals return HTTP 400 in the OpenAI error shape, with code `model_request_refused`.
The request owner cancels the upload, upstream fetch, and answer together.
Claude uploads keep their existing rules.

Request headers use fixed names and the `anthropic-*`, `x-claude-code-*`, and `x-stainless-*` patterns.
The fixed names include content metadata and the Codex session and turn headers.
Transport framing stays with fetch, so the client `Content-Length` does not pass.
The gateway removes incoming authentication, cookies, proxy metadata, private application headers, and connection-nominated headers.
Response headers use the content type, retry, request ID, and provider rate-limit rules.
No provider cookie passes.
Allowed response header values redact the real login.
Error bodies redact both plain and JSON-escaped login bytes across chunk boundaries.
Success body chunks pass directly, with no text decoding or copy.

The upload reads through the entry's 100,000,000-byte budget.
The Codex scanner retains no body, key, or value text between chunks.
Its memory holds a fixed decoding window, compact container states, and one pending upload byte.
That byte stays pending until another chunk passes or valid EOF arrives.
An early upstream answer waits for the remaining upload to pass that reader.
The remaining Codex bytes pass the same scan before an early answer can return.
An overflow aborts the upstream request and returns the entry's shared 413 error.
Each request gets a 30-second lease from its first turn check, before the upstream fetch.
Checks start every 15 seconds while the upload, fetch, or answer runs.
A passing check renews the lease to 30 seconds after that check started.
A separate timer cancels the upload, fetch, and answer when the lease ends.
A slow check cannot extend that deadline.
A refusal before the answer starts returns its stable error code.
A client disconnect also cancels the upstream.
It adds no retry, model filter, rate limit, or answer size limit.
It writes no request body, answer body, or header value to logs.

## Development

Run `npm run test -- worker/model-gateway` from the repository root.
The tests use the chat harness, local D1, and the real workspace RPC with SQLite storage.
The HTTP route tests inject fake Anthropic and OpenAI upstreams through the fetch dependency.
Their manual clock drives stream checks without a real delay.
`AppDependencies.scheduleGatewayCheck` supplies that clock in tests.
Production uses the shared connection scheduler.
The `request` helper of `gatewayHttp` in [http.test-support.ts](http.test-support.ts) adds `claudeClientHeaders`, the markers of the `claude` program, to each Claude request.

### Key Code

- [route.ts](route.ts): `routeModelGateway` selects a route, checks the Claude markers, checks its turn, replaces authentication, and forwards one request.
- [workspace-access.ts](workspace-access.ts): `gatewayWorkspaceAllowed` checks the workspace and resource predicates in D1 before object access.
- [paths.ts](paths.ts): gateway base matching and the fixed model method and suffix list.
- [headers.ts](headers.ts): request and response header rules and authentication replacement.
  `hasClaudeMarkers` checks the markers of the `claude` program.
  For a Claude API key, `upstreamHeaders` removes the OAuth value of `anthropic-beta`.
- [upload.ts](upload.ts): streaming upload and draining after an early reply.
- [codex-body.ts](codex-body.ts): `CodexBodyScanner` checks the streamed JSON grammar and top-level `background` fields.
- [json-tokens.ts](json-tokens.ts): `JsonTokens` reads JSON tokens and unescapes keys without keeping token text.
- [json-stack.ts](json-stack.ts): `JsonStack` stores compact container states without a separate depth limit.
- [request-lifetime.ts](request-lifetime.ts): `GatewayRequestLifetime` owns the lease, periodic checks, cancellation, and cleanup across every forwarding phase.
- [stream.ts](stream.ts): answer forwarding under the request lease.
- [redact.ts](redact.ts): bounded carry bytes for credential removal from error bodies.
- [errors.ts](errors.ts): stable gateway refusals in each provider's API shape.
- [workspace.ts](workspace.ts): `WorkspaceTurnTokens.forRunningTurn` derives a stable token from the turn record.
  Runner delivery calls it for each version 2 `turn` command, after the running state commits.
  Its caller holds the chat queue, as runner dispatch does.
  It fails the turn and gives no token when the login is missing or changed since the first token.
  It does the same for a login of another kind than the dispatch read.
  `check` enters that queue and returns the current starter login or a stable refusal reason.
  It refuses a token whose prefix does not match the login kind.
- [token.ts](token.ts): `turnTokenRoute` reads the workspace and turn route.
  `deriveTurnToken` puts the prefix of the login kind before each token, and `turnTokenMatchesKind` checks that prefix.
  HMAC derives the credential with a dedicated context and the Worker encryption key.
  The signed input includes the prefix.
  Web Crypto verifies the signature in constant time.
  The turn keeps only a random nonce and the login version for this derivation.
- [login.ts](login.ts): `gatewayLogin` checks starter access and reads the login row with its `updated_at` version.
  `decryptGatewayLogin` releases the login only after the turn check accepts that version.
- [types.ts](types.ts): `TurnTokenCheck` and `TurnTokenEndpoint` define the trusted check result and RPC method.
- [../workspace-lifecycle.ts](../workspace-lifecycle.ts): `checkTurnToken` selects the workspace from stored chat metadata.
  [../lifecycle/workspace-transport.ts](../lifecycle/workspace-transport.ts) carries it through the workspace runtime.
- [../chat/turn-lifecycle.ts](../chat/turn-lifecycle.ts): `TurnLifecycle.fail` ends a queued turn or saves a failure cause and stops a running turn.
  The interrupt and cause stay until a runner end or workspace stop.
  The common publisher sends one failed end before its session update.
  The runner's own end then stays as late data, with its changed files.
- [fixture.test-support.ts](fixture.test-support.ts): a running turn whose session starter differs from its message sender.
- [delivery.test.ts](delivery.test.ts): version 2 `turn` and `message` commands for each login kind, the real login at the upstream, no token in storage, a changed prefix, and Stop.
- [delivery-runtime.test.ts](delivery-runtime.test.ts): the same version 2 `turn` command after an eviction of the workspace object, with only the nonce and the login version in SQLite.
- [../chat/gateway-dispatch.test.ts](../chat/gateway-dispatch.test.ts): a failed version 2 send keeps the token state, so the resend carries the same token before the waiting message.
- [workspace.test.ts](workspace.test.ts) and [login.test.ts](login.test.ts): token lifetime, login changes, Stop across a disconnect, event order, late data, and retry.
- [lease.test.ts](lease.test.ts): late answer starts, held uploads, and lease expiry during a held check, with a manual clock.
- [codex-body.test.ts](codex-body.test.ts): HTTP refusals, upload cancellation, and unchanged accepted bytes through the fake OpenAI upstream.
- [codex-stream.test.ts](codex-stream.test.ts): a 100,000,000-byte object, the shared 413, and refusal after an early answer.
- [claude-client.test.ts](claude-client.test.ts): missing and partial Claude markers, refused before workspace access, a turn check, or an upstream call.
- [claude-profile.test.ts](claude-profile.test.ts): bearer profile requests for both Claude login kinds, the upstream login header, the `anthropic-beta` result, unchanged body bytes, and a changed prefix.
- [runtime.test.ts](runtime.test.ts): production workspace RPC on SQLite, with eviction after a saved gateway Stop, one interrupt after reconnect, duplicate runner ends, the saved failure cause, and Retry.
