# The source failure warning can lose its step

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from `calummoore/repo-load-issue-e68j`, review round 1, findings 3 and 4, and review round 2, finding 9.
- **Location:** `worker/lifecycle/image-build-failure.ts` (`handleImageBuildFailure`, the `sourceFailure` read), `worker/lifecycle/image-sources/materialize.ts` (the catch), `worker/lifecycle/image-sources/failure.ts` (`sourceCommandFailure`), `worker/lifecycle/image-builds.ts` (the `ProviderRetryExhausted` throw).
- **Reason:** Both cases need a second failure, and the job still ends with the right state.

- **Terms:**
  - **`image_build_failed`:** the Worker warning of a failed image job. In the `sources` phase it holds `sourceStep`, the step of the repository load that failed, and `githubStatus`.
  - **Source run:** the row of `image_source_runs` for one job. Its `failure_step` and `failure_github_status` columns keep the first failure.
- **Background:** `handleImageBuildFailure` takes the step from an `ImageSourceFailure` error, or reads the source run only after a `JobTimeLimit`.
- **Problem:**
  - A cleanup database error after the source failure is saved reaches the handler as a plain error. The warning then logs `sourceStep: unknown`, although the run holds, for example, `metadata_token` with GitHub status 422.
  - A transient provider error during a source command is not wrapped with a step. When its retry window ends, `ProviderRetryExhausted` reaches the handler, and the warning logs `unknown`. A 409 or 429 at a source start does the same.
  - When GitHub refuses a token revocation, for example with 503, until the 60-minute deadline, `revokeInstallationAccessToken` in `worker/github/app-credentials.ts` and `revokeSourceToken` in `worker/lifecycle/image-sources/cleanup.ts` drop the status. At the deadline, `JobTimeLimit` reaches the handler before the loader runs, and the run holds no saved failure. The warning logs `unknown` and a null status. The revocation sites are `cleanup.ts`, `metadata.ts`, `copy.ts`, the `retry-revoke` phase of `schedule.ts`, and `legacy.ts`.
- **Impact if no action:** Operators lose the known cause of the failure in the warning that they use to find it.
- **Root question:** How does the warning keep the step and the last GitHub answer, whatever error ends the job, also when it ends while a source operation still waits?
- **Options:**
  - **A.** In `handleImageBuildFailure`, read the source run for each terminal failure in the `sources` phase that carries no details. Use the saved step. Else derive the step from the run phase after an ended retry window or a time limit: `layout-ready` and `layout` give `layout`, and `copy` gives `copy`. Do not derive a step for a suspension. Add regression tests for a failed cleanup write and an ended layout retry. Effort: Small.
  - **B.** Store one last cause, the step and the GitHub status, for each waiting source operation, such as a refused revocation, and clear it when the operation ends. The handler reads it for every terminal failure in the `sources` phase, after the saved first failure. Effort: Medium.
  - **D.** Carry the step in the shared provider retry record, and let the handler own the saved details through the failure write. Effort: Medium.
  - **C.** Store the diagnostic on the build row, with a migration. Effort: Large.
- **Left out:** A retry of the cleanup write alone still depends on which error reaches the handler.
- **Recommendation:** A for the first two cases, with B for the refused revocation. B is the wider fix that covers all three.
- **Action:** fix after merge, apply A and B, because the likelihood is Rare and the job still ends correctly.
