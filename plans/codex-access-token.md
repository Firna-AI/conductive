# Codex access tokens

Status: Active. [PR #177](https://github.com/Firna-AI/remote-code/pull/177) is open, as a draft stacked on `conductor/model-gateway-worker-model-proxy-decision-120`. The pull request that completes the work deletes this plan, as the `plans` skill says.

Members who pay for ChatGPT cannot run Codex on their plan in Conductive.
Codex takes only an OpenAI API key today. This change adds a Codex access
token as a second Codex login kind, beside the API key. A member of a
ChatGPT Business or Enterprise workspace makes the token in ChatGPT's admin
console and pastes it on the account page, as a Claude member pastes a
subscription token. The runner gives the token to the Codex app server for
each turn.

The user chose option A of decision 170 on 9 November 2026, after the
options check: the access token only. No plan covers Sign in with ChatGPT,
which can reach Plus and Pro plans. The user has applied to OpenAI for it.
A new Codex access token is not shared with other members, and one typed
function gives the share default of each login kind, as the user chose for
decision 171 on the same day. Milestone 4 is blocked by decision 172: the
only token route of the pinned Codex passes the token to processes that
Codex starts.

On 10 November 2026 the user asked to stack this branch on Conductor
workspace 400, the Worker model proxy of decision 120 on branch
`conductor/model-gateway-worker-model-proxy-decision-120`, with its plan
`plans/model-gateway.md`. This branch merged that branch on the same day.
The plan reads the request as option D of decision 172. Decision 173 asks
how the gateway runs Codex on an access token.

Related work: the plan `plans/own-endpoint-logins.md` on branch
`calummoore/cli-proxy-setup` adds an own endpoint login to the same connect
forms, contracts, table, and runner. Whichever branch merges second keeps
the kinds of both, and builds its migration on the schema of the other.

Contract owners:

- [Access and security](../docs/protocol/access-and-security.md), the
  sections "Agent logins in a sandbox" and "Agent logins".
- [Agent logins](../runner/agent-logins.md) of the agent runner.
- The [app API README](../worker/app-api/README.md).
- The [orgs and logins notes](../docs/mockups/orgs-and-logins.md) of the
  mockups.

## Terms

- **Agent login:** the secret that a member connects, so that agents run on that member's account. The app stores it encrypted in the table `agent_logins`.
- **Codex access token:** a token from ChatGPT's admin console with which Codex runs on a Business or Enterprise workspace. A personal token represents its maker, and a service-account token represents a service account.
- **Sign in with ChatGPT:** OpenAI's sign-in for other apps. An app that OpenAI admits can run model requests on the user's ChatGPT plan.
- **Codex app server:** the Codex program that the agent runner starts in the cloud computer for each turn.
- **Share setting:** the switch of each connected login on the account page. It says whether other members' messages can run on that login.

## Decisions

### 170. How Codex runs on a ChatGPT plan

Added on 9 November 2026 from the user's request "open ai should support
providing a subscription token". The user saw it as item 1 of the
brainstorm. The options check of 9 November 2026 added options D and E,
changed the effort grades from Medium to Large, and updated the left-out
reasons and the previous examples.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/access-and-security.md:349`, `src/shared/account.ts:18`, `runner/src/providers/codex.ts:122`, and `migrations/202611060100_contracts.sql:136`.
- **Background:**
  - Decision 37 recorded the OpenAI waitlist on 5 November 2026. The record does not say that anyone applied to it.
  - OpenAI's [access token page](https://learn.chatgpt.com/docs/enterprise/access-tokens) says that access tokens work only for ChatGPT Business and Enterprise workspaces. A workspace owner must allow them.
  - Each access token expires. The workspace owner sets the longest time, such as 90 days.
  - OpenAI's [Codex sign-in page](https://learn.chatgpt.com/docs/auth) says that these tokens are for "trusted scripts, schedulers, and private CI runners".
  - OpenAI's [client ID page](https://developers.openai.com/siwc/request-client-id) says that Sign in with ChatGPT is "currently offered to a select group of commercial partners". Other apps join a waitlist through an [interest form](https://openai.com/form/sign-in-with-chatgpt-interest/).
  - OpenAI's [plan usage page](https://developers.openai.com/siwc/token-sharing-open-source) gives a self-serve sign-in to open-source and local apps only. It sends paid or remotely hosted apps to the interest form.
  - The pinned Codex 0.167.0 takes an access token only from the variable `CODEX_ACCESS_TOKEN` or from a saved login. Its app server has no login request for it.
  - No OpenAI page allows or forbids a hosted product that stores a member's access token and runs it in its own cloud computers. OpenAI's access token page warns that "shared machines can expose tokens to people outside your workspace".
- **Problem:** Codex cannot run on a ChatGPT plan in Conductive. Within OpenAI's rules, only Business and Enterprise members can get a token today. Plus and Pro plans need OpenAI to admit Conductive first.
- **Impact if no action:** Members who pay for ChatGPT must also pay for OpenAI API use to run Codex. Members with only a ChatGPT plan cannot use Codex.
- **Root question:** How do members run Codex on their ChatGPT plan, within OpenAI's rules?
- **Options:**
  - **A.** Add a Codex access token as a second Codex login kind. Effort: Large.
    - The Codex form gets the same switch as Claude: access token or API key.
    - The runner gives the token to the Codex app server in `CODEX_ACCESS_TOKEN`. A check must prove that no tool process gets it.
    - A database migration removes the rule that lets Codex store only an API key.
    - Cost: only Business and Enterprise members can make a token. A member pastes a new token when the old one expires.
    - Risk: other members of a session spend the token of its starter, as with Claude today (decision 105).
    - Risk: the live check needs a real token from a Business or Enterprise workspace. Only the user can give one.
  - **B.** A, and apply through OpenAI's interest form now. Build Sign in with ChatGPT in its own plan after OpenAI admits Conductive. Only the user can send the application. Effort: Large.
  - **C.** Sign in with ChatGPT only, with no access token. Effort: Large.
    - Apply now. After OpenAI admits Conductive, a button on the account page connects any ChatGPT plan.
    - The Worker keeps the refresh token, renews the access token, and gives each turn a fresh one.
    - Cost: nothing ships until OpenAI answers, and no date is known.
  - **D.** Added by the options check. B, and ask OpenAI in writing whether a hosted product may store members' access tokens and run them in its cloud computers. Use the contact of the interest form application. Ship the token kind now, and state the open question as a risk in the protocol doc until OpenAI answers. Risk: if OpenAI says no, the kind comes out, and members lose their connected tokens. Effort: Large.
  - **E.** Added by the options check. B, but the token never enters the cloud computer. The token kind ships with the Codex part of the Worker model proxy of decision 120. The sandbox gets a turn token, and the Worker adds the real token. Cost: members wait for a large proxy that the user scheduled for later. Risk: nobody has checked the hosts and the headers of the token route, and Codex also sends a metadata request for the token. Effort: Large.
- **Left out:**
  - The login file that `codex login` writes: it breaks decision 37. OpenAI sends hosted apps to its waitlist, and says to treat that file like a password and not to share it. Its refresh token works only once: the pinned Codex holds the error "your refresh token was already used". So the first renewal in one cloud computer breaks the stored copy.
  - A device-code sign-in inside each cloud computer: decision 24 rejected it, because each workspace would need its own sign-in. The protocol also rejects a login that stays on the disk of one sandbox.
  - ChatGPT API credits on an API key: OpenAI's [credits page](https://developers.openai.com/api/docs/guides/chatgpt-api-credits) says that "Codex usage through API keys is not supported by this benefit."
  - The operator's own Business token for all members: decision 24 gives each member their own account. Section 3.1 of the OpenAI Services Agreement also says "Customer will not share Account access credentials or individual login credentials between multiple users."
  - One company login for the whole org, such as a service account: it breaks decision 24. A member can still connect a service-account token as their own login under A.
  - Boat's credential proxy with a ChatGPT sign-in: decision 24 found that Boat's API cannot start a sign-in for an end user.
  - OpenAI's own Codex products run the turns, such as Codex cloud: it fails the goal, because the turns then run outside the chat of Conductive and its session rules.
  - Change nothing: it fails the goal.
- **Wider fix:** None. Decision 37 already requires logins that the providers allow, and D applies that rule.
- **Previous examples:** Decisions 24 and 37 in `plans/boat-native-remote-workspaces.md` chose an OpenAI API key for Codex. For Claude, the operator got Anthropic's permission for subscription tokens (decision 37). OpenAI's [Sign in with ChatGPT page](https://learn.chatgpt.com/docs/sign-in-with-chatgpt) lists apps with ChatGPT plan usage, such as Amp Code, Conductor, Devin, and Warp.
- **Recommendation:** D. It keeps the user's choice B, and at small extra cost it closes the gap between "within OpenAI's rules" and what OpenAI's pages say, as Anthropic's permission did for Claude. The plan first recommended B. E is safer, but it waits for a large proxy.
- **Action:** ask the user, because B changes decision 37 and the protocol rule for Codex logins, and no recorded decision covers that change.
- **Chosen by the user on 9 November 2026:** B. The user had already applied through OpenAI's interest form. The options check ran after this answer. The user's answer to D and E is open.
- **Changed by the user on 9 November 2026, after the options check:** A. The change adds the access token only. No plan covers Sign in with ChatGPT, and nobody asks OpenAI about hosted use of the tokens.
- **Note of 9 November 2026:** the merge of PR #72 added the share setting of decision 116 to `main` after the brainstorm. So the risk of option A applies only while the owner shares the token. Decision 171 sets the default of that setting for this kind.

### 171. Who may use a Codex access token by default

Added on 9 November 2026 while this plan was written. The options check of
9 November 2026 added options C, D, and E, a stronger reason, and C as the
wider fix.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/app-api/account-data.ts:84`, `src/app/dev/account-routes.ts:55`, and the share setting rules in `docs/protocol/access-and-security.md:206`.
- **Background:**
  - Each session runs on the login of its starter. Decision 116 gave each login a share setting, which the owner can change at any time.
  - The kind of a login sets the default of its share setting. A new Claude subscription token is not shared, because Anthropic's terms forbid sharing a Claude account. A new API key is shared, because its owner may let a team use it.
  - One share value covers a login in every org of its owner, because one login serves all of the owner's orgs (decision 21).
  - OpenAI's [access token page](https://learn.chatgpt.com/docs/enterprise/access-tokens) says that a personal token "represents the ChatGPT workspace user who created it". Runs on it carry that person's permissions and show in the workspace records.
  - OpenAI's [service accounts page](https://learn.chatgpt.com/docs/enterprise/service-accounts) says that a service-account token "represents the service account, not the person who creates it". OpenAI meant it for a CI runner, a scheduled job, or a "shared integration".
  - Section 3.1 of the [OpenAI Services Agreement](https://cdn.openai.com/osa/openai-services-agreement.pdf) says "Customer will not share Account access credentials or individual login credentials between multiple users." Section 3.2 says that an End User Account is "used by, a single End User". Nobody has confirmed that this agreement governs ChatGPT Business.
  - The code sets the default from the stored kind only: `kind === 'token'` gives "not shared" in the Worker and in the dev backend. Every other stored kind gets "shared".
- **Problem:** No requirement sets the share default of a Codex access token.
- **Impact if no action:** The default follows the stored kind by chance, with no requirement behind it. A later change of the stored kind can share the token of each member without a review.
- **Root question:** Who may run turns on a member's Codex access token when the member connects it?
- **Options:**
  - **A.** Not shared, as a Claude subscription token. The owner can share it on the account page. Effort: Small.
  - **B.** Shared, as an API key. The owner can stop the share on the account page. Effort: Small.
  - **C.** Added by the options check. A, and one typed function that gives the share default for each agent and kind. The Worker and the dev backend both call it, so a new kind fails the typecheck until it has a default. Effort: Small.
  - **D.** Added by the options check. The connect form asks the owner of an access token whether other members may use it, with no answer selected. Cost: one more required step for this kind, a mockup state, the request type, the Worker save, tests, and one protocol line. Effort: Medium.
  - **E.** Added by the options check. Share by org: the owner chooses the orgs whose members may use the login, and a new login is shared in no org. Cost: it changes decisions 116 and 21 for every kind, with a migration, the account page, mockups, the Worker checks, and protocol changes. Effort: Large.
- **Left out:** A token that the owner can never share: it breaks decision 116, which lets the owner change the share setting of each login. Bring it back if OpenAI forbids the share in its answer under option D of decision 170.
- **Wider fix:** C. Today the code treats every stored kind except `token` as shared, so each new kind needs its own default.
- **Previous examples:** Decision 116 B of 7 November 2026 set the defaults of a Claude subscription token and an API key.
- **Recommendation:** C. It gives the default of A, which OpenAI's agreement and the personal nature of a token support, and its type makes each new kind state its default. The plan and the options check first recommended A.
- **Action:** ask the user, because it adds a share default that no requirement covers.
- **Chosen by the user on 9 November 2026:** C.

### 172. How Codex gets an access token without passing it on

Added on 9 November 2026 from the blocked Milestone 4. The options check of
9 November 2026 widened the root question, added options F, G, and H,
corrected the risks of A, C, D, and E, and kept the recommendation D.

- **Severity:** High. **Effort:** Large.
- **Source:** Implementation.
- **Category:** Security.
- **Location:** `runner/src/providers/codex.ts:122` and the section "Agent logins in a sandbox" of `docs/protocol/access-and-security.md`.
- **Background:**
  - Decision 114 requires that no process that the agent starts inherits the login of its turn, and that the agent program writes no copy of the login to disk.
  - The pinned Codex 0.167.0 reads an access token only from the variable `CODEX_ACCESS_TOKEN` or from a saved login. Its app server has no login request for a token. 0.167.0 is the latest release on 9 November 2026.
  - Milestone 4 ran the pinned app server with a fake token against a local fake OpenAI server, and traced each program start with `strace`. 37 program starts carried `CODEX_ACCESS_TOKEN`: Git commands, `getconf`, and the shell snapshot of Codex, which runs a login shell of the sandbox user with its profile scripts. The runner had set the shell rule that removes the variable.
  - The shell command of the model and both MCP servers got no token. No file under the agent home held the token after the turn.
  - Codex already removes a list of secret variables before it starts its Git helpers, its shell snapshot, and its hooks. `CODEX_ACCESS_TOKEN` is not on that list.
  - The provider setting `experimental_bearer_token`, sent on standard input, keeps the token out of every environment. But Codex then skips the metadata, workspace policy, and routing requests of the token, and sends no `chatgpt-account-id` header.
  - With the token in the environment of the app server, a tool command such as `ps e` can print it without sudo, and Codex saves tool output in its session files on disk.
  - The evidence is in `.context/codex-access-token/runner/report.md`, and the check is in `.context/codex-access-token/options-check-172-report.md`.
- **Problem:** The only route of the pinned Codex that keeps the access token mode passes the token to processes that Codex starts. That breaks decision 114.
- **Impact if no action:** A Codex token cannot run a turn, so this branch cannot merge.
- **Root question:** How does Codex run a turn on a member's access token, under the workspace policy, with no copy in a child process or on disk?
- **Options:**
  - **A.** Accept the inheritance for this kind. Use the variable route, and narrow decision 114 for the helper processes of Codex. State the risk in the protocol doc. Effort: Small. Risk: a program that a profile script, a Git command, or a Git filter such as the Git LFS filter starts during the turn can keep the token after it. A tool command can print the token from the environment of the app server, and Codex then saves it in its session files.
  - **B.** Hold the token kind until Codex takes the token privately. Ask OpenAI for an app server login request for access tokens, and keep this branch unmerged until a Codex release has one. Effort: Small now. Cost: no token for members until then, with no known date, and the branch drifts from `main`.
  - **C.** A placeholder for each turn and a relay in the runner. Codex gets a random placeholder in `CODEX_ACCESS_TOKEN`. It reaches OpenAI through a relay that the runner serves on the loopback of the sandbox, set as its HTTPS proxy, with a local certificate authority. The relay puts in the real token, and works only while the turn runs. Processes inherit only the placeholder, which stops working when the turn ends. Effort: Large. Risk: the real token stays in the memory of the runner, as today. Each Codex update needs a check of the requests that Codex sends with the token.
  - **D.** The Codex part of the Worker model proxy of decision 120, now. As C, but the relay forwards to a Worker route that puts in the real token, so the real token never enters the sandbox. Effort: Large. Cost: the model traffic of token turns passes through the servers of the app, so the privacy page changes. Risk: the route must cover each OpenAI host that Codex calls with the token, also after workspace routing. Cloudflare's limits for long streams are unchecked.
  - **E.** Our own build of Codex that reads the variable once, keeps the token in memory, and clears it from its environment and from its process memory of the environment. Effort: Large. Risk: each Codex release needs our patch, a new build, and a check, and every image runs our build of a program of another company.
  - **F.** Ask OpenAI in an issue to add `CODEX_ACCESS_TOKEN` to the list of variables that Codex removes before it starts its helpers, or to read it once and remove it. Hold the kind until a release has the fix, then use the variable route with the shell rule. Effort: Small now, and Medium after the release. Cost: no date is known, and OpenAI accepts no outside pull requests. Risk: the token still sits in the environment of the app server, where a tool command can print it.
  - **G.** A, with the shell snapshot of Codex off for token turns. Then no login shell and no profile script runs with the token, and decision 114 narrows only for the Git commands of Codex and `getconf`. Effort: Small. Risk: a Git filter still gets the token, and a tool command can still print it from the environment of the app server. Cost: each login-shell tool command runs the profile scripts again.
  - **H.** Wrappers that remove the variable before each helper starts. The runner puts `git` and `getconf` wrappers first on the `PATH` of the app server, and the image sets the login shell of the sandbox user to a `bash` wrapper. Effort: Medium. Cost: it must know each helper, so a new helper in a later Codex release gets past it, and each update needs the trace check again. Risk: the token still sits in the environment of the app server.
- **Left out:**
  - The provider setting `experimental_bearer_token`: Codex then skips the metadata, workspace policy, and routing requests of the token, so the settings of the workspace admin and its data routing would not apply.
  - The login request `chatgptAuthTokens` of the app server: OpenAI marks it "FOR OPENAI INTERNAL USE ONLY - DO NOT USE", which breaks decision 37. It also takes a ChatGPT sign-in token, not an access token.
  - A saved login of `codex login --with-access-token`: it writes the token to disk, which decision 114 forbids.
  - A login file with no disk copy, such as a pipe at the path of the login file: Codex reads the login again at each reload, and a pipe gives no data the second time, so it fails the goal.
  - Drop the token kind for good: it fails the goal.
- **Wider fix:** D. It keeps the Codex token out of the sandbox whatever helper a later Codex release adds, and the same route can later take the other login kinds of decision 120.
- **Previous examples:** Option C of decision 114 moved the Claude login to a private pipe and the Codex API key to a private login request. The Claude program removes its descriptor variable after it reads it.
- **Recommendation:** D. It keeps decision 114, and it builds a part of the proxy that decision 120 already chose, so no work is lost. The issue of F costs little and can go to OpenAI as well.
- **Action:** ask the user, because each option changes decision 114, waits for OpenAI, or adds a large build, and no option is clearly best.
- **Chosen by the user on 10 November 2026:** the user asked to stack this branch on Conductor workspace 400, which builds the Worker model proxy. The plan reads that request as D.

### 173. How the gateway runs Codex on an access token

Added on 10 November 2026, after this branch merged the gateway branch.
The options check of the same day widened the root question, added options
D to G, corrected option B, and kept the recommendation B.

- **Severity:** High. **Effort:** Large.
- **Source:** Implementation.
- **Category:** Security.
- **Location:** the Codex route in `worker/model-gateway/route.ts`, `worker/model-gateway/paths.ts`, `worker/model-gateway/headers.ts`, `worker/model-gateway/token.ts`, `parseCredential` in `runner/src/commands.ts`, `runner/src/providers/codex.ts`, and `docs/protocol/model-gateway.md`.
- **Terms:**
  - **Gateway:** the Worker route of the plan `plans/model-gateway.md`. It checks the turn token of a turn, adds the real login, and forwards each model request to Anthropic or OpenAI.
  - **Token mode:** the way that Codex works with `CODEX_ACCESS_TOKEN`. It asks OpenAI who owns the token, loads the workspace rules, the routing, and the model list, and sends model requests to the ChatGPT Codex backend.
  - **Rule bundle:** the Codex rules that a ChatGPT workspace admin sets. Codex loads them in the token mode, from `/backend-api/wham/config/bundle`.
- **Background:**
  - The gateway gives Codex the turn token in its login request and the gateway address as its base URL. It forwards only `POST /responses` to `https://api.openai.com/v1`, with the real OpenAI API key. `docs/protocol/model-gateway.md` requires that neither the address nor the turn token is in the environment of Codex.
  - An access token does not work on that API. In the token mode, Codex calls `https://auth.openai.com/api/accounts/v1/user-auth-credential/whoami`, reads the rule bundle, the account routing, and the model list, and sends zstd-compressed model requests to `https://chatgpt.com/backend-api/codex/responses` with the token and a `chatgpt-account-id` header. It tries a WebSocket first. Milestone 4 recorded these requests with a fake token that starts with `at-`.
  - Codex reads the whoami address only from the variable `CODEX_AUTHAPI_BASE_URL`. It treats a token that does not start with `at-` as an Agent Identity token, which signs each request with its own key. Nobody has seen a real token, so its shape is unchecked.
  - The rule bundle can enforce the approval policy, the sandbox mode, the allowed MCP servers, and managed hooks. Codex runs managed hooks with no trust step. When a rule forbids the approval policy `never`, Codex asks for approvals, and the runner refuses each one.
  - Today the runner refuses a Codex credential of the kind `token` with "The turn credential type is not supported.". It then closes its connection, and the Worker sends the turn again, as decision 174 says.
  - OpenAI confirmed to the operator on 9 November 2026 that the gateway can carry OpenAI API keys. Nobody asked OpenAI about access tokens, and decision 170 A asks nobody.
  - The evidence and the check are in `.context/codex-access-token/runner/report.md` and `.context/codex-access-token/options-check-173-report.md`.
- **Problem:** The gateway has no route for a Codex access token.
- **Impact if no action:** A member who connects a Codex access token cannot run a turn.
- **Root question:** How does a turn on the gateway run Codex on a member's access token, with the real token only in the Worker, and with a defined result for each Codex rule of the member's ChatGPT workspace?
- **Options:**
  - **A.** The gateway runs the token mode itself. Codex in the sandbox stays in its API key mode with the turn token. The gateway reads the workspace of the token with the whoami request, follows the routing, and forwards each model request to the ChatGPT Codex backend with the token and its `chatgpt-account-id`. Effort: Medium. Risk: no workspace rule applies, and the Worker becomes a client of the ChatGPT backend, which OpenAI's token page does not describe. Only a real token can show what the backend expects.
  - **B.** Codex runs its own token mode through the gateway. Codex gets a turn token that starts with `at-` as `CODEX_ACCESS_TOKEN`, and the gateway address in `CODEX_AUTHAPI_BASE_URL`. Its requests reach the gateway through gateway addresses in its settings, or through a relay in the runner. The gateway adds the routes of the token mode, passes the ChatGPT headers that the backend needs, follows or rewrites the routing, and accepts or turns off the zstd bodies. Effort: Large. Cost: the turn token and the gateway address are in the environment of Codex and of its helpers while the turn runs, which changes a rule of `docs/protocol/model-gateway.md`. The email, the account ID, and the workspace name of the token owner reach the sandbox. Risk: the managed hooks and MCP commands of the ChatGPT admin run in the sandbox of the org. Risk: a relay needs a local certificate authority, which the gateway doc gives as a reason against an HTTPS proxy. Risk: an Agent Identity token makes the gateway sign each request.
  - **C.** A, and the gateway also reads the rule bundle, and refuses a token turn when a rule forbids the settings of the runner. Effort: Large. Risk: the gateway must read the rule format of Codex, which can change with each release.
  - **D.** A, and the gateway fails a token turn when the workspace has any Codex rule, without reading the rule format. Effort: Medium. Cost: members of a workspace with Codex rules cannot run token turns. The other risks of A stay.
  - **E.** B, but the turn token goes into a login file of Codex in a private Codex home for each session, removed at the end of the turn, not into its environment. Effort: Large. Cost: the gateway address still goes into the environment. Risk: Codex reads the login file again at each reload, and a rule that forces another credential store makes Codex ignore the file.
  - **F.** B, and a guard in the gateway. The gateway reads the rule bundle, and fails the turn when a rule is not on its fixed list of safe rules, such as a hook, an MCP server, a plugin, or another base address. Codex applies the safe rules. Effort: Large. Cost: a TOML parser, a list that needs a check at each Codex update, and no token turns for workspaces that use hooks, MCP servers, or plugins.
  - **G.** A, and Codex applies the workspace rules from local files while it stays in its API key mode. The runner writes the rule bundle to `/etc/codex/requirements.toml` and `/etc/codex/managed_config.toml` in a private mount for each app server. Effort: Large. Risk: it must remove the login and provider rules, which reads the rule format, and the admin's hooks still run in the sandbox.
- **Left out:**
  - The real access token in the sandbox: decision 172 chose the gateway to keep it out.
  - Hold the token kind until OpenAI changes Codex: it fails the goal, because no Codex release has a login request for an access token, and no date is known.
  - OpenAI's workload identity sign-in: it is another login kind than the one that decision 170 chose.
  - A route that forwards every path of the ChatGPT backend: it breaks the fixed route list of `docs/protocol/model-gateway.md`.
  - A turn token in the Agent Identity shape: Codex still needs gateway addresses in its environment, and the gateway must sign tokens, so B is better on every point.
  - A redirect of the OpenAI hosts in the image, with a system certificate authority: every process of the sandbox would then send its own ChatGPT traffic through the Worker.
- **Wider fix:** B. Codex itself applies the token mode and the workspace rules. Of its two transports, the relay survives the routing and a pinned base address with no rewrite.
- **Previous examples:** Gateway decision 11 K of 10 November 2026 moved the turn token of Claude from a private descriptor into a file that each process can read while the turn runs.
- **Recommendation:** B. Codex then uses the access token as OpenAI documents for app-server automation, and it applies the rules of the workspace, while the real token stays in the Worker. F best protects the sandbox of the org, because B lets the hooks and MCP commands of the ChatGPT admin run there.
- **Action:** ask the user, because A skips the workspace policy, B changes a requirement of the gateway, and no option is clearly best.

### 174. What a token turn does when the runner cannot run it

Added on 10 November 2026 from the options check of decision 173. Its own
options check of the same day widened the root question, found that a
refused turn loops, corrected options A to C, added options D to F, and
changed the recommendation from A to D.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Security.
- **Location:** `worker/chat/runner-delivery.ts:143` and `:208`, `parseCredential` in `runner/src/commands.ts`, `runner/src/socket.ts:34`, `worker/chat/runner-channel.ts:79`, and the version pins in `docs/protocol/isolation.md`.
- **Background:**
  - A runner of protocol version 1 runs in a cloud computer from an older org image. Gateway decision 2 A sends it the real agent login of every kind, in the `turn` and the `message` commands. A runner of version 2 gets a turn token.
  - Gateway decision 2 A came before the Codex access token kind.
  - No runner accepts a Codex credential of the kind `token` yet. A version 1 runner never will, because only a new image changes it. A workspace keeps the runner of the image that it started from.
  - A runner closes its connection when it cannot read a command, and it connects again after 1 second. The Worker then sends the same command again. So a token turn loops about once a second, keeps the cloud computer awake, and sends the real token to a version 1 runner each time, until a member presses Stop.
  - The evidence is in `.context/codex-access-token/options-check-174-report.md`.
- **Problem:** The Worker sends a turn to a runner that cannot run its login kind, and the turn loops instead of failing.
- **Impact if no action:** The real token reaches older sandboxes again and again, the cloud computer stays awake, and the member gets no cause.
- **Root question:** What does a turn do when the connected runner cannot run its login kind, so that the sandbox gets no login for it and the member learns what to do?
- **Options:**
  - **A.** The Worker refuses each version 1 command that would carry a Codex access token, the `turn` and the `message`. It ends the turn with a cause that names two ways out: a new workspace after an admin builds the org image, or an OpenAI API key. The Milestone 3 test that expects the real token in a version 1 turn changes. Effort: Small.
  - **B.** The Worker keeps the turn waiting until a runner of version 2 connects. Effort: Medium. Cost: no newer runner ever connects to an existing workspace, so the turn and its later messages wait with no end.
  - **C.** Change nothing. Effort: Small. Risk: the turn loops, and the real token reaches older sandboxes about once a second until Stop.
  - **D.** One typed rule that lists the login kinds that each runner protocol version can run. The Worker checks it before it builds each command that carries a credential, and ends a turn that the runner cannot run with the cause of A. The version 1 command type takes only the kinds that a version 1 runner reads, so a later kind fails the typecheck until it states its result. Until the runner change of decision 173, each token turn fails with that cause instead of looping. Effort: Medium. Cost: the internal command type splits from the version 1 wire type.
  - **E.** A, and a notice before the send. When the version pin of the workspace is 1 and the login of the starter is a Codex access token, the composer says so, and the workspace refuses the message with its own error. Effort: Medium. Cost: a session record field, a composer notice with a mockup state, protocol lines, and tests.
  - **F.** A, and an update of the runner at each start, as option A of `plans/follow-ups/runner-update-at-start.md` says. A token turn can then run in an existing workspace after its next start. Effort: Large. Cost: it changes the rule that a stop and a resume keep the version pin, which that follow-up item asks the user about.
- **Left out:**
  - A turn token for a version 1 runner: a version 1 runner sends its credential to OpenAI, which refuses a turn token.
  - Refuse every version 1 runner: it breaks gateway decision 2 A.
  - A check when the member saves the login: one login serves every org of its owner (decision 21), so the save cannot know which cloud computer runs a later turn.
  - The runner fails the turn instead of closing its connection: no change reaches the runner of an older image.
- **Wider fix:** D. It covers each turn whose login kind the connected runner cannot run, also the version 2 runners from before decision 173 and the own endpoint login of `plans/own-endpoint-logins.md`.
- **Previous examples:** The design call of 9 November 2026 in `plans/follow-ups/own-endpoints-through-model-gateway.md` gives the own endpoint login the path for an unusable login before dispatch on version 1. The secret-value filter sits in the Durable Object because an older runner has none.
- **Recommendation:** D. It gives the result of A for the Codex token, and it also covers the `message` command, the earlier version 2 runners, and the own endpoint login, at a small extra cost in code that this branch already changes. The plan first recommended A, which stays the direct fix.
- **Action:** ask the user, because it adds a new rejection of a turn.

## Design

These are the agent's calls of 9 November 2026. Each gives its reason.

- The Codex access token uses the stored kind `token`, as the Claude
  subscription token does. One switch and one storage rule then serve both
  agents. Only the labels and the help texts differ by agent.
- The switch and the account row name the kind "Access token", and the
  field names it "Codex access token". These are OpenAI's names, so members
  find the token in ChatGPT's admin console.
- The help text says to paste an access token from a ChatGPT Business or
  Enterprise workspace, with the Codex scope. It says that the owner of
  that workspace must allow access tokens and local Codex use, and links
  to `https://chatgpt.com/admin/access-tokens`. Reason: a Plus or Pro
  member cannot make a token, and must learn that before a failed turn.
  The text leaves out the token types and the expiry, because ChatGPT's
  own dialog asks for them. This call changed on 9 November 2026, from
  item 2 of the mockup report.
- The Codex form lists "API key" first and selects it. "Access token" comes
  second. Reason: most members have an API key, and a token needs a
  Business or Enterprise workspace.
- The next four calls about the runner route date from before decision
  172. Decision 172 D replaced them: the real token stays in the Worker,
  and decision 173 decides the route.
- The runner keeps the token out of every environment when the pinned Codex
  allows it. Milestone 4 first tries the provider setting
  `experimental_bearer_token`, sent in the `config` of `thread/start` and
  `thread/resume` on standard input. Reason: `runner/agent-logins.md`
  keeps every login out of the environment of the agent program today.
- When Codex does not accept the token on that route, the runner gives it
  only to the Codex app server, in `CODEX_ACCESS_TOKEN`. The runner then
  also sets the shell environment rule of Codex that removes that variable
  from shell commands. Reason: the pinned Codex 0.167.0 has no login
  request for an access token. OpenAI's pages name the variable for
  temporary runners, and say that it writes no credential to disk.
- The credential store of Codex stays `ephemeral`.
- When a process that the agent starts gets the token, or Codex writes a
  credential to disk, the work stops and the user decides. Reason:
  decision 114 forbids both.
- For the token kind, the runner uses the model provider settings that the
  pinned Codex needs for a ChatGPT workspace sign-in. The current provider
  sends requests to `https://api.openai.com/v1`, which takes API keys.
  Milestone 4 finds the settings, and the live check confirms them.
- The app shows no expiry date. An expired or revoked token fails its turn
  with the error of the agent, as an expired Claude token does today.
  Reason: the app stores no expiry, and the token text does not hold it.
- The protocol doc passes its length target of about 250 lines. This
  change does not split it, because `plans/follow-ups/protocol-docs-split.md`
  splits it after the open branches merge.
- No follow-up item records Sign in with ChatGPT, because option A of
  decision 170 leaves it out.
- The Terms page names the share default of a Codex access token, with a
  draft field that asks whether OpenAI's terms allow the share, and the
  change sets a new Terms revision. Reason: `src/marketing/README.md`
  updates each legal sentence that repeats a changed protocol fact, and
  commit `a263151` set a new revision for the same sentence. The project
  is not in production, so a new agreement at the next sign-in costs
  little. This call is of 9 November 2026, from the report of
  Milestone 2.
- The protocol doc adds no separate line that a shared Codex access token
  stays a risk. The reason line of the share defaults and the risk of a
  personal token already say it.

Risks:

- A conversation that started on an API key resumes on a token, or the
  reverse, when its starter changes the Codex login kind. The two kinds can
  use different OpenAI hosts. The live check tests a resume after a change
  of kind.
- A model in the model list of a deployment can be missing from a ChatGPT
  plan. The live check runs one turn with each Codex model of the deployed
  app.
- The open issue openai/codex#25246 reports 401 failures of Business
  access tokens from May to July 2026. The live check shows whether a token
  works with the pinned Codex.
- A ChatGPT workspace admin can enforce Codex settings, such as the
  approval policy, the sandbox mode, the allowed MCP servers, and hooks.
  Such settings can refuse the settings of the runner, which runs with no
  approvals, full access, and its own MCP servers. Nobody has checked
  whether a token run gets these settings. The live check records what a
  token run gets.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The account page shows the Codex form with its switch, the access token
field with its help text and link, and a Codex login connected with an
access token. The account page already rendered five screens, so it now
renders only its canonical screen, and its states moved to child pages. A
new access token starts not shared, as decision 171 says. The screenshots
are in `.context/codex-access-token/mockups/`.

- [x] Add the per-agent kind labels and the page
      `https://chatgpt.com/admin/access-tokens` to
      `docs/mockups/src/fixtures/logins.ts`.
- [x] Give Codex the switch in
      `docs/mockups/src/components/settings/AgentConnectForm.tsx`, with
      "API key" first and selected. Add the access token field, its help
      text, and its link.
- [x] Show the per-agent kind label in the login rows of
      `docs/mockups/src/components/settings/AccountSections.tsx`.
- [x] Move the states of `app/account` to child pages, so that no page
      renders more than five screens: `setup`, `connect`, `codex-token`, and
      `share-not-saved`. The `connect` page shows Claude with a subscription
      token, Claude with an API key, Codex with an API key, and Codex with
      an access token.
- [x] Add a screen with Codex connected by an access token,
      `app/account/codex-token`. Its share switch shows the default of
      decision 171.
- [x] Remove the claim that the app offers no ChatGPT plan sign-in from the
      account entries. Update the section "Logins" of
      `docs/mockups/orgs-and-logins.md`.
- [x] On a phone, show "Connected" and the kind of a connected agent row on
      a second line, so that the kind name shows in full.
- [x] Add the search word "token" to the Agents command of the palette
      mockup.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages at phone and
      desktop sizes.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol doc states the new login kind, the waitlist of Sign in with
ChatGPT, the share default, and the risks of the token.

- [x] In the section "Agent logins" of
      `docs/protocol/access-and-security.md`, state that a member connects
      Codex with a Codex access token from a ChatGPT Business or Enterprise
      workspace, or with an OpenAI API key (decision 170).
- [x] State that the app offers no Sign in with ChatGPT, because OpenAI
      offers it only to the partners that it admits. Replace the old
      waitlist sentence.
- [x] State the rejected login file of `codex login`, and its reason.
- [x] Add the risks: a token expires, OpenAI meant tokens for trusted
      runners, turns on a personal token show as its owner in the owner's
      ChatGPT workspace, and a workspace admin can enforce Codex settings.
- [x] State in the share setting rules that a new Codex access token is not
      shared (decision 171). Its reason line names Section 3.1 of the
      OpenAI Services Agreement.
- [x] Update "Features" and "What a user needs" in the root `README.md`.
- [x] Add the Codex access token to the live check of
      `plans/follow-ups/agent-login-in-tool-processes.md`. Add
      `CODEX_ACCESS_TOKEN` to its probe variables.
- [x] Add the Codex access token to the logins that the Worker model proxy
      of `plans/follow-ups/agent-logins-readable-in-sandbox.md` must cover.
      Note that the hosts and the metadata request of this kind are
      unchecked.
- [x] Check each relative link of the changed Markdown files.

## Milestone 3: Login contracts and Worker

Depends on: 2

The browser, the Worker, and the runner command accept a Codex login of the
kind `token`. The database stores it.

- [x] Let `SaveAgentLoginRequest` and `AgentLoginStatus` in
      `src/shared/account.ts` and `RunnerLogin` in `src/shared/runner.ts`
      take the kind `token` for Codex.
- [x] Add a migration that rebuilds `agent_logins` without the rule
      `CHECK (agent = 'claude' OR kind = 'api-key')`.
  - [x] Read the `databases` skill first. Check whether the own endpoint
        logins change has merged, and build on the schema of `main`.
  - [x] Keep every row and every column, also `no_reuse`. Keep the other
        rules and the primary key. Check that no table, index, or trigger
        depends on `agent_logins`.
  - [x] Reserve the range `202611090000`–`202611090059` in
        `migrations/README.md`, and describe the migration there.
- [x] Accept the Codex token in `worker/chat/login-kind.ts`, in the login
      save of `worker/app-api/boot.ts`, and in `accountLogins` of
      `worker/app-api/account-data.ts`.
- [x] Add one typed function that gives the share default of each agent
      and login kind, as option C of decision 171 says. A Codex token
      starts not shared. The Worker save in
      `worker/app-api/account-data.ts` and the dev backend in
      `src/app/dev/account-routes.ts` both call it, so a new kind fails the
      typecheck until it has a default.
- [x] Accept the Codex token in `readLogin` of `src/app/api/read-core.ts`
      and in the dev backend `src/app/dev/account-routes.ts`.
- [x] Add Worker tests: a saved Codex token reads back with its kind and
      starts not shared, a change of kind sets the default of the new kind,
      and a turn command carries the kind `token` for Codex.
- [x] Add a test of the migration: a row that the old rule refused now
      saves, and an existing row keeps its values.
- [x] Add a test of `readLogin` for a Codex token.
- [x] Update the login lines of `worker/app-api/README.md` and
      `worker/chat/README.md`.

## Milestone 4: Runner

Depends on: 3

The runner starts Codex on an access token for the turns of the kind
`token`.

Blocked on 9 November 2026 by decision 172. The variable route passes the
token to processes that Codex starts, and the bearer setting skips the
requests of the token mode. The runner holds no change. The evidence is in
`.context/codex-access-token/runner/report.md`. The user chose the gateway
on 10 November 2026, so the open TODOs below wait for decisions 173 and
174, which replace them.

- [x] Find the model provider settings that the pinned Codex needs for an
      access token. Read its protocol schema with
      `codex app-server generate-json-schema`, and its configuration.
- [x] Try the route of `experimental_bearer_token` in the `config` of
      `thread/start` and `thread/resume`. Use it when Codex accepts the
      token on it. Codex skips the requests of the token mode on it.
- [ ] Otherwise, in `runner/src/providers/codex.ts`, start the app server
      for a token with `CODEX_ACCESS_TOKEN` in its environment only. Send no
      login request, and set the shell environment rule of Codex that
      removes `CODEX_ACCESS_TOKEN` from shell commands.
- [ ] Keep the API key route and its provider as they are.
- [ ] Add tests in `runner/src/providers/codex-login.test.ts`: the token
      takes only the chosen route, no login request carries it, and the API
      key route does not change. For the variable route, the token is only
      in the environment of the app server, and the shell rule is set.
- [ ] Check that the output filter hides the token in agent output.
- [ ] Update the opening lines that list the login kinds, and the sections
      "The agent environment" and "Codex", of `runner/agent-logins.md`.
- [ ] Make the token route text of
      `plans/follow-ups/agent-login-in-tool-processes.md` name only the
      chosen route.

## Milestone 5: Connect form

Tags: ui

Depends on: 1, 3

The account page connects Codex with an access token, as Milestone 1 draws
it.

- [x] Give each agent its own kind labels in `src/shell/account/labels.ts`.
- [x] Give Codex the switch, the access token field, the help text, and
      the link in `src/shell/account/AgentConnectForm.tsx`. The save sends
      the chosen kind.
- [x] Show the per-agent kind label in `src/shell/account/AgentList.tsx`.
- [x] Add `styles.agentList` to the agent list and `styles.agentRow` to each
      agent row in `src/shell/account/AgentList.tsx`, so that a phone shows
      the kind on a second line, as the mockup does.
- [x] Add the search word "token" to the Agents command in
      `src/app/palette/commands.ts`, as the palette mockup does.
- [x] Say on the Terms page in `src/marketing/terms.ts` that the share
      setting of a Codex access token starts off, with a draft field that
      asks whether OpenAI's terms let other members use it. Set a new
      `TERMS_VERSION` in `src/shared/terms.ts`, such as
      `2026-11-09-codex-access-token`.
- [x] Add tests: the Codex form selects "API key" first, a token save sends
      the kind `token`, and a Codex row connected by a token shows "Access
      token" and its share switch.
- [x] Smoke-test the account page in `npm run dev` at phone and desktop
      sizes. Save the screenshots under `.context/codex-access-token/`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

The live check proves the token route with the real Codex program. The gate
and the review prove the change.

- [ ] Run the live check with a real Codex access token. It needs a token
      from the user. Run it on a development machine with the pinned Codex
      and the runner's Codex adapter. Keep the token out of every prompt,
      argument, file, and log.
  - [ ] A turn completes on the token with each Codex model in
        `CONDUCTIVE_MODELS` of the deployed app.
  - [ ] No process that the agent starts holds the token in its
        environment: a shell command, each MCP server, and each hook.
  - [ ] After the turn, no file under the agent home folder holds the token
        or another credential.
  - [ ] Record which settings of the runner the token run keeps: the
        approval policy, the sandbox mode, and the MCP servers.
  - [ ] A conversation that started on an API key resumes on the token.
        Record a failure as a finding.
  - [ ] Save the evidence under `.context/codex-access-token/`.
  - [ ] Update the line of
        `plans/follow-ups/agent-login-in-tool-processes.md` that says no
        run has shown the real programs take their routes.
- [ ] Run the targeted tests and `npm run check`, after
      `npm --prefix desktop ci` and `npm ci --prefix runner`.
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
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Run the live check of
      `plans/follow-ups/agent-login-in-tool-processes.md` in a real sandbox
      with a Codex access token.
