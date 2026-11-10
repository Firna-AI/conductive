# Move alpha build users to a release

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the post-merge tasks of the Mac app update plan on branch `calummoore/desktop-app-auto-update`.
- **Location:** None.
- **Reason:** the message needs the first published release, `v0.1.0`, which comes only after the update change merges into `main`.

- **Background:**
  - On 8 November 2026, Actions run 42519666993 of `Firna-AI/remote-code` built the signed and notarized `0.1.0-alpha.1` packages. It ran for the tag `v0.1.0-alpha.1`, on commit `0a4f10a3ccfaab071635dcf13d656360e1faec17`.
  - Every build at that time turned the updater off. So the alpha build never checks for updates, and its Help → Check for updates item is disabled.
  - From `0.1.0`, each release build updates itself from the GitHub releases of `Firna-AI/remote-code`.
  - The alpha packages were Actions artifacts for 14 days, not a GitHub release.
  - The repository does not record who got the alpha build.
  - The app keeps the bundle ID `build.conductive.desktop` and the name Conductive. So a new copy in Applications replaces the alpha copy.
  - A copy that runs from its mounted DMG, or from a folder that macOS keeps read-only, cannot update itself. So the message tells people to drag the app into Applications.
  - Each release has two DMG files: `Conductive-X.Y.Z-mac-arm64.dmg` for a Mac with Apple silicon, and `Conductive-X.Y.Z-mac-x64.dmg` for an Intel Mac.
  - The message is user-facing text. `AGENTS.md` says that it must not name Boat, and that it must not use "Claude Code" as a name of the product or its features. Write "cloud computer" for a sandbox.
- **Task:**
  1. Wait until `v0.1.0` is published. Prefer to wait until the update smoke test passes too, so that people install a build whose updates work.
  2. Write to each person who got the alpha build. Give the release page `https://github.com/Firna-AI/remote-code/releases/latest`, and say which DMG fits which kind of Mac.
  3. Give these steps: quit Conductive, open the DMG, drag Conductive to Applications, choose Replace, eject the DMG, and open Conductive from Applications.
  4. Say that from this version, the app updates itself, and that Help → Check for updates checks at once.
- **Impact if no action:** People with the alpha build stay on it with no fixes and no updates, and they do not know why.
- **Needs:** The published release `v0.1.0`. The names of the people who got the alpha build, because the repository does not record them.
- **Related:** `plans/follow-ups/first-mac-release-check.md` checks the release that the message names. `plans/follow-ups/mac-update-smoke-test.md` checks that its updates work.
- **Done when:** Each person who got the alpha build has the message. Then delete this item.
