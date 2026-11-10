# Three web app readers parse a workspace record

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from the web app milestone of the branch `calummoore/chat-title-rename`, which made workspace names `null` until set.
- **Location:** `src/chat/api/read-workspace.ts`, `src/members/api/parseCore.ts`, and the workspace reader of `src/app/`.
- **Reason:** The direct fixes are in the branch. The wider fix changes readers in three areas outside the purpose of that branch.

- **Source:** Implementation. **Category:** Code structure.
- **Terms:**
  - **Workspace record:** the JSON object that the Worker sends for one workspace, with its name, branch, state, and owner. `src/shared/workspaces.ts` gives its type.
- **Background:** The user chose on 9 November 2026 that a new workspace has no name, so `name` became `string | null`. The chat and the Members tab each kept their own reader of the workspace record, and both still required text in `name`. The chat of each new workspace failed to load, and the Members tab failed while any workspace had no name. The branch fixed both readers directly.
- **Problem:** The app, the chat, and the Members tab each parse the same record with their own code, so a later change of the record can again reach only one of them.
- **Impact if no action:** The next change of the workspace record can break one screen while the others work.
- **Root question:** How does the web app read a workspace record in one place?
- **Options:**
  - **A.** Keep three readers, and add a test of each reader for each new field. Effort: Small.
  - **B.** Use one workspace reader for the app, the chat, and the Members tab. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B.
- **Previous examples:** The two readers that failed on `name: null` on that branch.
- **Recommendation:** B. One reader removes the class.
- **Action:** fix after merge, apply B, because it changes readers in three areas.
