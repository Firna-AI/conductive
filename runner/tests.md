# Runner tests and their limits

This guide belongs to [the agent runner](README.md).

- The tests live beside the code as `*.test.ts`. They connect the runner
  to `FakeDurableObjectEndpoint` from the
  [backend and runner fakes](../worker/test-support/README.md). It joins
  file parts, refuses an event with a marker when `refuseEvent` is set, and
  checks no event sizes.
- `test-support/` holds the runner fakes: a fake Claude SDK query, a fake
  Codex App Server, fake agent processes, and a temporary Git repository.
  `harness.ts` starts a `Runner` with them. The session fixture in
  `engine.ts` and the wire fixture in `wire.ts` use the production
  `DiskStorage` in a temporary folder. `disk.ts` supplies the controlled
  disk fixture for the recovery tests, and it can hold one chosen write.
  `mockComputerServer` in `computer-mcp.ts` makes `readComputerServer` give
  the fixed test entry `fakeComputerServer`.
- The relay tests use real local HTTP and WebSocket servers on free ports.
  They check IPv4, IPv6, streams, headers, and disconnects.
  The inherited-descriptor test uses `systemd-socket-activate` with a temporary Unix socket.
  It needs that command, but no running systemd manager.
- The tests need Git. They need no external network, no agent login, no cloud
  account, and no cloud computer. No test starts a real agent program, a
  real Worker, or a real sandbox. So a passing run does not show that the
  gateway path, a real login, or the `computer` MCP server works.
- `scripts/codex-capabilities.mjs` checks what the Codex SDK streams and
  whether an abort stops it. Each model request goes to a local fake server.
- The [import activation guide](import.md#tests) gives the tests of the import
  commands and the restore.
