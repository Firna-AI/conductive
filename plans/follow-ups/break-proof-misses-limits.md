# Break proofs can miss a limit of the rule

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-19, the blocked wider fix of finding 2 of round 1 of the review of the branch `calummoore/conductive-sandbox-loading-issue`, option B of its finding check.
- **Location:** The section "Prove that each test can fail" of the `testing` skill, in the shared skills repository `futex-ai/skills`. The example in this repository: `worker/lifecycle/archive-retry.test.ts` and the wait in `worker/lifecycle/archive-retry.ts`.
- **Reason:** The fix adds a rule to the shared `testing` skill, which lives outside this repository and applies to every repository of the user.

- **Source:** Review. **Category:** Test.
- **Terms:**
  - **Break proof:** a deliberate break of the code under test, such as a flipped condition or a wrong value, that must make the new test fail. The `testing` skill asks for one for each test.
  - **Archive retry wait:** after a failed Archive step, the next try waits 30 seconds, and each further failure doubles the wait, up to 1 hour. The wait is at least Boat's `Retry-After`, up to the same hour.
- **Background:**
  - The hotfix of 2026-11-19 added the archive retry wait and one test of it. Its author made four break proofs: no doubling, no 1-hour cap, no reset after a success, and no write of the D1 repair time. Each made the test fail.
  - The test then refused the restart three times. Boat's `Retry-After` set the first and the third wait. So only one step of the doubling was under test.
  - A review changed the doubling to stop at 60 seconds. All 19 archive tests still passed. No break proof had changed the limit or a step of the doubling.
  - The fix of that finding added nine refused stops with no `Retry-After`. The test now expects waits of 30, 60, 120, 240, 480, 960, 1,920, 3,600, and 3,600 seconds.
  - The `testing` skill asks for a break that makes the test fail. It does not ask for a break of each limit and each step that the requirement states.
- **Problem:** A test can pass each break proof of its author and still miss a wrong limit or a wrong step of the rule that it protects.
- **Impact if no action:** A regression of a limit, such as a retry that stops growing early, can pass every test. In the example, a stuck sandbox would call Boat each minute instead of each hour.
- **Root question:** How does the first break proof of a test cover each limit and each step that its requirement states?
- **Options:**
  - **A.** Add a rule to the section "Prove that each test can fail" of the `testing` skill. When a requirement states numbers, such as a first value, a growth, or a cap, make one break of each, and see the test fail for each. Cost: each break proof takes a little longer. Effort: Small.
  - **B.** Run a mutation tool in the gate over the changed lines. Cost: a new dev dependency and a new gate step, which the user decides. StrykerJS, the tool that `plans/follow-ups/mutation-check-of-changed-lines.md` names, has no mutator that changes a number constant, so it would not have tried the 60-second stop. Effort: Large.
- **Left out:** A unit test of the private wait function, because the `testing` skill forbids a test of a private helper. Only these two approaches are real: the rule changes how the author proves a test, and the tool proves it by machine.
- **Wider fix:** A.
- **Previous examples:** The archive retry test of 2026-11-19, which the background describes. On 2026-11-24, branch `calummoore/own-computers-milestone-11-host-program-3jbp` added two more cases. The test `welcome_or_sixty_seconds_alone_confirms_a_pending_start` in `crates/cnd-computer/src/update/_tests_/runtime_tests.rs` checks when a pending release of the computer mode confirms. It checked only a confirmation within 1 virtual second after a welcome, and within 61 virtual seconds without one. A removal of its 60-second wait would still pass it, because no case checked that the release stays pending before 60 seconds. The same branch added tests of the signed manifest bytes, in `crates/cnd-release/tests/manifest_tests.rs` and `crates/cnd-cli/tests/update/pinned_tests.rs`. They compared two outputs of the same serializer, `release_manifest_bytes` in `crates/cnd-release/src/manifest.rs`. A break of its byte format, such as `to_vec` in place of `to_vec_pretty`, would still pass them.
- **Related:** `plans/follow-ups/raised-constant-weakens-tests.md` adds a rule to the same section of the `testing` skill, for a test that a later raised constant weakens. One change of the skill can add both rules.
- **Recommendation:** A. It costs one rule, and it reaches each repository that uses the shared skills.
- **Action:** ask the user, because the rule changes the shared `testing` skill in `futex-ai/skills`, a rule in force for every repository of the user, and no user decision covers that change.
