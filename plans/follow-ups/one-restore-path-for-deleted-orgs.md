# Two Restore paths of a deleted org differ

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from branch `calummoore/porto-a8k1`, pull request #319, the second review of that branch.
- **Location:** `src/shell/account/DeletedOrgsSection.tsx` (`restore`), `src/members/DeletedOrgPage.tsx` (`restore`), and `DeletedOrg` in `src/shell/list/OrgHome.tsx`.
- **Reason:** The fix changes `DeletedOrgPage.tsx` and `OrgHome.tsx`, which that branch did not change, and the drift needs an unusual timing.

- **Terms:**
  - **Deleted org:** an org that an admin deleted. An admin can restore it for 7 days.
  - **Deleted orgs section:** the list of deleted orgs with Restore. The General tab of the Account page shows it, and Get started shows it while the person has a deleted org.
  - **Deleted org page:** the page at the address `/orgs/<org id>` of a deleted org. It also offers Restore, so an old link is not a dead end.
- **Background:** Both places call the same restore route of the Worker, but each has its own code for the busy state, the error, and the check that the page is still open. Each also has its own "<org> was not restored" text and its own notice part. The Deleted orgs section puts the restored org into the org list also after the page closes. The deleted org page calls its `onRestored` callback only while the page is still open, and `DeletedOrg` in `OrgHome.tsx` puts the org into the list only in that callback.
- **Problem:** An admin presses Restore on the deleted org page, then opens another page before the answer comes. The server restores the org, but the org list of the tab keeps it as deleted. So the rail hides the org, and the Account page still offers Restore, until a reload.
- **Impact if no action:** A later change of Restore must change two places, and they can drift further. In the case above, a restored org stays hidden until a reload.
- **Root question:** How does a Restore behave the same way, wherever the admin starts it?
- **Options:**
  - **A.** Make `DeletedOrgPage` call `onRestored` also after the page closes, as the section does. This keeps two copies. Effort: Small.
  - **B.** Move the restore logic into one hook in `src/members/`. It holds the call, the busy state, and the error of each org, and it gives the restored org to its caller also after the page closes. Make the section and the deleted org page use it, and share the "was not restored" text. Effort: Small.
  - **C.** Make the address of a deleted org show the same row as the Deleted orgs section in place of `DeletedOrgPage`. This removes the second screen, but it changes the screen of the `app/orgs/deleted` mockup. Effort: Medium.
- **Left out:** Deleting the deleted org page, because it is functionality that the change of 12 November 2026 chose to keep.
- **Wider fix:** B. One restore hook removes the second path.
- **Previous examples:** `plans/follow-ups/read-only-tabs-have-two-owners.md` and `plans/follow-ups/duplicate-browser-base64-helpers.md`.
- **Recommendation:** B. It removes the duplicate and the drift with no visible change.
- **Action:** fix after merge, apply B, because it reaches files outside the branch that found it, and the drift needs an unusual timing.
