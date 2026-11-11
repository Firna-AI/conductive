# Sandbox branch guides name the wrong branch

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from the captured-main preservation audit on branch `calummoore/conductor-import-option`.
- **Location:** `docs/deployment.md:220` and `worker/lifecycle/workspace-object.md:162`.
- **Reason:** Both sentences came unchanged from main, so one separate documentation fix can reach the other open branches.

- **Source:** Review.
- **Category:** Docs or spec.
- **Terms:**
  - **Workspace base:** The branch that a workspace compares its work with, stored on its workspace record.
  - **Sandbox:** The cloud computer that runs a workspace's agent and tools.
  - **Branch setting:** The environment value `CONDUCTIVE_DEFAULT_BRANCH` that the Worker sends to the sandbox.
- **Background:** Conductive starts a cloud computer for each active workspace. A pull request routine can use a workspace base other than the repository default. The Worker sends that base in the branch setting, with the repository default as a fallback.
- **Problem:** The deployment guide says create and resume send the repository default. It says a disk retention restart sends the current repository default. The workspace object guide says each start sends the repository default. These sentences omit the stored workspace base.
- **Impact if no action:** A maintainer can diagnose a correct pull request run as an incorrect branch setting. The two guides disagree with the current startup guide.
- **Root question:** How should the internal sandbox guides describe the branch that each start sends?
- **Options:**
  - **A.** Correct both guide sentences to describe the workspace base and repository-default fallback. Keep the code and setting name. Effort: Small.
  - **B.** Rename the setting to name the workspace base, then update all tool, runner, image, and guide consumers. This changes an environment contract beyond the wording defect. Effort: Medium.
- **Left out:** Change nothing leaves the guides incorrect. Change the Worker to send only the repository default breaks the current workspace-base behavior. A generated documentation gate adds a permanent check for two prose sentences and does not earn a test.
- **Wider fix:** None. The documentation skill already requires internal mechanics to match their code owners.
- **Previous examples:** None found beyond these two sentences.
- **Recommendation:** A. It states the existing behavior and preserves the environment contract.
- **Action:** fix after merge, apply A, because the wording came unchanged from main and belongs in a separate documentation change.

The source evidence is in these live files:

- `worker/lifecycle/start-machine.ts` passes `job.baseBranch ?? job.defaultBranch` to `sandboxEnvironment`.
- `worker/lifecycle/disk-retention.ts` passes `row.baseBranch ?? repository.defaultBranch` to the same builder.
- `worker/lifecycle/sandbox-environment.ts` writes that argument to `CONDUCTIVE_DEFAULT_BRANCH`.
- `worker/lifecycle/README.md` already states that create, resume, and disk retention pass the workspace base through that setting.
- `image/workspace-start.md` already describes the workspace base, with the repository default as a fallback.
- `worker/lifecycle/workspace-base.test.ts` covers a `feature/review` base in both ordinary start and retention paths.

No product change, test, or new gate is needed for option A. Check the changed Markdown links and inspect both sentences after the edit.
