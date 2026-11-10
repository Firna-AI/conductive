# Tokens and secrets

This doc holds the requirements and the decisions in force for tokens and
secrets. It covers the workspace token, the GitHub tokens, the secrets that
users enter, and the agent logins that users connect. It belongs to
[Access and security](access-and-security.md), which covers sign-in, the
gates of the Worker, the request bodies, and the content security policy.
The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

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
  terminal, because each sandbox gets every env var.
- Risk: the runner does not hide secret values. So its saved events on the
  disk of the sandbox can hold them, as the agent sessions there do.

## Agent logins

- A user connects Claude with a subscription token from
  `claude setup-token`, or with an Anthropic API key (decisions 24 and 37).
- A user connects Codex with an OpenAI API key. The app offers no ChatGPT
  plan sign-in, because OpenAI allows it for hosted apps only after a
  waitlist.
- Anthropic gave the operator permission to use `claude setup-token`
  tokens (decision 37).
- Risk: Anthropic plans to make bare mode the default, and bare mode reads
  no subscription login. A later release of the agent program can then
  stop the tokens.
- A sign-in inside a sandbox was rejected, because the login would stay on
  the disk of one workspace.
- A user's agent logins serve all of that user's orgs (decision 21).
- The app gives a user's agent login to a sandbox only for a turn of a
  session that the user started. The GitHub token of a turn still belongs
  to its sender, as [GitHub tokens](#github-tokens) says.
