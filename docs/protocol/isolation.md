# Isolation of orgs and sandboxes

This doc holds the requirements and the decisions in force for the isolation
of orgs and sandboxes. It covers the checks that keep the orgs apart, the
app's Boat key, what a sandbox holds, what its session calls reach, and the
agent logins and the turn tokens in a sandbox. It belongs to
[Access and security](access-and-security.md), which covers sign-in, the
gates of the Worker, the request bodies, and the content security policy.
The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A gateway
decision number names a decision of the change that adds the
[model gateway](model-gateway.md), as that doc says.

## Orgs and workspaces

- One Boat key reaches the sandboxes and the saved snapshots of all orgs
  (decision 80). So the key does not keep the orgs apart. The checks in
  this section do.
- A request reaches an org, its workspaces, and their sandboxes only for a
  member of that org.
- The workspace token of a sandbox reaches the workspaces of its own org
  through the agent tools, as
  [What the session calls reach](#what-the-session-calls-reach) says.
- An operator is the one exception. An operator can suspend or lift any
  user or org, as [Operator actions](operator-actions.md) says. In the
  [operator section](operator-section.md#what-the-section-shows), an
  operator also reads counts, names, IDs, dates, roles, states, and codes
  across every org (decisions 142, 144, 147, and 160).
- The operator section shows no chat, file, env value, agent login, or
  email address. Its org search takes the ID of a cloud computer or a
  preview address only to find its org.
- An open tab loses its workspace connection within 30 seconds after its
  user loses access: a removal from the org, a sign-out, or a deleted
  org (decision 70). The workspace checks the access of its open tabs
  again at most every 30 seconds, and closes each tab that fails. A
  [suspension](operator-actions.md#sessions-and-sign-in) of the user ends
  that access too.
- A runner connection gets no agent login and no turn token after its
  workspace token is revoked. The workspace checks the token again before
  it sends each of them.
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  states the checks of an open runner connection.
- No request names a sandbox or a saved snapshot. The Worker takes each
  one from its own records, and only from the records of an org that the
  request may reach.
- One R2 bucket holds the uploaded files of all orgs (decision 132). So the
  bucket does not keep the orgs apart. The checks in this section do.
- Only the Worker reads and writes that bucket.
- Each upload names one workspace, or the first message of a new workspace
  of one org (decision 132). Only a message of the uploader in that
  workspace, or that first message, can use the file.
- The Worker refuses a message or a create that names a file that it cannot
  use, with HTTP 404 and the error code `attachment_not_found`. A deleted
  file gets the same refusal.
- Before each sandbox call, the Worker checks in its records that the
  sandbox belongs to a workspace or a build of that org.
- The Worker calls only a fixed list of Boat routes. It has no general
  pass-through to Boat.
- To copy an attachment, the Worker also sends the file to the upload
  address that Boat returns for that sandbox (decision 132). It sends the
  file only to that exact address.
- Lifecycle, saved snapshot, file metadata, and error replies from Boat
  can contain at most 1 MiB, or 1,048,576 bytes (decision 84).
- A successful command reply from Boat can contain at most 18 MiB, or
  18,874,368 bytes. The limit includes the whole JSON body.
- A reply above these budgets gets HTTP 502, even when Boat permits it.
  For a command reply, the error says "The command output is too large."
- [Orgs and members](orgs-and-members.md#members-and-roles) states the
  rules of each role.

## The app's Boat key

- One Boat key, the app's own, runs every sandbox and every org image
  (decision 80). The Worker holds it as a Worker secret.
- The key never goes to the browser, into a sandbox, into a log, or into
  a saved snapshot. Reason: the key reaches the sandboxes of every org.
- The key is limited to one Boat environment and to the actions that the
  app uses.
- The app's Boat account is a Boat organization of its own. It holds no
  other Boat work of the operator (decisions 5 and 80).
- Every Boat call names that organization. A Boat user can reach several
  organizations, so a change of the active one in Boat moves no work of
  the app.
- The deploy run never gets the key. It asks the Worker to build the
  [software image](org-image.md#the-software-image) with a token of its
  own.

## What a sandbox holds

- Every sandbox starts with Boat's `noEnv` setting, so it gets none of the
  secrets of the app's Boat account.
- At a start, a sandbox gets only two secrets: its workspace token and the
  env vars of its org.
- The sandbox gets them at create and at each resume. A changed secret
  applies at the next start.
- The restart of an archived sandbox near day 14 gets neither of them, as
  [Stop and resume](workspace-life.md#stop-and-resume) says.
- No saved snapshot holds these secrets. Builds and refreshes get none of
  them.
- The software image holds no org data and no secret, because every org
  uses it. Its build sandbox starts with no env var, no token, and no
  repository.
- A sandbox gets no agent login at a start.
  [Agent logins in a sandbox](#agent-logins-in-a-sandbox) says how each
  turn uses an agent login.
- GitHub access reaches a workspace sandbox only through the git credential
  helper.
- A build sandbox gets GitHub access only for the Git command that copies
  each repository, as [GitHub tokens](tokens-and-secrets.md#github-tokens) says (decision 90).

## What the session calls reach

- The [session calls](session-calls.md) of a sandbox reach each workspace
  of its org, and no workspace of another org (decision 257).
  [Reach](session-calls.md#reach) gives the reasons and the smaller reaches
  that were rejected.
- Risk: every process in a sandbox can read its workspace token, and so can
  every member with a terminal there. With the token, such a process can
  read every chat of the org at any time, also between turns.
- Risk: a copy of the token keeps that read after the member who copied it
  leaves the org or is suspended. The copy works until the token stops
  working, as
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  says.
- Risk: while a turn of its workspace runs, such a process can also start
  sessions and turns. It can do so in each workspace of the org that is
  not archived.
- Each such turn goes in the name of the sender of the running turn. It
  runs on the login of the starter of its session.
- Risk: such a message also starts the cloud computer of a workspace that
  does not run, as an open does. Each start counts toward the starts that
  all orgs share.
- Risk: a read gives each Mac command of a session with its output, as a
  copy does. So sandbox code in each workspace of the org can read output
  from the Mac of a member.

## Agent logins in a sandbox

- Each session runs on the agent login of its starter, the member who
  started the session (decision 105). Each turn of the session uses that
  login, whoever sends its messages.
- The GitHub token of a turn and its Mac requests still follow its sender,
  as [GitHub tokens](tokens-and-secrets.md#github-tokens) and
  [Mac commands](agent-tools.md#mac-commands) say.
- A routine run uses its owner's agent login and GitHub token while no
  person watches. Its sandbox follows the same version pin rules below.
  [Risks that stay open](routines.md#risks-that-stay-open) states the
  risks of routines.
- With each turn, the agent runner gets a credential of the starter over
  its connection to the Durable Object. Reason: the sandbox gets its
  secrets only at a start, and the sessions of one sandbox can have
  different starters.
- The runner of a sandbox comes from its org image. A newer runner has
  protocol version 2 or later. An older runner has protocol version 1.
  [The agent runner](agent-runner.md#the-agent-runner) states which runner
  versions a workspace accepts.
- A newer runner gets a turn token as the credential of each turn. An
  older runner gets a supported agent login itself. This rule holds for each
  runner connection.
- Before a turn or a later message reaches a runner, the app checks
  that the runner can use its login kind (decision 174).
- A ChatGPT turn needs a runner that declares support for that sign-in.
  An older runner, including an earlier version 2 runner, cannot use it.
- A runner that cannot use the login gets no turn or message command
  and no credential. The turn fails once with a recovery cause.
- The cause offers a new workspace after an admin rebuilds the org
  image, or an OpenAI API key. A reconnect does not send the failed turn again.
- A ChatGPT sign-in never reaches a sandbox, including one whose older
  runner can still receive other agent logins.
- The version pin of a workspace is the lowest runner protocol version that
  it accepts. The workspace takes the pin from the org image that its
  cloud computer starts from. A stop and a resume keep the pin. A
  workspace or an org image with no recorded version counts as version 1.
  The version pin of a sandbox is the version pin of its workspace.
- The version pin decides whether an agent login can reach a sandbox. A
  runner connection does not change the version pin. So a newer runner
  does not keep the agent logins out of a sandbox with a version pin of 1.
  [Version pins](version-pins.md) gives the rules and the risks of each
  version pin.
- The workspace gives the credential of a turn to the runner only while
  the starter is a member of the org.
  [Messages](messages-and-attachments.md#messages) says what a message of another
  member does when the login of the starter cannot be used.
- Each agent login has a share setting (decision 116). It says whether the
  messages of other members can run on that login.
- The kind of a login sets the default of its share setting. A new Claude
  subscription login does not let other members use it. A new ChatGPT
  sign-in does not let them use it either (decisions 171 and 175). A new API key lets
  them use it.
- Reason: Anthropic's consumer terms forbid making a Claude account
  available to anyone else. OpenAI's terms also forbid making an account
  available to anyone else. The owner of an API key may
  let a team use it. Sharing every login by default was rejected for these
  reasons.
- A replaced login keeps its share setting while its kind stays the same. A
  login whose kind changes gets the default of its new kind. Reason: a key
  rotation keeps the choice of its owner.
- The account page shows the share setting of each connected login. Its
  owner can change the setting there at any time.
- When the starter does not share the login, a message of another member
  starts a new session on that member's own login. A Try again of another
  member does the same. [Messages](messages-and-attachments.md#messages) states the
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
- On a ChatGPT turn, the rules of the signed-in ChatGPT workspace
  apply to Codex (decisions 173 and 175).
- Risk: hooks and MCP commands from those rules run in the sandbox of
  the org. Its members trust that ChatGPT workspace admin with their code
  and the credentials that the sandbox can reach.
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
  of later turns (decision 124). In a sandbox with a version pin of 2 or
  later, these credentials are turn tokens. In a sandbox with a version
  pin of 1, they can be the agent logins themselves, because that member
  can connect as an older runner.
- A suspension revokes the workspace tokens of the workspaces that the
  suspended user owns. It revokes no token of another member's workspace,
  as
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  says.

### A sandbox with a version pin of 2 or later

[A sandbox with a version pin of 2 or later](version-pins.md#a-sandbox-with-a-version-pin-of-2-or-later)
states the login rules and the risks of such a sandbox.

### A sandbox with a version pin of 1

[A sandbox with a version pin of 1](version-pins.md#a-sandbox-with-a-version-pin-of-1)
states the login rules and the risks of such a sandbox.
