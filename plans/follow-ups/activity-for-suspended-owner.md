# Activity extends a computer whose owner is suspended

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from PR #52, branch `conductor/boat-native-remote-workspaces-milestone-15o`, round 2, a new problem of the check of finding 13.
- **Location:** the activity route at `worker/lifecycle/browser.ts:169`, and the deadline extension of the workspace object.
- **Reason:** user suspension existed before PR #52, so the problem is outside its diff.

- **Terms:**
  - **Activity:** a request from the browser that says a person uses the workspace, so its computer stays on longer.
  - **Auto-stop deadline:** the time at which the provider stops an idle computer by itself.
  - **User suspension:** the operator action that blocks a user and stops each computer that the user owns.
- **Background:** Finding 13 of PR #52 made the activity path refuse a suspended org. No step of the path reads the suspension of the workspace's owner.
- **Problem:** When the owner of a workspace is suspended, another member's activity request still extends the auto-stop deadline while the stop of the computer is pending.
- **Impact if no action:** If the stop keeps failing, the computer of a suspended owner runs longer than its deadline would allow.
- **Root question:** What does an activity request do for a workspace whose owner is suspended?
- **Options:**
  - **A.** Skip the deadline extension when the owner is suspended, and still reply 200. Effort: Small.
  - **B.** Refuse the request with 403 `user_suspended`. This is a new rejection. Effort: Small.
- **Left out:** No change, because the suspension must stop the computer.
- **Wider fix:** None. The extension hook that finding 13 added is the one place for both checks.
- **Previous examples:** finding 13 of PR #52, for a suspended org.
- **Recommendation:** A. It keeps the stop on time and adds no new rejection.
- **Action:** fix after merge, apply A. B adds a rejection, so it needs the user.
