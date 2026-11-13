# Smoke-test the Mac grant until Stop

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-12, from `calummoore/riga-88hp`.
- **Location:** None.
- **Reason:** The test needs a released, signed Mac app, which only exists after the merge and its release.

- **Terms:**
  - **Grant until Stop:** the Mac command permission "Allow all commands until I stop". Every command from one workspace runs on that Mac without asking, until Stop, a quit of the Mac app, or a sign-out.
- **Background:** The Mac app keeps a grant until Stop only in memory. The bar of the 15 minutes also offers "Keep until I stop". Unit, DOM, and fixture tests cover the logic, but no test runs the released app on a real Mac.
- **Task:**
  1. In the released Mac app, answer a Mac command request with "Allow all commands until I stop".
  2. Wait more than 15 minutes, and let the agent run more commands. Check that they run without asking.
  3. Press Stop in the bar, and check that the next command asks.
  4. Allow for 15 minutes, press "Keep until I stop", quit the Mac app, open it again, and check that the next command asks once the 15 minutes end.
- **Impact if no action:** A defect that only the packaged app shows, such as a sign-out that does not end the grant, stays unseen.
- **Needs:** The merged change in a released Mac app, and a Mac signed in to Conductive.
- **Done when:** Each step above behaves as written.
