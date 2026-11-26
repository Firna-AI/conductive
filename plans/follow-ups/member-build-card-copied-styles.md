# Member build card copies the admin card styles

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from branch `calummoore/check-remaining-storage-9qb7`, review round 2.
- **Location:** `src/members/BuildCard.module.css` and `src/ui/components/settings/BuildSection.module.css`.
- **Reason:** the copy is older than the branch, and a shared stylesheet touches both cards and the mockups.

- **Terms:**
  - **Build card:** the part of the Cloud computer tab that shows the newest build of the org image and its history. Admins get `src/shell/settings/BuildCard.tsx`, and members who are not admins get `src/members/BuildCard.tsx`.
- **Background:** The admin card and the mockups use `src/ui/components/settings/BuildSection.module.css`. The member card has its own copy of most of the same rules in `src/members/BuildCard.module.css`. The change that shows the free storage of a build added the same `.storage` rule and the same `.build` row change to both files.
- **Problem:** Each change to the look of the build card must be made twice, and the two cards can drift apart.
- **Impact if no action:** A later style change can reach one card and miss the other.
- **Root question:** How do the admin and member build cards keep one look?
- **Options:**
  - **A.** Make the member card import the shared `BuildSection.module.css` for the rules that are the same, and keep only its own rules, such as its plain log, in its own file. Effort: Small.
  - **B.** Make the member card render the shared parts of `src/shell/settings/BuildParts.tsx`, such as `BuildResult` and `BuildHistory`, so that it shares both markup and styles. Effort: Medium.
  - **C.** Change nothing. Effort: Small.
- **Left out:** One card for both roles with a read-only flag. It needs a change of the app composition of `src/members/`, which loads nothing and holds no state.
- **Wider fix:** B, because shared parts prevent drift in markup and styles.
- **Previous examples:** None found.
- **Recommendation:** A. It removes the copied rules with the smallest change.
- **Action:** fix after merge, apply A, because the copy is older than this branch and outside its scope.
