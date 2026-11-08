# Tool processes keep the login after a turn

- **Severity:** High. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #30, branch `conductor/boat-native-remote-workspaces-milestone-7u`, a problem outside the scope that the check of round 1 finding 2 found. The user sees it as item 114.
- **Location:** `providerEnvironment` in `runner/src/providers/environment.ts:31`, and the section "Agent logins in a sandbox" of `docs/protocol/access-and-security.md`.
- **Reason:** each fix changes a protocol rule, how the tools run, or needs a run in a real sandbox.

- **Terms:**
  - **Agent login:** the Claude subscription token, the Anthropic API key, or the OpenAI API key of the member who started a session. Every turn of that session uses it.
  - **Tool process:** a program that the agent starts for a tool, such as a shell command or a dev server.
- **Background:**
  - The runner gives the agent the login of the turn in its environment. That login belongs to the session starter, whoever sent the message.
  - The access doc accepts that each process in the sandbox can read the login of the turn that runs now. A proxy that keeps every login out of the sandbox was rejected as a much larger build.
  - PR #30 closes the agent at the end of each turn.
- **Problem:** Each tool process inherits the environment of the agent, with the login. A server that a tool starts keeps running after the turn, and it keeps the login. The pinned Claude program removes the login from its tool processes only with a setting that the runner does not set. Nobody has checked the Codex program.
- **Impact if no action:** After a turn, a dev server can hold a member's login for days. Each member with a terminal in that sandbox can read it.
- **Root question:** How does the login of a session starter stay readable only while a turn on that login runs?
- **Options:**
  - **A.** Accept the risk, and state it in the access doc: a process that a tool started can keep the login of its turn after the turn ends. Effort: Small.
  - **B.** Turn on the Claude program's setting that removes the login from its tool processes. That setting needs bubblewrap and runs each tool command in isolation, so tool commands behave differently. Effort: Medium.
  - **C.** Give the Claude agent its login through a file descriptor, not the environment, so that no tool process inherits it. Its code reads the login this way, but a run in a real sandbox must confirm it with both login kinds. Codex needs its own check. Effort: Large.
  - **D.** Start each agent in its own process group, and end the whole group at the end of each turn. This also stops each server that the agent started, such as a dev server behind a port preview, which changes the product. A process can leave its group. Effort: Large.
- **Left out:** A proxy that keeps every login out of the sandbox, because the user rejected it as a much larger build. `plans/follow-ups/agent-logins-readable-in-sandbox.md` now records it for a later decision.
- **Wider fix:** C.
- **Previous examples:** the idle agent process that kept the login between turns, fixed by Milestone 7u in PR #30, and PR #30 round 1 finding 2, an agent that ran after its turn ended.
- **Related:** `plans/follow-ups/agent-logins-readable-in-sandbox.md` has the same cause: the login is in the environment of the agent. Each of its options also fixes this item, because the sandbox then holds no login, or only a token that stops working at the end of the turn. If the user chooses one of them, drop this item.
- **Recommendation:** C. It keeps the login out of each tool process and changes nothing in how the tools and servers run. Milestone 8i runs real agents, so it can make the check.
- **Action:** fix after merge, apply C, because the user chose A now and C as a later follow-up on 7 November 2026 (decision 114). The access protocol states the risk until C lands. C needs a run with real logins in a real sandbox, so it fits Milestone 8i or later.
