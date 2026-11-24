# Concurrency tests can fail only by chance

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-18, from `calummoore/error-resolution-b5gz`, review finding 3 (wider fix).
- **Location:** None. The rule lives in the `testing` skill of the shared `futex-ai/skills` repository, in `skills/testing/SKILL.md` and `skills/testing/references/deterministic-tests.md`.
- **Reason:** The fix changes a shared work rule for every repository, and the always-on rules reserve a new check or a stricter process for the user.

- **Terms:**
  - **Deliberate break:** a change to the product code, such as a removed lock, that the author makes to see a new test fail, as the `testing` skill asks under "Prove that each test can fail".
  - **Concurrency test:** a test that runs two or more processes or tasks at once and checks their order or their effect on each other.
- **Background:** The `testing` skill asks the author to see each new test fail once, and to run each new asynchronous test 10 times and see it pass 10 times. In `calummoore/error-resolution-b5gz`, a new shell test checked that two download commands for one attached file run one at a time under `flock`. It passed 10 of 10 runs, and it failed once when the lock was removed. A later review found that, without the lock, the test still passed 4 of 20 runs: the first download could finish before the second command reached its check. The test released the first download right after it started the second command, with no proof that the second command waited. The fix made the test wait until `/proc/locks` showed the second command blocked on the lock. After that, it failed 10 of 10 runs for each break.
- **Problem:** The skill counts only passing runs of a new asynchronous test. One failed run of a deliberate break does not show that the test fails every time. A concurrency test that depends on scheduling can pass the 10-run rule and still miss the defect in some runs.
- **Impact if no action:** A future concurrency test can pass the gate after the code that it protects is removed, in a share of runs. The defect then reaches production while the gate is green.
- **Root question:** Should the `testing` skill ask for proof that a new concurrency test fails in every run of its deliberate break, not only once?
- **Options:**
  - **A.** Add one sentence to "Before you finish" in the `testing` skill: for a new asynchronous or concurrency test, also run its deliberate break 10 times, see each run fail, and record the count under `.context/`. Cost: about 10 more local runs for each such test. Effort: Small.
  - **B.** Add a section to `references/deterministic-tests.md` that says a concurrency test must wait for an observable signal of the state it checks, such as a lock waiter, a readiness pipe, or an event, before it releases the other party. Cost: guidance only, with no count to check. Effort: Small.
  - **C.** Change nothing. The review pass can still find such tests.
- **Left out:** A lint that detects scheduling-dependent tests was left out, because no reliable signal marks such a test in the code.
- **Wider fix:** A. It gives a count that shows the test fails in every run, for every concurrency test.
- **Previous examples:** The `flock` test of `calummoore/error-resolution-b5gz`, which the background describes. On 2026-11-24, branch `calummoore/own-computers-milestone-11-host-program-3jbp` added the test `a_cancelled_create_holds_the_name_until_cleanup` in `crates/cnd-computer/src/operations/_tests_/dispatch_tests.rs`. It checks that a cancelled create holds the container lock until its cleanup ends. Its first form started a second operation and checked only that the second operation saw the container as missing in the end. Its mocked removal ended at once, so a break that drops the lock right after the spawn of the cleanup task still passed. On the current-thread runtime of the test, the shape of the code sets the order. A lock release before that spawn fails every run, and a release after it passes every run. So 10 failed runs of one break show nothing about the other. A read of the code showed this, and nobody ran the break. The fix holds the removal on a signal, and asserts that the second operation is still pending, as option B asks.
- **Recommendation:** A, because a count of failed break runs is cheap and catches the defect class that one failed run misses.
- **Action:** ask the user, because the option changes the shared testing process for every repository.
