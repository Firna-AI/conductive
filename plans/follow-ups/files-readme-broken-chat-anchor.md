# Files README links a removed chat anchor

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-history-and-files-state-14g5` (Milestone 1 link check).
- **Location:** `worker/files/README.md:42`
- **Reason:** The broken anchor is older than this branch, and two parallel branches edit the files README now.

**Background:** The section "Combined integration with the chat backend" of `worker/files/README.md` links `../chat/integration/README.md#milestone-9-files`. That README has no such heading. Its section is `## Files`, so the anchor is `#files`. No command checks Markdown links in this repository.

**Problem:** The link opens the chat integration README at its top, not at its Files section.

**Impact if no action:** A reader does not land on the section that describes the runner stream of the files backend.

**Root question:** How does the link reach the Files section of the chat integration README?

**Options:**
- **A.** Change the anchor to `#files`. Effort: Small.

**Left out:** A link checker. A new check needs the user's approval, and `plans/follow-ups/doc-references-unchecked.md` covers that class.

**Wider fix:** The class is covered by `plans/follow-ups/doc-references-unchecked.md`.

**Recommendation:** A.

**Action:** fix after merge.
