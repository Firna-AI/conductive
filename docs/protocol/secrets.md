# Secrets

This doc holds the requirements and the decisions in force for the secrets
of an org. A secret is a named value that agents use in one command at a
time, after a member allows it. This doc covers the secrets and their
storage, the Secrets tab, the rights of each role, Reveal, the mark for all
agents, the grants, Capabilities with Mac access, routine runs, and the
risks that stay. [Secret requests](secret-requests.md) covers the two calls
of the workspace tools, the requests and their time limit, late answers,
temporary values, and what the chat shows. This doc belongs to
[Tokens and secrets](tokens-and-secrets.md). The
[mockup catalogue](../mockups/catalogue-secrets.md) draws each screen. The
terms are those of the [architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number, such as secrets decision 3, names the dated record of one
decision of the change that adds secrets. Its plan keeps these records
while the change is open. Its pull request keeps them after the merge.

## Terms

- **Secret:** a value of the Secrets tab of the org settings, with its
  name, its description, its creator, and the mark for all agents.
- **Run:** one command that a workspace tool starts with the values of one
  or more secrets.
- **Grant:** what lets a session use a secret with no request: the mark for
  all agents, a pre-approval, a session approval, or a temporary value.
- **Pre-approval:** a grant of one workspace. Each session of the workspace
  can use that secret.
- **Session approval:** a grant of one session, from Allow for this session
  on a request.
- **Temporary value:** a value that a member types for a name that the org
  has no secret for, as
  [Temporary values](secret-requests.md#temporary-values) says.
- **Request:** the question that a run asks for the names that no grant
  covers. A member answers it.

## Secrets and env vars

- An org keeps two lists of values: the env vars of the Cloud computer
  tab, and the secrets.
- Every sandbox of the org gets each env var at each start, with no
  approval, as
  [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  says.
- The value of a secret reaches a sandbox only for a run that a grant
  allows.
- The two lists stay separate. One list was rejected, because it would
  change who may change a value (decision 57) and what the Secret mark
  does (decision 133).
- The Secrets tab says when to use the env vars: for values that every
  cloud computer needs at each start. It links to the Cloud computer tab.
- Both features keep the word "secret" (secrets decision 12 A). The Secret
  mark of an env var only hides its value on screens. An env var with that
  mark is not a secret of this doc.
- A new word for the mark, such as "Hide on screen", and the name "Agent
  secrets" for the secrets were rejected for now.
- No action moves an env var into the secrets. An admin adds the value to
  the Secrets tab again. Reason: the value of an env var is write-only,
  and the env var list stays separate.

## How an agent uses a secret

- The Worker returns the values of a run only to the workspace tool that
  made the run call. The tool starts one command with each value in its
  environment, under the name of its secret. It puts the value nowhere
  else (secrets decision 1 B).
- The agent and the model see only the names of the secrets. No reply of
  the workspace tools holds a value.
- Reason: the value then stays out of the model, the agent session log,
  and the chat in normal use. Each program can read the value from its
  environment, as it reads an env var.
- A call that gives the value to the agent was rejected, because the value
  then reaches the model provider, the agent session log, and the chat.
- An HTTPS request that the Worker sends for the agent was rejected,
  because only a request that the agent builds itself could then use a
  secret.
- A secrets gateway in the Worker, with a placeholder and an allowed host
  for each secret, was rejected for now. It keeps the value out of the
  cloud computer, but database URLs, SSH keys, and signed cloud keys
  cannot use it. It stays the wider fix.

## Storage

- The app stores the value of each secret encrypted, as it stores the env
  var values.
- Each secret belongs to one org. One name names at most one secret of an
  org.
- A pre-approval and a session approval belong to their secret, not to
  its name. A deleted secret ends each of its grants. So a new secret with
  the name of a deleted one has no grant.

## The Secrets tab

- The org settings have a Secrets tab after the Cloud computer tab. Every
  member can open it.
- Each row shows the name, the description, the member who added the
  secret, and the record of its last reveal. Every member sees that
  record.
- The list never holds a value. Each value shows as dots.
- Add secret takes a name, a description, and a value. The form of an
  admin also has the switch for all agents, which starts off.
- In a suspended org, the tab shows no action, also no Reveal. The Worker
  refuses each change there, as
  [What members of a suspended org keep](operator-actions.md#what-members-of-a-suspended-org-keep)
  says.

## Rights

- Every member adds secrets and uses each secret of the org
  (secrets decision 3 B).
- A member replaces or deletes only the secrets that the member added. An
  admin replaces and deletes each secret.
- Only an admin sets or clears the mark for all agents.
- Reason: a member who could change or mark each secret could send the
  agents of other members to an account that the member controls. Changes
  by every member were rejected for that reason.
- Secrets that only admins add and change were rejected, because the task
  makes secrets available to all members.
- Replace takes a new description, a new value, or both. An empty value
  keeps the current value. Reason: Replace is the right to change a
  secret, and a wrong description misleads the members who answer.
- Delete asks first, because the value cannot come back and each grant of
  the secret ends.
- The Worker checks these rights. A change that the member may not make
  gets a refusal, and nothing changes.
- [Members and roles](orgs-and-members.md#members-and-roles) states the
  other rights of each role.

## Reveal

- An admin reveals the value of one secret at a time (secrets decision
  2 A). The Worker then returns that value only.
- A member who is not an admin never gets a value back, also of a secret
  that the member added.
- The app records each reveal with the admin and the time. The row of the
  secret shows the last reveal.
- A revealed value shows on its own line, with Copy and Hide.
- Reason: the task asks that admins can view values. Values that stay
  write-only for each person, as the env var values are, were rejected for
  that reason.

## The mark for all agents

- A secret that an admin marks for all agents serves each session of the
  org with no request.
- Only admins see the switch of the mark. It starts off, and it saves each
  change at once. A member sees the mark as words.
- A temporary value that a member saves as a secret starts without the
  mark, because only admins set it.

## Grants

- A run uses a secret with no request when one of these grants covers its
  session:
  - the mark for all agents
  - a pre-approval of its workspace
  - a session approval of its session
  - a temporary value for its session or for its workspace
- A pre-approval lasts as long as its workspace, also after Continue.
- A session approval lasts as long as its session, through each later
  turn and each sender.
- Reason: the task makes the session the unit of approval. An approval for
  one command only was rejected, because a process can name one command
  and run another.
- The person who creates a workspace in New workspace can pre-approve each
  secret of the org, as [Capabilities](#capabilities) says.
- A workspace that an agent creates with the workspace tools starts with
  no pre-approval. So does the run workspace of a routine. Reason: the
  task gives the pre-approval to a person who creates a workspace.
- Every member can remove each pre-approval, each session approval, and
  each value for this workspace in the Capabilities of the workspace
  (secrets decision 8 B).

## Capabilities

- New workspace has a small Capabilities icon, with its label on hover
  (secrets decision 6 G). It opens a control with two parts for now: the
  secrets to pre-approve, and Mac access.
- Reason: the icon keeps the page and the dialog plain, and later
  features, such as MCP servers, add their parts to the same control. A
  separate picker of secrets in New workspace was rejected for that
  reason.
- The create takes the choices of the control, as
  [The create](create-a-workspace.md#the-create) says.
- Each workspace shows the same icon beside its message box
  (secrets decision 8 B). Every member can see and change the
  pre-approvals and Mac access there.
- In a workspace, the control also lists each session approval, with its
  session, the member who allowed it, and the time. It lists each value
  for this workspace, with the member who gave it. Each of them has
  Remove.
- A value for 15 minutes is not in the list. It ends by itself.
- A secret for all agents shows as checked, with the words "All agents",
  and its checkbox does not change. The control links to the Secrets tab,
  or to Add a secret when the org has no secret.
- A change in the control applies to each session of the workspace from
  that moment.
- Reason: the control gives the undo of a wrong grant, and it keeps each
  capability of a workspace in one place. A control that only the
  workspace owner and the admins change was rejected, because every member
  can already allow a request in each session (secrets decision 4 B).

### Mac access

- Mac access is on in each new workspace, also in a workspace that an
  agent or a routine creates (secrets decision 9 A).
- Reason: the Mac app still asks before each command that its user did
  not always allow. So the switch only adds a stop, and each Mac still
  decides, as decision 62 says.
- While Mac access is off, the Worker refuses each Mac command request of
  the workspace, as [Mac commands](agent-tools.md#mac-commands) says.
- Mac access that starts off was rejected, in each new workspace and in a
  workspace that an agent or a routine creates. So was Mac access that a
  new workspace copies from the workspace that creates it. Reason: each
  of them adds a refusal to the behaviour of decision 62.
- A Mac access switch that each member keeps for each workspace was
  rejected, because one control would then have a shared part and a
  personal part.
- Risk: any member can turn Mac access on again after another member
  turned it off.
- Risk: an agent in a workspace with Mac access off can create a new
  workspace, where Mac access is on. The first turn there has the same
  sender, so its requests reach the Mac of that sender.
- Risk: a run workspace starts with Mac access on, and the routine owner
  sends its first turn. So text that steers the agent of a run can ask for
  a command on the Mac of the owner. A command that the owner always
  allowed then runs with no question, as
  [The choices](desktop-commands.md#the-choices) says.

## Turns that no person started

- A request in a routine run, or in a turn that an agent started, waits
  for a member as each other request does (secrets decision 5 C).
- Reason: the time limit of a request ends the wait of its tool call. So
  an unanswered request keeps no cloud computer awake, and the late
  request stays in the chat.
- A run that gets only the secrets for all agents, a picker of secrets on
  the routine form, and a record of whether a person started each turn
  were rejected.
- Risk: text from outside the org can steer such an agent, as
  [Risks that stay open](routines.md#risks-that-stay-open) says. The agent
  then uses the grants of its workspace and its session with no request.
- Risk: through the session calls, such an agent can also start turns in
  the other workspaces and sessions of the org. Those turns use the grants
  of their workspaces and their sessions with no request.

## Risks that stay

- Risk: a value is in the cloud computer while its command runs. Each
  process there, and each member with a terminal, can read it then.
- Risk: a command can write a value to a file, or print it in a changed
  form. So a member can learn a value that the settings hide from that
  member.
- Risk: each process in the cloud computer can make a run call in the name
  of a turn that runs now. It then gets the value of each secret that the
  session of that turn may use, with no request. A member with a terminal
  can do the same.
- Risk: the tools and the chat hide only exact copies of a value, as
  [The exact-copy filter](secret-requests.md#the-exact-copy-filter) says.
  So the agent can read a changed or encoded value, and its model provider
  then gets it.
- Risk: a file that holds a value stays on the disk of the cloud computer,
  as a file with an env var value does. Archive keeps that disk for 14
  days, as [Archive](workspace-life.md#archive) says.
