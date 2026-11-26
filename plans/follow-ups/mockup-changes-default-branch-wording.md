# Changes mockup names the default branch

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-runner-report-limits-0m1g`, a problem that the round 3 finding checks found outside the scope.
- **Location:** `docs/mockups/src/entries/app/files/changes/index.mockup.tsx:11` and `docs/mockups/src/components/files/ChangeList.tsx:93`.
- **Reason:** The wording is already on `main`, and the change that found it only added a sentence after it.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review.
- **Category:** Docs or spec.
- **Location:** `docs/mockups/src/entries/app/files/changes/index.mockup.tsx:11` and `docs/mockups/src/components/files/ChangeList.tsx:93`.
- **Terms:**
  - **Base branch:** The branch that a workspace compares its branch with. It is the default branch unless the member picked another branch.
- **Background:** `docs/protocol/workspace-tools.md:134` says that Changes compares from the merge base with the workspace's base branch. `docs/protocol/base-branches.md:53-54` says that a workspace can start from a picked base branch.
- **Problem:** The description of the Changes screen and a comment of `ChangeList` say that Changes compares "against the default branch".
- **Impact if no action:** A catalogue reader can think that Changes always compares with the default branch.
- **Root question:** How does the catalogue name the branch that Changes compares with?
- **Options:**
  - **A.** Write "against the base branch" in both places. Effort: Small.
- **Left out:** Other approaches change no words or add a link that the protocol already gives. One sentence fixes the problem.
- **Wider fix:** None. The documentation skill already requires the catalogue to agree with the protocol.
- **Previous examples:** None found.
- **Related:** None.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the wording is on `main` and is outside the scope of the change that found it.
