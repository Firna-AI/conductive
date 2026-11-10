# Retained diffs fail after a default rename

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from checked review finding 4 on `calummoore/github-status-bar-actions`.
- **Location:** `worker/files/handlers.ts`, `worker/files/data.ts`, `worker/files/content.ts`, `worker/files/runner.test.ts`, `worker/lifecycle/continue-data.ts`, and `runner/src/comparison-base.ts`.
- **Reason:** This rare defect has a Worker-only fix that reaches every runner image at the next deploy and costs the same later.

- **Terms:**
  - **Continue:** The action that starts a new branch after a merge while keeping the workspace's cloud computer and sessions.
  - **Runner:** The program in a cloud computer that supplies file reports and diffs.
  - **Changes report:** The stored file changes and comparison-base name of one workspace.
  - **D1:** The database that stores workspace and repository records.
  - **origin/HEAD:** The local Git reference that names the fetched default branch of one repository copy.
- **Background:** Each workspace has its own repository copy and runner. Workspaces of one repository in an org share one D1 repository row. Continue reads GitHub's current default, updates only its own repository copy, and writes the default name to that shared row. Each file diff request currently takes its fallback name from that row. Each workspace's Changes report keeps its own comparison-base name.
- **Problem:** Start workspaces A and B while the default is `main`. Rename the GitHub default to `trunk`. Continue B, which updates the shared default to `trunk`. A still has `origin/HEAD` on `main`. Its current runner returns a valid diff with `baseBranch: "main"`, but `parseDiff` requires the requested `trunk` and returns HTTP 502 `file_unavailable`. An older runner instead tries to resolve `trunk`, which its copy lacks, and returns HTTP 503 `file_unavailable`. Changes stays readable in both cases.
- **Impact if no action:** A's file diffs remain unavailable until its local reference or request context changes. Members must inspect diffs through Terminal or GitHub. A shorter mismatch also occurs in the continued workspace between its move and publication.
- **Root question:** How does each workspace open its diffs against the same base as its Changes list after the repository's default branch changes?
- **Options:**
  - **A.** Accept a selected base name and match replies through the request ID, path, connection, and type. This removes the existing name equality check and its live mismatch assertion. It requires approval before selection. Effort: Small.
  - **B.** Send the base name from this workspace's stored Changes report. Keep the shared D1 default as the fallback when no report exists. Keep the existing reply equality check and legacy mismatch assertion. A local base change can still briefly precede its next report. Effort: Small.
  - **C.** Add a requested-fallback echo to new runner replies, separate from the selected comparison base. Validate the echo while preserving legacy reply checks. An echo may only widen acceptance, so a different echo falls back to the legacy rule. This closes the new-runner mismatch but leaves older runners unable to resolve `trunk`. Effort: Medium.
  - **D.** Pin each diff to the base commit of the stored Changes report. Send that commit with its base name. New runners compare that commit. Older runners use the name, as in B. This also closes B's short window, but changes the stored report and both runner messages. It needs a fallback when the commit is unavailable. Effort: Medium.
- **Left out:** Keeping the current code rejects a valid result. Reporting the request name while comparing another branch gives a false base label. Updating every computer adds credentialed work and misses stopped copies. Another per-workspace default column duplicates the report and needs a migration. Browser retries cannot repair the Worker request context.
- **Wider fix:** B. Each workspace's report supplies its request context, so another workspace cannot change that context through the shared repository row. D also closes the short same-workspace window at a larger scope.
- **Previous examples:** The shared comparison resolver and selected-base reply entered with commit `f3cfe87c`. The existing `worker/files/runner.test.ts` mismatch case requests `trunk`, receives `main`, and expects HTTP 502. Earlier repository-selection writes could also leave old copies unable to resolve a new default name.
- **Recommendation:** B. It fixes the retained workspace on both old and current runner images without a runner contract change.
- **Action:** fix after merge, apply B, because this rare Worker-only fix is independent and does not get harder after merge.

Keep the shared repository update. Agent target-branch context reads it. Keep Continue's fetch inside its own sandbox. Preserve the one comparison resolver, its `origin/HEAD` preference, local branches, and tree-tip comparisons. Do not switch to merge-base comparisons.

Preserve the D1 fallback in the file-handler tests when no Changes report exists. Preserve every connection, request ID, type, path, byte-budget, and legacy base-mismatch assertion. Add the renamed-default case through the normal HTTP diff path with two workspaces. Check current and older replies. Assert the actual base name and diff content. Add no sleep, retry, timeout increase, or prose test.
