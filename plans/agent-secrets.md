# Agent secrets

Status: Active. On branch `calummoore/quito-0ojg`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today an admin saves org env vars in the org settings, and every cloud
computer gets all of them at each start, with no approval. Cal asked on
13 November 2026 for a new kind of value, a secret. An agent asks to use a
secret through a new call of the workspace tools. Each session must get an
approval for each secret, unless the person who created the workspace
pre-approved it, or the secret is marked as available to all agents.
Every member and admin manages secrets in a settings screen. Admins can
view values. Members see each secret with its value hidden, also a secret
that they created. Later on the same day, Cal added temporary requests: an
agent can ask for a secret that no one stored, and the person who answers
gives a value for one use or saves it as a new secret. Cal then added a
time limit: a request that a tool call makes waits only for a limited
time. After that time, the request stays in the chat as a widget that a
member answers later. That answer sends a message to the agent, which
says that the secret is now available.

The chosen approach is secrets decision 1 B. A value goes only into one
command that the CLI starts. The agent and the model see only the name of
the secret. This change does not touch the org env vars, and it does not
keep a value out of the cloud computer. The brainstorm notes are in
`.context/secrets/brainstorm.md`.

Contract owners:

- A new protocol doc, `docs/protocol/secrets.md`, which belongs to
  [Tokens and secrets](../docs/protocol/tokens-and-secrets.md).
- [Agent tools](../docs/protocol/agent-tools.md) and
  [Agent tool access](../docs/protocol/agent-tool-access.md).
- [Isolation](../docs/protocol/isolation.md#what-a-sandbox-holds).
- [Create a workspace](../docs/protocol/create-a-workspace.md).
- [Orgs and members](../docs/protocol/orgs-and-members.md#members-and-roles).
- The [tools README](../tools/README.md) and [calls](../tools/calls.md).
- The [Worker tools README](../worker/tools/README.md).
- The [migrations README](../migrations/README.md).

## Design

The milestones below follow this design. Each line marked "my call" is a
design call of 13 November 2026 under the decision test of the
`decisions-and-findings` skill.

- Storage. A new table holds each secret of an org: an ID, the org, a
  name, a description, the value encrypted as the env var values are,
  the creator, the mark for all agents, and the dates. Each secret is
  its own record, bound to its org. My call: the rights and the marks of
  each secret need their own fields.
- Grants. A table of the pre-approvals of each workspace and a table of
  the approvals of each session. A deleted secret ends each of its grants.
  My call: an approval belongs to the secret, not to its name.
- An approval lasts for its session, through each later turn and sender.
  A pre-approval lasts for its workspace, also after Continue. My call:
  the task makes the session the unit of approval.
- Tool calls. The MCP server and the CLI both get two calls: list the
  secrets, and run a command with secrets. CLI: `conductive secrets list`
  and `conductive secrets run --secret NAME [--reason TEXT] -- <command>`.
  MCP: `list_secrets` and `run_with_secrets`. My call: both tools give
  each call, and decision 278 sets the names.
- The list call is a read. It gives each name, description, and whether
  the calling session may use it. It never gives a value. My call: a read
  gives data that each member already sees.
- The run call is a write. It names its turn. The Worker finds the
  session from its own record of that turn. When the session may not use
  a secret, the Worker makes a request and the call waits for its answer,
  up to the time limit of a request. After approval, the Worker returns
  the values to the CLI. The CLI starts
  the command with the values in its environment, and nowhere else. My
  call: secrets decision 1 B chose one command.
- The MCP call runs the command in the process of the MCP server and
  returns its output, because an MCP server cannot reach the shell of
  the agent. The CLI keeps the standard input and output of the agent.
- The CLI and the MCP server hide each exact copy of a value in the
  output of the command. The Durable Object also adds each value that a
  run used to its exact-copy filter. My call: the filter costs little and
  catches a value that reaches the chat by mistake.
- A request names one or more secrets and the reason of the agent. One
  answer covers the request. The card shows each name, description, and
  the reason, never a value. My call: one task then shows one card, as a
  Mac command request shows its reason.
- While the tool call waits, the request shows as a card above the
  composer, and its workspace shows needs input. My call: decisions 62
  and 68 set this for a Mac command request.
- The time limit of a request. Each request that a tool call makes waits
  at most 90 seconds (Cal's requirement of 13 November 2026, my call for
  the number). Then the call ends without a run. Its result tells the
  agent that the request stays open, that a member can answer it later,
  and that a message will then follow. My call for 90 seconds: Claude
  stops a shell command after 2 minutes by default, so the call must end
  first.
- A late request. After the time limit, the card leaves the composer and
  stays as a widget at its place in the chat. It does not fold into the
  work of its turn. The workspace keeps needs input while the widget is
  open. My call: decision 68 keeps needs input while any request waits.
- A late answer. When a member allows the request, gives a value, or saves
  a secret in the widget, the app sends a message in the session in the
  name of that member. The message names each secret and says that it is
  now available. It never holds a value. It starts a new turn, or joins a
  running turn as other messages do (Cal's requirement, my call for the
  sender and the join). Reason: the member who answers acts in the
  session, as a typed message does.
- A late deny sends no message. The widget shows denied. My call: the
  agent waits for nothing, because its call already ended.
- A request that its turn ends while the tool call waits becomes a late
  request in the same way.
- Any member who sees the session answers a request, in any browser or in
  the Mac app (secrets decision 4 B).
- Temporary requests. When a run names a secret that the org does not
  have, the card asks for a value. The person who answers types it, then
  chooses how long the value lasts: 15 minutes, this workspace, or Save.
  Save creates an org secret with that name. Its creator is the person
  who answers, and the session gets an approval for it. The other two
  choices store no org secret (secrets decision 7).
- A value for 15 minutes serves each run of the session that asked, for
  15 minutes from the answer. A value for this workspace serves each run
  of each session of the workspace until the workspace is archived. The
  Durable Object keeps the value encrypted for that time, and its
  exact-copy filter keeps a copy for the same time. My call for the
  session and the end at Archive: the 15 minutes bound a short task, and
  the workspace choice names its own scope.
- Capabilities (secrets decision 6, Cal's choice). New workspace gets a
  small icon with the label "Capabilities" on hover. It opens a control
  with two parts for now: the pre-approved secrets, and Mac access. Later
  features, such as MCP servers, add their own parts there. New
  workspace gets no separate secret picker. The org settings keep a
  Secrets tab, where members add, replace, delete, and admins reveal
  secrets. My call for the Secrets tab: Cal chose the icon for the create
  only, and secrets still need a place to be managed.
- Mac access. A workspace with Mac access off refuses each Mac command
  request of its agents, with a reason. Mac access is on by default
  (secrets decision 9 A), and every member changes it after the create
  (secrets decision 8 B). When a member turns Mac
  access off, each waiting Mac request of the workspace ends with that
  reason, and a running command runs to its end. My call: the Mac app
  owns a running command, and a stop there is a separate choice.
- Save does not set the mark for all agents. My call: only admins set the
  mark (secrets decision 3 B).
- A workspace that an agent creates with the workspace tools starts with
  no pre-approval. My call: the task gives the pre-approval to a person
  who creates a workspace.
- Any member who creates a workspace can pre-approve any secret. My call:
  the task makes secrets available to all members.
- The tool descriptions tell the agent to keep values out of output, files,
  and answers. My call: decision 255 chose such advice for Mac command
  output.
- The exact-copy filter reads the values of the stored secrets that the
  workspace used. It does not keep the old value of a replaced or deleted
  secret. My call: the filter of the org env vars does the same, and the
  value keeps the risk that a changed value has today.
- The org env vars stay as they are. The settings text says when to use
  each list. My call: no requirement asks to change them, and a merge
  changes decisions 57 and 133.
- Risk: a value is in the cloud computer while its command runs. Each
  process there, and each member with a terminal, can read it then. A
  command can also write it to a file. So a member can learn a value that
  the settings hide from them.

### Design calls from the mockups

These calls of 13 November 2026 came out of the mockup milestone. The
first group are calls of the mockup agent, which the orchestrator kept.
The second group settle items that the mockups showed.

- The Capabilities icon is the lucide `Blocks` icon with a native
  "Capabilities" tooltip, as other icon buttons have. It sits after the
  attach button in the composer, and before it in the New workspace
  dialog. The closed icon shows no state, to keep the page plain.
- The control is a popover on desktop and a sheet on a phone. It is a
  list of parts: Secrets, then Mac access. A secret for all agents shows
  checked and disabled, with "All agents". It links to Manage secrets,
  or to Add a secret when the org has none. The control of an existing
  workspace lists "Allowed in sessions" and "Values for this workspace",
  each with Remove. A value for 15 minutes is not listed, because
  secrets decision 8 B names only those two lists.
- The Secrets tab sits after Cloud computer. Each row shows the name, the
  description, Added by, and the last reveal, which members see too. A
  revealed value shows on its own line with Copy and Hide. Delete asks
  first, because the value cannot come back and its grants end. The All
  agents switch saves at once, starts off, and shows only for admins. A
  suspended org shows no Reveal.
- The request card offers Deny and "Allow for this session" for a stored
  secret. A temporary request has a value field and the choices 15
  minutes, This workspace, and Save as secret. Allow stays off until a
  value is typed. The card shows no time limit.
- A late request says "The agent stopped waiting. Allow sends it a
  message." The message of a late answer says "`NAME` is now available
  in this session", with variants for 15 minutes, this workspace, and a
  saved secret. Secrets decision 10 B later replaced this message with an
  app line that names the member who answered.
- Run results reuse the look of the Mac command card. Values show as
  `[redacted]`, which secrets decision 11 D later replaced: no output
  shows. Results fold with their turn. A late request never
  folds. A waiting request keeps Stop in the composer, because the turn
  runs.
- A Mac command in a workspace with Mac access off says "Mac access is
  off in the Capabilities of this workspace."
- Archive and suspension end each open request as "Not answered", with
  no choices, and Needs input ends. Reason: no agent waits there, and a
  request that comes back after Restore would surprise.
- On a phone, a temporary request shows Deny and "Give a value". That
  opens a sheet with the field, the lifetime choice, and Allow. Reason:
  phone forms already open as sheets, and a sheet leaves room for the
  keyboard. The card was taller than the request region of a phone.
- A request with mixed names gives the stored secrets the session
  approval and each missing name its own field. One lifetime choice
  covers every value. Reason: one task keeps one card.
- Save uses the reason of the agent as the description of the new
  secret. Reason: the reason says why the value is needed, and the card
  stays short.
- A closed session ends each of its open requests as "Not answered", as
  Archive does. Reason: no agent waits there, and Needs input must end.
- The exact-copy filter of the Durable Object also covers the text of a
  request that comes from the cloud computer: the reason and any
  command text. Reason: that text reaches the chat of every member.
- No action moves an env var into Secrets. An admin adds the value to
  Secrets again. Reason: env var values are write-only, and the env var
  list stays as it is.
- When the starter's login is gone, the fallback line of a late answer
  names the action that gets the agent going again, such as "The agent
  learns of it when Cal connects Claude again." Reason: another member's
  next message then opens a new session and does not reach the agent.
  My call of 14 November 2026.
- A suspension of the workspace owner ends each open request of that
  owner's workspaces as "Not answered", as an org suspension does.
  Reason: no agent waits there, which is the reason of the Archive rule.
  My call of 14 November 2026.
- Replace changes the description too, with the rights of secrets
  decision 3 B. Reason: Replace is the existing right to change a
  secret, and a wrong description misleads the members who answer.

## Decisions

### Secrets decision 1: How an agent uses a secret

Cal chose B on 13 November 2026. B: after approval, the CLI starts one
command with the values in its environment. The agent and the model see
only the name. Alternatives:

- A. The tool call returns the value to the agent. Rejected, because the
  value then goes to the model provider, the agent session log, and the
  chat.
- C. The Worker sends one HTTPS request for the agent. Rejected, because
  only requests that the agent builds itself can use a secret.
- D. A secrets gateway in the Worker, with a placeholder and an address
  for each allowed host. It keeps the value out of the cloud computer.
  Rejected for now, because database URLs, SSH keys, and signed cloud
  keys cannot use it.
- E. D, plus a local proxy for unchanged programs. Rejected for the same
  reason as D, and for its larger effort. It stays the wider fix.

Reason: B serves every program. It keeps the value out of the model and
the chat in normal use, and it matches the accepted risk of the org env
vars.

### Secrets decision 2: Who reads a value back

Cal chose A on 13 November 2026. A: an admin reveals one value at a time.
The list never holds a value. The Worker returns only that value, and the
app records each reveal with the admin and the time. The row shows the
record. Alternative B: values stay write-only for each person, as env var
values are. Rejected, because the task asks that admins view values.
This changes the review focus "a stored secret never goes back to the
browser" in `CLAUDE.md`. The documentation milestone changes it, the
Privacy page, and the comparison row `keychain-storage` in the same
change.

### Secrets decision 3: What a member may change

Cal chose B on 13 November 2026. B: every member creates secrets and uses
each one. A member replaces or deletes only the secrets that they
created. Admins replace and delete each secret. Only admins set or clear
the mark for all agents. Alternatives:

- A. Every member changes and marks each secret. Rejected, because a
  member could then send the agents of other members to an account that
  the member controls.
- C. Only admins create and change secrets. Rejected, because the task
  makes secrets available to all members.

### Secrets decision 4: Who allows a session

Cal chose B on 13 November 2026. B: any member who sees the session
answers a request. Alternatives:

- A. Only the sender of the turn that asks.
- C. Only an admin.
- D. The creator of the secret, or an admin.

Reason: B is the fastest rule, and every member can already send
messages in every workspace of the org.

### Secrets decision 5: Secrets in turns that no person started

Cal chose C on 13 November 2026: no special rule. A request in a routine
run, or in a turn that an agent started, waits for a member as each other
request does. Reason (Cal): the time limit of a request ends the wait of
the tool call, so an unanswered request no longer keeps a cloud computer
awake. The late request stays in the chat. Risk that stays: an agent that
outside text steers can use the grants of a workspace or a session
through the session calls. The documentation milestone adds this risk to
`docs/protocol/routines.md`.

The record of the options as they were asked:

Root question: which secrets may an agent use in a turn that no
person started, and how does it get the others? A routine run starts with
no person who watches, and text from other GitHub accounts can steer a
pull request run. While a turn of the run runs, its agent can also start
sessions and send messages in each workspace of the org, as the owner of
the routine (`worker/tools/session-routes.ts`). Those turns then use the
grants of their workspace and session with no question. The options:

- A. A run gets only the secrets marked for all agents. Each other
  request in the run workspace fails at once, with a reason. It leaves
  the session calls open into the grants of other workspaces. Effort:
  Medium.
- B. The routine form gets the secret picker of New workspace. The owner
  pre-approves secrets for each run. Effort: Medium.
- C. No special rule. A request waits until a member answers or the turn
  ends. No turn has a time limit, so an unanswered run keeps its cloud
  computer awake. Effort: Small.
- D. Each turn records whether a person started it. A turn that the
  create call or the session calls start copies the record of the
  calling turn. A turn that no person started uses no grant. It gets only
  the secrets marked for all agents, and each other request fails at once
  with a reason. The open item
  `plans/follow-ups/routine-turns-mac-commands.md` can use the same
  record. Effort: Medium.

Left out: no secret at all in pull request runs, because it breaks the
mark for all agents of the task. A rule for pull request runs only,
because a scheduled run can also read outside text. A smaller reach of
the workspace tools for runs, because `agent-tool-access.md#reach`
rejects it.

Recommendation: D. The plan first recommended A. The options check
showed that A leaves the session calls open, and D closes them at the
same effort. Action: ask the user, because D adds a new refusal.

### Secrets decision 6: Where members manage secrets

Cal chose a new option G on 13 November 2026: a small Capabilities icon
in New workspace, with its label on hover. It controls the pre-approved
secrets and Mac access for now, and later features such as MCP servers.
Reason (Cal): it keeps the New workspace page and dialog uncluttered, and
it gives later features one place. Options A to D below lost to G. The
undo of a wrong grant, which C and D gave, is open as secrets decision 8.

The record of the options as they were asked:

Root question: where do members edit secrets, and how do they undo
a grant that lets a workspace or a session use a secret with no question?
No settings screen exists for one workspace. The task says that secrets
"can be edited from workspace settings". Without an undo, a wrong grant
ends only when the secret is deleted, and a workspace can hold one task
after another. The options:

- A. A new Secrets tab in the org settings. New workspace gets a secret
  picker. The pre-approvals of a workspace stay as its create set them.
  Effort: Medium.
- B. A, plus a Secrets panel for one workspace. The panel shows and
  changes the pre-approvals and the session approvals of that workspace.
  It opens from the workspace header, because the user chose the five
  actions of the workspace menu (`workspace-menu.md#the-menu`). Effort:
  Large.
- C. A, plus Ask again on the row of each secret in the Secrets tab. Ask
  again ends each pre-approval and each session approval of that secret,
  and keeps the secret, its value, and its mark. Every member can use it.
  It also ends the correct grants of other workspaces. Effort: Medium.
- D. A, plus a list of the grants on the row of each secret. A member
  removes one grant, or adds a workspace, there. Effort: Large.

Left out: secrets that belong to one workspace, because the picker at
the create needs secrets that exist before the workspace.

Recommendation: C. The plan first recommended A. C meets the task in the
org settings as A does, and it adds the undo of a wrong grant for a small
cost. B is right if "workspace settings" means the settings of one
workspace. Action: ask the user, because the task names a screen that
does not exist.

### Secrets decision 7: How long a one-time value lasts

Cal answered on 13 November 2026: "A - ask the user, 15 mins or for this
workspace". The plan reads this as option F with other choices: the card
asks the person who answers, and offers 15 minutes, this workspace, or
Save. The reading is my guess, and Cal can correct it. Reason: an answer
of one run alone does not ask the user anything.

The record of the options as they were asked:

Root question: which later commands may use a one-time value with
no new question, and how long does the app keep a copy? The exact-copy
filter of the Durable Object needs its own copy of a one-time value,
because the value has no stored record. The options:

- A. One run. The value reaches only the command of the run that asked.
  A retry asks again. Effort: Small.
- B. The rest of the turn. The Durable Object keeps the value encrypted
  for the turn, and each run of that turn can use it. For a late answer,
  the turn is the turn that the message of the answer starts or joins. The filter keeps
  its copy for the same time. Effort: Medium.
- C. The rest of the session, as an approval does. A session can last for
  weeks, because it survives Continue and can reopen. Effort: Medium.
- D. A set time from the answer, such as 15 minutes, in the session that
  asked. A turn of another sender can then use the value with no
  question. Effort: Medium.
- E. B for runs. The filter keeps only a keyed fingerprint of the value
  and its length for the life of the workspace, so a later echo still
  hides. It adds a new matcher in the path of chat events. Effort: Large.
- F. The card lets the person who answers choose the life: one run, the
  turn, or the session. Save stays. It adds a choice that the task does
  not name. Effort: Medium.

Left out: a temporary request that always saves a secret, because the
task asks for a one-time answer. A count of runs, because the turn of B
already bounds the work that asked.

Recommendation: B. It serves a retry after a fix or after a slow answer,
and it ends with the work that asked for it. The options check kept B.
Action: ask the user, because the options trade the number of questions
against how long a value stays in the app.

### Secrets decision 8: Capabilities after the create

Cal chose B on 13 November 2026: the same Capabilities icon shows in each
workspace, beside the message box. Every member can see and change the
pre-approved secrets and Mac access there, and remove the session
approvals and each value for this workspace. Reason: it meets "edited
from workspace settings", it gives the undo of a wrong grant, and it
keeps each capability in one place.

The record of the options as they were asked:

Root question: how does a member see and change what an existing
workspace allows, such as its pre-approved secrets and Mac access? Cal's
first message said that secrets "can be edited from workspace settings",
and no settings screen exists for one workspace. Without a change after
the create, a wrong pre-approval or a session approval ends only when
its secret is deleted, and a workspace can hold one task after another.
The options:

- A. Only the create sets the capabilities. A grant ends only when its
  secret is deleted. Effort: Small.
- B. The same Capabilities icon shows in each workspace, beside the
  message box. It shows and changes the pre-approved secrets and Mac
  access of the workspace, and it removes the approvals of its sessions
  and each value for this workspace. Every member can change it. Effort:
  Medium.
- C. B, but only the workspace owner and the admins change it, as for
  Archive. Other members see it read-only. Effort: Medium.
- D. No control in the workspace. The Secrets tab of the org settings
  gets Ask again on each secret, which ends every grant of that secret.
  Mac access stays as the create set it. Effort: Medium.
- E. B for secrets. Mac access belongs to each member for each workspace,
  and only that member changes their own switch. It covers only requests
  to that member's Mac. One control then has a shared part and a
  personal part. Effort: Medium.

Left out: a settings page or a menu action for one workspace, because
the user chose the five actions of the workspace menu and B gives the
same changes in the Capabilities icon. A list of grants on each secret
row, because B shows the grants of one workspace for less effort.

Recommendation: B. It meets "edited from workspace settings", gives the
undo of a wrong grant, and keeps each capability in one place. Every
member can already allow a request in each session (secrets decision
4 B). The options check kept B and added the values for this workspace
to its control. Choose E if only the person at a Mac may turn Mac access
on for that Mac. Action: ask the user, because each option sets a new
access rule that no requirement covers.

### Secrets decision 9: Mac access by default

Cal chose A on 13 November 2026: Mac access is on by default for each
workspace, and a member can turn it off in Capabilities. Reason: the Mac
app still asks before each command, so the switch is an extra stop and
today's behaviour stays. The gap of always-allowed commands in routine
runs stays with the open follow-up
`plans/follow-ups/routine-turns-mac-commands.md`.

The record of the options as they were asked:

Root question: may agents of a new workspace ask for Mac commands
before a member chooses? Today each workspace can ask, and the Mac app
on the Mac of the sender asks its user before each command, unless a
saved choice covers it (decision 62). Mac access in Capabilities adds a
stop for one workspace. The options:

- A. On by default. Today's behaviour stays. A member turns it off in
  Capabilities. Effort: Small.
- B. Off by default for each new workspace. A member turns it on in
  Capabilities. Existing workspaces keep it on. Agents of a new workspace
  can ask only after that choice. Effort: Small.
- C. On for a workspace that a person creates. Off for a workspace that
  an agent or a routine creates. Effort: Medium.
- D. On for a workspace that a person creates. A workspace that an agent
  creates copies the Mac access of the calling workspace. A routine run
  workspace starts off. Existing workspaces keep it on. Effort: Medium.
- E. A for the switch, and Always allow in the Mac app covers one
  workspace only. It changes decision 62, and people allow the same
  command again in each workspace. Effort: Medium.

Left out: a Mac access that skips the question on the Mac, because it
breaks decision 62.

Background from the options check: Always allow covers the exact command
text in every workspace (`desktop/src/device/permissions.ts`). The
routine owner sends the first turn of a run workspace. So under A, text
in a pull request can make the agent of a run run an always-allowed
command on the owner's Mac with no question. This is the open High
follow-up `plans/follow-ups/routine-turns-mac-commands.md`. Under A, an
agent can also create a new workspace with Mac access on, past a switch
that is off.

Cal asked on 13 November 2026 whether Mac commands run without a
question. They do not, with one exception. The Mac app asks before each
command. A grant of 15 minutes or until Stop covers one workspace, so it
never covers a new workspace. Only a command with Always allow, by its
exact text, runs with no question in a new workspace. So the gap that D
closes is narrow: a steered agent can run only commands that the person
already allowed everywhere.

Recommendation: A, changed back from D after Cal's question. Under A the
switch is an extra stop, today's behaviour stays, and the narrow gap stays
with the open follow-up. The plan first recommended A, and the options
check changed it to D. D stays the option that also closes the routine
run path of the follow-up, and it keeps today's behaviour in each
workspace that a person creates. Action: ask the user, because B,
C, D, and E change decision 62 behaviour or add a refusal.

### Secrets decision 10: A late answer from another member

Cal chose B on 14 November 2026, with the three fixes of the options
check. The turn that a late answer starts acts for the sender of the
turn that asked, under that sender's login rules. The chat and the agent
text name the member who answered. When that turn cannot run, as when
the starter does not share the login with that sender or the login is
gone, the app sends nothing, and the widget says that the agent learns
of the answer at the next message. Reason: B acts as an answer in time
does and keeps the share rule.

The record of the options as they were asked:

Root question: how does the agent that asked learn of a late
answer from any member? A late answer sends a message in the name of the
member who answers. Another member's message runs on the starter's login
only while the starter shares it (decision 116). Otherwise it opens a
new linked session. So the agent that asked can miss the answer, and the
approval stays with the first session. The options:

- A. The app sends the message as an app notice in the session that
  asked, on the starter's login, also when the login is not shared. It
  spends the starter's login for one short turn. Effort: Medium.
- B. The message uses the login of the sender of the turn that asked,
  when it can run. Otherwise the widget says that the agent learns of the
  answer at the next message. Effort: Medium.
- C. The message keeps the login rules. When it would open a linked
  session, the app sends nothing, and the widget says so. Effort: Small.
- D. Only a member whose message can run in the session sees the choices
  of a late request. Moved to Left out by the options check.
- E. The message stays in the name of the member who answers, under the
  login rules in force. When it cannot run in the session that asked, the
  app keeps it as a pending notice, and the next message to that agent
  carries it as a line. The widget says that the agent learns at the next
  message. Effort: Medium.

Left out: a linked session with the message, because the new session has
none of the earlier history. D, because it breaks secrets decision 4 B.

Facts from the options check: a new Claude subscription and a new ChatGPT
sign-in are not shared by default (decisions 171 and 175), so the case of
C is common. A runs a turn for the member who answers on a login that
its owner does not share, which the share setting exists to stop. A
session never changes its login (decision 105). The starter can also
leave the org or remove the login, so each option needs the widget line
of C for that case.

Recommendation: B, with three fixes to its text. The new turn acts for
the sender of the turn that asked, under that sender's login rules. The
chat and the agent text name the member who answered. The fallback line
also covers a starter's login that cannot run. The plan first
recommended A. Reason: B acts as an answer in time does, keeps the share
rule, and keeps the Mac and the GitHub token with the member whose task
continues. Action: ask the user, because each option changes decision
116 or secrets decision 4 B, or adds a new message kind.

### Secrets decision 11: The command in a request and its result

Cal chose D on 14 November 2026. The run call also sends the command
text. The request card, the late widget, and the result card show it as
the command that the agent says it will run. No output reaches the
chat. The exact-copy filter covers the command text. Reason: a member
sees what the agent says it will run, and no output with a changed form
of a value reaches the chat.

The record of the options as they were asked:

Root question: where does the chat get the command and the output
of a run with secrets? The mockups show the command and its output on
the run card. In the design, the run call sends only its secrets, its
reason, and its turn, and the output goes back to the agent only. The
options:

- A. The chat shows the run as the normal tool call line of the agent,
  with a grant note under it. The request card shows no command. Effort:
  Small.
- B. The run call also sends the command text. The request card and the
  run card show it. The run card takes the output from the tool call of
  the same run, which the chat already filters. Effort: Medium.
- C. The CLI and the MCP server also report the end of each run to the
  Worker: the exit code, the time, and the output after their filter.
  Effort: Medium.
- D. The run call also sends the command text. The request card and the
  late widget show it as the command that the agent says it will run.
  The result card shows the names, the command, and what let it run, with
  no output. The exact-copy filter also covers this text. Effort: Small.

Left out: an approval for one command only, because a process can name
one command and run another, and the task makes the session the unit of
approval.

Facts from the options check: no tool output reaches the chat today. The
runner sends only the target, the description, and the state of each
tool call (`runner/src/providers/tool.ts`). So B has no source for its
output. A command on a card is only the claim of the agent, because the
approval covers the session and the values go to the caller.

Recommendation: D. The plan first recommended B. D keeps B's reason, a
member sees what the agent says it will run, and drops B's output, which
has no source. Choose C only if the chat must show output, which can
hold a changed form of a value that the filter does not hide. Action: ask
the user, because B, C, and D add data at a boundary that no requirement
covers.

### Secrets decision 12: Two features named "secret"

Cal chose A on 14 November 2026, "for now": both names stay. The
Secrets tab says when to use env vars. A later change can rename the
env var mark.

The record of the options as they were asked:

Root question: how does each feature get a name that says what it
does? An env var on the Cloud computer tab can be marked "Secret"
(decision 133), which only hides its value in the chat. The new Secrets
tab sits beside it for a different kind of value. An admin can put a
value in the wrong list, and it then reaches every cloud computer at each
start. Only admins change env vars (decision 57). The options:

- A. Keep both names. The Secrets tab already says when to use env vars.
  Effort: Small.
- B. Rename the env var mark to "Hidden" in the app, the mockups, and the
  protocol docs. Effort: Medium.
- C. Name the new feature "Agent secrets". Effort: Small.
- D. A, plus one line in the env var section that tells admins to put
  each value that needs a member's approval in Secrets, with a link.
  Effort: Small.

Left out: a mask of every env var value with no mark, because it breaks
decision 133.

Recommendation: B, with two fixes from the options check. Add the line
of D, because the admin chooses the list in the env var form. Use a word
other than "Hidden", such as "Hide on screen", because the guide
`src/marketing/docs/cloud-computer.md` already says that every saved
value stays hidden in the settings. B also changes three guides, the
Privacy page, and a comparison row. Reason: the new word says what the
mark does, and "secret" then names one thing. Action: ask the user, because B changes the words of
decision 133, and C changes Cal's name for the feature.

### Secrets decision 13: A notice of a waiting request

Open. Cal's answer of 14 November 2026 named decision 12 twice, the
second time as "12 = A (for now)". That answer may be meant for this
decision. This change builds no notice until Cal confirms. A, change
nothing, needs no work.

Root question: how does a member learn in time that an agent waits
for a secret? A request waits 90 seconds. A Mac command request gets a
macOS notification from the Mac app. A secret request gets only the
Needs input mark, so many requests can turn late. The options:

- A. Change nothing. Effort: Small.
- B. The Mac app notifies the sender of the turn that asked. Effort:
  Medium.
- C. The Mac app notifies each member who has the workspace open.
  Effort: Medium.

- D. B, plus a browser notification to the sender in each open tab of
  that member that is in the background. Effort: Medium.
- E. D through a push service and a service worker, so that a closed
  browser and a phone also get the notice. Effort: Large.
- F. B, with Needs input as the trigger, so later kinds of request get
  the notice with no new code. A Mac command is the exception, because
  its own Mac already shows a notice. Effort: Medium.

Left out: email, because 90 seconds is too short for it. A page title or
Dock badge alone, because only a member who looks sees it.

Recommendation: B. The sender waits for the turn, and the Mac app already
notifies that person for Mac commands. Choose D if many members use a
browser without the Mac app. F is the wider fix. The options check kept
B. Action: ask the user, because it
adds behaviour that no requirement covers.

### Secrets decision 14: A reveal in a suspended org

Open. Root question: may an admin of a suspended org get a secret value?
The mockups hide Reveal in a suspended org. An org suspension refuses
each change but keeps each read, and a reveal is a read. The options:

- A. Hide the button only. The Worker still answers a reveal. Effort:
  Small.
- B. The Worker also refuses each reveal in a suspended org, with the
  refusal of a suspended org. Effort: Small.

Recommendation: B. The screen and the Worker then follow one rule.
Action: ask the user, because B adds a new refusal.

### Secrets decision 15: How long reveal records stay

Open. Root question: how long does the app keep each reveal record? The
Privacy page gives how long each kind of personal data stays. The
options:

- A. Delete the records with their secret. Effort: Small.
- B. Keep them while the org exists, also after the secret is deleted.
  Effort: Small.

Recommendation: B. The record shows who read a value, and a delete must
not hide that. Action: ask the user, because the options trade the
record of who read a value against keeping less personal data.

### Secrets decision 16: The Capabilities icon on a phone

Open. Root question: how does the phone composer keep the model and the
login readable with the Capabilities icon? On a phone, the composer bar
holds attach, Capabilities, the model picker, another member's login
label, Stop, and Send. In a running turn on another member's login, the
model shows only "O…" and the login only "C…". The options:

- A. Keep the bar. The picker and the label shrink. Effort: Small.
- B. On a phone, Stop shows only its icon. It changes an existing screen.
  Effort: Small.
- C. On a phone, Capabilities moves into a menu with Attach files.
  Effort: Medium.

Left out: hiding the login label, because it shows whose login a message
uses.

Recommendation: B. It frees about 40 px with no new control. Action: ask
the user, because each option changes an existing screen or hides what
a message uses.

The options check of decisions 5, 6, and 7 is in
`.context/agent-secrets/options-check.md`. The check of decisions 8 and 9
is in `.context/agent-secrets/options-check-8-9.md`. The check of
decisions 10 to 13 is in `.context/agent-secrets/options-check-10-13.md`.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups show each new screen and flow before any code changes.

- [x] Add a Secrets tab to the org settings mockup
      (`docs/mockups/src/screens/orgSettingsTabs.tsx`). Show the admin
      view with Reveal and its record, the member view with each value
      hidden, the add form, and the replace and delete actions under
      secrets decision 3 B.
- [x] Add the Capabilities icon and its control to the New workspace page
      and dialog mockups, with the secrets part and the Mac access part.
- [x] Add the Capabilities icon and control of an existing workspace,
      beside the message box (secrets decision 8 B).
- [x] Add the request card above the composer: a stored secret, and a
      temporary request with a value field, 15 minutes, This workspace,
      and Save. Show the
      card without choices for a member who cannot answer, if any.
- [x] Add the late request widget in the chat, for a stored secret and
      for a temporary request, and the message that a late answer sends.
- [x] Add the results in the chat: allowed, denied, and the run of a
      command with its output.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. The mockup agent's report is in
      `.context/agent-secrets/mockups-report.md`.
- [x] Apply the design calls from the mockups for archive, the phone
      sheet, mixed names, the description on Save, and Replace.
- [ ] Apply the answers to secrets decisions 10 to 12 to the mockups.
      Show the agent's own tool call line beside each run card, as the
      real chat does.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Write `docs/protocol/secrets.md` with the requirements and secrets
      decisions 1 to 7. Link it from `docs/protocol/README.md` and from
      `docs/protocol/tokens-and-secrets.md`.
- [x] Update `docs/protocol/agent-tools.md` and its count of calls,
      `docs/protocol/agent-tool-access.md`, `docs/protocol/isolation.md`,
      `docs/protocol/create-a-workspace.md`,
      `docs/protocol/orgs-and-members.md`, `docs/protocol/routines.md`,
      `docs/protocol/workspace-calls.md`,
      `docs/protocol/routine-runs.md`, and the settings tabs in
      `docs/protocol/command-palette-actions.md`.
- [x] Update the review focus of `CLAUDE.md` for secrets decision 2 A.
- [x] Read `src/marketing/privacy.ts` and `src/marketing/terms.ts` in
      full. Update each sentence that restates a changed fact.
- [x] Read each guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact.
- [x] Update the rows `organization-environment-and-secrets` and
      `keychain-storage` of the comparison page when their status changes.

## Milestone 3: Storage and the settings API

Depends on: 2

- [ ] Add a migration for the secrets, the workspace pre-approvals, the
      session approvals, and the reveal records.
- [ ] Add the settings routes: list, create, replace, delete, set the
      mark, and reveal. Check the rights of secrets decision 3 B in the
      Worker. The list never holds a value.
- [ ] Take the capabilities in the create of a workspace: the
      pre-approved secrets and Mac access. Refuse Mac command requests of a
      workspace with Mac access off.
- [ ] Add tests beside the code.

## Milestone 4: Tool routes and requests

Depends on: 3

- [ ] Add the fixed routes under `/v1/tools/secrets` and add them to the
      token gate of the machine host.
- [ ] Keep each waiting request in the Durable Object of the workspace.
      Send it to the browsers, set needs input, and end it with its turn.
- [ ] Add the answer route for members: allow, deny, a value for 15
      minutes or for this workspace, and Save.
- [ ] End the tool call at the time limit of a request. Keep the request
      open as a late request. Send the message of a late answer.
- [ ] Return values only to a run call of an approved session whose turn
      runs. Add each used value to the exact-copy filter.
- [ ] Add tests beside the code.

## Milestone 5: The workspace tools

Depends on: 4

- [ ] Add `conductive secrets list` and `conductive secrets run` to the
      CLI, and `list_secrets` and `run_with_secrets` to the MCP server.
- [ ] Hide each exact copy of a value in the output of the command.
- [ ] Write the tool descriptions. Update `tools/README.md` and
      `tools/calls.md`.
- [ ] Add tests beside the code.

## Milestone 6: Secrets tab and Capabilities

Tags: ui

Depends on: 3

- [ ] Build the Secrets tab of the org settings from the mockup.
- [ ] Build the Capabilities icon and control of New workspace from the
      mockup, and of an existing workspace.
- [ ] Add tests beside the code.

## Milestone 7: Request card and chat results

Tags: ui

Depends on: 4, 6

- [ ] Build the request card, the late request widget, and the chat
      results from the mockup.
- [ ] Run `npm run marketing:pictures`, because the composer now shows
      the Capabilities icon.
- [ ] Add tests beside the code. Check the flow in a browser.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Bump `TERMS_VERSION` in `src/shared/terms.ts` and set the
      effective dates of the Terms and Privacy pages, because Milestone 2
      changed both pages.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.
