# Isolation doc denies the email the operator sees

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from branch `calummoore/riga-9ags`, found by the docs check of the Long runs change.
- **Location:** `docs/protocol/isolation.md:32-33`.
- **Reason:** The Long runs change does not touch the email rule, so the fix goes in its own branch.

- **Terms:**
  - **Operator section:** the part of the web app at `/operator` where the people who run the app see the whole app.
- **Background:** Pull request #381 made the page of a user in the operator section show the primary verified email of that user. The user asked for this on 15 November 2026. `docs/protocol/operator-section.md` states it under "What the section shows".
- **Problem:** `docs/protocol/isolation.md:32-33` still says that the operator section shows no email address.
- **Impact if no action:** Two protocol docs conflict. A reader of the isolation doc gets a false fact about personal data.
- **Root question:** How does the isolation doc state what personal data the operator section shows?
- **Options:**
  - **A.** Change the sentence to say that the section shows no email address except the primary verified email on the page of a user, and link `operator-section.md#what-the-section-shows`. Effort: Small.
  - **B.** Remove the list from the isolation doc and link the operator section doc as its only source. Effort: Small.
- **Left out:** Change nothing: it keeps a false fact in a protocol doc.
- **Wider fix:** B. One source for the list stops the two docs from drifting again.
- **Previous examples:** None found.
- **Recommendation:** B. The operator section doc already owns this list.
- **Action:** fix after merge, apply B. The fix is outside the scope of the Long runs change.
