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
- [Model gateway](../docs/protocol/model-gateway.md), and its
  [requests and answers](../docs/protocol/model-gateway-requests.md).
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
- **Chosen:** C, by Cal on 10 November 2026. The options check had
  recommended L. So the session record carries the host of the starter's
  endpoint only while the starter shares a login that works, and the bar
  label names it with the host kept visible.
- **Changed:** by Cal on 10 November 2026: "remove the host from the chat
  window - you have to trust people you work with". So the label names an
  own endpoint login as main names every login, such as "Cal's login", and
  the session record holds no part of the login, as on `main`. The
  protocol records the host label as rejected for that reason.

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
- **Answer of 10 November 2026:** Cal wrote: "I don't mind using endpoint
  to get the models tbh - but then we might need to update the model
  selector - as if there are a lot of models could be bad ux?" This
  reopens decision 3. Decision 10 asks both questions together.
- **Closed:** on 10 November 2026 by decision 10 G, which replaces it.

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
- **Chosen:** B, by Cal on 10 November 2026: the step adds "or on your
  own endpoint".

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
- **Chosen:** E, by Cal on 10 November 2026. One builder in `src/shared/`
  checks the address and builds the exact upstream address of each model
  route, for the form, the save, and the gateway.

### 10. Choose how the app uses the endpoint's model list

Added on 10 November 2026 from Cal's answer to decision 6: "I don't mind
using endpoint to get the models tbh - but then we might need to update
the model selector - as if there are a lot of models could be bad ux?"
It reopens decision 3, which chose the operator model list only, and it
takes over the question of decision 6. The options check of 10 November
2026 added options F to K, and it changed the recommendation from B to G.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/app-api/models.ts`, `src/chat/components/model-menu.ts`, `src/chat/components/ModelPicker.tsx`, `src/shell/ui/ModelPicker.tsx` (new workspace, routines, and Preferences), `GET /v1/tools/models` with `docs/protocol/agent-tools.md`, the gateway under `worker/model-gateway/`, and "Models" in `docs/deployment.md`.
- **Terms:**
  - **Operator model list:** the models that the app offers, from `CONDUCTIVE_MODELS`. Today it has 8: Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.2 for Claude, and GPT-6.1 Sol, GPT-6 Astra, GPT-6.1 Terra, and GPT-6 Luna for Codex.
  - **Known ID:** a model ID that the pinned agent program has built-in data for. An unknown ID runs with weaker defaults.
- **Background:**
  - The picker is one menu: the models of each agent as a group, then the efforts of the chosen model.
  - After Milestone 5b, the gateway in the Worker calls each own endpoint for its turns. It can then also read the endpoint's model list at `GET /v1/models`, with the address rule of decision 9 E. Today the gateway refuses own endpoint logins.
  - Cal's proxy lists 35 models in each format on 10 November 2026: all 8 operator IDs, and 31 more, such as older Claude models, aliases, and image models. Evidence: `.context/own-endpoint-logins/checks/proxy-model-lists-2026-11-10.txt`.
  - Cal's proxy and LiteLLM give an ID, a display name, and token limits in the Anthropic form, and the ID only in the OpenAI form. Anthropic's own list also gives effort capabilities. CLIProxyAPI and LiteLLM also serve a Codex catalog form with reasoning levels.
  - The picker of each session reads one list for the reader's account. A session on another member's shared login runs on that member's endpoint.
  - Main's follow-up item keeps model discovery off unless this feature turns it on.
- **Problem:** The app does not know which models an own endpoint serves, and a long list would crowd the picker.
- **Impact if no action:** A missing model fails only in its turn, and the user cannot use the other models of the endpoint.
- **Root question:** For a turn on an own endpoint login, which models can the app offer, with which labels, efforts, and agent handling, so that each offered model runs on that login and each menu stays short?
- **Options:**
  - **A.** Keep decision 3 A: the operator model list only. The form lists the exact IDs that the endpoint must serve, in a closed list that the user can copy. Effort: Small.
  - **B.** A check only. The Worker reads the endpoint's model list at the save and when the user presses Refresh. The account page marks each operator model that the endpoint lacks, and the picker marks it as unavailable in sessions on that login. The picker keeps its size and its models. Cost: the list can go stale between refreshes, and marks in another member's session need the starter's list in the session record. Effort: Large.
  - **C.** As B, and the picker gets a closed "More models" group with a search field. It lists the endpoint's other models that the pinned agent program knows, so they keep every feature. It hides unknown IDs and image models. Cost: the app needs a list of known IDs for each pinned program version, and it knows no efforts for the extra models. Effort: Large.
  - **D.** As B, and the account page lists the endpoint's models with switches, as Amp does. The operator models that the endpoint serves start on. The picker shows only the models that are on. Cost: the user curates the list, and Cal said that Amp's form may be too much. Effort: Large.
  - **E.** As C, but the group lists every model of the endpoint for that agent, also unknown IDs. Cost: unknown IDs run with weaker defaults, and the list is long. Effort: Large.
  - **F.** As A, and a failed turn on an own endpoint names the model ID and the host when the agent reports the model as unavailable, such as "proxy.example.com does not serve claude-opus-5-5." No call reads the list. Cost: a new failure text. Effort: Medium.
  - **G.** As B, and the marks stay current and soft. The Worker also reads the list again in the background when a turn on that login starts, at most once every 10 minutes. A failed read keeps the last list, and a mark never blocks a choice. The marks show only in the owner's own pickers, so the session record does not change. For every member, a failed turn names the missing ID as in F. Cost: calls to the endpoint during turns, and no marks in another member's tab. Effort: Large.
  - **H.** As G, and the session record also carries the operator model IDs that the starter's endpoint lacks, only while the starter shares a login that works, as decision 5 C does for the host. Cost: one more part of the login in the record and in the protocol. Effort: Large.
  - **I.** As B, and an entry of `CONDUCTIVE_MODELS` can say that the pickers offer it only on an own endpoint whose list names it. The operator gives its label and its efforts, so each extra model is a known ID. Cost: a new field in "Models" of `docs/deployment.md`, and the operator keeps those IDs in step with the pinned programs. Effort: Large.
  - **J.** As D, and each unknown ID that the user turns on names the known model that it behaves as, so that the agent program gives it that model's handling. Cost: no check ran these settings, and the turn command must carry the mapping. Effort: Large.
  - **K.** As E, and for Codex the gateway also forwards `GET /models` to the endpoint, so that Codex runs each listed model with the endpoint's catalog. Cost: a new gateway route, and an endpoint catalog that lacks an operator model degrades it. Effort: Large.
- **Left out:**
  - A read of the list in the cloud computer. B is better on every point: it reads before the first turn, and no sandbox process can change its result.
  - Claude's own model discovery. It fills only its own picker, which the app does not use. Codex's catalog comes back as K.
  - An own endpoint that replaces the operator list in the picker. The operator models keep every feature and a known effort list, so they stay the base.
  - Typed model IDs. D gives the same curation from the endpoint's list, with no typing errors.
- **Wider fix:** G. Its marks follow the endpoint with no press of Refresh, and its failure text names any model that the endpoint lacks, also one that the operator adds later.
- **Previous examples:** Decision 3 A, decision 6, and the Amp form that Cal showed on 9 November 2026. Other tools take model names from a typed list, from `GET /v1/models`, or from a catalog, as `.context/own-endpoint-logins/prior-art.md` says.
- **Related:** Decision 3 and decision 6, which this decision replaces. Decision 9 E, whose address rule the read of the list uses. A model that only one login serves fails in a linked session of decision 115 and after a Try again on a changed login. `plans/follow-ups/unoffered-model-choice.md` must follow a list for each login if a login can add models.
- **Recommendation:** G. It was B before the options check. G uses the endpoint to learn which models work, keeps the picker as short as it is today, keeps its marks current with no Refresh, never blocks a model that a list omits, and makes a failed turn name the missing ID for every member. C or I can follow later, if users want the endpoint's other models.
- **Action:** ask the user, because Cal asked for this choice, and G changes decision 3 A.
- **Chosen:** G, by Cal on 10 November 2026, with one change: "if its not
  listed it should not show I would guess". So the owner's pickers hide
  each app model that the endpoint's last list does not name, in place of
  a soft mark. Cal saw the quick mockup of G before he chose. The cost:
  a model that a gateway serves but does not list is hidden too.

### 11. Choose what a full phone bar keeps of the host

Added on 10 November 2026 from the Milestone 1b mockups. The options check
of 10 November 2026 added options D, E, F, and G, and it changed the
recommendation from C to D.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Mockup.
- **Location:** the `.endpoint` rule in `docs/mockups/src/components/chat/SessionLogin.module.css`, which the app imports, and the label rule of decision 5 C in `docs/protocol/messages-and-attachments.md`.
- **Terms:**
  - **Composer bar:** the row under the message box, with attach, the model picker, the login label, Stop during a turn, and Send.
- **Background:**
  - Decision 5 C names the starter's host in the composer bar, and the words before the host shrink first, so that the host stays visible.
  - The label keeps the host at full width while the bar has room for it. A phone then shows "C… proxy.example.com".
  - During a turn, the phone bar also holds Stop. The label then has no room for the host, and it shows "proxy.exam…".
  - Main's code lets the model picker and the label give up width together. Only code comments state that rule.
  - A long host is cut also in an idle phone bar. A full bar also removes the starter's name, which the label rule asks for.
- **Problem:** In a full phone bar, the end of the host is lost, and the end is the part that names the server.
- **Impact if no action:** A member who steers a turn on a phone sees only the start of the host. A host such as `api.anthropic.com.example.net` can then look like Anthropic.
- **Root question:** When the bar cannot show the whole host, how does the sender still see which server gets the message, so that no cut host reads as another server?
- **Options:**
  - **A.** Keep it as built: after the words, the picker and the host give way together, and the host loses its end. Effort: Small.
  - **B.** The host always keeps its full width. Cost: the picker then shows no model and no chevron during a turn on a phone, and it stays a tap target about 21 px wide. Effort: Small.
  - **C.** As A, but the host loses its start, such as "…ample.com", so that its end stays. Cost: it needs right-to-left text direction around an isolated host, and Safari and Firefox need a check. A host such as `notopenai.com` can read as "…openai.com", and a port stays, such as "…le.com:8443". Effort: Small.
  - **D.** Keep whole the part of the host that its owner registered, such as `example.com` in `proxy.example.com`. The Worker finds that part with the public suffix list, and the session record carries it with the host. Only the part before it gives way, from its start, such as "…example.com". An IP address stays whole. Cost: a new dependency, one more record field and protocol sentence, and a long registered part still squeezes the picker. Effort: Medium.
  - **E.** As D, but with no list. The label removes whole labels from the start of the host and keeps the last two whole. Cost: a host under a shared ending, such as `name.workers.dev`, shows only "…workers.dev", and the label needs code that measures. Effort: Medium.
  - **F.** As B, and on a phone Stop shows only its icon, with "Stop" as its spoken name. That frees about 30 px for the picker. Cost: it changes main's Stop button on a phone, and a host over about 20 characters still squeezes the picker. Effort: Small.
  - **G.** As C, D, or E, and a press on the label opens a small panel with the whole host and one sentence about where messages go. Cost: the label becomes a control in a full bar, and the mockups need an open state. Effort: Medium.
- **Left out:**
  - A line under the message box, because the protocol rejects a line under the box, and decision 5 did not choose G.
  - A minimum width for the picker alone, because it moves room from the host to the picker, so it fails the goal as A or C does.
  - A tooltip, because a phone has no hover. A press comes back as G.
  - A cut in the middle, such as "proxy.ex…le.com", because a host such as `api.anthropic.com.fakeanthropic.com` can still read as "api.anth…pic.com".
  - The registered part alone, because decision 5 C names the host, and D shows that part in a full bar.
  - A length limit for the host at the save, because a full phone bar holds only about 12 to 20 characters, which refuses common hosts that decision 9 E accepts.
- **Wider fix:** D. It keeps the part that names the owner whole for every host shape, so a trick at either end does not work.
- **Previous examples:** Main's `app/composer/login` page already shows "Opus …" and "Cal's…" during a turn on a phone.
- **Related:** Decision 5 C, whose rule says that the host stays visible.
- **Recommendation:** D. It was C before the options check. C only moves the cut, so a host can still read as another server, while D never cuts the part that names the owner. A is the smallest change.
- **Action:** ask the user, because each option breaks a part of decision 5 C or of main's picker in a full bar, and no option is clearly best.
- **Closed:** on 10 November 2026, with no option applied, because Cal changed
  decision 5: the chat window shows no host.

### 12. Choose the prompt cache of a Claude own endpoint

Added on 11 November 2026 from the Milestone 5b report.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Performance.
- **Location:** `runner/src/providers/claude.ts`, which sets `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` only for a turn on a subscription token, and "How the agents reach the gateway" in `docs/protocol/model-gateway.md`.
- **Terms:**
  - **Prompt cache:** Anthropic keeps the earlier part of a conversation for a time, so that the next request reads it for less money and less use of the limits.
- **Background:**
  - Gateway decision 13 makes Claude ask for a prompt cache of 1 hour when the login of the turn is a Claude subscription token. Otherwise Claude asks for about 5 minutes.
  - A turn on an own endpoint runs Claude in its API key mode. So it asks for about 5 minutes.
  - An own endpoint can pool subscriptions, as Cal's proxy does. It can also bill a metered API key, or send the request to another cloud, such as Amazon Bedrock.
  - Anthropic charges 1.25 times the input price to write the 5-minute cache, and 2 times the input price to write the 1-hour cache.
  - The app cannot tell from the address or the key what is behind an endpoint.
- **Problem:** After each pause of more than 5 minutes, the next request of a turn on an own endpoint writes the whole cache again.
- **Impact if no action:** A subscription pool behind an own endpoint uses its limits faster than a subscription token that the app holds.
- **Root question:** How long does the prompt cache of a Claude turn on an own endpoint last?
- **Options:**
  - **A.** Keep about 5 minutes for every own endpoint. Cost: a subscription pool writes the cache again after each pause of more than 5 minutes. Effort: Small.
  - **B.** Ask for 1 hour on every Claude own endpoint, as for a subscription token. Cost: a metered key pays more for each cache write, and an endpoint that does not accept the 1-hour cache can fail each turn. The runner command needs a new field. Effort: Medium.
  - **C.** Give each Claude own endpoint login a choice "Keep the prompt cache for 1 hour", off by default. Cost: a field on the account form, a column, a field in the runner command, a runner change, and a mockup. Effort: Medium.
- **Left out:**
  - A change of the request body in the gateway, because the gateway passes each request body unchanged.
  - A check of what is behind the endpoint, because no request or answer shows it reliably.
- **Wider fix:** None. The item chooses a behaviour, and it has no class of defect.
- **Previous examples:** Gateway decision 13, which chose 1 hour for subscription tokens.
- **Recommendation:** C. It gives a subscription pool such as Cal's the 1-hour cache, and it changes the cost and the support of no other endpoint.
- **Action:** ask the user, because the options trade the limits of a pool against the cost and the failures of other endpoints, and no option is clearly best.
- **Chosen:** B, by Cal on 11 November 2026: "B - C later (can we add as
  advanced menu)". Milestone 5d asks for the 1-hour cache on every Claude
  own endpoint. C follows after the merge, as an advanced part of the own
  endpoint form, in `plans/follow-ups/own-endpoint-prompt-cache-choice.md`.

### 13. Choose whether the address rule accepts an IP address

Added on 11 November 2026 from the orchestrator's check of Milestone 5b.

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Product bug.
- **Location:** `isPublicEndpointHost` in `src/shared/endpoint-host.ts`, and the address rule in "Own endpoint logins" of `docs/protocol/tokens-and-secrets.md`.
- **Background:**
  - The address rule of decision 9 E accepts an `https://` address whose host is a public name or a public IP address.
  - Users on Cloudflare's forum reported in 2018 and 2023 that a fetch of a Worker to an IP address fails with "Direct IP access not allowed", error 1003. Cloudflare's docs do not say it.
  - No check ran on Cloudflare, because this machine has no Cloudflare login.
  - A name that points to the IP address works. Free services such as sslip.io give such a name, and Cal's proxy uses one.
  - Few https servers have a certificate for an IP address.
- **Problem:** An endpoint such as `https://203.0.113.7` saves, but each turn on it can fail with an error of Cloudflare.
- **Impact if no action:** A user who enters an IP address can see each turn fail, with an error that does not say why.
- **Root question:** Which hosts does the address rule accept, so that the app saves no address that fails each turn?
- **Options:**
  - **A.** Refuse an IP address as the host, at the form, the save, the dispatch, and the gateway. The refusal says "Use a public https:// address with a host name, without a user name or a password." Cost: a new refusal and a text change in the mockups. Effort: Small.
  - **B.** Keep the rule. After the merge, run a turn on an endpoint with an IP address on `conductive.build`, and refuse IP addresses only if the turn fails. Cost: the check needs an endpoint with a certificate for its IP address. Effort: Small.
  - **C.** Keep the rule, and make the gateway answer such a refused fetch with a cause that says to use a name. Cost: the gateway must recognise an error page of Cloudflare, which can change. Effort: Medium.
- **Left out:** A fetch through a TCP socket of the Worker, because the gateway then needs its own HTTP client.
- **Wider fix:** A. One rule then refuses each address form that a fetch of the Worker cannot reach, as decision 9 E intends.
- **Previous examples:** Decision 9 E, which refused loopback and private addresses because the Worker cannot reach them.
- **Related:** Decision 9 E. Option A changes its rule and its refusal text.
- **Recommendation:** A. A name for an IP address is free and quick to get, so the refusal costs little and prevents a login that fails each turn.
- **Action:** ask the user, because option A adds a refusal and changes the address rule of the protocol.
- **Asked:** on 11 November 2026, Cal asked: "could we use something like
  https://136.115.241.64.sslip.io ?" Such a name works with every option:
  the rule accepts it, and a Worker fetch reaches it. The app does not
  turn an IP address into such a name by itself. Reason: the certificate
  of the server must name the host, and the app would trust a DNS service
  that the user did not choose. The decision stays open.
- **Chosen:** A, by Cal on 11 November 2026, after the changed item that
  adds the guide line about names such as `<IP address>.sslip.io`.
  Milestone 5e applies it.

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
- On 11 November 2026, a local workerd refused a fetch to a public name
  that a local resolver pointed to `127.0.0.1`. Cloudflare's blog of 2
  February 2023 says that its proxy refuses resolved localhost and private
  addresses. No check ran on Cloudflare. Evidence:
  `.context/own-endpoint-logins/m5b/network-findings.md`.
- A fetch of the Worker reaches any port of a host outside Cloudflare's
  proxy. For a host behind Cloudflare's proxy, it reaches only the https
  ports 443, 2053, 2083, 2087, 2096, and 8443, and Cloudflare ignores
  another port. Source: the `allow_custom_ports` entry of Cloudflare's
  compatibility flags, which is on for the Worker's date.

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
  from the mockups. Changed on 10 November 2026: the function holds the
  builder of decision 9 E, which the gateway also uses.
- The protocol says that the agent program on the cloud computer calls
  the endpoint. So a loopback address reaches only a proxy on the cloud
  computer. Agent call of 9 November 2026, from the mockups. Superseded on
  10 November 2026: the gateway in the Worker calls the endpoint.
- The hint of an own endpoint key promises no test, because the save
  sends no request to the endpoint. The hints of the other kinds stay as
  they are. On a
  phone, the kind choice wraps onto two lines. Agent call of 9 November
  2026, from the mockups. Since decision 10 G, the save reads the model
  list with the key, and the hint still promises nothing about a test.
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
- Decision 10 G hides a model only after a read of the endpoint's list
  that worked. Before the first such read, the pickers show every app
  model. When the list names no app model of an agent, the pickers show
  every app model of that agent, and the account page says that the list
  names none of them. The picker of a session keeps its current model,
  also when the list no longer names it. Reason: a picker with no model
  cannot start a turn, and a hidden current model hides the state of the
  session. Agent call of 10 November 2026.
- The pickers of other members in a session on the owner's login show
  every app model, as option G says. A turn on a model that the endpoint
  does not serve fails with a cause that names the model ID and no host
  (decision 5). Agent call of 10 November 2026.
- Every picker of the owner follows the list: the composer, the new
  workspace dialog, routines, and the default model in Preferences. The
  agent tool `list_models` keeps the full app list, because it has no
  login of its own. Agent call of 10 November 2026.
- The runner runs an own endpoint turn in the API key mode of its agent,
  with a turn token. So the runner needs no change. Agent call of 11
  November 2026, from Milestone 5b.
- The gateway adds the query of the agent's request after the query of the
  saved address, so that both reach the endpoint. Agent call of 11
  November 2026, from Milestone 5b.
- The error redaction hides the saved address, the built address, its
  origin, its host, and the key. Agent call of 11 November 2026, from
  Milestone 5b.
- The rule refuses no port. Reason: a host outside Cloudflare's proxy takes
  any port, and the rule cannot tell whether a host is behind the proxy.
  Agent call of 11 November 2026.
- The two header rules of an Anthropic API key also apply to a Claude own
  endpoint login: the turn token can be in `x-api-key` or in a bearer
  header, and the gateway removes only the `oauth-2025-04-20` value from
  `anthropic-beta`. Reason: the endpoint gets the key in `x-api-key`,
  Claude runs the turn in its API key mode, and the key does not use the
  OAuth login mode. Agent call of 11 November 2026, from the Milestone 2b
  docs report.
- The rule takes the product domain from `docs/mockups/src/brand.ts`, and
  the Worker adds the preview domain of its configuration. Reason: one
  change of the brand file renames the product. Agent call of 11 November
  2026, from the check of Milestone 5b.
- A read of the session metadata checks the address from the plain origin
  column, and decrypts nothing. The dispatch and the gateway check the
  whole address. Agent call of 11 November 2026, from the check of
  Milestone 5b.
- A read of the model list waits at most 10 seconds and reads at most 1
  MiB. The save and Refresh wait for it, so that the account page shows
  the new list at once. A failed read never fails the save. Agent call of
  11 November 2026, from Milestone 5c.
- Each read attempt counts toward the 10-minute limit of the background
  read, also a failed one. A late answer for a replaced login never
  replaces newer data. Agent call of 11 November 2026, from Milestone 5c.
- The account data names the missing app models, also when the list names
  none of them. The browser then hides nothing of that agent, as the
  design call about decision 10 G says. Agent call of 11 November 2026,
  from Milestone 5c.
- A Claude read asks for `limit=1000`, and an answer with `has_more: true`
  counts as a failed read. Reason: Anthropic's list returns 20 models by
  default, and a list that is not whole must not hide a model. Agent call
  of 11 November 2026, from the check of Milestone 5c.
- The composer of a session on the reader's own login follows the
  reader's model lists, also before a message that starts a linked
  session, because that message runs on the reader's own login. The
  composer of a session on another member's login offers every model.
  Agent call of 11 November 2026, from Milestone 6.
- The account page shows no model list line before the first read that
  worked, or when the list names every app model. The line also shows in
  Get started, which shares the agent list. Agent call of 11 November
  2026, from Milestone 6.
- After a save or Refresh, the browser reads the account again, because
  only the account data holds the list. If that read fails, the save still
  succeeds, and the pickers hide nothing until the next read. Agent call of
  11 November 2026, from Milestone 6.
- The turn credential of a Claude own endpoint turn carries an optional
  `promptCacheTtl: '1h'`, and keeps the kind `api-key`. Reason: a runner
  that does not know the field ignores it, while it refuses an unknown
  kind. So the runner protocol version stays 2. Agent call of 11 November
  2026, from Milestone 5d.
- The protocol says "a runner that does not support this request", not
  "an older runner", because "older runner" means a runner of protocol 1
  in `docs/protocol/isolation.md`. Agent call of 11 November 2026, from
  the Milestone 5d docs.
- The rule checks the host after the URL parser normalizes it, so that
  other spellings of an IPv4 address are refused too. The cause of a turn
  on a saved login with an IP address also asks for a host name. Agent
  call of 11 November 2026, from Milestone 5e.
- The public pages say "agent software that supports temporary
  credentials" for a runner of protocol 2 or later, and they name the
  1-hour prompt cache in the agent logins guide, because it affects what
  an endpoint must support and what it costs. Agent call of 11 November
  2026, from Milestone 6.
- The Bedrock row of the Conductor comparison says that an own endpoint
  can give access through a compatible API, and the row "Custom API
  endpoints" is Available. Agent call of 11 November 2026, from
  Milestone 6.

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

- [x] Change the login label of the composer bar as decision 5 says.
- [x] Change the hint of the endpoint field and the own endpoint text of
      `docs/mockups/orgs-and-logins.md`: the gateway in the Worker sends
      each request, not the cloud computer. Show the refused state of
      decision 9.
- [x] Show decision 10 G in the mockups: the account line of an unlisted
      model with Refresh, the owner's picker without that model, and the
      failed turn that names the model.
- [x] Change the text of the agent step in
      `docs/mockups/src/screens/getStartedCopy.ts` as decision 7 says. The
      app reads the same file.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Dropped on 10 November 2026, because decision 5 changed and decision
      11 closed: settle how the label shows the host in a full phone bar, as
      decision 11 says. Add a state with a running turn to
      `app/composer/own-endpoint`, and correct the texts that say the host
      always stays visible on a phone.

Screenshots: `.context/own-endpoint-logins/m1b/screens/`.

Decision 5 changed on 10 November 2026, so the composer mockups went back
to main's version, with no host and no own endpoint page.

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
- [x] Done in Milestone 2b on 10 November 2026, because Milestone 2 is
      superseded: state what the session record shows about an own
      endpoint login, as decision 5 says.
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

Depends on: 2. Its port list waits for the port check of Milestone 5b.

The protocol states the own endpoint login with the gateway.

- [x] In "Agent logins" of `docs/protocol/tokens-and-secrets.md`, state
      the own endpoint login: an endpoint and a key for each agent, a
      write-only key and address, the host on the account page, the
      address rule of decision 9, and the API that each agent's endpoint
      must serve.
- [x] In `docs/protocol/model-gateway.md`, state that the gateway forwards
      the requests of an own endpoint turn to the endpoint, that the
      endpoint gets the messages and the files of those turns, the ports
      that the gateway reaches, and the cause of a failed own endpoint
      turn.
- [x] In "Agent logins in a sandbox" of `docs/protocol/isolation.md`,
      state that a new own endpoint login is shared by default (decision 4
      B), that the runner never gets an own endpoint or its key, and what
      the session record shows (decision 5). Change the composer label
      rules in `docs/protocol/messages-and-attachments.md` as decision 5
      says.
- [x] In "Models" of `docs/deployment.md`, state how an own endpoint's
      models work, as decision 10 says.
- [x] Update the data flow and the trust boundaries in
      `docs/architecture/flows.md` and `docs/architecture/data-and-trust.md`.
- [x] Update the feature list and "What a user needs" in `README.md`.
- [x] Read both legal pages in full, as `AGENTS.md` says, and list each
      sentence that Milestone 6 must change.
- [x] Add the own endpoint as an upstream in
      `docs/architecture/components.md`, which names only Anthropic and
      OpenAI.
- [x] State the list of ports in `docs/protocol/model-gateway.md` after the
      port check of Milestone 5b. A refusal of other ports follows decision
      9 E. The rule refuses no port, as the design calls say.
- [x] Change the sentence "The app makes no other call to the endpoint" in
      `docs/protocol/tokens-and-secrets.md` if decision 10 reads the
      endpoint's model list.

The legal sentences that Milestone 6 must change are listed in
`.context/own-endpoint-logins/m2b-report.md`. Evidence of the link check:
`.context/own-endpoint-logins/m2b/`.

Decision 5 changed on 10 November 2026: the protocol now says that the
session record and the composer label name no host, and it records the
host label as rejected.

On 11 November 2026, the last two TODOs also split the gateway protocol:
"Requests and answers", "Own endpoints", "Streams", "No copies", and
"Risks" moved to `docs/protocol/model-gateway-requests.md`. The legal and
guide sentences that Milestone 6 must change are listed again in
`.context/own-endpoint-logins/m2b-leftovers-report.md`.

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
- [x] Dropped on 10 November 2026, because decision 5 changed: send in the
      session record what decision 5 chooses about the login of the
      starter.
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

Depends on: 2b, 4. Its address rule is the builder of decision 9 E.

The gateway sends the model requests of an own endpoint turn to the
endpoint, with the real key that stays in the Worker. This milestone does
the tasks of `plans/follow-ups/own-endpoints-through-model-gateway.md`.

- [x] Let the gateway's login reader decrypt an own endpoint login, and
      remove the refusal that Milestone 4 added. The runner still gets
      only the gateway address and a turn token.
- [x] Forward each allowed model route to the stored endpoint. Keep the
      gateway's body limit, allowed headers, error redaction, turn and
      access checks, login change checks, cancellation, and request lease.
      Milestone 5c reads the endpoint's model list.
- [x] Send the key in `x-api-key` for Claude and in `Authorization:
      Bearer` for Codex.
- [x] Use the address rule of decision 9 at the save and before every
      fetch to the endpoint, and follow no redirect. Check that
      `global_fetch_strictly_public` refuses a public name that points to
      a private address.
- [x] Check the address when the Worker dispatches a turn. A refused
      address fails the turn before an agent starts, with a plain cause
      that names the starter and the agent and points to the account page.
      A failed connection names the endpoint as unreachable.
- [x] Keep main's unusable-login path for a runner of protocol 1.
- [x] Check which https ports a Worker fetch reaches on a host outside
      Cloudflare, for the protocol text of Milestone 2b.
- [x] Add tests: a public endpoint, refusals at the save, the dispatch,
      and the fetch, an unreachable endpoint, the failed-turn cause, both
      agents' key headers, no endpoint or key in a runner command, a
      runner of protocol 1, and secret endpoint values in the error
      redaction.
- [x] Update the READMEs of the changed areas.
- [x] Remove the `oauth-2025-04-20` beta value for a Claude own endpoint,
      as the gateway does for an Anthropic API key, because the endpoint
      gets the key in `x-api-key`.
- [x] Check whether an own endpoint that pools subscriptions should get the
      1-hour prompt cache of gateway decision 13, which today applies only
      to a subscription token. Raise a decision if it should.
- [x] Replace the rule in `src/shared/endpoint-address.ts` with the builder
      of decision 9 E, and its refusal text with the mockup's: "Use a
      public https:// address, without a user name or a password."

The gateway forwards own endpoint turns for both agents since 11 November
2026. The flag `global_fetch_strictly_public` routes same-zone requests
through the public front door. It is not the check of a resolved address.
That check is the outbound network of workerd locally, and the deny list
of Cloudflare's proxy in production, as "Facts from the checks" says. The
cache check raised decision 12, and the orchestrator's check raised
decision 13. Evidence: `.context/own-endpoint-logins/m5b/` and
`.context/own-endpoint-logins/m5b-fixes/`.

## Milestone 5c: Read the endpoint's model list

Depends on: 5b

The Worker reads the model list of each own endpoint, as decision 10 G
says, and the account API gives the browser what the pickers hide.

- [x] Read `GET /v1/models` of the endpoint through the address builder of
      decision 9 E, with the key in the header of its agent, under the
      fetch rules of the gateway.
- [x] Read it at the save, on a Refresh route of the account, and in the
      background when a turn on the login starts, at most once in 10
      minutes. A failed read keeps the last list and its time.
- [x] Store the last list that worked and its time for each own endpoint
      login, with a migration that keeps every row.
- [x] Give the browser, for each own endpoint login of the account, the
      app models that the last list does not name and the time of the
      last read. Give nothing to other members.
- [x] Make a turn that fails because the endpoint does not serve its model
      end with "The endpoint of this login does not serve <model ID>.
      Choose another model.", with no host.
- [x] Add tests: each read time, a failed read, a list that names no app
      model, the account response, the background limit, and the failure
      text for both agents.
- [x] Update the READMEs of the changed areas.

The Worker reads the model list of each own endpoint since 11 November
2026. The account data gives the owner `modelList`, with the missing app
model IDs and the time of the last read that worked. Evidence:
`.context/own-endpoint-logins/m5c/` and
`.context/own-endpoint-logins/m5c-pagination/`.

## Milestone 5d: Ask for the 1-hour prompt cache on a Claude own endpoint

Depends on: 5b

Claude asks for a prompt cache of 1 hour on every turn on a Claude own
endpoint login, as decision 12 B says.

- [x] Add an optional field to the turn credential of a runner of protocol
      2, in `src/shared/runner.ts`, that asks for the 1-hour prompt cache.
      The Worker sets it for a Claude turn on an own endpoint login only.
- [x] Make the runner ask for the 1-hour cache when the field asks for it,
      as it does for a subscription token. An older runner ignores the
      field and keeps the default cache.
- [x] State the rule next to gateway decision 13 in "How the agents reach
      the gateway" of `docs/protocol/model-gateway.md`, and in
      `docs/protocol/agent-runner.md` if it names the fields of the turn
      credential.
- [x] Add tests: the Worker sets the field only for a Claude own endpoint
      turn, the runner then asks for the 1-hour cache, and a credential
      without the field keeps the default.
- [x] Update the READMEs of the changed areas.

Claude asks for the 1-hour cache on a Claude own endpoint since 11
November 2026, with the turn credential field `promptCacheTtl: '1h'`. The
same change keeps the model list in the reply of a share change, a defect
that the Milestone 6 UI check found. Evidence:
`.context/own-endpoint-logins/non-ui-5d/` and
`.context/own-endpoint-logins/m5d-docs/`.

## Milestone 5e: Refuse an IP address as the endpoint host

Depends on: 5b

The address rule refuses an IP address as the host, as decision 13 A
says, so that the app saves no address that fails each turn.

- [x] Refuse an IP address, IPv4 or IPv6, as the host in the shared rule
      of `src/shared/endpoint-address.ts`, so that the form, the save, the
      dispatch, and the gateway refuse it. The refusal says "Use a public
      https:// address with a host name, without a user name or a
      password." A saved login with an IP address then counts as a login
      that cannot be used, with the cause of Milestone 5b.
- [x] State the rule and its reason in "Own endpoint logins" of
      `docs/protocol/tokens-and-secrets.md`.
- [x] Change the refusal text and the rule in the mockups.
- [x] Say in the agent logins guide that a free name such as
      `<IP address>.sslip.io` works when the server has a certificate for
      that name. The legal and guide step of Milestone 6 does it.
- [x] Add tests: an IPv4 and an IPv6 host refused at the save, the
      dispatch, and the fetch, and a name such as
      `136.115.241.64.sslip.io` accepted.
- [x] Update the READMEs of the changed areas.

The rule refuses each IP address host since 11 November 2026. The same
change moved the browser setup of `worker/chat/backend.ts` into
`worker/chat/sockets.ts` without a change of behaviour, because the merge
of main brought that file to 301 lines. Evidence:
`.context/own-endpoint-logins/m5e/`.

## Milestone 6: Account and Get started

Tags: ui

Depends on: 1, 1b, 2b, 4, 5c

The account page and Get started connect an own endpoint, as the mockups
show.

- [x] Add the kind to `AgentConnectForm`, `labels.ts`, and `AgentList` in
      `src/shell/account/`. Show its share setting with
      `LoginShareSetting`. Let the kind choice wrap on a phone.
- [x] Call the shared address rule in the form, and show its refusal at
      the endpoint field.
- [x] Show the model list and its marks, as decision 10 says. Take the
      models from `GET /api/models`, not from the mockup fixtures.
- [x] Check the agent step of Get started, which reuses `AgentList` in
      `src/shell/onboarding/AgentStep.tsx`.
- [x] Say on the Privacy page in `src/marketing/privacy.ts` and
      `src/marketing/privacy-uses.ts` that a chosen
      endpoint gets the messages and the files. Name the endpoint address,
      stored encrypted, under "Keys and logins". Say that the app reads the
      endpoint's model list with the key (decision 10 G).
- [x] Update `src/marketing/terms.ts` and `src/marketing/terms-org.ts`: they name only the terms of
      Anthropic or OpenAI, and the share defaults of two kinds. Raise
      `TERMS_VERSION` in `src/shared/terms.ts`.
- [x] Dropped on 10 November 2026, because decision 5 changed: show the own
      endpoint in the login label of the composer bar, as decision 5 says and
      the mockups show.
- [x] Extend `src/shell/account/AccountScreen.test.tsx` and
      `src/shell/onboarding/GetStartedSteps.test.tsx`.
- [x] Update the public guides of the website for the own endpoint:
      `agent-logins.md`, `get-started.md`, `overview.md`, `security.md`, and
      `sessions-and-chat.md` under `src/marketing/docs/`, at the lines that
      the Milestone 2b report lists.
- [x] Mark the "Custom API endpoints" row of the Conductor comparison done,
      in `src/marketing/from-conductor/areas/models-and-providers.ts`.
- [x] Remove "not complete yet" from the README when the account page
      offers the kind and turns run on it.

The legal pages, the public guides, the comparison rows, and the README
state the own endpoint login since 11 November 2026, with a new revision
of the Terms. Evidence: `.context/own-endpoint-logins/m6-external-docs/`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

The merge decisions of the merge of main on 11 November 2026 are in
`.context/own-endpoint-logins/merge3-decisions.md`. The pull request
description copies them.

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
