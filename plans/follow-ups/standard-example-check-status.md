# Standard example changes its check status

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-runner-report-limits-0m1g`, option E of review finding 14 of round 4.
- **Location:** `docs/mockups/src/screens/workspaceState.ts:244` and `docs/mockups/src/entries/app/files/index.mockup.tsx:18`.
- **Reason:** The mismatch is on `main` in the standard example, and the change that found it fixed only the large-branch example.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Review.
- **Category:** Mockup.
- **Location:** See the header.
- **Terms:**
  - **Standard example:** The catalogue pages of the workspace "Checkout address autocomplete" with complete lists.
  - **Pull request bar:** The bar above the Files panel with the pull request status and its action, such as "Squash and merge" or "Fix checks".
- **Background:** `readyWorkspace` in `docs/mockups/src/screens/workspaceState.ts:244` sets `banner: 'ready-to-merge'`. The standard pages under `app/files/` set `banner: 'checks-failed'` and have done so since commit `1b50a5d43`. The large-branch pages got one shared state for the bar on 23 November 2026.
- **Problem:** `app/chat` and `app/file-mentions/list` show "#482 Ready to merge". Their All files, Changes, and phone Files links open `app/files` and `app/files/changes`, which show "#482 2 checks failed" and "Fix checks". The sidebar status also changes.
- **Impact if no action:** A catalogue reader sees the checks fail after one press.
- **Root question:** How do the linked pages of the standard example show one pull request status?
- **Options:**
  - **A.** Set the bar of the chat and mention pages to `checks-failed`. Effort: Small.
  - **B.** Give the standard example one shared state for the bar, as the large-branch example has, and spread it in its chat pages and its 14 standard pages under `app/files/`. Many pages render again, and each needs a visual check. Effort: Medium.
- **Left out:** Accepting the change. No requirement makes the status differ.
- **Wider fix:** B, or the case table of `plans/follow-ups/saved-list-links-keep-notice.md`.
- **Previous examples:** The large-branch fix of 23 November 2026.
- **Related:** `plans/follow-ups/saved-list-links-keep-notice.md`, same cause. `plans/follow-ups/mockup-link-state-check.md` proposes a check for the class.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the mismatch is on `main` and outside the scope of the change that found it.
