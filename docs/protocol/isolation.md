# Isolation of orgs and sandboxes

This doc holds the requirements and the decisions in force for the isolation
of orgs and sandboxes. It covers the checks that keep the orgs apart, the
app's Boat key, what a sandbox holds, and the agent logins and the turn
tokens in a sandbox. It belongs to
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
- A sandbox gets no agent login at a start. The next section says how
  each turn uses an agent login.
- GitHub access reaches a workspace sandbox only through the git credential
  helper.
- A build sandbox gets GitHub access only for the Git command that copies
  each repository, as [GitHub tokens](tokens-and-secrets.md#github-tokens) says (decision 90).

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
  older runner gets the agent login itself. This rule holds for each
  runner connection.
- The version pin of a workspace is the lowest runner protocol version that
  it accepts. The workspace takes the pin from the org image that its
  cloud computer starts from. A stop and a resume keep the pin. A
  workspace or an org image with no recorded version counts as version 1.
  The version pin of a sandbox is the version pin of its workspace.
- The version pin decides whether an agent login can reach a sandbox. A
  runner connection does not change the version pin. So a newer runner
  does not keep the agent logins out of a sandbox with a version pin of 1.
  The two sections below give the rules and the risks of each version pin.
- The workspace gives the credential of a turn to the runner only while
  the starter is a member of the org.
  [Messages](messages-and-attachments.md#messages) says what a message of another
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

- A sandbox with a version pin of 2 or later holds no agent login. The
  [model gateway](model-gateway.md) keeps each login in the Worker, and
  adds it to each model request of a turn (decision 120).
  [No login in the sandbox](model-gateway.md#no-login-in-the-sandbox)
  gives the approaches that were rejected.
- No process in such a sandbox can get a login when it connects as an
  older runner. The workspace refuses a runner below its version pin, as
  [The agent runner](agent-runner.md#the-agent-runner) says (gateway
  decision 5).
- Risk: while a turn runs, each process in the sandbox can read its turn
  token. A member with a terminal in the sandbox can read it too.
- Claude reads the token from a file that only the sandbox user can read.
  Each process of the sandbox runs as that user, so it can read the file
  (gateway decision 11).
- Such a process or member can spend the login of the starter through the
  gateway while the turn runs. A copy of the token works in the same way
  outside the sandbox. A request that still runs at the end of the turn
  stops within 30 seconds, as [Streams](model-gateway.md#streams) says.
- The token works only on the model routes of the gateway.
  [The turn token](model-gateway.md#the-turn-token) states when it works.
  It never gives the login itself.
- Risk: a settings file in the repository, such as `.claude/settings.json`,
  can set the address of the model requests of Claude. Claude then sends
  each model request, with its content and the turn token, to that
  address. A commit, the agent, or other code in the sandbox can change
  that file (gateway decision 11).
- Risk: a process that keeps running in the sandbox can also get the turn
  token of each later turn while that turn runs. This holds also for the
  turns of other starters. Examples of such a process are a server that a
  tool started, and a program that the startup script started. It can
  read each token from the runner, or from the file of Claude, while that
  turn runs.
- So the members of one org trust each other with the use of their logins
  while their turns run. The share setting does not keep a turn token away
  from them. No other member and no process in the sandbox can get the
  login itself.

### A sandbox with a version pin of 1

- The workspace of a sandbox with a version pin of 1 accepts an older
  runner and a newer runner. An older runner gets the agent login itself
  with each turn (gateway decision 2).
- Reason: an older runner cannot use a turn token, and a sandbox keeps the
  runner of its org image. A refusal of each turn of an older runner was
  rejected, because each workspace with an older runner would then lose
  its agent turns.
- A newer runner in such a sandbox gets a turn token for each of its
  turns. The turn token risks of
  [A sandbox with a version pin of 2 or later](#a-sandbox-with-a-version-pin-of-2-or-later)
  then apply to those turns.
- A newer runner does not keep the agent logins out of such a sandbox.
  Any process with the workspace token can still connect as an older
  runner, and then get the agent logins of later turns.
- The login rules and risks below apply to turns that use an older
  runner.
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
  sandbox can send the login to any host. On a newer runner, this path
  gives only a turn token, as
  [How the agents reach the gateway](model-gateway.md#how-the-agents-reach-the-gateway)
  says.
- So the members of one org trust each other with their logins, also after
  a turn ends. The share setting does not keep a login away from them.
