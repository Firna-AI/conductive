# Sign-in and request gate

This area checks browser sign-in, app access, request origins, and org membership.
Protected app requests pass through `gate` before route dispatch.
The gate checks access before it reads a write body.
`sessionGate` owns the host, Origin, session, and app access checks.
The chat and feature routers use it before forwarding an unread request to a workspace object.
Open chat tabs and terminal sockets check their access again through the [shared connection reader](#open-connections).
Sign-in also asks for the [terms consent](#terms-consent) and refuses [suspended users](#suspended-users).

Org writes also check the current suspension before the gate reads their body.
The exact POST Leave route keeps its existing membership guards.
Org reads and chat-tab grants remain available.
`org-writes.ts` shares this rule with the members and Mac browser gates.

## Access checks

`gateAccess(request, env, now)` holds the access checks of `gate`, and reads no body.
It calls `sessionGate` for the host, Origin, signed session, and app-access checks.
It also checks the user, the org membership, and the org write rule of `org-writes.ts`.
`gate` calls it first.
Then `gate` reads the JSON body of a write, or the headers of a raw upload route.

The chat Durable Object runs `gateAccess` again in its queue for each browser chat write, through `authorizeChatBrowser`.
That call reuses the body that `gate` already parsed, because `gateAccess` takes no body argument.
So a write that waited gets the refusal that a new request would get.
The [chat backend](../chat/access.md) says which requests take this second check.

## JSON request bodies

The gate calls `readJsonObject(request)` once for each write, except a raw upload route.
The call follows the session and org access checks.
The [shared JSON request reader](../http/README.md#json-request-objects) owns content type normalization, parsing, and object checks.
The [Worker entry](../http/README.md#request-body-limit) owns the byte limit and the HTTP 413 response.
A body error prevents route dispatch.

For a [raw upload route](../http/README.md#raw-upload-routes), the gate reads no JSON.
Only the two part PUT routes get this raw-body exception.
The multipart start and complete POSTs remain JSON writes.
After the session, org access, and org write checks, it calls `rawUploadLength(request, maxBytes)` from the route registry.
That check needs the content type `application/octet-stream` and a valid `Content-Length` header.
The gate puts the declared length in `RequestContext.rawUploadBytes`, and leaves the body unread for the route.
It refuses a request with no content type, because such a request needs no preflight, so a page on another site could send it.

## Open connections

A chat tab or a terminal socket stays open after the gate admits it.
`readConnectionAccess(db, identities, now)` checks the access of such open connections.
One D1 query checks a whole batch of identities.
It returns one grant for each identity that still has access.
The workspace Durable Object calls it for chat tabs.
The Worker calls it for terminal sockets.
The preview proxy calls it for the checks of each preview viewer. One read covers that
viewer's requests and data batches for 1 second, as the [preview backend](../previews/README.md) says.

Each identity holds a session ID, a user ID, an org ID, and a workspace ID.
Every identity passes only when all of these are true:

- The session belongs to that user and is not expired.
- The user is not suspended.
- The user is a member of the org.
- The org is not deleted.
- The workspace belongs to that org.

Each identity also has one of three kinds:

- `workspace`: chat tabs use it. It needs nothing more, because chat history stays readable after a stop or an archive.
- `sandbox`: terminal sockets use it. It also holds a sandbox ID and its provider account. Both must still match the sandbox of the workspace. The workspace must also be in a running state and not archived. The running states are `ready`, `working`, `unread`, and `input`. The owner of the workspace must not be suspended. `sandboxAccessPredicate` from [`sandbox-access.ts`](../data/sandbox-access.ts) holds these rules, as [Sandbox access](../operator/README.md#sandbox-access) says.
- `preview`: preview requests and preview data use it, through `readPreviewAccess` of the [preview backend](../previews/README.md). It holds the preview ID, the hostname, and the expiry of the preview credential, and no sandbox ID. It needs the rules of `sandboxAccessPredicate`, so the workspace must have a sandbox in a running state and an owner who is not suspended. It does not pin one sandbox, so a credential keeps working after the workspace gets a new sandbox. The preview must also be of that workspace, not revoked, and not expired. The expiry of the credential must be in the future and no later than the expiry of the preview. Its grant also returns the current preview record.

The `connectionNumber` of a grant is the index of its identity in the input.
The grant deadline is the earlier of the session expiry and `now` plus 30 seconds.
The `preview` kind also limits it by the preview expiry and the credential expiry.
Callers pass the start time of the read as `now`.
So a slow read cannot extend a grant.
An identity without a grant has lost access.

The reader closes nothing and keeps no timer.
Each caller keeps its own registrations and deadlines.
Each caller reads the first grant of a connection before it sends data.
The preview proxy reads again for each request and each data batch, and it keeps no grant.
The chat tabs and the terminal sockets also follow these rules:

- Refresh all live grants in one read every `CONNECTION_CHECK_MS`, 15 seconds. So a refresh has time to finish before the previous grant ends.
- Check the grant deadline before each send, without a D1 read.
- Close each connection at its deadline, also while a refresh read waits.
- Close every connection of a batch when its read fails.
- Ignore a late result for a connection that is already closed.

A physical tab socket keeps its deadlines in the durable `browser` alarm source, as [Alarms](../README.md#alarms) says.
So a refresh and an expiry also run after a wake, and while the member or lifecycle work of the object waits.
Each refresh passes its start time as `now`, and each tab closes at its stored deadline.
The terminal sockets use `scheduleConnectionCheck`, an in-memory timer, because an open terminal bridge keeps the object active.
An abstract tab peer of a feature test, which has no physical socket, uses the `ConnectionScheduler` that the test injects. The terminal tests inject one too.

## Terms consent

Each GitHub sign-in starts after an agreement to the current Terms.
`TERMS_VERSION` in [`src/shared/terms.ts`](../../src/shared/terms.ts) names the current revision.

- `startSignIn` sends the browser to GitHub only when the address of `API_PATHS.githubSignIn` has the current revision as its `terms_version` value.
- The sign-in screen of the app shows the agreement, and its button opens `acceptedTermsSignInPath()`, which adds that value.
- Without the current revision, as in the browser sign-in of the Mac app, the Worker answers with an HTML agreement page.
  `termsConsentResponse` in [`marketing/consent.ts`](../marketing/consent.ts) reads it from the Astro build.
  It fills the Continue address and site origin as escaped text.
  It keeps the site's security headers and `Cache-Control: no-store`.
  Its Continue with GitHub link adds the current revision and keeps the `desktop_challenge` of the Mac app and the `invite_code` of a join link.
  Its links lead to the Terms and Privacy pages on `MARKETING_ORIGIN`, or on the product domain without that setting.
- The signed OAuth state cookie carries the revision to the callback. A `terms_version` value in the callback address counts for nothing.
- The signed state also carries the join code. A code in the callback address counts for nothing.
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

## App access at sign-in

Each sign-in saves the GitHub account creation time and its primary verified
email. A missing primary verified email saves no address.
`signInAppAccess` runs the shared [grant step](../waitlist/README.md) in
this order:

1. The `operator` source, for an operator.
2. The `open_signup` source during open sign-up, for a user still without
   app access.
3. A signed join code, only for a user still without app access.

So an operator keeps the `operator` source, and open sign-up takes no use
of a join code. A failed code still creates a sign-in session.
Its browser redirect keeps the code and the reason on the join path.
The Mac handoff follows the same access grant before its session exchange.

Each new account starts without app access unless its operator identity,
open sign-up, or a signed join code grants access. A repeat sign-in
preserves existing access. Accounts migrated from before the waitlist
keep the `existing` source. [Waitlist](../../docs/protocol/waitlist.md) and
[Open sign-up](../../docs/protocol/sign-ups.md#open-sign-up) state the
complete access rules.

## App access gate

[`app-access.ts`](app-access.ts) owns the single allow list for a session
without app access:

- `GET /api/session`
- `POST /api/auth/logout`
- `GET /api/waitlist`
- `POST /api/waitlist/code`
- `GET /api/invites`
- `POST /api/invites/<inviteId>/accept`

The invitation route still checks that the pending invitation belongs to
the signed-in user. Every other method or path gets HTTP 403
`access_required`. Every upgrade gets the same refusal, including an
upgrade of an allowed read. Public sign-in, its callback and Mac exchange,
health, and desktop preflights keep their own entry rules.
An upgrade outside the API also runs the session gate before asset dispatch.

During open sign-up, the check first grants the `open_signup` source to a
user without app access. It then reads app access again, so the request
passes also when another request saved a grant first. When no grant
happens, for example after a pause that commits first, the allow list
applies. While the waitlist is on or sign-ups are paused, the check writes
nothing. Each check reads D1, and it keeps no copy of app access, the
switch, or the pause. The grant records the request time that the caller
passes to the gate. The Mac device routes pass the clock of the Worker
dependencies, as the other app routes do.

The check follows the active session read. It precedes membership checks,
operator checks, route dispatch, and JSON reads. `gate` accepts the original
request separately when a caller changes the request for its later checks.
The members gate and the body-free device gate supply that original
request, so its method, path, and Upgrade header govern app access.

## Development

Run `npm run test -- worker/security/gate.test.ts worker/security/gate-body.test.ts worker/http/bounded-body.test.ts` from the repository root.
Run `npm run test -- worker/security/raw-upload.test.ts worker/chat/write-access.test.ts` for raw uploads and queued write admission.
Use Node 24.
The body tests use streams with deterministic pull and cancellation counts.
They send multibyte text to check byte counts.
They also send incorrect `Content-Length` values in both directions.

The connection reader has no test file in this folder.
The tests of its callers check it.
After a change to the reader, run `npm run test -- worker/chat/tab-access.test.ts worker/chat/tab-deadlines.test.ts worker/chat/security.test.ts worker/terminal/access.test.ts`.
After a change to the alarm deadlines of open connections, also run `npm run test -- worker/chat/adapter.test.ts worker/chat/browser-native-access.test.ts worker/chat/runner-native-access.test.ts worker/features/security-alarms.test.ts worker/devices`.

After a change to the terms consent or to the suspension checks of sign-in, run `npm run test -- worker/security/terms.test.ts worker/security/auth.test.ts worker/operator/route.test.ts`.
Run `npm run test -- worker/security/waitlist-auth.test.ts worker/security/waitlist-join.test.ts` for the access grants and their order, primary email, and signed join codes.
Run `npm run test -- worker/security/waitlist-gate.test.ts worker/security/waitlist-open-signup.test.ts worker/security/waitlist-desktop.test.ts worker/devices/waitlist.test.ts` for the waiting-session gate, its open sign-up grant, and Mac access transitions.

### Key Code

- [gate.ts](gate.ts) checks the host, origin, session, app access, membership, and JSON body, or raw upload headers.
  Its body-free `gateAccess` repeats access checks for queued chat writes.
- [raw-upload.test.ts](raw-upload.test.ts) checks admission before raw body reads and the required headers.
- [app-access.ts](app-access.ts) grants open sign-up access, then checks the original request against the waiting-session allow list.
- [waitlist-gate.test.ts](waitlist-gate.test.ts) checks waiting sessions, the open sign-up grant at the next request, allowed requests, default refusals, and suspensions.
- [waitlist-open-signup.test.ts](waitlist-open-signup.test.ts) checks the gate grant when another grant wins or a pause wins first, and the operator that the record names.
- [connection-access.ts](connection-access.ts) exports `readConnectionAccess`, the identity and grant types, `CONNECTION_CHECK_MS`, and `scheduleConnectionCheck`.
- [gate-body.test.ts](gate-body.test.ts) checks the exact body limit and early cancellation through HTTP routes.
- [gate.test.ts](gate.test.ts) checks access, dispatch order, and JSON errors.
- [auth.ts](auth.ts) starts and finishes GitHub sign-in, with the terms consent and the suspension check.
- [sign-in-access.ts](sign-in-access.ts) applies the operator, open sign-up, and join-code grants, in that order, before either session flow.
- [github.ts](github.ts) reads the GitHub identity, creation time, and verified emails with their primary flag.
- [terms.test.ts](terms.test.ts) checks the consent at the start of sign-in and the consent record of new and existing accounts.
- [cookies.ts](cookies.ts) builds and reads the session cookies.
- [crypto.ts](crypto.ts) signs and verifies tokens.

### Related Docs

- [Access requirements](../../docs/protocol/access-and-security.md#hostnames-and-gates)
- [Access of open tabs](../../docs/protocol/isolation.md#orgs-and-workspaces)
- [Open sign-up](../../docs/protocol/sign-ups.md#open-sign-up)
- [Worker backend](../README.md)
- [Operator actions](../operator/README.md)
