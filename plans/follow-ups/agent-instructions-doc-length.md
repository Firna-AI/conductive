# Agent instructions doc is past its length target

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from branch `calummoore/screenshots-prompts-imnj`, item 5 of the Milestone 2 report of the screenshots in answers work.
- **Location:** `docs/protocol/agent-instructions.md`, the sections "The branch line" at line 212 and "The same text for the life of a session" at line 235.
- **Reason:** The split moves two sections that the screenshot change did not touch, and it needs a new line in the protocol docs index.

- **Terms:**
  - **Agent instructions:** the text that the runner gives each agent at the start of a session. `crates/cnd-runner/src/engine/instructions.rs` builds it, and `docs/protocol/agent-instructions.md` states its requirements.
  - **Protocol docs index:** `docs/architecture/protocol-docs.md`, which lists each protocol doc and its linked pages.
- **Background:** The `documentation` skill targets about 250 lines for a protocol doc. The always-on rules split a file only after 300 lines. The screenshot change added the screenshot line and its reasons, and the doc went from 262 to 276 lines. Commit 273582d8a split this doc once before, at 274 lines.
- **Problem:** The doc is past the length target of 250 lines.
- **Impact if no action:** The doc keeps growing, and its rules get harder to find. The next additions reach the hard limit of 300 lines.
- **Root question:** How does the agent instructions doc stay near its length target?
- **Options:**
  - **A.** Change nothing until the doc passes 300 lines. Effort: Small.
  - **B.** Move "The branch line" and "The same text for the life of a session" to a new linked page, such as `docs/protocol/agent-instructions-text.md`. Add its line to the protocol docs index, and update each link to the moved anchors. Effort: Medium.
- **Left out:** Shorter wording, because the rules forbid squeezing text to meet a limit.
- **Wider fix:** None. The `documentation` skill already sets the target.
- **Previous examples:** Commit 273582d8a split this doc at 274 lines.
- **Recommendation:** B. The two sections stand alone, and the split keeps each page short.
- **Action:** fix after merge, apply B. The split touches sections outside the screenshot change.
