# A split shows two Try again buttons

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from Milestone 6 of the split panes change on branch `calummoore/porto-r3jl`.
- **Location:** `pagePlaceholder` in `src/shell/workspace/files/files-pages.tsx`, and the shared bar in `src/chat/components/ChatBody.tsx`.
- **Reason:** The case needs a failed first start in a workspace that already has a split, so it can wait for a later branch.

- **Source:** Implementation.
- **Category:** Product bug.
- **Terms:**
  - **Split:** the centre column of a workspace with two panes, each with its own tab row, as `docs/protocol/split-panes.md` says.
- **Background:** With two panes, one bar of the cloud computer shows below both panes while a pane shows a chat. After a failed first start, a file page shows the state of the cloud computer itself, with its own Try again button.
- **Problem:** A split with a chat in one pane and a file page in the other then shows Try again twice.
- **Impact if no action:** The user sees two buttons for one action. Both work.
- **Root question:** How does a split show one action for its one cloud computer?
- **Options:**
  - **A.** The file page of a split leaves out its button while the bar shows below the panes. Effort: Small.
  - **B.** The bar leaves out its button while a file page shows the state. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** None.
- **Wider fix:** None, because only the file page has this case.
- **Previous examples:** None found.
- **Recommendation:** A. One cloud computer needs one Resume, and the bar is the shared place, as `docs/protocol/split-panes.md` says.
- **Action:** fix after merge, apply A, because the case is rare and needs a failed first start in a workspace that already has a split.
