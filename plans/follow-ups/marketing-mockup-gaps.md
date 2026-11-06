# Marketing mockups miss pages that the site has

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #5, branch `conductor/boat-native-remote-workspaces-milestone-15d`, the notes outside its scope.
- **Location:** `docs/mockups/src/screens/marketing/`, `docs/mockups/src/components/marketing/BoatNote.module.css`, and the sign-in screen of the app.
- **Reason:** the Milestone 15d branch could not change the mockups or the app, so these gaps wait for a later branch.

- **Terms:**
  - **Marketing site:** the public pages at the root domain, which Milestone 15d built from typed templates in `src/marketing/`.
- **Background:** The mockups are the visual spec of the product. Milestone 15d built the marketing site and its legal drafts from the mockups, and it widened the touch targets of the phone text links of the site to 44 pixels.
- **Problem:**
  - The mockups have no screens for the Terms, the Privacy, and the not-found pages that the site serves.
  - The mockup `BoatNote` link keeps a small phone touch target, while the site's links got the 44-pixel target.
  - The sign-in screen of the app does not link to the Terms and the Privacy pages.
- **Impact if no action:** The site and the mockups drift apart, and a later change of the site has no spec to compare against.
- **Root question:** How do the mockups show every public page that the site serves, with the same touch targets?
- **Options:**
  - **A.** Draw the Terms, Privacy, and not-found pages in the mockups, give `BoatNote` the same invisible 44-pixel phone target, and add the legal links to the sign-in mockup and screen. Effort: Small.
  - **B.** Draw only the not-found page, and link the legal pages from the existing marketing mockup. Effort: Small.
- **Left out:** a check that compares the site and the mockups, because the `testing` skill gives no test to doc or design prose.
- **Wider fix:** None. Each gap is one missing screen or one style.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because it changes the mockups and the app outside the branch that found it.
