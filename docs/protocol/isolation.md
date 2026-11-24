# Isolation of orgs and sandboxes

This doc holds the requirements and the decisions in force for the isolation
of orgs and sandboxes. It covers the checks that keep the orgs apart, the
app's Boat and E2B keys, what a sandbox holds, what its workspace tools
reach, and the agent logins and the turn tokens in a sandbox. Linked pages
cover [the share setting](share-setting.md) of a personal login, and
[the version pins](version-pins.md) with the risks of the turn token. It
belongs to [Access and security](access-and-security.md), which covers
sign-in, the gates of the Worker, the request bodies, and the content
security policy.
The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A gateway
decision number names a decision of the change that adds the
[model gateway](model-gateway.md), as that doc says. An own endpoint
decision number names a decision of the change that adds the own endpoint
logins, as [Tokens and secrets](tokens-and-secrets.md) says. An org login
decision number names a decision of the change that adds the org logins,
as that doc also says. A secrets decision number names a decision of the
change that adds [secrets](secrets.md), as that doc says. An e2b decision
number names a decision of the change that adds E2B as the second
[sandbox provider](workspaces-and-sandboxes.md#the-provider), as that doc
says.

## Orgs and workspaces

- The key of each provider account reaches the sandboxes and the saved
  snapshots of all orgs on that account (decision 80). So no key keeps the
  orgs apart. The checks in this section do.
- A request reaches an org, its workspaces, and their sandboxes only for a
  member of that org.
- An org login serves only the members of its org, in the workspaces of
  that org, as [Org logins](org-logins.md) says.
- The workspace token of a sandbox reaches the workspaces of its own org
  through the agent tools, as
  [What the workspace tools reach](#what-the-workspace-tools-reach) says.
- An operator is the one exception. An operator can suspend or lift any
  user or org, as [Operator actions](operator-actions.md) says. An
  operator can also switch any org to another provider account, as
  [Switch account](switch-account.md) says. In the
  [operator section](operator-section.md#what-the-section-shows), an
  operator also reads counts, names, IDs, dates, roles, states, and codes
  across every org (decisions 142, 144, 147, and 160). An operator also
  reads the provider account of each org (e2b decision 221), and the
  number and the states of its own computers, as
  [Orgs and Users](operator-section.md#orgs-and-users) says.
- The operator section shows no chat, file, env value, agent login, or
  email address. Its org search takes the ID of a cloud computer or a
  preview address only to find its org.
- An open tab loses its workspace connection within 30 seconds after its
  user loses access: a removal from the org, a sign-out, or a deleted
  org (decision 70). The workspace checks the access of its open tabs
  again at most every 30 seconds, and closes each tab that fails. A
  [suspension](operator-actions.md#sessions-and-sign-in) of the user ends
  that access too.
- A runner connection gets no turn token after its workspace token is
  revoked. The workspace checks the token again before it sends each one.
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  states the checks of an open runner connection.
- No request names a sandbox or a saved snapshot. The Worker takes each
  one from its own records, and only from the records of an org that the
  request may reach.
- One R2 bucket holds the uploaded files of all orgs (decision 132). So the
  bucket does not keep the orgs apart. The checks in this section do.
- Only the Worker reads and writes that bucket. A cloud computer gets each
  file from a route of the Worker, as
  [The transfer](attachment-transfers.md#the-transfer) says.
- Each upload names one workspace, or the first message of a new workspace
  of one org (decision 132). Only a message of the uploader in that
  workspace, or that first message, can use the file.
- The Worker refuses a message or a create that names a file that it cannot
  use, with HTTP 404 and the error code `attachment_not_found`. A deleted
  file gets the same refusal.
- Before each sandbox call, the Worker checks in its records that the
  sandbox belongs to a workspace or a build of that org. This holds for
  each operation of the host connection and of the computer connection.
- An own computer serves one org. Before each call to it, the Worker checks
  that the computer belongs to the org of the workspace or the build.
- The Worker calls only a fixed list of routes of each provider. It has
  no general pass-through to a provider.
- The host connection and the computer connection also carry only fixed
  operations, with no general pass-through, as
  [Operations](host-connection.md#operations) and
  [The computer connection](own-computers.md#the-computer-connection)
  say.
- The Worker gives the token of an attachment download only to the sandbox
  that the workspace of the file names. The token gives only that one
  file, as [Hostnames and gates](access-and-security.md#hostnames-and-gates)
  says.
- Lifecycle, saved snapshot, file metadata, and error replies can contain
  at most 1 MiB, or 1,048,576 bytes (decision 84).
- A successful command reply can contain at most 18 MiB, or 18,874,368
  bytes. The limit includes the whole body of the reply.
- These limits hold for the replies of a provider, of the computer
  connection, and of the host connection.
- A reply above these budgets gets HTTP 502, even when the provider
  permits it. For a command reply, the error says "The command output is
  too large."
- [Orgs and members](orgs-and-members.md#members-and-roles) states the
  rules of each role.

## The app's Boat key

[The app's Boat key](provider-keys.md#the-apps-boat-key) holds these
requirements.

## The app's E2B key

[The app's E2B key](provider-keys.md#the-apps-e2b-key) holds these
requirements.

## What a sandbox holds

- A sandbox gets none of the secrets of the app's provider accounts. On
  Boat, every sandbox starts with Boat's `noEnv` setting for that reason.
- At a start, a sandbox gets only three secrets: its workspace token, its
  [machine token](host-connection.md#the-machine-token), and the env vars
  of its org.
- The sandbox gets them at create and at each resume. A changed secret
  applies at the next start.
- The restart of an archived sandbox near day 14 gets only its machine
  token, as [Stop and resume](workspace-life.md#stop-and-resume) says. A
  brief start of the
  [migration job](host-connection-migration.md#brief-starts) gets only its
  machine token too.
- No saved snapshot holds these secrets. Builds and refreshes get only a
  machine token.
- On an own computer, root on the server can read each of these secrets,
  as [Risks](own-computers.md#risks) says.
- A saved snapshot on E2B keeps only the disk of its sandbox, never its
  memory. Reason: the memory of a build can hold a secret, such as the
  token of a repository copy.
- The software image holds no org data and no secret, because every org
  uses it. Its build sandbox starts with only one secret: its machine
  token. It gets no env var of any org and no repository.
- The machine token of a software image build stays in the memory of its
  sandbox, so the software image does not hold it. The token stops
  working at the delete of that sandbox.
- A sandbox gets no agent login at a start.
  [Agent logins in a sandbox](#agent-logins-in-a-sandbox) says how each
  turn uses an agent login.
- A sandbox gets no value of a [secret](secrets.md) at a start. The value
  of a secret reaches it only in the reply to a run call that a grant
  allows, while the turn of that call runs (secrets decision 1 B). Builds
  and refreshes make no run call.
- GitHub access reaches a workspace sandbox only through the git credential
  helper.
- A build sandbox gets GitHub access only for the Git command that copies
  each repository, as [GitHub tokens](tokens-and-secrets.md#github-tokens) says (decision 90).

## What the workspace tools reach

- The calls of the [workspace tools](agent-tools.md#workspace-tools) of a
  sandbox reach each workspace of its org, and no workspace of another org
  (decisions 257 and 277). [Reach](agent-tool-access.md#reach) gives the
  reasons and the smaller reaches that were rejected.
- Risk: every process in a sandbox can read its workspace token, and so can
  every member with a terminal there. With the token, such a process can
  read every chat of the org at any time, also between turns. It can also
  read each workspace, session, and message of the org, and list the
  previews of each workspace.
- Risk: a copy of the token keeps these reads after the member who copied
  it leaves the org or is suspended. The copy works until the token stops
  working, as
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  says.
- Risk: while a turn of its workspace runs, such a process can also start
  sessions and turns. It can do so in each workspace of the org that is
  not archived.
- Each such turn goes in the name of the sender of the running turn. It
  runs on the login of its session.
- Risk: such a message also starts the cloud computer of a workspace that
  does not run, as an open does. Each start counts toward the starts that
  the orgs of its provider account share.
- Risk: while a turn of its workspace runs, such a process can also
  rename, move, and archive workspaces, close and stop sessions, change the
  sections, and open and close previews in the whole org. It acts with the
  rights of the sender of the turn.
- So with a turn of an admin, such a process can archive each workspace of
  the org. Archive deletes the cloud computer of a workspace 14 days later.
  Until then, a member can restore the workspace, as
  [Restore](workspace-life.md#restore) says.
- Risk: a read gives each Mac command of a session with its output, as a
  copy does. So sandbox code in each workspace of the org can read output
  from the Mac of a member.
- With the token, such a process can also list the names and the
  descriptions of the secrets of the org. The list gives no value.
- Risk: while a turn of its workspace runs, such a process can also make a
  run call in the name of that turn. It then gets the value of each secret
  that the session of that turn may use, with no request.
- Risk: a turn that such a process starts through the session calls uses
  the grants of its workspace and its session with no request
  (secrets decision 5 C). [Secrets](secrets.md#turns-that-no-person-started)
  states this risk.

## Agent logins in a sandbox

- Each session runs on its login: the personal login of its starter, or
  the org login of its org, as [Agents](agents-and-sessions.md#agents)
  says. Each turn of the session uses that login, whoever sends its
  messages.
- The GitHub token of a turn and its Mac requests still follow its sender,
  as [GitHub tokens](tokens-and-secrets.md#github-tokens) and
  [Mac commands](agent-tools.md#mac-commands) say.
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

### Turn tokens in a sandbox

[Turn tokens in a sandbox](version-pins.md#turn-tokens-in-a-sandbox)
states the login rules and the risks of the turn token in a sandbox.
[Version pins](version-pins.md) also states which runner version a
workspace accepts, and its version pin.
