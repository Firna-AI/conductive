# Model gateway: requests and answers

This doc holds the requirements and the decisions in force for the model
requests that the gateway sends on to the upstream, and for their answers.
It covers the upstream of each login, and the routes, the headers, and
the bodies that pass. It also covers the own endpoints, the streams, and
the risks, and it says that the gateway keeps no copy. It belongs to
[Model gateway](model-gateway.md), which covers the turn token, how the
agents reach the gateway, and the checks of each request. The terms are
those of the [model gateway](model-gateway.md#terms) and of the
[architecture doc](../architecture.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A gateway
decision number names a decision of the change that adds the gateway, as
[Model gateway](model-gateway.md) says.

## Requests and answers

- The upstream is Anthropic for a Claude subscription token or an
  Anthropic API key. It is OpenAI for an OpenAI API key or a ChatGPT sign-in. It is the endpoint
  of the login for an own endpoint login, as [Own endpoints](#own-endpoints)
  says.
- [Agent logins](tokens-and-secrets.md#agent-logins) states which login
  kinds the providers confirmed, and the risks of a ChatGPT sign-in.
- The gateway forwards only a fixed list of routes for each agent and login kind.
  Examples are the Messages API of Anthropic and the Responses API of
  OpenAI.
- A ChatGPT sign-in has only these gateway routes:
  - `GET /backend-api/wham/config/bundle` on `chatgpt.com`
  - `GET /backend-api/wham/accounts/check` on `chatgpt.com`
  - `GET /backend-api/codex/models` on `chatgpt.com`
  - `POST /backend-api/codex/responses` on the workspace backend that
    OpenAI selects, or `chatgpt.com` when routing has no constraint
- For this kind, the gateway accepts the ChatGPT account and Codex headers
  that these requests need. It gets the routing header from OpenAI.
- A routed backend must be an HTTPS origin with no user credentials,
  path, query, or fragment. Failed or invalid routing stops the request.
- The gateway refuses WebSocket upgrades. Codex then uses HTTP streaming.
  The runner turns off request compression for ChatGPT turns.
- The gateway refuses every other route, with no call to the upstream.
- A pass-through of every path was rejected, because sandbox code could
  then use the login on every API of the provider.
- The gateway forwards only allowed request headers. It never forwards a
  credential or a cookie of the request.
- The allowed request headers include name patterns, such as `anthropic-*`,
  so that the new headers of a later agent program pass.
- When the agent login of a turn is an Anthropic API key or a Claude own
  endpoint login, its turn token can be in `x-api-key` or in a bearer
  `Authorization` header (gateway decision 11). The upstream gets the real
  key in `x-api-key`.
- Reason: Claude sends the turn token from its profile as a bearer
  token, also for an API key. Claude runs a turn on a Claude own endpoint
  login in its API key mode.
- When the agent login of a turn is an Anthropic API key or a Claude own
  endpoint login, the gateway removes only the `oauth-2025-04-20` value
  from `anthropic-beta`.
- Reason: neither key uses the OAuth login mode. No field of the request
  body needs that value.
- The gateway sends back only allowed response headers.
- The gateway passes each request body unchanged. It passes each answer
  body unchanged.
- In an account-check answer, the gateway removes routed origins and routing
  constraints. Codex stays on the gateway while the Worker follows real routing.
- An error body also passes unchanged, unless it holds the real login.
- For a ChatGPT sign-in, the gateway never passes on an OpenAI 401.
  [How the agents reach the gateway](model-gateway.md#how-the-agents-reach-the-gateway)
  states its recovery and terminal answers.
- On the route of Codex, the gateway refuses a request whose body is not
  one JSON object, or is encoded. It also refuses a request whose
  top-level `background` field holds any value except `false` (gateway
  decision 9).
- Reason: OpenAI keeps a background response running after its connection
  closes. So the end of the turn could not stop it.
- The gateway refuses such a request before the upstream gets the last
  byte of its body. Rewriting `background` and a closed list of body
  fields were rejected. The rewrite changes a streamed body, and the list
  would block each later Codex update.
- On the route of Claude, the gateway refuses a request without the
  markers that only Claude sends (gateway decision 11). Examples are its
  user agent and its values of the `anthropic-beta` header. The gateway
  checks no turn and calls no upstream for such a request.
- Reason: a process without a key of its own can find the profile of
  Claude. Without the check, its requests would spend the login of the
  starter.
- The check is no security boundary. A process that can read the turn
  token can also copy the markers.
- No response header and no error body carries the real login. For an own
  endpoint, the login is its key and its address. The gateway removes the
  login from them before it sends them on.
- Reason: [Anthropic's gateway guide](https://code.claude.com/docs/en/llm-gateway-protocol)
  asks a gateway to pass `anthropic-*` headers and body fields as open
  lists. It also asks a gateway to pass error bodies unmodified.
- The gateway answers each of its own refusals in the error format of the
  upstream's API, with a stable error code. A body above its limit gets
  the answer that [Request bodies](access-and-security.md#request-bodies)
  gives.

- An invalid turn token gets HTTP 403 on a ChatGPT route, with the same
  code and cause. Claude and API-key routes keep HTTP 401.
- Reason: a ChatGPT 401 would make Codex try to renew its placeholder.

## Own endpoints

- For an own endpoint login, the gateway sends each model request of the
  turn to the endpoint, with the key in the header that
  [Own endpoint logins](own-endpoint-logins.md) names
  (gateway decision 10). No runner gets the address or the key, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says.
- The endpoint gets the messages, the files, and the command results of
  each turn on the login, whoever sent the message.
- Before each request, the gateway checks the address again with the rule
  of [Own endpoint logins](own-endpoint-logins.md). It
  follows no redirect. Reason: a redirect could send the key and the turn
  to an address that the rule refuses.
- A request reaches only a public IP address, also when a public name
  points to a private address. Reason: a check of the name cannot see
  where the name points at the time of the request.
- The gateway sends each request to the port of the saved address. It
  reaches any port of a host outside Cloudflare's proxy.
- For a host behind Cloudflare's proxy, the gateway reaches only the https
  ports 443, 2053, 2083, 2087, 2096, and 8443. Cloudflare ignores a port
  that its proxy does not serve, and the request goes to port 443.
- The rule refuses no port (gateway decision 8).
- Reason: a host outside Cloudflare's proxy takes any port, and the rule
  cannot tell whether a host is behind the proxy. A list of allowed ports
  was rejected, because it would refuse endpoints outside the proxy that
  work.
- The workspace also checks the address when it dispatches a turn. A
  refused address fails the turn before an agent starts (gateway decision
  4). The cause names the starter and the agent, and points to the account
  page. The login then counts as a login that cannot be used, as
  [Messages](messages-and-attachments.md#messages) says.
- When the gateway cannot connect to the endpoint, it answers the request
  with an error that names the endpoint as unreachable.

## Streams

- An answer streams to the agent program as it arrives. The gateway holds
  back no part of an answer.
- Reason: an agent program stalls on an answer that a gateway holds back,
  as Anthropic's gateway guide says.
- A model request that still runs when its turn ends stops within 30
  seconds, also while its upload runs or while it waits for the answer
  (gateway decision 6).
- Reason: the runner reports the end of a turn only after the agent
  program of the turn exits. So only a copied turn token can still stream
  after the turn.
- An answer that runs to its end was rejected, because a copied token
  could then spend the login for minutes after the turn.
- When the agent program closes its connection, the gateway cancels the
  request to the upstream.
- The gateway can replay a body-less ChatGPT metadata request once after
  renewal. It never copies or replays a model upload. The agent decides its resend.
- The gateway adds no model filter, no rate limit, and no time or byte
  limit on an answer. The limits of the provider and of the agent program
  apply.
- A model filter was rejected, because the agent programs choose their own
  models for work in the background.
- A rate limit was rejected, because subagents send requests in parallel.

## No copies

- The gateway keeps no copy of a model request or of an answer.
- The gateway writes no body and no header value to a log.

## Risks

- [A sandbox with a version pin of 2 or later](isolation.md#a-sandbox-with-a-version-pin-of-2-or-later)
  states what the processes of a sandbox and the members of its org can
  do with a turn token. It also states where a settings file in the
  repository can send the token.
- Risk: the marker check passes each request of the agent program of
  Claude. A process that the agent starts can run that program with no
  key of its own. That run then spends the login of the starter while the
  turn runs.
- Risk: a deploy of the Worker or an update of the Cloudflare runtime can
  end a long answer. The agent program then sends the request again.
