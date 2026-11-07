# A restart can skip the admission of a create

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #21, branch `conductor/boat-native-remote-workspaces-milestone-5`, round 3 finding 22. The user chose to merge without a third fix round (decision 108).
- **Location:** `worker/lifecycle/start-coordinator.ts:110` and `worker/lifecycle/start-storage.ts:137`.
- **Reason:** decision 108 merged Milestone 5 with this finding open.

- **Terms:**
  - **Admission:** the stored answer of a create request, which decision 91 returns once the workspace and its first message are stored.
- **Background:** The records step of a create saves the phase `machine` before it saves the admission. Later alarms then start the sandbox.
- **Problem:** A restart between these two writes skips the admission and starts the sandbox. When the start ends, `complete` throws `A create completed before admission`, and the failure cleanup runs.
- **Impact if no action:** The create request waits through the start and then fails. The cleanup removes a workspace whose sandbox has started.
- **Root question:** How does a create leave the records phase only when the answer for its request is stored, at any point where a restart or a failed write stops the alarm?
- **Options:**
  - **D.** Save the admission first, then the next phase. A restart then runs the records step again. The order is only a convention. Effort: Small.
  - **A.** Recover a missing admission before any later phase runs. Effort: Small.
  - **B.** Commit the admission and the move to `machine` in one storage transaction, behind one method. Effort: Small.
  - **C.** One creation record carries the admission, and its type requires the admission in each phase after `records`. The records step ends with one write. Effort: Medium.
  - **E.** Store no copy of the answer, and build it from the stored records when the job leaves `records`. It conflicts with option B of `completed-retry-first-message`. Effort: Medium.
- **Left out:** None.
- **Wider fix:** C. The type removes the stored state with a phase after `records` and no admission.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/completed-retry-first-message.md`, the same stored admission. Its option B reads the admission that C keeps.
- **Recommendation:** C, with B as the fallback if the type costs too much. Each option needs the regression: stop the alarm right after the job reaches `machine`, restart, and finish the start.
- **Action:** fix after merge, apply C, because the user chose to merge Milestone 5 without a third fix round.
