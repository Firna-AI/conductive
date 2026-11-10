# Smoke-test a Mac app update on a Mac

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the post-merge tasks of the Mac app update plan on branch `calummoore/desktop-app-auto-update`.
- **Location:** None.
- **Reason:** the test needs two published releases, and the first release comes only after the update change merges into `main`.

- **Terms:**
  - **Squirrel.Mac:** the macOS update framework inside Electron. It accepts a downloaded version, and it replaces the app when the update installs.
  - **Read-only copy:** a copy of the app that runs from its mounted DMG, or from the hidden read-only place where macOS runs a downloaded app until the user moves it.
- **Background:**
  - From `0.1.0`, each release build of the Mac app updates itself from the GitHub releases of `Firna-AI/remote-code`. No installed copy has done this yet.
  - No automated test installs a real update. The unit tests in `desktop/src/updates.test.ts` use a fake updater, and the packaged tests do not check for updates. So only a real Mac and real releases test the whole path.
  - The app checks at launch and every 4 hours. It downloads a new version automatically, about 130 MB.
  - The app shows "The update is ready." with Restart now and Later only after Squirrel.Mac accepts the downloaded version. Restart now restarts the app into the new version. Later installs it at the next quit.
  - Help → Check for updates answers with a dialog. With no new version: "Conductive is up to date.". After a failed check: "Conductive could not check for updates. Try again later.". With a new version: "Downloading the new version. Conductive tells you when it is ready.".
  - When a downloaded version waits, Help → Check for updates shows "The update is ready." again.
  - After "Downloading the new version.", a failed download or a refusal by macOS shows no dialog. That is the current behaviour, and `plans/follow-ups/manual-update-check-ends-silently.md` holds the open decision about it.
  - A read-only copy downloads each update but never installs it. `plans/follow-ups/read-only-copies-never-update.md` records that problem. So the test installs the app into Applications.
  - Conductive → About Conductive shows the version of the running app.
  - electron-updater writes its steps to the terminal when the app starts from Terminal. A failed update step also writes "Conductive: A desktop operation failed." there.
  - release-please opens the next release pull request after a `fix` or `feat` commit on `main`. From `0.1.0`, a `fix` commit gives `0.1.1`, and a `feat` commit gives `0.2.0`.
  - Each architecture has its own ZIP file in each release.
- **Task:**
  1. Quit every running copy of Conductive. Download the DMG of `v0.1.0` from `https://github.com/Firna-AI/remote-code/releases/tag/v0.1.0`: `Conductive-0.1.0-mac-arm64.dmg` for Apple silicon, or `Conductive-0.1.0-mac-x64.dmg` for Intel.
  2. Open the DMG. Check that macOS opens it with no warning about the developer. Drag Conductive to Applications, then eject the DMG.
  3. Open Conductive from Applications. Check that macOS asks only whether to open an app from the internet, with no warning about the developer. Then quit the app.
  4. Open Terminal, and start the app with `/Applications/Conductive.app/Contents/MacOS/Conductive`, so that the log shows. Use this way to start the app in each step below.
  5. Check that About Conductive shows `0.1.0`. Choose Help → Check for updates, and check that the dialog says "Conductive is up to date.".
  6. Merge the next release pull request, and wait until its release is published.
  7. Choose Help → Check for updates. Check the dialog "Downloading the new version. Conductive tells you when it is ready.". Then wait for "The update is ready.".
  8. Choose Later. Choose Conductive → Quit Conductive. Start the app again, and check that About Conductive shows the new version.
  9. Install `0.1.0` from its DMG into Applications again, and replace the newer copy. Start the app, and do not choose Check for updates. Wait for "The update is ready." from the check at launch.
  10. Choose Restart now. Check that the app restarts, and that About Conductive shows the new version.
  11. Choose Help → Check for updates, and check that the dialog says "Conductive is up to date.".
  12. When a step shows no dialog, read the Terminal log, and record the failure in a new follow-up item.
  13. When both kinds of Mac are available, run the test on each kind.
- **Impact if no action:** A defect in the update path can stop every installed copy from updating, and nobody learns of it until people miss a fix.
- **Needs:** A Mac with Apple silicon or Intel. The published release `v0.1.0`, which `plans/follow-ups/first-mac-release-check.md` checks. A newer published release, which needs a person to merge the next release pull request.
- **Related:** `plans/follow-ups/first-mac-release-check.md` gives the first release. `plans/follow-ups/alpha-build-manual-install.md` is best done after this test passes.
- **Done when:** A copy that was installed from the `0.1.0` DMG into Applications reached the newer version once through Later and the next quit, and once through Restart now. Each manual check showed its dialog. Then delete this item.
