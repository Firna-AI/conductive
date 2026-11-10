# Own Endpoint Logins

Status: Active. On branch `calummoore/cli-proxy-setup`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductive connects Claude with a `claude setup-token` token or an
Anthropic API key, and Codex with an OpenAI API key. The runner always
sends the agents to Anthropic and OpenAI. So a user who runs their own
model endpoint cannot use it. An example is a CLIProxyAPI server that
pools several Claude and ChatGPT subscriptions behind one key. Cal uses
such a proxy with Conductor today.

This change adds an own endpoint login, as Cal chose for decision 1 on
8 November 2026. For each agent, a user saves an endpoint and a key. The
app stores them encrypted, for each user. The runner sends the key on the
private login routes that exist, and it sets the endpoint itself. Each
session still runs on the login of its starter. The change does not cover
a manual mode that uses the cloud computer's own setup, or per-user agent
settings. The brainstorm notes, the transcripts, and the check scripts are
in `.context/cli-proxy-logins/` and `.context/own-endpoint-logins/`.

On 10 November 2026 this branch was replayed onto `main`, which now holds
the model gateway (pull request #173). A runner of protocol 2 gets only a
turn token, and the gateway in the Worker adds the real login. Cal chose
there that own endpoints run only through the gateway (gateway decision
10 B), and that Claude reaches the gateway through a profile (gateway
decision 11 K). So the runner never gets an own endpoint or its key. The
gateway forwards each model request to the endpoint, as
`plans/follow-ups/own-endpoints-through-model-gateway.md` says. This plan
takes over that follow-up item and deletes it when the work is done.
The runner work of Milestones 3 and 3b is superseded, and the docs of
Milestone 2 move to the split protocol pages in Milestone 2b. The branch
before the replay is the local branch
`backup/cli-proxy-setup-before-rebase` at `978941df`.

Contract owners:

- [Tokens and secrets](../docs/protocol/tokens-and-secrets.md), the
  section "Agent logins".
- [Isolation](../docs/protocol/isolation.md), the section "Agent logins
  in a sandbox".
- [Model gateway](../docs/protocol/model-gateway.md).
- [Deployment inputs](../docs/deployment.md), the section "Models".
- [Data and trust](../docs/architecture/data-and-trust.md) and
  [Flows](../docs/architecture/flows.md) of the architecture.
- The account, composer, and Get started mockups, and
  [Orgs and logins](../docs/mockups/orgs-and-logins.md).

## Decisions

### 1. Choose how agents reach a user's own endpoint

Added on 8 November 2026 from Cal's request to select a manual mode or to
set up a CLI proxy, as in Conductor.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `runner/src/providers/environment.ts:22`,
  `runner/src/providers/codex.ts:45`, `runner/src/providers/claude.ts:65`,
  `src/shell/account/AgentConnectForm.tsx`, and "Agent logins" in
  `docs/protocol/access-and-security.md`.
- **Background:** The runner removes each `ANTHROPIC_*` and `OPENAI_*`
  variable, reads only the repository's Claude settings, and fixes Codex's
  endpoint to `https://api.openai.com/v1`. Cal's Conductor setup sends
  both programs to a CLIProxyAPI server with one key.
- **Problem:** A user cannot send the agents to their own endpoint. So
  Codex cannot use a ChatGPT subscription.
- **Impact if no action:** Cal must use a setup token and an OpenAI API
  key, without the pooled accounts of the proxy. Conductor Cloud shuts
  down on 20 November 2026.
- **Root question:** How does a user run Claude and Codex through their
  own endpoint, such as a CLI proxy?
- **Options:**
  - **A.** Own endpoint login. Each agent gets a new login kind with an
    endpoint and a key, stored encrypted for each user. The runner sends
    the key on the private routes and sets the endpoint. Cost: no extra
    headers, WebSockets, Bedrock, or Vertex. Effort: Medium.
  - **B.** Manual mode, as in Conductor. The app sends no login, and the
    org's startup script and env vars set up both programs. Cost: only an
    admin changes the setup, and the key is in every process of the org's
    cloud computers. Effort: Medium.
  - **C.** Own agent settings for each user, which the runner applies to
    that user's sessions. Cost: free-form settings are hard to check and
    support. Effort: Large.
  - **D.** A model gateway in the Worker, with the user's endpoint as one
    more upstream. No key enters the cloud computer. Cost: each model
    request passes through the Worker. Effort: Large.
- **Left out:** Change nothing, because no supported path exists. One
  endpoint for the whole org, because decisions 21 and 105 of
  `plans/boat-native-remote-workspaces.md` make each login personal.
  ChatGPT sign-in for Codex, because it serves one account, not a proxy.
- **Wider fix:** D.
- **Previous examples:** Decision 24 of
  `plans/boat-native-remote-workspaces.md` rejected a sign-in inside a
  cloud computer. Its decision 120 chose the Worker proxy as a later
  follow-up. Conductor runs Codex in a user-managed mode.
- **Recommendation:** A. It reaches the proxy through the existing
  private routes, and each login stays personal.
- **Chosen:** A, by Cal on 8 November 2026. Cal also started D in
  Conductor workspace `4ff77a00-ba3c-4868-ab94-da6015fa06a3`, "model-gateway:
  Worker model proxy (decision 120)", and owns it from the start.
- **Changed on 10 November 2026:** D merged into `main`. Cal chose there
  that own endpoints run only through the gateway (gateway decision 10 B).
  So the login kind of A stays, but the gateway, not the runner, sends
  each request to the endpoint.

### 2. Choose which endpoint addresses to accept

Added on 8 November 2026 with decision 1. The options check of 8 November
2026 added options D and E, and it changed the recommendation from B to D.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** None. It is a new field of the login save.
- **Background:**
  - Options A, C, and D of decision 1 store an endpoint with the key. No
    login has an endpoint today, so no rule for one exists.
  - Cal's proxy address is an `https://` address with no path, user name,
    query, or fragment, so every option accepts it.
  - The pinned `claude` program joins the endpoint and the request path
    into one address. So a query or a fragment in the endpoint breaks the
    request path, as the options check read in the program.
  - The model gateway of decision 1 D will call the saved address from
    the Worker. The Worker cannot reach a loopback address in a cloud
    computer.
- **Problem:** An `http://` endpoint on the internet sends the key, the
  messages, and the files as plain text. A user name or a password in the
  address is a second secret.
- **Impact if no action:** If a user saves an `http://` address, the key
  and the code can be read on the network path.
- **Root question:** Which addresses may receive a user's key and turn
  data, from the runner now and from the Worker later?
- **Options:**
  - **A.** Any `http://` or `https://` address. Risk: the plain-text leak
    above. Effort: Small.
  - **B.** `https://` addresses, and `http://` only for a loopback
    address, such as a proxy inside the cloud computer. Effort: Small.
  - **C.** `https://` addresses only. Effort: Small.
  - **D.** As C, and refuse an address with a user name, a password, a
    query, or a fragment, as `worker/lifecycle/image-software.ts` does for
    the runner archive. Cost: an endpoint that needs a query parameter
    cannot be saved, and the `claude` program cannot call one anyway.
    Effort: Small.
  - **E.** As D, and refuse loopback, private, link-local, and unspecified
    addresses, cloud metadata names, and the app's own hostnames. It fits
    options B and C of decision 3, which make the Worker call the address.
    Cost: a check at save cannot see a public name that later points to a
    private address, so each Worker call still needs its own guard.
    Effort: Medium.
- **Left out:**
  - `http://` for a private address that is not loopback, such as a VPN.
    The app cannot tell an encrypted path from a shared network, so it
    fails the goal.
  - A warning that the user confirms, in place of a refusal. The warning
    does not stop the plain-text send, and the files of each turn belong
    to the org, not only to the member who confirms.
  - All options assume that `https://` protects the key on the network
    path. That holds only while the agent program checks certificates. An
    org env var can turn those checks off, as
    `plans/follow-ups/org-env-turns-off-agent-tls-checks.md` says.
- **Wider fix:** None, because the rule is in one save route.
- **Previous examples:** `worker/security/app-origin.ts` and
  `worker/invitation-mailer.ts` accept `http:` only for `localhost`,
  `127.0.0.1`, and `[::1]`. `worker/lifecycle/image-software.ts` accepts
  only an `https:` address with no user name, password, query, or fragment.
- **Related:** Decision 3. Its options B and C make the Worker call the
  endpoint, so they need option E here. The model gateway workspace will
  call the same saved address from the Worker.
- **Recommendation:** D. It was B before the options check. Cal's proxy
  meets D, and the model gateway can keep D. A later move from D to B
  breaks no saved login, but a move from B to C does. A loopback login
  under B serves all orgs of its user (decision 21 of
  `plans/boat-native-remote-workspaces.md`), but it works only where a
  startup script runs that proxy.
- **Action:** ask the user, because the option adds a new rejection, and
  the always-on rules require the user's approval for that.
- **Chosen:** B, by Cal on 9 November 2026. The options check had
  recommended D. So the save refuses an `http://` address unless its host
  is `localhost`, `127.0.0.1`, or `[::1]`. A user name, a password, a
  query, or a fragment is not refused. When the model gateway of decision
  1 D lands, a loopback endpoint cannot go through the Worker.
- **Revisited:** the gateway is on `main` since 10 November 2026, and it
  forwards only to public https addresses. Decision 9 asks again.

### 3. Choose how the app knows the models of an own endpoint

Added on 8 November 2026 from Cal's question "how do we know the model
names?". The options check of 8 November 2026 added options E, F, and G,
and it kept the recommendation.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/app-api/models.ts`,
  `src/chat/components/ModelPicker.tsx`, and "Models" in
  `docs/deployment.md`.
- **Terms:**
  - **Operator model list:** the models that the app offers, from
    `CONDUCTIVE_MODELS`, each with an ID, a label, and its efforts.
  - **Known ID:** a model ID that the pinned agent program has built-in
    data for, such as `claude-opus-5-5` or `gpt-6.1-sol`.
  - **Fallback metadata:** the defaults that an agent program uses for a
    model ID that it does not know.
- **Background:**
  - The picker shows only the operator model list. The Worker accepts any
    model ID in a message, and the runner passes it on unchanged.
  - Local check: for a known ID, `claude` asks for up to 128,000 output
    tokens. For an unknown ID, it asks for 32,000 and drops one beta
    feature. It still sends the effort and thinking settings.
  - Local check: Codex runs an unknown ID with fallback metadata, and it
    warns that this "can degrade performance and cause issues".
  - The pinned `claude` program has a setting that gives an unknown ID
    the handling of a known model: `behavesAs` on a model picker row.
    Codex can load model data from a file: `model_catalog_json`. No check
    ran either setting yet.
  - In a turn, `claude` asks the endpoint only for the chosen model. On an
    endpoint that is not Anthropic's, its small fast model falls back to
    the session model, as the options check read in the program.
  - An endpoint lists its models at `GET /v1/models`. The Anthropic form
    gives the ID, a display name, and token limits. The OpenAI form gives
    the ID only. Neither form gives effort levels.
  - Cal's proxy lists the four IDs of the operator model list, and 30
    more.
- **Problem:** The app cannot know which models an own endpoint serves.
  A model that the endpoint lacks fails only when its turn starts.
- **Impact if no action:** The plan cannot say what the picker shows for
  an own endpoint login.
- **Root question:** Which models can a session on an own endpoint run,
  and where does the app get the ID, the label, the efforts, and the agent
  handling of each one?
- **Options:**
  - **A.** The operator model list only. An own endpoint must serve its
    IDs. The app makes no call to the endpoint. A missing model fails in
    its turn, and the chat says "The selected model is unavailable. Choose
    another model." Effort: Small.
  - **B.** As A, and the Worker reads the endpoint's model list when the
    user saves the login. The account page warns about each operator
    model that the endpoint lacks. Cost: the Worker calls an address that
    a user chose, which needs option E of decision 2, and the list can
    change after the save. Effort: Medium.
  - **C.** As B, and the picker also offers the other models of that list
    for sessions on this login. Cost: the app knows no efforts for them,
    and an unknown ID runs with fallback metadata. A known but unlisted
    ID, such as `gpt-5.6-sol`, keeps every feature. Effort: Large.
  - **D.** As A, and the user can add model IDs to the login by hand,
    each with a label and efforts. Cost: a typing error shows only in a
    turn, and an unknown ID runs with fallback metadata. Effort: Medium.
  - **E.** As D, and each added ID names a known model that it behaves
    as. Its label and efforts start as that model's. The runner gives the
    program the handling of that model: `behavesAs` for Claude, and a
    `model_catalog_json` entry for Codex. Cost: no check ran these
    settings, and a typing error still shows only in a turn. Effort:
    Large.
  - **F.** Aliases. For each operator model, the login can name the
    endpoint's own ID. The picker keeps the operator list. The runner
    sends the alias with the handling of the known model, through the
    settings of E. Cost: the checks of E, and a wrong alias shows only in
    a turn. Most proxies can rename models themselves. Effort: Large.
  - **G.** In a turn, the runner reads the endpoint's model list with the
    key of the turn, and it reports the IDs. The account page then warns
    about each operator model that the endpoint lacks. Cost: the warning
    comes only after the first turn, and a process in the sandbox can send
    a false report, so the report is advice only. The Worker calls no
    address that a user chose. Effort: Large.
- **Left out:**
  - The browser reads the list at save. The content security policy lets
    the pages call only their own origin and the app origin.
  - All options keep the operator model list as the base list, as
    decision 138 of `plans/boat-native-remote-workspaces.md` chose. It
    holds, because Cal's proxy serves all four IDs.
- **Wider fix:** None. F shows that a rename can live in the runner, and
  the model gateway of decision 1 D could also rename. Both need a model
  mapping from the user.
- **Previous examples:** Decision 138 of
  `plans/boat-native-remote-workspaces.md` chose the models of the
  operator model list. The pinned `claude` program reads
  `<endpoint>/v1/models?limit=1000` when
  `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` is set. It keeps the IDs
  that contain "claude" or "anthropic", and it adds them only to its own
  picker. Other tools take model names from a typed list (Zed, Cline,
  Continue), from the endpoint's `GET /v1/models` (Continue, LibreChat,
  Open WebUI), or from a catalog that the endpoint serves (Codex). They
  take capabilities from a built-in table keyed by the ID, from user
  settings, or from that catalog. Anthropic's own model list gives effort
  and thinking capabilities, but LiteLLM and CLIProxyAPI give none. The
  research and its sources are in
  `.context/own-endpoint-logins/prior-art.md`.
- **Related:** Decision 2. Options B and C here need its option E. A
  model that C, D, or E adds belongs to one login. A linked session of
  decision 115 of `plans/boat-native-remote-workspaces.md` runs on the
  login of another member, which may not have that model.
- **Recommendation:** A, as before the options check. Known IDs keep
  every feature with no new settings, Cal's proxy serves all four IDs,
  and the app calls no address that a user chose. B fits the model gateway
  better, because the gateway must call that address anyway.
- **Action:** ask the user, because Cal asked to choose how the app knows
  the model names.
- **Chosen:** A, by Cal on 9 November 2026, in the words "how does
  Conductor do it". Conductor keeps its own model list and sends each ID
  unchanged to the endpoint that the computer's own setup names. Its
  session records show this: a Claude session asked for `opus-5-5-1m` and
  ran `claude-opus-5-5`, and a Codex session ran `gpt-6.1-sol` on the
  `cliproxyapi` provider of Cal's `~/.codex/config.toml`. Cal also showed
  Amp's custom URL form. It has an API format, headers, a list of its
  known models to tick, and metadata overrides. Cal said that the app may
  not need to be that complicated.
- **Note of 10 November 2026:** the gateway now calls the endpoint for
  each model request of a turn. It still never reads the endpoint's model
  list, as main's follow-up item also says.

### 4. Choose whether an own endpoint login is shared by default

Added on 9 November 2026, after the merge of `main` brought the share
setting of each login. The options check of 9 November 2026 added options
D, E, and F, and it changed the recommendation from A to D.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `saveAccountLogin` in `worker/app-api/account-data.ts:84`,
  `noReuseOf` in `src/app/dev/account-routes.ts`, and "Agent logins in a
  sandbox" in `docs/protocol/access-and-security.md`.
- **Terms:**
  - **Share setting:** the setting of each agent login that says whether
    the messages of other members can run on it. The account page shows
    it. The column is `no_reuse` of `agent_logins`.
- **Background:**
  - Each session runs on the login of its starter. When the starter does
    not share the login, a message of another member starts a new session
    on that member's own login, without the history.
  - The kind of a login sets the default of its share setting (decision
    116). A new Claude subscription login does not share. A new API key
    shares. A login whose kind changes gets the default of its new kind.
  - The protocol gives the reason: Anthropic's consumer terms forbid
    making a Claude account available to anyone else, and the owner of an
    API key may let a team use it.
  - An own endpoint can stand for a team key, such as a LiteLLM gateway
    with an API key. It can also stand for personal subscriptions, such
    as Cal's proxy. The app cannot tell which from the address.
  - `saveAccountLogin` and the fake API set the default with
    `kind === 'token'`, and the column default is 0. So a new kind shares
    by default unless this rule changes.
- **Problem:** No rule sets the default share setting of an own endpoint
  login.
- **Impact if no action:** The code shares a new own endpoint login by
  default. Other members then spend a proxy of personal subscriptions
  until its owner turns sharing off.
- **Root question:** How does an own endpoint login get its owner's share
  choice, when the app cannot tell personal subscriptions from a team key
  behind the endpoint?
- **Options:**
  - **A.** Not shared by default, like a Claude subscription login. Cost:
    the owner of a team gateway must turn sharing on. Until then, a
    message of another member starts a new session without the history,
    and a member with no login of their own gets a refusal. Effort:
    Small.
  - **B.** Shared by default, like an API key. Cost: a proxy of personal
    subscriptions is shared until its owner turns sharing off. Get started
    saves a login without showing its share switch. Effort: Small.
  - **C.** No default. The form asks the user to choose before the save.
    Cost: a new field in the save request, a refusal of a save without the
    choice, the form on two pages, and a mockup state. Effort: Medium.
  - **D.** As A, and one typed map in `src/shared/account.ts` gives the
    share default of each login kind. The Worker save and the fake API
    read it, and the table rebuild of Milestone 4 drops the column default
    of 0. Then the typecheck refuses a new kind without a default, as it
    does for `loginLabels`. Cost: seven test inserts must give the value.
    Effort: Small.
  - **E.** As D, and a save that gives an own endpoint login a new
    endpoint gets the default again, as a change of kind does. Cost: the
    save must decrypt the stored endpoint to compare it. Only a stale tab
    or a direct call reaches this path, because the account page replaces
    a login only through Remove. Effort: Small.
  - **F.** As D, and the connect form of the own endpoint kind shows the
    share switch, off, before the save. Get started shows it too. Cost: a
    new field in the save request, and a mockup state, but no refusal.
    Effort: Medium.
- **Left out:**
  - A default that depends on the agent. OpenAI's terms also forbid
    sharing a ChatGPT account, so the agent does not show the risk.
  - A default that the app guesses from the address, or from a call to
    the endpoint. Neither shows whose accounts stand behind it.
  - An own endpoint login that never shares. It breaks the rule that the
    owner can change the share setting at any time.
  - An endpoint that an org admin saves for all members. It breaks the
    rule that each session runs on its starter's own login (decision 105).
  - A question to the owner when another member's message first needs
    the login. It breaks the rule that the workspace decides at once, when
    it accepts a message, whether the message runs on the login.
  - All options keep one share setting for each login, for every org of
    its owner, as decisions 21 and 116 chose. It holds.
- **Wider fix:** D. The class is a login kind that is shared because
  nothing set its default. The typed map makes each later kind state its
  own default.
- **Previous examples:** Decision 116 of
  `plans/boat-native-remote-workspaces.md` set the defaults of the
  existing kinds. `migrations/202611080100_agent_login_reuse.sql` turned
  off sharing for every saved Claude subscription login.
- **Related:** Decision 1. The own endpoint login is the new kind that
  needs this default.
- **Recommendation:** D. It was A before the options check. D gives the
  behaviour of A at the same effort, and the typecheck makes each later
  login kind state its own default.
- **Action:** ask the user, because the option adds behaviour at a
  boundary that no requirement covers: the protocol gives a default only
  for the existing kinds.
- **Chosen:** B, by Cal on 9 November 2026. The options check had
  recommended D. So a new own endpoint login is shared, like an API key,
  and its owner can turn sharing off on the account page. The code
  already gives this default to every kind except a setup token, so no
  typed map is added.

### 5. Choose what the composer shows about an own endpoint

Added on 9 November 2026 from the Milestone 1 mockups. The options check
of 9 November 2026 added options C, D, E, and F, and it changed the
recommendation from A to C. Changed on 10 November 2026: `main` moved the
login name into the composer bar, after the model picker, as "Cal's
login", and it gives the viewer's own login no label. So the options now
put the host in that bar, and option G adds a line under the box. The
options check of 10 November 2026 added options H, I, J, K, and L, and it
changed the recommendation from C to L.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** "Agent logins in a sandbox" in `docs/protocol/isolation.md`, the composer label rules in `docs/protocol/messages-and-attachments.md`, `src/shared/sessions.ts`, `src/chat/state/session-login.ts`, and `SessionLoginLabel` in `docs/mockups/src/components/chat/SessionLogin.tsx`.
- **Terms:**
  - **Session record:** the data of one chat session that each member's browser reads. It names the starter, and whether the starter's login works and is shared.
- **Background:**
  - In a session that another member started, the composer bar names the login that a message spends, such as "Cal's login". `main` chose this place on 8 November 2026, so that the composer box keeps its place. The bar names no login in the viewer's own session.
  - The rebased mockup `app/composer/own-endpoint` says "Cal's endpoint at proxy.example.com" in that bar. A phone shows "Cal's endpoint at pro…".
  - The protocol says that the session record holds no part of the login. So the browser does not know the kind or the host of the starter's login.
  - Decision 4 B shares a new own endpoint login by default.
  - The label can be older than the login at the send, because the workspace does not watch the logins. A message that waits for the cloud computer, and a Try again, run on the login that the dispatch reads.
  - The Git, `gh`, and Mac commands of a turn act for its sender, so their results also go to the endpoint.
  - The stored chat history keeps every session record, so a host that a record carried stays readable after the owner stops sharing. No option tells the owner that members will see the host.
- **Problem:** A sender cannot see that a message goes to a server that another member chose, in place of Anthropic or OpenAI.
- **Impact if no action:** A member's messages and files reach a server that the member never saw named.
- **Root question:** Before a turn runs on another member's own endpoint, how does each sender learn which server gets their message, its files, and the results of their commands, and how does the turn stay on that server?
- **Options:**
  - **A.** The session record carries the host, and the bar label names it. The words before the host shrink first, so that the host stays visible. Effort: Medium.
  - **B.** The record carries only the kind. The bar says "Cal's own endpoint", with no host. Effort: Medium.
  - **C.** As A, but the record carries the host only while the starter shares a login that works. Effort: Medium.
  - **D.** As C, and each send carries the host that its label showed. The workspace refuses a send whose server changed, and the draft stays. Cost: a new refusal. Effort: Medium.
  - **E.** As C, and the first send of each member asks them to confirm the host. Cost: a new gate and a mockup state. Effort: Medium.
  - **F.** As B, and a separate route gives the host while the login is shared, so that the host stays out of the chat history. Cost: a new route with its own access checks. Effort: Medium.
  - **G.** As C, and the host shows on its own line under the box, only for another member's own endpoint. Cost: it goes against main's choice that the box keeps its place. Effort: Medium.
  - **H.** As C, and the record also carries a version of the starter's login. Each send and each Try again carry the version that the tab showed. The workspace refuses an old version, the draft stays, and the turn keeps the version of its first message. Cost: a new refusal, also after a key rotation that an old tab missed. Effort: Large.
  - **I.** As C, and the notice slot over the box names the server, such as "Your message goes to proxy.example.com, Cal's own endpoint." Cost: a notice in each such session, which takes room on a phone. Effort: Medium.
  - **J.** As C, and a press on the label opens a small panel with the full host and one sentence about where messages go. Cost: the label becomes a control in a full bar. Effort: Medium.
  - **K.** As D, but a send whose server changed starts a linked session on the sender's own login, in place of a refusal. Cost: the message loses the session history. Effort: Medium.
  - **L.** As C, and the workspace refreshes the login part of each open session record at its 15-second check of the open tabs. So a label is at most one check old, with no new refusal. Cost: one more batched read for each workspace with open tabs. A message that already waits is still not covered. Effort: Medium.
- **Left out:**
  - Change nothing. It fails the goal, because the label would call a proxy a login.
  - A name that the owner gives the endpoint. It fails the goal, because the owner can write any name.
  - A tooltip with the full text. A phone has no hover.
  - A record of the server on each turn. It names the server only after the message went there.
- **Wider fix:** H. It pins the login that the label described, from the send to the last request, whatever part of the login changes. D checks only at the send.
- **Previous examples:** The share setting added `loginShared` to the session record in `src/shared/sessions.ts`. Main's `app/composer/login` accepts an ellipsis for "Cal's login" on a phone.
- **Related:** Decision 4. Its option B makes this label matter from the first message of another member.
- **Recommendation:** L. It was C before the options check of 10 November 2026. At the same Medium effort, L keeps each label within one check of the starter's login, with no new refusal. H best protects the sender, at the cost of a new refusal and a Large effort.
- **Action:** ask the user, because L changes the protocol rule that the session record holds no part of the login.

### 6. Choose how the form names the models that the endpoint must serve

Added on 9 November 2026 from the Milestone 1 mockups. The options check
of 9 November 2026 added options D and E, and it changed the
recommendation from B to D.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** UX wording.
- **Location:** `docs/mockups/src/components/settings/EndpointFields.tsx:57`.
- **Background:** Decision 3 A says that an own endpoint must serve the model IDs of the operator model list. The form names the models by their picker labels, such as "Opus 5.5". A gateway needs the IDs, such as `claude-opus-5-5`.
- **Problem:** A user who sets up a gateway cannot find the exact model IDs in the app.
- **Impact if no action:** A wrong model name in the gateway shows only when a turn fails with "The selected model is unavailable. Choose another model."
- **Root question:** Where does a user get the exact model IDs that the agents send, at the setup and when a turn fails because the endpoint lacks one?
- **Options:**
  - **A.** Keep the labels only. Effort: Small.
  - **B.** Keep the labels, and show the IDs behind an information button next to the Endpoint label. Effort: Small.
  - **C.** Show the IDs next to the labels in the text. Effort: Small.
  - **D.** Keep the labels in the text, and add a closed "Model IDs" list under it. The list shows each ID as code that the user can copy. Cost: one more line in the form, and a mockup variant. Effort: Small.
  - **E.** As D, and a failed turn on an own endpoint names the missing model ID, for example "The endpoint does not serve claude-opus-5-5." Cost: the runner must pass the login kind and the model to its failure text, with a test. Effort: Medium.
- **Left out:** A call to the endpoint that checks its models, because decision 3 A chose that the app never calls the endpoint.
- **Wider fix:** E. Its failure text names any model that the endpoint lacks, also one that the operator adds after the connect.
- **Previous examples:** None found.
- **Recommendation:** D. It was B before the options check. The copy rule of the `product-ui` skill puts technical detail in a secondary place such as a details panel, and D does that next to the model names, with text that the user can copy.
- **Action:** ask the user, because the wider fix E adds a failure text that no requirement covers, and D against E trades effort for help at the failure.

### 7. Choose the text of the agent step of Get started

Added on 9 November 2026 from the Milestone 1 mockups. The options check
of 9 November 2026 added option D, and it kept the recommendation.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** UX wording.
- **Location:** `docs/mockups/src/screens/getStartedCopy.ts:28`, which the app also imports.
- **Background:** The agent step of Get started says "Your agents run on your own Claude or OpenAI account." Its form now also offers "Own endpoint".
- **Problem:** The text does not describe a gateway or a proxy.
- **Impact if no action:** A user who chooses an own endpoint reads a step text that does not match the choice.
- **Root question:** What must the agent step tell a new user before they connect, now that a login can also be an own endpoint?
- **Options:**
  - **A.** Keep the text. Effort: Small.
  - **B.** Add "or on your own endpoint". Effort: Small.
  - **C.** Name no provider: "Your agents run on your own logins." Effort: Small.
  - **D.** Remove the first sentence, and keep "Connect at least one now, and the other at any time in your account." Cost: the step no longer says that the agents run on the user's own account. Effort: Small.
- **Left out:** A text that changes with the chosen kind, because the step text sits above the rows of both agents, and each form has its own text.
- **Wider fix:** C. It names no kind, so it stays correct when a later kind arrives.
- **Previous examples:** None found.
- **Recommendation:** B, as before the options check. It names the new choice and keeps the words that a new user knows. C best protects the text from a later kind.
- **Action:** ask the user, because B and C are both correct, and no copy rule picks one.

### 8. Choose how tools get an own endpoint address

Added on 9 November 2026 from the Milestone 3 checks. The options check of
9 November 2026 added options F and G, widened the problem to every login
kind, and changed the recommendation from A to F.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Security.
- **Location:** `claudeSettings` in `runner/src/providers/claude-settings.ts`, its use in `runner/src/providers/claude.ts`, and "Agent logins in a sandbox" and "Own endpoint logins" in `docs/protocol/access-and-security.md`.
- **Terms:**
  - **Tool process:** a process that an agent program starts, such as a shell command or a dev server.
  - **Flag settings:** the settings that the runner gives the `claude` program through the SDK. They have priority over a repository's `.claude/settings.json`.
- **Background:**
  - The runner now gives `claude` its endpoint in the flag settings, so that a repository cannot move it.
  - A check with the pinned `claude` 2.1.318 showed that it copies the whole `ANTHROPIC_BASE_URL` of its flag settings, with its path, into the environment of the processes that it starts: tool commands, hooks, and MCP servers. A tool process, such as a dev server, keeps it after the turn.
  - On `main`, these processes get no `ANTHROPIC_BASE_URL`. Since Milestone 3, they get `https://api.anthropic.com` for a setup token and an API key.
  - The Anthropic SDK in a project's dev server or test reads an inherited `ANTHROPIC_BASE_URL`, and loaders such as dotenv do not replace an inherited value. So a project whose `.env` names its own Anthropic gateway now sends its calls to Anthropic. On an own endpoint, it would send its calls, with the project's own key, to the starter's endpoint.
  - For an own endpoint, decision 2 B accepts an address with a user name, a password, a path, or a query. The protocol calls the address write-only, because it can hold a secret.
  - The key of the login stays out of tool processes, because the runner gives it to `claude` on a private pipe. Codex gets its endpoint as a command-line setting, so its tools do not get it.
- **Problem:** Each process that `claude` starts inherits the endpoint of the turn. That moves a project's own Anthropic calls, and a secret in an own endpoint address would reach every tool process. The protocol says that no tool process inherits the login of its turn.
- **Impact if no action:** A project's calls go to the wrong server, with the project's own key. A dev server can keep the secret part of an address after the turn.
- **Root question:** How does `claude` get the endpoint of a turn, so that no process that it starts inherits that endpoint?
- **Options:**
  - **A.** Accept it. State in the protocol that the tool processes of a Claude turn get the endpoint address, but not the key. The form says to put no secret in the address. Effort: Small.
  - **B.** Accept only the origin of an endpoint: the scheme, the host, and the port. Cost: a new refusal that changes decision 2 B, and no gateway that needs a path, such as `https://openrouter.ai/api`. Effort: Small.
  - **C.** A local relay for each Claude turn. The runner gives `claude` a loopback address, and the relay sends each request on to the real endpoint. Tools get only the loopback address. Cost: a streaming proxy in the runner, with its own lifetime and tests. Effort: Medium.
  - **D.** Allow own endpoint turns only through the model gateway of decision 1 D. Cost: Milestone 5 waits for that workspace. Effort: Large.
  - **E.** Refuse a user name, a password, a query, and a fragment in the address, and keep paths. Cost: a new refusal that changes decision 2 B, and a path can still hold a secret. Effort: Small.
  - **F.** Keep the flag route, and pin `CLAUDE_CODE_SHELL_PREFIX` in the flag settings to a small runner script. The script removes `ANTHROPIC_BASE_URL` and then runs the command. The program starts tool commands, shell-form hooks, and MCP servers through that prefix, so they get no endpoint for any login kind, as on `main`. Cost: it depends on the pinned program, and a check must show the result for a command, a background command, a hook, and an MCP server at each SDK update. A hook in exec form skips the prefix, so the protocol needs a risk line for it. Effort: Medium.
  - **G.** As C, but the relay listens on a Unix socket in a private folder of the runner, and the flag settings pin `ANTHROPIC_UNIX_SOCKET` to it. No port opens. Cost: the relay of C, and a route that no check has run yet. Effort: Medium.
- **Left out:**
  - The address in the process environment of `claude`. Tool processes inherit it there too, and a repository could then replace it.
  - The program's own setting that scrubs the environment of tool commands. Decision 114 rejected it, because it runs each tool command in isolation, and it does not remove `ANTHROPIC_BASE_URL`.
  - A private descriptor or a header for the address. The pinned program has descriptor routes only for tokens and keys, and it reads extra headers only from an environment variable.
- **Wider fix:** D, for the secrets of the login. Only F or G remove the copy itself, for every login kind.
- **Previous examples:** Decision 114 of `plans/boat-native-remote-workspaces.md`: the key goes to `claude` on a private pipe, so that tool processes do not inherit it.
- **Related:** Decision 2. Options B and E change it. Decision 1. Option D waits for its option D, in the other workspace.
- **Recommendation:** F. It was A before the options check. F removes the copy for every login kind, with no new refusal and no change to decision 2 B, and its only exception, hooks in exec form, is narrower than the risk that A accepts.
- **Action:** ask the user, because F adds a risk line to the protocol for hooks in exec form, A changes the protocol rule that no tool process inherits the login, and B and E change decision 2.
- **Superseded:** by gateway decision 11 K, which Cal chose on 10 November 2026. Claude reaches the gateway through a profile, so the processes that it starts inherit no address and no token. The runner gives Claude no flag settings, so a repository's settings can send a turn token to another address, which `docs/protocol/model-gateway.md` states as a risk. This decision no longer waits for an answer.

### 9. Choose the address rule now that the gateway forwards own endpoints

Added on 10 November 2026, after the replay onto `main` brought the model
gateway. The options check of 10 November 2026 added options E and F, and
it changed the recommendation from C to E.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** `src/shared/endpoint-address.ts`, the save route in `worker/app-api/boot.ts`, `worker/model-gateway/route.ts`, and `plans/follow-ups/own-endpoints-through-model-gateway.md`.
- **Terms:**
  - **Gateway:** the Worker routes that take each model request of a turn, add the real login, and forward the request.
  - **Public address:** an address that is not loopback, private, link-local, or internal.
- **Background:**
  - Decision 2 B accepts `https://`, and `http://` for `localhost`, `127.0.0.1`, or `[::1]`, at the save.
  - The gateway now carries every turn of a runner of protocol 2. For own endpoints, Cal chose on 9 November 2026 that the gateway sends a login only to public https addresses (gateway decision 8 B), and that a private endpoint fails the turn with a clear cause (gateway decision 4 A).
  - The Worker cannot reach a loopback address in a cloud computer. A runner of protocol 1 cannot run an own endpoint turn at all.
  - So a loopback or private endpoint that decision 2 B accepts can never run a turn.
  - Main's follow-up item asks for one rule for the save and the gateway: public https only, with no non-public IP ranges, `localhost`, single-label or internal names, or the app's own zones.
  - The gateway now joins the endpoint and each model route itself. A user name and a password cannot go in a request address, and a query, a fragment, or a Claude address that ends in `/v1` break a text join.
- **Problem:** The save accepts addresses that every turn then refuses.
- **Impact if no action:** A user saves a loopback endpoint and sees every turn fail.
- **Root question:** Which endpoint addresses can the gateway turn into a working request, and how do the form, the save, and the gateway accept exactly those?
- **Options:**
  - **A.** Keep decision 2 B. A loopback endpoint saves, and each turn fails as a private endpoint, with a clear cause. Effort: Small.
  - **B.** `https://` only, as option C of decision 2. A private https endpoint still saves, and each turn fails. Effort: Small.
  - **C.** One rule for the save and the gateway: public https only, as main's follow-up item says. Cost: a new refusal. Effort: Small.
  - **D.** As C, and also refuse a user name, a password, a query, or a fragment, as option D of decision 2. Cost: one more refusal. Effort: Small.
  - **E.** One builder. As C, and the shared rule also builds the upstream address of each model route with the URL parser, and the gateway fetches only an address that it built. It refuses a user name and a password, keeps a query, and drops a fragment, a trailing slash, and a final `/v1` of a Claude address. The form shows the address that it saves. Cost: the join of Milestone 5b moves into `src/shared/`. Effort: Small.
  - **F.** As C, and the save sends one test request with the key, under the fetch rules of the gateway. A failure shows its cause as a warning at the endpoint field, and the save still goes through. Cost: the Worker calls the endpoint at each save, and the warning is false while the endpoint is down. Effort: Medium.
- **Left out:** `http://` to a public address, because the gateway sends a login only over https (gateway decision 8 B).
- **Wider fix:** E. One builder decides which address forms work, so a later limit of the gateway, such as its list of ports, also refuses the address at the save.
- **Previous examples:** Decision 2 of this plan, gateway decisions 4 A and 8 B, and `worker/lifecycle/image-software.ts`, which accepts only https with no user name, password, query, or fragment.
- **Related:** Decision 2. Options B, C, and D change its answer B.
- **Recommendation:** E. It was C before the options check of 10 November 2026. C still saves a user name and a password, which a fetch cannot send, and E prevents every form that fails each turn at the same Small effort.
- **Action:** ask the user, because E changes Cal's decision 2 B and adds a refusal.

## Design

### Facts from the checks

These checks ran on 8 November 2026 with the pinned `claude` 2.1.318
(Claude Agent SDK 0.3.318) and Codex 0.167.0. The scripts and their
output are in `.context/own-endpoint-logins/checks/` and
`.context/cli-proxy-logins/checks/`.

- `claude` sends an API key from descriptor 3 as `x-api-key`, and a setup
  token as `Authorization: Bearer`, to
  `<ANTHROPIC_BASE_URL>/v1/messages`.
- A repository's `.claude/settings.json` with `env.ANTHROPIC_BASE_URL`
  replaces the endpoint that the environment sets. The SDK's `settings`
  option, the flag settings layer, has priority over the repository.
- The route `CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR` of the pinned
  program sent no request in a plain setup.
- Codex sends the key of `account/login/start` as `Authorization: Bearer`
  to `<base_url>/responses`. It refuses `wire_api = "chat"`.
- One live turn of each agent through Cal's proxy worked with these
  routes. The proxy needed no extra header.

### Design calls

Each item is an agent call of 8 November 2026. Cal can override any of
them.

- One own endpoint login for each agent, like the existing logins. Reason:
  the logins are keyed by agent, and some endpoints serve only one of the
  two agents.
- The Claude endpoint has no `/v1`, and the Codex endpoint ends with
  `/v1`, as each program expects. The form gives an example of each.
- Claude gets the key on the API key route. A gateway that accepts only
  `Authorization: Bearer` is not supported. Reason: the gateway token
  route sent no request, and a token in the environment breaks the rule
  that no tool process gets the login. Changed on 10 November 2026: the
  gateway now sends the key to the endpoint, in `x-api-key` for Claude and
  in `Authorization: Bearer` for Codex, and the runner gets only a turn
  token.
- The runner sets the Claude endpoint through flag settings for every
  login kind, with `https://api.anthropic.com` for the existing kinds.
  Reason: today a repository's `.claude/settings.json` can send the turn
  login to any host. This closes that path in the same code. Superseded
  on 10 November 2026 by gateway decision 11 K, which gives Claude no flag
  settings.
- The endpoint is stored encrypted with the key. A plain column keeps
  only its origin. The account page shows its host, with the port when
  the port is not the default. Reason: an address can hold a secret in
  its path or its query.
- One function in `src/shared/` holds the address rule of decision 2 B.
  The save route and the form both call it, so the form shows a refusal
  at the endpoint field before the save. Agent call of 9 November 2026,
  from the mockups.
- The protocol says that the agent program on the cloud computer calls
  the endpoint. So a loopback address reaches only a proxy on the cloud
  computer. Agent call of 9 November 2026, from the mockups. Superseded on
  10 November 2026: the gateway in the Worker calls the endpoint.
- The hint of an own endpoint key promises no test, because the app never
  calls the endpoint. The hints of the other kinds stay as they are. On a
  phone, the kind choice wraps onto two lines. Agent call of 9 November
  2026, from the mockups.
- The output filter hides the key and the endpoint of an own endpoint
  login. Reason: the endpoint is stored encrypted because its path can
  hold a secret, and the error details of Codex print the request address.
  Changed on 10 November 2026: the runner never gets either, so the
  gateway's error redaction hides them instead.
- Codex needs the Responses API at the endpoint, and the form says so.
- The form asks for the base address without a query or a fragment.
  Reason: the `claude` program cannot call such an address, and decision
  2 B does not refuse it. Changed on 10 November 2026: the gateway builds
  the address now, and decision 9 decides which forms the form accepts.
- An own endpoint login counts as connected for Get started, the session
  record, and the composer notice, like the other kinds.
- Until Milestone 5b, an own endpoint login counts as a login that cannot
  be used, on both runner protocols. The turn dispatch takes main's
  unusable-login path before anything reaches a runner, and the gateway's
  login reader refuses the kind. Reason: no runner may get the key, and
  the gateway must not send it to Anthropic or OpenAI. Agent call of
  10 November 2026.
- The runner never gets an own endpoint or its key. A runner of protocol
  1 cannot run an own endpoint turn, as main's follow-up item says. Agent
  call of 10 November 2026, from gateway decision 10 B.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The account page and the agent step of Get started get the own endpoint
kind, at phone and desktop sizes.

- [x] Add the own endpoint kind to the Claude and Codex connect forms:
      a choice beside the existing kinds, an endpoint field with an
      example, and a key field.
- [x] Show a connected own endpoint login with its kind, the host of its
      endpoint, and Remove.
- [x] Show the refusal of an address that decision 2 refuses.
- [x] Say in the form that the endpoint must serve the models of the
      picker, as decision 3 A chose.
- [x] Show the share setting of a connected own endpoint login. It is on
      by default, as decision 4 B chose.
- [x] Show in the session login line of the composer that a session runs
      on an own endpoint, so that a sender sees where the message goes.
- [x] Add the own endpoint kind to the agent step of Get started.
- [x] Put the new states on a child page of `app/account`, so that each
      page keeps five screens or fewer.
- [x] Update "Logins" in `docs/mockups/orgs-and-logins.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Screenshots of the changed pages: `.context/own-endpoint-logins/mockups/final/`.

## Milestone 1b: Mockup changes from decisions 5 to 7

Tags: mockup

Depends on: 1. Its states wait for decisions 5, 6, and 7.

The mockups show the answers to the questions that Milestone 1 raised.

- [ ] Change the login label of the composer bar as decision 5 says.
- [ ] Change the hint of the endpoint field and the own endpoint text of
      `docs/mockups/orgs-and-logins.md`: the gateway in the Worker sends
      each request, not the cloud computer. Show the refused state of
      decision 9.
- [ ] Show the model IDs in the form as decision 6 says.
- [ ] Change the text of the agent step in
      `docs/mockups/src/screens/getStartedCopy.ts` as decision 7 says. The
      app reads the same file.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol states the own endpoint login and the fixed Claude endpoint.

- [x] In "Agent logins" of `docs/protocol/access-and-security.md`, state
      the own endpoint login: an endpoint and a key for each agent, a
      write-only key, the host on the account page, the address rule of
      decision 2, and the Responses API for Codex.
- [x] State there that the chosen endpoint gets the messages and the files
      of each turn on that login, and that the agent program on the cloud
      computer calls it.
- [ ] State what the session record shows about an own endpoint login, as
      decision 5 says.
- [x] In "Agent logins in a sandbox", state that the runner sets the
      endpoint of each agent program, and that no repository setting can
      change it.
- [x] In "Models" of `docs/deployment.md`, state that an own endpoint
      must serve the model IDs of `CONDUCTIVE_MODELS` (decision 3 A).
- [x] In "Agent logins in a sandbox", state that a new own endpoint
      login is shared by default (decision 4 B).
- [x] Update the feature list and "What a user needs" in `README.md`.
- [x] Add the own endpoint to "External services" in
      `docs/architecture.md`.
- [x] Say in "Models" of `docs/deployment.md` that the endpoint gets the
      full model ID that the agent program sends.

The replay onto `main` on 10 November 2026 kept main's docs, because main
split the protocol pages and its gateway changed the facts. So the doc
changes of this milestone are not on the branch. Milestone 2b redoes them.

## Milestone 2b: Documentation on the split protocol pages

Depends on: 2. Its address rule waits for decision 9, and its session
record text waits for decision 5.

The protocol states the own endpoint login with the gateway.

- [ ] In "Agent logins" of `docs/protocol/tokens-and-secrets.md`, state
      the own endpoint login: an endpoint and a key for each agent, a
      write-only key and address, the host on the account page, the
      address rule of decision 9, and the API that each agent's endpoint
      must serve.
- [ ] In `docs/protocol/model-gateway.md`, state that the gateway forwards
      the requests of an own endpoint turn to the endpoint, that the
      endpoint gets the messages and the files of those turns, the ports
      that the gateway reaches, and the cause of a failed own endpoint
      turn.
- [ ] In "Agent logins in a sandbox" of `docs/protocol/isolation.md`,
      state that a new own endpoint login is shared by default (decision 4
      B), that the runner never gets an own endpoint or its key, and what
      the session record shows (decision 5). Change the composer label
      rules in `docs/protocol/messages-and-attachments.md` as decision 5
      says.
- [ ] In "Models" of `docs/deployment.md`, state that an own endpoint must
      serve the full model IDs of `CONDUCTIVE_MODELS` (decision 3 A).
- [ ] Update the data flow and the trust boundaries in
      `docs/architecture/flows.md` and `docs/architecture/data-and-trust.md`.
- [ ] Update the feature list and "What a user needs" in `README.md`.
- [ ] Read both legal pages in full, as `AGENTS.md` says, and list each
      sentence that Milestone 6 must change.

## Milestone 3: Fix the Claude endpoint for every login

Depends on: 2

The runner gives the `claude` program its endpoint through flag settings,
so that a repository cannot move the login.

- [x] Give the SDK `settings: { env: { ANTHROPIC_BASE_URL } }` in
      `runner/src/providers/claude.ts`, with `https://api.anthropic.com`
      for a setup token and an API key.
- [x] Add a test that the flag settings hold the endpoint for each login
      kind.
- [x] Check with the pinned program and a fake key that a repository's
      `.claude/settings.json` no longer moves the login. Save the output
      under `.context/own-endpoint-logins/`.
- [x] Dropped on 10 November 2026, because gateway decision 11 K replaced
      this transport: check with a real setup token and a real Anthropic API
      key that a
      turn still works with the fixed endpoint. This needs Cal's logins.
- [x] Check with the pinned `claude` that a tool command does not get
      the endpoint of the flag settings in its environment. If it does,
      raise a decision before Milestone 5.
- [x] Check with the pinned Codex that a repository's `.codex/config.toml`
      cannot change the provider or its endpoint.
- [x] Check with the pinned `claude` that a repository's
      `.claude/settings.json` cannot set a proxy or a certificate store for
      the agent's requests.
- [x] Add a runner test for each path that the code closes, and raise a
      decision for each path that stays open.
- [x] Update `runner/agent-logins.md`.

The checks found that the processes that `claude` starts get the endpoint
of the flag settings, which decision 8 handles. They also closed repository
proxy and certificate settings. Evidence: `.context/own-endpoint-logins/m3/`.

Superseded on 10 November 2026 by gateway decision 11 K, which Cal chose:
Claude reaches the gateway through a profile, and the runner gives Claude
no flag settings. The replay onto `main` kept main's runner, so the runner
changes of this milestone are not on the branch. Main's follow-up item
asked to reconcile them with the gateway, which this replay did.

## Milestone 3b: Close the remaining Claude settings paths

Depends on: 3, 4. Its second TODO waits for decision 8.

The options check of decision 8 found paths that Milestone 3 left open.

- [x] Check with the pinned `claude` whether a repository's
      `.claude/settings.json` can set `ANTHROPIC_UNIX_SOCKET`,
      `CLAUDE_CODE_CERT_STORE`, or `SSL_CERT_FILE`, and pin each one that
      it can, with a test.
- [x] Dropped on 10 November 2026, because decision 8 is superseded: apply
      decision 8, so that the processes that `claude` starts do not
      inherit the endpoint of the turn. Check a command, a background
      command, a hook, and an MCP server.
- [x] Correct `runner/agent-logins.md`: hooks and MCP servers get the same
      environment as the Bash tool.

A repository could set `CLAUDE_CODE_CERT_STORE`, so the runner now pins it.
It could not move the requests with `ANTHROPIC_UNIX_SOCKET` or
`SSL_CERT_FILE`. All five kinds of child process, also a hook in exec form,
get the endpoint. Evidence: `.context/own-endpoint-logins/m3b/`.

Superseded on 10 November 2026 by gateway decision 11 K, as Milestone 3
is. Its runner changes are not on the branch.

## Milestone 4: Store and send own endpoint logins

Depends on: 2

The Worker saves an own endpoint login and sends its endpoint with the key
in each turn.

- [x] Add a migration that rebuilds `agent_logins`. `kind` accepts
      `endpoint` for both agents, a plain column holds the origin of the
      endpoint, and `no_reuse` stays.
- [x] Keep the shared default of decision 4 B for the new kind in
      `saveAccountLogin` and in `noReuseOf` of the fake API, and test it.
- [x] Add the kind to `SaveAgentLoginRequest` and `AgentLoginStatus` in
      `src/shared/account.ts`, and the endpoint to `RunnerLogin` in
      `src/shared/runner.ts`.
- [x] Add the address rule of decision 2 B as one function in
      `src/shared/`: refuse `http://` unless the host is `localhost`,
      `127.0.0.1`, or `[::1]`. Call it in the save route. Encrypt the
      endpoint with the key, and keep its origin in plain text.
- [ ] Send in the session record what decision 5 chooses about the login
      of the starter. Add the new field to the change check of `save()` in
      `worker/chat/session-login.ts`, so that a change reaches each tab.
- [x] Send the endpoint with the key in the turn login. Count the kind in
      `agentLoginKind` and the login availability.
- [x] Remove each place that fixes the kind of a Codex login to `api-key`:
      `worker/app-api/account-data.ts:30`, `worker/app-api/boot.ts:81` and
      `:102`, and `src/app/api/read-core.ts:131`.
- [x] Add Worker tests: a save, a refused address, an account response
      without the key, a turn login with the endpoint, and the
      availability.
- [x] Add the kind to the fake API and the development seeds.
- [x] Update the READMEs of the changed areas.

A runner without own endpoint support refuses such a turn before the agent
starts, and an older runner refuses the login kind in its parser. So no
runner sends an own endpoint key to Anthropic or OpenAI. Evidence:
`.context/own-endpoint-logins/m4/`.

## Milestone 5: Run turns on an own endpoint

Depends on: 3, 3b, 4

The runner sends each turn of an own endpoint login to its endpoint.

- [x] Dropped on 10 November 2026: Take the Claude endpoint of the flag settings from the login, and
      give the key on the API key route.
- [x] Dropped on 10 November 2026: Take `model_providers.conductive.base_url` of Codex from the login.
- [x] Dropped on 10 November 2026: Keep the key and the endpoint in the output filter.
- [x] Dropped on 10 November 2026: Extend `runner/src/providers/claude-login.test.ts` and
      `runner/src/providers/codex-login.test.ts`.
- [x] Dropped on 10 November 2026: Run one live turn of each agent through Cal's proxy with the check
      script. Save the output under `.context/own-endpoint-logins/`.
- [x] Dropped on 10 November 2026: Update `runner/agent-logins.md` and `runner/README.md`.

Superseded on 10 November 2026 by gateway decision 10 B: the gateway, not
the runner, sends own endpoint turns to the endpoint. Milestone 5b does
this work.

## Milestone 5b: Forward own endpoint turns through the gateway

Depends on: 2b, 4. Its address rule waits for decision 9.

The gateway sends the model requests of an own endpoint turn to the
endpoint, with the real key that stays in the Worker. This milestone does
the tasks of `plans/follow-ups/own-endpoints-through-model-gateway.md`.

- [ ] Let the gateway's login reader decrypt an own endpoint login, and
      remove the refusal that Milestone 4 added. The runner still gets
      only the gateway address and a turn token.
- [ ] Forward each allowed model route to the stored endpoint. Keep the
      gateway's body limit, allowed headers, error redaction, turn and
      access checks, login change checks, cancellation, and request lease.
      Keep model discovery off (decision 3 A).
- [ ] Send the key in `x-api-key` for Claude and in `Authorization:
      Bearer` for Codex.
- [ ] Use the address rule of decision 9 at the save and before every
      fetch to the endpoint, and follow no redirect. Check that
      `global_fetch_strictly_public` refuses a public name that points to
      a private address.
- [ ] Check the address when the Worker dispatches a turn. A refused
      address fails the turn before an agent starts, with a plain cause
      that names the starter and the agent and points to the account page.
      A failed connection names the endpoint as unreachable.
- [ ] Keep main's unusable-login path for a runner of protocol 1.
- [ ] Check which https ports a Worker fetch reaches on a host outside
      Cloudflare, for the protocol text of Milestone 2b.
- [ ] Add tests: a public endpoint, refusals at the save, the dispatch,
      and the fetch, an unreachable endpoint, the failed-turn cause, both
      agents' key headers, no endpoint or key in a runner command, a
      runner of protocol 1, and secret endpoint values in the error
      redaction.
- [ ] Update the READMEs of the changed areas.

## Milestone 6: Account and Get started

Tags: ui

Depends on: 1, 1b, 2b, 4

The account page and Get started connect an own endpoint, as the mockups
show.

- [ ] Add the kind to `AgentConnectForm`, `labels.ts`, and `AgentList` in
      `src/shell/account/`. Show its share setting with
      `LoginShareSetting`. Let the kind choice wrap on a phone.
- [ ] Call the shared address rule in the form, and show its refusal at
      the endpoint field.
- [ ] Name the models that the endpoint must serve, as decision 6 says.
      Take them from `GET /api/models`, not from the mockup fixtures.
- [ ] Check the agent step of Get started, which reuses `AgentList` in
      `src/shell/onboarding/AgentStep.tsx`.
- [ ] Say on the Privacy page in `src/marketing/privacy.ts` and
      `src/marketing/privacy-uses.ts` that a chosen
      endpoint gets the messages and the files. Name the endpoint address,
      stored encrypted, under "Keys and logins". Add what members see
      about the login of a session, as decision 5 says.
- [ ] Update `src/marketing/terms.ts` and `src/marketing/terms-org.ts`: they name only the terms of
      Anthropic or OpenAI, and the share defaults of two kinds. Raise
      `TERMS_VERSION` in `src/shared/terms.ts`.
- [ ] Show the own endpoint in the login label of the composer bar, as
      decision 5 says and
      the mockups show.
- [ ] Extend `src/shell/account/AccountScreen.test.tsx` and
      `src/shell/onboarding/GetStartedSteps.test.tsx`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete `plans/follow-ups/own-endpoints-through-model-gateway.md`,
      which Milestone 5b completes.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On `conductive.build`, Cal connects the proxy for both agents and
      runs one turn of each agent in a new workspace, through the gateway.
      Check first that the org image has a runner of protocol 2. Keep the
      credentials out of saved evidence.
