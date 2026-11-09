# Agent tools inherit the gateway address

- **Severity:** High. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from gateway decision 11 of the model gateway plan, on branch `conductor/model-gateway-worker-model-proxy-decision-120`.
- **Location:** `runner/src/providers/claude.ts:60` and `:71`, `providerEnvironment` in `runner/src/providers/environment.ts:16`, and the section "No login in the sandbox" of `docs/protocol/model-gateway.md`.
- **Reason:** The recommended option changes how some tools behave compared with `main`, and the user has not approved that change.

- **Terms:**
  - **Gateway:** the Worker routes on `api.conductive.build` that take the model requests of the agent programs. They add the real agent login and forward each request to Anthropic or OpenAI.
  - **Turn token:** a temporary credential that lets one running turn use the saved login through the gateway. It works only while its turn runs.
  - **Child process:** a command, server, or helper that the Claude program starts in the workspace.
  - **Flag settings:** the settings that the runner gives the Claude program through the Claude Agent SDK. They win over the repository's `.claude/settings.json`.
  - **Shell prefix:** a program, set by `CLAUDE_CODE_SHELL_PREFIX`, that the Claude program starts in front of some commands, hooks, and tool servers.
- **Background:**
  - Conductive runs agents powered by Claude and Codex in a cloud computer for each workspace. Its runner program starts the agent programs there.
  - The gateway keeps the saved agent logins out of each cloud computer from an org image with a runner of protocol version 2 or later. Such a runner gets a turn token with each turn, and no login.
  - The section "No login in the sandbox" of `docs/protocol/model-gateway.md` states the rules. Each model request of the agent programs goes to the gateway with the turn token.
  - The same section says that a settings file in the repository, such as `.claude/settings.json`, cannot send these requests to another address. Reason: such a request gives the turn token to that address.
  - A runner of protocol version 1 still gets the real login with each turn. The user chose on 9 November 2026 to keep that support for older org images.
  - The Worker accepts runners of both versions. The runner package still reports version 1. It moves both agents to version 2 in one change, which waits for this answer.
  - So until the runner moves, every new org image also gets a runner of version 1. Each cloud computer keeps getting the real login of each turn, for Claude and for Codex.
  - `runner/package.json` pins Claude Agent SDK 0.3.318. That SDK installs the `claude` program 2.1.318, the pinned client.
  - The runner gives the real login to the client on a private pipe, file descriptor 3. A newer runner gives the turn token on the same pipe.
  - The turn token keeps the prefix shape of the native login kind. So the client keeps its native Anthropic API key mode and its subscription mode.
  - On `main`, `providerEnvironment` removes each `ANTHROPIC_*`, `CLAUDE_*`, `CLAUDECODE`, `OPENAI_*`, and `CODEX_*` variable before the runner starts an agent.
  - The runner also loads the project settings of the repository, with `settingSources: ['project']`. So on `main`, a child gets an Anthropic address only from the repository's `.claude/settings.json`, or from its own files, such as a `.env` file.
  - An address only in the agent's environment does not hold. The repository's settings replace it, and the agent then sends its requests to the repository's address.
  - Among the tested settings, only flag settings keep the agent on the gateway, whatever the repository sets.
  - The tested designs also pinned three certificate settings in the flag settings: `NODE_EXTRA_CA_CERTS`, `NODE_TLS_REJECT_UNAUTHORIZED`, and `CLAUDE_CODE_CERT_STORE`. A certificate setting tells a program which TLS certificates it trusts.
  - Reason for these pins: a repository's trust setting could let a proxy read the turn token on its way to the gateway.
  - The earlier custom-endpoint work has a settings helper in commits `e6948b66` and `978941df` on branch `calummoore/cli-proxy-setup`. That helper also pins eight proxy variables.
  - The final set of pinned names is not chosen.
  - One-time runs with fake keys and local fake servers tested five child forms: normal commands, background commands, shell-form hooks, exec-form hooks, and MCP servers. An exec-form hook is a hook that the client starts directly, with no shell.
  - In these tested child forms, the pinned client copied the pinned settings into the child. The gateway address reached all five forms.
  - Other launch forms were not tested, so their inherited settings remain unknown.
  - In those runs, no child got the turn token or a descriptor variable. All 33 recorded child launches lacked them.
  - A project tool can call Anthropic with its own key and its own address. The Anthropic SDK reads an inherited `ANTHROPIC_BASE_URL`. Loaders such as dotenv do not replace an inherited value.
  - Some child processes keep running after the agent exits, such as a dev server that a tool started. They keep the environment of their start.
  - The Claude Agent SDK offers no model-only address, no hook for the client's model requests, and no general setting for the environment of children. SDK 0.3.319, the newest release checked on 9 November 2026, advertises no such change.
  - A tested shell prefix restored project settings in a one-time run with fake keys. At each wrapped launch, it read the current project settings.
  - That prefix changed a pinned name only while the name still held the pinned value. It put back the project's value, or removed the name. Then it ran the project's own prefix, or the command.
  - These cases passed with that prefix: normal commands, background commands, shell-form hooks, and an MCP server that the SDK options start.
  - A `.mcp.json` server with its own address and certificate path also passed. It kept both values.
  - A settings edit during a session passed. So did a detached child after the agent closed.
  - Quoting, the working folder, output, exit status, and cancellation also matched a baseline run without the gateway settings. The agent's own requests stayed on the gateway, also after the repository edit.
  - The prefix gets one shell-command string, so it must run a shell. The client refuses a command with exit status 126 when a prefix drops its internal variables `__CLAUDE_CC_BUN_OPTIONS` or `__CLAUDE_CC_COMMAND_TEXT`. The tested prefix kept them.
  - Exec-form hooks bypass the prefix. This is proved.
  - Plugin servers, LSP servers, Monitor commands, plugin monitors, and helper commands, such as `apiKeyHelper` and `fileSuggestion`, are untested. They are not proved to bypass the prefix.
  - In a separate boundary control, a child set `NODE_EXTRA_CA_CERTS` to the empty string. That value equals the pinned value. The prefix then wrote the project's certificate path in its place.
  - This equal-value collision is a restore defect. It was not a second native MCP session, and the real `.mcp.json` session passed.
  - A set prefix changes some command handling of the client. The CPU account of a command becomes uncertain. A missing hook script is handled differently. Some gated command paths turn off.
  - The tested baseline already had a project prefix. So the run does not prove unchanged behaviour for a project without a prefix.
  - The run did not cover malformed settings, managed policy helpers, inherited fallback values of the image, other shells, or other platforms. The tested prefix used the experimental `process.execve` of Node 24.
  - The version 2 runner cutover waits for this answer. This item does not allow that cutover to ship after a merge without the answer.
- **Problem:** Inherited gateway settings redirect some project tools and send their own keys to Conductive. Conductive refuses these requests, and it writes no header value to a log. Restoring settings with a wrapper fixes the tested common cases, but it leaves known failures.
- **Impact if no action:** The new runner cannot complete its cutover. Every cloud computer keeps getting the real login of each turn, for Claude and for Codex.
- **Root question:** How should Claude use the gateway while the processes that it starts keep their own provider and certificate settings?
- **Options:**
  - **A.** Wait for a client change from Anthropic that separates the agent's model traffic from the environment of its children. Cost: both runner cutovers wait without a date. Saved logins keep reaching the cloud computers meanwhile. Effort: Small now.
  - **B.** Use the fixed gateway settings in every child. Cost: project Anthropic calls without an explicit destination fail, and they send their keys to Conductive. Children also lose the repository's certificate settings. Effort: Medium.
  - **C.** Restore project settings through a shell prefix, as the tested prefix does. Common commands, background commands, shell-form hooks, and the tested tool servers passed. Accept B's behaviour only for children that bypass the prefix. Exec-form hooks are the proved case. Fix the equal-value certificate defect before the change that ships C merges. Verify plugin servers and the other helper paths before claiming coverage. Cost: the prefix adds work at each launch, and it changes some command handling of the client. Effort: Large.
  - **D.** Add a relay to C. The relay is a runner HTTP server that forwards each model request to its destination. It routes turn tokens to the gateway and other keys to the repository's destination. It stays alive with the runner for surviving processes. Cost: some tools use Anthropic instead of their own configured destination. Proxy handling, restarts, routing, and restoration need proof. Effort: Large.
  - **E.** Use a Unix socket that ends the client's TLS and forwards to the gateway. Cost: a new certificate authority and its key enter the cloud computer. Custom destinations and child inheritance can still change behaviour. The working relay remains unproved. Effort: Large.
  - **F.** Use D's relay without a shell prefix. Cost: every model call uses the relay. Some project keys reach the default provider instead of the intended destination. Tool proxy and certificate behaviour can change. Effort: Large.
  - **G.** Restore settings when each child loads a native library, for example through `LD_PRELOAD`. Cost: static programs bypass the library. The library reaches child environments. It still needs source information to tell an equal-value override from a pinned value. Unproved. Effort: Large.
  - **H.** Restore settings in the native process-start calls of the outer agent. This could also cover static children. Cost: it affects the agent's own helper launches. Coverage and safe process handling need proof. The final environment still lacks the source information that the equal-value case needs. Unproved, not disproved. Effort: Large.
- **Shared assumptions:**
  - The saved login stays outside each cloud computer whose starting org image requires gateway credentials. That image records a runner of protocol version 2 or later.
  - The workspace takes that version as its pin when the cloud computer starts. It refuses a runner connection below the pin. So the protection does not depend on which runner a process claims to be.
  - The gateway accepts only turn tokens.
  - Source: the gateway rules in `docs/protocol/model-gateway.md`, and the version pin in `docs/protocol/agent-runner.md`.
  - The native Claude subscription and API-key modes stay. Source: on 9 November 2026, the user chose to finish the gateway for the existing login kinds. These are the Claude subscription token, the Anthropic API key, and the OpenAI API key.
  - The current client version is an implementation pin, which A can replace.
  - The private delivery of the turn token on descriptor 3 is an existing design choice of the runner.
  - No option authorizes a new trust change or an unlisted child regression without the user's answer.
- **Left out:**
  - An address only in the environment, because repository settings then redirect the agent.
  - The client's host-managed mode, `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`. In the runs, children kept the address, and the client ignored the flag-settings address.
  - The client's built-in scrub mode. In the runs, commands needed approval, and hooks and MCP servers kept the address.
  - A plain Unix socket, `ANTHROPIC_UNIX_SOCKET`. With the default address, the client sends TLS through the socket, so a plain HTTP relay gets no request.
  - The client's cloud-provider modes, such as Bedrock, Vertex, and Foundry, because they change the request shape and the required native authentication.
  - The client's own gateway mode, because it reads the same address variable, so children still inherit the address.
  - A gateway pass-through of other credentials, because the gateway accepts only turn tokens.
  - A fallback to the real login, because it breaks the protection that the gateway exists for.
  - A change to the client program itself. A contains the vendor client-change route.
  - An agent without its Bash tool, because it changes behaviour on `main` and still misses hooks and MCP servers.
  - No fully compliant local route is proved.
- **Wider fix:** A's client separation. None of the runner mechanisms removes the entire class.
- **Previous examples:**
  - The custom-endpoint work on branch `calummoore/cli-proxy-setup` has the same child-environment problem. Its own open choice found that the client copies a flag-settings address into its children.
  - The one-time runs above showed the gateway address in commands, background commands, both hook forms, and MCP servers.
  - The tested restoring prefix passed its common cases, but it failed the explicit equal-value override case.
  - On 7 November 2026, the real login moved from the agent environment to private routes, because every tool process inherited it. `plans/follow-ups/agent-login-in-tool-processes.md` holds the live check of that change for runners of version 1.
- **Related:**
  - Gateway-first stays approved. This question affects only the transport of Claude, but it blocks the shared version 2 runner cutover. It does not reopen custom endpoints or the providers' approval of the gateway.
  - `plans/follow-ups/own-endpoints-through-model-gateway.md`: the later custom-endpoint feature uses the same gateway and Claude transport. Its secret address never reaches a newer runner, so this item does not answer its questions.
  - `plans/follow-ups/runner-update-at-start.md`: older runners keep real logins. While this item is open, new org images also get older runners, so that risk covers every cloud computer.
- **Recommendation:** C, with approval of the unwrapped-child exception. It preserves the tested common cases without a new listener or certificate authority. Fix the wrapped-child restoration defect before merge. A's vendor change best removes this defect class.
- **Action:** ask the user, because unwrapped children would inherit the gateway address and lose repository certificate settings. The proved case is an exec-form hook. Its own provider call can fail and send its project key to Conductive. No recorded answer approves that change. The equal-value restore defect and untested coverage remain engineering work. No further regression is approved by this question.

Status on 9 November 2026: pending. No option is selected. No runtime
exception, narrowed pin set, or new requirement is approved. This item
authorizes no contact with Anthropic.

The equal-value certificate defect is not a question for the user. Fix it
before the change that ships C merges. The untested child forms and the
unproved options D to H are engineering work, not questions for the user.

Provenance, optional: gateway decision 11 of the plan
`plans/model-gateway.md` on branch
`conductor/model-gateway-worker-model-proxy-decision-120`, 9 November
2026. The pull request that deletes that plan keeps the dated record.
