# The Files README links to a missing heading

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from the review of the branch `calummoore/perth-siol` (PR #423).
- **Location:** `worker/files/README.md:38`.
- **Reason:** The broken link was already on `origin/main`, and the change that found it does not touch that section.

- **Terms:**
  - **Anchor:** the part of a Markdown link after `#`. It names a heading of the target file.
- **Background:** Prettier ignores Markdown, and no command checks the links of Markdown files, so each change checks the links of the files that it changes by hand.
- **Problem:** `worker/files/README.md` links to `../chat/integration/README.md#milestone-9-files`. That README has no heading "Milestone 9 files".
- **Impact if no action:** A reader who follows the link lands at the top of the integration README and must search for the files part.
- **Root question:** Where should the Files README point for the integration tests of the files part?
- **Options:**
  - **A.** Point the link to the heading of `worker/chat/integration/README.md` that describes the files tests, or to the file without an anchor when no such heading exists. Effort: Small.
- **Left out:** A link check in the gate, because a new check needs the user's approval.
- **Wider fix:** None. A Markdown link check would be the wider fix, and it needs the user's approval.
- **Previous examples:** None found.
- **Recommendation:** A. It fixes the link with one edit.
- **Action:** fix after merge, apply A, because the problem is on `origin/main` and outside the change that found it.
