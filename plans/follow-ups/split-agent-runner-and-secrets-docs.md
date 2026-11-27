# Split two protocol docs over the length target

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/skill-widget-tab-page-dtzl` (skill tabs), docs milestone item 4.
- **Location:** `docs/protocol/agent-runner.md`, `docs/protocol/tokens-and-secrets.md`
- **Reason:** The split moves many requirements and anchors that have nothing to do with skill tabs, so it does not belong in that change.

- **Source:** Implementation.
- **Category:** Docs or spec.
- **Background:** The `documentation` skill sets a target of about 250 lines for each protocol doc. It says to split a doc that passes the target into linked pages when you touch it. The skill tabs change added only pointer lines to these two docs, and put the details in `docs/protocol/skill-tabs.md`.
- **Problem:** `agent-runner.md` has about 271 lines and `tokens-and-secrets.md` has about 255 lines. Both pass the target.
- **Impact if no action:** The two docs get harder to read and to review, and each new rule makes the later split larger.
- **Root question:** How do these two docs return under the length target without breaking the links into them?
- **Options:**
  - **A.** Split each doc into linked pages by topic, as other protocol docs do (for example `skill-mentions.md` and `skill-sources.md`). Keep each moved anchor reachable: update each link in `docs/`, the READMEs, `src/marketing/docs/`, and the code comments that point to a moved section. Effort: Medium.
  - **B.** Shorten the docs in place by removing repeated reasons and history. Risk: few lines are repeated, so B may not reach the target. Effort: Small.
- **Left out:** Change nothing, because the length rule stays in force.
- **Wider fix:** None. The `documentation` skill already holds the rule.
- **Previous examples:** `docs/protocol/github-banner.md` (about 320 lines) and `docs/protocol/explain.md` (about 312 lines) also pass the target.
- **Recommendation:** A. A split by topic reaches the target and follows the pattern of the other protocol docs.
- **Action:** fix after merge, apply A, because the split is unrelated to skill tabs.
