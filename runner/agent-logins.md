# Agent logins

This page belongs to the [agent runner](README.md). It gives the facts of
this implementation about agent logins.
[Agent logins in a sandbox](../docs/protocol/sandbox-credentials.md#agent-logins-in-a-sandbox)
states the requirements and the accepted risks.

An agent login is the Claude subscription token, the Anthropic API key, or
the OpenAI API key of the member who started a session. The runner gets it
in the commands of the workspace Durable Object.

## The login of a turn

- The runner starts each turn with the login of its `turn` command. That
  login stays for the whole turn, also when a `message` command carries
  another login. Each `message` command of the turn goes to the running
  agent process at once, whoever sent it. Each end of a turn closes its
  agent process, so no idle agent process keeps a login. The next turn
  starts a new agent process on the saved conversation, when one exists.
- Each new agent process gets the login again through the route of its
  agent program. A resumed conversation uses the same route.
- The runner puts no login in the environment or the arguments of an agent
  program. It writes no login to a file.
- The output filter keeps each login that a command carries, so that it can
  replace that login with `[redacted]`. It keeps the logins in memory until
  the runner process ends.

## The agent environment

- `providerEnvironment` copies the environment of the runner. It removes
  each variable whose name starts with `ANTHROPIC_`, `CLAUDE_`, `OPENAI_`,
  or `CODEX_`, and the variable `CLAUDECODE`.
- It sets `HOME`, `CLAUDE_CONFIG_DIR`, and `CODEX_HOME` for the home folder
  of the agents. It sets `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` and
  `DISABLE_AUTOUPDATER` to `1`.
- It also sets the workspace tool context of the turn: its machine origin,
  workspace token, and turn ID, as
  [Workspace tools](agent-tools.md#workspace-tools) says. That context holds
  no agent login.
- This environment holds no login. A tool process inherits the environment
  of its agent program, so it gets no login from it.

## Claude

- `spawnClaudeProcess` starts the `claude` program with one more pipe, on
  file descriptor 3. It adds `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR=3` for
  a subscription token, or `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR=3` for an
  API key. The value is only the number of the descriptor.
- The runner writes the login and a newline to the pipe. Then it closes its
  end of the pipe. It also closes its end when the program exits first.
- A pipe error closes the program. When the SDK fails after it started the
  program, the adapter closes the program and waits for its exit. Then the
  start fails.
- The pinned `claude` program reads that pipe once, until a newline or the
  end of the stream, and then closes it. Then it removes the descriptor
  variable from its own environment. So its later tool processes get
  neither the pipe nor the variable.
- The program uses this route when `CLAUDE_CODE_REMOTE` is not set and it
  has no IPC channel. With `CLAUDE_CODE_REMOTE` set, it can write a copy of
  the login to disk. The agent environment removes that variable, and the
  runner starts the program without an IPC channel.
- This route belongs to the `claude` program 2.1.318 that Claude Agent SDK
  0.3.318 installs. `package.json` pins that SDK version. Check the route
  again at each update of the SDK.

## Codex

- The runner starts `codex app-server` with no login in its environment or
  its arguments.
- After `initialize`, the runner sends `account/login/start` with the type
  `apiKey` and the key, on the standard input of the App Server. When that
  request succeeds, the runner sends `thread/start`, or `thread/resume` for
  a saved conversation.
- The model provider of the runner has `requires_openai_auth=true` and no
  `env_key`. The credential store is `ephemeral`, so Codex keeps the key in
  the memory of its process.
- A refused or canceled login request closes the App Server, and no thread
  opens.
- Codex 0.167.0 supports this request. `package.json` pins that version of
  `@openai/codex-sdk`. Check the request again at each update.

## What these routes do not stop

- These routes stop only the automatic copy of a login into new processes.
- They do not stop a process of the same sandbox user that reads the login
  of a running turn on purpose.
  [Agent logins in a sandbox](../docs/protocol/sandbox-credentials.md#agent-logins-in-a-sandbox)
  states that accepted risk.

## Tests

- `src/providers/claude-login.test.ts` runs the pinned Claude SDK with a
  fake child process. It checks both login kinds, the descriptor variable,
  the bytes on the pipe, and the close of the pipe and the program.
- `src/providers/codex-login.test.ts` checks that the login request comes
  before `thread/start` and `thread/resume`. It also checks that a refused
  login opens no thread.
- These tests use fake logins and no real agent program. So they do not
  show that a real login works through these routes.

## Key code

- `src/providers/environment.ts`: `providerEnvironment`, the environment of
  each agent program.
- `src/providers/claude-process.ts`: `spawnClaudeProcess`, the child process
  of the `claude` program and its login pipe.
- `src/providers/claude.ts`: the Claude adapter. It gives the SDK the agent
  environment and the custom spawn.
- `src/providers/codex.ts`: the Codex adapter, its model provider settings,
  and the login request.
- [`output-sanitizer.ts`](../src/shared/output-sanitizer.ts):
  `OutputSanitizer`, which keeps each login for the output filter.
