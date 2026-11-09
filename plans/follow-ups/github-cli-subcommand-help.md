# Subcommand help requires GitHub access

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from the first review of the GitHub CLI authentication branch, finding 2.
- **Location:** `image/github-cli.sh:3`, `worker/lifecycle/github-cli.test.ts`, and `docs/protocol/github-tokens.md`.
- **Reason:** The required finding check waits for the review-model choice in `github-cli-review-model-capacity.md`.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Wrapper:** The shell script that gets a GitHub token before it starts the system GitHub CLI.
- **Background:** Conductive authenticates GitHub CLI commands automatically. The protocol says that help commands need no GitHub access. The wrapper exempts help only when it is the first argument.
- **Problem:** `gh issue --help` and `gh issue list --help` still request a token. If the credential helper fails, the wrapper exits before it shows help.
- **Impact if no action:** Help is unavailable during credential failures. Users must know the alternative `gh help issue list` form.
- **Root question:** How should command help remain available without GitHub access?
- **Options:**
  - **A.** Recognize subcommand help flags before requesting a token. Add a regression case with a failing credential helper. Effort: Small.
  - **B.** Use one classifier for help, version, and completion commands. Distinguish flag values from help flags. Add the regression case. Effort: Small.
  - **C.** Get credentials inside the native CLI's authentication path. This requires maintaining a different CLI distribution. Effort: Large.
- **Left out:** Accepting only `gh help` leaves standard help flags dependent on authentication. Ignoring credential failures can use a saved account with the wrong identity.
- **Wider fix:** B. It separates credential decisions from the first argument's position.
- **Previous examples:** `tools/cli.ts` handles help before authenticated work.
- **Related:** `github-cli-review-model-capacity.md` blocks the required finding check before this fix can start.
- **Recommendation:** B, subject to the independent finding check. Preserve native argument meaning, including `gh issue create --title --help` and `gh auth status -h github.com`.
- **Action:** ask the user, because the required finding check waits for the review-model choice.

The first review reproduced the failure with the shipped wrapper and a failing credential helper.
Wrapped subcommand help exited 1 and showed no help.
Native subcommand help and wrapped `gh help issue list` exited 0 and displayed help.
The configured second reviewer returned HTTP 429 twice and produced no finding check.
Do not treat that missing check as confirmation or a passing review.

After the model choice, check this finding with a fresh reviewer.
Then apply the confirmed fix, verify its regression case, and rerun the required checks.
Delete this item after the fix and review finish.
