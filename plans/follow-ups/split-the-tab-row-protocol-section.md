# Agents and sessions doc is too long

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from the documentation milestone of the temporary file tabs change on branch `calummoore/oslo-k1ce`.
- **Location:** `docs/protocol/agents-and-sessions.md`, the section The tab row.
- **Reason:** The tab row section changes often on `main`, so a move of it inside a feature branch causes merge conflicts.

- **Source:** Implementation.
- **Category:** Docs or spec.
- **Terms:**
  - **The tab row:** the section of `docs/protocol/agents-and-sessions.md` that states the order, the moves, the scroll, and the tab menu of the tabs above the centre column of a workspace.
- **Background:** The `documentation` skill of `futex-ai/skills` sets a target of about 250 lines for a protocol doc and says to split a longer one. The temporary file tabs change added the temporary tab, Keep open, and the move rule to The tab row. Copy link of the session tab menu, from the same week, added more. Other docs link to the section with the anchor `agents-and-sessions.md#the-tab-row`.
- **Problem:** `docs/protocol/agents-and-sessions.md` has 296 lines.
- **Impact if no action:** The doc keeps growing, and readers find the rules of sessions and of the tab row more slowly.
- **Root question:** How do the rules of the tab row stay easy to find as the tab row grows?
- **Options:**
  - **A.** Move The tab row to its own page, such as `docs/protocol/tab-row.md`. Keep a short The tab row heading in `agents-and-sessions.md` that links to it, so the `#the-tab-row` links keep working. Add the page to `docs/architecture/protocol-docs.md`. Effort: Small.
  - **B.** Change nothing. Effort: Small.
- **Left out:** Shortening the text, because the repository rules forbid compacting a file to meet a limit, and each rule is a requirement.
- **Wider fix:** None. A length check for Markdown would be a new gate, and only the user adds a gate.
- **Previous examples:** `docs/protocol/temporary-tabs.md` was split out of `docs/protocol/workspace-tools.md` for the same reason. The keyboard shortcuts doc has five linked pages.
- **Recommendation:** A. It meets the length target with a move of text and no change of a rule.
- **Action:** fix after merge, apply A, because the section changes often on `main`, and a move in a feature branch causes merge conflicts.
