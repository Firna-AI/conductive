# Code comments keep gaining decision labels

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-runner-report-limits-0m1g`, the wider fix of review finding 10 of round 3.
- **Location:** `eslint.config.js`, and the comments under `docs/mockups/src/` and `src/`.
- **Reason:** The fix is a new lint, and a new lint needs the user's approval.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Review.
- **Category:** Repository rule.
- **Location:** `eslint.config.js`.
- **Terms:**
  - **Decision label:** A decision number or option letter in a comment, such as `decision 57`, `M4 = F`, or `item 3 A`. Each label names the dated record of one user decision in a plan.
  - **Documentation skill:** The shared rules for docs and comments that `AGENTS.md` adopts.
- **Background:** The documentation skill says: "A `README.md` or a code comment holds no decision number, decision status, milestone name, or branch status." Plans keep the dated decisions, and protocol docs keep the decisions in force. Mockup rationale strings and catalogue Markdown may cite decisions, and the comment rule does not cover them. Mockup writers often copy those citations into code comments.
- **Problem:** The rule alone does not stop the class. Four changes added decision labels to code comments in two weeks: commit `df93a1914` (10 November 2026), commit `36381614a` (17 November 2026), PR #426 (22 November 2026), and the runner file report limits mockups (23 November 2026). Each time, a review found the labels, and a fix removed them. A search on `main` found about 202 labelled comment lines in 114 mockup files and about 157 in 120 product files. That is 9.6% of mockup source files, against 2.5% of product files.
- **Impact if no action:** Each new change can copy a label, and each review spends a finding and a fix on it.
- **Root question:** How can the repository stop decision labels from entering code comments?
- **Options:**
  - **A.** Keep the rule as the only guard. Reviews keep finding the labels. Effort: Small.
  - **B.** Remove the labels from the existing comments, so that new code finds none to copy. Read each line to keep its fact. Parallel branches can conflict with this edit. Effort: Large.
  - **C.** Add a local ESLint rule that rejects decision labels in code comments, with its own test cases. ESLint has no core rule for this, and `eslint.config.js` has no local plugin yet. Exempt the existing files with an allow list, or do B first. The pattern must know each label shape, so a new shape passes. Effort: Medium.
  - **D.** Ask the owner of the shared skills to add one sentence to the documentation skill: the comment rule also covers mockup code, and only a rationale string cites a decision. The cause of the copying is not proven. Effort: Small.
- **Left out:** A test of comment text. The `testing` skill gives doc prose no test. Moving the labels to a README. A README cannot hold them either.
- **Wider fix:** C. It catches the class at the gate.
- **Previous examples:** `plans/follow-ups/skills-comment-decision-labels.md` holds the PR #426 case. It left the lint out because the rule was in force and a lint needs approval.
- **Related:** `plans/follow-ups/skills-comment-decision-labels.md`, same class. Its fix removes three labels. It does not wait for this answer.
- **Recommendation:** C with D. C stops the class at the gate, and D tells mockup writers the rule before they write.
- **Action:** ask the user, because the recommended option adds a new lint, and the user decides each new lint.
