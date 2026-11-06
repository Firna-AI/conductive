# One removal response closes another member's dialog

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #7, branch `conductor/boat-native-remote-workspaces-milestone-15c`, finding 2.
- **Location:** `src/members/MembersTab.tsx:68` and `:136`, `src/members/membersStore.ts:134`.
- **Reason:** the defect needs two overlapping removals and responses that arrive in a set order, so it waits for a later branch.

- **Terms:**
  - **Members tab:** the org settings tab where an admin changes roles and removes members.
  - **Pending key:** the key of a running change in `membersStore`, such as `remove:priya`.
- **Background:** An admin can close a removal dialog while its request runs, and then start the removal of another member. The tab holds one dialog selection, and the store holds one failure message for every change.
- **Problem:** Each successful removal clears the one dialog selection. Start Priya's removal, close its dialog, then start Jonas's removal. When Priya's removal succeeds before Jonas's removal fails, her response closes his dialog and hides his failure. A later failure of another change also replaces the message of an open dialog.
- **Impact if no action:** The admin loses the failure message and its retry action, and Jonas stays a member without a visible reason.
- **Root question:** How does each removal change only its own member's dialog and failure?
- **Options:**
  - **A.** Clear the selection only when it still names the member whose removal ended. Add a regression for this response order. Effort: Small.
  - **B.** Disable other removals while one runs. Unrelated removals then wait. Effort: Small.
  - **C.** Put completion handling in a confirmation controller keyed to the member. Effort: Medium.
  - **D.** Let the store own each removal's dialog and failure. `membersStore` holds the member whose dialog is open, and it keeps each failure under its pending key. A response then changes only its own member's dialog and failure. Add store tests in Node for two response orders, with held fake responses. Add the rule to the Scope section of `src/members/README.md`. Effort: Medium.
- **Left out:** aborting the browser request, because it cannot undo a removal that the server already accepted.
- **Wider fix:** D. It removes both shared slots, the one selection and the one failure, for every change in the store.
- **Previous examples:** None found.
- **Recommendation:** D. Each response then reaches only its own dialog, and the tests run in Node.
- **Action:** fix after merge, apply D, because the defect needs overlapping actions and delayed responses.
