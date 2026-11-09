# An older release retry resets the update feed

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, confirmed finding 14 of the final Mac update review on branch `calummoore/desktop-app-auto-update`.
- **Category:** Product bug.
- **Location:** `desktop/scripts/publish-release.ts`, its tests in `desktop/scripts/publish-release.test.ts`, and the recovery steps in `desktop/RELEASES.md`.
- **Reason:** The original two review fix rounds are used. Apply this before the second release.

- **Terms:**
  - **Draft release:** A release that remains unpublished while its app files are prepared.
  - **Latest release:** The published release that GitHub selects for the app's update feed and latest download page.
- **Background:**
  - A failed release leaves its draft. The release guide permits a later rerun or a manual invocation of the same publisher.
  - A newer release can publish while the older draft remains.
  - `publishRelease` returns unchanged only when its target tag already has a published release. It does not consider the other versions.
  - Its final command always uses `gh release edit TAG --repo Firna-AI/remote-code --draft=false --latest`.
  - Two independent read-only command captures supplied a published `v0.3.0` and a draft `v0.2.0` to the real function. Both returned `published` and marked `v0.2.0` latest.
  - The app disables prereleases. electron-updater 6.8.9 therefore obtains the tag from GitHub's `releases/latest` endpoint. Downgrades remain disabled.
  - GitHub's release API defaults `make_latest` to `true` on first publication. Removing the CLI flag alone does not fix the behavior.
  - The API also accepts `make_latest=legacy`, which chooses by version and creation date. The existing tag check keeps each release tag on the release merge commit, so that version and date order agree.
  - `gh release edit` supports only true and false for this field. The `legacy` value needs a `gh api` PATCH request to `repos/Firna-AI/remote-code/releases/ID`.
- **Problem:** A retry of an older draft makes that older version the update feed's latest release.
- **Impact if no action:** Copies at `0.2.0` miss `0.3.0`. Older copies install `0.2.0`, and the latest download page offers it. Copies already at `0.3.0` do not downgrade. Another publication or a manual repair restores the feed.
- **Root question:** How does recovery of an earlier release keep the update feed on the newest version?
- **Options:**
  - **A.** Compare the target with the published full versions. Publish an older draft with `--latest=false`. Add the regression case to the publication tests. This adds local version-order logic. Effort: Small.
  - **B.** Publish the verified draft with a GitHub API PATCH using `draft=false` and `make_latest=legacy`. Preserve asset checks and update the existing publication test for the changed request. Effort: Small.
  - **C.** Hold every newer release until earlier failed drafts are resolved. This adds a workflow gate and needs user approval. Effort: Medium.
  - **D.** Give the app a custom provider that chooses the highest full version. This changes the protocol and adds maintenance, while the download page can still regress. Effort: Medium.
  - **E.** Delete older drafts after a newer release publishes. This changes draft preservation and deletes drafts without review, so it needs the user. Effort: Small.
- **Left out:** Removing `--latest` retains GitHub's true default. A warning alone leaves Actions-page retries unsafe. Skipping old drafts or labeling them prereleases adds no benefit over A and prevents correct recovery.
- **Wider fix:** B. GitHub owns the order for every publication through the shared script, including manual recovery.
- **Previous examples:** None found.
- **Related:** The full-tag check in `.github/workflows/release.yml` provides the correct release commit for GitHub's date ordering. Preserve the publication tests' independent seven-file fixture.
- **Recommendation:** B. It preserves recovery without a separate version-order rule in the publisher.
- **Action:** fix after merge, apply B, before the second release.

Update the existing successful-publication test to assert the new PATCH request after asset verification. A second test that only repeats the same request is unnecessary. Check GitHub's ordering once when publishing, rather than permanently testing the provider's behavior.

Primary sources: [GitHub release API](https://docs.github.com/en/rest/releases/releases#update-a-release) and [CLI release edit](https://cli.github.com/manual/gh_release_edit).
