# Release readiness tests miss three changes

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-22, from branch `calummoore/sandbox-start-issue-secrets-v2-ffdj`, new problems of the checks of review round 2, findings 8 and 9.
- **Location:** `crates/cnd-cli/tests/runner_readiness_tests.rs`, `release_ready` in `crates/cnd-cli/src/update/presence.rs`, and `crates/cnd-cli/src/runner_update/releases.rs`.
- **Reason:** the branch used its two fix rounds, and each gap is a missing test, not a wrong result.

- **Source:** Review. **Category:** Test.
- **Terms:**
  - **Idle readiness:** `RunnerReleases::status`, which tells an idle runner whether a newer ready release exists.
- **Background:**
  - In `runner_readiness_tests.rs`, versions `0.0.8` and `0.0.9` have no `parts.json`, so readiness rejects them for that reason alone.
  - No test reads a release whose `parts.json` cannot be read through `release_ready`.
  - The new fixture lines write `parts.json`, `parts/<sha256>`, and `complete` as literal paths, not through the store.
- **Problem:**
  - A change of `>` to `>=` in `releases.rs` passes every test, and an idle runner then disconnects with no newer release.
  - A change that counts an unreadable parts list as ready passes every test.
  - A rename of a store file breaks the fixture silently.
- **Impact if no action:** These regressions can ship without a failing test.
- **Root question:** How do the readiness tests fail for each condition of a newer ready release?
- **Options:**
  - **A.** Give `0.0.8` and `0.0.9` readable lists and present parts. Add a case with an unreadable `parts.json`. Build the fixture with `DiskStore::prepare`, `unpack`, and `complete`. Effort: Small.
  - **B.** Start each case from a ready release, change one condition, and check the status again. Effort: Small.
- **Left out:** A full runner swap, because it adds process and timing work without sharper assertions.
- **Wider fix:** The mutation run in `plans/follow-ups/mutation-check-of-changed-lines.md` finds such gaps for any condition.
- **Previous examples:** Review round 1 of this branch found three release selectors that passed every test.
- **Recommendation:** B. Each case then proves that its own change made the release ineligible.
- **Action:** fix after merge, apply B, because the code is correct and only the tests are weak.
