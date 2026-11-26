# Split four app guides over 300 lines

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/skill-widget-tab-page-dtzl` (skill tabs), app milestone.
- **Location:** `src/shell/workspace/key-code.md`, `src/shell/workspace/screen-parts.md`, `src/chat/tests.md`, `src/app/dev-fake.md`
- **Reason:** The four guides passed the length rule before the skill tabs change, and a split moves text that has nothing to do with skill tabs.

- **Source:** Implementation.
- **Category:** Docs or spec.
- **Background:** The repository rules keep files short: about 200 lines, and a split for a file that passes 300. The skill tabs change added two lines each to `key-code.md` (now about 327 lines) and `screen-parts.md` (now about 328 lines). `src/chat/tests.md` and `src/app/dev-fake.md` were also over 300 lines before the change.
- **Problem:** Four developer guides pass 300 lines.
- **Impact if no action:** The guides get harder to read, and each change makes the later split larger.
- **Root question:** How do these guides return under the length rule without breaking the links into them?
- **Options:**
  - **A.** Split each guide into linked pages by topic, and update each link to a moved section in the READMEs, the other guides, and the code comments. Effort: Medium.
  - **B.** Shorten each guide in place by removing repeated text. Risk: it may not reach the limit. Effort: Small.
- **Left out:** Change nothing, because the length rule stays in force.
- **Wider fix:** None. The rule is already in force.
- **Previous examples:** `plans/follow-ups/split-agent-runner-and-secrets-docs.md` records the same class for two protocol docs.
- **Recommendation:** A. A split by topic reaches the limit and keeps each page focused.
- **Action:** fix after merge, apply A, because the split is unrelated to skill tabs.
