# The org name editor can write back an old name

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, a new problem of the check of finding 101 of its review.
- **Location:** `src/shell/settings/GeneralTab.tsx:37` and `src/shell/ui/useSavedDraft.ts:40`.
- **Reason:** The editor is unchanged code of `main`, outside the routines change.

- **Terms:**
  - **Saved draft:** the hook `useSavedDraft`, which keeps an editor's draft through saves and takes a newer saved value only while the draft is unchanged.
- **Background:**
  - The General tab of the org settings edits the org name and the initials as one draft.
  - When a newer saved org arrives while an admin edits, the hook keeps the whole old draft.
  - The routines branch adds a per-field mode to the hook for drafts with several fields.
- **Problem:** When another admin renames the org or changes its initials during an edit, Save writes the old value back.
- **Impact if no action:** A rename by one admin can undo the rename of another.
- **Root question:** How does the org name editor take a newer saved org without losing either admin's change?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Move the editor to the per-field mode of the saved draft hook, so that an unchanged field takes the newer value. Effort: Small.
- **Left out:** A conflict notice. With B, only edits of the same field conflict, and the newer edit should win.
- **Wider fix:** B, with the per-field mode for each editor of several fields.
- **Previous examples:** Finding 101 of the routines review, the same rule in the routine form.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the editor is outside the routines change.
