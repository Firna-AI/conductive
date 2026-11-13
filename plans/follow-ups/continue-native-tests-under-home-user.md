# Continue native tests fail in a cloud computer checkout

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from branch `calummoore/oslo-tq4m`, which changes no Worker file.
- **Location:** `continueNativeFixture` in `worker/lifecycle/continue-native.test-support.ts:27`, and the tests of `worker/lifecycle/continue-native.test.ts`.
- **Reason:** The branch that found it changes no Worker or runner file, so the fix belongs to a separate branch.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Cloud computer:** the sandbox of a Conductive workspace. Its checkouts live under `/home/user/code/<repository>`, and `worker/lifecycle/repository-locations.ts` gives that place.
  - **Complete gate:** `npm run check`, which CI runs on each pull request.
- **Background:**
  - `continueNativeFixture` makes its folders under `.context/pull-request-bar-actions/milestone-7/native/case-*` of the checkout. It sets `HOME` to `<case>/home` and works in `<case>/home/working repo's folder`.
  - In a Conductive cloud computer, the checkout itself is `/home/user/code/remote-code`.
  - On 13 November 2026, in such a checkout, two of the three tests failed alone and in the complete gate, each in under 400 ms: "isolates the member fetch from malicious working settings and preserves local files and old commits on Continue" and "counts distinct unpushed commits across all local branches after Continue".
  - Failure text: `/bin/sh: 2: cd: can't cd to /home/user/code/remote-code/.context/pull-request-bar-actions/milestone-7/native/case-rOPSd9/home/code/remote-code/.context/pull-request-bar-actions/milestone-7/native/case-rOPSd9/home/working repo's folder`. The path holds the case home two times, so a step under test seems to read the folder relative to `/home/user` and join it to `HOME`.
  - The suspected source is the `/home/user` prefix of the checkout. A CI checkout under `/home/runner/work` does not meet it. This is not confirmed.
- **Problem:** The tests depend on where the checkout lives, so they fail in the cloud computer of every Conductive workspace of this repository.
- **Impact if no action:** The complete gate fails in each workspace, and each agent must find out again that the failure is not its own.
- **Root question:** How do the Continue tests pass wherever the checkout lives?
- **Options:**
  - **A.** Make the fixture folders under the system temporary folder, from `os.tmpdir()`, so that no case path starts with `/home/user`. Effort: Small.
  - **B.** Find the step that reads the path relative to `/home/user`, and make it use the folder that the test gives. Effort: Medium.
  - **C.** Change nothing, and note the failure in the docs of the gate. Effort: Small.
- **Left out:** Skip the tests in a cloud computer: it hides a real place where the code runs.
- **Wider fix:** B, when the product step has the same fault for a real folder. A only moves the test away from the fault.
- **Previous examples:** None found.
- **Recommendation:** B first, to learn whether the product has the fault. Then A, if only the fixture is at fault.
- **Action:** ask the user, because no option is clearly best until a reproduction names the step that joins the path.
