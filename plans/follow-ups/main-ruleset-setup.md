# Add the ruleset on main

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from branch `calummoore/deployment-on-merge-to-main`, PR #82. The plan of that branch asked for the ruleset before the merge. The user asked to merge first on 9 November 2026.
- **Location:** The rulesets of the GitHub repository `Firna-AI/remote-code`, and the section "CI" of `AGENTS.md`.
- **Reason:** only the user can change the settings of the repository. The token of the agents cannot change them.

- **Terms:**
  - **Ruleset:** a GitHub setting that limits how commits reach a branch. It can require a pull request and passing checks.
- **Background:**
  - Each push to `main` deploys the test deployment at `conductive.build`, with no wait for CI, as `docs/automatic-deploys.md` says. So a commit that fails the tests still goes live.
  - The user chose on 8 November 2026 that a ruleset on `main` requires a pull request and the `Complete gate` check, and that an admin can bypass it. The agents act on GitHub as the admin `calummoore`, so they can also bypass it.
  - The section "CI" of `AGENTS.md` states this rule, and it says that no ruleset enforces it yet. Change that sentence when the ruleset exists.
  - `Complete gate` is the job name in `.github/workflows/ci.yml`. The workflow `.github/workflows/desktop-ci.yml` runs only on some paths, so it must not be a required check.
- **Task:**
  1. Open the settings of the repository, then Rules, then Rulesets, and add a branch ruleset for `main`.
  2. Turn on "Require a pull request before merging", with no required approval.
  3. Turn on "Require status checks to pass", and add the check `Complete gate`.
  4. Add the role Repository admin to the bypass list.
  5. Set the enforcement status to Active.
- **Impact if no action:** A red pull request or a direct push can reach `main`, and it then goes live within minutes.
- **Needs:** Admin access to the repository settings.
- **Done when:** `gh api repos/Firna-AI/remote-code/rules/branches/main` lists the rules `pull_request` and `required_status_checks`. Then delete this item.
