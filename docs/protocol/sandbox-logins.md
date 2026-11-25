# Agent logins in a sandbox

This doc holds the requirements and the decisions in force for the agent
logins in a sandbox. It covers the login of each turn, the turn token, the
runner checks, and the risks of the logins and the tokens in a sandbox. It
belongs to [Isolation of orgs and sandboxes](isolation.md), which covers
the checks that keep the orgs apart.
[The share setting](share-setting.md) states when the messages of other
members can run on a personal login. [Agent logins](agent-logins.md)
states how users connect the logins. The terms are those of the
[architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A gateway
decision number names a decision of the change that adds the
[model gateway](model-gateway.md), as that doc says. An own endpoint
decision number names a decision of the change that adds the own endpoint
logins, as [Tokens and secrets](tokens-and-secrets.md) says. An org login
decision number names a decision of the change that adds the org logins,
as that doc also says.

## The login of each turn

- Each session runs on its login: the personal login of its starter, or
  the org login of its org, as [Agents](agents-and-sessions.md#agents)
  says. Each turn of the session uses that login, whoever sends its
  messages.
- The GitHub token of a turn and its Mac requests still follow its sender,
  as [Git and the GitHub CLI](github-tokens.md#git-and-the-github-cli)
  and [Mac command requests](mac-command-requests.md) say.
- An automation run uses the default login and the GitHub token of its
  owner while no person watches. Its sandbox follows the same rules below.
  [Risks that stay open](automation-risks.md#risks-that-stay-open) states
  the risks of automations.
- With each turn, the agent runner gets a turn token for the login of its
  session, over its connection to the Durable Object. Reason: the sandbox
  gets its secrets only at a start, and the sessions of one sandbox can
  run on different logins.
- No agent login reaches a sandbox, whatever the version pin of its
  workspace (decision 120). This holds for the org login too. The
  [model gateway](model-gateway.md) adds the login of the session to each
  model request of the turn.
- The runner follows the [sandbox software update rules](sandbox-software.md#updates).
  A workspace accepts only a runner of a supported protocol version, as
  [Runner versions](version-pins.md#runner-versions) says.
- An own endpoint login never reaches a sandbox, also when it is the org
  login. The gateway keeps its address and its key in the Worker (gateway
  decision 10).
- Before a turn or a later message reaches a runner, the app checks
  that the runner can use its login kind (decision 174).
- A ChatGPT turn needs a runner that declares support for that sign-in.
  An earlier runner of version 2 does not declare it.
- A runner that cannot use the login gets no turn or message command
  and no credential. The turn fails once with a recovery cause.
- The cause offers a new workspace after an admin rebuilds the org
  image, or an OpenAI API key. A reconnect does not send the failed turn again.
- On a personal login, the workspace gives the credential of a turn to the
  runner only while the starter is a member of the org.
- A session on the org login serves each member of the org, also after its
  starter leaves the org. Reason: the org login belongs to the org, not to
  the starter.
- [Messages](messages-and-attachments.md#messages) says what a message
  does when the login of its session cannot be used.
- The org login has no share setting. Each message of a member of the org
  in a session on the org login runs on it.
- Each personal login has a share setting (decision 116).
  [The share setting](share-setting.md) states when the messages of other
  members can run on that login, and its default, its checks, and its
  risks.
- The workspace checks the login of the session when it accepts each
  message. It checks it again before it gives the credential of the turn
  to the runner.
- A message of a sender who left the org never reaches the agent, also
  while the login of the session works.
- The session record shows whether the login of the session can be used,
  and whether the starter shares a personal login. It holds no part of the
  login.
- A record that names the host of an own endpoint was rejected, because
  the members of an org trust each other with their logins (own endpoint
  decision 5).
- On a ChatGPT turn, the rules of the signed-in ChatGPT workspace
  apply to Codex (decisions 173 and 175).
- Risk: hooks and MCP commands from those rules run in the sandbox of
  the org. Its members trust that ChatGPT workspace admin with their code
  and the credentials that the sandbox can reach.
- Risk: each member of the org spends the org login in each session on it.
  The account of its key or of its endpoint pays, as
  [Risks](org-logins.md#risks) says (org login decision 1 B).
- Risk: while a turn runs, each process in the sandbox can get the
  sender's GitHub App user token. Each member with a terminal there can
  get it too, for example with `git credential fill`. A copied token keeps
  working after the turn until it expires. It also reaches the
  repositories of that person outside the org (decision 121).
- Risk: each member with a terminal in a sandbox can read its workspace
  token. A copy of the token of a workspace that another member owns
  keeps the runner connection, the git credential route, and the agent
  tools after the member who copied it is removed from the org or
  suspended. So that member can get the turn tokens and the GitHub tokens
  of later turns (decision 124).
- A suspension revokes the workspace tokens of the workspaces that the
  suspended user owns. It revokes no token of another member's workspace,
  as
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  says.

## Turn tokens in a sandbox

[Turn tokens in a sandbox](version-pins.md#turn-tokens-in-a-sandbox)
states the login rules and the risks of the turn token in a sandbox.
[Version pins](version-pins.md) also states which runner version a
workspace accepts, and its version pin.
