# Mac package names copy the product name

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the finding check of review finding 10 on branch `calummoore/desktop-app-auto-update`, a problem outside its scope.
- **Location:** `productName` and `artifactName` at lines 2 and 3 of `desktop/electron-builder.yml`, and the app path at line 30 of `desktop/scripts/packaged-smoke.ts`.
- **Reason:** the lines predate the update change, and its diff does not touch them.

- **Terms:**
  - **`brand.ts`:** `docs/mockups/src/brand.ts`, the one file that holds the product name `Conductive`.
  - **`artifactName`:** the electron-builder setting that names each package file.
- **Background:**
  - `AGENTS.md` says that code reads the product name from `brand.ts`, so that one change renames the product.
  - `desktop/electron-builder.yml` writes `productName: Conductive` and `artifactName: Conductive-${version}-mac-${arch}.${ext}` as literals.
  - `desktop/scripts/packaged-smoke.ts` opens `Conductive.app/Contents/MacOS/Conductive` by a literal path.
  - `desktop/scripts/package.ts` and `desktop/scripts/release.ts` run electron-builder, and `release.ts` already imports `productName` from `brand.ts`.
  - The publish step takes its file names from `latest-mac.yml` and the signed files, so it follows any package name.
- **Problem:** A change of `brand.ts` alone does not rename the app bundle or its package files, and the packaged smoke test then looks for the old app path.
- **Impact if no action:** A rename of the product leaves the Mac app under the old name, or fails the packaged smoke test, until someone edits three more places.
- **Root question:** How does a change of `brand.ts` alone rename the Mac app and its packages?
- **Options:**
  - **A.** Change nothing. A rename edits the three places by hand. Effort: Small.
  - **B.** Change `artifactName` to `${productName}-${version}-mac-${arch}.${ext}`. Pass `-c.productName=<brand name>` from both electron-builder runs in `package.ts` and `release.ts`. Build the smoke test's app path from `productName`. Effort: Small.
  - **C.** Replace `electron-builder.yml` with `desktop/electron-builder.ts`, which electron-builder loads, and import the name from `brand.ts` there. Every electron-builder run then uses it. The docs that name `electron-builder.yml` change too. Effort: Medium.
- **Left out:** A test that compares the names: it detects a difference but keeps two copies. B is better on every point.
- **Wider fix:** C. It leaves one source for every electron-builder run, also a run that a later script adds.
- **Previous examples:** The product rename to Conductive, decision 100 of `plans/boat-native-remote-workspaces.md`, which made `brand.ts` the single source.
- **Recommendation:** B. It reaches every current run with small edits. C best protects the codebase, because a new electron-builder run cannot miss the name.
- **Action:** fix after merge, apply B, because the lines are outside the scope of the update change.
