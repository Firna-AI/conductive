# Logins shared with an org

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
16 November 2026 the user chose decisions 1 to 3 below. The user also
said: "if an org has a shared credential, the user does not need to enter
their own credentials at all". Decision 4 records that rule.

This change lets a member share an API key or an own endpoint login with
each of their orgs. Other members of such an org start their own
sessions and workspaces on it. A member with a usable shared login needs
no login of their own. The change does not cover Claude subscription
tokens or ChatGPT sign-ins, logins that an org owns, use counts, limits,
or admin control of endpoints.

Contract owners:

- [Tokens and secrets](../docs/protocol/tokens-and-secrets.md).
- [Isolation](../docs/protocol/isolation.md), "Agent logins in a sandbox".
- [Agents and sessions](../docs/protocol/agents-and-sessions.md).
- [Own endpoint logins](../docs/protocol/own-endpoint-logins.md).
- [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- [Orgs and members](../docs/protocol/orgs-and-members.md).
- [Routines](../docs/protocol/routines.md) and
  [Routine runs](../docs/protocol/routine-runs.md), for decision 5.
- [Session calls](../docs/protocol/session-calls.md), for the agent tools.
- The [model gateway](../docs/protocol/model-gateway.md).
- The [mockup catalogue](../docs/mockups/catalogue.md),
  [Orgs, members, and logins](../docs/mockups/orgs-and-logins.md), and
  [Own endpoint logins](../docs/mockups/own-endpoint-logins.md).
- The legal pages `src/marketing/terms.ts` and `src/marketing/privacy.ts`,
  and the public guides in `src/marketing/docs/`.

Replaced ways:

- The share setting `agent_logins.no_reuse` of an API key or an own
  endpoint login → one share for each org, in a new table. Consumers:
  `senderLoginAccess` in `worker/chat/queries.ts`, `readLoginMetadata` in
  `worker/chat/login-availability.ts`, `SessionLogins.observe` in
  `worker/chat/session-login.ts`, `worker/app-api/account-data.ts`, the
  defaults `defaultAgentLoginNoReuse` in `src/shared/account.ts`,
  `setNoReuse` of the account store, and `LoginShareSetting.tsx`. Moved in
  Milestones 3, 4, and 5. The `no_reuse` value of API keys and own
  endpoints is deleted in Milestone 3. The column stays for subscription
  tokens and ChatGPT sign-ins, by decision 2.
- The starter of a session as the source of its login → the login owner
  of the session. Consumers: `worker/chat/session-login.ts`,
  `worker/model-gateway/workspace.ts`, `worker/chat/delivery-state.ts`,
  `worker/chat/model-changes.ts`, the targets of `readLoginMetadata`, and
  `src/chat/state/session-login.ts`. Moved and deleted in Milestones 4
  and 5.
- Two share checks, the `reuseDenied` query of `senderLoginAccess` and the
  check of `SessionLogins.observe` → one access rule in one helper.
  Moved and deleted in Milestone 4.

## Terms

- **Agent login:** the key, token, or sign-in that a turn of an agent
  runs on. Rows live in the D1 table `agent_logins`, one for each member
  and agent.
- **Own endpoint login:** an agent login that holds the address of a
  gateway or a proxy that its owner chose, and its key.
- **Shareable login:** an API key or an own endpoint login. Only these
  logins can be shared with an org.
- **Org share:** the owner's choice that the members of one org may use a
  shareable login.
- **Login owner:** the member whose login a session runs on. Before this
  change, it was always the starter.
- **Default login:** the login that a member's new session takes, by the
  rule of decision 6.
- **Share switch:** today's account setting "Let other members use this
  login", stored in `agent_logins.no_reuse`.

## Decisions

The options check of decisions 5 and 6 ran on 16 November 2026. Its
report is in `.context/org-shared-logins/options-check-decisions-5-6.md`.

### 1. Who owns a login that the org can use

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/agents-and-sessions.md:26-28`,
  `docs/protocol/own-endpoint-logins.md:26-27`,
  `worker/chat/session-login.ts:59-65`, and
  `worker/chat/first-message.ts:117-125`.
- **Background:** Each option makes a session record the login that it
  starts on, and keep it. That keeps the prompt cache, the reason of
  decision 105. The gateway still adds the key in the Worker, so the key
  never reaches a cloud computer.
- **Problem:** No rule lets a member start work on a login that another
  member or the org owns.
- **Impact if no action:** A teammate without a key cannot use the app,
  also when a colleague wants to lend one.
- **Root question:** How does a member run agents on an API key or an own
  endpoint that someone else made available to the org?
- **Options:**
  - **A.** The owner gets one share switch for each of their orgs under
    each shareable login. A member of such an org starts sessions on it.
    The composer names it, such as "Cal's login". It changes decisions 105
    and 116. The owner's account pays for all use. Effort: Large.
  - **B.** An admin connects an API key or an endpoint in the org
    settings. It stays when that admin leaves. It changes decision 21 and
    adds a new store of org secrets. Effort: Large.
  - **C.** Both A and B, on one model where a member or the org owns each
    login. Effort: Large.
- **Left out:**
  - Change nothing: it fails the goal.
  - Org env vars that set up the agents: they put the key in the sandbox,
    against decision 120.
  - The workspace owner's login for every session: a member still cannot
    start a workspace.
  - A copy of the shared login in each member's account: a copy keeps
    working after the owner stops sharing.
  - Subscriptions too: the consumer terms forbid it.
- **Wider fix:** None. This is a new feature.
- **Previous examples:** Decision 502 E offered an org login for
  routines. The user chose 502 B on 8 November 2026. Decision 105 H
  offered the workspace owner's login. The user chose F on 7 November
  2026.
- **Recommendation:** A. It does what the user asked, and the owner can
  stop it at any time.
- **Decision:** The user chose A on 16 November 2026.

### 2. Today's share switch

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/shell/account/LoginShareSetting.tsx`,
  `worker/chat/queries.ts:180-181`, and
  `plans/follow-ups/remove-share-switch.md`.
- **Background:** The share switch lets other members continue the
  owner's sessions in all of the owner's orgs. API keys and own endpoints
  are shared by default.
- **Problem:** With decision 1 A, two kinds of sharing would exist.
- **Impact if no action:** Members see two controls with overlapping
  meanings.
- **Root question:** How does an owner control all use of their login by
  others?
- **Options:**
  - **a.** One switch for each org covers new sessions and continuations.
    Each switch starts off. Today's "on" values reset to off.
    Subscription tokens and ChatGPT sign-ins keep today's switch until
    the removal item is decided. Effort: Small.
  - **b.** As a, but a switch that is on today becomes "shared with every
    current org". Use grows to new sessions without the owner's choice.
    Effort: Small.
  - **c.** Keep today's switch for continuations, and add a share for each
    org for new sessions. Effort: Small.
- **Left out:** None.
- **Wider fix:** a. One control removes the overlap.
- **Previous examples:** Decision 116, and
  `plans/follow-ups/remove-share-switch.md`.
- **Recommendation:** a. It gives one control, and no use happens that
  the owner did not choose.
- **Decision:** The user chose a on 16 November 2026. This changes own
  endpoint decision 4: a new API key or own endpoint is not shared by
  default. It also answers option B of
  `plans/follow-ups/share-setting-spans-all-orgs.md`.

### 3. Models of a shared endpoint

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `docs/protocol/own-endpoint-logins.md:49-51`.
- **Background:** The picker of an endpoint's owner hides the models that
  the endpoint does not list. The pickers of other members show every
  model.
- **Problem:** A member on a shared endpoint can pick a model that fails.
- **Impact if no action:** Some turns fail, and the cause names the model.
- **Root question:** Which models does a member see when they use someone
  else's endpoint?
- **Options:**
  - **A.** The picker follows the last model list of the endpoint, as it
    does for the owner. Effort: Small.
  - **B.** Keep every model. Effort: Small.
- **Left out:** None. Only two real choices exist.
- **Wider fix:** None.
- **Previous examples:** Own endpoint decision 5.
- **Recommendation:** A. A member then picks only models that work.
- **Decision:** The user chose A on 16 November 2026.

### 4. A shared login replaces the member's own login

- **Source:** Design. The user stated this rule on 16 November 2026: "if
  an org has a shared credential, the user does not need to enter their
  own credentials at all".
- **Rule:** In an org with a usable shared login for an agent, a member
  with no login for that agent works as if they had one. The agent step
  of Get started is complete. The composer, the new workspace form, and
  the agent tools show no Connect notice and refuse no message for a
  missing login.

### 5. Routine runs of an owner without a login

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/routines.md:81-83` and `:94-95`,
  `docs/protocol/routine-runs.md:34-43`, and
  `worker/routines/run-starter.ts:69`.
- **Terms:**
  - **Routine:** a saved prompt that starts a workspace on a schedule or
    a GitHub event, with no person watching. Its owner is the member who
    created it.
- **Background:** A routine run starts its first session as the routine
  owner, on the owner's own login. `docs/protocol/routine-runs.md:41-42`
  takes that rule from decision 105, the login of the starter, and
  decision 50, pushes as the sender. This plan separates the login owner
  from the starter, so the reason from decision 105 is gone. The reason
  from decision 50 still holds for GitHub access. The routines doc
  rejects "org routines on an agent login of the org". Today a run of an
  owner without a login stops with `agent_login_required`.
- **Problem:** Decision 4 says that a member with a shared login needs no
  own login. No rule says whether a routine run of such a member can use
  the shared login.
- **Impact if no action:** A member who relies on a shared login can save
  a routine whose runs all fail.
- **Root question:** May a routine run, which no person watches, spend a
  login that another member shared with the org, and who decides that?
  The options check of 16 November 2026 wrote this root question in place
  of "Which login does a routine run use when its owner has no login of
  their own?".
- **Options:**
  - **A.** A run takes the owner's default login, as a new session of the
    owner does. So a run can use a login shared with the org. The sharer's
    key then pays for runs that no person watches. Effort: Small.
  - **B.** A run uses only the owner's own login. The routine form warns
    an owner without one, and runs fail as today. Effort: Small.
  - **C.** The org share has a second switch that allows routines. A run
    uses a shared login only when its owner allowed routines. It adds a
    control and a mockup state. Effort: Medium.
  - **D.** The routine saves the login of its runs. The form selects the
    owner's default login first and offers each other usable login. A run
    uses the saved login, and fails with a cause when that login is no
    longer usable. Cost: a migration, and a form control with mockup
    states. Risk: a saved shared login keeps paying after the owner
    connects their own login, until the owner edits the routine.
    Effort: Medium.
  - **E.** As A. The sharer's account page also lists the routines whose
    runs use each org share, with their owners. Cost: an account query and
    a mockup state. It is a view of use, which this plan otherwise leaves
    out. Effort: Medium.
- **Left out:** A spend cap, because the owner can limit spend at the
  provider or at the endpoint, and limits are out of scope. An org login
  for routines, because decision 1 A chose logins that members own.
- **Assumptions:** Each option takes the run's login when the run starts,
  except D. The sessions that a run's agent starts through the agent
  tools take the owner's default login under every option. So B and C
  also need the same limit on those tool calls.
- **Wider fix:** A. One default login rule serves sessions, the agent
  tools, and routines.
- **Previous examples:** Decision 502 B chose who sees and changes a
  routine. Decision 502 E, an org login for routines, was not chosen.
- **Recommendation:** A. It follows the rule of decision 4, and the sharer
  can stop it at any time with the org share.
- **Action:** ask the user, because the options change the routine run
  rule of `docs/protocol/routine-runs.md`, and the options have real
  trade-offs on unattended spend.

### 6. A member with more than one usable login

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/chat/first-message.ts:117-125` and
  `docs/protocol/messages-and-attachments.md`.
- **Background:** After decision 1 A, a member can have an own login and
  one or more logins that other members shared with the org, for the
  same agent.
- **Problem:** No rule says which login a new session of that member
  takes.
- **Impact if no action:** The implementation picks a rule that the user
  did not choose. A member can spend a colleague's key without knowing it.
- **Root question:** Which login does a member's new session use, when
  more than one login can serve it?
- **Options:**
  - **A.** The member's own login comes first. Without one, the session
    takes the shared login whose org share is oldest. A member who wants
    the shared login must remove their own. Effort: Small.
  - **B.** As A for the default. The composer and the new workspace form
    get a login menu, so the member can choose any usable login for a new
    session. It adds a control and mockup states. Effort: Medium.
  - **C.** As A for the default. The account page gets one setting for
    each org that names the member's default login there. Effort: Medium.
  - **D.** The shared login comes first, before the member's own login,
    as a fixed rule. Cost: a lent key also pays for members who have
    their own login. Effort: Small.
  - **E.** Each org share gets a second setting. The share serves only
    members without their own login, as in A, or every member before their
    own login. Cost: a control and a mockup state on the share.
    Effort: Medium.
  - **F.** This works with each rule above. The account response names
    the default login for each org and agent, from the Worker's resolver.
    The composer, the new workspace form, the routine form, and Get
    started show that value. They do not compute the order themselves.
    Cost: one more field in a planned response. Effort: Small.
- **Left out:** An org default that an admin sets, because admin control
  is out of scope and E gives the same effect through the sharer. Another
  fixed order of several shared logins, because the oldest share is the
  only order that a new share never changes.
- **Assumptions:** Each option keeps one login for the life of a session,
  by decision 105. An own login that the app can no longer use counts as
  none, so the session falls back to a shared login.
- **Wider fix:** F. One source of the default serves each rule, so a later
  move to B, C, D, or E needs no second copy of the order in the browser.
- **Previous examples:** None found.
- **Recommendation:** A with F. A meets the goal with no new control, and
  F makes every screen name the login that the Worker picks. The first
  recommendation was A alone. The options check of 16 November 2026 added
  F.
- **Action:** ask the user, because B and C add new controls, and no
  option is clearly best until members use the feature.

## Design calls

Each call is the agent's call, made on 16 November 2026.

- A session takes its login owner when it accepts its first message. A
  session with no message that changes its agent takes the login owner
  of the new agent. Reason: the default login of decision 6 can change
  between a "+" and the first message.
- A stored session without a login owner reads its starter, in
  `normalizeSession` of `worker/chat/session-storage.ts`. Reason: that
  function already gives a default to each stored field that an older
  record lacks.
- A message of another member runs on the login owner's login while that
  login can serve the sender: the sender is the owner, or the owner shares
  it with the org of the workspace. For a subscription token or a ChatGPT
  sign-in, today's share switch still decides. Otherwise the message
  starts a linked session on the sender's default login, as today.
- Every member may share their own shareable logins. Reason: an admin gate
  would be a new restriction.
- Only the owner changes an org share. Removing the login or changing its
  kind to a subscription token or a ChatGPT sign-in deletes its org
  shares. A save of the same kind keeps them. A change between an API key
  and an own endpoint keeps them too. Reason: the owner chose the org, not
  the secret.
- When the owner leaves an org or is removed, the Worker deletes the
  owner's shares with that org. The checks at use still require the
  owner's membership and no suspension, as today.
- A member sees the owner's name, the agent, and the kind of each login
  that is shared with the org. A member never sees the key or the address.
  Reason: own endpoint decision 5.
- The workspace checks the access rule when it accepts each message and
  before it gives the credential of a turn to the runner, as today. A
  running turn finishes after the owner stops sharing. The gateway still
  checks membership only, at each request. Reason: a check at each
  gateway request would be a new rejection.
- The agent tools follow the default login of the sender when a call
  starts a session.
- One helper decides whether a login can serve a sender in a workspace.
  Each caller uses it.
- No use counts, limits, or admin view in this change. The open items
  `plans/follow-ups/org-control-of-own-endpoints.md` and
  `plans/follow-ups/member-changes-session-choice.md` stay open.

## Components

- D1: a table `agent_login_shares` with `user_id`, `agent`, `org_id`, and
  `created_at`, keyed by all three, with a foreign key to `agent_logins`
  that cascades on delete. It holds no secret.
- Account API: the account response gives each shareable login the IDs of
  its shared orgs. A route sets or clears one org share. The account
  response also lists each login that another member shares with one of
  the viewer's orgs: the org, the owner, the agent, the kind, and, for an
  endpoint, the model list of decision 3. It names the default login for
  each org and agent, from the Worker's resolver, by decision 6 F.
- Session: a `loginOwner` field next to `startedBy` in
  `src/shared/sessions.ts`.
- Worker: one default login resolver and one access helper in
  `worker/chat/`, which the first message, the send, the linked session,
  the agent tools, the gateway, the Get started data, and routine runs
  use.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The account page, the composer, the new workspace form, Get started, and
the model picker change. Mockups follow the
[mockups README](../docs/mockups/README.md).

- [ ] Account page, `app/account/agents`: under each API key and own
      endpoint login, one share switch for each org of the owner, with
      the org name. A subscription token and a ChatGPT sign-in keep
      today's switch.
- [ ] Account page: a state where one org share does not save, from
      `app/account/share-not-saved`.
- [ ] Account page: a list of the logins that other members share with
      the viewer's orgs, with the org, the owner, the agent, and the kind.
- [ ] Get started, `app/account/setup`: the agent step is complete with
      only a shared login, and it names that login.
- [ ] Composer: a new session of a member without an own login names the
      shared login, such as "Cal's login", from `app/composer/login`.
- [ ] Composer: the `app/composer/not-shared` notice when the login owner
      stops sharing with the org.
- [ ] New workspace form: no Connect notice with a shared login.
- [ ] Model picker: a session on a shared endpoint shows only the models
      of its last list, from `app/account/endpoint-models`. The routine
      form does the same for a run on a shared endpoint.
- [ ] Routine form: the state that decision 5 chooses.
- [ ] Update `docs/mockups/catalogue.md`,
      `docs/mockups/orgs-and-logins.md`, and
      `docs/mockups/own-endpoint-logins.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state decisions 1 to 6 and the design calls that set
requirements. The legal pages and the guides follow.

- [ ] `docs/protocol/agents-and-sessions.md`: each session runs on the
      login of its login owner. The starter never changes.
- [ ] `docs/protocol/isolation.md`: the org shares, the access rule,
      the defaults of decision 2, and the risks of a shared key.
- [ ] `docs/protocol/tokens-and-secrets.md`: a shareable login also serves
      the sessions of members of the orgs it is shared with.
- [ ] `docs/protocol/own-endpoint-logins.md`: drop the rejection of an
      org endpoint that cites decisions 21 and 105. State decision 3 and
      the new default of decision 2.
- [ ] `docs/protocol/messages-and-attachments.md`: the default login of
      decision 6 and the linked session. Under decision 6 A, the ChatGPT
      recovery cause at lines 144-146 also says that a shared OpenAI key
      serves the member only after they remove their ChatGPT sign-in.
- [ ] `docs/protocol/orgs-and-members.md`: logins and org shares, and
      the share removal when a member leaves.
- [ ] `docs/protocol/routines.md` and `docs/protocol/routine-runs.md`:
      decision 5.
- [ ] `docs/protocol/session-calls.md`: the agent tools use the default
      login of the sender.
- [ ] `docs/protocol/model-gateway.md` and
      `docs/protocol/model-gateway-requests.md`: the login owner of the
      session.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update each sentence that restates a changed fact, such as
      "Each session uses the login of the member who started it".
- [ ] Read each guide in `src/marketing/docs/` in full, at least
      `agent-logins.md`, `get-started.md`, `sessions-and-chat.md`,
      `security.md`, and `overview.md`. Update each sentence that
      restates a changed fact.
- [ ] Update the rows of `src/marketing/from-conductor/areas/cloud.ts:86`
      and `plans-and-pricing.ts` that the change makes wrong.
- [ ] Follow-up items: delete
      `plans/follow-ups/share-setting-spans-all-orgs.md`, which decision 2
      answers. Limit `plans/follow-ups/remove-share-switch.md` to
      subscription tokens and ChatGPT sign-ins. Update the background of
      `login-rotation-resets-share-setting.md`,
      `login-replacement-sharing-choice.md`,
      `org-control-of-own-endpoints.md`, and
      `member-changes-session-choice.md`.
- [ ] Update `worker/README.md`, `worker/chat/access.md`, `src/app/README.md`,
      and `src/chat/README.md`, when they describe the share switch or the login
      of a session.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Org shares in the data and the account API

Depends on: 2

- [ ] Add the migration for `agent_login_shares`. Set `no_reuse` to its
      default for every API key and own endpoint row, and stop reading it
      for those kinds.
- [ ] Remove a member's shares with an org when the member leaves or is
      removed. Delete the shares on a kind change to a subscription token
      or a ChatGPT sign-in.
- [ ] Account API: the org IDs of each shareable login, the route that
      sets or clears one org share, and the logins shared with the
      viewer's orgs. No response holds a key or an address.
- [ ] Remove the API key and own endpoint entries of
      `defaultAgentLoginNoReuse`.
- [ ] Tests: share, unshare, a share with an org of which the owner is not
      a member, leave, kind change, and a response with no secret.

## Milestone 4: Sessions and turns on a shared login

Depends on: 3

- [ ] Add `loginOwner` to the session, and its default in
      `normalizeSession`.
- [ ] Add the default login resolver of decision 6 and the access helper.
      Delete the `reuseDenied` query and the second check in
      `SessionLogins.observe`.
- [ ] Move the first message, the send, the linked session, and
      `worker/chat/tool-session-write.ts` to the resolver. A member with
      only a shared login is not refused.
- [ ] Move `worker/model-gateway/workspace.ts`,
      `worker/chat/delivery-state.ts`, `worker/chat/model-changes.ts`, and
      `readLoginMetadata` to the login owner.
- [ ] Move `worker/app-api/get-started-data.ts` to decision 4.
- [ ] Move `worker/routines/run-starter.ts` to decision 5.
- [ ] Tests: a first message on a shared login, a continuation by another
      member, an unshare during a waiting message, a turn after the owner
      leaves, decision 6 order, decision 5, and an older stored session.

## Milestone 5: Account page, composer, and Get started

Tags: ui

Depends on: 1, 4

- [ ] Replace `LoginShareSetting` for shareable logins with the org
      switches of the mockup. Keep it for the other kinds.
- [ ] Show the logins that other members share with the viewer's orgs.
- [ ] Move `src/chat/state/session-login.ts` and the composer blockers to
      the login owner and decision 4.
- [ ] Move `src/app/setup-steps.ts` to decision 4.
- [ ] Make the model picker follow the list of a shared endpoint, by
      decision 3. This includes the routine form, whose picker follows only
      the owner's own lists at `src/shell/routines/RoutineEditor.tsx:72`.
- [ ] Show the default login from the account response. Do not compute
      the order in the browser.
- [ ] Check the changed screens in a browser against the mockups.

## Milestone 6: Verification, commit, review, and pull request

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

- [ ] On the test deployment, share an API key with an org. Then send a
      first message as a member with no login of their own.
