# New requirement code can ship without an effective test

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from round 2 finding 6 of the review of branch `calummoore/tab-drag-and-drop`, as the blocked wider fix of that finding.
- **Location:** `package.json`, the `check` script. `.github/workflows/ci.yml`, the job that runs it.
- **Reason:** The fix adds a gate, which the user decides.

- **Terms:**
  - **Mutation run:** a tool, such as StrykerJS with its Vitest runner, changes one line of the code at a time and runs the tests. A change that no test catches is a mutant that survives.
- **Background:**
  - The `testing` skill asks for a test that can fail for each new requirement. The author proves it by breaking the code by hand.
  - Three cases passed review without such a test: the failure path of `plans/follow-ups/list-failure-test.md`; the scroll of the shown tab into view in the tab row, which round 1 of the review of `calummoore/tab-drag-and-drop` found; and the scroll of the tab row during a drag near an end, which round 2 found. In the last case, all 598 web app tests passed with the `useEdgeScroll` call removed.
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
- **Previous examples:** `plans/follow-ups/list-failure-test.md`, and findings 2 and 6 of the review of `calummoore/tab-drag-and-drop`.
- **Recommendation:** C. It shows the unprotected lines to the review at a medium cost, without a gate that fails on mutants that change nothing. B best protects the codebase.
- **Action:** ask the user, because B adds a gate, and C adds a CI step that the user should weigh.
