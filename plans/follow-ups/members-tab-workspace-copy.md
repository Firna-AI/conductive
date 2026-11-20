# Members tab counts a one-time workspace copy

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/quito-q38c`, review finding 2.
- **Location:** `src/members/membersStore.ts:187`, `src/members/MembersTab.tsx:159`
- **Reason:** The branch fixed the timing of the counts at the removal. The wider fix moves the data source of the Members tab, beyond the archive change.

### 1. Members tab counts a one-time workspace copy

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `src/members/membersStore.ts:187`
- **Terms:**
  - **Removed workspace:** an archived workspace whose 14 days of Restore ended. It leaves the workspace list and its counts, and the app keeps its data. Cal chose this on 13 November 2026.
  - **Members tab:** the org settings tab that lists each member with a count of the workspaces that the member owns (`src/members/MembersTab.tsx`).
- **Background:** The workspace list, the palette, the org page, and the Leave org question read the live workspace list of the org model. The Members tab reads its own copy of the workspaces once, when it opens (`membersStore.ts`). Its counts leave out removed workspaces by their `archivedAt`. `MembersSettings` renders the tab again at each removal time with `useListTime`.
- **Problem:**
  - A Restore clears `archivedAt` on the server, but the copy keeps the old value. So a workspace that is restored while the tab is open drops out of its owner's count when its old 14 days end, until a reload.
  - A new workspace, or an owner change made elsewhere, reaches the counts only after a reload.
- **Impact if no action:** A count in the Members tab can be wrong while the tab stays open. A reload corrects it.
- **Root question:** How do the member counts always follow the workspaces that the list shows?
- **Options:**
  - **A.** Feed the Members tab from the live org list: `MembersSettings` passes the workspaces, and the members store stops loading its own copy. Effort: Medium. The members package props, store, dev page, tests, and README change.
  - **B.** Do A, and make one hook, for example `useListedWorkspaces`, the only way to read the listed rows. Keep the time filter private. Effort: Medium.
- **Left out:** Faster polling still lags. A server filter alone leaves an open copy stale.
- **Wider fix:** B. No screen can then pair the filter with a stale copy or a clock that misses a removal.
- **Previous examples:** None found.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because it moves the data source of the Members tab, beyond the archive change.
