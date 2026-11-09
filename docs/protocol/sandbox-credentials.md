# Sandbox credentials

This doc states what a sandbox holds and how each turn gets its credential.
It also states which agent logins users connect. It is a page of
[Access and security](access-and-security.md), which holds sign-in, the
Worker gates, the app's Boat key, and the secrets that users enter.
The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A gateway
decision number names a decision of the change that adds the
[model gateway](model-gateway.md), as that doc says.

## What a sandbox holds

- Every sandbox starts with Boat's `noEnv` setting, so it gets none of the
  secrets of the app's Boat account.
- At a start, a sandbox gets only two secrets: its workspace token and the
  env vars of its org.
- The sandbox gets them at create and at each resume. A changed secret
  applies at the next start.
- No saved snapshot holds these secrets. Builds and refreshes get none of
  them.
- A sandbox gets no agent login at a start. The next section says how
  each turn uses an agent login.
- GitHub access reaches a workspace sandbox only through the git credential
  helper.
- A build sandbox gets GitHub access only for the Git command that copies
  each repository, as [GitHub tokens](#github-tokens) says (decision 90).

## Agent logins in a sandbox

- Each session runs on the agent login of its starter, the member who
  started the session (decision 105). Each turn of the session uses that
  login, whoever sends its messages.
- The GitHub token of a turn and its Mac requests still follow its sender,
  as [GitHub tokens](#github-tokens) and
  [Mac commands](agent-tools.md#mac-commands) say.
- With each turn, the agent runner gets a credential of the starter over
  its connection to the Durable Object. Reason: the sandbox gets its
  secrets only at a start, and the sessions of one sandbox can have
  different starters.
- The runner of a sandbox comes from its org image. A newer runner has
  protocol version 2 or later. An older runner has protocol version 1.
  [The agent runner](agent-runner.md#the-agent-runner) states which runner
  versions a workspace accepts.
- A newer runner gets a turn token as the credential of each turn. An
  older runner gets the agent login itself. The two sections below give
  the rules and the risks of each.
- The workspace gives the credential of a turn to the runner only while
  the starter is a member of the org.
  [Messages](messages-and-turns.md#messages) says what a message of another
  member does when the login of the starter cannot be used.
- Each agent login has a share setting (decision 116). It says whether the
  messages of other members can run on that login.
- The kind of a login sets the default of its share setting. A new Claude
  subscription login does not let other members use it. A new API key lets
  them use it.
- Reason: Anthropic's consumer terms forbid making a Claude account
  available to anyone else. The owner of an API key may let a team use it.
  Sharing every login by default was rejected for that reason.
- A replaced login keeps its share setting while its kind stays the same. A
  login whose kind changes gets the default of its new kind. Reason: a key
  rotation keeps the choice of its owner.
- The account page shows the share setting of each connected login. Its
  owner can change the setting there at any time.
- When the starter does not share the login, a message of another member
  starts a new session on that member's own login. A Try again of another
  member does the same. [Messages](messages-and-turns.md#messages) states the
  rules of such a new session.
- The workspace checks the share setting when it accepts each message, and
  again before it gives the credential of the turn to the runner. So a
  waiting message of another member never runs on a login that its owner
  stopped sharing.
- A message of a sender who left the org never reaches the agent, also
  while the login of the starter works.
- The session record shows whether the login of its starter can be used,
  and whether the starter shares it. It holds no part of the login.
- The runner never writes a login to disk.
- Risk: while the starter shares the login, the other members of a session
  spend it. Anthropic's rules for hosted products ask each end user to sign
  in with their own credentials. So a shared Claude subscription stays a
  risk (decisions 105 and 116).
- Risk: while a turn runs, each process in the sandbox can get the
  sender's GitHub App user token. Each member with a terminal there can
  get it too, for example with `git credential fill`. A copied token keeps
  working after the turn until it expires. It also reaches the
  repositories of that person outside the org (decision 121).
- Risk: each member with a terminal in a sandbox can read its workspace
  token. A copy of the token of a workspace that another member owns
  keeps the runner connection, the git credential route, and the agent
  tools after the member who copied it is removed from the org or
  suspended. So that member can get the credentials and the GitHub tokens
  of later turns (decision 124). With a newer runner, these credentials
  are turn tokens. With an older runner, they are the agent logins
  themselves.
- A suspension revokes the workspace tokens of the workspaces that the
  suspended user owns. It revokes no token of another member's workspace,
  as
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  says.

### A sandbox with a newer runner

- A sandbox with a newer runner holds no agent login. The
  [model gateway](model-gateway.md) keeps each login in the Worker, and
  adds it to each model request of a turn (decision 120).
  [No login in the sandbox](model-gateway.md#no-login-in-the-sandbox)
  gives the approaches that were rejected.
- No process in such a sandbox can get a login when it connects as an
  older runner. The workspace refuses a runner below the version of its
  org image, as [The agent runner](agent-runner.md#the-agent-runner) says
  (gateway decision 5).
- Risk: while a turn runs, each process in the sandbox can read its turn
  token. A member with a terminal in the sandbox can read it too.
- Such a process or member can spend the login of the starter through the
  gateway while the turn runs. A copy of the token works in the same way
  outside the sandbox. A request that still runs at the end of the turn
  stops within 30 seconds, as [Streams](model-gateway.md#streams) says.
- The token works only on the model routes of the gateway.
  [The turn token](model-gateway.md#the-turn-token) states when it works.
  It never gives the login itself.
- Risk: a process that keeps running in the sandbox can also get the turn
  token of each later turn while that turn runs. This holds also for the
  turns of other starters. Examples of such a process are a server that a
  tool started, and a program that the startup script started. It can
  read each token from the runner, which holds the token while its turn
  runs.
- So the members of one org trust each other with the use of their logins
  while their turns run. The share setting does not keep a turn token away
  from them. No other member and no process in the sandbox can get the
  login itself.

### A sandbox with an older runner

- An older runner gets the agent login itself with each turn (gateway
  decision 2).
- Reason: an older runner cannot use a turn token, and a sandbox keeps the
  runner of its org image. A refusal of each turn of an older runner was
  rejected, because each workspace with an older runner would then lose
  its agent turns.
- No process that the agent starts inherits the login of its turn. The
  login is not in the environment, the arguments, or an inherited open file
  of such a process. The agent program writes no copy of the login to disk.
  So a dev server that a tool starts gets no copy of the login (decision
  114).
- Reason: a server that a tool starts can run for days after its turn.
  Stopping every program of the agent at the end of each turn was rejected,
  because it also stops the servers behind port previews. The Claude
  program's setting that removes the login from tool processes was rejected,
  because it runs each tool command in isolation.
- Risk: a member with a terminal in the same sandbox can read the login of
  the turn that runs now. Every other process of the same sandbox user can
  read it too, such as a tool of the agent or a server that the startup
  script started.
- Risk: such a process can copy the login while the turn runs, and use the
  copy after the turn. The rule against inheritance stops only the
  automatic copy into new processes.
- Risk: the `.claude/settings.json` file of the repository can set the
  address of the model requests of Claude. The agent program then sends
  the real login of the starter to that address.
- With a change of that file, a commit, the agent, or other code in the
  sandbox can send the login to any host. A newer runner closes this path,
  as
  [No login in the sandbox](model-gateway.md#no-login-in-the-sandbox) says.
- So the members of one org trust each other with their logins, also after
  a turn ends. The share setting does not keep a login away from them.

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

[GitHub tokens](github-tokens.md) states the rules for Git, the GitHub CLI,
and repository copies in image builds and refreshes.
The GitHub CLI works outside an agent turn with the workspace owner's account.

## Agent logins

- A user connects Claude with a subscription token from
  `claude setup-token`, or with an Anthropic API key (decisions 24 and 37).
- A user connects Codex with an OpenAI API key. The app offers no ChatGPT
  plan sign-in, because OpenAI allows it for hosted apps only after a
  waitlist.
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
  [Agent logins in a sandbox](#agent-logins-in-a-sandbox) says. The GitHub
  token of a turn still belongs to its sender, as
  [GitHub tokens](#github-tokens) says.
