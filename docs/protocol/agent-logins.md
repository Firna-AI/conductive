# Agent logins

This doc holds the requirements and the decisions in force for the agent
logins that users connect. It covers the Claude and Codex logins, the
ChatGPT sign-in and its renewal, and their risks. It belongs to
[Tokens and secrets](tokens-and-secrets.md), which covers the workspace
token, the GitHub tokens, and the secrets that users enter.
[Agent logins in a sandbox](sandbox-logins.md) states how each turn uses
an agent login. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A gateway decision number names a decision of the change that adds
the [model gateway](model-gateway.md), as that doc says. An org login
decision number names a decision of the change that adds the org logins,
as [Tokens and secrets](tokens-and-secrets.md) says.

## Logins that users connect

- Each user connects their personal logins on the account page. An admin
  connects the org logins of an org on the Agents tab of the org settings,
  as [Org logins](org-logins.md) says.
- A user connects Claude with a subscription token from
  `claude setup-token`, or with an Anthropic API key (decisions 24 and 37).
- A user can also connect each agent with an own endpoint, as
  [Own endpoint logins](own-endpoint-logins.md) says.
- A user connects Codex with a device code sign-in to their ChatGPT plan,
  or with an OpenAI API key (decision 175).
- The account page starts the device code sign-in. It shows the code,
  the OpenAI verification page, and the expiry. A code expires after 15 minutes.
- The Worker alone holds the pending device state, encrypted for that
  signed-in user. A poll reports waiting, connected, expired, or failed
  with a cause. The Worker removes the pending secret when the flow ends.
- An unfinished ChatGPT sign-in can complete only while the member's Codex
  login matches the login at its start.
  A removal or save of that login ends each unfinished sign-in with a
  cause that asks for a new code.
  A save followed by removal can restore an absent login before the next poll.
  That sign-in can still complete.
- When a poll gets no response, HTTP 429, or HTTP 5xx, the form waits and
  polls again until the code expires.
  Any other poll failure shows its cause.
- After a sign-in completes, each poll returns the current Codex login status.
  A removed login is disconnected. The sign-in state stays connected until expiry.
- Started sign-in exchanges and renewals keep their credential writes alive
  after the initiating request ends, within the Worker's background-task limit.
- The Worker stores the access token, refresh token, ID token, account ID,
  and expiry encrypted as one login. No browser response returns them.
- The real ChatGPT sign-in never enters a sandbox. A runner without its
  support gets no credential, as [Agent logins in a sandbox](sandbox-logins.md) says.
- Only the Worker renews this login. It renews before expiry and serializes
  renewals for each login. It saves the rotated refresh token before
  using the new access token. A refused renewal makes the login unusable
  with a cause, until the user signs in again.
- A second OpenAI 401 after a successful renewal does the same. A late
  401 for a token that a newer renewal or sign-in replaced saves no cause.
- A concurrent 401 never ends a renewal in flight. It waits for the
  newer login as [the model gateway](model-gateway.md#how-the-agents-reach-the-gateway) says.
- A copied login file was rejected. Its single-use refresh token would
  compete with the member's own Codex for renewal.
- Risk: OpenAI sends hosted apps to its Sign in with ChatGPT waitlist.
  This device code flow uses the sign-in of the Codex program instead
  (decision 175 changes decision 37). OpenAI can block this use.
- Anthropic gave the operator permission to use `claude setup-token`
  tokens (decision 37).
- Anthropic confirmed to the operator on 9 November 2026 that the
  [model gateway](model-gateway.md) can carry subscription tokens (gateway
  decision 1). OpenAI confirmed to the operator on the same day that the
  gateway can carry OpenAI API keys.
- That OpenAI confirmation covers API keys only. It does not cover a
  ChatGPT sign-in through the app.
- Risk: Anthropic plans to make bare mode the default, and bare mode reads
  no subscription login. A later release of the agent program can then
  stop the tokens.
- Risk: a revoked sign-in or a refused renewal stops later requests.
  A second OpenAI 401 after renewal also stops them.
  The member must sign in again. Sandbox code can still copy and spend
  the turn token while its turn runs.
- Risk: an admin of a ChatGPT workspace can enforce Codex settings, such as
  the approval policy, the sandbox mode, hooks, and the allowed MCP servers. On a
  sign-in to that workspace, these settings can replace the settings that
  the runner gives Codex. Hooks and MCP commands run in the sandbox of
  the org, with its access. A rule that moves Codex off the gateway fails
  the turn (decision 173).
- Risk: the email, account ID, and workspace name of the signed-in account reach
  the sandbox. Its processes and members with terminal access can read them.
- A sign-in inside a sandbox was rejected, because the login would stay on
  the disk of one workspace.
- A user's personal logins serve all of that user's orgs (decision 21). An
  org login serves only the members of its org (org login decision 1 B).
- The app uses a personal login only for the turns of the sessions that
  its owner started on it. The one exception is that the Worker reads the
  model list of an own endpoint with its key, at the times that
  [Own endpoint logins](own-endpoint-logins.md) gives.
  The login itself never reaches a sandbox, as
  [Agent logins in a sandbox](sandbox-logins.md)
  says. The GitHub token of a turn still belongs to its sender, as
  [Git and the GitHub CLI](github-tokens.md#git-and-the-github-cli) says.

## Own endpoint logins

[Own endpoint logins](own-endpoint-logins.md) holds these requirements.

## Org logins

[Org logins](org-logins.md) holds the requirements of the org logins, the
Agents tab of the org settings, and the default login of a new session.
