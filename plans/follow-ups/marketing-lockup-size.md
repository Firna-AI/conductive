# The site and its mockup draw different lockups

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from Milestone 5 of the plan for the Mac app downloads, branch `calummoore/mac-app-downloads-site`. The difference is older than that branch.
- **Location:** `src/marketing/styles/chrome.css:70` and `docs/mockups/src/components/marketing/Wordmark.tsx:11`.
- **Reason:** the branch changes no lockup, and the fix needs a choice of the right size.

- **Terms:**
  - **Lockup:** the logo tile and the product name, which the header and the footer of the marketing site show.
- **Background:** The mockups in `docs/mockups/` are the visual spec of the marketing site. The site draws the lockup 20 px high, from `.wordmark img` in `chrome.css`. The mockup part `Wordmark` draws it 30 px high by default. A pixel comparison of the home page on 9 November 2026 found that the lockup is the only difference in the header. The footer of the site is 10 px shorter for the same reason.
- **Problem:** The site and its visual spec show the lockup at different sizes.
- **Impact if no action:** A comparison of the site with its mockup always shows this difference, and a reader cannot tell which size is right.
- **Root question:** How large is the lockup in the header and the footer of the marketing site?
- **Options:**
  - **A.** Keep 20 px. Change the default of the mockup part to 20 px. Effort: Small.
  - **B.** Use 30 px. Change `chrome.css` to 30 px, and check that the header still fits from 760 px. Effort: Small.
- **Left out:** A shared size value that both read: the site styles are CSS and the mockup part sets the size in TSX, so the value would need a build step for one number.
- **Wider fix:** None. A pixel comparison already finds the difference.
- **Previous examples:** None found.
- **Recommendation:** B. The mockup is the visual spec, and the header keeps 73 px of free space at 760 px with the current lockup.
- **Action:** ask the user, because the fix decides which side of a mockup and product mismatch is right.
