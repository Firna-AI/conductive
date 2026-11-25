# Tokens and secrets

This doc holds the requirements and the decisions in force for tokens and
secrets. It covers the workspace token, the GitHub tokens, the secrets that
users enter, and the agent logins that users connect. It belongs to
[Access and security](access-and-security.md), which covers sign-in, the
gates of the Worker, the request bodies, and the content security policy.
[Secrets](secrets.md) covers the secrets that agents use in one command,
after a member allows it. [Agent logins](agent-logins.md) states the
agent logins that users connect. The terms are those of the
[architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. An own endpoint
decision number, such as own endpoint decision 9, names the dated record of
one decision of the change that adds the
[own endpoint logins](own-endpoint-logins.md). Its plan keeps these records
while the change is open. Its pull request keeps them after the merge. An
org login decision number, such as org login decision 4, names the dated
record of one decision of the change that adds the
[org logins](org-logins.md). Its plan keeps these records while the change
is open. Its pull request keeps them after the merge. A secrets decision
number names a decision of the change that adds [secrets](secrets.md), as
that doc says.

## The workspace token

- Each workspace has its own workspace token.
- With the token, the sandbox of the workspace can do these things:
  - connect its agent runner to the Durable Object of its own workspace
  - get a GitHub token for its own workspace
  - make the reads of the agent tools in its org, at any time: list and get
    the workspaces, list the repositories of its org image, the sections
    of its org, and the models of the app, list, read, and get the
    sessions, get the messages, and list the previews (decisions 257 and
    277)
  - make the writes of the agent tools in its org while a turn of its
    workspace runs: create, rename, move, and archive workspaces, change
    their target branch, start, rename, close, stop, and watch sessions,
    send messages, create and delete sections, and open and close previews
    (decision 277)
  - ask for a command on the Mac of the sender of a turn that runs now,
    through the agent tools
  - list the secrets of its org at any time, and run a command with the
    secrets that a grant allows while a turn of its workspace runs, as
    [Secret requests](secret-requests.md) says
- [Agent tool access](agent-tool-access.md) states the reach of these
  calls and the rights that each write uses.
- A change of the target branch can also change the base of an open pull
  request on GitHub. It uses the GitHub token of the sender, as
  [Change the target branch](workspace-management.md#change-the-target-branch)
  says.
- The token allows nothing else. It can never answer a request for a Mac
  command or for a secret, and it can never choose the Mac that gets a
  request.
- With the token, the sandbox gets the value of a secret only in the reply
  to a run call that a grant allows.
- Each write of the agent tools and each Mac command request acts for a
  sender. The Worker reads the sender of each such request from its own
  record of the turn that runs now.
- It never takes a sender from the sandbox, and it never uses the
  workspace owner in place of the sender.
- Reason: agent code runs in the sandbox, so a sender that the sandbox
  names can be false.
- At each such request, the Worker checks that the sender is still a
  member of the org of the workspace.
- [Mac command requests](mac-command-requests.md) states the Mac command
  requests. [The sender](agent-tool-access.md#the-sender) states the
  sender of each write of the agent tools.

## GitHub tokens

[GitHub tokens](github-tokens.md) states the rules for Git, the GitHub CLI, and repository copies in image builds.

## Secrets that users enter

- The app stores the env var values, the values of the
  [secrets](secrets.md), and the agent logins encrypted. It also keeps the
  host of an own endpoint in plain text, as
  [Own endpoint logins](own-endpoint-logins.md) says.
- The values of env vars are write-only. The settings never return a
  stored value to the browser, whatever the mark of the env var.
- The value of a secret goes back to the browser only when an admin
  reveals it, one value at a time, as [Reveal](secrets.md#reveal) says
  (secrets decision 2 A).
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
  text events of one answer split, as
  [Answer text secrets](answer-text-secrets.md) says.
- Reason: an org image or a saved disk can hold an older runner. A filter
  of secret values in the runner was rejected, because an older runner
  does not have it.
- The Durable Object also hides each value that a run with secrets used,
  as [The exact-copy filter](secret-requests.md#the-exact-copy-filter)
  says.
- With complete tool details, the Durable Object hides these copies before
  it cuts a long tool detail, as [Tool detail secrets](tool-detail-secrets.md) says.
- Risk: older runners and fallback connections still cut before the filter.
  So the start of a value that crosses the cut can show. The risk ends when
  both sides support complete tool details. A stopped workspace can keep an
  older runner with no time limit. Stored tool details keep their text.
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
- The runner hides the workspace token and each turn token that it got
  since it started, in the text that screens show. It does this before it
  saves or sends an event.
- It hides each whole copy of such a token, at any length.
- It also hides each run of 21 or more consecutive characters of such a
  token, from any place in the token. It counts each Unicode scalar value
  as one character.
- It also hides a whole token or such a run when consecutive text events
  of one answer split it.
- The rule does not check whether a run is secret. So it also hides a
  public run of 21 or more characters of a token.
- A run of 20 or fewer characters shows, unless it is a whole token or
  lies in a longer hidden run.
- Reason: with this rule, a cut or a change of text before the filter
  cannot show a long part of a token (the user's decision of 18 November
  2026). A rule that each cut runs after the filter, and a type for
  filtered text, were rejected. New code can still cut text before the
  filter.
- Reason: the limit is longer than each fixed public start of a token,
  such as `sk-ant-oat01-`. The longest such start has 20 characters. So
  text that holds only such a start does not change.
- Risk: a run of 20 or fewer characters outside a hidden run still shows,
  and so does a changed or encoded token. Several short runs, such as the
  lines of a wrapped token, can together show the token.
- Risk: an older runner, from an org image or a saved disk, hides only
  whole tokens until it updates, as [Updates](sandbox-software.md#updates)
  says. The rule changes no runner message, so such a runner keeps
  working. No filter in the Worker hides a part of these tokens.
- A start log hides each exact copy of a secret value and of the workspace
  token before a browser gets it.
- The app does not hide the value of an env var that is not secret. So
  each reader of the chat or of a start log can see such a value.
- Reason: the admin knows which values are secrets. A length rule, where
  only values of 8 or more characters count, was rejected, because it
  guesses. A mask of every value was rejected, because it also hides
  short, common values, such as `1`, in ordinary text.
- Risk: the app hides only exact copies of a secret value. A changed or
  encoded value still shows. File content, diff content, and the terminal
  hide no value.
  The mark does not keep a value from the agent or from a member with a
  terminal, because each sandbox gets the env vars of its org.
- Risk: the runner does not hide secret values. So its saved events on the
  disk of the sandbox can hold them, as the agent sessions there do.

## Agent logins

[Agent logins](agent-logins.md) states how users connect the logins of
each agent, how the Worker keeps and renews a ChatGPT sign-in, and their
risks. [Own endpoint logins](own-endpoint-logins.md) and
[Org logins](org-logins.md) state the other kinds of login.
