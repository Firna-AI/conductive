# The messages doc passes the length target

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from Milestone 2 of the split panes change on branch `calummoore/porto-r3jl`.
- **Location:** `docs/protocol/messages-and-attachments.md`, the block on the title request of a workspace.
- **Reason:** `main` edits the same block often, so a move inside a feature branch causes merge conflicts.

- **Source:** Implementation.
- **Category:** Docs or spec.
- **Background:** The `documentation` skill of `futex-ai/skills` sets a target of about 250 lines for a protocol doc, and says to split a longer one when a change touches it. The split panes change added the rule for the prompts of the pull request bar with two panes to this doc.
- **Problem:** `docs/protocol/messages-and-attachments.md` has about 300 lines.
- **Impact if no action:** The doc keeps growing, and readers find its rules more slowly.
- **Root question:** How do the rules of messages stay easy to find as the doc grows?
- **Options:**
  - **A.** Move the block on the title request of a workspace to `docs/protocol/workspace-and-session-names.md`, unchanged, and leave a link. Update the links to it. Effort: Small.
  - **B.** Change nothing. Effort: Small.
- **Left out:** Shortening the text, because each rule is a requirement, and the rules forbid compacting a file to meet a limit.
- **Wider fix:** None. A length check for Markdown would be a new gate, which only the user adds.
- **Previous examples:** The tab row moved out of `docs/protocol/agents-and-sessions.md` into `docs/protocol/tab-row.md` for the same reason.
- **Recommendation:** A. A pure move meets the target and changes no rule.
- **Action:** fix after merge, apply A, because `main` changes the same block, and a move in a feature branch causes conflicts.
