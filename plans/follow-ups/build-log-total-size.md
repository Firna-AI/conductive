# A build log has no total size limit

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #21, branch `conductor/boat-native-remote-workspaces-milestone-5`, a new problem of the check of round 2 finding 18.
- **Location:** `worker/lifecycle/build-data.ts:180`.
- **Reason:** only a very long and verbose install script reaches it.

- **Background:** An org image build polls the install script's output and appends each new part to its log rows in D1. `readBuild` reads every row of the log.
- **Problem:** Nothing limits the total size of one build log.
- **Impact if no action:** A very verbose install can grow D1 without limit and pass D1's 50 MB limit for one query result, so the build page fails to load.
- **Root question:** How does a build log stay within a size that D1 and the build page can read?
- **Options:**
  - **A.** Keep the first and the last part of a log up to a fixed total, and store a line that says how much was left out. Effort: Small.
  - **B.** A, and read the log in pages on the build page. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** Decision 76 E, which caps runner events and counts the rest.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because only a very verbose install reaches it.
