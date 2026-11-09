# Worker model gateway

Status: Active. On branch `conductor/model-gateway-worker-model-proxy-decision-120`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Agents powered by Claude and Codex run in the cloud computer of each
workspace. Today the workspace Durable Object sends the real agent login
of the session starter to the runner with each turn. So each process in
the cloud computer can read that login while the turn runs. This change
keeps every agent login out of a cloud computer from a newer image. The
agent programs send their model requests to a new Worker route, the
gateway, with a turn token. The gateway checks the turn, adds the real
login, and forwards each request to Anthropic, OpenAI, or the user's own
endpoint. Cal chose this approach on 8 November 2026, as decision 120 A of
[the main plan](boat-native-remote-workspaces.md).

The change does not cover a runner update for existing cloud computers,
the own-endpoint login kind itself, or the GitHub token of a turn. The
own-endpoint login comes from a separate change, the "CLI Proxy Setup"
workspace on branch `calummoore/bootstrap-v17`. Milestones 5 to 9 wait
until that change merges into `origin/main`. The brainstorm report is
`.context/model-gateway/reports/brainstorm.md`, and Cal's answers are in
`.context/model-gateway/answers.md`.

Contract owners:

- `docs/protocol/model-gateway.md`, which Milestone 1 creates.
- [Access and security](../docs/protocol/access-and-security.md).
- [Chat and events](../docs/protocol/chat-and-events.md).
- [Architecture](../docs/architecture.md).
- The [runner README](../runner/README.md) and its
  [agent logins page](../runner/agent-logins.md).
- The [Worker README](../worker/README.md).
- The [marketing README](../src/marketing/README.md), for the legal drafts.

Replaced ways:

- The real agent login in the runner commands → a turn token in the
  `turn` command of runner protocol version 2. Consumers:
  - `RunnerTurn.login` and `RunnerMessageDuringTurn.login` in
    `src/shared/runner.ts`. Moved in Milestone 6.
  - The command builder in `worker/chat/runner-delivery.ts`. Moved in
    Milestone 6.
  - The runner: `runner/src/commands.ts`, `runner/src/engine-session.ts`,
    `runner/src/runner.ts`, `runner/src/providers/types.ts`,
    `runner/src/providers/claude.ts`, `runner/src/providers/claude-process.ts`,
    `runner/src/providers/codex.ts`, and `runner/src/measure.ts`. Moved in
    Milestone 7.
  - The runner tests that build a command or an adapter with a login:
    `chat-limits.test.ts`, `engine-model-input.test.ts`,
    `senders.test.ts`, and the provider tests `cancel.test.ts`,
    `claude-input-window.test.ts`, `claude-login.test.ts`,
    `codex-login.test.ts`, `codex.test.ts`, `computer-mcp.test.ts`, and
    `workspace-tools.test.ts`. Moved in Milestone 7.
  - The Worker tests that build runner commands with a login, under
    `worker/chat/`. Moved in Milestone 6.
  - `runner/agent-logins.md` and `runner/README.md`. Moved in Milestone 7.
  - The Worker keeps the version 1 commands for older runners, because
    decision 2 A chose so. Older runners live in org images and disks
    outside the repository. The old way has no end date.
    `plans/follow-ups/runner-update-at-start.md` records how it could end.
- The Codex model provider address `https://api.openai.com/v1` in
  `runner/src/providers/codex.ts` → the gateway address of Codex. Moved in
  Milestone 7.
- The direct route of the own-endpoint login in the runner, after that
  change merges → the gateway. Consumers: the runner code that the
  own-endpoint change adds. Moved in Milestone 7.

## Decisions

### Decision 120: Keep agent logins out of the sandbox

Recorded in [the main plan](boat-native-remote-workspaces.md), decision
120. Its options were a model proxy in the Worker with a turn token in the
sandbox, an HTTPS proxy on a new server, Boat's AI credentials proxy, and
agent programs outside the sandbox. Cal chose the Worker model proxy on
8 November 2026, as a later follow-up of that plan. It reverses the
earlier rejection of a login proxy in the access doc. This plan builds it.

Decisions 1 to 5 come from the brainstorm of 8 November 2026. Cal
answered each one on 9 November 2026. The options check of 9 November 2026
added options to decisions 2 and 5, and moved three design calls to Cal as
decisions 6, 7, and 8. Its report is
`.context/model-gateway/reports/options-check.md`. Decisions 6 to 8, and
the new options of decisions 2 and 5, wait for Cal.

### 1. Subscription tokens wait for Cal's check

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `runner/src/providers/claude-process.ts`, `readAgentLogin` in `worker/chat/queries.ts`, and the sections "Agent logins in a sandbox" and "Agent logins" of `docs/protocol/access-and-security.md`.
- **Terms:**
  - **Provider check:** Cal's record that Anthropic's permission of decision 37 of the main plan covers a Worker that holds a subscription token and adds it to each model request.
- **Background:**
  - A Claude login is a subscription token from `claude setup-token`, or an Anthropic API key. Codex uses an OpenAI API key.
  - Decision 37 of the main plan records Anthropic's permission to use setup tokens. Nobody had checked that it covers a proxy.
  - Anthropic's legal page, read on 8 November 2026, says that developers "may not collect, store, or intermediate Claude.ai credentials or session tokens".
  - The same page says that customers "may not pay for, resell, or intermediate Claude usage on their end users' behalf". It also says that this "does not restrict how customers provision and manage their own API keys", "provided the resulting usage is billed to the key owner".
- **Problem:** The gateway could move API keys out of the sandbox before the provider check. Subscription tokens could not move until Cal recorded the check.
- **Impact if no action:** The plan cannot say which logins the first gateway release covers.
- **Root question:** Which Claude logins go through the gateway before Cal records the provider check?
- **Options:**
  - **A.** Anthropic and OpenAI API keys go through the gateway at once. A subscription-token session keeps the current private pipe until Cal records the check. Effort: Small.
  - **B.** Only OpenAI API keys go through the gateway at once. Both Claude login kinds wait for one check that covers both. Effort: Small.
  - **C.** As A, but the app stops using subscription tokens until the check. Effort: Medium.
  - **D.** Hold the cutover of every login kind until the check. Effort: Small.
- **Shared assumptions:** Cal's check is the only gate for subscription tokens. OpenAI API keys need no check, an assumption with no source, which D drops.
- **Left out:** Send every kind through the gateway now and check later, because Cal required the check first.
- **Wider fix:** None. The answer is a one-time rule about provider terms.
- **Previous examples:** Decision 37 of the main plan, and the check note of its decision 120.
- **Related:** Decision 2. Option A of both decisions kept the old login route.
- **Recommendation:** D, after the options check of 9 November 2026. The first recommendation was A. Cal recorded the check before any cutover, so D gives the outcome with no wait.
- **Action:** ask the user, because Cal asked to decide this himself.
- **Chosen by Cal on 9 November 2026:** the provider check is done. Cal wrote: "I checked with anthropic and this is fine, because of security reasons". So every login kind goes through the gateway on a newer runner, also the subscription token. Options A to D no longer apply. Open check 2, about OpenAI's terms, stays, because the answer covers Anthropic only.

### 2. Older runners keep real logins

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `src/shared/runner.ts`, `worker/chat/runner-input.ts`, and the section "The agent runner" of `docs/protocol/chat-and-events.md`.
- **Terms:**
  - **Runner protocol version:** the number that the runner sends in its first message. The Worker accepts only version 1 before this change.
- **Background:**
  - Each build of an org image installs the newest runner. A refresh keeps the installed runner (`docs/deployment.md`).
  - A workspace keeps the runner of the image that it started from, also after a stop and a resume. So an older runner stays in each existing cloud computer, and in each new workspace of an org whose image has no new build.
  - The chat protocol requires that the Durable Object serve each runner version that a live org image or disk can hold.
  - An older runner cannot use a turn token. It does not point the agent program at the gateway, so the provider refuses the token.
- **Problem:** After the cutover, the Durable Object must keep sending real logins to older runners, or stop their turns.
- **Impact if no action:** The plan either keeps the old risk in older cloud computers, or breaks the version rule without a decision.
- **Root question:** How do cloud computers with an older runner stop holding real logins after the gateway lands?
- **Options:**
  - **A.** Keep sending the real login to an older runner, and state the risk. Only a newer runner gets turn tokens. Cost: the risk has no end date. Effort: Small.
  - **B.** Refuse each turn of an older runner at the cutover, with a cause that asks for a new workspace after a new image build. Cost: existing workspaces lose agent turns. Effort: Medium.
  - **C.** A for a fixed time, then B. Effort: Medium.
- **Shared assumptions:** The runner of a cloud computer changes only with a new workspace from a newer image. The Worker can tell an older runner by its version.
- **Left out:** A runner update at each start, a prerequisite outside this scope. Turn tokens for older runners, because the provider refuses them.
- **Wider fix:** The runner update at each start, outside this scope. `plans/follow-ups/runner-update-at-start.md` records it.
- **Previous examples:** None found.
- **Related:** Decision 1, and decision 5, which this answer opened.
- **Recommendation:** B. The project is not in production, so B met the goal at once.
- **Action:** ask the user, because B removes functionality on `origin/main` and changes a requirement of the chat protocol.
- **Chosen by Cal on 9 November 2026:** A. A runner of protocol version 1 keeps getting the real login, and the access doc states that risk. The chat protocol rule to serve each live runner version stays, within the pin of decision 5. `plans/follow-ups/agent-login-in-tool-processes.md` stays for older runners.
- **Options check of 9 November 2026:** the check brought back the runner update, because "outside this scope" is not a valid reason to leave out an approach. It added E. The recommendation stays B, and the wider fix becomes D. Cal's choice A stands until he answers D and E.
  - **D.** Update the runner at each start. The start command already runs with `sudo -n` at each create and each resume (`worker/lifecycle/image-software.ts`). It checks the digest of the current runner archive, installs it, and restarts the runner service. The Worker then refuses version 1 in each workspace whose last start installed a newer runner. Cost: each first start after a runner release downloads the archive, and a newer runner must read the saved state of an older one. Effort: Large.
  - **E.** A, plus each refresh installs the newest runner when the org image holds an older one. Each new workspace then gets a newer runner within one day, with no build by an admin. Cost: such a refresh takes longer, and existing workspaces keep the risk of A. Effort: Medium.

### 3. The gateway needs its own body limit

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `requestBodyBudget` in `worker/http/request-body.ts`, and the section "Request bodies" of `docs/protocol/access-and-security.md`.
- **Background:**
  - The default body limit is 1,000,000 bytes. A route that needs more declares its limit at the Worker entry (decisions 65 and 93 of the main plan).
  - Anthropic accepts Messages and Token Counting requests up to 128 MB. Its cloud platforms accept 32 MB or less. Source: Anthropic's API overview, read on 8 November 2026.
  - Cloudflare refuses request bodies over 100 MB on the Free and Pro plans of a zone, and over 200 MB on Business.
  - An isolate has 128 MB of memory for all its requests together, so a large limit needs an upload that streams.
- **Problem:** Model requests can pass the default limit. No requirement gave the number for the gateway.
- **Impact if no action:** A request over 1,000,000 bytes fails with HTTP 413, for example a request with one large screenshot.
- **Root question:** How large can one model request through the gateway be?
- **Options:**
  - **A.** 32 MB. Cost: a long session with many images can fail until it compacts. Effort: Small.
  - **B.** 100 MB, the most that Cloudflare accepts on a Free or Pro zone. Effort: Small.
  - **C.** 128 MB, Anthropic's maximum, with a Business or Enterprise zone plan. Effort: Small, plus the plan.
  - **D.** One limit for each upstream. OpenAI's limit was not verified. Effort: Medium.
- **Shared assumptions:** The Worker counts the bytes, answers HTTP 413 with `body_too_large`, and streams the upload.
- **Left out:** The 1,000,000-byte default, because it fails ordinary agent requests. No limit, because decisions 65 and 93 require a limit for every body.
- **Wider fix:** None. Decision 93 already gives one place for every limit.
- **Previous examples:** The GitHub webhook limit of 26 MiB. Option C of decision 121 of the main plan found the same 100 MB cap for a Git proxy.
- **Related:** None.
- **Recommendation:** B. It refuses no request that Cloudflare accepts on the usual plans.
- **Action:** ask the user, because the number is an app policy that becomes a protocol requirement.
- **Chosen by Cal on 9 November 2026:** B. Design call D21 sets it at 100,000,000 bytes.

### 4. Own endpoints at a private address

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** None. The own-endpoint login is not on `origin/main` yet.
- **Terms:**
  - **Own endpoint:** a login kind of the "CLI Proxy Setup" workspace. It holds a user's model endpoint address and key.
  - **Private address:** a loopback, private-network, link-local, or internal address. The Worker must not fetch it.
- **Background:**
  - Cal requires that the gateway treat the own endpoint as one more upstream, and refuse private and internal upstream addresses.
  - The own-endpoint workspace still has an open item about the addresses that a user can save. Its recommended option allows `http://` for a loopback address.
  - The Worker cannot reach a loopback address in a cloud computer.
- **Problem:** No rule said what a turn on such a login does.
- **Impact if no action:** A login that the account page accepts fails in every turn, with no clear cause.
- **Root question:** How does a turn run on an own endpoint that the gateway must not reach?
- **Options:**
  - **A.** The turn fails and names the cause. The save rule of the own endpoint can refuse such addresses too. Effort: Small.
  - **B.** A loopback endpoint goes around the gateway with the real key. Cost: an exception to "no real login in the sandbox". Effort: Medium.
  - **C.** Each refused address goes around the gateway. Cost: the key stays in the sandbox, also after the turn. Effort: Medium.
- **Shared assumptions:** The gateway never fetches a private address, and the own-endpoint change merges first. Both come from Cal's task message.
- **Left out:** The gateway fetches a private address, because Cal forbids it.
- **Wider fix:** A. One address rule then serves the save and the gateway.
- **Previous examples:** The open address item of the own-endpoint workspace.
- **Related:** That open item. Option A conflicts with its recommended loopback rule.
- **Recommendation:** A. It keeps the goal for every login kind.
- **Action:** ask the user, because A adds a new rejection and conflicts with an open item of another workspace.
- **Chosen by Cal on 9 November 2026:** A. Design calls D22 and D28 give the mechanics. The own-endpoint workspace's address item should match.

### 5. A fake older runner can get real logins

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `open` in `worker/chat/runner-channel.ts`, `worker/chat/runner-input.ts`, and the risk of decision 124 in `docs/protocol/access-and-security.md`.
- **Terms:**
  - **Workspace token:** the secret that a cloud computer uses to call the Worker. Each process there can read it.
- **Background:**
  - Any process with the workspace token can open the runner connection. A new connection replaces the current one, in `open` of `worker/chat/runner-channel.ts`.
  - The access doc already states this risk for a copied workspace token (decision 124 of the main plan).
  - Decision 2 A keeps real logins for version 1. The version is only a number that the runner sends.
- **Problem:** Sandbox code in any workspace could connect as a version 1 runner and get the real login of the next turn.
- **Impact if no action:** The gateway then protects no workspace against code that targets the login.
- **Root question:** How does a workspace with a newer runner stop a fake older runner from getting real logins?
- **Options:**
  - **A.** Pin the version by image. Each image build records the runner version that it installed. A workspace refuses a runner below the version of its image. Cost: a migration. Effort: Medium.
  - **B.** Pin the version by the first connection. Cost: a program that the image or the startup script starts can connect first and pin version 1. Effort: Small.
  - **C.** Accept it, and state the risk. Effort: Small.
- **Shared assumptions:** Each process can read the workspace token. Version 1 keeps real logins, from decision 2 A.
- **Left out:** Decision 2 B, which Cal did not choose. A pin by the creation date of the workspace, which breaks decision 2 A for a new workspace from an old image. A proof of the runner's version, because sandbox code can do all that the runner does.
- **Wider fix:** A.
- **Previous examples:** The risk of decision 124 of the main plan.
- **Related:** Decision 2.
- **Recommendation:** A. It closes the gap for every workspace from a newer image, with no race at the first start.
- **Action:** ask the user, because each fix adds a new rejection of a runner connection.
- **Chosen by Cal on 9 November 2026:** A. Design calls D18 to D20 give the mechanics.
- **Options check of 9 November 2026:** better root question: "How does the Worker decide that a runner connection may get a real login, from facts that sandbox code cannot change?". A needs no migration, because `workspaces.runner_protocol_version` and `image_builds.runner_protocol_version` already exist. The recommendation stays A. Cal's choice A stands.
  - **D.** Pin the version at each start. With option D of decision 2, the start command installs the current runner and records its version on the workspace. The workspace refuses a lower version until its next start. It also covers workspaces from older images. Cost: it needs option D of decision 2. Effort: Large, with that option.

### 6. How soon an open answer stops after its turn

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** The gateway route, which Milestone 3 adds, and `activeStoredTurn` in `worker/devices/access.ts`.
- **Background:**
  - The gateway checks the turn when a request arrives. An answer can stream for many minutes.
  - The runner closes the agent process before it reports the end of a turn (`runner/README.md`). So the agent's own answers end before the turn ends.
  - A process that copied the turn token can start a request just before the turn ends. Its answer then streams after the end, on the starter's login.
  - The orchestrator's check of 8 November 2026 asked that this bound be Cal's choice.
- **Problem:** No requirement says how long an answer may stream after its turn ends.
- **Impact if no action:** The plan cannot state the bound, and a copied token can keep an answer streaming after the turn.
- **Root question:** How soon does an answer that started during a turn stop after the turn ends?
- **Options:**
  - **A.** Each answer runs to its end. The provider's limits, such as the maximum output of the model, bound it. Cost: a copied token can spend the login for some minutes after the turn. Effort: Small.
  - **B.** The Worker checks the turn again at a fixed interval while an answer streams, for example every 30 seconds. It ends the stream after the turn ends. Cost: one turn check per interval for each open answer. Effort: Small.
  - **C.** The workspace Durable Object keeps a list of the open answers of each turn, and ends them when the turn ends. Cost: more state in the Durable Object, and a signal to each Worker request that streams. Effort: Medium.
- **Shared assumptions:** The agent's own answers end before the turn ends. Source: `runner/README.md`.
- **Left out:** Each answer streams through the Durable Object. One object would then carry every long stream of its workspace, and its restart would end them all.
- **Wider fix:** None. The bound is one policy value.
- **Previous examples:** None found.
- **Related:** Decision 7: both decide what the gateway checks during a turn.
- **Recommendation:** B. It meets the goal within a short bound, and the agent's own answers never meet it.
- **Action:** ask the user, because the bound is a new security requirement at the boundary.

### 7. A login that changes during a turn

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `readAgentLogin` and `senderLoginAccess` in `worker/chat/queries.ts`, and the section "Agent logins in a sandbox" of `docs/protocol/access-and-security.md`.
- **Background:**
  - Today the runner gets the login once, with the `turn` command, and keeps it for the whole turn. A change of the saved login applies at the next turn.
  - The gateway adds the login to each model request, so it can read the saved login at each request.
  - The access doc gives a starter's login only while the starter is a member of the org.
  - A member can replace or remove a saved login at any time. With an own endpoint, a change can also move the endpoint address.
  - The orchestrator's check of 8 November 2026 asked that this be Cal's choice.
- **Problem:** No requirement says which login a running turn uses after the starter changes it, removes it, leaves the org, or is suspended.
- **Impact if no action:** The plan cannot say whether a removed member's login keeps serving a turn, or whether a turn moves to another key or endpoint in its middle.
- **Root question:** Which login does a running turn use when the starter's login or access changes during the turn?
- **Options:**
  - **A.** The login of the turn start serves the whole turn, as today. The gateway checks only that the turn runs. Cost: a removed or suspended starter's login, and a removed login, keep serving the turn until it ends. Effort: Small.
  - **B.** The login of the turn start serves the turn. A removal of the login, or a loss of the starter's access, ends the turn at its next request. A replaced login applies at the next turn. Cost: the Durable Object must keep an encrypted copy of the first login for each running turn. Effort: Small.
  - **C.** The current saved login serves each request. A removal or a loss of access ends the turn at its next request. Cost: a turn can move to another key or endpoint in its middle, which can rewrite the prompt cache or fail on a model that the new endpoint does not serve. Effort: Small.
  - **D.** One login for each turn. Any change of the login, and any loss of access, ends the turn at its next request and names the cause. Try again then starts a turn on the new login. Cost: a key rotation stops the running turn. Effort: Small.
- **Shared assumptions:** The starter of a session never changes (decision 105 F of the main plan). Each member has one saved login for each agent (the key of `agent_logins`).
- **Left out:** None.
- **Wider fix:** None. The rule is one check in the gateway.
- **Previous examples:** Decisions 49 and 105 of the main plan changed whose login a turn uses.
- **Related:** Decision 6.
- **Recommendation:** D. A turn never moves to another key or endpoint, and a loss of access ends it at once, with no copy of the login.
- **Action:** ask the user, because each option sets a new rule at the boundary, and A to C change what the runner does today in different ways.

### 8. Public endpoint addresses that the gateway accepts

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** None. The own-endpoint login is not on `origin/main` yet.
- **Background:**
  - Decision 4 A refuses private addresses. For a public address, the scheme and the port remain open.
  - The gateway adds the real key of the own endpoint to each request. Over `http`, the key and the code cross the internet as plain text.
  - The own-endpoint workspace has an open item about the addresses that a user can save. Its options are any `http` or `https` address, `https` plus loopback `http`, and `https` only.
  - Unverified: which ports a Worker `fetch` can reach on a host outside Cloudflare.
  - The orchestrator's check of 8 November 2026 asked that this be Cal's choice.
- **Problem:** No rule says which public schemes and ports the gateway accepts.
- **Impact if no action:** The gateway either sends keys as plain text, or refuses an endpoint with no rule behind the refusal.
- **Root question:** Which public endpoint addresses may the gateway send a login to?
- **Options:**
  - **A.** Any public `http` or `https` address, on any port that the Worker can reach. Cost: a key over `http` crosses the internet as plain text. Effort: Small.
  - **B.** `https` only, on any port that the Worker can reach. Cost: an endpoint with only `http` cannot serve the agents. Effort: Small.
  - **C.** `https` only, on port 443 only. Cost: a proxy on another port cannot serve the agents. Effort: Small.
- **Shared assumptions:** The private address rule of decision 4 A stays. The user saves the endpoint as a full address.
- **Left out:** None.
- **Wider fix:** None. One rule serves the save and the gateway, as decision 4 A says.
- **Previous examples:** The open address item of the own-endpoint workspace.
- **Related:** Decision 4, and that open item.
- **Recommendation:** B. It keeps keys off plain-text connections and accepts the ports that users run proxies on.
- **Action:** ask the user, because each option adds a rejection, and it must match the open address item of the own-endpoint workspace.

## Design

The gateway is a Worker route on the machine hostname. Each running turn
gets a turn token from the workspace Durable Object. The runner gives the
token to the agent program through the private route of its login kind,
and points the program at the gateway. For each model request, the
gateway asks the Durable Object whether the turn still runs and which
login it uses. Then it forwards the request to the upstream of that login
and streams the answer back. Older runners keep their real login, and
each workspace pins the runner version of its image.

Open checks:

1. Cal's provider check. Done on 9 November 2026 (decision 1).
2. OpenAI's terms for a proxy of a user's own key, and OpenAI's request
   size limit. Milestone 1 reads them.
3. The routes, hosts, and headers of the pinned `claude` program 2.1.318
   for each login kind, its behaviour with a key that is not in
   Anthropic's format, and its support of
   `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`. Milestone 3 runs it against a
   fake gateway.
4. The routes and headers of pinned Codex 0.167.0 on a custom provider,
   such as `/responses/compact` and `/models`. Milestone 3 runs it.
5. Streaming through the deployed Worker, long answers, and deploys. A
   post-merge task.
6. The Workers plan and the zone plan of the deployment. Milestone 3 asks.
7. What a Workers Logs record holds for a gateway request. A post-merge
   task.
8. The effect of `global_fetch_strictly_public` on the Worker's other
   fetches. Milestone 6 checks it.

### Design calls

Each call is an agent call. D1 to D20 are from 8 and 9 November 2026,
D21 to D29 from 9 November 2026. The brainstorm report gives the three or
more approaches of each call.

- **D1. The turn token.** One random token for each turn. The Durable
  Object makes it at dispatch, with a routing part that names the
  workspace. A resent `turn` command carries the same token. Rejected:
  the workspace token with the turn ID, because each process already
  holds the workspace token. A token for each session works in later
  turns. A token for each agent process gains nothing.
- **D2. Token delivery.** The current private routes: the descriptor pipe
  of the `claude` program and the login request of the Codex App Server.
  Rejected: the environment, which each tool process inherits.
- **D3. Token format.** The prefix shape of its login kind, when open
  check 3 confirms Anthropic's documented change of behaviour for a key
  that is not in its format. Otherwise an opaque prefix. Rejected:
  presenting every Claude login as an API key, because a subscription
  request needs the shape that the program adds itself.
- **D4. Turn check.** The Worker route asks the workspace Durable Object,
  as the git credential route does with `credentialSender`, and streams
  the answer itself. Rejected: a stream in the Durable Object, which one
  restart ends for the whole workspace. A D1 table of tokens, which can
  disagree with the Durable Object.
- **D5. End of a stream.** Moved to decision 6, which is open. A stopping
  turn counts as ended for new requests.
- **D6. Login check.** Moved to decision 7, which is open. Each request
  checks at least that the turn runs and that the workspace is live.
- **D7. Routes.** A fixed list for each agent. Claude: `POST /v1/messages`
  and `POST /v1/messages/count_tokens`. Codex: `POST /responses`. Add the
  routes that open checks 3 and 4 find. The gateway refuses
  `HEAD /api/hello` without an upstream call, as Anthropic's guide allows.
  It serves no local model list. `GET /v1/models` joins the list only if
  the own-endpoint change turns on model discovery, and then goes to the
  upstream of the turn. Rejected: every path, which reaches every provider
  API.
- **D8. Headers and bodies.** Request headers pass by a fixed name
  pattern, such as `anthropic-*` and `x-claude-code-*`, and the headers
  that open check 4 lists. The gateway removes credentials, cookies,
  `cf-*`, `x-forwarded-*`, and Conductive headers. Bodies pass unchanged.
  Error bodies pass unchanged, except for the removal of D29. Reason:
  Anthropic's gateway guide asks to forward `anthropic-*` headers and body
  fields as open lists, and error bodies as they are.
- **D9. Address.** One base address for each agent under `/v1/` on
  `api.conductive.build`. The turn picks the upstream.
- **D10. Endpoint in the runner.** Claude: the SDK flag settings that the
  own-endpoint change sets for every login kind. Codex: `base_url` of the
  model provider. Model discovery stays off. Rejected for now:
  `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`, which may also ignore the flag
  settings. This also closes a path on `origin/main`: the runner reads the
  repository's `.claude/settings.json` (`settingSources: ['project']` in
  `runner/src/providers/claude.ts`), and that file can set the endpoint.
  The own-endpoint workspace found on 8 November 2026 that project settings
  replace the environment endpoint, and that flag settings win over them.
  So today a repository file can send the starter's real login to any host.
  On a newer runner the gateway endpoint wins. An older runner keeps the
  path, and Milestone 5 states it with the old risk of decision 2 A.
- **D11. Address rule.** Before each fetch, the gateway refuses an IP
  address in a non-public range, `localhost`, single-label and internal
  names, and the app's own zones. It follows no redirect. Decision 8,
  which is open, sets the schemes and ports of a public address.
  `global_fetch_strictly_public` comes on after open check 8. Rejected:
  a DNS lookup first, which does not fix the address that `fetch` uses.
- **D12. Refusals.** The gateway answers with an error in the provider's
  shape and a stable code. The body limit keeps the HTTP 413 answer with
  `body_too_large` that the access doc requires. When decision 7 ends a
  turn, the Durable Object ends it with `agent_login_required` and the
  existing text of `unavailableLoginMessage`.
- **D13. No other limits.** No model filter, no rate limit, and no extra
  time or byte limit on an answer. Provider and client limits apply, and
  a closed client connection cancels the upstream request. Each new limit
  is a new rejection that needs Cal. The orchestrator's check of 8
  November 2026 listed extra limits as a Cal choice, and recommended this
  outcome.
- **D14. Deploys.** A deploy or a runtime update can end a long answer.
  Cloudflare gives running requests up to 20 minutes after a runtime
  update. The Worker never repeats a request itself. The docs of both
  agent programs describe a retry. Open check 5 confirms it.
- **D15. Logs.** The turn token travels only in a header. The gateway logs
  no body and no header value.
- **D16. Runner protocol.** Version 2. The `turn` command carries the turn
  token, the agent, and the login kind. A `message` command carries no
  credential. The runner keeps the token in memory, and its output filter
  hides it.
- **D17. Upload limit.** The upload streams through the current limit
  wrapper. An overflow ends the upstream request and gives HTTP 413, also
  after an early upstream answer.
- **D18. Version of an image.** A full build records the Worker's
  `RUNNER_PROTOCOL_VERSION` when it starts. A refresh copies the version
  of the image that it refreshes. The deploy publishes the runner archive
  from the same commit as the Worker. A lagging archive fails closed.
- **D19. Version of a workspace.** The workspace record gets the version
  of its image at create. No value means version 1.
- **D20. Version refusal.** The Worker checks the version in the runner's
  first message, before the welcome and any command. It closes the
  connection as for a refused token, and logs a warning for the operator.
  No new app text.
- **D21. Exact limit.** 100,000,000 bytes, so the Worker's own HTTP 413
  answer comes before Cloudflare's refusal, whichever unit Cloudflare uses.
- **D22. Private own endpoint.** The Durable Object checks the address
  with the rule of D11 when it dispatches the turn. A turn on a private
  address fails at once and names the cause, and no agent starts. The
  gateway checks again at each request. When the fetch of an own endpoint
  cannot connect, for example to a public name with a private address
  record, the turn fails with a cause that names the endpoint as
  unreachable.
- **D23. Adapter input.** The provider adapters take an endpoint and a
  credential. The engine gives the gateway address and the turn token.
  The measure tool, `runner/src/measure.ts`, gives the provider address
  and the developer's login. Reason: the measure tool sends one real
  prompt with a developer login, and keeps working without an old route.
- **D24. No mockup milestone.** The change adds no screen and no flow. The
  legal mockup renders `src/marketing/privacy.ts` itself, and the new
  failure cause shows in the existing failed-turn line.
- **D25. Two documentation milestones.** Milestone 1 writes the
  requirements that no other branch edits. Milestone 5 writes the login
  sections after the own-endpoint merge, because that change edits them.
- **D26. A new protocol page.** The gateway gets
  `docs/protocol/model-gateway.md`, so the long access doc grows little.
- **D27. Doc split.** The documentation skill splits a doc over about 250
  lines when a change touches it. Milestone 9 splits the three such docs
  of this change after the own-endpoint merge, so the split does not
  conflict with that change.
- **D28. Private endpoint as an unusable login.** A login with a private
  address counts as a login that cannot be used. So the linked-session
  rules of the chat protocol apply to the messages of other members.
- **D29. No login in an answer.** The gateway removes the real login from
  each response header and each error body before it sends them on. The
  Worker knows the login, and the cloud computer must never see it. A
  success stream passes unchanged, because the model never received the
  login. From the orchestrator's check of 8 November 2026.

## Milestone 1: Documentation and protocol

Depends on: none

Write the requirements of the gateway, the turn token, the body limit,
and the runner version pin. The login sections wait for Milestone 5 (D25).

- [ ] Create `docs/protocol/model-gateway.md` (D26). State these
      requirements, each with its decision:
  - [ ] A cloud computer from a newer image holds no agent login. Its
        agent programs send each model request to the gateway, on
        `api.conductive.build` under `/v1/`.
  - [ ] A turn token works only for the gateway, only while its turn runs,
        and only for the login of its session starter.
  - [ ] Each request checks the turn and the workspace, and the login as
        decision 7 says.
  - [ ] The gateway forwards only a fixed list of model routes for each
        agent and only allowed headers. It passes bodies unchanged.
  - [ ] An answer streams without delay. An answer that still streams
        when its turn ends stops as decision 6 says.
  - [ ] The gateway keeps no copy of a model request or an answer. No
        answer and no error carries the real login (D29).
  - [ ] The upstream is Anthropic or OpenAI for an API key or a
        subscription token. Milestone 5 adds the own endpoint.
  - [ ] Risk: while a turn runs, each process in the cloud computer can
        read its turn token and spend the starter's login through the
        gateway.
  - [ ] Risk: a deploy or a runtime update can end a long answer, and the
        agent program then retries.
  - [ ] The rejected options of decision 120, each with its reason.
- [ ] `docs/protocol/access-and-security.md`, "Hostnames and gates": the
      machine hostname also accepts a turn token, only on the gateway
      route.
- [ ] Same doc, "Request bodies": the gateway limit of 100,000,000 bytes,
      with its reason (decision 3 B, D21).
- [ ] `docs/protocol/chat-and-events.md`, "The agent runner": each image
      build records the runner protocol version that it installed. A
      workspace refuses a runner below the version of its image. An image
      and a workspace from before this change keep version 1 (decisions
      2 A and 5 A).
- [ ] Add the new page to the protocol doc lists of `docs/architecture.md`
      and `README.md`.
- [ ] Check each relative link of the changed Markdown files.
- [ ] Read OpenAI's published terms about a user's own API key behind a
      proxy, and its request size limit. Save the text and the address
      under `.context/model-gateway/`. Report the result to Cal before
      Milestone 6 (open check 2).

## Milestone 2: Turn tokens in the workspace

Depends on: 1

The workspace Durable Object makes one turn token for each turn and
checks it. Nothing sends the token yet. Milestone 6 sends it to the
runner. The login rule waits for decision 7.

- [ ] Make the token when the turn is dispatched, with a routing part
      that names the workspace (D1).
- [ ] Keep only what the check and a resend need, so a resent `turn`
      command carries the same token. Put no token in a log or in the
      runner outbox.
- [ ] Add a check beside `credentialSender` in
      `worker/workspace-lifecycle.ts` (D4). It accepts a token only while
      its turn is running, its session is open, and the turn is the active
      turn of the session. Reuse `activeStoredTurn` from
      `worker/devices/access.ts`.
- [ ] In the same check, apply the login rule of decision 7. Reuse
      `senderLoginAccess` and `readAgentLogin` from
      `worker/chat/queries.ts`.
- [ ] When decision 7 ends a turn, end it with `agent_login_required` and
      the text of `unavailableLoginMessage` (D12).
- [ ] Tests, as the `testing` skill says: a token works while its turn
      runs. It fails after the end, during Stop, and for another
      workspace. Add the login cases of decision 7.

## Milestone 3: The gateway route

Depends on: 2

The Worker route takes model requests with a turn token and forwards
them to Anthropic or OpenAI. Milestone 6 adds the own endpoint. The end
of an open answer waits for decision 6.

- [ ] Run open checks 3 and 4 first. Install the runner packages with
      `npm ci --prefix runner`. Run the pinned programs against a local
      fake gateway with fake keys, for each login kind. Send no request to
      a real provider. Save the result under `.context/model-gateway/`.
- [ ] Add the gateway paths to `MACHINE_PATHS` in
      `src/shared/agent-tools.ts`, one base address for each agent (D9).
      Dispatch them in `worker/application.ts` on the machine hostname.
- [ ] Give the route the limit of 100,000,000 bytes in
      `requestBodyBudget` of `worker/http/request-body.ts` (decision 3 B,
      D21). Stream the upload, and answer as D17 says.
- [ ] Forward only the routes of D7, with the routes that open checks 3
      and 4 found. Refuse `HEAD /api/hello` without an upstream call.
- [ ] Apply the header rules of D8. Add the real login in the header of
      its kind. Pass bodies unchanged. Remove the real login from each
      response header and error body (D29).
- [ ] Stream each answer without a copy. End an open answer after its
      turn, as decision 6 says.
- [ ] Answer refusals as D12 says. Log no body and no header value (D15).
- [ ] Add a fake Anthropic and a fake OpenAI upstream under
      `worker/test-support/`, and update its README.
- [ ] Tests: each route, the header removal, the credential swap of each
      login kind, the removal of D29, the refusals, the body limit, and
      the end of an open answer after its turn.
- [ ] Ask Cal for the Workers plan and the zone plan of the deployment.
      The gateway needs the CPU time of Workers Paid and the 100 MB cap of
      the zone (open check 6).
- [ ] Update `worker/README.md`.

## Milestone 4: Runner version pin

Depends on: 1

Each workspace refuses a runner below the version of its image (decision
5 A). This milestone lands before any image build installs a runner of
version 2.

- [ ] Use the existing columns `image_builds.runner_protocol_version` and
      `workspaces.runner_protocol_version` of
      `migrations/202611060100_contracts.sql`. No migration is needed. A
      workspace with no value means version 1 (D19).
- [ ] A full build keeps recording `RUNNER_PROTOCOL_VERSION`, as
      `insertBuild` in `worker/lifecycle/build-admission-data.ts` does. A
      refresh copies the version of the image that it refreshes, in place
      of the Worker's version (D18).
- [ ] A new workspace copies the version of its image build, which the
      create path already reads in
      `worker/lifecycle/published-image-data.ts` (D19).
- [ ] Check the version in the runner's first message, in
      `worker/chat/runner-input.ts` and `worker/chat/runner-channel.ts`,
      before the welcome and before any command. Refuse a lower version
      as a refused token is refused, and log a warning for the operator
      (D20).
- [ ] `docs/deployment.md`: publish the runner archive from the same
      commit as the Worker, before any build (D18).
- [ ] Tests: a workspace with version 2 refuses a version 1 runner. A
      workspace without a version accepts version 1. A refresh keeps the
      version of its image.

## Milestone 5: Login docs after the own-endpoint merge

Depends on: 1, and the merge of the own-endpoint change into `origin/main`

The own-endpoint change edits the same login sections, so they change
after its merge (D25).

- [ ] Merge `origin/main` into the primary branch with the `git-merge`
      skill.
- [ ] `docs/protocol/access-and-security.md`, "Agent logins in a sandbox":
      a cloud computer with a newer runner holds a turn token and no login.
      Remove the rejection of a login proxy (decision 120). State what
      sandbox code can do with a turn token during a turn. State that a
      cloud computer with an older runner keeps the old risk and the rule
      against inheritance (decision 2 A). Name the repository settings
      path of D10 in that risk.
- [ ] Same doc, "Agent logins": Anthropic confirmed the gateway for
      subscription tokens on 9 November 2026 (decision 1).
- [ ] Same doc: the risk of decision 124 gives turn tokens of later turns
      on a newer runner, and real logins on an older runner.
- [ ] `docs/protocol/model-gateway.md`: the own endpoint as an upstream,
      the address rule of D11, the failed turn of decision 4 A, and the
      unusable login of D28.
- [ ] `docs/architecture.md`: "Sandbox software", the chat flow,
      "External services", and "Trust boundaries".
- [ ] Check each relative link of the changed Markdown files.

## Milestone 6: Runner protocol version 2 in the Worker

Depends on: 3, 4, 5

The Worker serves runner protocol versions 1 and 2. Version 2 gets turn
tokens. The own endpoint goes through the gateway. The public address
rule waits for decision 8.

- [ ] `src/shared/runner.ts`: version 2, as D16 says. Keep the version 1
      types for older runners (decision 2 A).
- [ ] `worker/chat/runner-input.ts`: accept versions 1 and 2, within the
      pin of Milestone 4.
- [ ] `worker/chat/runner-delivery.ts`: send the real login to version 1,
      as now, and the turn token of Milestone 2 to version 2.
- [ ] Move the Worker tests that build runner commands with a login.
      Keep every assertion. Add the version 2 cases.
- [ ] The gateway forwards a turn on an own endpoint to its address, with
      the address rule of D11 and the public address rule of decision 8.
- [ ] Make the own-endpoint save refuse the addresses that the gateway
      refuses, with the same rule, unless the merged change already does.
      This is the wider fix of decision 4 A.
- [ ] Check the own-endpoint address when the turn is dispatched (D22).
      Fail a turn on a private address and name the cause, for example
      "Priya's Claude login uses a private address. Change it on the
      account page." Name an unreachable endpoint in the same way (D22).
      Word each cause with the copy rules of the `product-ui` skill.
- [ ] Count such a login as a login that cannot be used (D28).
- [ ] Check the Worker's other fetches. Then turn on
      `global_fetch_strictly_public` in `wrangler.jsonc` (open check 8).
      Save the check under `.context/model-gateway/`.
- [ ] Tests: a version 1 runner gets the real login. A version 2 runner
      gets a token. A private own endpoint fails the turn with its cause.
      The gateway forwards a public own endpoint.

## Milestone 7: Runner on the gateway

Depends on: 6

The runner speaks version 2 only. Its agent programs send their model
requests to the gateway with the turn token.

- [ ] The provider adapters take an endpoint and a credential (D23).
- [ ] Claude: put the gateway address in the SDK flag settings that the
      own-endpoint change uses (D10). Give the turn token through the
      descriptor pipe of its login kind (D2), in the format of D3.
- [ ] Codex: put the gateway in `base_url` of the model provider. Send the
      turn token with `account/login/start` (D2, D10).
- [ ] The output filter hides the turn token (D16).
- [ ] Move each runner consumer of the replaced ways. Remove the runner's
      real-login handling and the direct route of the own endpoint.
- [ ] Move `runner/src/providers/claude-login.test.ts` and
      `codex-login.test.ts` to the turn token and the gateway address,
      with every assertion.
- [ ] Update `runner/agent-logins.md`, `runner/README.md`,
      `runner/scripts/README.md`, and `image/developer-scripts.md`.
- [ ] Limit `plans/follow-ups/agent-login-in-tool-processes.md` to runners
      of version 1 (decision 2 A).

## Milestone 8: Privacy page

Tags: ui

Depends on: 5

The privacy draft states the new facts. The legal mockup renders the same
file (D24).

- [ ] `src/marketing/privacy.ts`: model requests pass through Conductive
      on Cloudflare, and Conductive keeps no copy. A cloud computer from a
      newer image holds no agent login, and its processes can use the
      turn token of a running turn. Keep the login and tool-server
      sentences for cloud computers with an older runner. Keep the GitHub
      token risk.
- [ ] Read `src/marketing/terms.ts` in full, and update each sentence that
      restates a changed fact.
- [ ] Run `npm run mockups:check`. Open the privacy page in the mockup
      preview.

## Milestone 9: Split the long docs

Depends on: 5

This change touches three docs over the length target of the
documentation skill (D27).

- [ ] Split `docs/protocol/access-and-security.md`,
      `docs/protocol/chat-and-events.md`, and `docs/architecture.md` into
      linked pages by topic.
- [ ] Update every relative link, and the doc lists of
      `docs/architecture.md` and `README.md`.
- [ ] Update `plans/follow-ups/protocol-docs-split.md` to the docs that
      remain.

## Milestone 10: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete `plans/follow-ups/agent-logins-readable-in-sandbox.md`, which
      this change fixes.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed Worker, with a real login of each kind, check that
      an answer streams in steps, that an answer of more than 20 minutes
      completes, that a deploy during an answer leads to a retry, the
      added time of the turn check, and an upload with no
      `Content-Length` at each upstream (open check 5).
- [ ] Read the Workers Logs record of a gateway request. Confirm that it
      holds no turn token, and count the records of one turn (open check
      7). Add the count to `plans/follow-ups/request-records-in-logs.md`.
