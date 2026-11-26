# ESLint ignores only the root dist folder

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/components-location-misunderstood-d7lu`, a new problem of the check of review finding 2.
- **Location:** `eslint.config.js`, the `globalIgnores` list near line 22.
- **Reason:** The ignore list is the same on `origin/main`.

- **Source:** Review.
- **Category:** Repository rule.
- **Background:** `eslint.config.js` ignores `dist`. ESLint matches that pattern from the repository root, so it ignores only `dist/` at the root. A local build of the Mac app writes `desktop/dist/`, which Git ignores. `npm run lint` runs `eslint .` from the root.
- **Problem:** After a local Mac app build, `npm run lint` also lints the built files in `desktop/dist/`. Nobody has seen errors from them yet, because no check built the Mac app before it ran the lint.
- **Impact if no action:** A developer can see lint errors in built files that are not in Git.
- **Root question:** Which built folders does the root lint skip?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Change `dist` to `**/dist` in `globalIgnores`. Effort: Small.
- **Left out:** A list of each package's `dist` folder: B covers them all with one pattern.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** B. Built files never need lint.
- **Action:** fix after merge, apply B, because the line is outside the change that found it.
