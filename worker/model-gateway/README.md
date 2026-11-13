# Workspace model gateway

This area forwards model requests and makes and checks workspace turn credentials.
The machine hostname serves one base for each agent.
Only a turn token authorizes a request.
Before it obtains a workspace endpoint, the gateway checks in D1 that the workspace is live and its resources remain accessible.
An unknown or unavailable workspace gets `turn_token_invalid` without a Durable Object call.
The gateway calls `checkTurnToken` through the trusted workspace runtime before each upstream request.
It replaces the token with the starter's real login.
Runner delivery gives a token in each `turn` command. No runner command carries a real login.
Own endpoint turns use the API-key credential mode with a turn token.
Their real address and key stay in Worker-only `AgentLogin` values.
The runner declares its login kinds in `hello.loginKinds`.
A runner without ChatGPT support gets no ChatGPT turn credential.
The [model gateway protocol](../../docs/protocol/model-gateway.md) states the requirements.

## Model requests

| Gateway base | Allowed method and suffix | Upstream base |
| --- | --- | --- |
| `/v1/model/claude` | `POST /v1/messages`, `POST /v1/messages/count_tokens` | `https://api.anthropic.com` |
| `/v1/model/codex` | `POST /responses` | `https://api.openai.com/v1` |
| `/v1/model/codex`, ChatGPT sign-in only | `GET /backend-api/wham/config/bundle`, `GET /backend-api/wham/accounts/check`, `GET /backend-api/codex/models` | `https://chatgpt.com` |
| `/v1/model/codex`, ChatGPT sign-in only | `POST /backend-api/codex/responses` | The workspace's HTTPS backend origin, or `https://chatgpt.com` |

An own endpoint login replaces the native upstream base in this table.
[`readEndpointAddress`](../../src/shared/endpoint-address.ts) validates and builds that address at save, dispatch, and fetch time.
It accepts only public HTTPS addresses with host names.
It refuses every IPv4 and IPv6 address, credentials, internal names, and the app and preview domains.
It normalizes the base path.
The host check reads the product domain from `productDomain` in `docs/mockups/src/brand.ts`.
The gateway runtime supplies `env.PREVIEW_DOMAIN` as an extra refused domain before each fetch.
It preserves the endpoint query and appends the model request query.
Claude drops a final `/v1` from the base before its route is added.
Codex keeps its API base, including `/v1` when present.
The builder also supports model-list addresses, but this gateway exposes no model-list route.

[`endpoint-models.ts`](endpoint-models.ts) reads an own endpoint's model list.
It builds the agent's GET address and key headers.
It follows no redirect and allows ten seconds and 1 MiB for the complete response.
Claude requests `limit=1000` after the saved endpoint query.
A Claude reply with `has_more: true` fails the read, so a partial list never replaces the cached list.
It reads only `data[].id` and keeps no error body or diagnostic text.
A read succeeds only when it returns a list.
[Own endpoint logins](../../docs/protocol/own-endpoint-logins.md) states when the Worker reads, also the second read of a Codex save.

The account save reads the list before it encrypts and stores the login, because a Codex save can store `<base>/v1` in place of the typed base.
One statement stores the login, the list of the read that worked, if any, and the attempt time.
So the first turn does not read the list again at once.
The save reply flags an added `/v1` and a failed read, and never holds the address.

[`endpoint-model-refresh.ts`](endpoint-model-refresh.ts) runs the account Refresh and the background read.
Neither changes the stored address, and the Refresh reply flags a failed read.
Runner delivery schedules a background read after it sends a turn.
[`endpoint-model-data.ts`](endpoint-model-data.ts) claims each attempt in D1.
The claim limits background reads to once in ten minutes, including failed reads.
A failure keeps the previous IDs and successful read time.
Writes check the login ciphertext and attempt ID, so an old response cannot replace a newer read or login.
The account API compares those IDs with the app catalogue.
No model discovery route becomes available to sandbox code.

Each fetch uses manual redirects.
A connection failure returns `model_endpoint_unreachable` without the host.
`wrangler.jsonc` enables `global_fetch_strictly_public` for public same-zone routing.
The runtime's public network also filters the IP addresses returned by DNS.
Cloudflare documents custom ports for non-proxied hosts in its [compatibility flags](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#allow-specifying-a-custom-port-when-making-a-subrequest-with-the-fetch-api).
The compatibility date enables that behavior without another flag.

The `/responses` suffix is for an OpenAI API key or own endpoint only.

### ChatGPT egress

[ChatGPT egress](chatgpt-egress.md) describes the container binding,
the fallback proxy, and the direct path.

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

A Claude or API-key turn token keeps its native prefix.
A ChatGPT turn token is an opaque `sk-gt1` token that Codex reads from its login file.
Each agent sends the token in the header of its login mode.
Claude can also read the token from its [profile](../../docs/protocol/model-gateway.md#how-the-agents-reach-the-gateway).
In profile mode, Claude sends each token as a bearer token, also for an API key.

| Login kind | Token prefix | Turn token header | Upstream login header |
| --- | --- | --- | --- |
| Claude API key | `sk-ant-api-` | `x-api-key` or `Authorization: Bearer` | `x-api-key` |
| Claude subscription token | `sk-ant-oat01-` | `Authorization: Bearer` | `Authorization: Bearer` |
| Own endpoint, Claude | `sk-ant-api-` | `x-api-key` or `Authorization: Bearer` | `x-api-key` |
| Own endpoint, Codex | `sk-` | `Authorization: Bearer` | `Authorization: Bearer` |
| OpenAI API key | `sk-` | `Authorization: Bearer` | `Authorization: Bearer` |
| Codex ChatGPT sign-in | `sk-` | `Authorization: Bearer` | `Authorization: Bearer` |

The signature covers the prefix.
A token whose prefix does not match the login kind of its turn gets `turn_token_invalid`.
A token in a header that the table does not give for its login kind gets the same refusal.
The upstream gets the real login in the header of the last column.

For a Claude API key or own endpoint, the gateway removes only the `oauth-2025-04-20` value from the `anthropic-beta` list.
It keeps each other value.
Claude sends two of these values only in profile mode: `prompt-caching-scope-2026-01-05` and `cache-diagnosis-2026-04-07`.
They stay because the body of a profile request uses their features.
That body uses a `cache_control` scope of `global` and a top-level `diagnostics` field.
Do not remove them to match the normal API-key mode of Claude.
A Claude subscription token keeps `anthropic-beta` unchanged.
A Claude subscription token requests the one-hour prompt cache in the runner.
A Claude own endpoint keeps API-key mode and adds `promptCacheTtl: '1h'` to its turn credential.
The runner uses that field to request the same one-hour cache.
Native API keys and Codex keep their cache defaults.

The Codex model upload reader checks for one valid JSON object as bytes arrive.
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
For a ChatGPT sign-in, it also replaces `chatgpt-account-id` with the
stored account ID. The request cannot choose another account.
Response headers use the content type, retry, request ID, and provider rate-limit rules.
No provider cookie passes.
Allowed response header values redact the real login.
For an own endpoint, both filters use the secret forms from the shared address builder.
These include whole addresses, origin, host, and host name without its port.
Relative and built request paths join the set only for a saved query or a path beyond the agent's base.
The base path is empty for Claude. For Codex, it can be empty or `/v1`.
The builder also includes each saved path segment and query value with at least 12 characters.
It lists plain, percent-encoded, and JSON-escaped forms, including escaped slashes.
Shorter address parts match only inside a whole address form.
Key redaction keeps its existing rules.
Error bodies redact these values across chunk boundaries.
Success body chunks pass directly, with no text decoding or copy.

For a ChatGPT sign-in, the fixed request names also include
`chatgpt-account-id`, `version`, `x-codex-routing-hint`,
`x-codex-turn-state`, and `x-openai-subagent`.
This kind accepts none of the Anthropic, Claude, or Stainless name patterns.
Its response list also includes `etag`, `x-models-etag`, `x-codex-turn-state`,
`x-reasoning-included`, `openai-model`, and the two Codex safety buffering headers.
The gateway refuses WebSocket upgrades, so Codex falls back to HTTP streaming.
The runner disables zstd request compression for this kind.

The account-check response keeps the account metadata.
It replaces each account's backend origin and routing override with `NO_CONSTRAINT`.
The pinned Codex then keeps the gateway origin and the paths of its settings.
Before each token model request, the Worker reads the account check itself.
It selects exactly one entry for the request's account ID.
It accepts `NO_CONSTRAINT`, `us`, or `us_cr` as the override.
A backend is `NO_CONSTRAINT` or an HTTPS origin with no credentials, path, query, or fragment.
The Worker adds `x-openai-account-routing-override` for `us` and `us_cr`.
The client cannot supply this header.
Failed or invalid account discovery sends no model request.
The same request lease covers discovery, upload, and the streamed answer.
The Worker reads a fresh ChatGPT login before forwarding a request.
It renews before expiry through [Codex authentication](../codex-auth/README.md).
Each turn can claim one renewal after a 401, across metadata and model requests.
Its workspace object saves the used and pending flags before renewal,
in the same queue as token checks. Completion clears only the pending flag.
Concurrent requests, Codex resends, and object eviction keep the same bound.
The required `CodexTaskOwner` registers credential work through the request's `execution.waitUntil`.
The renewal service owns its shared renewal through commit and local cleanup.
Gateway authentication owns the recovery claim through its completion, and each terminal failure write.
These tasks remain registered after the model request disconnects.
The winning renewal finishes before it clears pending.
The limit of one forced renewal per turn does not apply to renewal before expiry.
The three body-less metadata GET routes can replay once with the renewed login.
`POST /backend-api/codex/responses` never clones its upload and makes only one upstream call.
After its 401, it cancels the answer, renews the login, drains the remaining
upload through validation, and returns `model_upstream_unavailable` with HTTP 502.
Codex then resends the model request and reads the renewed login.
A request that loses the turn's claim observes the stored login without
starting another renewal. A newer login permits one metadata replay or the
model POST's retryable 502. The observer waits up to 5 seconds with the injected
clock while either the turn recovery or a D1 refresh claim remains pending.
The turn flag covers the window before the winner takes its D1 claim.
A pending recovery at the deadline returns retryable 502 and saves no cause.
A failed renewal or a settled, unchanged login after recovery returns
`agent_login_unavailable` with HTTP 403.
Before the terminal reply, the Worker saves the reconnect cause only while
the stored access token and ciphertext still match and no D1 refresh claim exists.
A lost conditional write returns retryable 502.
This protects both a newer sign-in and an in-flight token rotation.
Codex then cannot start its own placeholder refresh through 401 recovery.
Both used access tokens, and the other stored tokens, redact from allowed
response headers and error bodies.
The gateway's own `turn_token_invalid` also returns HTTP 403 on the four
ChatGPT paths, including refusals before turn lookup. Other login routes keep HTTP 401.

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
It adds no model filter, rate limit, or answer size limit.
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
- [codex-upstream.ts](codex-upstream.ts): ChatGPT metadata forwarding and model routing in the Worker.
- [codex-request-auth.ts](codex-request-auth.ts): binds ChatGPT credential tasks to the active request and turn.
- [codex-auth.ts](codex-auth.ts): fresh credentials, one 401 renewal, observation of concurrent rotation, and the redaction set for the request.
- [../codex-auth/tasks.ts](../codex-auth/tasks.ts): the required credential task owner, built from the request execution context.
- [codex-routing.ts](codex-routing.ts): account selection, backend validation, and the routing-free account reply.
- [egress.ts](egress.ts): the egress path of `chatgpt.com` requests: the egress binding, then the fallback proxy.
- [headers.ts](headers.ts): request and response header rules and authentication replacement.
  `hasClaudeMarkers` checks the markers of the `claude` program.
  For a Claude API key or endpoint, `upstreamHeaders` removes the OAuth value of `anthropic-beta`.
- [upload.ts](upload.ts): streaming upload and draining after an early reply.
- [codex-body.ts](codex-body.ts): `CodexBodyScanner` checks the streamed JSON grammar and top-level `background` fields.
- [json-tokens.ts](json-tokens.ts): `JsonTokens` reads JSON tokens and unescapes keys without keeping token text.
- [json-stack.ts](json-stack.ts): `JsonStack` stores compact container states without a separate depth limit.
- [request-lifetime.ts](request-lifetime.ts): `GatewayRequestLifetime` owns the lease, periodic checks, cancellation, and cleanup across every forwarding phase.
- [stream.ts](stream.ts): answer forwarding under the request lease.
- [redact.ts](redact.ts): bounded carry bytes for credential removal from error bodies.
- [errors.ts](errors.ts): stable gateway refusals in each provider's API shape.
- [workspace.ts](workspace.ts): `WorkspaceTurnTokens.forRunningTurn` derives a stable token from the turn record.
  Runner delivery calls it for each `turn` command, after the running state commits.
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
  The turn keeps a random nonce and the login version for this derivation.
  Separate booleans record whether its Codex 401 recovery was used and remains pending.
- [login.ts](login.ts): `gatewayLogin` checks starter access and reads the login row with its `updated_at` version.
  It accepts native-provider and own endpoint login kinds.
  `decryptGatewayLogin` releases the login only after the turn check accepts that version.
- [types.ts](types.ts): `TurnTokenCheck` and `TurnTokenEndpoint` define the trusted check result and RPC method.
- [../workspace-lifecycle.ts](../workspace-lifecycle.ts): `checkTurnToken` selects the workspace from stored chat metadata.
  [../lifecycle/workspace-transport.ts](../lifecycle/workspace-transport.ts) carries it through the workspace runtime.
- [../chat/turn-lifecycle.ts](../chat/turn-lifecycle.ts): `TurnLifecycle.fail` ends a queued turn or saves a failure cause and stops a running turn.
  The interrupt and cause stay until a runner end or workspace stop.
  The common publisher sends one failed end before its session update.
  The runner's own end then stays as late data, with its changed files.
- [fixture.test-support.ts](fixture.test-support.ts): a running turn whose session starter differs from its message sender.
- [delivery.test.ts](delivery.test.ts): `turn` and `message` commands for each login kind, the real login at the upstream, no token in storage, a changed prefix, and Stop.
- [delivery-runtime.test.ts](delivery-runtime.test.ts): the same `turn` command after an eviction of the workspace object, with only the nonce and the login version in SQLite.
- [../chat/gateway-dispatch.test.ts](../chat/gateway-dispatch.test.ts): a failed send keeps the token state, so the resend carries the same token before the waiting message.
- [workspace.test.ts](workspace.test.ts) and [login.test.ts](login.test.ts): token lifetime, login changes, Stop across a disconnect, event order, late data, and retry.
- [endpoint-login.test.ts](endpoint-login.test.ts): both agents' endpoint routes and authentication, credential-free runner commands, revalidation, redirects, and unreachable endpoints.
- [endpoint-errors.test.ts](endpoint-errors.test.ts): split endpoint and key redaction in errors and allowed headers.
- [endpoint-redaction.test.ts](endpoint-redaction.test.ts): unchanged protocol paths and redaction of saved path or query forms in both filters.
- [lease.test.ts](lease.test.ts): late answer starts, held uploads, and lease expiry during a held check, with a manual clock.
- [codex-body.test.ts](codex-body.test.ts): HTTP refusals, upload cancellation, and unchanged accepted bytes through the fake OpenAI upstream.
- [codex-token.test.ts](codex-token.test.ts): ChatGPT metadata, Worker routing, header filtering, route refusals, and failed discovery.
- [codex-renew.test.ts](codex-renew.test.ts): body-less 401 replay, rotated-token redaction, single model forwarding with a retryable 502, and the per-turn renewal bound.
- [codex-recovery.test.ts](codex-recovery.test.ts): one recovery claim and its pending state across concurrent calls and eviction.
- [codex-concurrent.test.ts](codex-concurrent.test.ts): concurrent 401s before and after the D1 claim, safe failure writes during renewal, and bounded observation with an injected clock.
- [codex-recovery-cancel.test.ts](codex-recovery-cancel.test.ts): a disconnected recovery owner keeps its pending state until rotation finishes.
- [codex-task-owner.test.ts](codex-task-owner.test.ts): registered credential work commits after request cancellation, including renewal before expiry, recovery, and terminal failure writes.
- [codex-terminal.test.ts](codex-terminal.test.ts): saved Account failure causes and protection for a newer sign-in.
- [codex-refusal.test.ts](codex-refusal.test.ts): ChatGPT token refusals are 403 while API-key refusals stay 401.
- [codex-stream.test.ts](codex-stream.test.ts): a 100,000,000-byte object, the shared 413, and refusal after an early answer.
- [claude-client.test.ts](claude-client.test.ts): missing and partial Claude markers, refused before workspace access, a turn check, or an upstream call.
- [claude-profile.test.ts](claude-profile.test.ts): bearer profile requests for both Claude login kinds, the upstream login header, the `anthropic-beta` result, unchanged body bytes, and a changed prefix.
- [runtime.test.ts](runtime.test.ts): production workspace RPC on SQLite, with eviction after a saved gateway Stop, one interrupt after reconnect, duplicate runner ends, the saved failure cause, and Retry.
