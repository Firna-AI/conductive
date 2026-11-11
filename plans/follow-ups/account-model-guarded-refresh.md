# Keep the account data of an open tab current through one guarded source

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, the wider fix of finding 44 of review round 1 on branch `calummoore/cli-proxy-setup`, which fixed the reported case for own endpoint model lists.
- **Location:** `src/app/account-model.ts` (`setDefaultChoice`, `setNewWorkspaceView`, `refuseOperator`, the login writes, and the read of `GET /api/account`), and `src/app/` (`Resource`, `Refresher`).
- **Reason:** The direct fix re-reads only the logins. Guarding every account write changes writes of `main` outside the own endpoint change.

- **Terms:**
  - **Account data:** the reply of `GET /api/account`, which holds the agent logins, the default model, the New workspace view, and the operator role of the signed-in user. The browser keeps it in the account model.
  - **Own endpoint login:** an agent login that sends the model requests of an agent to a gateway or a proxy that the user chose, with the user's key. The Worker reads the endpoint's model list in the background, and the account data names the app models that the list does not name.
- **Background:**
  - The browser reads the account data at boot and after its own writes.
  - The own endpoint change added a read of the logins each time the page becomes visible again, and on a timer while the account has an own endpoint login. It merges only the logins, under the change number of each agent, so a read never undoes a newer login change.
  - A change of the default model, the New workspace view, or the operator role in another tab or on another device still shows only after a reload.
  - `setDefaultChoice`, `setNewWorkspaceView`, and `refuseOperator` set the account with no guard. A repeated read of the whole account that answers after one of them would put the old value back. Commit `ec33f56b` fixed this class for kept chats.
- **Problem:** Only the logins of the account data follow changes that the tab did not make.
- **Impact if no action:** The default model, the New workspace view, and the operator role can stay stale in an open tab until a reload.
- **Root question:** How does an open tab follow each change of the account data that it did not make, with no read that undoes a newer write?
- **Options:**
  - **A.** Keep the read of the logins only. Effort: Small.
  - **B.** Give the account data one refreshed source through the existing `Refresher`, and put every account write through `Resource.write`, with a commit that sets only the fields of its own answer. Keep the timer only while the account has an own endpoint login, and read at each return to the page. Effort: Medium.
- **Left out:** A push of account changes on the workspace socket, because it reaches only tabs of that workspace, and its events go into the history that every member reads.
- **Wider fix:** B. One guarded source keeps every field current.
- **Previous examples:** Commit `ec33f56b`, which fixed stale chat inputs through shared account sources in `src/chat/state/sources.ts`.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because it changes account writes of `main` outside the own endpoint change, and its effort is Medium.
