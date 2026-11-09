# Workspace model gateway

This area forwards model requests and makes and checks workspace turn credentials.
The machine hostname serves one base for each agent.
Only a turn token authorizes a request.
Before it obtains a workspace endpoint, the gateway checks in D1 that the workspace is live and its resources remain accessible.
An unknown or unavailable workspace gets `turn_token_invalid` without a Durable Object call.
The gateway calls `checkTurnToken` through the trusted workspace runtime before each upstream request.
It replaces the token with the starter's real login.
Production runner delivery does not request or send these tokens yet.
The [model gateway protocol](../../docs/protocol/model-gateway.md) states the requirements.

## Model requests

| Gateway base | Allowed method and suffix | Upstream base |
| --- | --- | --- |
| `/v1/model/claude` | `POST /v1/messages`, `POST /v1/messages/count_tokens` | `https://api.anthropic.com` |
| `/v1/model/codex` | `POST /responses` | `https://api.openai.com/v1` |

The gateway preserves the query and the request body.
It refuses every other suffix and method locally, including the connection probe and model discovery.
An API-key Claude turn sends its token in `x-api-key`.
A subscription Claude turn and a Codex turn use Bearer authorization.
The real login replaces the token in the header for that login kind.
The gateway passes `anthropic-beta` unchanged.

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
An early upstream answer waits for the remaining upload to pass that reader.
An overflow aborts the upstream request and returns the entry's shared 413 error.
The gateway rechecks an open answer every 30 seconds.
It cancels the upstream when the turn ends or the client disconnects.
It adds no retry, model filter, rate limit, or answer size limit.
It writes no request body, answer body, or header value to logs.

## Development

Run `npm run test -- worker/model-gateway` from the repository root.
The tests use the chat harness, local D1, and the real workspace RPC with SQLite storage.
The HTTP route tests inject fake Anthropic and OpenAI upstreams through the fetch dependency.
Their manual clock drives stream checks without a real delay.
`AppDependencies.scheduleGatewayCheck` supplies that clock in tests.
Production uses the shared connection scheduler.

### Key Code

- [route.ts](route.ts): `routeModelGateway` selects a route, checks its turn, replaces authentication, and forwards one request.
- [workspace-access.ts](workspace-access.ts): `gatewayWorkspaceAllowed` checks the workspace and resource predicates in D1 before object access.
- [paths.ts](paths.ts): gateway base matching and the fixed model method and suffix list.
- [headers.ts](headers.ts): request and response header rules and authentication replacement.
- [upload.ts](upload.ts): streaming upload and draining after an early reply.
- [stream.ts](stream.ts): answer forwarding, periodic turn checks, and upstream cancellation.
- [redact.ts](redact.ts): bounded carry bytes for credential removal from error bodies.
- [errors.ts](errors.ts): stable gateway refusals in each provider's API shape.
- [workspace.ts](workspace.ts): `WorkspaceTurnTokens.forRunningTurn` derives a stable token from the turn record.
  Its caller holds the chat queue, as runner dispatch does.
  `check` enters that queue and returns the current starter login or a stable refusal reason.
- [token.ts](token.ts): `turnTokenRoute` reads the workspace and turn route.
  HMAC derives the credential with a dedicated context and the Worker encryption key.
  Web Crypto verifies the signature in constant time.
  The turn keeps only a random nonce and the login version for this derivation.
- [login.ts](login.ts): `gatewayLogin` checks starter access and reads the login row with its `updated_at` version.
  `decryptGatewayLogin` releases the login only after the turn check accepts that version.
- [types.ts](types.ts): `TurnTokenCheck` and `TurnTokenEndpoint` define the trusted check result and RPC method.
- [../workspace-lifecycle.ts](../workspace-lifecycle.ts): `checkTurnToken` selects the workspace from stored chat metadata.
  [../lifecycle/workspace-transport.ts](../lifecycle/workspace-transport.ts) carries it through the workspace runtime.
- [../chat/turn-lifecycle.ts](../chat/turn-lifecycle.ts): `TurnLifecycle.stop` saves the interrupt before a gateway failure ends the turn.
  The saved failure cause survives a restart between Stop and the failed end.
  The common publisher sends the failed end before its session update.
- [fixture.test-support.ts](fixture.test-support.ts): a running turn whose session starter differs from its message sender.
- [workspace.test.ts](workspace.test.ts), [login.test.ts](login.test.ts), and [runtime.test.ts](runtime.test.ts): token lifetime, login changes, event order, retry, and RPC storage tests.
