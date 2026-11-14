# Test helpers remove temporary folders by hand

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, the wider fix of finding 1 of the review of pull request #130, branch `calummoore/mac-app-downloads-site`, round 4, option C of its check.
- **Location:** `worker/marketing/built-site.test-support.ts`, and the helpers that call `mkdtemp(` in `worker/chat/integration/`, `worker/lifecycle/`, and `worker/terminal/scripts.test-support.ts`.
- **Reason:** the wider fix changes many test helpers outside the diff of pull request #130, which fixed its own helper with a direct `finally`.

- **Terms:**
  - **Temporary folder:** a folder that a test helper makes with `mkdtemp` in the system temporary directory, so that parallel tests do not share files.
- **Background:** Several Worker test helpers make a temporary folder, write files into it, and remove it later with `rm`. Each helper writes its own removal: a `finally` block, an `afterAll` hook, or a callback that the caller runs. Pull request #130 split the Astro build of the built-site test into a helper, and the first version returned its removal callback only after a successful build. A failed build then left the folder behind. The fix moved the removal into a `finally` block of the helper. Node 24 has `fsPromises.mkdtempDisposable()`, which removes the folder when an `await using` binding leaves its scope.
- **Problem:** No shared way ties the removal of a temporary folder to its creation, so each helper can miss an exit path.
- **Impact if no action:** A failed run can leave folders and build output in the system temporary directory, and each new helper can repeat the mistake.
- **Root question:** How does each test helper remove its temporary folder on every exit path?
- **Options:**
  - **C.** Create each temporary folder of the Worker test helpers with `fsPromises.mkdtempDisposable()` under `await using`. Start with `buildSiteAssets`, then move the other helpers that call `mkdtemp`. Write the rule in `worker/test-support/README.md`. A helper that gives its folder to a caller needs `AsyncDisposableStack`, and that needs `esnext.disposable` in the `lib` of the test configuration. Effort: Medium.
- **Left out:** A lint against a plain `mkdtemp`: a new lint needs the user, and C removes the wrong case without one. A custom `withTemporaryFolder` helper: C gets the same result from a Node built-in.
- **Wider fix:** C.
- **Previous examples:** Finding 1 of the review of pull request #130. The plan [`plans/conductive-desktop-notarization.md`](https://github.com/Firna-AI/conductive/blob/0692f4ef2/plans/conductive-desktop-notarization.md), since deleted, recorded a cancelled release that bypassed the cleanup of its temporary credentials.
- **Recommendation:** C. One built-in ties every removal to its creation.
- **Action:** fix after merge, apply C, because it changes test helpers outside the diff of pull request #130.
