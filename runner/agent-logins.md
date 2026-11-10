# Agent logins

This page belongs to the [agent runner](README.md). It gives the facts of
this implementation about agent logins and turn tokens.
[How the agents reach the gateway](../docs/protocol/model-gateway.md#how-the-agents-reach-the-gateway)
states the requirements.
[A sandbox with a version pin of 2 or later](../docs/protocol/isolation.md#a-sandbox-with-a-version-pin-of-2-or-later)
states the accepted risks.

An agent login is the Claude subscription token, the Anthropic API key, or
the OpenAI API key of the member who started a session. This runner speaks
runner protocol version 2, so no runner command gives it an agent login.
Each `turn` command carries a turn token in place of the login. The
[model gateway](../worker/model-gateway/README.md) of the Worker adds the
login to each model request. Only the [measure tool](#the-measure-tool)
uses a real login, which a developer gives it.

An older org image can hold a runner of protocol version 1. Such a runner
gets the agent login itself with each turn, as
[A sandbox with a version pin of 1](../docs/protocol/isolation.md#a-sandbox-with-a-version-pin-of-1)
says.

## The turn token

- The `credential` of a `turn` command holds the turn token, the agent, and
  the login kind. Its agent must be the agent of the message. A `message`
  command carries no credential.
- The runner closes its connection with code 1002 when a command lacks a
  field that it needs, or has an invalid one. An example is a version 1
  `turn` command, which has a `login` and no `credential`. A `welcome` of
  another protocol version also closes the connection.
- The parser ignores other fields. It keeps only the fields that it reads.
- The runner starts each turn with the token of its `turn` command. That
  token stays for the whole turn, also when a model change starts a new
  agent process in the turn. Each `message` command of the turn goes to
  the running agent process at once, whoever sent it.
- Each end of a turn closes its agent process, so no idle agent process
  keeps a token. The next turn starts a new agent process on the saved
  conversation, when one exists, with the token of that turn.
- The engine gives each agent adapter two values: the gateway address of
  its agent, and the turn token. The address is the machine origin with
  `/v1/model/claude` for Claude, or `/v1/model/codex` for Codex.
  `MACHINE_PATHS` in [`agent-tools.ts`](../src/shared/agent-tools.ts)
  holds these paths.
- The machine origin is the origin of `CONDUCTIVE_RUNNER_URL`, with
  `https:` in place of `wss:`.
- The runner passes the token unchanged, so the token keeps the prefix of
  a real login of its kind.
  [Model requests](../worker/model-gateway/README.md#model-requests) says
  how the gateway reads that prefix.
- The output filter keeps the token of each `turn` command, so that it can
  replace that token with `[redacted]` in displayed text. It keeps the
  tokens in memory until the runner process ends.
- The state file holds no turn token. The runner puts no token in the
  environment or the arguments of an agent program. It writes the token
  only to the credentials file of Claude, as [Claude](#claude) says.

## The agent environment

- `providerEnvironment` copies the environment of the runner. It removes
  each variable whose name starts with `ANTHROPIC_`, `CLAUDE_`, `OPENAI_`,
  or `CODEX_`, and the variable `CLAUDECODE`.
- It also removes `CONDUCTIVE_MEASURE_LOGIN`, the private input of the
  measure tool.
- It sets `HOME`, `CLAUDE_CONFIG_DIR`, and `CODEX_HOME` for the home folder
  of the agents. It sets `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` and
  `DISABLE_AUTOUPDATER` to `1`.
- It also sets the workspace tool context of the turn: its machine origin,
  workspace token, and turn ID, as
  [Workspace tools](agent-tools.md#workspace-tools) says. That context holds
  no agent login and no turn token.
- The Claude adapter adds the two profile variables that [Claude](#claude)
  names.
- A tool process inherits the environment of its agent program. The runner
  adds no login, no turn token, and no gateway address to that environment.
- Each other variable of the runner passes unchanged. Examples are the
  proxy and certificate settings in the env vars of the org.

## Claude

- Before it starts the `claude` program, the Claude adapter writes the
  profile pair of the session into `<home>/.conductive/anthropic`. That
  folder is beside the `claude` and `codex` folders of the agents. It has
  mode 0700.
- `configs/<name>.json` holds the gateway address of Claude as `base_url`,
  and `user_oauth` as `authentication.type`.
- `credentials/<name>.json` holds the turn token as `access_token`. The
  file has mode 0600, in a `credentials` folder with mode 0700. Each write
  sets these modes again. The pinned program refuses a credentials file
  that other users can read.
- The name is `session-`, then the hexadecimal SHA-256 hash of the session
  ID. So each session keeps one name, and two sessions never share a token.
- The adapter starts the program with `ANTHROPIC_CONFIG_DIR` set to that
  folder, and `ANTHROPIC_PROFILE` set to that name. The runner gives the
  program no descriptor credential, no `ANTHROPIC_BASE_URL`, no API key,
  and no auth token.
- The runner adds no gateway address, no proxy setting, and no certificate
  setting of its own to that environment or to the flag settings.
- The pinned program reads the address and the token from the profile
  pair. It uses the profile only when it has no other credential. An
  `ANTHROPIC_BASE_URL` setting wins over the `base_url` of the profile.
- The adapter keeps `settingSources: ['project']`. So the
  `.claude/settings.json` of the repository can set `ANTHROPIC_BASE_URL`.
  The program then sends each model request and the turn token to that
  address.
- The lifetime of the agent process removes the credentials file after the
  program exits. So the file goes at each end of a turn, at Stop, at a
  shutdown, and after a failed start.
- Stop also removes the file when it comes while the adapter still writes
  the profile pair. The config file stays, and it holds no secret.
- Before its first connection, the runner removes each entry of the
  `credentials` folder. So no token stays after a crash. The pinned
  program makes a lock folder beside a credentials file, and this step
  removes such folders too. A reconnect removes nothing.
- The runner uses its own folder, not the default Anthropic folder
  `~/.anthropic`. So the Anthropic profiles of a project stay as they are.
- A tool process inherits `ANTHROPIC_CONFIG_DIR` and `ANTHROPIC_PROFILE`.
  A program that reads Anthropic profiles and has no key of its own can
  then find the profile pair while the turn runs.
- The Claude route of the gateway refuses the requests of such a program.
  They lack the markers of the `claude` program, as
  [Requests and answers](../docs/protocol/model-gateway.md#requests-and-answers)
  says.
- This route belongs to the `claude` program 2.1.318 that Claude Agent SDK
  0.3.318 installs. `package.json` pins that SDK version. Check the route
  again at each update of the SDK.

## Codex

- The runner starts `codex app-server` with no login and no token in its
  environment or its arguments.
- The model provider of the runner has the gateway address of Codex as
  `base_url`. It has `requires_openai_auth=true` and no `env_key`. The
  credential store is `ephemeral`, so Codex keeps the token in the memory
  of its process.
- After `initialize`, the runner sends `account/login/start` with the type
  `apiKey` and the turn token, on the standard input of the App Server.
  When that request succeeds, the runner sends `thread/start`, or
  `thread/resume` for a saved conversation.
- A refused or canceled login request closes the App Server, and no thread
  opens.
- Codex 0.167.0 supports this request. `package.json` pins that version of
  `@openai/codex-sdk`. Check the request again at each update.

## The measure tool

The [measure tool](scripts/README.md) sends one prompt with a login that a
developer gives it. It uses the native credential mode of the adapters,
with the login in place of a turn token. The runner never uses this mode,
because no runner command carries a login.

- The measure tool gives each adapter the address of its provider:
  `https://api.anthropic.com` for Claude, and `https://api.openai.com/v1`
  for Codex. So its model requests do not use the gateway.
- Codex: the model provider gets that address as `base_url`. The
  `account/login/start` request carries the login.
- Claude: the adapter puts that address in `ANTHROPIC_BASE_URL`, and it
  writes no profile pair.
- `spawnClaudeProcess` starts the `claude` program with one more pipe, on
  file descriptor 3. It adds `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR=3` for
  a subscription token, or `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR=3` for an
  API key. The value is only the number of the descriptor.
- It writes the login and a newline to the pipe. Then it closes its end of
  the pipe. It also closes its end when the program exits first.
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
  adapter starts the program without an IPC channel.

## What these routes do not stop

- The runner adds no gateway address to the environment of the tool
  processes. This does not stop a process of the same sandbox user that
  reads the credentials file of a running turn on purpose.
- A copy of a turn token works only as
  [The turn token](../docs/protocol/model-gateway.md#the-turn-token) says.
  [A sandbox with a version pin of 2 or later](../docs/protocol/isolation.md#a-sandbox-with-a-version-pin-of-2-or-later)
  states these accepted risks.
- The descriptor pipe of the measure tool stops only the automatic copy of
  the developer login into new processes. A process of the same user can
  still read that login on purpose while the tool runs.

## Tests

- `src/commands.test.ts` checks that the runner accepts only a version 2
  `welcome`. It also checks the credential of a `turn` command, and a
  `message` command without a credential.
- The same test checks the refusal of a credential of another agent or of
  an unknown kind, and of a `turn` command that has only a `login`.
- `src/providers/claude-profile.test.ts` checks the paths, the modes, and
  the content of the profile pair. It checks one name for each session,
  and the removal of the file of one session.
- The same test checks the removal of old credentials files before the
  first connection. It also checks that a reconnect keeps a live file.
- `src/providers/claude-login.test.ts` gives the Claude adapter a fake SDK
  query and a fake child process. It checks the two profile variables. It
  also checks that the start of the program has no flag settings, gateway
  address, token, project key, or descriptor.
- The same test checks that the credentials file goes after a close, a
  failed start, and an abort. It also checks that a cancel during the
  write of the profile pair removes the token before the close ends.
- `src/providers/claude-native.test.ts` runs the pinned Claude SDK with a
  fake child process, for both login kinds of the native mode. It checks
  the descriptor variable and the bytes on the pipe.
- With a fake SDK query, the same test checks the close of the pipe and the
  program after a pipe error, a failed SDK setup, and an exit of the child.
- `src/providers/codex-login.test.ts` checks the gateway address in the
  model provider and the turn token in the login request. It checks that
  this request comes before `thread/start` and `thread/resume`, and that a
  refused login opens no thread.
- These tests use fake tokens, fake logins, and no real agent program. So
  they do not show that a real agent program reaches the gateway, or that
  a real login works through it.

## Key code

- `src/commands.ts`: `parseWorkspaceMessage`, which reads the version 2
  commands and the credential of each `turn` command.
- `src/engine-session.ts`: `startProvider`, which gives each adapter the
  gateway address of its agent and the turn token.
- `src/providers/types.ts`: `ProviderOptions`, with the `gateway` and
  `native` credential modes.
- `src/providers/environment.ts`: `providerEnvironment`, the environment of
  each agent program.
- `src/providers/claude-profile.ts`: `writeClaudeProfile`, the profile pair
  of a session, and `clearClaudeCredentials`, the removal of old
  credentials files.
- `src/providers/claude.ts`: the Claude adapter. It gives the SDK the agent
  environment with the profile variables, and the custom spawn.
- `src/providers/claude-process.ts`: `spawnClaudeProcess`, the child process
  of the `claude` program, with the descriptor pipe of the native mode.
- `src/providers/lifetime.ts`: `ProviderLifetime`, which runs the removal
  of the credentials file after the children of the agent exit.
- `src/providers/codex.ts`: the Codex adapter, its model provider settings,
  and the login request.
- `src/runner.ts`: `Runner`, which gives each turn token to the output
  filter, and calls `clearClaudeCredentials` before its first connection.
- `src/measure.ts`: the measure tool, with the native mode and the
  provider addresses.
- [`output-sanitizer.ts`](../src/shared/output-sanitizer.ts):
  `OutputSanitizer`, which keeps each turn token for the output filter.
