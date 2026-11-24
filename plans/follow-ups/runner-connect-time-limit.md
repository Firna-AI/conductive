# The runner connection has no connect time limit

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/external-mac-linux-server-cloud-j9ih`, the review of Milestone 4 of the own computers plan.
- **Location:** `crates/cnd-runner/src/socket.rs:67`
- **Reason:** The problem is in the agent runner, which the own computers change does not touch.

- **Terms:**
  - **Agent runner:** the part of the program `conductive` in each sandbox that runs the agents. It opens one WebSocket to the workspace Durable Object.
  - **Host program:** the mode `conductive host`, which opens a second connection for the work of the Worker on the machine.
- **Background:** The runner opens its WebSocket with `tokio_tungstenite::connect_async` and waits for it with no time limit. The host program of the own computers change ends each connection attempt after 60 seconds, because a review found that a stalled handshake stopped all its reconnects.
- **Problem:** A TLS or WebSocket handshake that stalls, for example behind a broken proxy, keeps the runner waiting for good. It then never tries again.
- **Impact if no action:** A sandbox can stay without a runner connection until the next restart. Its chat waits, and the automatic restart of the Worker is the only way out.
- **Root question:** How does the runner recover from a connection attempt that never ends?
- **Options:**
  - **A.** Wrap the connect in `tokio::time::timeout` of 60 seconds, as the host program does, and treat the time-out as a failed attempt with the usual back-off. Effort: Small.
  - **B.** Share one connect helper with a time limit between the runner and the host program. Effort: Medium.
- **Left out:** A time limit in the Worker only: the Worker never sees a handshake that does not reach it.
- **Wider fix:** B.
- **Previous examples:** Finding 3 of the Milestone 4 review of the own computers plan, fixed in the host program.
- **Recommendation:** A. It is the smallest fix with the same behaviour as the host program.
- **Action:** fix after merge, apply A, because it is outside the scope of the own computers change.
