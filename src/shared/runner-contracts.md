# Runner contracts

This page belongs to the [shared contracts](README.md).

`runner.ts` defines the versioned handshake, commands, numbered events,
confirmations, and resend rules. Its comments state the delivery contract.
`RunnerProtocolVersion` is 1 or 2. The Worker accepts both versions.
The `welcome` repeats the version of the runner's `hello`.
The optional `hello.loginKinds` declares the login kinds the runner can use.
A version 2 runner without it has only legacy support.
ChatGPT sign-in needs an explicit declaration. Version 1 cannot declare it usable.
`RUNNER_PROTOCOL_VERSION` is 2. The packaged runner sends it, and
each full image build records it.
The credential of a turn belongs to the session starter, whoever sent the
message:

- `RunnerTurnV1` and `RunnerMessageDuringTurnV1` carry the real agent
  login in `login`, with its agent, kind, and secret. Their typed login
  excludes Codex ChatGPT sign-in.
- `RunnerTurnV2` carries a turn token in `credential`, with the agent and
  the login kind. A Codex ChatGPT credential also carries public account
  claims for its temporary login file. It has no `login`.
- `RunnerMessageDuringTurnV2` carries no credential and no login.

`RunnerTurnCredential.promptCacheTtl` is optional and accepts only `'1h'`.
The Worker sets it only for Claude own endpoint turns, which keep the `api-key` kind.
The runner ignores unknown values. An older runner ignores the field.
Neither requires a new protocol version.

`RunnerTurn`, `RunnerMessageDuringTurn`, `RunnerCommand`, and
`WorkspaceToRunner` cover both versions. Their `V1` and `V2` forms give the
shapes of one version. The runner imports the `V2` forms and uses
a turn token.
The [model gateway](../../worker/model-gateway/README.md#model-requests)
gives the form of a turn token.

`account.ts` defines the start and poll contracts of the Codex device code
sign-in. Replies contain the public code and state, never the sign-in tokens.
`RUNNER_EVENT_MAX_BYTES` limits the complete serialized runner event envelope.
The 1 MiB limit leaves room for the workspace storage wrapper.
The workspace stores a refusal marker before it confirms a permanent refusal.
Storage and network failures remain unconfirmed.
After a refused file tree, changes list, start steps, workspace name, or port list,
`RunnerReportRefresh` asks for one fresh full report of that `RunnerReportKind`.
It carries no login and no turn token. A redelivery keeps its command ID.
`ports.ts` defines the common listening-port fields and both report phases.
`RunnerPortsUpdated` carries complete selected private labels.
`PortsUpdated` carries final filtered display labels, with a null list when
there is no current report. The display limits apply only after the workspace
filter. The module owns those limits and the shared count limit.
`terminal.ts` owns `TERMINAL_PORT`, shared by the runner exclusion
and the terminal backend.
[Listening ports](../../docs/protocol/agent-runner.md#listening-ports) states
that report, its limits, and its refresh kind.
`runner-transport.ts` defines the injectable socket boundary.
`RunnerConnection` and `RunnerConnector` take the type of the Worker's
messages.
Browser response types carry no login and no turn token.
`RunnerTurn` and `RunnerMessageDuringTurn` carry the current `branches`: the workspace branch and the target branch.
The current Worker always sends them. A command of an older producer can omit them.
Turn commands also carry the commit author of the member whose message started the turn.
Message commands carry no commit author.
An uploaded attachment reaches the runner as a path, after the backend puts it there.
