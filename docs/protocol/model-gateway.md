# Model gateway

This doc holds the requirements and the decisions in force for the model
gateway. The gateway keeps the agent logins out of the sandbox. It adds
the login of a turn to each model request of the agents, and sends the
request on to the provider. The terms are those of the
[architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A gateway
decision number, such as gateway decision 6, names the dated record of one
decision of the change that adds the gateway. Its plan keeps these records
while the change is open. Its pull request keeps them after the merge.
An egress decision number, such as egress decision 1, names the dated
record of one decision of the change that adds the egress container.

## Terms

- **Gateway:** the Worker routes that take the model requests of the
  agent programs in a sandbox.
- **Turn token:** a secret of one turn. The agent programs send it to the
  gateway in place of an agent login.
- **Upstream:** the provider API that gets a model request from the
  gateway.
- **Profile:** a pair of Anthropic files that Claude reads: a config file
  with an address, and a credentials file with a token.
- **Egress container:** a container on the app's Cloudflare account that
  sends the ChatGPT requests of the gateway to OpenAI. It has no public
  address.

## No login in the sandbox

- A sandbox with a version pin of 2 or later holds no agent login
  (decision 120). The version pin of a sandbox is the lowest runner
  protocol version that its workspace accepts, as
  [The agent runner](agent-runner.md#the-agent-runner) says.
- Its agent programs send each model request to the gateway, with the
  turn token of their turn. A settings file in the repository can send
  the requests of Claude to another address, as
  [How the agents reach the gateway](#how-the-agents-reach-the-gateway)
  says.
- The gateway adds the agent login of the turn, and sends the request on
  to the upstream.
- A runner of protocol version 1 gets the agent login itself with each
  supported turn, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says (gateway decision 2).
  [The agent runner](agent-runner.md#the-agent-runner) states which
  runner versions a workspace accepts.
- A ChatGPT sign-in requires declared runner support. An unsupported turn
  fails before any credential is sent, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox) says.
- An HTTPS proxy on a new server was rejected. Reason: it is one more
  server to run and secure. The agent programs must also trust its
  certificate authority.
- Boat's AI credentials proxy was rejected. Its placeholder key belongs to
  a sandbox start, not to a turn. It needs a wider Boat key and a fee. It
  also ties the agent logins to Boat.
- Agent programs outside the sandbox were rejected, because they need a
  new place to run the agents and new tools.

## How the agents reach the gateway

- The runner gives Claude the gateway address and the turn token in a
  profile (gateway decision 11).
- Only the sandbox user can read the credentials file of the profile.
  [A sandbox with a version pin of 2 or later](isolation.md#a-sandbox-with-a-version-pin-of-2-or-later)
  states the risk of the file.
- Each session gets its own profile. So the agent of a session sends only
  the turn token of its own turn.
- The runner removes the credentials file when the turn ends. When the
  runner starts, it removes each credentials file that a crash left.
- The runner puts no gateway address, turn token, proxy, or certificate
  setting in the environment or the settings of Claude. So no process
  that the agent starts gets a gateway address from the runner.
- Each such process keeps the model and the certificate settings of its
  project. A model request with a key of the project reaches the
  destination of the project.
- Reason: Claude copies an address from its environment and its settings
  into each process that it starts. It copies no address from its
  profile.
- A gateway address in the environment or the settings of Claude was
  rejected. Reason: a process with a key of its own would then send that
  key to the gateway, which refuses it.
- A program that restores the settings of the project in each process
  that the agent starts was rejected. Reason: the agent starts some
  processes without it.
- Passing on a request with a key of the project was rejected. Reason:
  the keys and the requests of the project would then pass through the
  Worker. Any holder of a key could also use the gateway as a relay.
- A process without a key of its own can find the profile of Claude. The
  gateway refuses its requests, as
  [Requests and answers](#requests-and-answers) says.
- A settings file in the repository, such as `.claude/settings.json`, can
  set another address for the model requests of Claude. Claude then sends
  each model request and the turn token to that address.
- Reason: such a file can already set hooks, commands that Claude runs
  during the turn. A hook can read the credentials file. A copy of the
  token works only as [The turn token](#the-turn-token) says.
- An empty address in the settings of Claude, which would keep its
  requests on the gateway, was rejected. Reason: Claude copies that empty
  value into each process that it starts, and some of those processes
  then fail.
- When the agent login of a turn is a Claude subscription token, Claude
  asks for a prompt cache of 1 hour (gateway decision 13). Anthropic
  keeps the earlier part of the conversation in that cache, so that the
  next request can reuse it.
- Reason: Claude asks for 1 hour by itself only when it is signed in to a
  Claude subscription. From a profile, it cannot tell that a subscription
  is behind the turn token. So it would ask for about 5 minutes.
- A cache of about 5 minutes was rejected. Reason: after each pause of
  more than 5 minutes, the next request writes the cache again. That uses
  the limits of the subscription faster.
- For an OpenAI API key, Codex gets the gateway address in its settings,
  and the turn token in its login request. Neither is in its environment.
- For a ChatGPT sign-in, Codex runs its own ChatGPT mode through the
  gateway (decisions 173 and 175).
- Each session has its own Codex login file. It holds the turn token in
  place of the access token, a placeholder refresh token, and public
  account claims. It holds no real sign-in token.
- Only the sandbox user can read the file. The runner removes it after
  the agent exits, including after Stop or a failed start.
- Neither the turn token nor the gateway address is in the environment
  of Codex or its helpers. The gateway address is in its settings.
- Only the Worker renews the real sign-in. It saves each rotated refresh
  token before using the new access token. Each login has one renewal at a time.
- A renewal and its credential writes continue after the initiating request ends,
  within the Worker's background-task limit.
  Uploads and model answers keep their own request lifetime.
- After an OpenAI 401, a turn can claim one renewal for all its requests.
  The app saves the claim before renewal. Concurrent calls and resends
  share that claim, including after a restart.
- Concurrent 401s for one access token share the turn's claimed renewal.
  A request can use the newer login when that renewal finishes.
  It starts no further renewal.
- A request waits at most 5 seconds for that renewal. If renewal still
  runs, the request gets HTTP 502 with no saved cause.
- A body-less metadata request can replay once after renewal.
- Each `POST /backend-api/codex/responses` upload goes to OpenAI once.
  After its 401, the gateway cancels the answer, renews, and returns
  HTTP 502 with `model_upstream_unavailable`. Codex sends the upload again
  with the renewed login.
- A failed renewal returns a terminal login error with HTTP 403.
- A further 401 returns that terminal error only after recovery ends
  without a newer login. The app saves its reconnect cause only if the
  stored access token still matches the failed token and no renewal runs.
- Reason: a final 401 would make Codex try to renew its placeholder.
- Codex reads the rules of the ChatGPT workspace through the gateway.
  A rule that moves Codex off the gateway fails the turn with a cause.
- The gateway follows the account routing of that workspace in the Worker.
  It gives Codex no routed origin. Codex stays on the gateway.
- The email, account ID, and workspace name of the signed-in account reach the
  sandbox. [Isolation](isolation.md#agent-logins-in-a-sandbox) states the
  risk of commands from a ChatGPT workspace rule.

## Addresses

- The gateway routes are on `api.conductive.build`, the hostname for
  machines, under `/v1/` (decision 102).
- Each agent has one base address on the gateway. The turn chooses the
  upstream, not the address.
- One address for each upstream was rejected, because the runner would
  then need to know the upstream.
- [Hostnames and gates](access-and-security.md#hostnames-and-gates) states
  the credential that the gateway routes accept.
  [Request bodies](access-and-security.md#request-bodies) states the size
  limit of a model request.

## The turn token

- Each turn gets its own turn token.
- A turn token works only on the gateway routes.
- A turn token works only while its turn runs. After a Stop request, it
  works for no new request.
- A turn token uses only the agent login of the starter of its session.
- The gateway accepts no workspace token. Reason: each process in the
  sandbox can read the workspace token, also between turns.
- A token for each session was rejected, because it also works in the
  later turns of the session.
- A request carries the turn token only in a header, never in the path or
  the query of its address. Reason: the logs of the Worker keep the
  address of each request.
- The runner hides the turn token in the text that screens show, as it
  hides an agent login.

## Checks of each request

- At each request, the gateway checks the turn, its workspace, and the
  access of the starter.
- The turn must still run in its workspace.
- The starter of its session must still be a member of the org, and must
  not be suspended.
- The agent login of the starter must still be the login that the turn
  started with.
- Any change of that login ends the turn at its next request (gateway
  decision 7). A removal of the login, or a loss of the access of the
  starter, does the same.
- The turn then fails and names the cause. After a change of the login,
  Try again starts a turn on the new login.
- Reason: a turn never moves to another key in its middle. A loss of
  access stops the turn at once. The gateway needs no copy of the login of
  the turn start.
- The first login for the whole turn was rejected, because the login of a
  removed or suspended starter would then keep serving the turn.
- The newest login at each request was rejected, because the turn could
  then move to another key in its middle.

## Requests and answers

- The upstream is Anthropic for a Claude subscription token or an
  Anthropic API key. It is OpenAI for an OpenAI API key or a ChatGPT sign-in.
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
- The gateway sends each request of a ChatGPT sign-in through the egress
  container (egress decision 1). It sends each request to another
  upstream directly.
- Reason: OpenAI refuses the requests to `chatgpt.com` that a Cloudflare
  Worker sends. It accepts them from a Cloudflare container.
- A proxy on a computer of the operator, on Google Cloud Run, or in a
  sandbox of Boat was rejected. Each puts a machine or a vendor outside
  Cloudflare in the path of the login. A runner that calls OpenAI itself
  was rejected, because the login would then reach the sandbox.
- The egress container calls only an `https` origin on `chatgpt.com` or
  on a subdomain of it. It sends no Cloudflare header to OpenAI.
- When a deployment has no egress container, the gateway sends these
  requests to the egress proxy that its settings name, with a shared
  secret. Without that setting, it sends them directly.
- The gateway refuses WebSocket upgrades. Codex then uses HTTP streaming.
  The runner turns off request compression for ChatGPT turns.
- The gateway refuses every other route, with no call to the upstream.
- A pass-through of every path was rejected, because sandbox code could
  then use the login on every API of the provider.
- The gateway forwards only allowed request headers. It never forwards a
  credential or a cookie of the request.
- The allowed request headers include name patterns, such as `anthropic-*`,
  so that the new headers of a later agent program pass.
- When the agent login of a turn is an Anthropic API key, its turn token
  can be in `x-api-key` or in a bearer `Authorization` header (gateway
  decision 11). The upstream gets the real key in `x-api-key`.
- Reason: Claude sends the turn token from its profile as a bearer
  token, also for an API key.
- When the agent login of a turn is an Anthropic API key, the gateway
  removes only the `oauth-2025-04-20` value from `anthropic-beta`.
- Reason: an API key does not use the OAuth login mode. No field of the
  request body needs that value.
- The gateway sends back only allowed response headers.
- The gateway passes each request body and model answer unchanged.
- In an account-check answer, it removes the routed origins and routing
  constraints. Reason: Codex must stay on the gateway while the Worker
  follows the real routing for each model request.
- An error body also passes unchanged, unless it holds the real login.
- For a ChatGPT sign-in, the gateway never passes on an OpenAI 401.
  [How the agents reach the gateway](#how-the-agents-reach-the-gateway)
  states its recovery and terminal answers.
- On a model route of Codex, the gateway refuses a request whose body is not
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
- No response header and no error body carries the real login. The
  gateway removes the login from them before it sends them on.
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
- A new version of the egress container takes each new ChatGPT request at
  once. The container of the old version takes no new request. It keeps
  its open answers for up to 15 minutes after the deploy (egress decision
  3).
- Reason: a deploy must not end the answers that stream through the
  container. A deploy replaces no running container, and the egress
  Worker lets the code of an old version run for 15 minutes.
- The gateway can replay a body-less ChatGPT metadata request once after
  renewal. It never copies or replays a model upload. Codex decides its resend.
- The gateway adds no model filter, no rate limit, and no time or byte
  limit on an answer. The limits of the provider and of the agent program
  apply.
- A model filter was rejected, because the agent programs choose their own
  models for work in the background.
- A rate limit was rejected, because subagents send requests in parallel.

## No copies

- The gateway keeps no copy of a model request or of an answer.
- The gateway writes no body and no header value to a log.
- The egress container sees a ChatGPT login only in transit. It keeps no
  copy of a login, a request, or an answer, and it writes no body and no
  header value to a log.

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
