# New watch resume test times out

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-20, from implementation item 8 on `calummoore/wake-a-session-when-a-turn-ends-b5kh`.
- **Location:** `worker/features/session-watch-runtime.test.ts:185` and `vitest.config.ts:21`.
- **Reason:** The new test failed once and then passed alone. Its cause is unknown, and the recommended guard change needs the member's answer.

- **Terms:**
  - **Hang guard:** the test runner's time limit, which stops a test that does not finish.
  - **Wake:** the app input that tells a calling session that its watched turn ended.
  - **Normal resume:** the ordinary admission, computer start, runner-ready, start-success, and turn-dispatch path.
- **Background:** The watch feature must start a stopped caller computer through normal resume. The test `resumes a stopped caller through normal admission and delivers ordinary runner text for the setter` protects that path. It uses real Worker routes and a local native runtime with controlled provider and runner boundaries. It keeps the real startup work and runner-ready fence. Manually marking startup ready does not prove this requirement.
- **Problem:** The unfiltered `npm run check` timed out this new case with `Error: Test timed out in 15000ms.` The error names only the test declaration, so the blocked phase is unknown. One isolated instrumented run then passed every assertion. Its guarded action took 13.949 seconds. A later combined check on merged main measured 14.534 seconds, leaving about 0.466 seconds under the global guard. This does not establish that load caused the failure.
- **Impact if no action:** The new test can fail later gates without identifying the failed phase. The watch pull request cannot complete verification until the member chooses how to handle this finding.
- **Root question:** How should the branch keep a dependable check of a wake through normal resume?
- **Options:**
  - **A.** Keep the case and its guard unchanged. Use the pull request's four CI shards as the next evidence. A green result keeps the known local failure unresolved. A later timeout can block other work. Effort: Small.
  - **B.** Give only this case a guard of at least three times its measured action, with `45_000` ms as the concrete proposal. This exceeds three times the current merged action measurement of 14.534 seconds. Keep every assertion, normal phase, and other guard. A real hang fails later, and a longer guard does not identify the original cause. Effort: Small.
  - **C.** Keep all guards and diagnose first. Run the case inside one full suite with temporary, sanitized phase records and a failure snapshot. No other test or build runs beside that suite. A reproduction can identify a deterministic correction. It can also take hours and produce no reproduction. Effort: Medium.
  - **D.** Put the watch admission and dispatch-fence checks at a lower boundary. Keep the full real-resume smoke as a separate opt-in check or one-time proof. This makes the gate faster but removes continuous coverage of the complete path. It needs approval, a new failing test, and ten successful asynchronous runs. Effort: Medium.
  - **E.** In a separate branch, size guards for the class of long native-runtime tests. Other tests keep their existing guard. This changes the shared gate configuration and needs its own decision. It is outside this watch pull request. Effort: Medium.
  - **F.** Make the real action faster without removing a phase or assertion. No concrete change is known. The measured alarm reads do not explain its cost. Effort: Large.
- **Left out:** Deleting or skipping the case without another normal-resume proof loses its requirement. A retry can hide a failure. Moving phases into setup only changes which guard covers them. A local driver is not a supported correction without a measured removable cost or a proven ordering defect. Splitting the case still needs the normal path in a guarded body or hook.
- **Wider fix:** E gives the class an appropriate default, but it belongs in a separate branch. The existing timeout investigation remains the owner of the broader problem.
- **Previous examples:** `plans/follow-ups/worker-suite-timeouts.md` records older 15-second native-runtime failures and focused passes. It also records a stalled runtime in this full run. Those failures do not establish the watch failure's cause. `worker/lifecycle/workspace-runtime.test.ts` already has a separate 20-second guard, which also timed out in this run.
- **Related:** `plans/follow-ups/worker-suite-timeouts.md` may share a cause. That link is unconfirmed. Its existing task does not authorize a longer guard.
- **Recommendation:** B. It keeps the complete behavior check and changes only this case's hang guard. It remains an exception that the member must approve.
- **Action:** ask the user, because the new failure's source is unknown and B raises a time limit.
- **Done when:** Record the member's choice and its date. Apply only the approved change. Keep every assertion unless the answer explicitly changes coverage. Check each new or changed asynchronous case with the required repeated evidence. Run the complete gate and Rust checks, finish the implementation review, and obtain green pull request checks. Delete this item in the branch that applies the answer.

Evidence available without other documents:

- The final sealed implementation check passed this case in all ten runs. A later combined watch check also passed it.
- The unfiltered gate on main `b8a1f4525` plus the watch feature reported this case at 35,272 ms including setup and cleanup. It reported the file at 51,059 ms. Neither duration identifies the blocked await.
- That run reported 113 failed files, 1,392 passed files, 218 failed tests, 4,715 passed tests, and nine errors. The run was interrupted after all other forks ended. The remaining workspace-lifecycle fork had a defunct native runtime child and no progress. These are partial results, not a passing or normally completed suite.
- A body can continue after its guard fires. The resumed connection in the failed log does not prove that the body reached it before the guard fired.
- The one isolated diagnostic command passed this case and excluded the other case by its name filter. It completed normal admission, provider resume, startup, welcome, ready confirmation, normal success, wake dispatch, socket close, and disposal.
- Its guarded action took 13.949 seconds. Startup took 5.864 seconds. Normal success took 2.985 seconds. Its start-result promise settled before the one success-alarm advance returned, so the suspected extra-alarm race did not occur.
- Seven alarm-read round trips totaled 15.271 ms. This is not a measurement of all transport cost. Inclusive alarm durations contain real Worker work and database operations.
- Main `83141ef93` later added startup step records and timed database calls. The original action measurement predates that merge. A later current-tree combined check passed this case and measured its complete guarded action at 14.534 seconds. Its total case time was 35.907 seconds including setup and cleanup.
- All diagnostic durations are observations. No duration is an assertion. Temporary logs were restored byte for byte. No guard, assertion, runtime, or gate change was made for this finding.
