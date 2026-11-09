# Confirm that tool processes get no agent login

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-07, from PR #30, branch `conductor/boat-native-remote-workspaces-milestone-7u`, a problem outside the scope that the check of round 1 finding 2 found. The user sees it as item 114. Updated on 2026-11-08 by branch `conductor/boat-native-remote-workspaces-milestone-7x`, which implements option C. Updated on 2026-11-09 by branch `calummoore/openai-subscription-token-support`, which adds the Codex access token as a fourth login kind.
- **Location:** `spawnClaudeProcess` in `runner/src/providers/claude-process.ts:12`, the login request in `runner/src/providers/codex.ts:117`, `providerEnvironment` in `runner/src/providers/environment.ts:13`, `runner/agent-logins.md`, and the section "Agent logins in a sandbox" of `docs/protocol/access-and-security.md`.
- **Reason:** the code of option C is complete, but its proof needs real logins of four kinds in a real sandbox, and only the primary workspace holds those logins and the real-sandbox settings.

- **Terms:**
  - **Agent login:** the Claude subscription token from `claude setup-token`, the Anthropic API key, the OpenAI API key, or the Codex access token of the member who started a session. Every turn of that session uses it.
  - **Codex access token:** a token that a member of a ChatGPT Business or Enterprise workspace makes in ChatGPT's admin console. Codex then runs on the plan of that workspace. Each token expires.
  - **Tool process:** a program that the agent starts for a tool, such as a shell command or a dev server.
  - **Runner:** the program of Conductive in each cloud computer that runs the agents. `runner/README.md` describes it.
  - **Probe server:** a small HTTP server that the agent starts with its shell tool in this check. Each answer holds only its process ID and two true or false values.
  - **Gate:** a named pipe. The shell tool of the agent waits on it, so the turn stays open until the checker writes one line to it.
- **Background:**
  - With each turn, the workspace Durable Object sends the agent login of the session starter to the runner. The runner starts a new agent process for each turn and closes it at the end of the turn.
  - Before option C, the runner put the login in the environment of the agent program. Each tool process inherited that environment. So a server that a tool started kept the login after the turn, and each member with a terminal in the sandbox could read it.
  - Decision 114 of 7 November 2026 had four options:
    - **A.** Accept the risk, and state it in the access doc. Effort: Small.
    - **B.** Turn on the Claude program's setting that removes the login from its tool processes. That setting needs bubblewrap and runs each tool command in isolation, so tool commands behave differently. Effort: Medium.
    - **C.** Give the agent its login through a private channel, not the environment, so that no tool process inherits it. Codex needs its own check. Effort: Large.
    - **D.** Start each agent in its own process group, and end the whole group at the end of each turn. This also stops each server that the agent started, such as a dev server behind a port preview, which changes the product. A process can leave its group. Effort: Large.
  - The user chose A for the time before the fix, and C as the fix. A proxy that keeps every login out of the sandbox was left out, because the user rejected it as a much larger build. `plans/follow-ups/agent-logins-readable-in-sandbox.md` records it for a later decision.
  - The code of option C is complete. The agent environment holds no login, because `providerEnvironment` removes each inherited variable that starts with `ANTHROPIC_`, `CLAUDE_`, `OPENAI_`, or `CODEX_`, and `CLAUDECODE`.
  - Claude: `spawnClaudeProcess` gives the `claude` program a pipe on file descriptor 3. Its environment holds only `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR=3` for a token, or `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR=3` for an API key. The runner writes the login and a newline, and then closes its end of the pipe.
  - The pinned `claude` program 2.1.318 of Claude Agent SDK 0.3.318 reads that pipe until the newline or the end, and closes it. Then it removes the descriptor variable. It writes a copy of the login to disk only when `CLAUDE_CODE_REMOTE` is set, and the runner removes that variable.
  - Codex with an OpenAI API key: the runner starts `codex app-server` 0.167.0 with no login in its environment or its arguments. After `initialize`, it sends `account/login/start` with the type `apiKey` on the standard input of the App Server. When that request succeeds, the runner sends `thread/start` or `thread/resume`.
  - The Codex model provider has `requires_openai_auth=true` and no `env_key`. The credential store is `ephemeral`, so Codex keeps the key in memory.
  - Codex with a Codex access token: the runner gives the token only to the App Server. The credential store stays `ephemeral`. `runner/agent-logins.md` names the route, which is one of these two:
    - The config route: the token goes in the `config` of `thread/start` and `thread/resume`, on the standard input of the App Server.
    - The variable route: the runner adds the token as `CODEX_ACCESS_TOKEN` to the environment of the App Server only. The runner also sets the shell environment rule of Codex that removes that variable from shell commands.
  - The section "Agent logins in a sandbox" of the access doc now requires that no process that the agent starts inherits the login, and that no agent program writes a copy to disk. `runner/agent-logins.md` gives the code facts.
  - The runner tests use fake logins. The Claude login tests run the pinned SDK with a fake child process. No test starts a real agent program. So no run has shown that the real programs take these routes, or that a real tool server gets no login.
  - The accepted risk stays: a member with a terminal, or another process of the same sandbox user, can read the login of a running turn on purpose and keep a copy. This check does not test that risk.
  - Earlier cases of a login that outlived its turn: the idle agent process that kept the login between turns, fixed in PR #30, and an agent that ran after its turn ended, round 1 finding 2 of PR #30.
- **Task:** Run the live check below once for each login kind: a Claude subscription token, an Anthropic API key, an OpenAI API key for Codex, and a Codex access token. It checks a tool server before and after the end of a turn, after a resumed conversation, and after Stop.
- **Impact if no action:** The access doc states a requirement that no real run has confirmed. If a pinned program does not take its login through its route in a real sandbox, every turn on that login kind fails. If a login still reaches a tool process, a dev server can keep it for days.
- **Needs:**
  - A runner build that holds option C in the org image of a test org. `runner/src/providers/claude-process.ts` must exist in that build. `runner/service/README.md` and `image/developer-scripts.md` give the build and image steps.
  - The test Worker, the signed-in test account, the test org, and its repository that "What a real check needs" in `image/developer-scripts.md` lists. The primary workspace holds these settings as `LIVE_*` variables.
  - For the Codex access token row, the test Worker, its account page, and the runner build must accept a Codex access token.
  - The four logins in a secret store, and a model of each agent that the test account can use. The Codex model must also run on the ChatGPT plan of the access token.
  - A Codex access token with the Codex scope that has not expired. It comes from a ChatGPT Business or Enterprise workspace whose owner allows access tokens and local Codex use. Only the user can give one.
  - The terminal of a test workspace on that repository.
- **Done when:** every step below gives its expected result for all four login kinds, and the evidence holds only the values that the evidence rules allow. Then delete this item. When a step fails, keep this item, record the failure as the evidence rules say, and report it to the user.
- **Related:** `plans/follow-ups/agent-logins-readable-in-sandbox.md` has the same cause: the real login is in the sandbox while a turn runs. Its options keep the real login out of the sandbox. If one of them lands before this check runs, drop this item.

## Live check

### Prepare

1. Keep each login in the secret store. Never put a login in a prompt, a command argument, a file, a log, or a screenshot.
2. Create a test workspace with the first message "Reply with only READY. Do not run tools." Wait for the end of that turn, so that its sandbox runs.
3. Open the terminal of the workspace, and go to the repository folder of the workspace. That folder is also the working folder of the agents. Run each terminal command below from it.
4. Create the scratch folder `.context/7x/live-login-probes/` there. Save this script in it as `probe.mjs`:

   ```js
   import { createServer } from 'node:http'

   const credentialKeys = [
     'ANTHROPIC_API_KEY',
     'ANTHROPIC_AUTH_TOKEN',
     'CLAUDE_CODE_OAUTH_TOKEN',
     'OPENAI_API_KEY',
     'CODEX_API_KEY',
     'CODEX_ACCESS_TOKEN',
   ]
   const descriptorKeys = [
     'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR',
     'CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR',
   ]
   const server = createServer((request, response) => {
     response.setHeader('content-type', 'application/json')
     response.end(JSON.stringify({
       pid: process.pid,
       loginEnvironmentPresent: credentialKeys.some((key) =>
         Object.hasOwn(process.env, key)),
       loginDescriptorMarkerPresent: descriptorKeys.some((key) =>
         Object.hasOwn(process.env, key)),
     }))
     if (request.url === '/close') server.close()
   })
   server.listen(Number(process.argv[2]), '127.0.0.1', () => {
     process.stdout.write('probe ready\n')
   })
   ```

   The probe prints only a readiness line. It checks only the names in its own inherited environment. It never returns environment values. A request to `/close` stops it.
5. Check that no login file exists yet. `$HOME` must be the home folder of the agents, which holds `.conductive/claude` and `.conductive/codex`. Each line must end in `absent`. This shows that a later turn can get its login only through its route.

   ```sh
   for f in "$HOME/.conductive/codex/auth.json" "$HOME/.conductive/claude/.credentials.json" \
     /home/claude/.claude/remote/.oauth_token /home/claude/.claude/remote/.api_key; do
     if [ -e "$f" ]; then echo "$f present"; else echo "$f absent"; fi
   done
   ```

### Run each login kind

Do these steps for each row, one row at a time. `PORT` and `NAME` stand for the values of the row.

| Login kind | Agent | `PORT` | `NAME` |
| --- | --- | --- | --- |
| Claude subscription token | Claude | 43181 | `token` |
| Anthropic API key | Claude | 43182 | `api-key` |
| OpenAI API key | Codex | 43183 | `codex` |
| Codex access token | Codex | 43184 | `access-token` |

Start the row:

1. Connect the login of the row to the test account through the live-test credential route of the primary workspace, such as the agent login form of the account page. Change no login until the three turns of the row end, because each turn reads the login of the session starter.
2. Start a new session with the agent of the row and the live-test model.

First turn, a normal end:

3. Send this message. Replace `PORT` and `NAME`, and choose a new random code word. When `node` is not on the `PATH` of the agent, use the image's Node at `/opt/conductive/runtime/node-v<version>-linux-x64/bin/node`, as `image/runtime.md` says.

   ```text
   Remember the code word <code word>. Use your shell tool to run the commands below, with a timeout of 10 minutes. Wait until they end. Leave the probe server running after your reply. Then reply with only DONE.

   mkdir -p .context/7x/live-login-probes
   mkfifo .context/7x/live-login-probes/NAME.gate
   node .context/7x/live-login-probes/probe.mjs PORT > .context/7x/live-login-probes/NAME.log 2>&1 &
   read -r probe_release < .context/7x/live-login-probes/NAME.gate
   ```

   The `read` waits on the gate, so the turn stays open without a timing guess.
4. Wait until the chat shows the running shell tool. Run `grep -c 'probe ready' .context/7x/live-login-probes/NAME.log`. Expect `1`.
5. Run `curl --fail --silent http://127.0.0.1:PORT/`. Expect `"loginEnvironmentPresent":false` and `"loginDescriptorMarkerPresent":false`. Record the `pid`. This shows that the server did not inherit a login variable or a login descriptor number while the turn ran.
6. For the two Codex rows only, check that the server shares no open file with the standard input of the App Server, which can carry the login. Replace `<pid>` with the recorded `pid`. Expect `readable` and then `0`.

   ```sh
   app=$(pgrep -o -f 'app-serve[r]')
   login=$(readlink "/proc/$app/fd/0")
   [ -n "$login" ] && ls "/proc/<pid>/fd" > /dev/null && echo readable
   for fd in /proc/<pid>/fd/*; do [ "$(readlink "$fd")" = "$login" ] && echo shared; done | grep -c shared || true
   ```

7. Release the tool with `timeout 10 sh -c "printf '\n' > .context/7x/live-login-probes/NAME.gate"`. If this command times out, the tool already ended, for example on a tool timeout. Then start the row again with a new session.
8. Wait for the end of the turn. Expect one `turn.completed` with the state `finished`, and the reply `DONE`.
9. Run the `curl` command again. Expect the same `pid` and both values `false`. This shows that the server kept running after the turn without a login.
10. Count the agent processes. Expect `0`. This shows that no agent process stays after the turn. The brackets stop `pgrep` from counting the shell that runs the command.
    - Claude: `pgrep -c -f 'claude-agent-sdk-linux-x6[4]/claude' || true`
    - Codex: `pgrep -c -f 'app-serve[r]' || true`
11. Run the file check of the preparation again. Expect only `absent` lines. This shows that no agent program wrote a copy of the login to disk.

Second turn, a resumed conversation:

12. Send "Reply with only the code word from my first message. Do not run tools."
13. Expect the code word in the reply, and one `turn.completed` with the state `finished`. This turn starts a new agent process on the saved conversation. So the reply shows that the login route also works for a resumed conversation.
14. Run the `curl` command, the process count, and the file check again. Expect the same `pid`, both values `false`, `0`, and only `absent` lines. This shows that the server stays through a later turn without a login.

Third turn, Stop:

15. Send this message. Replace `NAME` first.

    ```text
    Use your shell tool to run the commands below, with a timeout of 10 minutes. Wait until they end. Then reply with only DONE.

    mkfifo .context/7x/live-login-probes/NAME-stop.gate
    read -r probe_release < .context/7x/live-login-probes/NAME-stop.gate
    ```

16. When the chat shows the running shell tool, press Stop.
17. Expect exactly one `turn.completed` with the state `stopped`. Then count the agent processes. Expect `0`. The runner sends the end of a turn only after its agent process exits, so this shows that Stop closes the agent process.
18. Run the `curl` command and the file check again. Expect the same `pid`, both values `false`, and only `absent` lines. This shows that Stop leaves the server of the first turn running without a login.
19. Release a reader that still waits with `timeout 10 sh -c "printf '\n' > .context/7x/live-login-probes/NAME-stop.gate" || true`.

Clean up the row:

20. Stop the probe server with `curl --fail --silent http://127.0.0.1:PORT/close`.
21. Remove the files of the row with `rm -f .context/7x/live-login-probes/NAME*`.

After the four rows, remove the scratch folder and stop the test workspace. Replace or disconnect the test logins, as the live-test credential route of the primary workspace expects.

If the probe server stops when the tool command ends, record that, and start the row again with `setsid` before `node`. Then the probe is out of the process group of the tool command, and a tool timeout cannot stop it.

### Evidence rules

- Record only the login kind, the agent, the session ID, the probe `pid`, the two true or false values, the end state of each turn, the process counts, the `readable` line and the shared count, the `present` or `absent` lines, and whether the reply held the code word.
- Save the evidence under the git-ignored `.context/` folder of the primary workspace. Never save it in the repository.
- Never run `env`, `printenv`, `set`, or `export -p` in this check. Never read `/proc/<pid>/environ` or `/proc/<pid>/cmdline`. Their output can hold logins and other secrets.
- When a step fails, record only the step, the login kind, and its true or false result. Do not print variables to find the cause.

### Limits of the check

- It does not test the accepted risk: a member with a terminal, or another process of the same sandbox user, can still read the login of a running turn on purpose.
- It covers only the pinned versions: the `claude` program 2.1.318 of Claude Agent SDK 0.3.318, and Codex 0.167.0. Run it again after an update of either version.
- It checks only a server that the shell tool starts. It does not check an MCP server or a hook that the agent program starts. On the variable route of a Codex access token, the shell environment rule of Codex does not cover such a process.
- `image/live-check.mjs` checks real chat and resume. But it starts no server through a tool, and its measurement forks get `LIVE_AGENT_LOGIN` in their resume env. So that script alone does not show this requirement.
