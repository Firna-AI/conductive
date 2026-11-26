# Startup cleanup can hide restored skills

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, review finding 407 and its independent check.
- **Location:** `crates/cnd-runner/src/skills/disk.rs:76-100`, `crates/cnd-runner/src/skills/schedule.rs:36-78`, `crates/cnd-runner/src/skills/sweep.rs`.
- **Reason:** This requires an unusual cleanup failure, and the branch has used its two source review fix rounds.

### 1. Startup cleanup can hide restored skills

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `crates/cnd-runner/src/skills/disk.rs:76-100`.
- **Terms:**
  - **Skills copy:** A complete local copy of the org's shared skills repository.
  - **Sweep:** Cleanup that removes retired copies and unused Git objects.
  - **Helper view:** A temporary skill export under `~/.conductive/skill-sessions/turn-*` that one running agent reads.
- **Background:** The runner restores the last complete skills copy when a cloud computer starts or resumes. The contract requires a failed copy or check to retain the last good copy across stops and resumes. See `docs/protocol/org-skills-copy.md`, under The copy. The runner must also remove retired copies and abandoned helper views at startup.
- **Problem:** `prepare` first removes abandoned helper views. It then checks the selection, finds the current copy, and closes links that leave that copy. Before it returns the checked copy, it requires `sweep` to succeed. A failure in either cleanup operation makes `prepare` fail. The schedule then publishes no copy and skips the update. It retries preparation at the next five-minute tick. Each Git command in a sweep has a 30-second limit, so cleanup can also delay restoration.
- **Impact if no action:** Agents can receive no org skills although a complete, readable copy remains on disk. Repeated cleanup errors also prevent a newer copy from arriving.
- **Root question:** How does startup keep usable skills available when cleanup fails?
- **Options:**
  - **A.** Log a sweep failure inside `prepare` and return the checked copy. Extend the existing resume test. Restoration still owns two jobs and waits for the sweep. Abandoned-view removal remains fatal. Effort: Small.
  - **B.** Remove the sweep from restoration. Publish the checked copy first, then use the schedule's existing nonfatal sweep. Preserve selection cleanup and link checks. Extend the existing resume and schedule tests. Abandoned-view removal remains fatal. Effort: Small.
  - **C.** Apply B and give abandoned helper-view removal its own storage call. The schedule runs that call before the first publication. It logs a failure and continues. `prepare` then holds only selection cleanup, restoration, and link checks. Extend the existing resume and schedule tests. Effort: Small.
- **Left out:** Retrying before publication still hides usable skills. Raising a timeout does not handle Git errors. A new storage abstraction duplicates the existing boundary. Continuing to update after a failed selection cleanup or link check can publish the wrong selection or an unsafe reused folder. A parallel sweep can delete an update's staging folder. Reading the disk link directly bypasses link checks and leases. A status in the app publishes no copy and is separate work.
- **Wider fix:** C gives the schedule ownership of startup cleanup and its warnings. Restoration then contains only the operations that decide the safe copy.
- **Previous examples:** The schedule already treats its later sweep failure as nonfatal at `crates/cnd-runner/src/skills/schedule.rs:76`. The current startup sweep and helper-view removal were introduced with snapshot lifetime cleanup in commit `a5e749503`.
- **Related:** `plans/follow-ups/skills-copy-status-in-app.md` owns the app status decision. This fix does not depend on it. A later status report must distinguish cleanup warnings from a failed skills copy. `plans/follow-ups/skills-stale-gc-marker.md` covers a separate conditional cause of failed Git reclamation.
- **Recommendation:** C. It removes both cleanup failure dependencies without weakening selection or link checks.
- **Action:** fix after merge, apply C, because the failure is rare and the two source review fix rounds are used.

## Implementation and verification

- Keep all storage work in the schedule's single serial job.
- Keep abandoned-view removal before the first publication. A later
  removal could delete a view that a live helper has just created.
- Keep a failed selection cleanup or link check fatal to restoration.
  `update` can reuse an existing commit folder without checking its links
  again. Do not continue to that update after an unsafe preparation.
- Keep startup reclamation, crash-staging cleanup, and lease retention.
  Remove the duplicate startup sweep rather than removing cleanup.
- Preserve every assertion in
  `crates/cnd-runner/tests/skills/sweep_tests.rs`. Call the moved cleanup
  steps there. Add the first-sweep assertion to the schedule tests.
- Extend `crates/cnd-runner/tests/skills/copy_tests.rs` and
  `crates/cnd-runner/src/skills/_tests_/service_tests.rs` to cover the
  restored copy during a failed or held sweep and failed abandoned-view
  removal. Use the existing Git and storage boundaries. Preserve all
  selection, link, and cleanup assertions. Run changed asynchronous
  cases ten times under the testing skill.

The finding and its check used static traces. No cleanup failure was
injected. The existing resume test covers a failed fetch after a
successful preparation. It does not cover a failed preparation sweep.
