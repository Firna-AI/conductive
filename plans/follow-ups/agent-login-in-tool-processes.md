# Tool processes keep the sender's login after the turn

- **Severity:** High. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-07, from PR #30, branch `conductor/boat-native-remote-workspaces-milestone-7u`, a problem outside the scope that the check of round 1 finding 2 found. The user sees it as item 114.
- **Location:** `providerEnvironment` in `runner/src/providers/environment.ts:29`, and the section "Agent logins in a sandbox" of `docs/protocol/access-and-security.md`.
- **Reason:** each fix changes a protocol rule, how the tools run, or needs a run in a real sandbox.

- **Terms:**
  - **Agent login:** the Claude subscription token, the Anthropic API key, or the OpenAI API key of the member who sent a turn.
  - **Tool process:** a program that the agent starts for a tool, such as a shell command or a dev server.
- **Background:**
  - The runner gives the agent the login of the turn's sender in its environment.
  - The access doc accepts that each process in the sandbox can read the login of the turn that runs now. A proxy that keeps every login out of the sandbox was rejected as a much larger build.
  - PR #30 closes the agent at the end of each turn.
- **Problem:** Each tool process inherits the environment of the agent, with the login. A server that a tool starts keeps running after the turn, and it keeps the login. The pinned Claude program removes the login from its tool processes only with a setting that the runner does not set. Nobody has checked the Codex program.
- **Impact if no action:** After a turn, a dev server can hold a member's login for days. Each member with a terminal in that sandbox can read it.
- **Root question:** How does a member's login stay readable only while that member's turn runs?
- **Options:**
  - **A.** Accept the risk, and state it in the access doc: a process that a tool started can keep the login of its turn after the turn ends. Effort: Small.
  - **B.** Turn on the Claude program's setting that removes the login from its tool processes. That setting needs bubblewrap and runs each tool command in isolation, so tool commands behave differently. Effort: Medium.
  - **C.** Give the Claude agent its login through a file descriptor, not the environment, so that no tool process inherits it. Its code reads the login this way, but a run in a real sandbox must confirm it with both login kinds. Codex needs its own check. Effort: Large.
  - **D.** Start each agent in its own process group, and end the whole group at the end of each turn. This also stops each server that the agent started, such as a dev server behind a port preview, which changes the product. A process can leave its group. Effort: Large.
- **Left out:** A proxy that keeps every login out of the sandbox, because the user rejected it as a much larger build.
- **Wider fix:** C.
- **Previous examples:** the idle agent process that kept the login between turns, fixed by Milestone 7u in PR #30, and PR #30 round 1 finding 2, an agent that ran after its turn ended.
- **Recommendation:** C. It keeps the login out of each tool process and changes nothing in how the tools and servers run. Milestone 8i runs real agents, so it can make the check.
- **Action:** ask the user, because C needs a run in a real sandbox, and A, B, and D change a protocol rule or how the tools run.
