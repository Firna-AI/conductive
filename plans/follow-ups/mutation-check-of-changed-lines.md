# New code can ship without an effective test

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from round 2 finding 6 of the review of branch `calummoore/tab-drag-and-drop`, as the blocked wider fix of that finding. Extended on 2026-11-20 with finding 10 of review round 2 of branch `calummoore/sandbox-start-issue-secrets-q3is`: the same class in the Rust crates.
- **Location:** `package.json`, the `check` script. `.github/workflows/ci.yml`, the job that runs it. `src/chat/components/row-scroll.ts`, the tab row scroll behaviour. `src/chat/components/TabRow.dom.test.tsx`, its regression tests.
- **Reason:** The proposed work adds a gate or a CI step, which the user decides.

- **Terms:**
  - **Mutation run:** a tool, such as StrykerJS with its Vitest runner, changes one line of the code at a time and runs the tests. A change that no test catches is a mutant that survives.
- **Background:**
  - The `testing` skill asks for a test that can fail for each new requirement. The author proves it by breaking the code by hand.
  - Three cases passed review without such a test. The first is the failure path in `plans/follow-ups/list-failure-test.md`. The other two are the scroll of the shown tab into view and the scroll during a drag near an end. Both live in `src/chat/components/row-scroll.ts`. For the drag case, all 598 web app tests passed with the `useEdgeScroll` call removed.
  - The tests of the web app run in Vitest with happy-dom. Each case was fixed with a direct test.
- **Problem:** No check finds requirement code that no test protects. A reviewer finds it only by chance.
- **Impact if no action:** A later change can break a requirement while every test passes.
- **Root question:** How does the gate show requirement code that no test protects?
- **Options:**
  - **A.** Keep the rule of the `testing` skill and the review. Effort: Small.
  - **B.** Run a mutation run in CI over the lines that each pull request changes, and fail under a score limit. It needs a new dev dependency, a long CI step, and triage of mutants that change nothing. Effort: Large.
  - **C.** Report the score of a mutation run on each pull request, with no limit. The review reads it. It adds a CI step but no gate. Effort: Medium.
- **Left out:** A coverage limit, because a line that a test runs can still have no assertion that fails when it breaks.
- **Wider fix:** B, a detection fix for the class.
- **Previous examples:** `plans/follow-ups/list-failure-test.md`, and both scroll behaviours in `src/chat/components/row-scroll.ts`. `src/chat/components/TabRow.dom.test.tsx` now tests both behaviours directly. On 2026-11-20, branch `calummoore/sandbox-start-issue-secrets-q3is` added a stall test for the part repair in `crates/cnd-cli/src/update/_tests_/repair_tests.rs`. Its first form passed when the time share of a part came from the whole 60-second limit, which `cargo-mutants` would show. So the class also reaches the Cargo workspace, and a mutation run there needs a Rust tool such as `cargo-mutants`. On 2026-11-24, branch `calummoore/own-computers-milestone-11-host-program-3jbp` had two more cases in the Cargo workspace. Its confirmation test `welcome_or_sixty_seconds_alone_confirms_a_pending_start` in `crates/cnd-computer/src/update/_tests_/runtime_tests.rs` would still pass with the 60-second wait of the computer mode removed. From a read of the code, the `cargo-mutants` mutant that replaces `Activity::first_welcome` with `()` passes all its tests. Nobody ran the tool. Its tests of the signed manifest bytes, in `crates/cnd-release/tests/manifest_tests.rs` and `crates/cnd-cli/tests/update/pinned_tests.rs`, compared two outputs of the same serializer, `release_manifest_bytes`. So a change of its byte format would still pass them.
- **Related:** `plans/follow-ups/raised-constant-weakens-tests.md` has a shared wider fix. Its option C, a mutation run over the code that reads each changed constant, is a form of option B here. A run over the changed lines alone misses that class.
- **Recommendation:** C. It shows the unprotected lines to the review at a medium cost, without a gate that fails on mutants that change nothing. B best protects the codebase.
- **Action:** ask the user, because B adds a gate, and C adds a CI step that the user should weigh.
- **Answer:** On 9 November 2026, the user chose to keep this work as a follow-up item for a later change, and to merge the change that found it without it. No option is chosen yet, so the item still needs a decision.
