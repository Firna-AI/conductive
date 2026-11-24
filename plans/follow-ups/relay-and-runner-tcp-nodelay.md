# Preview relay and runner keep Nagle on

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-5-speed-of-lg7b`, items 4 and the outside-scope note of the Milestone 5 speed report of the own computers plan.
- **Location:** `crates/cnd-relay/src/listener.rs:73` and `crates/cnd-runner/src/socket.rs:67`
- **Reason:** Both programs run in production today, and the own computers change does not touch them.

- **Terms:**
  - **Preview relay:** the small server in each sandbox that forwards each port preview request from `127.0.0.1:7682` to the local port of a dev server.
  - **Nagle's algorithm:** a TCP setting that holds a small write until the previous write is acknowledged. `TCP_NODELAY` turns it off.
- **Background:**
  - The preview relay sets no `TCP_NODELAY` on the connections that it accepts or opens.
  - On a real Boat sandbox, a module response through the relay sent its head after 1.0 ms and its end after 41.9 ms. A page of 100 modules took 711 ms through the relay, against 14 ms straight from Vite. Through the Boat ingress, a module took 72 ms, against 32 ms for a small page.
  - The agent runner opens its WebSocket with `tokio_tungstenite::connect_async`, which also leaves Nagle on.
- **Problem:** Each small write that follows another one waits for an acknowledgement, about 40 ms on Linux.
- **Impact if no action:** Every Boat preview of a dev server loads slower today, and small runner messages can wait a round trip.
- **Root question:** How do the relay and the runner send each small write at once?
- **Options:**
  - **A.** Set `TCP_NODELAY` on each accepted relay connection, on its connection to the dev server, and on the runner WebSocket, with a test for each. Effort: Small.
  - **B.** Join the writes of one response into fewer writes. A streamed body still ends with a small write. Effort: Medium.
- **Left out:** Change nothing: it fails the goal.
- **Wider fix:** A. The socket option removes the wait for every write on those sockets.
- **Previous examples:** The host program of the own computers change gets the same fix in Milestone 7.
- **Recommendation:** A. It is one call per socket, and it is the usual setting for a proxy.
- **Action:** fix after merge, apply A, in a separate branch, because it changes production programs outside the own computers change.
