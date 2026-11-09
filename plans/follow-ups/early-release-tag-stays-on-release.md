# An early release tag stays on its release

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from the finding check of review finding 8 on branch `calummoore/desktop-app-auto-update`, options F and G of that finding.
- **Location:** The `release-please` job and the jobs after it in `.github/workflows/release.yml`, and the section "Releases" of `docs/protocol/desktop-app.md`.
- **Reason:** each option adds a release failure or rewrites a tag that a person pushed, and the user decides such rules.

- **Terms:**
  - **release-please:** the GitHub Action that keeps one release pull request on `main`. Merging that pull request creates the `vX.Y.Z` tag and a draft GitHub release.
  - **Release commit:** the merge commit of the release pull request. The action gives it as the output `sha`.
- **Background:**
  - The release workflow builds, signs, and publishes the release commit. Each job checks out the commit by its SHA, never by a tag or branch name.
  - release-please v17.6.0 ignores the error "tag already exists" when it creates a release (`src/github-api.ts`, line 667). So a `v0.2.0` tag that someone pushes before the merge stays on the release, at its own commit.
  - The signed files of that release still come from the release commit. The release page and its source archives follow the tag, so they show the other commit.
  - release-please starts the changelog of the next release at the commit of the newest release tag (`tagCommit.oid` in `src/manifest.ts`). An early tag on a commit that is not on `main` makes that changelog collect commits up to its search limit of 500.
  - The `desktop-release` environment admits only `main`, so a pushed tag gets no signing secrets. Agents push tags with the user's account.
- **Problem:** A tag that someone pushes before the merge decides the source that the release page shows and where the next changelog starts.
- **Impact if no action:** A release can show source that it was not built from, and the next changelog can list many unrelated commits. The signed app stays correct.
- **Root question:** How does each published release point at the commit that it was built from?
- **Options:**
  - **A.** Change nothing. A person moves a wrong tag by hand when they see it. Effort: Small.
  - **F.** Before signing, the workflow reads the tag by its full name, `refs/tags/vX.Y.Z`, and stops when it does not point to the release commit. Recovery is by hand: move the tag, then re-run the failed jobs. It adds a release failure and one protocol line. Effort: Small.
  - **G.** Right after release-please creates the draft, the workflow moves a release tag that points to another commit onto the release commit, and logs a warning with the old commit. It needs no manual step, but it rewrites a tag that a person pushed. Effort: Small.
  - **C.** Only a release identity may create `v*` tags and branches, through a GitHub tag rule. It needs an identity that is not the user's account, such as a GitHub App, because agents act as the user. Effort: Medium.
- **Left out:** GitHub's immutable releases: they lock a tag only after its release is published, so they fail the goal.
- **Wider fix:** C. It keeps every other identity from creating a release tag, whatever the tag points to.
- **Previous examples:** The tag `v0.1.0-alpha.1`, which an agent pushed on an unmerged branch on 8 November 2026.
- **Recommendation:** F. It never ships a release whose tag disagrees with its build, and it changes no tag silently. C best protects the codebase, but it needs a release identity first.
- **Action:** ask the user, because F adds a release failure, G rewrites a tag that a person pushed, and C needs a new identity.
