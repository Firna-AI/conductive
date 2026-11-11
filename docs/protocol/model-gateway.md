# Model gateway

This doc holds the requirements and the decisions in force for the model
gateway. The gateway keeps the agent logins out of the sandbox. It adds
the login of a turn to each model request of the agents, and sends the
request on to the provider or to an own endpoint.
[Model gateway: requests and answers](model-gateway-requests.md) holds
the rules of those requests and of their answers, with the own endpoints.
The terms are those of the [architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A gateway
decision number, such as gateway decision 6, names the dated record of one
decision of the change that adds the gateway. Its plan keeps these records
while the change is open. Its pull request keeps them after the merge. An
own endpoint decision number names a decision of the change that adds the
own endpoint logins, as [Tokens and secrets](tokens-and-secrets.md) says.

## Terms

- **Gateway:** the Worker routes that take the model requests of the
  agent programs in a sandbox.
- **Turn token:** a secret of one turn. The agent programs send it to the
  gateway in place of an agent login.
- **Upstream:** the provider API, or the own endpoint of the login, that
  gets a model request from the gateway.
- **Profile:** a pair of Anthropic files that Claude reads: a config file
  with an address, and a credentials file with a token.

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
  turn, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says (gateway decision 2).
  [The agent runner](agent-runner.md#the-agent-runner) states which
  runner versions a workspace accepts.
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
  [Requests and answers](model-gateway-requests.md#requests-and-answers)
  says.
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
- Codex gets the gateway address in its config, and the turn token in its
  login request. Neither is in the environment of Codex.

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

[Requests and answers](model-gateway-requests.md#requests-and-answers) holds these requirements.

## Own endpoints

[Own endpoints](model-gateway-requests.md#own-endpoints) holds these requirements.

## Streams

[Streams](model-gateway-requests.md#streams) holds these requirements.

## No copies

[No copies](model-gateway-requests.md#no-copies) holds these requirements.

## Risks

[Risks](model-gateway-requests.md#risks) holds these requirements.
