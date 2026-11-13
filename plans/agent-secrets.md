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
  request of its agents, with a reason. The default and the change after
  the create wait for secrets decisions 8 and 9. When a member turns Mac
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

Open. Root question: how does a member see and change what an existing
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

Open. Root question: may agents of a new workspace ask for Mac commands
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

Recommendation: D. The plan first recommended A, but A's reason is false
for always-allowed commands. D keeps today's behaviour in each workspace
that a person creates, and it closes the routine run path of the
follow-up. The path through the session calls stays open, as Cal
accepted for secrets in decision 5 C. Action: ask the user, because B,
C, D, and E change decision 62 behaviour or add a refusal.

The options check of decisions 5, 6, and 7 is in
`.context/agent-secrets/options-check.md`. The check of decisions 8 and 9
is in `.context/agent-secrets/options-check-8-9.md`.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups show each new screen and flow before any code changes.

- [ ] Add a Secrets tab to the org settings mockup
      (`docs/mockups/src/screens/orgSettingsTabs.tsx`). Show the admin
      view with Reveal and its record, the member view with each value
      hidden, the add form, and the replace and delete actions under
      secrets decision 3 B.
- [ ] Add the Capabilities icon and its control to the New workspace page
      and dialog mockups, with the secrets part and the Mac access part.
- [ ] Add the Capabilities control of an existing workspace, if secrets
      decision 8 keeps it.
- [ ] Add the request card above the composer: a stored secret, and a
      temporary request with a value field, 15 minutes, This workspace,
      and Save. Show the
      card without choices for a member who cannot answer, if any.
- [ ] Add the late request widget in the chat, for a stored secret and
      for a temporary request, and the message that a late answer sends.
- [ ] Add the results in the chat: allowed, denied, and the run of a
      command with its output.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Write `docs/protocol/secrets.md` with the requirements and secrets
      decisions 1 to 7. Link it from `docs/protocol/README.md` and from
      `docs/protocol/tokens-and-secrets.md`.
- [ ] Update `docs/protocol/agent-tools.md` and its count of calls,
      `docs/protocol/agent-tool-access.md`, `docs/protocol/isolation.md`,
      `docs/protocol/create-a-workspace.md`,
      `docs/protocol/orgs-and-members.md`, `docs/protocol/routines.md`,
      `docs/protocol/workspace-calls.md`, and
      `docs/protocol/routine-runs.md`.
- [ ] Update the review focus of `CLAUDE.md` for secrets decision 2 A.
- [ ] Read `src/marketing/privacy.ts` and `src/marketing/terms.ts` in
      full. Update each sentence that restates a changed fact.
- [ ] Read each guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact.
- [ ] Update the rows `organization-environment-and-secrets` and
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
- [ ] Add the answer route for members: allow, deny, Use once, and Save.
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
      mockup, and of an existing workspace if secrets decision 8 keeps it.
- [ ] Add tests beside the code.

## Milestone 7: Request card and chat results

Tags: ui

Depends on: 4, 6

- [ ] Build the request card, the late request widget, and the chat
      results from the mockup.
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
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.
