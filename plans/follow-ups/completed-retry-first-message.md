# A completed retry can replace the first message of a create

- **Severity:** High. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #21, branch `conductor/boat-native-remote-workspaces-milestone-5`, round 3 finding 23. The user chose to merge without a third fix round (decision 108).
- **Location:** `worker/lifecycle/workspace-response.ts:54` and `worker/lifecycle/workspaces.ts:37`.
- **Reason:** decision 108 merged Milestone 5 with this finding open.

- **Background:** A retry of a pending create returns the stored first message. A retry of a completed create uses another response builder, and the browser handler passes its result to the chat acceptance hook.
- **Problem:** The completed path takes the text, the attachments, and the agent choice from the retry body. If the first chat acceptance failed before it stored the message, an edited retry stores other content under the original message ID.
- **Impact if no action:** A short failure can change or lose the first instructions and attachment references of a workspace.
- **Root question:** Which stored record gives the first message in every answer to a repeated create, and what does a repeat with changed content get?
- **Options:**
  - **A.** Read the stored creation plan when the completed response is built. Effort: Small.
  - **B.** Make every create response use the first message of the stored admission, and remove the retry-body arguments of the completed builder. Effort: Small.
  - **C.** Store the accepted chat message during the admission, and read it for every response. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B. One stored first message serves every response path.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/creation-admission-restart.md`, the same stored admission.
- **Recommendation:** B. Add the regression: a completed retry with changed text, attachments, and agent choice keeps the first message.
- **Action:** fix after merge, apply B, because the user chose to merge Milestone 5 without a third fix round.
