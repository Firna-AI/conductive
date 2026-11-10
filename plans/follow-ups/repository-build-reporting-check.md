# Check reports for repository build start failures

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the additional observation in the independent check of routine reporting.
- **Location:** `worker/app-api/feature-repositories.ts:92-105`, `worker/lifecycle/first-image-build.ts:32-35`, and `worker/app-api/feature-repository-builds.test.ts`.
- **Reason:** This observation needs its own reporting proof. It did not receive the independent review of a confirmed finding.

- **Terms:**
  - **Report:** A filtered error event sent to Better Stack.
  - **Repository build:** The automatic org-image build that starts after an admin selects a new repository.
- **Background:** After the repository save succeeds, `feature-repositories.ts` calls `startImageBuild`. Its catch logs `repository_image_build_start_failed` and continues to the repository-list reply. It discards the cause. The comparable added-build catch in `first-image-build.ts` preserves its warning and calls `captureWorkerWarning` with the cause. The error reporting protocol covers unexpected failures that a catch hides.
- **Task:** Use the existing repository-build route tests and reporting fixture to determine whether an unexpected build-start failure gets one filtered report. If it does not, apply the existing reporting policy at the recovery owner. Preserve the saved repository choice, reply, fixed warning, and later retry behavior. Keep normal refusals and failures already reported by another boundary silent.
- **Impact if no action:** An automatic build-start failure may leave only its log warning, without the report that the operator expects.
- **Needs:** The merged route and existing local D1 and fake providers. No deployed credential is needed. Do not change a public requirement or add a new validation rule.
- **Done when:** The route proof establishes the result. A confirmed defect gets a regression assertion that fails before its fix. All current route, reply, and retry assertions remain. Each changed asynchronous case passes ten selected runs. The complete gate passes. Remove this task when its work is complete.
