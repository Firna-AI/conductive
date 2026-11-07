# Runner session tests use a hand-written state store

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #12, branch `conductor/boat-native-remote-workspaces-milestone-7r`, a problem outside the scope of its round 2 review.
- **Location:** `runner/test-support/engine.ts:18`.
- **Reason:** it was outside the diff of the review round.

- **Background:** The runner saves its events and its turn records in a state file through `DiskStorage`. The wire fixture now uses `DiskStorage` by default.
- **Problem:** The session tests still use a hand-written state store, so they bypass the real disk storage.
- **Impact if no action:** A defect in how the disk storage saves session state can pass the session tests.
- **Root question:** How do the session tests run on the storage that production uses?
- **Options:**
  - **A.** Run the session tests on `DiskStorage` in a temporary folder, as the wire fixture does. Effort: Small.
- **Left out:** None.
- **Wider fix:** A.
- **Previous examples:** PR #12 round 1 finding 34, the wire fixture.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because it is outside the diff of the review round.
