# Check the first Mac app release

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the post-merge tasks of the Mac app update plan on branch `calummoore/desktop-app-auto-update`.
- **Location:** The release workflow `.github/workflows/release.yml`, the release pull request on `main`, and the releases of `Firna-AI/remote-code`.
- **Reason:** release-please opens the first release pull request only after the update change merges into `main`.

- **Terms:**
  - **Release pull request:** the pull request that release-please keeps open on `main`. Its merge sets the version and starts a release.
  - **Release commit:** the merge commit of the release pull request.
  - **`latest-mac.yml`:** the file of a release that tells installed copies the newest version and its ZIP files.
- **Background:**
  - On each push to `main`, the release workflow runs release-please. It keeps one release pull request with the next version and the new entries of the root `CHANGELOG.md`.
  - `.release-please-manifest.json` starts at `0.0.0`, from the bootstrap commit in `release-please-config.json`. The first `feat` commit after that commit makes the first release `0.1.0`.
  - The merge of the release pull request creates the tag `v0.1.0` on the release commit, and a draft GitHub release.
  - The release workflow then runs the Mac checks on an Apple silicon and an Intel runner. Its `verify-tag` job checks that `refs/tags/v0.1.0` points to the release commit.
  - The signing job runs in the `desktop-release` environment. It builds both architectures with the updater on, signs and notarizes them, and runs the packaged tests.
  - The publish job uploads the files to the draft. It publishes the draft only after GitHub lists every file with its full size.
  - The `desktop-release` environment admits only `main`. On 9 November 2026, a read of its rules found one deployment rule, the branch `main`.
  - The repository Actions secret `RELEASE_PLEASE_TOKEN` holds a token of a person, so CI runs on the release pull request with no approval. It was saved and checked on 9 November 2026.
  - A release must hold seven files: `Conductive-0.1.0-mac-arm64.zip`, `Conductive-0.1.0-mac-x64.zip`, their two `.zip.blockmap` files, `Conductive-0.1.0-mac-arm64.dmg`, `Conductive-0.1.0-mac-x64.dmg`, and `latest-mac.yml`.
  - The updater reads the newest release of the whole repository. So a release without these files stops the updates of every installed copy.
  - No release of this repository has run yet. The only earlier signed build is `0.1.0-alpha.1`, from Actions run 42519666993, and it has the updater off.
  - `desktop/RELEASES.md` gives the release steps, and what to do after a failed run or a failed tag check.
- **Task:**
  1. After the merge of the update change, wait for the release pull request on `main`. Check that it sets the version `0.1.0` in `package.json` and `desktop/package.json`, and that its `Complete gate` check passes.
  2. Merge the release pull request.
  3. Watch the release workflow run of that merge. Check that each job passes: `release-please`, the Mac checks on both runners, `verify-tag`, the signing job, and `publish`.
  4. Run `gh release view v0.1.0 --repo Firna-AI/remote-code --json isDraft,isPrerelease,assets`. Check that the release is not a draft and not a prerelease, and that it holds the seven files, each with a size above zero.
  5. Run `gh api repos/Firna-AI/remote-code/releases/latest --jq .tag_name`. Check that it prints `v0.1.0`.
  6. Run `git ls-remote https://github.com/Firna-AI/remote-code.git refs/tags/v0.1.0 'refs/tags/v0.1.0^{}'`. Compare its commit with `gh pr view NUMBER --repo Firna-AI/remote-code --json mergeCommit`, for the release pull request. Use the peeled `^{}` commit when present. Otherwise, use the tag target. Check that it matches the merge commit.
  7. Run `gh release download v0.1.0 --repo Firna-AI/remote-code --pattern latest-mac.yml --output -`. Check that it gives the version `0.1.0`, lists the two ZIP files, and lists no DMG file.
  8. When a step fails, follow `desktop/RELEASES.md`. Never change or delete a published release.
- **Impact if no action:** A broken first release can reach the people who install it. A release without the Mac files would stop the updates of every installed copy.
- **Needs:** The merged update change on `main`. A person with write access to merge the release pull request, because agent merges are off.
- **Related:** `plans/follow-ups/mac-update-smoke-test.md` and `plans/follow-ups/alpha-build-manual-install.md` wait for the release that this task checks.
- **Done when:** `v0.1.0` is the latest published release of `Firna-AI/remote-code`. It holds the seven files, its `latest-mac.yml` gives `0.1.0`, and its tag points to the release commit. Then delete this item.
