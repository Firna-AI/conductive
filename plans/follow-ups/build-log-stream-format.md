# The live build log reads two sources that disagree

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from PR #40, branch `conductor/boat-native-remote-workspaces-milestone-5b`: a problem outside the scope of round 1, round 2 finding 3, and two new problems of its check.
- **Location:** `src/app/build-log-follower.ts:98` and `:101`, `src/app/api/read-settings.ts:107`, `src/app/dev/build-routes.ts:190`, and `worker/lifecycle/build-stream.ts:78`.
- **Reason:** PR #40 merged with this item open, because each part needs unusual timing or affects only the live view, and reopening the tab shows the full log.

- **Terms:**
  - **Build log follower:** the browser model in `build-log-follower.ts` that polls the log of a running image build every 2 seconds for the org settings.
- **Background:** Each poll reads the build events from one Worker route and the build details, with the full log, from another. The events route sends server-sent events.
- **Problem:**
  - The client reads the events route as JSON, so the live log poll fails. The dev fake and the unit tests answer that route with JSON, so neither shows the failure.
  - A poll can read the events before a failure and the details after it. Line 101 then drops the complete log and stops polling, so the last error lines stay hidden.
  - During a build, each timer read keeps the event stream open until the build ends, and `stop` does not cancel it. So the Worker reads D1 every 250 ms after the tab closes.
- **Impact if no action:** A member cannot follow a running image build, and can miss its final error lines. Each closed tab keeps a Worker read loop alive until the build ends.
- **Root question:** How does the browser show a running build's log from one consistent source?
- **Options:**
  - **A.** Use the complete `detail.log` when a poll reports completion, and keep the separate events request while the build runs. Effort: Small.
  - **B.** Use the build details response alone for every poll, share that read with manual reloads, and remove the events request. Decide in the same change whether the events route of the Worker stays, because no client then reads it. Each poll sends up to 4 MiB to each viewer. Effort: Small.
  - **C.** Follow the server-sent events through the final build event, with a size cap in the browser and a stream source for the tests. Each open stream reads D1 every 250 ms while no new row exists. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B. The follower never combines a state and rows from two reads.
- **Previous examples:** PR #40 round 1 finding 2, the log query that read the full history.
- **Recommendation:** B. It gives every answer one server snapshot and removes the format mismatch and the stream left open.
- **Action:** fix after merge, apply B, because PR #40 merged with it open.
