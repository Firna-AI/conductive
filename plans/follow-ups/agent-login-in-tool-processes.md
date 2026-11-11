# Confirm no login in version 1 tool processes

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-07, from PR #30, branch `conductor/boat-native-remote-workspaces-milestone-7u`, a problem outside the scope that the check of round 1 finding 2 found. The user sees it as item 114. Updated on 2026-11-08 by branch `conductor/boat-native-remote-workspaces-milestone-7x`, which implements option C. Updated on 2026-11-10 by branch `conductor/model-gateway-m7-runner-on-the-gateway`, which moves the runner of this repository to runner protocol version 2. Since then this item covers only version 1 runners.
- **Location:** version 1 runners in older org images. Their code is `runner/src/providers/claude-process.ts`, `runner/src/providers/codex.ts`, and `runner/src/providers/environment.ts` at commit `59ae89c`, or at a later commit where `RUNNER_PROTOCOL_VERSION` in `src/shared/runner.ts` is 1. The requirement is the section "A sandbox with a version pin of 1" of `docs/protocol/isolation.md`.
- **Reason:** the proof needs a real sandbox with a version 1 runner and real logins of three kinds, and only the primary workspace holds those logins and the real-sandbox settings.

- **Terms:**
  - **Agent login:** the Claude subscription token from `claude setup-token`, the Anthropic API key, or the OpenAI API key of the member who started a session. Every turn of that session uses it.
  - **Tool process:** a program that the agent starts for a tool, such as a shell command or a dev server.
  - **Version 1 runner:** the program of an older org image that runs the agents and gets the real login with each turn. [Old workspaces](../../docs/protocol/workspace-life.md#old-workspaces) says when a cloud computer still runs it.
  - **Probe server:** a small HTTP server that the agent starts with its shell tool in this check. Each answer holds only its process ID and two true or false values.
  - **Gate:** a named pipe. The shell tool of the agent waits on it, so the turn stays open until the checker writes one line to it.
- **Background:**
  - With each turn, the workspace Durable Object sends a credential of the session starter to the runner. The runner starts a new agent process for each turn and closes it at the end of the turn.
  - A version 1 runner gets the agent login itself. A runner of protocol version 2 gets a turn token in its place. The model gateway of the Worker then adds the login to each model request.
  - On 9 November 2026 the user chose that a version 1 runner keeps getting the real login, and that the access doc states the risk. The user also chose that each workspace refuses a runner below the version of its image.
  - At each workspace start, a sandbox with an older version of the app's own software gets the current runner before the runner starts, as [Old workspaces](../../docs/protocol/workspace-life.md#old-workspaces) says. So a version 1 runner stays in a sandbox only until a workspace start updates it. It stays longer when that update fails.
  - Each image build and each refresh records the `RUNNER_PROTOCOL_VERSION` of the Worker in `image_builds.runner_protocol_version` of the D1 database. A missing value counts as 1.
  - Each new cloud computer of a workspace copies the version of its image to `workspaces.runner_protocol_version`, the version pin of the workspace. The workspace refuses a runner below its pin before the welcome.
  - In this repository, `RUNNER_PROTOCOL_VERSION` in `src/shared/runner.ts` is now 2. The runner of this repository uses a turn token, as `runner/agent-logins.md` says. Only its measure tool still uses the Claude pipe and the Codex login request below, with a developer login.
  - Before option C, the runner put the login in the environment of the agent program. Each tool process inherited that environment. So a server that a tool started kept the login after the turn, and each member with a terminal in the sandbox could read it. A version 1 runner from a commit before `59ae89c` of 2026-11-08 still does so.
  - Decision 114 of 7 November 2026 had four options:
    - **A.** Accept the risk, and state it in the access doc. Effort: Small.
    - **B.** Turn on the Claude program's setting that removes the login from its tool processes. That setting needs bubblewrap and runs each tool command in isolation, so tool commands behave differently. Effort: Medium.
    - **C.** Give the agent its login through a private channel, not the environment, so that no tool process inherits it. Codex needs its own check. Effort: Large.
    - **D.** Start each agent in its own process group, and end the whole group at the end of each turn. This also stops each server that the agent started, such as a dev server behind a port preview, which changes the product. A process can leave its group. Effort: Large.
  - The user chose A for the time before the fix, and C as the fix. A proxy that keeps every login out of the sandbox was left out, because the user rejected it as a much larger build.
  - On 8 November 2026 the user chose such a proxy after all: the model gateway in the Worker. `docs/protocol/model-gateway.md` states it. It keeps the login out of a sandbox with a version pin of 2 or later only.
  - Commit `59ae89c` of 2026-11-08 added the code of option C. In a version 1 runner with that code, the agent environment holds no login. `providerEnvironment` removes each inherited variable that starts with `ANTHROPIC_`, `CLAUDE_`, `OPENAI_`, or `CODEX_`, and `CLAUDECODE`.
  - Claude: `spawnClaudeProcess` gives the `claude` program a pipe on file descriptor 3. Its environment holds only `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR=3` for a token, or `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR=3` for an API key. The runner writes the login and a newline, and then closes its end of the pipe.
  - The pinned `claude` program 2.1.318 of Claude Agent SDK 0.3.318 reads that pipe until the newline or the end, and closes it. Then it removes the descriptor variable. It writes a copy of the login to disk only when `CLAUDE_CODE_REMOTE` is set, and the runner removes that variable.
  - Codex: the runner starts `codex app-server` 0.167.0 with no login in its environment or its arguments. After `initialize`, it sends `account/login/start` with the type `apiKey` on the standard input of the App Server. When that request succeeds, the runner sends `thread/start` or `thread/resume`.
  - The Codex model provider of a version 1 runner has `base_url` set to `https://api.openai.com/v1`, `requires_openai_auth=true`, and no `env_key`. The credential store is `ephemeral`, so Codex keeps the key in memory.
  - The section "A sandbox with a version pin of 1" of `docs/protocol/isolation.md` requires that no process that the agent starts inherits the login, and that no agent program writes a copy to disk.
  - The runner tests use fake logins. `runner/src/providers/claude-native.test.ts` still runs the pinned SDK with a fake child process, and checks the same Claude pipe for the measure tool. No test starts a real agent program. So no run has shown that the real programs take these routes, or that a real tool server gets no login.
  - The accepted risk stays: a member with a terminal, or another process of the same sandbox user, can read the login of a running turn on purpose and keep a copy. This check does not test that risk.
  - Earlier cases of a login that outlived its turn: the idle agent process that kept the login between turns, fixed in PR #30, and an agent that ran after its turn ended, round 1 finding 2 of PR #30.
  - Since 11 November 2026, the first workspace start of a new test workspace gives it the current runner, as [Old workspaces](../../docs/protocol/workspace-life.md#old-workspaces) says. So the live check below gets a version 1 runner only after a failed update. No simple design exists, and this item may be obsolete. Plan decision 30 of `plans/software-image.md` decides the version pin.
- **Task:** Run the live check below in a sandbox with a version 1 runner that holds option C. Run it once for each login kind: a Claude subscription token, an Anthropic API key, and an OpenAI API key for Codex. It checks a tool server before and after the end of a turn, after a resumed conversation, and after Stop.
- **Impact if no action:** The access doc states a requirement for a sandbox with a version pin of 1 that no real run has confirmed. If a pinned program of a version 1 runner does not take its login through its route in a real sandbox, every turn on that login kind fails there. If a login still reaches a tool process, a dev server can keep it for days.
- **Needs:**
  - An org image of a test org that holds a version 1 runner with option C, and that records runner protocol version 1. In the commit of that runner, `RUNNER_PROTOCOL_VERSION` in `src/shared/runner.ts` is 1, and `runner/src/providers/claude-process.ts` exists.
  - `git log --reverse --format=%h -S 'RUNNER_PROTOCOL_VERSION = 2' -- src/shared/runner.ts` prints the first commit of version 2 on its first line. The parent of that commit holds a version 1 runner with option C.
  - A build or a refresh on a test Worker of version 2 records version 2, and its workspaces then refuse a version 1 runner. So use an image that a build or a refresh made while the test Worker had version 1.
  - If no such image exists, build one on a test Worker that runs a commit of version 1. Then deploy the current commit again. The image keeps version 1 until its next build or refresh, and a Worker of this repository still serves version 1 runners.
  - `image/developer-scripts.md` says how to package a runner archive. `image/README.md` and `runner/service/README.md` give the build and image steps.
  - The test Worker, the signed-in test account, the test org, and its repository that "What a real check needs" in `image/developer-scripts.md` lists. The primary workspace holds these settings as `LIVE_*` variables.
  - The three logins in a secret store, and a model of each agent that the test account can use.
  - The terminal of a test workspace on that repository, in the test org of the version 1 image.
- **Done when:** every step below gives its expected result for all three login kinds, and the evidence holds only the values that the evidence rules allow. Then delete this item. When a step fails, keep this item, record the failure as the evidence rules say, and report it to the user.
- **Related:** `plans/follow-ups/runner-update-at-start.md` records how version 1 runners could end, for example an update of the runner at each start with a version pin that the Worker raises. When no sandbox can run a version 1 runner any more, drop this item.

## Live check

### Prepare

1. Keep each login in the secret store. Never put a login in a prompt, a command argument, a file, a log, or a screenshot.
2. In the test org of the version 1 image, create a test workspace with the first message "Reply with only READY. Do not run tools." Wait for the end of that turn, so that its sandbox runs.
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
6. For Codex only, check that the server shares no open file with the standard input of the App Server, which carried the login request. Replace `<pid>` with the recorded `pid`. Expect `readable` and then `0`.

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

After the three rows, remove the scratch folder and stop the test workspace. Replace or disconnect the test logins, as the live-test credential route of the primary workspace expects.

If the probe server stops when the tool command ends, record that, and start the row again with `setsid` before `node`. Then the probe is out of the process group of the tool command, and a tool timeout cannot stop it.

### Evidence rules

- Record only the login kind, the agent, the session ID, the probe `pid`, the two true or false values, the end state of each turn, the process counts, the `readable` line and the shared count, the `present` or `absent` lines, and whether the reply held the code word.
- Save the evidence under the git-ignored `.context/` folder of the primary workspace. Never save it in the repository.
- Never run `env`, `printenv`, `set`, or `export -p` in this check. Never read `/proc/<pid>/environ` or `/proc/<pid>/cmdline`. Their output can hold logins and other secrets.
- When a step fails, record only the step, the login kind, and its true or false result. Do not print variables to find the cause.

### Limits of the check

- It does not test the accepted risk: a member with a terminal, or another process of the same sandbox user, can still read the login of a running turn on purpose.
- It covers only the versions that the version 1 runner pins. The runner of `59ae89c` pins the `claude` program 2.1.318 of Claude Agent SDK 0.3.318, and Codex 0.167.0. Run it again for a version 1 runner with other pins.
- `image/live-check.mjs` checks real chat and resume. But it starts no server through a tool, and its measurement forks get `LIVE_AGENT_LOGIN` in their resume env. So that script alone does not show this requirement.
- It does not cover a runner of protocol version 2, which holds no login. The section "A sandbox with a version pin of 2 or later" of `docs/protocol/isolation.md` states the risks of its turn token.
