# An old Mac app copy can call a changed API

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** Medium. **Harder later:** Yes.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the options check of the first decision of the plan for the Mac app downloads, branch `calummoore/desktop-app-website-mention`.
- **Location:** `docs/protocol/desktop-app.md:34`, the line "The Mac app bundles the built web app.", and `desktop/src/updates.ts`.
- **Reason:** public downloads make the problem real, but its fix needs a version rule between the Worker and the Mac app, which is a design of its own.

- **Terms:**
  - **Bundled web app:** the built web app that each copy of the Mac app carries and serves from its own origin, `conductive-app://desktop`. The window never loads the page from a server.
- **Background:** Each copy of the Mac app runs the web app of its own version. The Worker API changes with each deploy, and breaking changes are acceptable while the project is not in production. The updater downloads each new version and installs it when the app quits. A copy whose user picks Later, a copy that cannot update, and a copy whose update fails keep the old web app.
- **Problem:** Nothing stops an old copy from calling a changed Worker API, and nothing tells its user to update.
- **Impact if no action:** The user sees errors or wrong data in the Mac app until the app quits or the user downloads a new version.
- **Root question:** How does an old copy of the Mac app stay compatible with the Worker, or learn that it must update?
- **Options:**
  - **A.** The Worker names the oldest Mac app version that it supports, for example in a response header. An older copy stops its API calls and shows "Update the Mac app". It offers Restart now only when the updater can install the new version, and Download otherwise, which opens the Mac app section of the marketing site. Effort: Medium.
  - **B.** Version the API: the Worker keeps the old shape of each changed route for a set time. Cost: each change of the API costs more, for as long as old copies run. Effort: Large.
  - **C.** Load the web app from the server, not from the package. Cost: it changes the requirement that the page opens from the package, also without the network, and the content security policy of the Mac app. Effort: Medium.
- **Left out:** Accept the risk until production: it fails as soon as users depend on the Mac app.
- **Wider fix:** A. A version rule covers every later change of the API.
- **Previous examples:** None found.
- **Recommendation:** A. One version check covers every change, and the bundled page stays.
- **Action:** ask the user, because the version check adds user-visible behaviour that no requirement covers.
