# Check for updates shows no result

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from the options check of the second decision of the plan for the Mac app downloads, branch `calummoore/desktop-app-website-mention`.
- **Location:** `desktop/src/menu.ts:31`, `desktop/src/updates.ts:57`, and the line "A failed update check does not stop the app, and it shows no error." in the section "Packages and updates" of `docs/protocol/desktop-app.md`.
- **Reason:** the result is a new user-visible message that no requirement covers, and the downloads work without it.

- **Terms:**
  - **Check for updates:** the item of the Help menu of the Mac app. It asks the updater for a new version. Builds with the updater on enable it.
- **Background:** The Mac app checks for a new version at launch and every four hours. The Help menu also has Check for updates, which runs the same check. A new version shows "The update is ready." when its download ends. The protocol says that a failed update check does not stop the app, and that it shows no error. Release builds turn on the updater once the plan for the Mac app downloads merges.
- **Problem:** When the user picks Check for updates and no new version exists, or the check fails, the app shows nothing.
- **Impact if no action:** The user does not know whether the check ran, and may pick it again or think that the app is broken.
- **Root question:** What does the user see after Check for updates from the menu?
- **Options:**
  - **A.** After a check from the menu only, show "Conductive is up to date." when no new version exists, and "Could not check for updates." with Try again when the check fails. The automatic checks stay silent. Effort: Small.
  - **B.** Show "Checking for updates…" in the menu item while the check runs, and the result as in A. Effort: Small.
  - **C.** Change nothing, and keep every check silent. Effort: Small.
- **Left out:** A message after each automatic check: it interrupts the user every four hours.
- **Wider fix:** None. The menu is the only place that starts a check by hand.
- **Previous examples:** None found.
- **Recommendation:** A. The user asked for a check, so the user gets its result.
- **Action:** ask the user, because the result changes the protocol line that update checks show no error.
