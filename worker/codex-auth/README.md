# Codex ChatGPT sign-in

This area runs the device code sign-in of the pinned Codex client for the
account API. It also gives the model gateway a fresh ChatGPT token bundle.
The Worker keeps the real login. No browser response contains its tokens.

## Responsibilities

The device service encrypts pending authorizations under the signed-in
account and a hash of the browser handle. D1 claims serialize polls and
exchanges. A terminal state removes the encrypted authorization. The
scheduled cleanup removes records at their 15-minute expiry.

The renewal service reads the encrypted `agent_logins` value. A local
promise joins overlapping calls in one isolate. A D1 claim coordinates
different isolates. The service never takes over an abandoned claim,
because OpenAI can already have consumed its refresh token.

Renewal stores the full rotated bundle before it returns its access
token. It keeps the login date and share setting. A refused or ambiguous
renewal saves a safe failure cause. Reconnect clears the cause and claim.
A pasted access-token value from an earlier version is also unusable.
The Worker asks for a new ChatGPT sign-in instead of sending it to a runner.
The model gateway also records a terminal 401 after the allowed recovery.
That write checks the failed access token and the stored ciphertext.
It requires a null D1 refresh claim and never clears another request's claim.
A newer sign-in or a renewal in flight therefore stays usable.

The gateway observes a concurrent rotation for up to 5 seconds through a
read-only service with injected `wait` and `now` dependencies.
It reads both the D1 claim and the turn's pending recovery flag.
The turn flag covers the window before renewal takes the D1 claim.
The observer reads that flag before its token snapshot, so completion cannot
leave it with an older token snapshot and a cleared flag.
The observer returns the committed tokens, an unchanged login, or a pending state.
It never takes a refresh claim or calls OAuth.
Pending at the deadline gives retryable HTTP 502 without a saved cause.
The gateway keeps the turn pending until the winning renewal finishes,
also when the owning request disconnects.

The HTTP client uses fixed OpenAI addresses and the pinned Codex client
ID. It sends no HTTP retry. Poll and code exchange share a 30-second
timeout. Renewal also has a 30-second timeout.
The device poll interval defaults to 5 seconds and never falls below it.

## Development

Run `npm run test -- worker/app-api/codex-device.test.ts worker/codex-auth/renew.test.ts`
from the repository root. The tests use local D1, fake OpenAI responses,
explicit request barriers, and an injected clock.
[`rotation.test.ts`](rotation.test.ts) also checks completion during the
observer's pending-state check.

### Key code

- [`device.ts`](device.ts): `startCodexDevice` and `pollCodexDevice` run
  account-owned device sign-in.
- [`device-store.ts`](device-store.ts): claimed device writes and
  `cleanupCodexDevices` for scheduled expiry cleanup.
- [`renew.ts`](renew.ts): `freshCodexLogin` renews before expiry. Its
  optional failed access token forces one renewal after an upstream 401.
  A call with an older failed token reads the committed rotation.
- [`token-store.ts`](token-store.ts): compare-and-swap token renewal writes.
- [`failure.ts`](failure.ts): `failCodexAccessToken` saves the reconnect cause
  only for the stored access token that failed at the gateway, without a refresh claim.
- [`rotation.ts`](rotation.ts): `waitForCodexRotation` observes a concurrent
  recovery without starting another renewal.
- [`tokens.ts`](tokens.ts): `CodexTokens`, the stored bundle parser, and
  the identity parser for trusted OAuth replies.
- [`oauth.ts`](oauth.ts): the fixed device, exchange, and renewal requests.

### Related docs

- [App API](../app-api/README.md)
- [Model gateway](../model-gateway/README.md)
- [Tokens and secrets](../../docs/protocol/tokens-and-secrets.md)
