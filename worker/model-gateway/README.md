# Workspace model gateway

This area makes and checks the turn credentials of a workspace.
Trusted Worker callers use the workspace runtime for checks.
Production runner delivery does not request or send these tokens yet.
The [model gateway protocol](../../docs/protocol/model-gateway.md) states the requirements.

Run `npm run test -- worker/model-gateway` from the repository root.
The tests use the chat harness, local D1, and the real workspace RPC with SQLite storage.

### Key Code

- [workspace.ts](workspace.ts): `WorkspaceTurnTokens.forRunningTurn` derives a stable token from the turn record.
  Its caller holds the chat queue, as runner dispatch does.
  `check` enters that queue and returns the current starter login or a stable refusal reason.
- [token.ts](token.ts): `turnTokenRoute` reads the workspace and turn route.
  HMAC derives the credential with a dedicated context and the Worker encryption key.
  Web Crypto verifies the signature in constant time.
  The turn keeps only a random nonce and the login version for this derivation.
- [login.ts](login.ts): `gatewayLogin` checks starter access and reads the login row with its `updated_at` version.
  `decryptGatewayLogin` releases the login only after the turn check accepts that version.
- [types.ts](types.ts): `TurnTokenCheck` and `TurnTokenEndpoint` define the trusted check result and RPC method.
- [../workspace-lifecycle.ts](../workspace-lifecycle.ts): `checkTurnToken` selects the workspace from stored chat metadata.
  [../lifecycle/workspace-transport.ts](../lifecycle/workspace-transport.ts) carries it through the workspace runtime.
- [../chat/turn-lifecycle.ts](../chat/turn-lifecycle.ts): `TurnLifecycle.stop` saves the interrupt before a gateway failure ends the turn.
  The saved failure cause survives a restart between Stop and the failed end.
  The common publisher sends the failed end before its session update.
- [fixture.test-support.ts](fixture.test-support.ts): a running turn whose session starter differs from its message sender.
- [workspace.test.ts](workspace.test.ts), [login.test.ts](login.test.ts), and [runtime.test.ts](runtime.test.ts): token lifetime, login changes, event order, retry, and RPC storage tests.
