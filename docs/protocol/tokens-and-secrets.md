# Tokens and secrets

This doc holds the requirements and the decisions in force for tokens and
secrets. It covers the workspace token, the GitHub tokens, the secrets that
users enter, and the agent logins that users connect. It belongs to
[Access and security](access-and-security.md), which covers sign-in, the
gates of the Worker, the request bodies, and the content security policy.
The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A gateway
decision number names a decision of the change that adds the
[model gateway](model-gateway.md), as that doc says. An own endpoint
decision number, such as own endpoint decision 9, names the dated record of
one decision of the change that adds the
[own endpoint logins](#own-endpoint-logins). Its plan keeps these records
while the change is open. Its pull request keeps them after the merge.

## The workspace token

- Each workspace has its own workspace token.
- With the token, the sandbox of the workspace can do seven things:
  - connect its agent runner to the Durable Object of its own workspace
  - get a GitHub token for its own workspace
  - create and list workspaces through the agent tools
  - list the repositories of its org image, the sections of its org, and
    the models of the app, through the agent tools
  - list the sessions of each workspace of its org, and read the chat of
    each session, through the agent tools (decision 257)
  - start sessions and send messages in the workspaces of its org that are
    not archived, while a turn runs, through the agent tools
  - ask for a command on the Mac of the sender of a turn that runs now,
    through the agent tools
- The token allows nothing else. It can never answer a request for a Mac
  command, and it can never choose the Mac that gets the request.
- Some requests act for a sender: a create call, a new session, a message,
  and a Mac command request. The Worker reads the sender of each such
  request from its own record of the turn that runs now.
- It never takes a sender from the sandbox, and it never uses the
  workspace owner in place of the sender.
- Reason: agent code runs in the sandbox, so a sender that the sandbox
  names can be false.
- At each such request, the Worker checks that the sender is still a
  member of the org of the workspace.
- [Agent tools](agent-tools.md#mac-commands) states the Mac command
  requests. [The sender](session-calls.md#the-sender) states the sender of
  the session calls.

## GitHub tokens

[GitHub tokens](github-tokens.md) states the rules for Git, the GitHub CLI, and repository copies in image builds.

## Secrets that users enter

- The app stores the env var values and the agent logins encrypted. It
  also keeps the host of an own endpoint in plain text, as
  [Own endpoint logins](#own-endpoint-logins) says.
- The values of env vars are write-only. The settings never return a
  stored value to the browser, whatever the mark of the env var.
- An admin marks each env var of the org as secret or not secret
  (decision 133). Each env var is secret until an admin clears its mark.
  The value of a secret env var is a secret value.
- An admin can change the mark of an env var without a new value.
- A changed mark applies at the next start of each sandbox, as a changed
  value does. The chat history and the start logs from before that start
  keep their text.
- The Durable Object of the workspace hides each exact copy of a secret
  value in the text that screens show from each runner event. It does
  this before it checks, stores, or sends the event. It uses the values
  and the marks of the last start of the sandbox.
- The Durable Object does this for each runner, also for an older runner
  from an org image or a saved disk. It also hides a copy that consecutive
  text events of one answer split.
- Reason: an org image or a saved disk can hold an older runner. A filter
  of secret values in the runner was rejected, because an older runner
  does not have it.
- The app keeps the real path of each file, the real name of the default
  branch of each repository, and the real name of the base branch of each
  workspace. Reads, diffs, and the file lists use them. The browser gets
  these real values, so a secret value can show in the data that the
  browser gets and sends (decision 145).
- Screens show a separate label of each path and branch name. The label
  hides each exact copy of a secret value.
- Reason: a hidden path or branch name names nothing real, and two hidden
  paths can become equal. File IDs in place of real paths were rejected,
  because they change the file API.
- The runner hides the workspace token and the agent logins in the text
  that screens show, before it saves or sends an event.
- A start log hides each exact copy of a secret value and of the workspace
  token before a browser gets it.
- The app does not hide the value of an env var that is not secret. So
  each reader of the chat or of a start log can see such a value.
- Reason: the admin knows which values are secrets. A length rule, where
  only values of 8 or more characters count, was rejected, because it
  guesses. A mask of every value was rejected, because it also hides
  short, common values, such as `1`, in ordinary text.
- Risk: the app hides only exact copies of a value. A changed or encoded
  value still shows. File content, diff content, and the terminal hide no
  value.
  The mark does not keep a value from the agent or from a member with a
  terminal, because each sandbox gets the env vars of its org.
- Risk: the runner does not hide secret values. So its saved events on the
  disk of the sandbox can hold them, as the agent sessions there do.

## Agent logins

- A user connects Claude with a subscription token from
  `claude setup-token`, or with an Anthropic API key (decisions 24 and 37).
- A user connects Codex with an OpenAI API key. The app offers no ChatGPT
  plan sign-in, because OpenAI allows it for hosted apps only after a
  waitlist.
- A user can also connect each agent with an own endpoint, as
  [Own endpoint logins](#own-endpoint-logins) says.
- Anthropic gave the operator permission to use `claude setup-token`
  tokens (decision 37).
- Anthropic confirmed to the operator on 9 November 2026 that the
  [model gateway](model-gateway.md) can carry subscription tokens (gateway
  decision 1). OpenAI confirmed to the operator on the same day that the
  gateway can carry OpenAI API keys.
- Risk: Anthropic plans to make bare mode the default, and bare mode reads
  no subscription login. A later release of the agent program can then
  stop the tokens.
- A sign-in inside a sandbox was rejected, because the login would stay on
  the disk of one workspace.
- A user's agent logins serve all of that user's orgs (decision 21).
- The app uses a user's agent login only for a turn of a session that the
  user started. Only an older runner gets the login itself, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says. The GitHub token of a turn still belongs to its sender, as
  [GitHub tokens](#github-tokens) says.

### Own endpoint logins

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
- The rule accepts only an `https://` address with a public host. It
  refuses these hosts:
  - `localhost`, and each IP address that is not public, such as a
    loopback, private, or link-local address
  - a single-label name, such as `proxy`, and an internal name
  - a name in the domains of the app and of the previews, which
    [Hostnames](../architecture.md#hostnames) gives
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
