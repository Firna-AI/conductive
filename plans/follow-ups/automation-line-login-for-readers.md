# Readers of an automation see the owner's login, not the login of its runs

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from Milestone 6 of the org agent login work on branch `calummoore/delft-zjk2`.
- **Location:** `src/shell/automations/PromptBox.tsx`, `PromptFacts`, and the automation reply of the Worker.
- **Reason:** the fix needs a new field in the Worker's automation reply.

- **Source:** Implementation. **Category:** Product bug.
- **Background:** `docs/protocol/automations.md:65-67` says that the line under the prompt names the login that the runs use. A run uses its owner's default login: the owner's own login, or the org login. The user chose this on 16 November 2026. The owner's page shows the right login, such as "Runs use Acme's Claude login and your GitHub access."
- **Problem:** A member who reads Cal's automation sees "Runs use Cal's Claude login and GitHub access.", also when the runs use Acme's login.
- **Impact if no action:** Other members read the wrong account as the payer of the runs.
- **Root question:** How does a reader of an automation learn the login of its runs?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** The automation reply names the owner of the login of its runs, from the Worker's default login rule, and the line shows it. Effort: Medium.
- **Left out:** No agent login in the line, because the protocol sentence requires it.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** B. It meets the protocol for every reader.
- **Action:** fix after merge, apply B, because the fix needs a change of the Worker reply.
