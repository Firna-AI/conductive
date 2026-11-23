# OpenCode as a third agent

Status: Active. On branch `calummoore/milan-4mrs`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today Conductive offers two agents, Claude and Codex (decision 19). Cal
asked on 16 November 2026 how Conductive could support OpenCode. OpenCode
is an open-source coding agent under the MIT licence, at
`github.com/anomalyco/opencode`. It works with many model providers. Two
brainstorms compared the approaches. The notes are in `.context/opencode/`
and `.context/opencode-2/`, which Git ignores.

This change adds OpenCode as a third agent in the agent runner, beside
Claude and Codex (OpenCode decision 1 D). Each OpenCode turn sends its model
requests through the model gateway with a turn token, as the other agents
do. No agent login enters the sandbox (decision 120). The change does not
cover Claude, ChatGPT, or Gemini plans in OpenCode, because their providers
forbid that use. It does not cover other agents, such as Cursor, or a
general ACP host.

The prefix `OpenCode` names the decisions of this change, as
[Decision numbers](../docs/architecture.md#decision-numbers) says. The
options check of OpenCode decisions 2 to 7 ran on 23 November 2026. Its
report is in `.context/opencode-agent/options-check.md`.

Contract owners:

- [Agents and sessions](../docs/protocol/agents-and-sessions.md).
- [Model gateway](../docs/protocol/model-gateway.md) and
  [its requests](../docs/protocol/model-gateway-requests.md).
- [Tokens and secrets](../docs/protocol/tokens-and-secrets.md),
  [Own endpoint logins](../docs/protocol/own-endpoint-logins.md),
  [Org logins](../docs/protocol/org-logins.md), and
  [The share setting](../docs/protocol/share-setting.md).
- [Isolation](../docs/protocol/isolation.md#agent-logins-in-a-sandbox).
- [Agent runner](../docs/protocol/agent-runner.md),
  [Agent instructions delivery](../docs/protocol/agent-instructions-delivery.md),
  [Agent tools](../docs/protocol/agent-tools.md), and
  [Org skills](../docs/protocol/org-skills.md).
- [Model favourites](../docs/protocol/model-favourites.md) and
  [Model inputs](../docs/deployment/models.md).
- The [runner README](../runner/README.md), the
  [SDK helper README](../runner/sdk-helper/README.md), the
  [model gateway README](../worker/model-gateway/README.md), and the
  [migrations README](../migrations/README.md).

## Facts that the design uses

Checked on 23 November 2026. The sources are in
`.context/opencode-2/web/notes.txt` and `notes-providers.txt`.

- OpenCode V2 is at v2.4.0. Its server API calls itself "experimental",
  and patch releases still break it, such as v2.2.7. About 22 releases
  came out each month in September and October, and 6 in November up to
  the 23rd.
- OpenCode runs without a screen as `opencode serve`, with HTTP Basic
  auth. A prompt takes `delivery: "steer"` or `"queue"`. Routes exist for
  interrupt, fork, and resume by session ID. The live event stream has no
  replay. An experimental durable log can be read after a sequence number.
- A provider takes `baseURL`, `headers`, and `{env:}` or `{file:}` values.
  Only the system config at `/etc/opencode` wins over project files. Only
  system `policies`, such as `provider.use`, stop a project from adding
  providers.
- A prompt has no system field. The `system` setting of an agent replaces
  OpenCode's base prompt. Efforts are model variants, as `#variant`.
- Skills load from `.opencode/skills`, `.claude/skills`, and
  `.agents/skills`. Permissions allow everything by default, except
  `.env` reads, which ask. Subagents always run in the background and
  report to the parent session.
- The Linux x64 program is 130 MB compressed and 275 MB unpacked.
  `@opencode/core` also has a Node build.
- OpenCode Console serves Claude models only on the Anthropic Messages
  API, and GPT models only on the OpenAI Responses API. Most open models
  use the Chat Completions API. The Console terms allow only the holder's
  own internal use.
- Anthropic forbids a third party to route requests through Claude
  consumer plans. Google forbids Gemini plan logins in other tools. The
  Sign in with ChatGPT terms require that tokens stay under the user's
  control. GitHub supports Copilot plans in OpenCode, and names no rule
  against hosted use.
- The brand page allows the name "OpenCode" and "works with" wording, but
  nothing that suggests an endorsement.

## Code that allows only two agents

- The Rust `Agent` and `RunnerLoginKind` enums in
  `crates/cnd-runner-interface/src/agents.rs` and `runner_credentials.rs`.
  `SkillLists` in `skills.rs` has one list for each of the two agents.
- `readAgent` in `src/chat/api/read-chat.ts:32` refuses every other value.
  `readModels` and `readAccount` in `src/chat/api/read-responses.ts` use
  it. The start of the app reads the model list (`src/app/boot.ts:44`), so
  one unknown agent in that list stops the app from starting. The Mac app
  bundles its own copy of the web app, so older Mac apps keep this reader
  until they update.
- The shell stream reader fails a whole history page on one event that it
  cannot read (`src/app/api/read-events.ts:117`).
- The agent tools read replies with the closed Rust `Agent` enum
  (`crates/cnd-tools/src/reply.rs`). A sandbox with older software keeps
  this reader until it updates.
- D1 checks `agent IN ('claude', 'codex')` in `agent_logins`
  (`migrations/202611060100_contracts.sql:130`), in `org_agent_logins`
  (`migrations/202611170110_org_agent_logins.sql:3`), and on
  `user_preferences.default_agent`
  (`migrations/202611082300_new_workspace_view.sql:3`).
- `runnerSupportsLogin` in `src/shared/runner.ts` accepts every login
  except a Codex token when a runner advertises no login kinds.
- The helper chooses an adapter in `runner/sdk-helper/src/main.ts:16`.
- The Claude gateway route accepts only the Claude program
  (`worker/model-gateway/headers.ts:54`).
- The Worker ignores a login kind in `hello.loginKinds` that it does not
  know (`worker/chat/runner-input.ts:107`). So a newer runner can
  advertise OpenCode to an older Worker.

## Decisions

### OpenCode decision 1. Choose an approach for OpenCode support

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Conductive offers Claude and Codex "for now" (decision 19). Conductor, a competitor, ships an OpenCode agent. An own endpoint login can only hide models of the model list.
- **Problem:** No recorded decision said what "support OpenCode" means: the OpenCode agent, or only the models and plans that OpenCode gives.
- **Impact if no action:** Members can run OpenCode only by hand, in the terminal.
- **Root question:** How should members use OpenCode, or the models and provider accounts that they want OpenCode for, in a workspace?
- **Options:**
  - **A.** Change nothing. Members run OpenCode in the terminal, with keys in org env vars or on the disk. Effort: Small.
  - **B.** Add selected Console or OpenRouter models to the model list under Codex, with a guide. Effort: Medium.
  - **C.** An own endpoint offers every model that it lists, in the Claude and Codex agents. Effort: Large.
  - **D.** OpenCode as a third agent, through the model gateway. Effort: Large.
- **Left out:** A general ACP host, because OpenCode's ACP mode refuses a message during a turn. OpenCode in the Worker, because agents run in the sandbox (decision 36). OpenCode as the only agent program, because it drops the Claude SDK. Format translation in the gateway, because the gateway passes bodies unchanged. Subscription logins in OpenCode, because the providers forbid them.
- **Wider fix:** None. This is a choice of product scope.
- **Previous examples:** None found.
- **Recommendation:** C. It gave OpenCode's models to members in agents that already meet every rule. D was the pick if the goal was the OpenCode agent itself.
- **Action:** ask the user, because the answer sets the product scope.
- **Chosen:** D, by the user on 23 November 2026. The agent recommended C. The first brainstorm, on 16 November 2026, recommended D.

### OpenCode decision 2. Accounts that pay for OpenCode turns

Changed by the options check: a new root question, corrected texts of A and C, and new options D and E.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/model-gateway/`, `crates/cnd-runner-interface/src/runner_credentials.rs`.
- **Background:** Each login kind needs its own gateway routes and its own turn token rules. Own endpoint logins exist for Claude and Codex. OpenCode can use the Chat Completions, Responses, and Messages APIs. The API of a login decides which models of a host it reaches. On OpenCode Console, Chat Completions reaches only the open models.
- **Problem:** No decision says which accounts can pay for an OpenCode turn.
- **Impact if no action:** The gateway routes, the account page, and the runner login kinds cannot be built.
- **Root question:** Which logins, and which model APIs behind them, can pay for an OpenCode turn at launch?
- **Options:**
  - **A.** Own endpoint on the Chat Completions API only. It reaches every model on OpenRouter and LiteLLM, and the open models on Console. It does not reach Console's Claude and GPT models. One gateway route and one model list read. Effort: Medium.
  - **B.** A, and Anthropic and OpenAI API keys with fixed upstreams. This adds two route sets. Under OpenCode decision 3 A, a member holds one provider at a time. Effort: Large.
  - **C.** B, and an OpenCode Console key as a named kind with a fixed upstream. The whole Console catalogue needs the Chat Completions, Responses, Messages, and Google routes. Effort: Large.
  - **D.** The owner of an own endpoint picks its API: Chat Completions, Responses, or Messages. It reaches Console's Claude and GPT models. It needs three route sets, an API field in the form and in D1, and one model list read for each API. Effort: Large.
  - **E.** A, and the member's GitHub Copilot plan. The Worker holds and renews a device sign-in, as for the ChatGPT sign-in of Codex. The login is personal only, never shared, and never an org login. It needs GitHub's written confirmation first, Copilot routes, a renewal path, and changes to the legal pages. GitHub can block the use. Effort: Large.
- **Left out:** Claude and Gemini plans, because the providers forbid them in a hosted tool. ChatGPT plans, because OpenAI's terms keep tokens under the user's control. An operator account that pays and bills members, because the app counts no use of a login. OpenCode's free models with no login, because their providers may use the data and the gateway has no login to check.
- **Wider fix:** None.
- **Previous examples:** Own endpoint decision 1 added own endpoints for Claude and Codex.
- **Related:** OpenCode decision 3 depends on this answer.
- **Recommendation:** A. One Chat Completions route reaches every model on OpenRouter and LiteLLM and most open models on Console. Members keep Console's Claude and GPT models in the Claude and Codex agents. The options check also recommends A.
- **Action:** ask the user, because the answer sets what members can connect.

### OpenCode decision 3. Where a member connects OpenCode

Changed by the options check: a new root question, a corrected text of B, and new options C and D.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `migrations/202611060100_contracts.sql:130`, `migrations/202611170110_org_agent_logins.sql:3`, `migrations/202611082300_new_workspace_view.sql:3`.
- **Background:** Each member has one personal login for each agent, on the account page. An admin can connect one org login for each agent (org login decision 1 B). A session runs on the login of its starter or of its org (decision 105). D1 allows only `claude` and `codex` as the agent of a login and of a default choice.
- **Problem:** OpenCode needs a login. It can have its own, or it can use a login of another agent.
- **Impact if no action:** No OpenCode turn can start.
- **Root question:** Which logins can an OpenCode session run on, and who connects them?
- **Options:**
  - **A.** OpenCode gets its own personal and org login, as Claude and Codex have. It follows the share setting and the default login rules. D1 rebuilds three tables to allow `opencode`. Effort: Large.
  - **B.** OpenCode uses the Codex or Claude login of the member, when that login is an API key or an own endpoint. No new login. `user_preferences` still needs a rebuild for an OpenCode default choice. It needs B of OpenCode decision 2, and a member with only a subscription cannot use OpenCode. Effort: Medium.
  - **C.** OpenCode gets only an org login, which an admin connects on the Agents tab. No account card and no share setting. D1 rebuilds `org_agent_logins` and `user_preferences`. In an org without an OpenCode org login, no member can use OpenCode. Effort: Medium.
  - **D.** One OpenCode login for each fixed upstream: an Anthropic key, an OpenAI key, or an own endpoint. A session takes the login of the upstream of its model. A model of another upstream starts a new session. It is useful only with B or C of OpenCode decision 2. Effort: Large.
- **Left out:** A personal login only, with no org login. A company key pays through the org login (org login decision 1 B), and the org form is a copy of the account form.
- **Wider fix:** None.
- **Previous examples:** Org login decision 1 B.
- **Related:** OpenCode decision 2. Under its option A, only A and C of this decision work. Under its option B, B or D fits better.
- **Recommendation:** A, while OpenCode decision 2 is A. It keeps the rule that each agent has its own personal and org login. The options check also recommends A.
- **Action:** ask the user, because the answer changes the account page and the stored data.

### OpenCode decision 4. The models that OpenCode offers

Changed by the options check: new option D, and the recommendation changed from A to C.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/deployment/models.md`, `wrangler.jsonc`, `worker/model-gateway/endpoint-models.ts:8`.
- **Background:** The operator sets one model list for all users in `CONDUCTIVE_MODELS`. Each entry gives the agent, the model ID, the label, the efforts, and fast mode. The pickers of an own endpoint owner hide each model that the endpoint does not list. Before the first list, they show every model of the app. Model IDs differ by host: `kimi-k3` on Console, `moonshotai/kimi-k3` on OpenRouter, or a LiteLLM alias.
- **Problem:** OpenCode can run any model of its login. No rule says which ones the pickers show. The operator cannot know the IDs of each host.
- **Impact if no action:** The pickers cannot show OpenCode models.
- **Root question:** Which models can a member pick for OpenCode?
- **Options:**
  - **A.** Only the models that the operator lists under `opencode`. The endpoint rule hides each model that the endpoint does not list. The efforts come from the list. On a host that the operator did not foresee, every model fails. Effort: Medium.
  - **B.** Every model that the endpoint of the login lists. The picker gets a search. An unknown model offers one effort, the model's own default. Effort: Large.
  - **C.** A, and a search that also offers the other models of the endpoint, with the efforts of B. OpenCode logins do not show every model of the app before the first list. Effort: Large.
  - **D.** The owner of a personal login, or an admin for an org login, picks which models of the endpoint's list the pickers show. The efforts are those of B. It needs a selection list with search on the account page and the Agents tab, and a stored subset in D1. Effort: Large.
- **Left out:** A model ID that the member types by hand. B covers it with less risk of a typing error. Efforts from OpenCode's own model catalogue, because the runner never learns the host of an own endpoint (gateway decision 10).
- **Wider fix:** None.
- **Previous examples:** [Own endpoint logins: the model list](../docs/protocol/own-endpoint-logins.md).
- **Related:** OpenCode decision 5. Under A and C, OpenCode entries reach the one model list that every client reads at start. OpenCode decision 9 covers two models with the same name.
- **Recommendation:** C, changed from A. Each OpenCode login is an endpoint whose model IDs the operator cannot know, so A alone shows models that fail. The operator's entries still give known models their efforts. The options check also recommends C.
- **Action:** ask the user, because the answer sets what members see in each picker.

Risks of B, C, and D: OpenRouter's model list held 477 models in 927,044 bytes on 23 November 2026. That is 88% of the 1 MiB read limit. The label of the effort of an unknown model cannot say "None", because None means thinking off. A new effort value would break older readers.

### OpenCode decision 5. Older clients and the new agent

Changed by the options check: a wider root question, the cost of B, and new option D. Changed on 23 November 2026: the user proposed option E, and the recommendation moved from B to E.

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/chat/api/read-chat.ts:32`, `src/app/boot.ts:44`, `src/app/api/read-events.ts:117`, `crates/cnd-tools/src/reply.rs`.
- **Background:** The older clients are older Mac apps, browser tabs that loaded an older web app, and the agent tools of older sandbox software. Their readers refuse an agent other than `claude` and `codex`. The model list, the account reply, favourites, default logins, workspaces, sessions, events, and automation runs all carry an agent. The rules of this repository say that older copies of the Mac app and older runners must keep working.
- **Problem:** One OpenCode entry in the model list stops every older app from starting. One OpenCode workspace breaks the workspace list of its org. One OpenCode event makes an older app reconnect again and again. One OpenCode value breaks the agent tools of an older sandbox.
- **Impact if no action:** Users of older clients lose the app until they update. A Mac app updates at its next launch, so most users recover after a restart.
- **Root question:** How do older clients keep working when replies start to name an agent that they do not know?
- **Options:**
  - **A.** Release readers that skip an unknown agent first, in the web app and in the agent tools. Launch OpenCode in a later deploy, at least 14 days after. Clients that did not update in that time still break, with an unreadable failure. Effort: Medium.
  - **B.** A, and each new client sends a header that names the agents that it reads. The Worker leaves OpenCode values out of each reply to a client without it. The event stream sends an older socket a neutral event with the same number. An older client whose saved default is OpenCode gets the app default. Older clients show no OpenCode models, logins, or sessions, and keep working. Effort: Large.
  - **C.** A, and OpenCode starts behind a switch for each org that an operator turns on. Under OpenCode decision 4 A or C, every older app still meets the model list. Effort: Medium.
  - **D.** A, and after the launch the Worker answers the start reads of a client without the new header with an error. Its text asks the user to update the Mac app or reload the page. An older app shows that text on "The app didn't load", and its updater still installs the new version. This is a new gate that refuses older clients, so it needs the user's approval. Effort: Small.
  - **E.** Proposed by the user on 23 November 2026. B, but each client sends its app version in place of a list of agents. The web app and the Mac app send the product version, such as `0.34.0`, from `package.json`, which `build-version.ts` already reads. The agent tools send the release version of the sandbox software. The event socket takes the version as a query value, because a browser cannot set a header on a WebSocket. The Worker keeps one table of the first version that reads each new value. It treats a missing or unreadable version as old, and a `development` build as current. The header is not a security boundary: a client that sends a false version only breaks its own reads. Effort: Large.
- **Left out:** Map an OpenCode value to Codex for older apps, because the app would then show wrong data.
- **Wider fix:** E. One version covers the whole product (`docs/protocol/desktop-packages-and-updates.md`), so the same header and table protect older clients from each later new value, not only from new agents.
- **Previous examples:** [Service reports](../docs/protocol/service-reports.md#the-worker-and-the-app) adds no new top-level message, because older apps refuse it. [Switch account](../docs/protocol/switch-account.md) words a wait so that older apps show it.
- **Related:** OpenCode decision 4.
- **Recommendation:** E, changed from B after the user's proposal. It keeps older clients working as B does. It also uses the one product version that already exists, and it serves each later compatibility change. A version moves only at a release, so a build between the merge of the new readers and the next release counts as old. That build only shows no OpenCode. The options check recommended B, before E existed.
- **Action:** ask the user, because A, C, and D break older clients for some users, D adds a gate, and B and E cost more.
- **Chosen:** E, by the user on 23 November 2026, as recommended. The user proposed E.

### OpenCode decision 6. Repository settings of OpenCode

Changed by the options check: the reason of B, new options D and E, and the wider fix.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `runner/sdk-helper/src/providers/environment.ts`, `runner/sdk-helper/src/providers/codex.ts:94`.
- **Background:** OpenCode reads `opencode.json` and the `.opencode/` folder of the project. They can set providers, base URLs, plugins, MCP servers, agents, commands, instructions, and skills. A plugin is code that OpenCode loads. Only a system config and its policies, which the runner writes as root, win over project files. Claude reads `.claude/settings.json` of a repository, which can move the model requests and the turn token to another address. [Model gateway](../docs/protocol/model-gateway.md#how-the-agents-reach-the-gateway) accepts that risk for Claude.
- **Problem:** A repository file can send each model request with the turn token to another address, or load a plugin into OpenCode. A plugin, a `{file:}` value, or a command of a turn can read a token file.
- **Impact if no action:** The adapter cannot set up OpenCode safely.
- **Root question:** What may a repository change in the setup of OpenCode?
- **Options:**
  - **A.** Nothing. The runner sets the full setup and turns off project settings. The repository's skills, instructions, and `AGENTS.md` still reach OpenCode through the runner. Effort: Medium.
  - **B.** Everything except providers and base URLs. A system config and a `provider.use` policy, which the runner writes, keep OpenCode on the gateway. Plugins, MCP servers, agents, and commands of the repository load. Effort: Medium.
  - **C.** Everything, as with Claude. A repository can move the requests and the turn token. Effort: Small.
  - **D.** B, and system policies also deny the repository's plugins and MCP servers. Repository agents, commands, skills, and instructions still load. This rule is stricter than the Claude rule. Effort: Medium.
  - **E.** B, and a loopback forwarder in the helper adds the turn token to each request. OpenCode's provider points at the forwarder with a local secret, so OpenCode holds no turn token. It needs a streaming forwarder that the port list leaves out. It replaces the `{file:}` design call. Effort: Medium.
- **Left out:** An org setting that picks A or B. Claude and Codex have no such setting, and they carry the same risk.
- **Wider fix:** E. It keeps the token away from every repository setting, also from a setting that a later OpenCode version adds.
- **Previous examples:** The Claude settings rule in [Model gateway](../docs/protocol/model-gateway.md#how-the-agents-reach-the-gateway). The runner's `-c` settings keep Codex on the gateway (`codex.ts:94`).
- **Recommendation:** B. A repository keeps its own agents, commands, and plugins, and no repository file moves the model requests. B does not keep the token from a plugin, just as nothing keeps it from a Claude hook. E closes that gap at a small added cost. The options check also recommends B.
- **Action:** ask the user, because the answer sets a security boundary.

### OpenCode decision 7. How the OpenCode program reaches the sandbox

Changed by the options check: a new root question, new options D, E, and F, and the recommendation changed from B to D.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Performance.
- **Location:** `runner/sdk-helper/src/providers/binaries.ts`, `crates/cnd-cli/src/update/download.rs:63`.
- **Background:** The sandbox software release has the parts `node`, `system`, and `sdk-helper`. The updater skips each part that is already on the disk. The `sdk-helper` part carries the Claude and Codex programs, and it changes with each helper change: 14 commits on 6 days in the last 30 days. Each workspace has its own sandbox.
- **Problem:** Inside the `sdk-helper` part, every sandbox would download OpenCode again with each helper change, also when no one in the org uses it.
- **Impact if no action:** The adapter has no program to run.
- **Root question:** When does a sandbox get the pinned OpenCode program, and how often does it download it again?
- **Options:**
  - **A.** In the `sdk-helper` part, as Claude and Codex. No wait at the first OpenCode turn. Each helper change moves 130 MB more to each sandbox. Effort: Small.
  - **B.** A separate part that the runner downloads at the first OpenCode turn of the sandbox, with a pinned checksum. The first OpenCode turn of each new workspace waits for the download. Effort: Medium.
  - **C.** In the org image, through the build of the image. The OpenCode version then differs from the adapter's pin until the next build. Effort: Medium.
  - **D.** OpenCode as its own release part, beside `node`, `sdk-helper`, and `system`. Each sandbox and image installs it with the release. The updater downloads it again only when the OpenCode version changes. It adds about 275 MB of disk to each sandbox and image. Effort: Medium.
  - **E.** The helper runs OpenCode from its npm packages on its own Node, as a child process. The size and the Node 24 support are unknown. `@opencode/core` asks for an older Claude Agent SDK as a peer. Effort: Large.
  - **F.** B, and the runner also downloads the part in the background when a sandbox starts in an org that has an OpenCode login. A new optional field of the `welcome` message tells the runner. Effort: Large.
- **Left out:** A download from npm or GitHub at the turn. B gives the same wait from the app's own storage, with the pin.
- **Wider fix:** D for the Claude and Codex programs too, so that a helper change downloads none of them again. That is outside this change.
- **Previous examples:** None found.
- **Recommendation:** D, changed from B. No turn waits, and each sandbox downloads OpenCode once for each OpenCode version, through the parts path that already exists. The options check also recommends D.
- **Action:** ask the user, because the answer trades disk space against the first turn time.

### OpenCode decision 8. Background subagents of OpenCode

Added after the options check, which found that this design call needs the user.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `runner/background-work.md`.
- **Background:** A Claude turn stays open while its background work runs, up to 30 days, as [Background work](../docs/protocol/agent-runner.md#background-work) says. Codex turns do not wait, because Codex sends no notification when its background work ends. OpenCode subagents always run in the background, and each one reports to the parent session when it ends.
- **Problem:** No rule says what happens to an OpenCode subagent that still runs when the reply ends.
- **Impact if no action:** The adapter cannot end an OpenCode turn correctly.
- **Root question:** What does a member see when an OpenCode agent still has subagents at work at the end of its reply?
- **Options:**
  - **A.** The turn ends at the reply. The runner stops each subagent that still runs. Subagent work is lost. Effort: Medium.
  - **B.** The turn waits for the subagents, as a Claude turn waits for its background work, with the same note and time limit. Effort: Large.
  - **C.** The turn ends at the reply, and the subagents run on. The report of a subagent starts a new turn in the same session, on the login of the session. Effort: Large.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** The background work rules of Claude.
- **Recommendation:** B. Members get the same rule as Claude, and no work is lost. Milestone 3 checks that OpenCode reports the end of each subagent.
- **Action:** ask the user, because the answer is behaviour that members see and no requirement covers.

### OpenCode decision 9. Two models with the same name

Added after the options check, which found that this design call needs the user.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** [Names in the product](../docs/protocol/agents-and-sessions.md#names-in-the-product), [Model favourites](../docs/protocol/model-favourites.md).
- **Background:** The model picker names only the model and the effort, such as "Opus 5.5 Max". It does not show the words Claude or Codex. OpenRouter and Console also serve Claude and GPT models, so OpenCode can offer a model with the same name as a Claude or Codex model. Model favourites speak of "the other agent".
- **Problem:** A member cannot tell two picker entries with the same name apart.
- **Impact if no action:** A member picks the wrong agent and the wrong login, and spends the wrong account.
- **Root question:** How does a member tell which agent runs a model in the picker?
- **Options:**
  - **A.** Each menu entry shows the small mark of its agent. The picker text keeps only the model and the effort. Effort: Small.
  - **B.** The menu groups the models by agent, under a heading with the agent name. This changes the names rule. Effort: Medium.
  - **C.** An OpenCode entry whose name matches a Claude or Codex model adds the name of its host, such as "via OpenRouter". Effort: Medium.
- **Left out:** Hide an OpenCode model whose name matches a model of another agent, because the member may want it in OpenCode.
- **Wider fix:** B. It works for every agent and every name.
- **Previous examples:** None found.
- **Recommendation:** A. The marks already exist, and the names rule stays as it is.
- **Action:** ask the user, because the answer changes what members see in each picker.

## Design calls

These are the agent's calls, on 23 November 2026.

- The wire value of the agent is `opencode`. The product name is
  "OpenCode". Reason: the brand page gives that name.
- User-facing text says "agents powered by Claude, Codex, and OpenCode".
  The model picker shows the model and the effort, as OpenCode decision 9
  chooses. OpenCode gets its own small mark, and no brand logo. Reason: the
  rule of [Names in the product](../docs/protocol/agents-and-sessions.md#names-in-the-product).
- The helper runs a pinned OpenCode V2 as a child process. Reason: a child
  process keeps repository plugins out of the helper. Milestone 3 checks
  whether a stdio mode can replace `opencode serve`. Otherwise the server
  listens on `127.0.0.1` with a random password for each start, the port
  list leaves its port out, and the commands of a turn do not inherit the
  password.
- Unless OpenCode decision 6 E is chosen, the turn token reaches OpenCode
  through a `{file:}` value. The file is readable only by the sandbox user,
  and the runner removes it at the end of the turn, as with the Claude
  profile. No token and no gateway address is in the environment.
  Milestone 3 proves that OpenCode reads the file for each request.
- The runner keeps OpenCode on the gateway provider with a system
  `provider.use` policy and `OPENCODE_DISABLE_FREE_MODELS=1`. It strips
  provider key variables from OpenCode's environment. It turns off
  OpenCode's update checks, its model catalogue fetch, its automations,
  and its plugin updates.
- The adapter reads the live events. After a lost connection, it reads the
  durable log after the last sequence number. Reason: the event rules ask
  for no lost event.
- A message during a turn uses `delivery: "steer"`. Stop uses the
  interrupt route. A session resumes by its OpenCode session ID.
- The agent instructions reach OpenCode as an instructions file of its
  setup. OpenCode keeps its own base prompt. Reason: the `system` setting
  would replace that prompt.
- Efforts map to the variants of each model. Fast mode is off for OpenCode
  models.
- Permissions allow everything. A question from OpenCode is cancelled,
  as with the other agents. The workspace tools and the computer tools
  attach through MCP, with a timeout above the 90 seconds of a secret
  request.
- `SkillLists` gets an optional `opencode` list. An older Worker ignores it.
- The gateway base is `/v1/model/opencode`. It allows only HTTP, not
  WebSocket. It passes the body unchanged, and checks no client marker of
  another agent.
- OpenCode endpoint logins follow the share setting of own endpoints,
  shared by default (own endpoint decision 4). The OpenCode login guide
  warns that the Console terms allow only the holder's own internal use.
  Reason: [The share setting](../docs/protocol/share-setting.md) already
  leaves this choice to the owner of each login.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The account page, the Agents tab of the org settings, the model pickers,
the session tabs, New workspace, and the automation editor show OpenCode.

- [ ] Add an OpenCode login card to the account page mockup
      (`docs/mockups/src/screens/AccountScreen.tsx`, `accountAgents.ts`),
      in the shape that OpenCode decisions 2 and 3 choose.
- [ ] Add OpenCode to the Agents tab mockup (`orgAgentsState.ts`).
- [ ] Draw OpenCode models in the model menu, with the shape of OpenCode
      decisions 4 and 9.
- [ ] Draw the OpenCode mark in `docs/mockups/src/components/chat/AgentMark.tsx`
      and on a session tab.
- [ ] Draw OpenCode in the pickers of New workspace and of an automation.
- [ ] Draw the background wait of OpenCode decision 8, if B is chosen.
- [ ] Draw the error states: no OpenCode login, a refused endpoint, and a
      model that the endpoint does not serve.
- [ ] Run the mockup check named in `AGENTS.md`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the third agent, its logins, its gateway routes,
and its names.

- [ ] Update `agents-and-sessions.md`: decision 19 now names three agents,
      the names rule, and how OpenCode runs.
- [ ] Update the names rule in `AGENTS.md` and `CLAUDE.md`.
- [ ] Update `model-gateway.md` and `model-gateway-requests.md` with the
      OpenCode base, its routes, and how OpenCode gets the turn token.
- [ ] Update `tokens-and-secrets.md`, `own-endpoint-logins.md`,
      `org-logins.md`, `share-setting.md`, and `isolation.md` with the
      OpenCode logins.
- [ ] Update `agent-runner.md`, `agent-instructions-delivery.md`,
      `agent-tools.md`, `org-skills.md`, `model-favourites.md`, and
      `sandbox-software.md`.
- [ ] Update `docs/deployment/models.md` with the `opencode` agent.
- [ ] Record the older client rule of OpenCode decision 5.
- [ ] Read both legal pages in full. Update each sentence that restates a
      changed fact. Set the effective date of the Terms.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact. Add an OpenCode login guide.
- [ ] Update the runner, helper, gateway, and migrations READMEs.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: OpenCode spike in a sandbox

Depends on: none

A spike proves the risky parts before the adapter. It changes no product
code. Evidence goes to `.context/opencode-agent/spike.md`.

- [ ] Pin an OpenCode V2 version. Run it in a sandbox on Boat and on E2B.
- [ ] Check for a stdio mode that can replace `opencode serve`.
- [ ] Prove that a `{file:}` key is read for each request, so that a new
      turn token works without a restart.
- [ ] Prove the durable log: read events after a sequence number after a
      dropped connection.
- [ ] Prove steering, interrupt, resume, and fork.
- [ ] Prove that a system config and policies limit project settings, as
      OpenCode decision 6 chooses.
- [ ] Prove the MCP tools and their timeout.
- [ ] Check that OpenCode reports the end of each subagent, for OpenCode
      decision 8.
- [ ] Measure the download, the disk size, and the first start, for
      OpenCode decision 7.
- [ ] Update the design and the TODOs of this plan with the results.

## Milestone 4: Readers that accept a new agent

Depends on: 2

The web app, the next Mac app, and the agent tools skip an agent that they
do not know. This ships before any OpenCode value reaches a client.

- [ ] Make the agent readers of `src/chat/api/` and `src/app/api/` skip an
      entry with an unknown agent, instead of failing the whole read.
- [ ] Make the shell stream reader in `src/app/api/read-events.ts` skip an
      event that it cannot read, as the chat reader does.
- [ ] Make the agent tools in `crates/cnd-tools/` skip an entry with an
      unknown agent.
- [ ] Send the app version of OpenCode decision 5 E from the web app, the
      Mac app, the event socket, and the agent tools.
- [ ] Test each reader with an unknown agent.

## Milestone 5: Wire types and stored data

Depends on: 4

- [ ] Add `opencode` to `Agent`, `RunnerLoginKind`, and `SkillLists` in
      `crates/cnd-runner-interface/`. Regenerate `src/shared/generated/`.
- [ ] Add a D1 migration that rebuilds the tables of OpenCode decision 3
      to allow `opencode`. The previous Worker must keep working on the new
      schema.
- [ ] Make `runnerSupportsLogin` refuse an OpenCode login on a runner that
      does not advertise it. Send OpenCode commands only to such a runner.
- [ ] Make the Worker leave OpenCode values out of replies and events for
      clients older than the first version that reads them, as OpenCode
      decision 5 E chooses. Add the table of those first versions.

## Milestone 6: OpenCode logins and the gateway

Depends on: 5

- [ ] Save, read, and remove OpenCode logins, as OpenCode decisions 2 and
      3 choose.
- [ ] Read the model list of an OpenCode endpoint. Check the 1 MiB read
      limit against large lists, such as OpenRouter's.
- [ ] Add the `/v1/model/opencode` base, its routes, and its turn tokens.
- [ ] Apply the share setting and the default login rules to OpenCode.
- [ ] Test the routes, the refusals, and the login access.

## Milestone 7: The OpenCode adapter in the runner

Depends on: 3, 5, 6

- [ ] Add `runner/sdk-helper/src/providers/opencode.ts` and its event
      mapping to the app's event types.
- [ ] Add steering, Stop, resume, instructions, MCP tools, skills, and
      secrets.
- [ ] Add the end of a turn with subagents, as OpenCode decision 8 chooses.
- [ ] Deliver the program as OpenCode decision 7 chooses.
- [ ] Advertise the OpenCode login kinds in `hello.loginKinds`.
- [ ] Test the adapter with a fake OpenCode server.

## Milestone 8: OpenCode in the app

Tags: ui

Depends on: 1, 6

- [ ] Build the account page and Agents tab changes from the mockups.
- [ ] Build the pickers, the mark, the session tab, New workspace, and the
      automation editor changes from the mockups.

## Milestone 9: Launch

Depends on: 7, 8

- [ ] Add the OpenCode models to `CONDUCTIVE_MODELS` in `wrangler.jsonc`,
      as OpenCode decision 4 chooses.
- [ ] Run the live check of the runner with a real OpenCode endpoint.

## Milestone 10: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, the complete gate, and the Rust checks named
      in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      the follow-up items that the change adds, and each breaking change.

## Post-merge follow-up (non-blocking)

- [ ] Run an OpenCode turn on the production deployment with a real
      OpenCode Console key.
