# Own endpoint logins

This doc holds the requirements and the decisions in force for the own
endpoint logins. It covers what such a login holds, the API that its
endpoint must serve, and the model list of the endpoint. It also covers
how the app keeps the key and the address, and which addresses the app
accepts. It belongs to [Tokens and secrets](tokens-and-secrets.md).
[Agent logins](tokens-and-secrets.md#agent-logins) covers the other kinds
of login, and the rules for every agent login. The terms are those of the
[architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A gateway
decision number names a decision of the change that adds the
[model gateway](model-gateway.md), as that doc says. An own endpoint
decision number names a decision of the change that adds the own endpoint
logins, as [Tokens and secrets](tokens-and-secrets.md) says.

- An own endpoint login holds the address of a gateway or a proxy that the
  user chose, and its key (own endpoint decision 1). Each agent has its own
  login. So a user who sends both agents to one proxy connects it once for
  each agent.
- A manual mode, where the scripts and the env vars of the org set up the
  agent programs, was rejected. Reason: only an admin could change it, and
  each process on the cloud computers of the org would get the key.
- An endpoint that an admin sets for the whole org was rejected, because
  each agent login belongs to one user (decisions 21 and 105).
- A Claude endpoint must serve the Anthropic Messages API, and accept the
  key in the `x-api-key` header. A Codex endpoint must serve the OpenAI
  Responses API, and accept the key as a bearer token in the
  `Authorization` header.
- The [model gateway](model-gateway-requests.md#own-endpoints) sends each
  model request of a turn on the login to the endpoint, with the key.
- The Worker also reads the model list of the endpoint, with the key: at
  the save, when the owner presses Refresh on the account page, and in the
  background when a turn on the login starts, at most once in 10 minutes
  (own endpoint decision 10). It makes no other call to the endpoint.
- The pickers of the owner hide each model of the app that the last list
  that the Worker could read does not name. Before the first such list,
  and when a list names no model of the app for an agent, the pickers show
  every model of the app for that agent. A failed read keeps the last
  list. The picker of a session keeps its current model.
- The account page names each model of the app that the list does not
  name, with its model ID and the time of the last read.
- Reason: a model that the endpoint does not serve fails in its turn. A
  mark that only warns was rejected, because the owner chose to see only
  models that the endpoint lists. Risk: a gateway can serve a model that
  its list does not name, and the owner's pickers then hide that model.
- The pickers of other members show every model of the app. A turn on a
  model that the endpoint does not serve fails with a cause that names the
  model ID, and no host (own endpoint decision 5).
- The key and the full address are write-only, as the other logins are.
  The browser gets back only the host of the address, with its port when
  the port is not the default. The account page shows that host with the
  login.
- The app stores the key and the address encrypted. It keeps only the host
  and the port in plain text, so that it can show them. Reason: the path or
  the query of an address can hold a secret.
- One rule decides which addresses the app accepts (own endpoint decision
  9). The connect form, the save, the dispatch of a turn, and the gateway
  use the same rule.
- The rule accepts only an `https://` address with a public host name. It
  refuses these hosts:
  - `localhost`, and each IP address, IPv4 or IPv6, also a public one (own
    endpoint decision 13)
  - a single-label name, such as `proxy`, and an internal name
  - a name in the domains of the app and of the previews, which
    [Hostnames](../architecture.md#hostnames) gives
- Reason to refuse a public IP address: users on Cloudflare's forum report
  that a fetch from a Worker to an IP address fails with error 1003. The
  error says "Direct IP access not allowed". So a login with an IP address
  would fail each turn. Cloudflare's docs do not state this limit, and no
  check of it ran on Cloudflare.
- A public host name that points to a public IP address works when the
  server has a certificate for that name. For example, the free name
  `<IP address>.sslip.io` points to that IP address.
- An automatic change of an IP address into such a name was rejected.
  Reason: the certificate check fails when the certificate of the server
  does not name the new host. Also, the app would trust a DNS service that
  the user did not choose.
- The rule refuses an address with a user name or a password, because a
  request address cannot carry them.
- The rule keeps the path and the query of the address. It drops a
  fragment and a trailing slash. It also drops a final `/v1` of a Claude
  address, so that a Claude address works with or without it.
- A Claude request goes to the address with its route added, such as
  `/v1/messages`. A Codex request goes to the address with `/responses`
  added. So a Codex address names the base of that API, such as
  `https://proxy.example.com/v1`.
- The form shows the address as the app saves it. The save refuses each
  other address with HTTP 400 and the error code `invalid_endpoint`.
- Reason: the gateway in the Worker calls the endpoint. It sends a login
  only to an https address with a public host (gateway decision 8), and
  never to the app itself or to a preview. So the app saves no address that
  would fail each turn.
- `http://` to a loopback address, for a proxy on the cloud computer, was
  rejected. Reason: the Worker cannot reach an address in a cloud
  computer.
