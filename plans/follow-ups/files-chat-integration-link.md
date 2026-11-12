# Repair the files integration link

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from the agent-tools-conductor-parity documentation link check on `calummoore/untitled-v3`.
- **Location:** `worker/files/README.md:38` and `worker/chat/integration/README.md`, section "Files".
- **Reason:** The broken link predates the agent-tool change and lies outside its documentation scope.

- **Background:** The files backend README explains how file reports use the chat backend. Its integration link should open the matching Files section.
- **Problem:** The link uses `../chat/integration/README.md#milestone-9-files`. The target has a `## Files` heading, which gives `#files`, and no old anchor.
- **Impact if no action:** A reader lands at the top of the page and must find the section by hand.
- **Root question:** How should the files README link to the current chat integration section?
- **Options:**
  - **A.** Change the fragment to `#files`. Keep the link text and the surrounding explanation. Effort: Small.
- **Left out:** Removing the link loses useful navigation. Adding the obsolete milestone anchor keeps a milestone name in a live README. Only A meets the navigation goal and the current documentation rules.
- **Wider fix:** None. The documentation skill already requires checks of changed Markdown links.
- **Previous examples:** None found in the existing follow-up items.
- **Recommendation:** A. It points to the existing section and keeps the explanation intact.
- **Action:** fix after merge, apply A, because this pre-existing link is outside the agent-tool change.
