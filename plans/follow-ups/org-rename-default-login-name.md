# The default login line keeps an old org name after a rename

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from the fix of review findings 1 and 2 on branch `calummoore/delft-zjk2`.
- **Location:** `src/app/default-logins.ts` and the org rename path in `src/app/org-model.ts`.
- **Reason:** the rename of an org does not belong to the org login change.

- **Source:** Implementation. **Category:** UX wording.
- **Terms:**
  - **Default login:** the login that a member's new session takes in one org for one agent. The account response names it in `defaultLogins`, with the name of the org.
- **Background:** The app caches the default logins of each org in the account store. The account page and Get started show lines such as "Your new sessions in Acme use Acme's login." from that cache. The cache updates at each account read, at a page return, and once a minute while an org login serves.
- **Problem:** After an admin renames the org, the line can show the old name until the next read.
- **Impact if no action:** A member can read the old org name for up to a minute.
- **Root question:** How does the default login line show the current org name?
- **Options:**
  - **A.** Take the org name from the org list at render time, not from the cached default login. Effort: Small.
- **Left out:** A read of the account at each rename, because the org list already holds the new name.
- **Wider fix:** A. The org list stays the one source of org names.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the rename path is outside the org login change.
