# Invalid event cursors become server errors

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from PR #148, branch `calummoore/workspace-open-error`, review round 3, finding 3, with option D of its check.
- **Location:** the cursor read at `worker/chat/sockets.ts:37`, the route catch at `worker/chat/sockets.ts:42-45`, the socket acceptance at `worker/chat/browser-connections.ts:56-81`, and the login refresh at `worker/chat/browser-subscription.ts:28`.
- **Reason:** The web app and the Mac app always send a valid cursor, so only a malformed request from outside the product meets this bug.

- **Terms:**
  - **Events route:** the authenticated WebSocket upgrade `GET /api/orgs/<org>/workspaces/<workspace>/events?after=<cursor>`. A workspace tab gets its stored history and then its live events through it.
  - **Event cursor:** the `after` query value. It tells the events route which stored event the browser last received.
  - **BrowserConnections:** the owner in `worker/chat/browser-connections.ts` that accepts and restores the physical sockets of browser tabs.
  - **Accepted socket:** a server socket that `WorkspaceSockets.accept` gave to the hibernation API of the workspace object, at `worker/native-sockets.ts:89-95`.
  - **Login refresh:** the call `operation.logins.refresh()` at `worker/chat/browser-subscription.ts:28`. It updates the login state of the open sessions before the tab registers.
- **Background:**
  - The web app and the Mac app keep the cursor as an in-memory integer that starts at 0, at `src/app/events.ts:67` and `:78`. It only moves to a larger server event number, at `:119-121`. The socket opens at `:240`.
  - The browser `WebSocket` API hides the HTTP status of a failed upgrade.
  - `afterNumber` at `worker/chat/http-routes.ts:14-17` reads the cursor with `counter(Number(value))`. `number` at `worker/chat/inputs.ts:28-32` rejects `-1` and `NaN`, such as `Number('bad')`. `counter` at `:34-38` rejects `0.5`.
  - Each rejection throws `HttpError(400, 'invalid_input')`, at `worker/chat/inputs.ts:8-10`. The `/history` route uses the same parser, at `worker/chat/http-routes.ts:42`.
  - `WorkspaceChat.fetch` maps each route error through `errorResponse`, at `worker/chat/backend.ts:158-159` and `worker/http.ts:14-32`. An `HttpError` keeps its status. Any other error becomes HTTP 500 `internal_error`.
  - At commit `ab584679` on `main`, `browserUpgrade` accepted the socket at `worker/chat/sockets.ts:29`, before it read the cursor at `:38`. The hibernation change moved the acceptance into `BrowserConnections.subscribe`, at `worker/chat/browser-connections.ts:56-72`. It kept the route catch unchanged.
  - After the acceptance, `subscribeBrowser` in `worker/chat/browser-subscription.ts` runs in this order:
    1. The login refresh runs at `:28`, when the workspace is not archived.
    2. `BrowserTabs.add` registers the tab at `:30-42`. Its `.catch` at `:43-50` closes the peer and rethrows.
    3. The history pages go out at `:51-63`. Their `catch` at `:64-67` runs `unsubscribe()`. It removes the registration and schedules the access alarm again.
  - So when the login refresh fails, only the route catch at `worker/chat/sockets.ts:42-45` closes the accepted socket today. A fix that only removes that catch leaves the accepted socket open.
  - Requirements:
    - No protocol doc states the response to an invalid cursor. The 400 comes from the shared input parser, and the route returned it before the hibernation change. The fix restores it and adds no requirement.
    - An open tab loses its workspace connection within 30 seconds after its user loses access, as `docs/protocol/isolation.md:28-33` says. A failed admission returns no 101, so no tab connects. The rule still supports a close of each accepted socket after a failed admission.
  - Tests today:
    - No chat or integration test sends an invalid cursor. The native tests use valid cursors.
    - The failed-admission cases at `worker/chat/tab-deadlines.test.ts:58-100` and `:101-126` use test tabs with no physical socket, through `openBrowser`. They never reach `browserUpgrade` or `WorkspaceSockets.accept`.
    - The native `open` helper fails on any status other than 101, at `worker/chat/browser-native.test-support.ts:54-55`.
    - The native `fail` switch runs only after a tab is open, at `worker/chat/browser-native-access.test.ts:233`.
    - The route failure cases at `worker/chat/integration/forwarding.test.ts:116-169` use `/sessions`.
- **Problem:**
  - An authenticated upgrade with `after=-1`, `after=bad`, or `after=0.5` returns HTTP 500 `internal_error`. At `ab584679`, each returned HTTP 400 `invalid_input`. A valid cursor still returns HTTP 101 and the history.
  - The cause, in order:
    1. `browserUpgrade` reads the cursor inside its `try` at `worker/chat/sockets.ts:34-41`, before `BrowserConnections` accepts the socket.
    2. The parser throws the 400 error.
    3. The `catch` at `:42-45` calls `server.close()` on the socket that nobody accepted.
    4. The runtime throws a TypeError: `You must call one of accept() or state.acceptWebSocket() on this WebSocket before sending messages.`
    5. The TypeError replaces the 400 error, and `errorResponse` maps it to HTTP 500.
  - Evidence from a one-time run on 2026-11-10:
    - It built the real production `Workspace` at `ab584679` and at `e247f3af`, the reviewed commit of the hibernation change.
    - Each build ran in the pinned Miniflare, with native SQLite storage and real D1. The run applied the migrations and seeded an authorized user, session, org, and workspace.
    - Each request had a signed session cookie, the correct `Origin`, and `Upgrade: websocket`.
    - At `ab584679`, `-1`, `bad`, and `0.5` returned HTTP 400 `invalid_input`. `0` returned HTTP 101 and a `history` frame.
    - At `e247f3af`, `-1`, `bad`, and `0.5` returned HTTP 500 `internal_error`. `0` returned HTTP 101 and a `history` frame.
    - The 400 body was `{"error":{"code":"invalid_input","message":"Check the message and try again."}}`.
    - The 500 body was `{"error":{"code":"internal_error","message":"The request failed. Try again."}}`.
    - A smaller probe in the pinned runtime showed that `server.close()` before acceptance throws the TypeError above.
- **Impact if no action:** A malformed request from outside the product gets HTTP 500 in place of HTTP 400. It can add a false 5xx count. A client that follows the message "The request failed. Try again." repeats a request that cannot succeed. `worker/http.ts`, `worker/chat/backend.ts`, and `worker/app.ts` log no error, so an operator sees only the status. The failure leaves no accepted socket or saved state.
- **Root question:** How should every failed events upgrade return its own error, and close the browser socket only when it was accepted?
- **Options:**
  - **A.** Read the cursor outside the socket cleanup block. Keep the existing method and upgrade checks first. Add the route regression case. This fixes the known cursor path, but it leaves the route responsible for the acceptance state. Effort: Small.
  - **B.** Keep the original failure when the cleanup close also throws. Add the route regression case. This protects the error response, but it keeps the cleanup split between the route and `BrowserConnections`. Effort: Small.
  - **C.** Give `BrowserConnections` the cleanup of the physical sockets that it accepts. Remove that cleanup from the route. Add the route regression case, and keep the existing failed-admission cleanup assertions. The accepting owner then controls the complete socket lifetime. Effort: Small.
    - As written, C passes its tests also when the owner catch covers only `BrowserTabs.add`. Then nothing closes the accepted socket after a login refresh failure.
  - **D.** Do C with its complete scope. Two production files change, so the risk is low. Effort: Small.
    - In `BrowserConnections.subscribe`, put one catch around the whole `subscribeBrowser` promise. Add it only when the method accepted a socket. It then covers the login refresh, `BrowserTabs.add`, and every history page.
    - On a failure, close the accepted socket once, on a best-effort basis. Catch and ignore any error of that close. Then rethrow the original error, so no cleanup exception can replace it.
    - A ready-state check alone does not give this guarantee. The close in `closeSocket` at `worker/chat/browser-connections.ts:148-154` shows the pattern: a ready-state check, and a catch around the close.
    - Skip the close when the peer is already closed. The `.catch` in `subscribeBrowser` and `BrowserTabs.check` at `worker/chat/browser-tabs.ts:99-105` can close it first.
    - A failure before the acceptance gets no close. A test tab with no physical socket gets no new close.
    - Remove the `try` and its close from `browserUpgrade`.
    - Keep the `.catch` close and the `unsubscribe()` in `subscribeBrowser`.
    - Keep `closeSocket` and its close-first recovery at `worker/chat/browser-connections.ts:143` unchanged.
    - Keep the failed-admission cases at `worker/chat/tab-deadlines.test.ts:58-126` unchanged. They expect HTTP 404 `workspace_not_found`, and the first case expects exactly one close.
    - Regression cases, through the authenticated events route of the real workspace object in the native fixture:
      - One representative invalid cursor, such as `after=bad`, returns HTTP 400 `invalid_input`. Add no separate case for each invalid value.
      - `after=0` returns HTTP 101 and one `history` frame.
      - A login refresh failure after the acceptance and before the tab registration returns the original error response. It closes the socket once, and it leaves no `OPEN` accepted socket and no saved registration.
    - Failure proof:
      - The invalid-cursor case fails on the current code with HTTP 500. Write it first.
      - The login refresh case passes on the current code, because the route catch closes the socket. Run it with no route catch and an owner catch around only `BrowserTabs.add`. It must then fail on its socket assertion.
      - Each failure must come from an assertion about the behaviour, not from the setup.
      - Keep the native cases deterministic, with no sleep or retry. Run each new case 10 times.
      - Add no gate, lint, or test for the whole defect class.
  - **E.** Add a shared admission operation to `WorkspaceSockets`. It accepts the socket, runs the admission work of the role, closes the socket on a best-effort basis on failure, and rethrows the original error. Use it at all four acceptance sites: `worker/chat/browser-connections.ts:60`, `worker/chat/runner-connections.ts:94`, `worker/devices/broker-routes.ts:92`, and `worker/devices/native-sockets.ts:68`. It protects future roles. But it changes the working order of the runner and Mac admission code, and it needs a failure case for each role. Effort: Medium.
- **Left out:**
  - Keep HTTP 500 for invalid cursors. It fails the goal and the existing input-error behaviour.
  - Accept the socket before the cursor check. It returns 400, as the earlier code did. But it creates a native attachment and a hibernation entry for an invalid request, so A is better on every point.
  - Check the cursor in the browser authorization, in `authorizeBrowser` and `BrowserAccess`. It is A at an earlier call site, and it fixes only the cursor.
  - A peer wrapper that records whether the socket was accepted. It keeps the route close of B, and it adds one more state flag.
  - Let the route ask the owner whether it accepted the socket. D is better on every point: one owner and no new query.
  - Change the web app. The browser API hides the status, and the app already sends valid cursors.
- **Wider fix:** D. It gives the accepting owner the complete failed-admission lifetime, including an early login refresh failure. C alone can leave that failure out. E is wider across the roles, but this class has one known site. Each role also keeps its own queue and authority order.
- **Previous examples:** None found. The search covered the history of `worker/chat/sockets.ts` on `main`, changes to cleanup, cursors, and acceptance, and `plans/` for unaccepted sockets and cleanup failures.
- **Recommendation:** D, not C, which the review first recommended. D is C with its complete scope. It also tests the failure after the acceptance that an invalid-cursor case alone cannot cover.
- **Action:** fix after merge, apply D, because this is a Low, Rare product bug and both permitted fix rounds of the source branch are used.
