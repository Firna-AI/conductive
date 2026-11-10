# Isolation of orgs and sandboxes

This doc holds the requirements and the decisions in force for the isolation
of orgs and sandboxes. It covers the checks that keep the orgs apart, the
app's Boat key, what a sandbox holds, and the agent logins in a sandbox. It
belongs to [Access and security](access-and-security.md), which covers
sign-in, the gates of the Worker, the request bodies, and the content
security policy. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

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
- A runner connection gets no agent login after its workspace token is
  revoked. The workspace checks the token again before each login.
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

## What a sandbox holds

- Every sandbox starts with Boat's `noEnv` setting, so it gets none of the
  secrets of the app's Boat account.
- At a start, a sandbox gets only two secrets: its workspace token and the
  env vars of its org.
- The sandbox gets them at create and at each resume. A changed secret
  applies at the next start.
- No saved snapshot holds these secrets. Builds and refreshes get none of
  them.
- A sandbox gets no agent login at a start. The next section says how a
  turn gets its login.
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
- With each turn, the agent runner gets the login of the starter over its
  connection to the Durable Object. Reason: the sandbox gets its secrets
  only at a start, and the sessions of one sandbox can have different
  starters.
- The workspace gives the login of a starter to the runner only while the
  starter is a member of the org.
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
  again before it gives the login to the runner. So a waiting message of
  another member never runs on a login that its owner stopped sharing.
- A message of a sender who left the org never reaches the agent, also
  while the login of the starter works.
- The session record shows whether the login of its starter can be used,
  and whether the starter shares it. It holds no part of the login.
- The runner never writes a login to disk.
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
- Risk: while the starter shares the login, the other members of a session
  spend it. Anthropic's rules for hosted products ask each end user to sign
  in with their own credentials. So a shared Claude subscription stays a
  risk (decisions 105 and 116).
- Risk: a member with a terminal in the same sandbox can read the login of
  the turn that runs now. Every other process of the same sandbox user can
  read it too, such as a tool of the agent or a server that the startup
  script started.
- Risk: such a process can copy the login while the turn runs, and use the
  copy after the turn. The rule against inheritance stops only the
  automatic copy into new processes.
- So the members of one org trust each other with their logins, also after
  a turn ends. The share setting does not keep a login away from them. A
  proxy that keeps every login out of the sandbox was rejected, because it
  is a much larger build.
- Risk: while a turn runs, each process in the sandbox can get the
  sender's GitHub App user token. Each member with a terminal there can
  get it too, for example with `git credential fill`. A copied token keeps
  working after the turn until it expires. It also reaches the
  repositories of that person outside the org (decision 121).
- Risk: each member with a terminal in a sandbox can read its workspace
  token. A copy of the token of a workspace that another member owns
  keeps the runner connection, the git credential route, and the agent
  tools after the member who copied it is removed from the org or
  suspended. So that member can get the agent logins and the GitHub tokens
  of later turns (decision 124).
- A suspension revokes the workspace tokens of the workspaces that the
  suspended user owns. It revokes no token of another member's workspace,
  as
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  says.
