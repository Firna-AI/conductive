# A squash can lose a release version footer

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, a new documentation problem from the check of finding 13 on branch `calummoore/desktop-app-auto-update`.
- **Category:** Docs or spec.
- **Location:** The `Release-As` paragraph in `desktop/RELEASES.md`.
- **Reason:** The two review fix rounds are used. Correct this in a later documentation change.

- **Terms:**
  - **Release-As:** A commit footer such as `Release-As: 0.2.0` that requests an explicit version from release-please.
  - **Squash:** A merge that combines a pull request's commits into one commit message.
- **Background:** The release guide says that a commit with this footer sets the next version. The repository permits squash, merge commits, and rebase. A squash message includes the individual commit messages. The pinned release-please 17.6.0 parser recognizes a standalone footer and one in the last commit of that body. A probe showed that it misses the footer from the first commit of a multi-commit squash.
- **Problem:** The guide does not explain that an earlier footer can disappear from the tool's interpretation after a squash.
- **Impact if no action:** A person can request a version, merge the pull request, and get the ordinary automatic version instead.
- **Root question:** How does the guide explain when a release version footer survives the merge?
- **Options:**
  - **A.** Explain the recognized final-commit footer and the multi-commit squash limitation. Give an example that keeps the footer in the final merged message. Verify the example once with the pinned parser. Effort: Small.
- **Left out:** This task corrects the guide without changing the tool or repository merge policy. Those larger changes offer no advantage for an accurate explanation. A permanent test of the third-party parser is outside the testing rules.
- **Wider fix:** None. The documentation skill already requires the guide to match the tool's behavior.
- **Previous examples:** The same footer approach was considered for the first release, where a footer in an earlier squashed commit still produced `1.0.0`.
- **Related:** `"initial-version": "0.1.0"` in the root package of `release-please-config.json` sets the first version, so the first release needs no footer. That setting does not correct the general footer explanation in `desktop/RELEASES.md`.
- **Recommendation:** A. It makes the existing instructions accurate without a new release mechanism.
- **Action:** fix after merge, apply A.

The action is pinned to `45996ed1f6d02564a971a2fa1b5860e934307cf7`. Use its bundled commit parser for the one-time example check. Verify a standalone footer, a footer in the last commit of a squash body, and a footer in an earlier commit. Do not depend on a saved review report or add a permanent test of release-please internals.
