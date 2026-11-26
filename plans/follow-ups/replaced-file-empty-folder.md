# A file replaced by a folder shows empty

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, a problem that the check of review finding 16 of round 5 found.
- **Location:** `crates/cnd-runner/src/repository/snapshot.rs:80`.
- **Reason:** The scan behaviour is on `main` from commit `a20746b99`, and the change that found it did not alter it.

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `crates/cnd-runner/src/repository/snapshot.rs:80`.
- **Terms:**
  - **All files:** The panel that shows the file tree of the branch.
- **Background:** The runner scan builds the tree from the files on disk and from the Git states of tracked paths. Folders that hold only ignored files stay out of the tree, except under `.context/`.
- **Problem:** When a tracked file becomes an empty folder, or a folder of only ignored files, the scan still adds the old path from the Git states. All files then shows an empty folder. A check with real Git showed it.
- **Impact if no action:** A member sees an empty folder that the tree normally hides.
- **Root question:** Which entries does the tree show at the path of a deleted tracked file?
- **Options:**
  - **A.** Add the path from the Git states only when the entry on disk is a file or a changed submodule. Add a repository test for an empty and an ignored-only replacement folder. Effort: Small.
- **Left out:** Hiding the Deleted row in Changes, because its diff shows the old file.
- **Wider fix:** None found.
- **Previous examples:** Commit `a20746b99` added the test that keeps a replacement folder apart from the diff of the deleted file.
- **Related:** None.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the behaviour is on `main` and is outside the scope of the change that found it.
