# Runner limit guide names the old protocol

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the final merge review of PR #154.
- **Location:** `runner/event-limits.md:9`, `src/shared/runner.ts`, and `docs/protocol/agent-runner.md`.
- **Reason:** The incorrect sentence already exists on main. It is outside the Preview feature change.

- **Source:** Review. **Category:** Docs or spec.
- **Terms:**
  - **Runner protocol:** The messages exchanged by the sandbox agent runner and the workspace backend.
- **Background:** The packaged runner uses protocol version 2. The Worker also supports older version 1 runners where the workspace permits them. The current version rules live in the agent-runner protocol and shared contracts.
- **Problem:** The event-limit guide says "the runner protocol stays at version 1". This contradicts the current packaged runner and its protocol rules.
- **Impact if no action:** A reader gets the wrong version when using the guide to understand runner events.
- **Root question:** How should the limit guide keep correct protocol information?
- **Options:**
  - **A.** Remove the fixed-version clause. Keep the guide's existing links to the protocol and shared contracts. Keep all byte-budget facts unchanged. Effort: Small.
  - **B.** Change the number to version 2. This keeps a second version statement that each later protocol change must update. Effort: Small.
- **Left out:** Keeping the wrong claim fails the goal. Generating this clause adds a tool for information already held by linked sources. Only removing or maintaining the duplicate statement gives a distinct useful choice.
- **Wider fix:** A. It removes the duplicate version statement and leaves its existing source links.
- **Previous examples:** `docs/protocol/listening-ports.md` links to the shared runner protocol instead of retaining a fixed-version claim.
- **Recommendation:** A. The limit guide needs the limits and can link to the one home of the version rules.
- **Action:** fix after merge, apply A, because this baseline documentation problem is outside the feature change.

The current version is `RUNNER_PROTOCOL_VERSION` in [the shared contract](../../src/shared/runner.ts).
[The agent runner](../../docs/protocol/agent-runner.md#the-agent-runner) states the current and legacy version rules.
