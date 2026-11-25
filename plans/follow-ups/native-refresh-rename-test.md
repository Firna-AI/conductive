# Native Git test for a refresh after a rename

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from `calummoore/repo-load-issue-e68j`, review round 2, finding 10, option B.
- **Location:** `worker/lifecycle/image-sources/local-source-test-support.ts`, `worker/lifecycle/image-sources/native-process-test-support.ts`, `worker/lifecycle/image-sources/local-materialize.test.ts`.
- **Reason:** The native fixture serves tests outside the change that found the gap, and smaller tests already cover the folder map.

- **Terms:**
  - **Source loader:** the part of an image job that gets GitHub access and copies each repository into its folder.
  - **Native fixture:** `localSourceFixture`, which runs the real Git commands of the source loader against local repositories.
- **Background:** Since 24 November 2026, a refresh after a rename copies the saved name and keeps the folder of the org image. `worker/lifecycle/image-sources/parallel.test.ts` checks that the loader commands use the captured folders. `worker/lifecycle/image-refresh-repositories.test.ts` checks that admission gives the loader the old folder. No test runs real Git for such a refresh.
- **Problem:** `localSourceFixture` maps only `example/source-repository` and only the sandbox `builder-one`, and it builds its own job. So no test checks the files that Git writes when the name and the folder differ.
- **Impact if no action:** A change in the Git commands that writes the checkout to a folder from the new name could pass the command-level tests.
- **Root question:** Which test proves, with real Git, that a refresh after a rename updates the repository in its old folder?
- **Options:**
  - **A.** Let `localSourceFixture` take the repository name and the folder map as inputs. Add a test that admits a refresh after a rename and checks the new commit and the kept files in the old folder. Effort: Medium.
- **Left out:** More assertions on the stored job miss a change in the commands.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because it changes a shared native fixture that other tests use.
