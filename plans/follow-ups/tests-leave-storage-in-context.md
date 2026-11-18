# Worker tests leave storage folders in .context

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-12, from the review of the branch `calummoore/lima-4mfe`, round 1.
- **Location:** `worker/lifecycle/real-runtime-test-support.ts` (the `root` folder of `realRuntimeFixture`), `worker/chat/integration/failed-first-start-retry.test.ts:65`, `worker/chat/integration/workspace-lifecycle.test-support.ts:16`, `worker/features/agent-session-writes.test-support.ts:35`, and the other tests that write under `.context/`.
- **Reason:** The tests wrote these folders before that branch, and that branch only made them faster.

- **Terms:**
  - **Persistence folder:** the `resourcePersistencePath` of a Miniflare test runtime. Miniflare keeps the D1 database and the Durable Object storage of the runtime there.
- **Background:**
  - Some Worker test helpers create their persistence folder with `mkdtemp` under the git-ignored `.context/` folder of the repository, for example `.context/boat-native-remote-workspaces/8i/completion/legacy-runtime/case-*` and `.context/boat-native-remote-workspaces/8o/worker/retry-runtime-*`.
  - These tests never delete the folders. Since 12 November 2026, each folder also holds a copy of the migrated template database.
  - On one workspace, `.context/boat-native-remote-workspaces/` held 422 MB.
  - On a machine with a slow disk, tests with these folders time out at the 15-second test limit. The same tests pass in about 4 seconds when the folder is in memory.
  - `worker/test-support/migrated-storage.ts` already creates its own runtime folders under one folder per Vitest run, which the global teardown in `worker/test-support/native-global-setup.ts` deletes.
- **Problem:** The tests fill the workspace disk, and their storage sits on the repository disk, not in the temp folder.
- **Impact if no action:** The `.context/` folder grows with each local test run, and a slow repository disk makes these tests time out locally.
- **Root question:** Where do test persistence folders live, and who deletes them?
- **Options:**
  - **A.** Create each persistence folder with `migratedStorage()` from `worker/test-support/migrated-storage.ts`, so it lives in the run folder, and delete it when the fixture closes. Effort: Small.
  - **B.** Keep the folders under `.context/`, and delete each one when its fixture closes. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** A shared cleanup script, because it leaves the folders on the repository disk during the run.
- **Wider fix:** A. One helper owns every test persistence folder and its deletion.
- **Previous examples:** None found.
- **Recommendation:** A. It uses the existing helper and the run folder that the global teardown already deletes.
- **Action:** fix after merge, apply A.
