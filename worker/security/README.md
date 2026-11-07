# Sign-in and request gate

This area checks browser sign-in, request origins, and org membership.
Protected app requests pass through `gate` before route dispatch.
The gate checks access before it reads a write body.
Open chat tabs and terminal sockets check their access again through the [shared connection reader](#open-connections).
Sign-in also asks for the [terms consent](#terms-consent) and refuses [suspended users](#suspended-users).

## JSON request bodies

The gate calls `readJsonObject(request)` once for each write.
The call follows the session and org access checks.
The [shared JSON request reader](../http/README.md#json-request-objects) owns content type normalization, parsing, and object checks.
The [Worker entry](../http/README.md#request-body-limit) owns the byte limit and the HTTP 413 response.
A body error prevents route dispatch.

## Open connections

A chat tab or a terminal socket stays open after the gate admits it.
`readConnectionAccess(db, identities, now)` checks the access of such open connections.
One D1 query checks a whole batch of identities.
It returns one grant for each identity that still has access.
The workspace Durable Object calls it for chat tabs.
The Worker calls it for terminal sockets.
The preview proxy calls it for each preview request and each batch of preview data.

Each identity holds a session ID, a user ID, an org ID, and a workspace ID.
Every identity passes only when all of these are true:

- The session belongs to that user and is not expired.
- The user is not suspended.
- The user is a member of the org.
- The org is not deleted.
- The workspace belongs to that org.

Each identity also has one of three kinds:

- `workspace`: chat tabs use it. It needs nothing more, because chat history stays readable after a stop or an archive.
- `sandbox`: terminal sockets use it. It also holds a sandbox ID. That ID must still be the sandbox of the workspace. The workspace must also be in a running state and not archived. The running states are `ready`, `working`, `unread`, and `input`. The owner of the workspace must not be suspended. `sandboxAccessPredicate` from [`sandbox-access.ts`](../data/sandbox-access.ts) holds these rules, as [Sandbox access](../operator/README.md#sandbox-access) says.
- `preview`: preview requests and preview data use it, through `readPreviewAccess` of the [preview backend](../previews/README.md). It holds the preview ID, the hostname, and the expiry of the preview credential, and no sandbox ID. It needs the rules of `sandboxAccessPredicate`, so the workspace must have a sandbox in a running state and an owner who is not suspended. It does not pin one sandbox, so a credential keeps working after the workspace gets a new sandbox. The preview must also be of that workspace, not revoked, and not expired. The expiry of the credential must be in the future and no later than the expiry of the preview. Its grant also returns the current preview record.

The `connectionNumber` of a grant is the index of its identity in the input.
The grant deadline is the earlier of the session expiry and `now` plus 30 seconds.
The `preview` kind also limits it by the preview expiry and the credential expiry.
Callers pass the start time of the read as `now`.
So a slow read cannot extend a grant.
An identity without a grant has lost access.

The reader closes nothing and keeps no timer.
Each caller keeps its own registrations and timers.
Each caller reads the first grant of a connection before it sends data.
The preview proxy reads again for each request and each data batch, and it keeps no grant.
The chat tabs and the terminal sockets also follow these rules:

- Refresh all live grants in one read every `CONNECTION_CHECK_MS`, 15 seconds. So a refresh has time to finish before the previous grant ends.
- Check the grant deadline before each send, without a D1 read.
- Close each connection at its deadline, also while a refresh read waits.
- Close every connection of a batch when its read fails.
- Ignore a late result for a connection that is already closed.

`scheduleConnectionCheck` is the default timer of both callers.
Tests replace it with their own `ConnectionScheduler`.

## Terms consent

Each GitHub sign-in starts after an agreement to the current Terms.
`TERMS_VERSION` in [`src/shared/terms.ts`](../../src/shared/terms.ts) names the current revision.

- `startSignIn` sends the browser to GitHub only when the address of `API_PATHS.githubSignIn` has the current revision as its `terms_version` value.
- The sign-in screen of the app shows the agreement, and its button opens `acceptedTermsSignInPath()`, which adds that value.
- Without the current revision, as in the browser sign-in of the Mac app, the Worker answers with an HTML agreement page.
  `termsConsentPage` in [`src/marketing/sign-in-consent.ts`](../../src/marketing/sign-in-consent.ts) makes it.
  Its Continue with GitHub link adds the current revision and keeps the `desktop_challenge` of the Mac app.
  Its links lead to the Terms and Privacy pages on `MARKETING_ORIGIN`, or on the product domain without that setting.
- The signed OAuth state cookie carries the revision to the callback. A `terms_version` value in the callback address counts for nothing.
- The callback creates a new account only when its signed state carries the current revision.
  Otherwise it answers 403 `terms_acceptance_required`, and it saves no user and no session.
- Each sign-in whose signed state carries the current revision saves that revision in the `terms_version` column of `users`.
  It saves the server time in `terms_accepted_at` only when the stored revision differs, so a repeat of the same revision keeps the first time.
  This holds for a new account, an account from before the Terms, and an account with an older revision.
- A sign-in whose signed state carries no current revision keeps the stored values of an existing account.
- No session or request checks the revision after the sign-in.
  A new `TERMS_VERSION` applies to each user at the next sign-in, and `SESSION_SECONDS` in `auth.ts` and `desktop-auth.ts` keeps each session to 7 days.
  [Sign-in](../../docs/protocol/access-and-security.md#sign-in) states the rule.

## Suspended users

The [operator action](../operator/README.md) records a suspension on a user and deletes all of their sessions.
After that, each entry of this area refuses that user:

- The GitHub callback answers 403 `user_suspended`, and it saves no session.
- The sign-in exchange of the Mac app answers 403 `user_suspended`, and it sets no cookie.
- `sessionUser` finds no user for a suspended account. So the gate answers 401 `sign_in_required` to each session of that user.
- `readConnectionAccess` gives a suspended user no grant. So their open chat tabs and terminal sockets close at the next refresh, and their preview requests and preview data stop at the next check.

## Development

Run `npm run test -- worker/security/gate.test.ts worker/security/gate-body.test.ts worker/http/bounded-body.test.ts` from the repository root.
Use Node 24.
The body tests use streams with deterministic pull and cancellation counts.
They send multibyte text to check byte counts.
They also send incorrect `Content-Length` values in both directions.

The connection reader has no test file in this folder.
The tests of its callers check it.
After a change to the reader, run `npm run test -- worker/chat/tab-access.test.ts worker/chat/tab-deadlines.test.ts worker/chat/security.test.ts worker/terminal/access.test.ts`.

After a change to the terms consent or to the suspension checks of sign-in, run `npm run test -- worker/security/terms.test.ts worker/security/auth.test.ts worker/operator/route.test.ts`.

### Key Code

- [gate.ts](gate.ts) checks the host, origin, session, membership, and JSON body.
- [connection-access.ts](connection-access.ts) exports `readConnectionAccess`, the identity and grant types, `CONNECTION_CHECK_MS`, and `scheduleConnectionCheck`.
- [gate-body.test.ts](gate-body.test.ts) checks the exact body limit and early cancellation through HTTP routes.
- [gate.test.ts](gate.test.ts) checks access, dispatch order, and JSON errors.
- [auth.ts](auth.ts) starts and finishes GitHub sign-in, with the terms consent and the suspension check.
- [terms.test.ts](terms.test.ts) checks the consent at the start of sign-in and the consent record of new and existing accounts.
- [cookies.ts](cookies.ts) builds and reads the session cookies.
- [crypto.ts](crypto.ts) signs and verifies tokens.

### Related Docs

- [Access requirements](../../docs/protocol/access-and-security.md#hostnames-and-gates)
- [Access of open tabs](../../docs/protocol/access-and-security.md#orgs-and-workspaces)
- [Worker backend](../README.md)
- [Operator actions](../operator/README.md)
