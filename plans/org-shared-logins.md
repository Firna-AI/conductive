# Org agent logins

Status: Active. On branch `calummoore/delft-zjk2`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Each agent login belongs to one member and serves all of that member's
orgs (decision 21). Each session runs on the login of its starter
(decision 105). Today a share switch under each login lets other members
continue the owner's sessions on it (decision 116). A member cannot start
a session on a login of another member. A member with no login of their
own cannot send a first message, as `worker/chat/first-message.ts:117-125`
shows. On 10 November 2026 the user called the share switch "not real
sharing".

On 15 November 2026 the user asked: "allow user to share their
credentials with the org, so other members can use them - i.e. custom url
or api key". A brainstorm on that day gave three approaches. On
16 November 2026 the user first chose decision 1 A, member shares. Later
that day the user asked for "a separate workspace configuration", and
asked for the agent's opinion. The agent recommended an org login. The
user then said: "we can basically copy the same screen but with less
options" and "it should be its own tab". So decision 1 changed to B. The
user also said: "if an org has a shared credential, the user does not
need to enter their own credentials at all". Decision 4 records that rule.

This change adds an org login for each agent. An admin connects an API key
or an own endpoint on a new Agents tab of the org settings. The tab reuses
the form of the account page with fewer options. A member of the org with
no usable login of their own for that agent runs on the org login. Such a
member needs no login of their own. The change does not cover Claude
subscription tokens or ChatGPT sign-ins as org logins, member shares with
an org, use counts, or limits. Today's share switch of personal logins
stays as it is.

Contract owners:

- [Tokens and secrets](../docs/protocol/tokens-and-secrets.md).
- [Isolation](../docs/protocol/isolation.md), "Agent logins in a sandbox".
- [Agents and sessions](../docs/protocol/agents-and-sessions.md).
- [Own endpoint logins](../docs/protocol/own-endpoint-logins.md).
- [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- [Orgs and members](../docs/protocol/orgs-and-members.md).
- [Automations](../docs/protocol/automations.md) and
  [Automation runs](../docs/protocol/automation-runs.md), for decision 5.
- [Session calls](../docs/protocol/session-calls.md), for the agent tools.
- The [model gateway](../docs/protocol/model-gateway.md).
- The [mockup catalogue](../docs/mockups/catalogue.md),
  [Orgs, members, and logins](../docs/mockups/orgs-and-logins.md),
  [Logins](../docs/mockups/logins.md), and
  [Own endpoint logins](../docs/mockups/own-endpoint-logins.md).
- The legal pages `src/marketing/terms.ts` and `src/marketing/privacy.ts`,
  and the public guides in `src/marketing/docs/`.

Replaced ways:

- The starter of a session as the source of its login → the login of the
  session, which names a member or the org. Consumers:
  `worker/chat/session-login.ts`, `worker/model-gateway/workspace.ts`,
  `worker/model-gateway/login.ts`, `worker/chat/delivery-state.ts`,
  `worker/chat/model-changes.ts`, the targets of `readLoginMetadata` in
  `worker/chat/login-availability.ts`, and
  `src/chat/state/session-login.ts`. Moved and deleted in Milestones 4
  and 6.
- The "own login or refuse" check of a first message, a tool session, and
  a linked session → one default login resolver. Consumers:
  `worker/chat/first-message.ts:117-125`, `worker/chat/send-message.ts:46-56`,
  `worker/chat/tool-session-write.ts:132-140`,
  `worker/automations/run-starter.ts:75`, and
  `worker/app-api/get-started-data.ts:30`. Moved and deleted in
  Milestone 4.

## Terms

- **Agent login:** the key, token, or sign-in that a turn of an agent runs
  on. Personal logins live in the D1 table `agent_logins`, one for each
  member and agent.
- **Own endpoint login:** an agent login that holds the address of a
  gateway or a proxy, and its key.
- **Org login:** an API key or an own endpoint login that an admin
  connects for one org and one agent.
- **Personal login:** an agent login that a member connects on the account
  page.
- **Login of a session:** the personal login of one member, or the org
  login, that every turn of the session runs on.
- **Default login:** the login that a member's new session takes, by the
  rule of decision 6.
- **Share switch:** today's account setting "Let other members use this
  login", stored in `agent_logins.no_reuse`.

## Decisions

The options check of the first decisions 5 and 6 ran on 16 November 2026.
Its report is in `.context/org-shared-logins/options-check-decisions-5-6.md`.

### 1. Who owns a login that the org can use

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/agents-and-sessions.md:26-28`,
  `docs/protocol/own-endpoint-logins.md:26-27`,
  `worker/chat/session-login.ts:60-66`, and
  `worker/chat/first-message.ts:117-125`.
- **Background:** Each option makes a session record the login that it
  starts on, and keep it. That keeps the prompt cache, the reason of
  decision 105. The gateway still adds the key in the Worker, so the key
  never reaches a cloud computer.
- **Problem:** No rule lets a member start work on a login that another
  member or the org owns.
- **Impact if no action:** A teammate without a key cannot use the app.
- **Root question:** Where does the credential that the members of an org
  use live, and who manages it?
- **Options:**
  - **A.** The owner of a personal login gets one share switch for each
    of their orgs. A member of such an org starts sessions on it. It
    changes decisions 105 and 116. Effort: Large.
  - **B.** An admin connects an API key or an own endpoint for the org. It
    stays when that admin leaves. It changes decision 21 and adds a store
    of org secrets. Effort: Large.
  - **C.** Both A and B. Effort: Large.
- **Left out:**
  - Change nothing: it fails the goal.
  - Org env vars that set up the agents: they put the key in the sandbox,
    against decision 120.
  - The workspace owner's login for every session: a member still cannot
    start a workspace.
  - A copy of a personal login in each member's account: a copy keeps
    working after the owner stops sharing.
  - A login for each workspace: workspaces are short-lived, so members
    would set the same login again and again.
  - Subscriptions too: the consumer terms forbid it.
- **Wider fix:** None. This is a new feature.
- **Previous examples:** Decision 502 E offered an org login for
  automations. The user chose 502 B on 8 November 2026. Decision 21 left out
  a login for each org, because Boat credential profiles needed
  `account.admin`, as `plans/boat-native-remote-workspaces.md:890-893`
  records. Decision 120 later moved every login into the Worker, so that
  reason is gone.
- **Recommendation:** B. A company key belongs to the org, an admin then
  chooses where the org's code goes, and the rules are the simplest.
- **Decision:** The user chose A on 16 November 2026. Later that day the
  user changed it to B, with the org login on its own tab of the org
  settings, as a copy of the account form with fewer options.

### 2. Today's share switch

- **Decision:** On 16 November 2026 the user first chose a: one switch for
  each org that covers new sessions and continuations. That choice
  depended on decision 1 A. With decision 1 B, no member shares with an
  org, so the item no longer applies. Today's share switch of personal
  logins stays as it is on `main`. The open item
  `plans/follow-ups/remove-share-switch.md` still covers its future.

### 3. Models of a shared endpoint

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `docs/protocol/own-endpoint-logins.md:49-51`.
- **Background:** The picker of an endpoint's owner hides the models that
  the endpoint does not list. The pickers of other members show every
  model.
- **Problem:** A member on an endpoint of someone else can pick a model
  that fails.
- **Impact if no action:** Some turns fail, and the cause names the model.
- **Root question:** Which models does a member see when they use an
  endpoint that someone else connected?
- **Options:**
  - **A.** The picker follows the last model list of the endpoint, as it
    does for the owner. Effort: Small.
  - **B.** Keep every model. Effort: Small.
- **Left out:** None. Only two real choices exist.
- **Wider fix:** None.
- **Previous examples:** Own endpoint decision 5.
- **Recommendation:** A. A member then picks only models that work.
- **Decision:** The user chose A on 16 November 2026. With decision 1 B, it
  applies to an org endpoint: each picker of a session or a new session
  on the org login follows the last model list of the org endpoint.

### 4. An org login replaces the member's own login

- **Source:** Design. The user stated this rule on 16 November 2026: "if
  an org has a shared credential, the user does not need to enter their
  own credentials at all".
- **Rule:** In an org with a usable org login for an agent, a member with
  no usable login of their own for that agent works as if they had one. A
  personal login that the app can no longer use counts as none. The agent step of Get
  started is complete. The composer, the new workspace form, and the
  agent tools show no Connect notice and refuse no message for a missing
  login.

### 5. Automation runs of an owner without a login

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/automations.md:81-83` and `:94-95`,
  `docs/protocol/automation-runs.md:34-43`, and
  `worker/automations/run-starter.ts:75`.
- **Terms:**
  - **Automation:** a saved prompt that starts a workspace on a schedule or
    a GitHub event, with no person watching. Its owner is the member who
    created it.
- **Background:** An automation run starts its first session as the
  automation owner, on the owner's own login.
  `docs/protocol/automation-runs.md:41-42` takes that rule from decision
  105 and decision 50. The automations doc rejects "org automations on an
  agent login of the org". Today a run of an
  owner without a login stops with `agent_login_required`.
- **Problem:** No rule says whether an automation run of an owner without a
  login can use a login that the org makes available.
- **Impact if no action:** A member who relies on that login can save a
  automation whose runs all fail.
- **Root question:** May an automation run, which no person watches, spend a
  login that the owner did not connect, and who decides that?
- **Options:**
  - **A.** A run takes the owner's default login, as a new session of the
    owner does. Effort: Small.
  - **B.** A run uses only the owner's own login. Effort: Small.
  - **C.** A second switch allows automations on the login. Effort: Medium.
  - **D.** The automation saves the login of its runs. Effort: Medium.
  - **E.** As A, and the login's page lists the automations that use it.
    Effort: Medium.
- **Left out:** A spend cap, because the provider and the endpoint can
  limit spend, and limits are out of scope.
- **Wider fix:** A. One default login rule serves sessions, the agent
  tools, and automations.
- **Previous examples:** Decision 502 B chose who sees and changes an
  automation. Decision 502 E, an org login for automations, was not chosen.
- **Recommendation:** A. It follows the rule of decision 4.
- **Decision:** The user chose A on 16 November 2026. With decision 1 B, a
  run uses the owner's default login: the own login, or else the org
  login. The run still acts as its owner for GitHub, so its pushes show as
  the owner. So the rejection of org automations in
  `docs/protocol/automations.md:94-96` stays, because its reason is decision
  50, and the org login changes only the model login.

### 6. A member with more than one usable login

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/chat/first-message.ts:117-125`.
- **Background:** A member can have a personal login and the org login
  for the same agent.
- **Problem:** No rule says which login a new session of that member
  takes.
- **Root question:** Which login does a member's new session use, when
  more than one login can serve it?
- **Options:**
  - **A.** The member's own login comes first. Without one, the session
    takes the other login. Effort: Small.
  - **B.** As A, with a login menu in the composer and the new workspace
    form. Effort: Medium.
  - **C.** As A, with a setting for each org on the account page.
    Effort: Medium.
  - **D.** The other login comes first. Effort: Small.
  - **E.** The owner of the other login sets which order applies.
    Effort: Medium.
  - **F.** With each rule, the server names the default login, and the
    screens show that value. Effort: Small.
- **Wider fix:** F.
- **Recommendation:** A with F.
- **Decision:** The user chose A on 16 November 2026. With decision 1 B,
  the member's own login comes first, and the org login otherwise. The
  user chose 6 A while decision 1 was still A. Decision 7 asks again
  whether the own login comes first in an org with an org login. F changes no behaviour, so the plan keeps it as a
  design call.

### 7. The org login for every member

The options check of 16 November 2026 changed the root question, added
options D, E, and F, moved C to Left out, and changed the recommendation
from A to B. Its report is in
`.context/org-shared-logins/options-check-decision-7.md`.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The default login rule of decision 6,
  `src/app/get-started.ts:39-42`, and
  `plans/follow-ups/org-control-of-own-endpoints.md`.
- **Background:**
  - By decision 6 A, a member's own login comes first. The user chose 6 A
    while decision 1 was A. Its reason was that a member must not spend a
    colleague's lent key. An org login is the org's own key, so that
    reason is weaker now.
  - Get started asks each person to connect an agent before the first
    workspace. So most members already have a personal login, and under
    6 A they never use the org login.
  - A personal login serves all of the member's orgs. A member who removes
    it to use the org login loses it in every org.
- **Problem:** An admin who connects an org login cannot make the sessions
  of the org use it. So the org cannot choose where its code goes.
- **Impact if no action:** Most members keep their personal logins in the
  org. The org login then serves only new members.
- **Root question:** Who decides which login runs a member's work in an
  org that has an org login: the member or an admin?
- **Options:**
  - **A.** The member. The own login comes first, by decision 6 A. The org
    login serves only members without a usable login. Effort: Small.
  - **B.** An admin. A switch on the Agents tab, "Use for every member",
    starts off. When it is on, each new session in the org takes the org
    login, also for a member with their own login. While the org login
    cannot be used, the own login serves. Older sessions keep their login.
    Effort: Medium.
  - **D.** As B, and the next message in an older session on a personal
    login starts a linked session on the org login. The composer says so
    before Send. The new session has no copy of the earlier history.
    Effort: Medium.
  - **E.** As B, and older sessions move to the org login with their
    history. Each moved session rewrites its prompt cache once. It changes
    the rule that a session never moves to another login, in
    `docs/protocol/agents-and-sessions.md:26-28` and
    `docs/protocol/messages-and-attachments.md:42-43`. Effort: Medium.
  - **F.** The org login always comes first in an org that has one, with
    no switch. It changes decision 6 A for the org login. A member's
    subscription then serves no org with an org login. Effort: Small.
- **Left out:**
  - The first option C: as B, and messages on personal logins in older
    sessions are refused. D reaches the same sessions with no new
    rejection.
  - An admin list of allowed endpoint hosts for personal logins. It
    limits only personal endpoints, and it makes no session use the org
    login. `plans/follow-ups/org-control-of-own-endpoints.md` keeps it.
  - A choice that each member makes for each org or session. The user
    chose decision 6 A over a login menu and an account setting.
  - A check at each gateway request. It only adds the last requests of
    running turns, and it fails those turns in the middle.
- **Assumptions:** Every way to start a session, also an automation run and
  an agent tool call, takes its login from the one default login resolver.
  So B, D, E, and F also apply to automation runs and agent tool sessions.
- **Wider fix:** D. The rule then lives in the resolver and the access
  helper, which check each message, so it covers older sessions too.
- **Previous examples:** Option E of decision 6, an order that the owner of
  the other login sets, in commit `9e64d6997`. The rejected "login of the
  workspace owner for all sessions" in
  `docs/protocol/agents-and-sessions.md:47-48`.
- **Recommendation:** B. The org decides where its code goes, members keep
  their own logins where the admin allows it, and it adds no rejection. D
  protects the most, because it also covers older sessions.
- **Action:** ask the user, because the options add new controls for
  orgs, or change decision 6 A, and no requirement covers them.
- **Decision:** The user chose B on 16 November 2026. Before that, the user
  said: "workspace agent credentials can be used by the entire workspace".
  The agent read "workspace" as the org.

## Design calls

Each call is the agent's call, made on 16 November 2026.

- One org login for each agent, as one personal login for each agent.
- Only an admin connects, replaces, or removes an org login. Every member
  sees the Agents tab read-only: the agent, the kind, and the host of an
  own endpoint, as members see the other org settings. Nobody sees the
  key or the full address. Reason: decision 57 for the org settings, and
  the write-only rule for secrets.
- The Agents tab reuses the parts of the account form,
  `AgentConnectForm`, `EndpointFields`, `LoginEndpoint`, and
  `EndpointModels`, with only the API key and the own endpoint kinds. It
  has no share switch. Reason: the user asked to copy the screen with
  fewer options.
- The org login survives the admin who connected it. Deleting the org
  deletes it.
- The Worker encrypts an org login with a context that names the org, as
  a personal login has a context that names the user. Reason: a copied
  ciphertext then cannot pass as another org's login or a user's login.
- A session takes its login when it accepts its first message. A session
  with no message that changes its agent takes the login of the new agent.
- A stored session without a login reads its starter, in
  `normalizeSession` of `worker/chat/session-storage.ts`. Reason: that
  function already gives a default to each stored field that an older
  record lacks.
- Every message of a member of the org runs on the org login of a session,
  with no share switch. A session on a personal login keeps today's rules
  of the share switch and the linked session.
- The composer names the org login with the name of the org, such as
  "Acme's login", where it names "Cal's login" for another member's login.
- When an admin replaces the org login, its sessions keep it. A running
  turn fails with the cause of a changed login, and Try again uses the new
  key, as for a personal login today. When an admin removes it, a message
  in such a session starts a linked session on the sender's default
  login, as a message does today when the starter's login is not
  available. No session moves to another login.
- A session on the org login serves each member of the org, also after
  its starter leaves the org. Today's checks of the starter's membership
  apply only to a session on a personal login.
- The workspace checks the login when it accepts each message and before
  it gives the credential of a turn to the runner, as today.
- The agent tools follow the default login of the sender when a call
  starts a session.
- The account response and the org settings response name the default
  login for each org and agent, from the Worker's resolver, as option F of
  decision 6 says. The screens show that value and do not compute it.
- The Terms page says that the admin who connects an org login must have
  permission to use it, and that the account of the key or the endpoint
  pays.
- No use counts, limits, or admin view of personal endpoints in this
  change. `plans/follow-ups/org-control-of-own-endpoints.md` and
  `plans/follow-ups/member-changes-session-choice.md` stay open.

The mockups of Milestone 1 showed the problems below. Each call is the
agent's call, made on 16 November 2026.

- Replace opens the form under the org login, and the login serves until
  the new one saves. Replace keeps the switch "Use for every member", also
  with another kind, because the switch belongs to the org login, not to
  its key.
- Remove asks no question first, as the Remove of a personal login and the
  delete of an env var do not. Reason: a new org login serves the sessions
  on the org login again, because the login of a session names the org.
- A member reads the value of the switch "Use for every member" as its
  hint on the read-only Agents tab, as a member reads the Secret mark of an
  env var. Reason: the value decides which login the member's sessions
  use. Only an admin sees the model list and Refresh.
- The account shows "Your new sessions in Acme use Acme's login." under an
  agent for each org whose org login is the default login of the member.
  It shows also under a connected login while the switch of that org is
  on. Reason: the same default login from the server decides both cases.
  The account keeps "Every org uses these agents."
- Get started names the org login with the state "Ready", the words "You
  can start now with Acme's login. Connect your own at any time in your
  account.", and the line of the account under the agent.
- The mockups draw no org login that the app can no longer use. The Worker
  marks only a ChatGPT sign-in as not usable, and an org login is never
  one. So the column `failure_cause` of `org_agent_logins` has no writer,
  and Milestone 3 adds it only for a writer.
- The owner menu of a workspace says "Each session keeps its agent login."
  in place of "Each session runs on the agent login of the member who
  started it.", which the org login makes wrong.
- The hint of the share switch, "Their messages in your sessions start a
  new session on their own login.", is wrong for a member whose default
  login is the org login. The app renders the same part, and app tests
  assert its words, so Milestone 6 changes it to "Their messages in your
  sessions start a new session." with those tests.
- The command palette lists the Agents tab in the group of the settings of
  the org, after Cloud computer.
- The form of the account said "tests it once" under a key, but the app
  stores a key without a test. The mockups now say "keeps it encrypted,
  and never shows it again.", as the app does.
- `SessionLogin` in `docs/mockups/src/components/chat/` keeps its field
  `starter` for the name of the org, because the app imports the type.
  Milestone 6 renames it to `owner`.

The documentation milestone added these calls on 16 November 2026. Each
is the agent's call.

- A new protocol page, `docs/protocol/org-logins.md`, holds the org login
  and the default login rule. Reason: the docs that would hold it are
  already long. The other docs link to it.
- A message of the starter in a session whose personal login can no
  longer be used starts a linked session on the org login, when the org
  login serves the starter. Today the app refuses such a message. Reason:
  decision 4 refuses no message for a missing login, and no session moves
  to another login.
- A stored session with messages but no login runs on the starter's
  personal login. An empty stored session takes its login at its first
  message.
- `loginShared` is always true for a session on the org login.
- The gateway does not check the starter's membership for a session on the
  org login.
- When the saved address of an org endpoint is no longer accepted, the
  cause of the turn names the org and the agent, and points to the Agents
  tab of the org settings. Reason: it mirrors the cause of a personal
  login, which points to the account page, and only an admin can fix an
  org login.

The merge of `main` on 17 November 2026 added these calls. Each is the
agent's call.

- The Agents tab shows main's read warning of the model list and the `/v1`
  note of a Codex endpoint to an admin, as the account page shows them to
  the owner. A member sees neither. Reason: `docs/protocol/org-logins.md`
  says that each rule of an own endpoint also applies to an org endpoint,
  and only an admin sees the model list and Refresh.
- `main` now says that the project is in production. So each later
  milestone avoids a breaking change: a stored session without a login
  keeps working, and the routes of the app keep their shapes.

The mockups of Milestone 2b showed the problems below. Each call is the
agent's call, made on 17 November 2026.

- The Agents tab draws the lines under an own endpoint with
  `EndpointDetails` of the account. That part now takes the owner of the
  login. For a member, and for each person in a suspended org, it shows
  only the kind and the host. Reason: one part then puts the host, the
  note, the warning, and the model list in the same order for both
  owners, and the tab copies no markup.
- The save and the Refresh of an org endpoint answer whether they read a
  model list, and the save answers whether it added `/v1`, as for a
  personal login. The page of the admin keeps the note and the warning
  until it reloads, as the account page does. Reason: the app stores no
  mark of a failed read, so only these answers can show the note and the
  warning.
- Connect of the Codex form on Own endpoint now leads to Codex on the
  gateway with the `/v1` note, as
  `app/org-settings/agents/endpoint-models/v1-added` shows. Before, it led
  to Codex on an API key.
- When the last list of an org endpoint names no model of the app for an
  agent, the line on the Agents tab says "The model pickers on this login
  show Opus 5.5, Sonnet 5.5, and Fable 5.1, but this endpoint lists none
  of them." It is the line of the account with the pickers of the org
  login. No mockup draws this state, also not on the account.

Milestone 3 added these calls on 17 November 2026. Each is the agent's call.

- The org API uses `GET /api/orgs/:orgId/agent-logins` and the personal
  route pattern for each agent: `PUT`, `PATCH`, `DELETE`, and
  `POST .../models/refresh`. The shared org settings module owns the
  paths. Reason: the new routes follow the account API without changing
  any existing route. The read gives both agents, including a disconnected
  entry when a login is absent.
- The shared encryption and model refresh helpers accept a personal owner
  string or an org owner `{ orgId }`. The org context is
  `org-agent-login:<orgId>:<agent>`. Reason: personal ciphertext and
  existing turn callers keep their current context and behavior.
- The table has no `failure_cause` column. Reason: neither allowed kind
  has a writer for it, as the mockup call already found.
- `created_by` is a nullable user reference with `ON DELETE SET NULL`.
  Replacement keeps the first creator and `created_at`. Reason: the org
  owns the login, and removing its creator must keep it.
- Org login saves, removes, and switch writes use the existing active
  admin SQL predicate. Org model reads check the active org state, and
  an admin Refresh checks the admin role in its claim and final write.
  Reason: a role or suspension can change during endpoint discovery.
- Save and switch replies read the current public metadata. They include
  the same optional model list that an admin read gives. The save also
  carries the transient `/v1` and failed-read flags. Reason: the replies
  reuse the public metadata reader and return no encrypted fields.

The session milestone added these calls on 17 November 2026. Each is the
agent's call.

- `Session.login` uses a tagged owner: `personal` with `userId`, or `org`
  with `orgId`. The Rust field is optional and omits an absent value.
  Reason: empty sessions and older clients keep their current wire shapes.
  The Rust value is boxed to keep the tool reply enums small. Its JSON is
  unchanged by the box.
- `ChatRecords.session` checks the durable newest-turn record before it
  normalizes a session without a login. Reason: a finished older session
  can have messages without an active turn or retry message. It must keep
  its starter's personal login. An empty session remains unset.
- `readLoginAccess` reads public access and metadata in one query for a
  batch of session targets. Credential reads use that same access helper.
  Reason: sessions, the gateway, account reads, Get started, and automation
  runs must share the membership and suspension rules without metadata
  reads decrypting a secret.
- The default resolver accepts an excluded candidate when its credential
  cannot be used. Admission can then try the other login with the same
  ordering rule. Reason: a refused full endpoint or obsolete personal
  token must not prevent a usable org login from serving the member.
- Account and org-login reads add `defaultLogins` without changing existing
  fields. Each entry names the org, agent, and selected owner. An endpoint
  entry also carries the existing missing-model projection and read time.
  Rust exports these dependent types with `SessionLogin`. Reason: the
  forms and member pickers need the server's selected login and its model
  availability, without a secret or a second ordering rule.
- Each default entry also carries `orgModelList` while a usable org
  endpoint has a model list. Reason: an older session can keep the org
  login after its member's default returns to a personal login. Its
  picker still needs the org's availability under decision 3.
- An empty session shows metadata for its starter's current default, but
  saves no owner before its first accepted message. Reason: a preference
  change before that message must apply, while existing personal sharing
  and creator rules stay in force.

Milestone 5 added these calls on 17 November 2026. Each is the agent's call.

- The words of the Agents tab moved from `OrgAgents.tsx` to
  `orgAgentsCopy.ts` beside it, which imports nothing. The mockups and the
  app import them from there. Reason: `OrgAgents.tsx` imports `ScreenLink`
  and fixtures, which the app never imports, as `src/app/README.md` says.
  `endpointReadCopy.ts` holds its words in the same way.
- `OrgModel` holds the org logins as its part `agentLogins`. The tab reads
  them each time that it opens and at each return to the page, as the
  Repositories and Members tabs read their data. Reason: one model of the
  org keeps the note and the warning until a reload, and `Resource` shows
  the writes in their order.
- A Connect form that is open when its agent gets an org login, such as
  from a save of another admin, becomes a Replace form. Reason: its save
  then replaces that login.
- A failed read of the tab says "The agent logins did not load", with Try
  again, as the other tabs do. A failed Remove shows the toast "Claude
  wasn't removed.", as the account does. Reason: the mockups draw neither
  state.

Milestone 6 added these calls on 17 November 2026. Each is the agent's call.

- The browser reads the default logins in one module,
  `src/app/default-logins.ts`. A new session takes the org login while the
  server names it. Otherwise the own login serves while the app can use it.
  Reason: the account shows a change of an own login at once, before the
  next read names the new default, and the order stays with the server.
- After a save, a remove, or a connected sign-in of an own login, and after
  a save, a switch change, or a remove of an org login in the same tab, the
  account reads the logins of that agent again for the new default logins.
  A read shows the default logins of an agent only while that agent had no
  change during the read. Reason: the screens then show the default login
  of the server also just after a change, as option F of decision 6 asks.
- The screens count the default logins only of the orgs that the org list
  shows. Reason: a leave or a delete then shows at once, as the org step of
  Get started does.
- A session record without a login takes the default login of its starter,
  as the Worker does. In the own session of the reader, the composer names
  the org login while the server names it as the default login. In an empty
  session of another member, the composer follows the record as for the
  personal login of that member. Reason: only the account of that member
  names their default login. The open question of this case is in the
  report of the milestone.
- When the own login of the reader's session can no longer be used and the
  org login serves the reader, the notice of the new session says "The
  login for this session is not available.", and the label names the org
  login. Reason: no mockup draws this case, and these words of
  `linkedCopy.ts` fit the own login of the reader.
- When the record says that the login of a session cannot serve, and the
  account still names that login as the default login, the account is
  older. After the org login, the own login serves while the app can use
  it. After the own login, the composer asks to connect. Reason: only the
  server knows whether the org login serves after the own login.
- A model of the other agent in the picker of the composer follows the list
  of the default login of the reader for that agent, also in a session on
  the login of another member. Reason: such a model opens a new session on
  that login.
- The default model of Preferences keeps the lists of the own logins.
  Reason: it belongs to no org.
- `AgentList` draws the lines of the org logins on the account and in Get
  started, also under an own login while the switch of an org is on. The
  agent step says Ready, with the words of the org login, only when no own
  login serves. Its words name the first org, in the order of the account,
  whose default login is its org login.
- The line under the prompt of an automation of the person names the org
  login, as the mockups do. A member who reads the automation of another
  member still reads the login of the owner, such as "Cal's". Reason: only
  the account of the owner names the default login of the owner.
- The development fake keeps the org logins in its state, and its account
  names the default logins. `?orgLogin=every-member` turns the switch on,
  and `?sessionLogin=org|removed` puts the sessions of
  `checkout-autocomplete` on the org login.

## Components

- D1: a table `org_agent_logins` keyed by `org_id` and `agent`, with
  `kind` (`api-key` or `endpoint`), `ciphertext`, `endpoint_origin`,
  `use_for_every_member`, `created_by`, `created_at`, and `updated_at`. It also
  has the model list columns that
  `migrations/202611110407_agent_login_models.sql` adds to personal
  logins. It cascades on the delete of the org. A save of the switch
  leaves `updated_at` unchanged, as
  `worker/app-api/account-data.ts:196` does for the share switch.
  Reason: `updated_at` is the login version that running turns check.
- Org API: routes for admins that save and remove an org login, and a read
  for members that gives each org login without its secret. Admins also
  get the model list of an endpoint and the time of its last read.
- Model lists: the endpoint model refresh of
  `worker/model-gateway/endpoint-model-refresh.ts` gets an org owner.
- Session: a `login` field that names a member or the org, next to
  `started_by` in the Rust type `Session` of
  `crates/cnd-runner-interface/src/tools/session_types.rs`. `ts-rs` writes
  it to `src/shared/generated/Session.ts`, which `src/shared/sessions.ts`
  imports.
- Worker: one default login resolver and one access helper in
  `worker/chat/`, which the first message, the send, the linked session,
  the agent tools, the gateway, Get started, and automation runs use.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

A first mockup round for the member shares of the first decision 1 A left
uncommitted work in the working tree. Its copy is in
`.context/org-shared-logins/milestone-1-partial.patch`. This milestone
keeps the parts that still fit, and moves the account shares to the org
settings.

- [x] Org settings: an Agents tab after Cloud computer, in
      `docs/mockups/src/components/settings/OrgSections.tsx`. An admin
      sees Claude and Codex, each with Connect, or with its kind, the host
      of an endpoint, the model list, Replace, and Remove. The form offers
      only API key and own endpoint.
- [x] Org settings: the read-only Agents tab of a member, as
      `app/org-settings/member` shows the General tab.
- [x] Org settings: the endpoint model list, an endpoint that the app does
      not accept, and a save that fails, on child pages when the page
      would pass five screens.
- [x] Account page: remove the org share switches and the "Shared with
      you" list of the first round. Each personal login keeps today's
      share switch. Show a short line for each org whose org login serves
      an agent that the member did not connect.
- [x] Get started: the agent step is complete with only an org login, and
      it names the org login.
- [x] Composer: a session on the org login names it, such as "Acme's
      login". The `not-shared` and `no-agent` states keep today's rules for
      personal logins.
- [x] New workspace form and routine form: no Connect notice with an org
      login, and the form names the org login.
- [x] Model picker: a session or a routine on an org endpoint shows only
      the models of its last list.
- [x] Agents tab: the switch "Use for every member" of decision 7 under
      each org login, off by default, with its hint and a save that fails.
- [x] Composer and new workspace form: a member with their own login, in
      an org whose switch is on, sees the org login named, such as "Acme's
      login".
- [x] Update `docs/mockups/catalogue.md`,
      `docs/mockups/orgs-and-logins.md`, and
      `docs/mockups/own-endpoint-logins.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence of the second round: `.context/org-shared-logins/round-2-*` holds
the logs of the checks, the screenshots, and the compare with `main`. The
first round's complete copy is in `.context/org-shared-logins/round-1-backup/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] `docs/protocol/tokens-and-secrets.md`: the org login, its admins, its
      encryption, and that it serves the members of its org.
- [x] `docs/protocol/orgs-and-members.md`: the Agents tab, who changes it,
      and that decision 21 now has an exception. Change lines 197-199 and
      238-239, which say that each session runs on its starter's login.
- [x] `docs/protocol/agents-and-sessions.md`: each session runs on its
      login, a personal login or the org login. The starter never changes.
- [x] `docs/protocol/isolation.md`: the org login never reaches a sandbox,
      and the access rule.
- [x] `docs/protocol/own-endpoint-logins.md`: drop the rejection of an
      org endpoint. State decision 3 for the org endpoint.
- [x] `docs/protocol/messages-and-attachments.md`: the default login of
      decision 6.
- [x] `docs/protocol/routines.md` and `docs/protocol/routine-runs.md`:
      decision 5.
- [x] `docs/protocol/session-calls.md`: the agent tools use the default
      login of the sender.
- [x] `docs/protocol/model-gateway.md` and
      `docs/protocol/model-gateway-requests.md`: the login of the session.
- [x] Read `src/marketing/terms.ts`, `src/marketing/terms-org.ts`, and
      `src/marketing/privacy.ts` with its parts in full. Update each
      sentence that restates a changed fact, such as "Each session uses the
      login of the member who started it".
- [x] Read each guide in `src/marketing/docs/` in full, at least
      `agent-logins.md`, `get-started.md`, `sessions-and-chat.md`,
      `security.md`, and `overview.md`. Update each sentence that
      restates a changed fact.
- [x] Update the rows of `src/marketing/from-conductor/areas/cloud.ts:86`
      and `plans-and-pricing.ts` that the change makes wrong.
- [x] Capture the marketing pictures again with `npm run marketing:pictures`.
      The `org` picture shows the tab row of the org settings, which gains
      Agents in Milestone 1. Only the two phone files of the `org` picture
      changed because of this branch. The other files changed because of
      the screens that `main` changed after its last capture.
- [x] Update the background of `plans/follow-ups/org-control-of-own-endpoints.md`
      and `plans/follow-ups/member-changes-session-choice.md`.
- [x] Update `worker/README.md`, `worker/chat/access.md`,
      `src/app/README.md`, and `src/chat/README.md`, when they describe the
      login of a session. `worker/README.md` changed. The other READMEs
      name code mechanics, so they change with the code in Milestones 4
      and 6.
- [x] Check each relative link of each changed Markdown file.

The merge of `origin/main` on 17 November 2026 saved the reason for each
intentional resolution in
`.context/org-shared-logins/merge-justifications.md`. The pull request
description copies them, as the `git-merge` skill says.

## Milestone 2b: Mockups for the org endpoint notes

Tags: mockup

Depends on: 2

The merge of `main` on 17 November 2026 brought two notes of an own
endpoint to the account page and Get started: the warning "Conductive
couldn't read the model list of this endpoint." with Refresh, and the note
under a Codex endpoint after a save that added `/v1`. The Agents tab of
Milestone 1 draws neither. This milestone fills that mockup gap.

- [x] Agents tab: an admin sees the read warning with Refresh, and the
      `/v1` note, as the account page shows them, with main's
      `EndpointDetails` part. A member sees neither.
- [x] Update `docs/mockups/catalogue-org-logins.md` and
      `docs/mockups/own-endpoint-logins.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/org-shared-logins/m2b/` holds the logs of the checks
and the screenshots.

## Milestone 3: Org logins in the data and the org API

Depends on: 2

- [x] Add the migration for `org_agent_logins`.
- [x] Add the save, the remove, and the read of an org login, with the
      address rule of `docs/protocol/own-endpoint-logins.md` and the org
      encryption context. Only an admin saves or removes.
- [x] Give the endpoint model refresh an org owner.
- [x] Make the save and the Refresh of an org endpoint answer whether they
      read a model list, and the save answer whether it added `/v1`, as
      for a personal login, from the design calls of Milestone 2b.
- [x] Add the switch of decision 7: a column, and an admin route that saves
      it without a change of `updated_at`.
- [x] Keep the switch of decision 7 when an admin replaces the org login,
      also with another kind, from the design calls of the mockups.
- [x] Tests: an admin save, a member refused, a response with no secret,
      an endpoint that the rule refuses, the delete of the org, and a
      ciphertext of another org that does not decrypt.

Evidence: `.context/org-shared-logins/m3/` holds the check logs and failure
proofs. The final report is `.context/org-shared-logins/m3-report.md`.

## Milestone 4: Sessions and turns on the org login

Depends on: 3

- [x] Add `login` to the session, and its default in `normalizeSession`.
- [x] Add the default login resolver of decisions 6 and 7, and the access
      helper. With the switch on, a usable org login comes first. Without a
      usable org login, the own login serves.
- [x] Move the first message, the send, the linked session, and
      `worker/chat/tool-session-write.ts` to the resolver.
- [x] Move `worker/model-gateway/workspace.ts`,
      `worker/model-gateway/login.ts`, `worker/chat/delivery-state.ts`,
      `worker/chat/model-changes.ts`, and `readLoginMetadata` to the login
      of the session.
- [x] Move `worker/app-api/get-started-data.ts` to decision 4.
- [x] Name the default login for each org and agent in the account
      response, from the resolver, as option F of decision 6 says. The new
      workspace form, the automation form, Get started, and the account page
      of Milestone 6 show it.
- [x] Move `worker/automations/run-starter.ts` to decision 5.
- [x] Update the READMEs that name the login functions of the Worker:
      `worker/chat/access.md`, `worker/chat/README.md`, `key-code.md`,
      `tests.md`, `integration/README.md`, `integration/session-logins.md`,
      `integration/logins-and-attachments.md`,
      `worker/model-gateway/README.md`, `worker/automations/README.md`,
      `worker/members/README.md`, and
      `worker/operator/suspension-access.md`.
- [x] Tests: a first message on the org login, a message of another member
      in that session, an org login replaced during a turn, removed before
      a waiting message, decision 6 order, the switch of decision 7 on and
      off, decision 5, and an older stored session.

Evidence: `.context/org-shared-logins/m4/` holds the check logs and failure
proofs. The final report is `.context/org-shared-logins/m4-report.md`.

## Milestone 5: The Agents tab of the org settings

Tags: ui

Depends on: 1, 2b, 3

- [x] Add the Agents tab to the org settings under `src/shell/settings/`,
      with the parts of the account form, as the mockups show.
- [x] Show the read-only tab to a member.
- [x] Add the Agents tab to the routes in `src/app/router.ts`, to the tab
      list in `src/shell/settings/OrgSettingsScreen.tsx`, and to the rows of
      `src/app/palette/commands.ts`, as `app/command-palette/settings`
      shows.
- [x] Take the words of the tab from `orgAgentsCopy` in
      `docs/mockups/src/components/settings/OrgAgents.tsx`. Replace opens
      the form under the login, as `app/org-settings/agents/form/replace`
      shows.
- [x] Show the note and the warning of the model list reads to an admin,
      as `app/org-settings/agents/endpoint-models` and its variants show.
      Give `EndpointDetails` and `EndpointModels` of `src/shell/account/`
      the org owner, and do not copy them. Keep the answers of the save and
      of Refresh in the page until it reloads, as the account does. A
      member sees neither, as `app/org-settings/agents/member/endpoints`
      shows.
- [x] Check the tab in a browser against the mockups.

Evidence: `.context/org-shared-logins/m5/` holds the screenshots of the
browser check, the check logs, and the failure proofs of the tests.

## Milestone 6: Account page, composer, Get started, and forms

Tags: ui

Depends on: 1, 4

- [x] Move `src/chat/state/session-login.ts` and the composer blockers to
      the login of the session and decision 4.
- [x] Move `src/app/setup-steps.ts` to decision 4.
- [x] Show the default login from the server in the new workspace form,
      the automation form, the account page, and Get started. Take the words
      from `docs/mockups/src/components/settings/OrgLoginLines.tsx` and
      `docs/mockups/src/screens/getStartedCopy.ts`.
- [x] Change the note of the owner menu in `src/members/OwnerChoices.tsx`
      to "Each session keeps its agent login.", as `app/reassign` shows.
- [x] Change the hint of the share switch in
      `docs/mockups/src/components/settings/LoginShare.tsx` to "Their
      messages in your sessions start a new session.", with the app tests
      that assert it, such as `src/shell/account/AccountScreen.test.tsx`.
      The app renders this part, so the words change in the app change.
- [x] Rename the field `starter` of `SessionLogin` in
      `docs/mockups/src/components/chat/SessionLogin.tsx` to `owner`, with
      its users in `src/chat/`, because it can name the org.
- [x] Make the model pickers follow the list of the org endpoint, by
      decision 3, also in `src/shell/automations/AutomationEditor.tsx:72`.
- [x] Update the READMEs that name the login code of the app:
      `src/app/README.md`, `src/chat/README.md`, `src/chat/sessions.md`,
      `src/chat/dev/README.md`, and `src/shared/README.md`. The login rules
      of `src/app/README.md` moved to `src/app/login-data.md`, because the
      README passed 300 lines. `src/shared/README.md` needed no change: it
      states the contracts of Milestone 4, and names no code of the app.
- [x] Check the changed screens in a browser against the mockups.

Evidence: `.context/org-shared-logins/m6/` holds the screenshots of the
browser check in `screens/`, the screenshots of the mockups in `mockups/`,
the check logs, and the failure proofs of the tests.

## Milestone 7: Verification, commit, review, and pull request

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

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, connect an org login as an admin. Then send a
      first message as a member with no login of their own.
