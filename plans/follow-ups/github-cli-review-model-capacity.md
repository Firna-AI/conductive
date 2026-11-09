# The required review model has no capacity

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, while checking finding 2 of the GitHub CLI authentication branch.
- **Location:** None. The shared models skill selects the second-pass review agent.
- **Reason:** Only the user can override the configured model after it remains blocked on a retry.

- **Source:** Implementation.
- **Category:** Process.
- **Terms:**
  - **Finding check:** A fresh reviewer confirms a reported defect and checks its fix options before implementation starts.
- **Background:** The first review found that GitHub CLI subcommand help requires a token. The shared model policy selects Claude `opus-5-5-1m` at `max` effort for its finding check. Both attempts stopped with HTTP 429 before the reviewer read any code.
- **Problem:** The required reviewer produced no finding check. The help fix and final pull request cannot finish through the selected review workflow.
- **Impact if no action:** The authentication fix stays on its branch. The help defect and pull request remain blocked until model capacity returns.
- **Root question:** Which model should run this task's finding checks?
- **Options:**
  - **A.** Use GPT-6 Astra at max effort for this task's finding checks. Use GPT-6.1 Sol at max effort if needed. This overrides the configured reviewer for this task only. Effort: Small.
  - **B.** Keep Claude Opus and wait for capacity. The finish time is unknown. Effort: Medium.
- **Left out:** Skipping the finding check leaves the review requirement unmet. These are the two ways to retain that check with the available models.
- **Wider fix:** None. A permanent fallback policy changes the shared model rules and is a separate task.
- **Previous examples:** None found in this repository.
- **Related:** `github-cli-subcommand-help.md` waits for this choice before its required check and fix.
- **Recommendation:** A. Both models are supported independent reviewers for this task.
- **Action:** ask the user, because the shared delegation rule reserves a blocked action's model override for the user.

Both attempts returned this exact error:

```text
API Error: Request rejected (429) · All credentials for model claude-opus-5-5 are cooling down (last error: rate_limit_error: This request would exceed your account's rate limit. Please try again later.)
```

The shared `delegating` skill says:

> Only the user can override the action, for one task.

After the user's choice, run the finding check in a fresh context.
Keep the review read-only and use max effort.
Apply the confirmed result under the review workflow.
Delete this item after the blocked check finishes.
