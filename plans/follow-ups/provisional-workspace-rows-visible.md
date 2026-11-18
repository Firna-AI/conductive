# A workspace row shows before its create is accepted

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from review finding 2 on the branch `calummoore/perth-5m3h`, which adds sub-workspaces. This item holds the blocked wider fix of that finding.
- **Location:** `worker/lifecycle/start-records.ts` (the insert of the workspace row during a create), `worker/lifecycle/start-failure.ts` (`finishFailedStart`), `worker/lifecycle/workspace-data.ts` (`deleteProvisionalWorkspace`), `worker/tools/workspace-data.ts` (the tool list and read).
- **Reason:** Both options change how a create that the app never accepted ends, or what the tools show, and only the user can choose that.

- **Terms:**
  - **Provisional row:** a workspace row that the create inserts before the app accepts the first message of the workspace.
  - **Admission:** the saved acceptance of that first message. After it, a failed start keeps the workspace with its error and Try again.
  - **Sub-workspace:** a workspace that an agent nested under a parent workspace with `parentId`.
- **Background:**
  - A create inserts the workspace row during its start, before its admission. The row shows at once in the app's list and in the agent tools.
  - When the start fails before admission, `finishFailedStart` deletes the row with `deleteProvisionalWorkspace`.
  - So a row can show and then disappear. Anything that pointed at it during that time is left without its target.
  - Sub-workspaces met this: a child that named a provisional parent made the delete fail on the parent link. The branch `calummoore/perth-5m3h` fixed that case directly: a nested create now waits until its parent's create is admitted or has failed, and gets HTTP 404 when it failed.
  - Other links to a provisional row, such as a workspace link in a message, still can point at a row that disappears.
- **Problem:** A provisional row looks like any workspace, but it can disappear, so each feature that points at a workspace must know that case.
- **Impact if no action:** Each new feature that links to a workspace can meet the same disappearing row, as sub-workspaces did.
- **Root question:** How does a workspace that may never be accepted stay safe for the features that point at it?
- **Options:**
  - **A.** Keep it as it is, and let each feature handle a provisional row, as the nested create now does. Effort: Small.
  - **B.** Keep every published workspace row: a failed start before admission keeps the row in an error state, as after admission, with a way to try again or archive it. This changes how an unaccepted create ends. Effort: Large.
  - **C.** Hide a workspace from the agent tools until its admission, with an admission mark in D1 that each tool read honours. A tool then gets HTTP 404 for a row before its admission, which is a stricter check. Effort: Large.
- **Left out:** A hidden tombstone row in place of the delete, because each read must then skip it and the nested-create fix gives the same outcome with less change.
- **Wider fix:** B. No visible row can disappear, so no dependent of any shape can be left without its target.
- **Previous examples:** Review finding 2 of `calummoore/perth-5m3h`: a child blocked the delete of its never-accepted parent.
- **Recommendation:** B. It removes the case for every feature. Choose A while no second feature meets the case.
- **Action:** ask the user, because B changes how an unaccepted create ends and C adds a stricter check, and only the user can choose either.
