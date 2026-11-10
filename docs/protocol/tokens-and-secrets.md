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
[model gateway](model-gateway.md), as that doc says.

## The workspace token

- Each workspace has its own workspace token.
- With the token, the sandbox of the workspace can do five things:
  - connect its agent runner to the Durable Object of its own workspace
  - get a GitHub token for its own workspace
  - create and list workspaces through the agent tools
  - list the repositories of its org image, the sections of its org, and
    the models of the app, through the agent tools
  - ask for a command on the Mac of the sender of a turn that runs now,
    through the agent tools
- The token allows nothing else. It can never answer a request for a Mac
  command, and it can never choose the Mac that gets the request.
- The Worker reads the sender of each Mac command request from its own
  record of the turn that runs now. It never takes a sender from the
  sandbox, and it never uses the workspace owner in place of the sender.
- Reason: agent code runs in the sandbox, so a sender that the sandbox
  names can be false.
- At each Mac command request, the Worker checks that the sender is still
  a member of the org of the workspace.
- [Agent tools](agent-tools.md#mac-commands) states the Mac command
  requests.

## GitHub tokens

[GitHub tokens](github-tokens.md) states the rules for Git, the GitHub CLI, and repository copies in image builds.

## Secrets that users enter

- The app stores the env var values and the agent logins encrypted.
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
- A user connects Codex with a device code sign-in to their ChatGPT plan,
  or with an OpenAI API key (decision 175).
- The account page starts the device code sign-in. It shows the code,
  the OpenAI verification page, and the expiry. A code expires after 15 minutes.
- The Worker alone holds the pending device state, encrypted for that
  signed-in user. A poll reports waiting, connected, expired, or failed
  with a cause. The Worker removes the pending secret when the flow ends.
- The Worker stores the access token, refresh token, ID token, account ID,
  and expiry encrypted as one login. No browser response returns them.
- The real ChatGPT sign-in never enters a sandbox. A runner without its
  support gets no credential, as [Isolation](isolation.md#agent-logins-in-a-sandbox) says.
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
- A user's agent logins serve all of that user's orgs (decision 21).
- The app uses a user's agent login only for a turn of a session that the
  user started. Only an older runner gets the login itself, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says. The GitHub token of a turn still belongs to its sender, as
  [GitHub tokens](#github-tokens) says.
