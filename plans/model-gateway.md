# Worker model gateway

Status: Active. On branch `conductor/model-gateway-worker-model-proxy-decision-120`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Agents powered by Claude and Codex run in the cloud computer of each
workspace. Today the workspace Durable Object sends the real agent login
of the session starter to the runner with each turn. So each process in
the cloud computer can read that login while the turn runs. This change
keeps every agent login out of a cloud computer from a newer image. The
agent programs send their model requests to a new Worker route, the
gateway, with a turn token. The gateway checks the turn, adds the real
login, and forwards each request to Anthropic or OpenAI. Cal chose this
approach on 8 November 2026, as decision 120 A of
[the main plan](boat-native-remote-workspaces.md).

The change does not cover a runner update for existing cloud computers,
the own-endpoint login kind itself, or the GitHub token of a turn. The
own-endpoint login comes from a separate change, the "CLI Proxy Setup"
workspace on branch `calummoore/cli-proxy-setup`. Cal chose on 9 November
2026 to finish this gateway first for the existing login kinds, as
decision 10 B below records. Milestones 5 to 9 no longer wait for that
branch. The later own-endpoint feature sends its requests through the
completed gateway. Its integration work is preserved in
[Own endpoints through the model gateway](follow-ups/own-endpoints-through-model-gateway.md).
The brainstorm report is
`.context/model-gateway/reports/brainstorm.md`, and Cal's answers are in
`.context/model-gateway/answers.md`.

Contract owners:

- `docs/protocol/model-gateway.md`, which Milestone 1 creates.
- [Access and security](../docs/protocol/access-and-security.md).
- [Chat and events](../docs/protocol/chat-and-events.md).
- [Agent runner](../docs/protocol/agent-runner.md), extracted on `main`.
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

No own-endpoint route exists on `origin/main`. Decision 10 B moves that
feature's integration to the follow-up above. This branch does not build
a direct own-endpoint route in the runner.

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
`.context/model-gateway/reports/options-check.md`. Cal answered decisions
6 to 8 on 9 November 2026. Cal's answers to decisions 2 and 5 stand, and their new options
are a record, not a question.

### 1. Subscription tokens wait for Cal's check

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `runner/src/providers/claude-process.ts`, `readAgentLogin` in `worker/chat/queries.ts`, the section "Agent logins in a sandbox" of `docs/protocol/isolation.md`, and the section "Agent logins" of `docs/protocol/tokens-and-secrets.md`.
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
- **Chosen by Cal on 9 November 2026:** the provider check is done. Cal wrote: "I checked with anthropic and this is fine, because of security reasons". So every login kind goes through the gateway on a newer runner, also the subscription token. Options A to D no longer apply. Open check 2, about OpenAI's terms, stayed, because the answer covers Anthropic only. On 9 November 2026 Cal also recorded: "openai said it was fine". So OpenAI keys go through the gateway too.

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
- **Options check of 9 November 2026:** the check brought back the runner update, because "outside this scope" is not a valid reason to leave out an approach. It added E. The recommendation stays B, and the wider fix becomes D. Cal's choice A stands.
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
- **Change of order on 9 November 2026:** decision 10 B replaces the assumption that own endpoints merge first. The chosen address refusal remains a requirement of the later own-endpoint integration.

### 5. A fake older runner can get real logins

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `open` in `worker/chat/runner-channel.ts`, `worker/chat/runner-input.ts`, and the risk of decision 124 in `docs/protocol/isolation.md`.
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
- **Chosen by Cal on 9 November 2026:** B. The Worker checks the turn every 30 seconds while an answer streams, and ends the answer after the turn ends.

### 7. A login that changes during a turn

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `readAgentLogin` and `senderLoginAccess` in `worker/chat/queries.ts`, and the section "Agent logins in a sandbox" of `docs/protocol/isolation.md`.
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
- **Chosen by Cal on 9 November 2026:** D. Design call D30 gives the mechanics.

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
- **Chosen by Cal on 9 November 2026:** B. The gateway sends a login only to an `https` address, on any port that the Worker can reach. Open check 9 finds those ports.

### 9. OpenAI background requests outlive the turn

Added on 9 November 2026 from finding 5 of review round 2.

- **Severity:** High. **Effort:** Medium.
- **Source:** Review.
- **Category:** Security.
- **Location:** the Codex route in `worker/model-gateway/route.ts` and its upload reader.
- **Background:** OpenAI's background guide says that a response with `background: true` keeps running after its connection drops. The gateway passed request bodies unchanged. The pinned Codex never sends the field, so only other sandbox code with a copied turn token can.
- **Problem:** Such code could start OpenAI work that keeps billing the starter's login after the turn, so the 30-second bound of decision 6 fails.
- **Root question:** How does the gateway prevent provider work from continuing beyond its turn?
- **Options:**
  - **A.** Refuse a request whose top-level `background` holds any value except `false`, a body that is not one JSON object, and an encoded body. The check runs before the last byte of the body reaches the upstream. Effort: Medium.
  - **B.** Rewrite `background` to `false` in the streamed body. Effort: Medium.
  - **C.** Accept only the body fields that the pinned Codex sends. Effort: Medium.
- **Left out:** Cancelling by response ID, forcing `store: false`, and a plain byte search, as the follow-up of the finding said.
- **Recommendation:** A.
- **Chosen by Cal on 9 November 2026:** A.

### 10. Put the gateway first

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Process.
- **Location:** the summary and Milestones 5 to 9 of this plan.
- **Terms:**
  - **Gateway:** the Worker's model route that adds the real login to each request.
  - **Own endpoint:** a user's custom model API address and key.
- **Background:** The original task put the own-endpoint merge first because both changes edit agent login handling. The gateway already handles Anthropic and OpenAI requests.
- **Problem:** The recorded order holds the remaining gateway work for a feature that the existing login kinds do not use.
- **Impact if no action:** Credential protection for existing logins continues to wait for the separate endpoint feature.
- **Root question:** Which delivery order gets both features into `main` while protecting existing logins and preserving the custom-endpoint integration?
- **Options:**
  - **A.** Keep own endpoints first. This preserves the current plans but delays the gateway. Effort: Small.
  - **B.** Finish the gateway first for existing logins. Add custom endpoints through it afterward. This branch owns the Claude endpoint settings. Custom endpoint turns need a gateway-capable runner. Effort: Medium.
  - **C.** Continue both changes and merge whichever finishes first. Both plans need conditional integration work. Effort: Medium.
  - **D.** Combine both features in one pull request. This gives one integration review but a larger change. Effort: Large.
  - **E.** Merge the finished Worker side first. Build the runner cutover and custom-endpoint integration afterward. Cost: another review and a deployed gateway that no runner uses yet. Effort: Medium. Added by the options check for the record only.
- **Shared assumptions:** Both features ship, as Cal chose in the original gateway and own-endpoint tasks. Older runners keep their existing login support under decision 2 A. New runners receive only turn tokens. Decisions 4 A and 8 B keep their address rules for the later endpoint feature. Separate pull requests are a work choice, not a product requirement. Option D drops it.
- **Left out:** A temporary direct custom-endpoint route would put real logins in newer sandboxes, against the chosen credential boundary. Shipping its save form alone would accept a login that no supported turn can use. Dropping the custom-endpoint feature would break the choice to deliver both features.
- **Wider fix:** None. This is a delivery-order choice.
- **Previous examples:** Design call D25 records the original order to reduce conflicts.
- **Related:** Decision 4 keeps the private-address refusal. Decision 8 keeps HTTPS for the later endpoint feature.
- **Recommendation:** B. It delivers the credential boundary first and gives the endpoint feature a stable base.
- **Action:** ask the user, because B reverses the recorded order and moves required endpoint integration work to the later change.
- **Chosen by Cal on 9 November 2026:** B, in the words "10 = B". This replaces the original instruction to wait for the own-endpoint merge. The existing login kinds are the Claude subscription token, the Anthropic API key, and the OpenAI API key.
- **Options check on 9 November 2026:** B stays recommended and chosen. E is a record, not a new question. The task transfer and completed milestone history passed. Report: `.context/model-gateway/merge-order/decision-10-options-check.md`.

The later feature owns the custom upstream, its shared save and request
address rule, dispatch checks, unusable-login handling, and tests. The
follow-up named in the summary holds each task and its requirements. No
approved feature or address rule is dropped.

Completed milestones keep their original words as history. Their
references to a later own-endpoint merge or integration describe the old
order. The remaining milestones follow decision 10 B.

### 11. Agent tools inherit the gateway address

Added on 9 November 2026 from Milestone 4a. Options I, J, and K were
added on 10 November 2026. Cal chose K on 10 November 2026.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** security.
- **Location:** `runner/src/providers/claude.ts`, `runner/src/providers/environment.ts`, `worker/model-gateway/route.ts`, and `docs/protocol/model-gateway.md`, "No login in the sandbox".
- **Terms:**
  - **Turn token:** A temporary credential that lets one running turn use the saved login through Conductive.
  - **Child process:** A command, server, or helper that the Claude program starts in the workspace.
  - **Relay:** A runner HTTP server that forwards each model request to its destination.
  - **Certificate setting:** A value that tells a program which TLS certificates it trusts.
  - **Profile pair:** An Anthropic config file with a `base_url` and a credentials file beside it. The pinned client reads them when it has no other credential.
- **Background:** Conductive must keep saved provider logins outside computers from newer org images. Claude therefore needs the gateway address. The pinned client copies an address from its environment or its flag settings, and the certificate settings, into child processes. A project tool can have its own provider key and destination. Some child processes keep running after the agent exits. The pinned client also reads the address from the `base_url` of a profile pair, when `ANTHROPIC_BASE_URL` is empty. It gives that address to no child.
- **Problem:** Inherited gateway settings redirect some project tools and send their own keys to Conductive. Conductive refuses these requests. Restoring settings with a wrapper fixes the tested common cases, but it leaves known failures.
- **Impact if no action:** The new runner cannot complete its cutover. Both Claude and Codex still deliver saved logins to existing-image computers.
- **Root question:** How should Claude use the gateway while the processes that it starts keep their own provider and certificate settings?
- **Options:**
  - **A.** Wait for a vendor client change that separates model traffic from child environments. Cost: both runner cutovers wait without a date. Saved logins remain in existing-image computers. Effort: Small now.
  - **B.** Use the fixed gateway settings in every child. Cost: project Anthropic calls without an explicit destination fail and send their keys to Conductive. Children also lose repository certificate settings. Effort: Medium.
  - **C.** Restore project settings through a shell prefix, a runner program that Claude starts before some commands, hooks, and tool servers. Common commands, background commands, shell hooks, and tested tool servers passed. Accept B's behavior only for children that bypass the prefix. Exec-form hooks are the proved case. The draft restore also replaced an explicit empty certificate override incorrectly in a boundary control. Fix that defect before merge. Verify plugin servers and other helper paths before claiming coverage. The prefix adds launch work and changes some client command handling. Effort: Large.
  - **D.** Add a relay to C. Route turn tokens to the gateway and other keys to the repository destination. Keep the relay alive with the runner for surviving processes. Cost: some tools use Anthropic instead of their own configured destination. Proxy handling, restarts, routing, and restoration need proof. Effort: Large.
  - **E.** Use a Unix socket that ends the client's TLS and forwards to the gateway. Cost: a new certificate authority and its key enter the computer. Custom destinations and child inheritance can still change behavior. The working relay remains unproved. Effort: Large.
  - **F.** Use D's relay without a shell prefix. Cost: every model call uses the relay. Some project keys reach the default provider instead of the intended destination. Tool proxy and certificate behavior can change. Effort: Large.
  - **G.** Restore settings when each child loads a native library. Cost: static programs bypass the library. The library reaches child environments and still needs source information to distinguish equal-value overrides. Unproved. Effort: Large.
  - **H.** Restore settings in the outer agent's native process-start calls. This could also cover static children. Cost: it affects the agent's own helper launches. Coverage and safe process handling need proof. The final environment still lacks the source information that the equal-value case needs. Unproved. Effort: Large.
  - **I.** Use B, and let the gateway forward a request with any key that is not a turn token to Anthropic, unchanged. Cost: project keys and their requests pass through Conductive. Anyone with an Anthropic key can use the gateway as a relay. A project address in an env file loses to the inherited one. Children still lose repository certificate settings. Effort: Medium.
  - **J.** Give Claude the gateway address and the turn token in a profile pair, with no address, token, or certificate setting in its environment or flag settings. Pin `ANTHROPIC_BASE_URL` to an empty value in the flag settings, so that repository settings cannot redirect the agent. Cost: the turn token moves from the private descriptor into a file that each process can read during the turn. A project SDK without its own key finds the profile pair and spends the starter's login, unless the gateway refuses requests without the agent's markers. The empty value reaches children: Python SDK 0.125.0 then fails, and a project address in an env file loses to it. The client sends the token of an API-key login as a bearer token. Effort: Medium.
  - **K.** Use J without the empty pin. Cost: a repository setting can send the agent's requests and its turn token to another address, and the agent then fails there. A repository hook could already read the token file. Python SDKs and env-file addresses keep working. The other costs of J stay. Effort: Medium.
- **Shared assumptions:** The saved login stays outside a newer-image computer. It comes from the approved gateway requirement. Options A to I also keep the turn token on its private descriptor and the native Claude subscription and API-key modes. J and K drop both: the turn token sits in a file, and Claude uses its profile mode. The current client version is an implementation pin, which A can replace. No option authorizes a new trust change or an unlisted child regression without Cal's answer.
- **Left out:** An environment-only endpoint lets repository settings redirect the agent, and children inherit it. Tested host-managed mode, built-in scrubbing, and a plain Unix socket failed the goal. Vendor cloud-provider modes change the required native authentication. A profile pair whose credentials path is the private descriptor failed, because the pinned client creates a lock folder beside the credentials file. Real-login fallback breaks the approved protection. A contains the vendor client-change route.
- **Wider fix:** A's client separation. None of the runner mechanisms removes the entire class.
- **Previous examples:** The existing custom-endpoint plan has the same child-environment problem. The pinned-client proofs showed the gateway address in commands, background commands, both hook forms, and MCP servers. The restoring-prefix proof passed its common-case matrix but failed the explicit equal-value override case.
- **Related:** Gateway-first remains approved. This question affects Claude's transport and blocks the shared version 2 runner cutover. It does not reopen custom endpoints or provider approval.
- **Recommendation:** K, changed from C on 10 November 2026. No child gets the gateway address, so every tested project call keeps its own key and destination, with no wrapper, relay, or certificate authority. The token file is the main new risk, and the token works only during its turn. A's vendor change best removes this defect class.
- **Action:** ask the user, because K moves the turn token into a file, adds a gateway refusal, and drops the rule that repository settings cannot redirect the agent.
- **Chosen by Cal on 10 November 2026:** K. Design calls D38 to D40 give the mechanics.
- **Options of 10 November 2026:** Cal's questions in the primary session added I, J, and K. A loopback-only probe with the pinned client proved the main path of J and K: `.context/model-gateway/profile-probe/report.md`. Milestone 4a checks the child forms and login kinds that the probe did not cover.
- **Options checks of 9 November 2026:** The first check added F and G, and it asked for a runtime proof of C. A static read of the agent's own process starts added H. The final check kept the letters, the recommendation, and the "ask the user" outcome. It corrected the reason of the Action. It found one question for Cal: the exception for children that the prefix does not wrap. Reports: `.context/model-gateway/reports/decision-11-options-check.md`, `decision-11-parent-spawn-check.md`, and `decision-11-final-check.md`.
- **Status after the answer:** The wrapper of C is not built, so its restore defect needs no fix. Milestones 4a, 5a, 6a, 7, and 8a apply K. The answer removed the follow-up item `plans/follow-ups/claude-child-provider-settings.md`.

### 12. Anthropic may refuse the profile request shape

Added on 10 November 2026 from Milestone 4a. Cal chose A on 10 November
2026.

- **Severity:** High. **Effort:** Small.
- **Source:** Implementation.
- **Category:** test.
- **Location:** `worker/model-gateway/headers.ts` and the Claude transport of Milestone 7.
- **Background:** In profile mode the pinned client adds a global cache scope to its cache markers and a top-level `diagnostics` field, with their `anthropic-beta` values `prompt-caching-scope-2026-01-05` and `cache-diagnosis-2026-04-07`, for both login kinds. The gateway passes the body unchanged. Fake upstreams cannot show what Anthropic accepts.
- **Problem:** If Anthropic refuses this shape for a subscription token or an API key, each Claude turn of that login kind fails on a newer runner.
- **Impact if no action:** The refusal shows only after the merge, on the test deployment.
- **Root question:** When do we confirm that Anthropic accepts the profile-mode requests for both login kinds?
- **Options:**
  - **A.** Before the merge: a script on Cal's Mac sends small requests in the recorded shapes straight to Anthropic, with a one-token answer, once with an API key and once with a subscription token. Effort: Small.
  - **B.** After the merge, with the real-login smoke test of the post-merge section. Effort: Small.
  - **C.** Turn off the client's experimental betas for the agent, so it sends today's shape. Unproved, and it still needs a real check. Effort: Medium.
- **Left out:** More fake-upstream tests, because they cannot show Anthropic's answer.
- **Wider fix:** None. A one-time check.
- **Previous examples:** Decision 1 confirmed the gateway with Anthropic for today's request shape.
- **Recommendation:** A. It tests the riskiest assumption of K before the merge.
- **Action:** ask the user, because the check needs Cal's credentials and sends requests to Anthropic.
- **Chosen by Cal on 10 November 2026:** A. The script is `.context/model-gateway/real-check/check.sh`, saved on Cal's Mac as `~/conductive-gateway-check.sh`. Milestone 10 runs it.
- **Result on 10 November 2026:** Anthropic answered HTTP 200 to each request: today's shape and the profile shape with an API key, and today's shape, the profile shape, and the profile shape with the 1-hour cache with a subscription token. Record: `.context/model-gateway/real-check/results.md`.

### 13. Subscription turns may lose the 1-hour cache

Added on 10 November 2026 from Milestone 4a. Cal chose B on 10 November
2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation.
- **Category:** performance.
- **Location:** `runner/src/providers/claude.ts`.
- **Background:** The pinned client picks its own prompt cache time. It asks for 1 hour only when it is signed in to a Claude subscription, and it has overrides: `CLAUDE_CODE_PROMPT_CACHE_TTL`, the settings key `promptCacheTtl`, and `ENABLE_PROMPT_CACHING_1H`. In profile mode it does not know that a subscription stands behind it.
- **Problem:** Subscription turns ask for the default cache time of about 5 minutes. API-key turns already use 5 minutes.
- **Impact if no action:** A pause of more than 5 minutes between messages can refill the cache, and use the plan's limits faster.
- **Root question:** Do subscription turns keep the 1-hour cache under K?
- **Options:**
  - **A.** Accept the 5-minute cache. Effort: Small.
  - **B.** For a subscription login, the runner gives Claude `CLAUDE_CODE_PROMPT_CACHE_TTL=1h`. Claude asks for 1 hour on its main requests, as it does today. Cost: the variable reaches the processes that Claude starts, and only Claude reads it. During paid extra usage, Claude keeps the 1-hour cache, where today it uses 5 minutes. Effort: Small.
- **Left out:** A change of the request inside the gateway, because the gateway passes bodies unchanged.
- **Wider fix:** None. One setting.
- **Previous examples:** None found.
- **Related:** Decision 12. Its check sends one subscription request with the 1-hour cache in profile mode.
- **Evidence:** a loopback probe on 10 November 2026 showed that the pinned client in profile mode with `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` sends `extended-cache-ttl-2025-04-11` and `"ttl": "1h"` on its main requests: `.context/model-gateway/profile-probe/report.md`.
- **Recommendation:** B. It keeps today's cache for subscription turns at almost no cost.
- **Action:** ask the user, because it changes how fast subscription limits get used.
- **Chosen by Cal on 10 November 2026:** B. Milestone 7a applies it. The real check of decision 12 confirmed that Anthropic accepts the 1-hour cache in profile mode with a subscription token.

## Design

The gateway is a Worker route on the machine hostname. Each running turn
gets a turn token from the workspace Durable Object. The runner gives the
token to Codex through its login request, and to Claude through a
profile pair (decision 11 K). It points each program at the gateway. For each model request, the
gateway asks the Durable Object whether the turn still runs and which
login it uses. Then it forwards the request to the upstream of that login
and streams the answer back. Older runners keep their real login, and
each workspace pins the runner version of its image.

This release covers the existing Anthropic and OpenAI login kinds.
Custom endpoints join the gateway in the later feature, as decision 10 B
says. Its tasks do not block this branch.

Open checks:

1. Cal's provider check. Done on 9 November 2026 (decision 1).
2. Done on 9 November 2026: Milestone 1 read OpenAI's terms, and Cal
   recorded that OpenAI said the gateway is fine.
3. Done on 9 November 2026 in Milestone 3, against a fake gateway with no
   network: the pinned `claude` program 2.1.318 calls only
   `/v1/messages` and `/v1/messages/count_tokens`. It sends an API key in
   `x-api-key`, and a subscription token as `Bearer` with the OAuth beta
   value. It treats a key as an Anthropic API key only when the key starts
   with `sk-ant-api`. `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` works, and it
   makes the program ignore the flag-settings endpoint. The record is
   `.context/model-gateway/pinned-programs.md`.
4. Done on 9 November 2026 in Milestone 3: pinned Codex 0.167.0 calls only
   `/responses`, also to compact. It sends no `/models` and no
   `/responses/compact` request.
5. Streaming through the deployed Worker, long answers, and deploys. A
   post-merge task.
6. Done on 9 November 2026: Cal confirmed Workers Paid. The API confirmed
   the Free Website plan of `conductive.build` and its 100 MB upload limit.
7. What a Workers Logs record holds for a gateway request. A post-merge
   task.
8. The effect of `global_fetch_strictly_public` on the Worker's other
   fetches. Milestone 6 checks it.
9. Which ports a Worker fetch reaches on a host outside Cloudflare, for
   decision 8 B. The own-endpoint follow-up checks it before that feature
   merges. The fixed Anthropic and OpenAI upstreams do not need this check.

### Design calls

Each call is an agent call. D1 to D20 are from 8 and 9 November 2026,
D21 to D31 from 9 November 2026. The brainstorm report gives the three or
more approaches of each call.

- **D1. The turn token.** One random token for each turn. The Durable
  Object makes it at dispatch, with a routing part that names the
  workspace. A resent `turn` command carries the same token. Rejected:
  the workspace token with the turn ID, because each process already
  holds the workspace token. A token for each session works in later
  turns. A token for each agent process gains nothing.
- **D2. Token delivery.** Claude: the credentials file of its profile pair
  (D38), as decision 11 K chose on 10 November 2026. Codex: the login
  request of the Codex App Server. Rejected: the environment, which each
  tool process inherits. The descriptor pipe of the `claude` program
  stays for runners of version 1 and for the measure tool.
- **D3. Token format.** The prefix shape of its login kind. Open check 3
  found that the pinned program recognises an API key by its `sk-ant-api`
  prefix and picks its background model from that, so an opaque token
  could move background work to the main model. Rejected:
  presenting every Claude login as an API key, because a subscription
  request needs the shape that the program adds itself.
- **D4. Turn check.** The Worker route asks the workspace Durable Object,
  as the git credential route does with `credentialSender`, and streams
  the answer itself. Rejected: a stream in the Durable Object, which one
  restart ends for the whole workspace. A D1 table of tokens, which can
  disagree with the Durable Object.
- **D5. End of a stream.** Decision 6 B. Each request gets a lease of 30
  seconds from its first turn check, before the upstream fetch. A passing
  check every 15 seconds renews it. A timer ends the upload, the fetch, and
  the answer when the lease ends, so a slow check cannot stretch the bound
  (review finding 2, 9 November 2026). A stopping turn counts as ended for
  new requests.
- **D6. Login check.** Decision 7 D: each request checks the turn, the
  live workspace, the starter's membership and suspension, and that the
  login is still the login of the turn start (D30).
- **D7. Routes.** A fixed list for each agent. Claude: `POST /v1/messages`
  and `POST /v1/messages/count_tokens`. Codex: `POST /responses`. Add the
  routes that open checks 3 and 4 find. The gateway refuses
  `HEAD /api/hello` without an upstream call, as Anthropic's guide allows.
  It serves no local model list. Any model discovery for an own endpoint
  belongs to that later feature. Rejected: every path, which reaches
  every provider API.
- **D8. Headers and bodies.** Request headers pass by a fixed name
  pattern, such as `anthropic-*` and `x-claude-code-*`, and the headers
  that open check 4 lists. The gateway removes credentials, cookies,
  `cf-*`, `x-forwarded-*`, and Conductive headers. Bodies pass unchanged.
  Error bodies pass unchanged, except for the removal of D29. The Codex
  route also refuses the bodies of decision 9. Reason:
  Anthropic's gateway guide asks to forward `anthropic-*` headers and body
  fields as open lists, and error bodies as they are.
- **D9. Address.** One base address for each agent under `/v1/` on
  `api.conductive.build`. The turn picks the upstream.
- **D10. Endpoint in the runner.** This branch supplies the gateway
  endpoint itself. Claude reads it from the `base_url` of its profile
  pair (D38), as decision 11 K chose on 10 November 2026. The runner sets
  no address in Claude's environment or flag settings, so no child
  process inherits one. Milestone 7 ports nothing from own-endpoint
  commits `e6948b66` and `978941df`. The repository's
  `.claude/settings.json` can still set `ANTHROPIC_BASE_URL`, which wins
  over the profile. The agent then sends its turn token to that address
  and fails there. On `origin/main` the same file can send the starter's
  real login to any host. On a newer runner it can send only a turn
  token. An older runner keeps the path, and Milestone 5 states it with
  the old risk of decision 2 A. Codex uses `base_url` of the model
  provider. Model discovery stays off. Rejected:
  `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`, because open check 3 showed that
  it makes the program ignore the flag-settings endpoint. Rejected: SDK
  flag settings, because the client copies their address into child
  processes (decision 11).
- **D11. Address rule.** The later own-endpoint integration owns this
  rule, recorded in its follow-up. Before each custom upstream fetch,
  the gateway refuses an IP
  address in a non-public range, `localhost`, single-label and internal
  names, and the app's own zones. It follows no redirect. Decision 8 B
  allows only `https`, on any port that the Worker can reach.
  `global_fetch_strictly_public` comes on after open check 8. Rejected:
  a DNS lookup first, which does not fix the address that `fetch` uses.
- **D12. Refusals.** The gateway answers with an error in the provider's
  shape and a stable code. The body limit keeps the HTTP 413 answer with
  `body_too_large` that the access doc requires. When decision 7 ends a
  turn, the Durable Object ends it with `agent_login_required`. A removed
  login or a lost access uses the existing text of
  `unavailableLoginMessage`. A changed login uses the cause of D30.
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
  credential. The runner keeps the token in memory. For Claude it also
  writes the token to the credentials file of the turn's profile pair
  (D38). Its output filter hides the token.
- **D17. Upload limit.** The upload streams through the current limit
  wrapper. An overflow ends the upstream request and gives HTTP 413, also
  after an early upstream answer.
- **D18. Version of an image.** A full build records the Worker's
  `RUNNER_PROTOCOL_VERSION` when it starts. A refresh copies the version
  of the image that it refreshes. The deploy publishes the runner archive
  from the same commit as the Worker. A lagging archive fails closed.
- **D19. Version of a workspace.** Each allocation of a cloud computer
  writes the version of its image snapshot to the workspace record, before
  the provider call. So a Try again from a newer image updates the pin
  (review finding 1, 9 November 2026). No value means version 1.
- **D20. Version refusal.** The Worker checks the version in the runner's
  first message, before the welcome and any command. It closes the
  connection as for a refused token, and logs a warning for the operator.
  No new app text.
- **D21. Exact limit.** 100,000,000 bytes, so the Worker's own HTTP 413
  answer comes before Cloudflare's refusal, whichever unit Cloudflare uses.
- **D22. Private own endpoint.** The later own-endpoint integration owns
  these dispatch and request checks, recorded in its follow-up. The
  Durable Object checks the address
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
  initial requirements. Under decision 10 B, Milestone 5 writes the login
  sections for the existing login kinds without an own-endpoint merge.
  The later feature adapts its own documentation to the gateway.
- **D26. A new protocol page.** The gateway gets
  `docs/protocol/model-gateway.md`, so the long access doc grows little.
- **D27. Doc split.** The documentation skill splits a doc over about 250
  lines when a change touches it. Milestone 9 splits the three such docs
  of this change before this branch's pull request. It does not wait for
  the own-endpoint change.
- **D28. Private endpoint as an unusable login.** The later own-endpoint
  integration owns this rule, recorded in its follow-up. A login with a private
  address counts as a login that cannot be used. So the linked-session
  rules of the chat protocol apply to the messages of other members.
- **D29. No login in an answer.** The gateway removes the real login from
  each response header and each error body before it sends them on. The
  Worker knows the login, and the cloud computer must never see it. A
  success stream passes unchanged, because the model never received the
  login. From the orchestrator's check of 8 November 2026.
- **D30. Login version of a turn.** The Durable Object records the
  `updated_at` of the starter's login row when it dispatches the turn.
  Each request compares it with the current row. A difference, a missing
  row, or a loss of access ends the turn with `agent_login_required` and
  a cause. A changed login gets its own cause, for example "Priya's
  Claude login changed. Try again to use the new login." Reason: decision
  7 D, with no copy of the login.
- **D31. Citations of this plan's decisions.** The docs cite them as
  "gateway decision N", because the main plan's decisions 1 to 8 mean
  other things. `docs/architecture.md`, "Decision numbers", defines the
  form. Rejected: new numbers after the main plan's last decision, which
  parallel plans would compete for.
- **D32. Parallel implementation, 9 November 2026.** Cal asked to split
  independent work across workspaces. A read-only Claude transport check
  starts beside Milestone 5. After Milestone 5, the Worker, legal copy,
  and document-split work can use separate checkouts with disjoint file
  scopes. The runner cutover follows the Worker contract. The workspace
  ledger is `.context/model-gateway/workspaces.md`.
- **D33. Documentation homes, 9 November 2026.** The access doc defines
  newer and older runners and owns the sandbox credential risks and the
  provider confirmations. The gateway page links to those facts. The
  existing runner-auth gate protects delivery of either credential kind.
  Reason: one home for each fact, with the current access rules applied
  to the credential that replaces the login.
- **D34. Worker-first protocol staging, 9 November 2026.** Agent call:
  separate the Worker's supported protocol versions from the installed
  runner version. The Worker accepts versions 1 and 2. The packaged runner
  and each new full image build still advertise version 1 until Milestone
  7 changes the provider adapters. The runner uses explicit version 1
  wire types through erased imports. Reason: a version 1 adapter cannot
  use a gateway token, so raising the installed version now would break
  current turns. Version 2 has no real-login fallback.
- **D35. Native token authentication, 9 November 2026.** Agent call:
  require the native login kind when deriving a token, and sign its native
  prefix with the other token fields. The gateway verifies that prefix
  against the current login kind. Reason: a changed prefix must not move
  a credential between the subscription and API-key authentication modes.
  No extra login metadata needs to persist.
- **D36. Common completion reporting, 9 November 2026.** Agent call:
  collect ended turn IDs in the chat transaction, then report them after
  commit and any runner confirmation, before the next dispatch. Existing
  lifecycle recovery repairs a failed report. The callback skips lifecycle
  writes while the existing receiver fence is inactive, and still starts
  device cleanup. Reason: terminal replacements need the same end path,
  while confirmations and suspension cleanup keep their existing order.
- **D37. Dispatch credential construction, 9 November 2026.** Agent call:
  build the exact version 2 command after the stored running state commits,
  while the dispatch caller holds the chat queue. Save the nonce and login
  version before deriving the credential. A failed send restores the
  queued state and keeps those fields. Reason: token issuance requires a
  real active turn, and redelivery must reuse its credential without
  storing a login or token in a pending command.
- **D38. Profile transport for Claude, 10 November 2026.** Agent call for
  decision 11 K. At each turn the runner writes a profile pair for the
  session in its own Anthropic config folder: `configs/<name>.json` with
  the gateway's Claude base as `base_url` and `authentication.type`
  `user_oauth`, and `credentials/<name>.json` with the turn token as
  `access_token`. The file has mode 0600, in a folder with mode 0700.
  The name is unique for each session, so two sessions with different
  starters never share a token. The runner starts Claude with
  `ANTHROPIC_CONFIG_DIR` and `ANTHROPIC_PROFILE`, with no descriptor
  credential, and with no address, token, proxy, or certificate setting
  of its own. It removes the credentials file when the turn ends, when
  the session closes, and when the runner starts. Reason: the pinned
  client uses `ANTHROPIC_BASE_URL` before the profile's `base_url`, and
  it uses profile auth only when no other credential is set. It refuses
  a credentials file that other users can read. Rejected: `/dev/fd/3` as
  the credentials path, because the client creates a lock folder beside
  the file. Rejected: the user's default profile folder and name,
  because they would replace a project's own Anthropic profile.
- **D39. Agent markers, 10 November 2026.** Agent call for decision 11 K.
  The Claude route refuses a request that lacks the markers that only
  the `claude` program sends, before the turn check and before any
  upstream call. Milestone 4a names the markers, such as the
  `claude-code-20250219` value of `anthropic-beta` and the user agent of
  the client. The refusal uses the Anthropic error shape and a stable
  code. Reason: a project SDK without its own key finds the profile pair
  through the inherited variables, and would otherwise spend the
  starter's login. It is no security boundary: a process that reads the
  token can copy the markers.
- **D40. API-key requests in profile mode, 10 November 2026.** Agent call
  for decision 11 K. In profile mode the client sends the turn token of
  an API-key login as a bearer token, with the OAuth beta. On the Claude
  route the gateway accepts that header for an API-key login, and keeps
  the signed-prefix check of D35. It sends the real key in `x-api-key`,
  and it removes the `oauth-2025-04-20` value from `anthropic-beta`.
  It keeps the other values. Milestone 4a found two more profile-only
  values, `prompt-caching-scope-2026-01-05` and
  `cache-diagnosis-2026-04-07`. The body uses their features: a global
  cache scope and a `diagnostics` field. The gateway passes the body
  unchanged, so these values stay. Reason: the OAuth value names a login
  mode that an API key does not use, and no body field needs it.

## Milestone 1: Documentation and protocol

Depends on: none

Write the requirements of the gateway, the turn token, the body limit,
and the runner version pin. The login sections wait for Milestone 5 (D25).

- [x] Create `docs/protocol/model-gateway.md` (D26). State these
      requirements, each with its decision:
  - [x] A cloud computer from a newer image holds no agent login. Its
        agent programs send each model request to the gateway, on
        `api.conductive.build` under `/v1/`.
  - [x] A turn token works only for the gateway, only while its turn runs,
        and only for the login of its session starter.
  - [x] Each request checks the turn, the workspace, and the starter's
        access. Any change of the login or of that access ends the turn
        at its next request and names the cause (decision 7 D).
  - [x] The gateway forwards only a fixed list of model routes for each
        agent and only allowed headers. It passes bodies unchanged.
  - [x] An answer streams without delay. An answer that still streams
        when its turn ends stops within 30 seconds (decision 6 B).
  - [x] The gateway keeps no copy of a model request or an answer. No
        answer and no error carries the real login (D29).
  - [x] The upstream is Anthropic or OpenAI for an API key or a
        subscription token. Milestone 5 adds the own endpoint.
  - [x] Risk: while a turn runs, each process in the cloud computer can
        read its turn token and spend the starter's login through the
        gateway.
  - [x] Risk: a deploy or a runtime update can end a long answer, and the
        agent program then retries.
  - [x] The rejected options of decision 120, each with its reason.
- [x] `docs/protocol/access-and-security.md`, "Hostnames and gates": the
      machine hostname also accepts a turn token, only on the gateway
      route.
- [x] Same doc, "Request bodies": the gateway limit of 100,000,000 bytes,
      with its reason (decision 3 B, D21).
- [x] `docs/protocol/chat-and-events.md`, "The agent runner": each image
      build records the runner protocol version that it installed. A
      workspace refuses a runner below the version of its image. An image
      and a workspace from before this change keep version 1 (decisions
      2 A and 5 A).
- [x] Add the new page to the protocol doc lists of `docs/architecture.md`
      and `README.md`.
- [x] Check each relative link of the changed Markdown files.
- [x] Read OpenAI's published terms about a user's own API key behind a
      proxy, and its request size limit. Save the text and the address
      under `.context/model-gateway/`. Report the result to Cal before
      Milestone 6 (open check 2).

## Milestone 2: Turn tokens in the workspace

Depends on: 1

The workspace Durable Object makes one turn token for each turn and
checks it. Nothing sends the token yet. Milestone 6 sends it to the
runner.

- [x] Add a token function for a running turn, with a routing part that
      names the workspace (D1). The same turn always gets the same token,
      so a resent `turn` command carries the same token. Keep only a
      random value and the login version of D30 with the turn, and derive
      the token from them. Put no token in a log, in a stored command, or
      in the runner outbox. Milestone 6 calls the function at dispatch,
      because runner delivery is a file that the own-endpoint change
      shares.
- [x] Add a check beside `credentialSender` in
      `worker/workspace-lifecycle.ts` (D4). It accepts a token only while
      its turn is running, its session is open, and the turn is the active
      turn of the session. Reuse `activeStoredTurn` from
      `worker/devices/access.ts`.
- [x] In the same check, apply decision 7 D with D30. Read the login in a
      new gateway query. Change no login read in `worker/chat/queries.ts`
      before the own-endpoint merge, because that change edits them.
      Reuse `senderLoginAccess`, `agentLoginContext`, and `loginSecret` as
      they are.
- [x] When decision 7 ends a turn, end it with `agent_login_required`.
      Use the text of `unavailableLoginMessage` for a removed login or a
      lost access (D12), and the cause of D30 for a changed login. Stop
      the agent through the existing Stop path, and keep one end for the
      turn.
- [x] Tests, as the `testing` skill says: a token works while its turn
      runs. It fails after the end, during Stop, and for another
      workspace. It ends the turn after a change or a removal of the
      login, and after a loss of the starter's access (decision 7 D).

## Milestone 3: The gateway route

Depends on: 2

The Worker route takes model requests with a turn token and forwards
them to Anthropic or OpenAI. Milestone 6 adds the own endpoint.

- [x] Run open checks 3 and 4 first. Install the runner packages with
      `npm ci --prefix runner`. Run the pinned programs against a local
      fake gateway with fake keys, for each login kind. Send no request to
      a real provider. Save the result under `.context/model-gateway/`.
- [x] Add the gateway paths to `MACHINE_PATHS` in
      `src/shared/agent-tools.ts`, one base address for each agent (D9).
      Dispatch them in `worker/application.ts` on the machine hostname.
- [x] Give the route the limit of 100,000,000 bytes in
      `requestBodyBudget` of `worker/http/request-body.ts` (decision 3 B,
      D21). Stream the upload, and answer as D17 says.
- [x] Forward only the routes of D7, with the routes that open checks 3
      and 4 found. Refuse `HEAD /api/hello` without an upstream call.
- [x] Apply the header rules of D8. Add the real login in the header of
      its kind. Pass bodies unchanged. Remove the real login from each
      response header and error body (D29).
- [x] Stream each answer without a copy. Check the turn every 30 seconds
      while an answer streams, and end it after the turn (decision 6 B).
- [x] Answer refusals as D12 says. Log no body and no header value (D15).
- [x] Add a fake Anthropic and a fake OpenAI upstream under
      `worker/test-support/`, and update its README.
- [x] Tests: each route, the header removal, the credential swap of each
      login kind, the removal of D29, the refusals, the body limit, and
      the end of an open answer after its turn.
- [x] Confirm the Workers plan and the zone plan of the deployment.
      Cal confirmed Workers Paid on 9 November 2026. The API confirmed
      the Free Website plan of `conductive.build` and its 100 MB upload
      limit (open check 6).
      Record: `.context/model-gateway/cloudflare-plan-api-check.json`.
- [x] Update `worker/README.md`.

## Milestone 4: Runner version pin

Depends on: 1

Each workspace refuses a runner below the version of its image (decision
5 A). This milestone lands before any image build installs a runner of
version 2.

- [x] Use the existing columns `image_builds.runner_protocol_version` and
      `workspaces.runner_protocol_version` of
      `migrations/202611060100_contracts.sql`. No migration is needed. A
      workspace with no value means version 1 (D19).
- [x] A full build keeps recording `RUNNER_PROTOCOL_VERSION`, as
      `insertBuild` in `worker/lifecycle/build-admission-data.ts` does. A
      refresh copies the version of the image that it refreshes, in place
      of the Worker's version (D18).
- [x] A new workspace copies the version of its image build, which the
      create path already reads in
      `worker/lifecycle/published-image-data.ts` (D19).
- [x] Check the version in the runner's first message, in
      `worker/chat/runner-input.ts` and `worker/chat/runner-channel.ts`,
      before the welcome and before any command. Refuse a lower version
      as a refused token is refused, and log a warning for the operator
      (D20).
- [x] `docs/deployment.md`: publish the runner archive from the same
      commit as the Worker, before any build (D18).
- [x] Tests: a workspace with version 2 refuses a version 1 runner. A
      workspace without a version accepts version 1. A refresh keeps the
      version of its image.

## Milestone 4a: Claude transport check

Depends on: 3

This read-only check can run beside Milestone 5. It needs the pinned
agent program and the chosen gateway requirements, not the new runner
wire types. Keep scripts and proof under `.context/model-gateway/`.

- [x] Check the pinned Claude program's available transport mechanisms
      and tool environments. Find a route that fixes the gateway address
      while preserving a project's own model settings and private
      credential delivery. Check commands, background commands, both
      hook forms, and MCP servers with fake keys and local fake upstreams.
- [x] Return the mechanism, its proof, and any requirement exception it
      would need. Select no such exception without Cal's answer.
- [x] Profile proof for decision 11 K, with the layout of D38, the pinned
      client, fake upstreams, fake keys, and a loopback-only network:
      normal and background commands, shell-form and exec-form hooks, and
      MCP servers from `.mcp.json` and from the SDK options get no gateway
      address and no turn token. A child with its own key reaches its own
      destination.
- [x] Same setup: record each request header name, the `anthropic-beta`
      values, and the user agent in profile mode with the token prefix of
      each login kind, beside native API-key and subscription mode. List
      the values that only profile mode sends (D40), and the markers that
      a keyless request of `@anthropic-ai/sdk` 1.6.0 lacks (D39). Record
      the model that the client picks for background work in each mode.
- [x] Same setup: two sessions at once, with two profile names in one
      config folder, each send only their own token.

Evidence: `.context/model-gateway/reports/m4a-report.md`,
`m4a-unix-report.md`, `c-restore-report.md`, and
`profile-probe/report.md`, and `m4a-profile-final-report.md`. Cal chose K
for gateway decision 11.

## Milestone 5: Login docs for the gateway

Depends on: 1

Write the remaining gateway requirements for the existing Anthropic and
OpenAI login kinds. Decision 10 B removes the own-endpoint dependency.

- [x] Merge `origin/main` into the primary branch with the `git-merge`
      skill.
      The sync at `819f4605` preserved the gateway rules in the extracted
      `docs/protocol/agent-runner.md`. Audit:
      `.context/model-gateway/integration/main-sync-audit.log`.
- [x] `docs/protocol/access-and-security.md`, "Agent logins in a sandbox":
      a cloud computer with a newer runner holds a turn token and no login.
      Remove the rejection of a login proxy (decision 120). State what
      sandbox code can do with a turn token during a turn. State that a
      cloud computer with an older runner keeps the old risk and the rule
      against inheritance (decision 2 A). Name the repository settings
      path of D10 in that risk.
- [x] Same doc, "Agent logins": Anthropic confirmed the gateway for
      subscription tokens on 9 November 2026 (decision 1). OpenAI
      confirmed the gateway for OpenAI keys on the same day.
- [x] Same doc: the risk of decision 124 gives turn tokens of later turns
      on a newer runner, and real logins on an older runner.
- [x] Confirm that `docs/protocol/model-gateway.md` states the current
      Anthropic and OpenAI upstreams. The own-endpoint protocol work
      moves with that feature to its follow-up.
- [x] `docs/architecture.md`: "Sandbox software", the chat flow,
      "External services", "Trust boundaries", and the
      `api.conductive.build` row of the hostname table.
      The chat flow is on its flows page, `docs/architecture/flows.md`.
- [x] Check each relative link of the changed Markdown files.
      Report: `.context/model-gateway/reports/m5-docs.md`.

## Milestone 5a: Docs for the profile transport

Depends on: 5

The protocol docs state the rules of decision 11 K.

- [x] `docs/protocol/model-gateway.md`: the programs that the agent
      starts get no gateway address from the runner. Claude reads the
      turn token from a file that only the sandbox user can read, and
      the runner removes the file when the turn ends. A settings file in
      the repository can change the address of Claude's requests, and
      that address then gets the turn token. On the Claude route the
      gateway refuses a request without the markers of the agent program
      (D39). Replace the rule that a repository settings file cannot send
      these requests to another address, with its reason.
- [x] `docs/protocol/sandbox-credentials.md`: state these risks for a
      sandbox with a version pin of 2 or later. In the version 1 risk,
      replace the sentence that a newer runner closes the settings path:
      a newer runner sends only a turn token on that path.
- [x] Read `src/marketing/privacy.ts` and `src/marketing/terms.ts` in
      full, with their parts. List each sentence that restates a changed
      fact, for Milestone 8a.
- [x] Check each relative link of each changed Markdown file.

## Milestone 6: Runner protocol version 2 in the Worker

Depends on: 3, 4, 5

The Worker serves runner protocol versions 1 and 2. Version 2 gets turn
tokens for the existing Anthropic and OpenAI login kinds.

- [x] `src/shared/runner.ts`: version 2, as D16 says. Keep the version 1
      types for older runners (decision 2 A).
      Branch: `conductor/model-gateway-worker-protocol-2`.
- [x] `worker/chat/runner-input.ts`: accept versions 1 and 2, within the
      pin of Milestone 4.
      Branch: `conductor/model-gateway-worker-protocol-2`.
- [x] `worker/chat/runner-delivery.ts`: send the real login to version 1,
      as now, and the turn token of Milestone 2 to version 2.
      Branch: `conductor/model-gateway-worker-protocol-2`.
- [x] Move the Worker tests that build runner commands with a login.
      Keep every assertion. Add the version 2 cases.
      Branch: `conductor/model-gateway-worker-protocol-2`.
- [x] Move `RunnerDelivery.failLogin` to the failure entry of
      `TurnLifecycle`, and make `finish` private. This completes review
      finding 3, which kept the shared runner delivery file unchanged.
      Branch: `conductor/model-gateway-worker-protocol-2`.
- [x] Report each turn end to the workspace lifecycle by turn ID from
      `TurnCompletion.finish`, and drop the type match of turn ends in
      `runnerEventStored` and `worker/chat/runner-receipt.ts`. This is the
      wider fix of review finding 6.
      Branch: `conductor/model-gateway-worker-protocol-2`.
- [x] Before any runner gets a turn token, apply the user's answers on
      OpenAI background requests and OpenAI's review. Done on 9 November
      2026: gateway decision 9 A, and OpenAI confirmed the gateway.
- [x] Check the Worker's other fetches. Then turn on
      `global_fetch_strictly_public` in `wrangler.jsonc` (open check 8).
      Save the check under `.context/model-gateway/`.
      Branch: `conductor/model-gateway-worker-protocol-2`.
- [x] Tests: a version 1 runner gets the real login. A version 2 runner
      gets a token. Each existing login kind reaches its provider
      through the gateway with the correct authentication mode.
      Branch: `conductor/model-gateway-worker-protocol-2`.

Evidence: `.context/model-gateway/report.md`.

## Milestone 6a: The gateway for the profile transport

Depends on: 4a

The Claude route accepts the requests of Claude's profile mode, and
refuses the requests of other programs (decision 11 K). Merge it before
Milestone 7, so that API-key turns work at each merge.

- [x] Accept the turn token of an API-key login as a bearer token on the
      Claude route, and keep the signed-prefix check (D35, D40). Send the
      real key in `x-api-key`. Remove only the `oauth-2025-04-20` value
      of `anthropic-beta` for an API-key login.
      Branch: `conductor/model-gateway-m6a-gateway-profile-requests`.
- [x] Refuse a request without the agent markers that Milestone 4a names
      (D39), with no turn check and no upstream call. Answer in the
      Anthropic error shape with a stable code.
      Branch: `conductor/model-gateway-m6a-gateway-profile-requests`.
- [x] Add the focused tests in `worker/model-gateway/`. Keep every
      current assertion.
      Branch: `conductor/model-gateway-m6a-gateway-profile-requests`.
- [x] Update `worker/model-gateway/README.md`.
      Branch: `conductor/model-gateway-m6a-gateway-profile-requests`.

## Milestone 7: Runner on the gateway

Depends on: 6, 4a

The runner speaks version 2 only. Its agent programs send their model
requests to the gateway with the turn token.

- [x] The provider adapters take an endpoint and a credential (D23).
      Branch: `conductor/model-gateway-m7-runner-on-the-gateway`.
- [x] Claude: write the profile pair of D38 at each turn, and start the
      `claude` program with its config folder and profile name. Give it
      no descriptor credential and no address, token, proxy, or
      certificate setting. Remove the credentials file at the end of the
      turn, at the close of the session, and at runner start (decision
      11 K).
      Branch: `conductor/model-gateway-m7-runner-on-the-gateway`.
- [x] Codex: put the gateway in `base_url` of the model provider. Send the
      turn token with `account/login/start` (D2, D10).
      Branch: `conductor/model-gateway-m7-runner-on-the-gateway`.
- [x] The output filter hides the turn token (D16).
      Branch: `conductor/model-gateway-m7-runner-on-the-gateway`.
- [x] The packaged runner and each new image build advertise protocol
      version 2 (D34).
      Branch: `conductor/model-gateway-m7-runner-on-the-gateway`.
- [x] Move each runner consumer of the replaced ways. Remove the runner's
      real-login handling from its production version 2 turn path.
      Branch: `conductor/model-gateway-m7-runner-on-the-gateway`.
- [x] Move `runner/src/providers/claude-login.test.ts` and
      `codex-login.test.ts` to the turn token and the gateway address,
      with every assertion. Add tests for the profile pair: its paths,
      modes, content, one name for each session, and its removal.
      Branch: `conductor/model-gateway-m7-runner-on-the-gateway`.
- [x] Update `runner/agent-logins.md`, `runner/README.md`,
      `runner/scripts/README.md`, and `image/developer-scripts.md`.
      Branch: `conductor/model-gateway-m7-runner-on-the-gateway`.
- [x] Limit `plans/follow-ups/agent-login-in-tool-processes.md` to runners
      of version 1 (decision 2 A).
      Branch: `conductor/model-gateway-m7-runner-on-the-gateway`.

## Milestone 7a: The 1-hour cache for subscription turns

Depends on: 7

Claude keeps the 1-hour prompt cache of a subscription turn under the
profile transport (gateway decision 13 B).

- [ ] Claude: for a turn whose credential is a Claude subscription token,
      the runner gives the `claude` program
      `CLAUDE_CODE_PROMPT_CACHE_TTL=1h`. An API-key turn and a native login
      of the measure tool get no such setting.
- [ ] Add the focused runner tests: the setting for a subscription token,
      and no setting for an API key.
- [ ] `docs/protocol/model-gateway.md`, section "How the agents reach the
      gateway": a subscription turn keeps the 1-hour prompt cache, with
      the reason and gateway decision 13. Update `runner/agent-logins.md`.

## Milestone 8: Privacy page

Tags: ui

Depends on: 5

The privacy draft states the new facts. The legal mockup renders the same
file (D24).

- [x] `src/marketing/privacy.ts`: model requests pass through Conductive
      on Cloudflare, and Conductive keeps no copy. A cloud computer from a
      newer image holds no agent login, and its processes can use the
      turn token of a running turn. Keep the login and tool-server
      sentences for cloud computers with an older runner. Keep the GitHub
      token risk. Branch: `conductor/model-gateway-legal-copy`.
- [x] Read `src/marketing/terms.ts` in full, and update each sentence that
      restates a changed fact. Branch: `conductor/model-gateway-legal-copy`.
- [x] Run `npm run mockups:check`. Open the privacy page in the mockup
      preview. Branch: `conductor/model-gateway-legal-copy`.

## Milestone 8a: Legal copy for the profile transport

Tags: ui

Depends on: 5a

- [x] `src/marketing/privacy-recipients.ts` and `src/marketing/terms-org.ts`:
      in a newer cloud computer, agent settings in the repository can make
      the agent send the credential of a turn to another address. Update
      each other sentence that Milestone 5a lists. Follow the Terms
      version rule of `src/marketing/README.md`.
- [x] Run `npm run mockups:check`. Open the privacy and terms pages in
      the mockup preview.

Evidence: `.context/model-gateway/m8a/screens/checks.json`.

## Milestone 9: Split the long docs

Depends on: 5

This change touches three docs over the length target of the
documentation skill (D27).

- [x] Split `docs/protocol/access-and-security.md`,
      `docs/protocol/chat-and-events.md`, and `docs/architecture.md` into
      linked pages by topic.
      Branch: `conductor/model-gateway-protocol-doc-split`.
- [x] Update every relative link, and the doc lists of
      `docs/architecture.md` and `README.md`.
      Branch: `conductor/model-gateway-protocol-doc-split`.
- [x] Update `plans/follow-ups/protocol-docs-split.md` to the docs that
      remain. Branch: `conductor/model-gateway-protocol-doc-split`.

Evidence: `.context/model-gateway/final-m9/report.md`.

## Milestone 10: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the check of decision 12 A on Cal's Mac, for an API key and for a
      subscription token. Record the results under `.context/model-gateway/real-check/`.
- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Copy the merge justifications of
      `.context/model-gateway/merge-main-ab58-justification.md` into the pull
      request description, as the `git-merge` skill says.
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
