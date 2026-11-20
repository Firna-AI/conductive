# GitHub action error codes are untyped strings

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from branch `calummoore/header-button-action-s2vj`, review finding 6.
- **Location:** `worker/github/merge-errors.ts:3`, `worker/github/ready.ts:26`, `src/github/barRuns.ts:72`, `src/github/barRuns.ts:93`, and `src/test-support/fake-bar.ts:49`.
- **Reason:** The fix also changes the Merge error codes, which the branch that added Ready for review did not touch.

- **Terms:**
  - **Pull request bar:** the bar at the top of the right column of a workspace. It shows the GitHub state of the branch and one main action, such as Merge or Ready for review.
  - **`mergeOutcome` and `readyOutcome`:** the functions in `src/github/barRuns.ts` that turn a refused Merge or Ready for review into the line under the bar.
- **Background:**
  - The Worker refuses Merge with the codes `github_head_changed`, `github_merge_forbidden`, and `github_merge_refused`, from `worker/github/merge-errors.ts`.
  - The Worker refuses Ready for review with `github_ready_forbidden`, `github_pull_changed`, and `github_ready_refused`, from `worker/github/ready.ts`.
  - `mergeOutcome` and `readyOutcome` match these codes as literal strings in a `switch`. An unknown code falls back to a failure line with the Worker's words.
  - The fake API in `src/test-support/fake-bar.ts` writes the same codes again as literal strings.
- **Problem:** No type ties the Worker's codes to the app's mappings. A renamed or a new code compiles, and the bar then shows the fallback line instead of the words and the link that the mockups give.
- **Impact if no action:** A later change can show the wrong refusal line, with or without Open on GitHub, and only a test that names the exact code catches it.
- **Root question:** How does the typecheck make sure that each refusal code of a bar action reaches the bar as its own message?
- **Options:**
  - **A.** Keep one test for each code in `src/github/barReady.test.ts` and `src/github/barActions.test.ts`, as now. Effort: Small.
  - **B.** Export the refusal codes of Merge and Ready for review as typed constants in `src/shared/github.ts`. The Worker errors, `mergeOutcome`, `readyOutcome`, and the fake API use them. Each mapping becomes an exhaustive `Record` from code to reason, so the typecheck fails on a missing code. Effort: Medium.
- **Left out:** A contract test that runs the real Worker replies through the app client. B is better on every point, because it needs no Worker harness in an app test.
- **Wider fix:** B. It is a structural fix: a shared type that cannot hold a code without a mapping.
- **Previous examples:** The Merge codes in `worker/github/merge-errors.ts` and `mergeOutcome` follow the same untyped pattern.
- **Recommendation:** B. It protects Merge and Ready for review with one shared type.
- **Action:** fix after merge, apply B, because it also changes the Merge code outside the branch that found it.
