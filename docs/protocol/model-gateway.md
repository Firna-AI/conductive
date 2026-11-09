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

## Terms

- **Gateway:** the Worker routes that take the model requests of the
  agent programs in a sandbox.
- **Turn token:** a secret of one turn. The agent programs send it to the
  gateway in place of an agent login.
- **Upstream:** the provider API that gets a model request from the
  gateway.

## No login in the sandbox

- A sandbox from an org image with a runner of protocol version 2 or
  later holds no agent login (decision 120).
- Its agent programs send each model request to the gateway, with the
  turn token of their turn.
- The gateway adds the agent login of the turn, and sends the request on
  to the upstream.
- A runner of protocol version 1 gets the agent login itself with each
  turn (gateway decision 2).
  [The agent runner](chat-and-events.md#the-agent-runner) states which
  runner versions a workspace accepts.
- An HTTPS proxy on a new server was rejected. Reason: it is one more
  server to run and secure. The agent programs must also trust its
  certificate authority.
- Boat's AI credentials proxy was rejected. Its placeholder key belongs to
  a sandbox start, not to a turn. It needs a wider Boat key and a fee. It
  also ties the agent logins to Boat.
- Agent programs outside the sandbox were rejected, because they need a
  new place to run the agents and new tools.

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
  Anthropic API key. It is OpenAI for an OpenAI API key.
- Anthropic confirmed on 9 November 2026 that the gateway can carry
  subscription tokens (gateway decision 1).
- The gateway forwards only a fixed list of model routes for each agent.
  Examples are the Messages API of Anthropic and the Responses API of
  OpenAI.
- The gateway refuses every other route, with no call to the upstream.
- A pass-through of every path was rejected, because sandbox code could
  then use the login on every API of the provider.
- The gateway forwards only allowed request headers. It never forwards a
  credential or a cookie of the request.
- The allowed request headers include name patterns, such as `anthropic-*`,
  so that the new headers of a later agent program pass.
- The gateway sends back only allowed response headers.
- The gateway passes each request body unchanged. It passes each answer
  body unchanged.
- An error body also passes unchanged, unless it holds the real login.
- No response header and no error body carries the real login. The
  gateway removes the login from them before it sends them on.
- Reason: [Anthropic's gateway guide](https://code.claude.com/docs/en/llm-gateway-protocol)
  asks a gateway to pass `anthropic-*` headers and body fields as open
  lists. It also asks a gateway to pass error bodies unmodified.
- The gateway answers each of its own refusals in the error format of the
  upstream's API, with a stable error code. A body above its limit gets
  the answer that [Request bodies](access-and-security.md#request-bodies)
  gives.

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
- The gateway never sends a request to the upstream again by itself. The
  agent program decides each retry.
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

- Risk: while a turn runs, each process in the sandbox can read its turn
  token. A member with a terminal in the sandbox can read it too.
- Such a process or member can spend the login of the starter through the
  gateway while the turn runs.
- Risk: a deploy of the Worker or an update of the Cloudflare runtime can
  end a long answer. The agent program then sends the request again.
