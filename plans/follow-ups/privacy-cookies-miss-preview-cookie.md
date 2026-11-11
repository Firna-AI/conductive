# Privacy cookie list omits the preview cookie

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/untitled-v4`, the full read of the legal pages for its protocol doc change.
- **Location:** the "Cookies" section of `src/marketing/privacy.ts:152-166`, and the session item of `src/marketing/privacy-uses.ts:73-75`.
- **Reason:** the gap existed before the branch, and the branch did not change the preview cookie.

- **Source:** Implementation. **Category:** Docs or spec.
- **Terms:**
  - **Preview cookie:** `__Secure-conductive-preview-<preview ID>`, the credential cookie of one port preview, on the domain `conductive.page`.
- **Background:**
  - The authorizer of a preview sets the preview cookie with `Secure`, `HttpOnly`, `SameSite=None`, and `Partitioned`. Its `Max-Age` is the remaining preview life, so it lasts for up to 24 hours. `worker/previews/README.md` gives these facts.
  - "Port previews" in `docs/protocol/terminal-previews-and-desktop.md` requires the cookie: a request to a preview hostname reaches the sandbox only with it.
  - The "Cookies" section of the Privacy page names the sign-in cookies of the web app and the Mac app, the GitHub sign-in protection cookie, and the GitHub return cookie, with their lifetimes. `privacy-uses.ts` names the same three in its session item.
  - `docs/protocol/website-docs.md` requires each guide to agree with the Terms and Privacy pages.
- **Problem:** Neither cookie list names the preview cookie, though each preview sets it in the viewer's browser.
- **Impact if no action:** The Privacy page gives an incomplete list of the cookies that the product sets.
- **Root question:** How does the Privacy page tell readers about the cookie that each preview sets?
- **Options:**
  - **A.** Add one sentence to the "Cookies" section: a preview sets its own cookie on the preview domain, which lets that browser open that preview, and it lasts until the preview ends, for up to 24 hours. Add the same cookie to the session item of `privacy-uses.ts`. Effort: Small.
  - **B.** Do A, and add a test that compares the cookie names that the Worker sets with the names that the Privacy page lists. It is a test for the class, so it needs the user's approval. Effort: Medium.
  - **C.** Leave the lists as they are. Effort: Small.
- **Left out:** None.
- **Wider fix:** B, because a new cookie would then fail the test until the Privacy page names it.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/privacy-page-preview-browser-cache.md`, the same code: both change what the Privacy page says about browser storage for previews. One branch can apply both.
- **Recommendation:** A. One sentence makes the list complete. Option B protects the codebase best, but it needs the user's approval as a test for the class.
- **Action:** ask the user, because A adds a sentence to a legal page, which changes user-visible text beyond the current contract.
