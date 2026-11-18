# A merge can lose the edits of text that a branch moved

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-11, the wider fix of finding 136 of review round 2 on branch `calummoore/cli-proxy-setup`.
- **Location:** the `git-merge` skill of the shared skills in `futex-ai/skills`, outside this repository.
- **Reason:** The fix changes a shared skill, which the user owns.

- **Terms:**
  - **Moved text:** a section that a branch moves to a new file, such as a split protocol doc with a stub section.
- **Background:**
  - On 11 November 2026, branch `calummoore/cli-proxy-setup` moved five sections of `docs/protocol/model-gateway.md` to `docs/protocol/model-gateway-requests.md`.
  - Later, `main` edited two bullets of those sections. A merge of `main` into the branch copied `main`'s new bullets, but not its edits of the old bullets, because Git saw them as edits of lines that the branch had removed.
  - So the requests page lost the word "model" in the Codex body rule, which then forbade the ChatGPT metadata reads, and it lost "each request body and model answer unchanged". A review found it, and the branch restored both.
  - The remerge diff of the `git-merge` skill shows `main`'s lines as removed from the old file. It does not show them as missing from the new file.
- **Problem:** No step of a merge checks that each edit of moved text reaches its new home.
- **Impact if no action:** A later merge can silently drop a requirement that the other side changed.
- **Root question:** How does a merge keep each edit that one side made to text that the other side moved?
- **Options:**
  - **A.** Change nothing, and rely on the review. Effort: Small.
  - **E.** Add a step to the `git-merge` skill: when one side moved text to a new path and the other side edited that text, copy each edit to the new path, then diff the other side's version of the moved text against its new home. Effort: Small.
- **Left out:** A test, because the `testing` skill gives no test to docs.
- **Wider fix:** E.
- **Previous examples:** The merge `76d21b15` on branch `calummoore/cli-proxy-setup`.
- **Recommendation:** E.
- **Action:** ask the user, because the step changes a shared skill outside this repository.
