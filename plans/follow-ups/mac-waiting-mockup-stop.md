# Mac command waiting mockup shows no Stop

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from branch `calummoore/quito-0ojg`, item 10 of the mockup milestone of the agent secrets change.
- **Location:** `docs/mockups/src/screens/composerFor.ts`, the list of running chats.
- **Reason:** The agent secrets change kept the existing Mac command screens as they were, and this gap is older than that change.

- **Background:**
  - The mockups of the app show a composer under each chat. While a turn runs, the composer shows Stop.
  - A Mac command request waits while its turn runs, so the real app shows Stop under it.
  - The mockup state `mac-waiting` is not in the list of running chats in `composerFor.ts`, so its composer shows no Stop.
  - The new mockups of a waiting secret request show Stop, because their turn runs. The two kinds of request now look different.
- **Problem:** The mockup of a waiting Mac command request does not show Stop, but the app does.
- **Impact if no action:** The visual spec and the app differ, and the two kinds of request look different in the catalogue.
- **Root question:** How does the mockup of a waiting Mac command request show the composer of a running turn?
- **Options:**
  - **A.** Add `mac-waiting` to the running chats in `composerFor.ts`. Effort: Small.
- **Left out:** Removal of Stop from the secret request mockups, because a turn runs while a secret request waits.
- **Wider fix:** None. The list of running chats is already the one place for this rule.
- **Previous examples:** None found.
- **Recommendation:** A. It is a one-line change that matches the app.
- **Action:** fix after merge, apply A, because it changes an existing screen outside the scope of the agent secrets change.
