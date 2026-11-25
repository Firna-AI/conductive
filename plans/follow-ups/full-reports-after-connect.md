# Protocol omits full reports after each connect

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, a problem that the check of review finding 17 of round 5 found.
- **Location:** `docs/protocol/file-reports.md:58` and `runner/event-limits.md:35`.
- **Reason:** The gap is in the part rules that were on `main` before the runner file report limits change.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/file-reports.md:58`.
- **Terms:**
  - **Stream:** One connection session of the runner, with its own event numbers and revisions.
- **Background:** The runner sends a full file tree and a full changes list after each connect, also on a reconnect of the same stream (`crates/cnd-runner/src/reports/handler.rs:129`). `runner/event-limits.md:35` says so. `docs/protocol/listening-ports.md:53` and `docs/protocol/skill-mentions.md:202` state the same rule for their own reports.
- **Problem:** `docs/protocol/file-reports.md` requires full reports only when a new stream starts. The protocol does not state the full reports after each connect, although that rule decides how long lost omitted totals stay unknown.
- **Impact if no action:** A reader of the protocol cannot see how soon the workspace gets complete reports again after a reconnect.
- **Root question:** Which connects start full file reports?
- **Options:**
  - **A.** State in `file-reports.md` that the runner sends a full tree and a full changes list after each connect, as the ports and skills reports do. Effort: Small.
- **Left out:** A change of the runner. It already sends them.
- **Wider fix:** None. The documentation skill already asks the protocol to state the behaviour at the boundary.
- **Previous examples:** `docs/protocol/listening-ports.md:53`.
- **Related:** None.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the gap was on `main` before the change that found it.
