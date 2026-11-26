# Warnings drop the turn IDs of watch wakes

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/sidebar-indicator-not-showing-4fri`, review finding 5.
- **Location:** `worker/warning-values.ts:16-32`, `worker/chat/session-watches.ts:71`, `worker/chat/turn-end-reports.ts:38`, `worker/chat/active-turn-check.ts`, `worker/chat/runner-warnings.md`.
- **Reason:** The fix also changes the existing turn-end warning, outside the change that found it.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Session watch:** a request that wakes a session when a watched turn ends. The wake sends a message to the watching session.
  - **`WarningId.checked`:** the format check in `worker/warning-values.ts` that each ID field of a Worker log warning passes. It accepts only a 43-character base64url ID, the form of `randomToken`. Any other value logs as `unknown`.
- **Background:**
  - `SessionWatches.accept` in `worker/chat/session-watches.ts` passes `randomId: () => crypto.randomUUID()` to `acceptSessionWatchNotice`. That makes a new turn with a UUID ID when the watching session has no active turn, or when its turn chain ends at a stopping turn. Every other turn source uses `randomToken`.
  - So the turn-end warning `turn_ended_without_stop_request` logs `turnId: "unknown"` for each wake turn. The new warning `session_active_turn_not_running` does the same. A production turn-end warning on 2026-11-25 logged `turnId: "unknown"`.
  - `docs/protocol/runner-warnings.md` requires a format check for each ID that a warning holds.
- **Problem:** The warnings hide the ID of every turn that a session watch wake creates.
- **Impact if no action:** An operator cannot find the exact wake turn of a warning. This makes stuck or stopped wake turns hard to trace.
- **Root question:** How can a warning keep every turn ID that the Worker makes, and still check its format?
- **Options:**
  - **A.** Accept a lowercase version 4 UUID in the turn field of the new warning only. Effort: Small.
  - **B.** Add one checked turn ID type that accepts both formats, and use it in both turn warnings. Effort: Small.
  - **C.** Make watch wakes use `randomToken` for new turns, and also do B for the UUIDs already stored. Effort: Medium.
  - **D.** Make `WarningId.checked` accept the `randomToken` form or a lowercase version 4 UUID, with the regex of `WarningStreamId`. Every ID field then keeps an ID from either Worker generator. Update the comment of the class and the ID note of `worker/chat/runner-warnings.md`, and add a case for both formats to `worker/warnings.test.ts`. Effort: Small.
- **Left out:** Logging the raw value breaks the format rule. Changing the watch generator alone leaves the stored UUIDs.
- **Wider fix:** D.
- **Previous examples:** Watch turns got the UUID path in commit `1c48caabb`.
- **Recommendation:** D. One shared check covers both warnings and any later ID from either generator.
- **Action:** fix after merge, apply D, because it changes the existing turn-end warning outside the change that found it.
