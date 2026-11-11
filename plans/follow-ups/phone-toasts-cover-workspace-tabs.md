# Phone toasts cover workspace tabs

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 10 November 2026, from the session transcript mockup work on `calummoore/session-transcript-copy`.
- **Location:** `src/shell/ui/ThemeRoot.tsx:46` and `src/shell/workspace/WorkspaceColumns.tsx:109`.
- **Reason:** The toast placement already exists across the app and is separate from copying a session transcript.

- **Terms:** A toast is a short message that gives the result of an action. The phone workspace has navigation tabs at the bottom.
- **Background:** The app uses the Firna toast provider at bottom-right for every layout. Its viewport sits 16 px from the bottom and right edges. The workspace phone view also puts its navigation tabs at the bottom.
- **Problem:** A toast covers part of those tabs until it closes. A long error toast can cover the full bar. The session transcript mockups show this existing behaviour with the copy failure message.
- **Impact if no action:** A member must dismiss the toast or wait for it to close before using a covered tab.
- **Root question:** How should the app show action results on a phone while keeping workspace navigation available?
- **Options:**
  - **A.** Inspect the current phone toast placement and propose a layout change in a separate task. Compare placement above the navigation with placement at the top. Keep current behaviour until the user approves a change. Effort: Small.
  - **B.** Keep the existing placement and its close control. Effort: Small.
- **Left out:** Change only transcript toasts. All app toasts use the same provider and can cover the same controls.
- **Wider fix:** A. Evaluate the shared toast placement once for all action results. A new check or lint does not address this layout choice.
- **Previous examples:** Copy link and settings action toasts use the same provider in `src/shell/ui/ThemeRoot.tsx`.
- **Recommendation:** A. A separate layout review can compare the real phone screens before it changes a shared control.
- **Action:** fix after merge, apply A, because the existing shared placement is outside the transcript feature. Any change to visible placement still needs an approved requirement and mockups.
