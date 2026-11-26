# The app build only warns on a missing CSS file

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/components-location-misunderstood-d7lu`, a new problem of the check of review finding 5.
- **Location:** `vite.config.ts`.
- **Reason:** The build behaviour is the same on `origin/main`.

- **Source:** Review.
- **Category:** Process.
- **Background:** Vite builds the web app. When a CSS `url()` names a file that does not exist, Vite logs a warning and keeps the path. The mockup build, `npm run mockups:check`, fails on such a path, but only for a stylesheet that a catalogue view draws.
- **Problem:** A stylesheet that only the app uses can name a missing image, and the complete gate still passes.
- **Impact if no action:** The app can ship without an image or a font that a stylesheet names.
- **Root question:** How does the gate notice a CSS path of the app that names no file?
- **Options:**
  - **A.** Change nothing. Review and the mockup build catch most cases. Effort: Small.
  - **B.** Make the app build fail on that warning, for example with a custom logger in `vite.config.ts`. It adds a new build error. Effort: Small.
- **Left out:** A separate script that scans CSS: the build already sees each path.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** A, until a missing file reaches users. B needs the user, because it adds a build error.
- **Action:** ask the user, because B adds a build error.
