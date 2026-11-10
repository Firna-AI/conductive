# Whole-value draft editors can lose an admin's edit

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`: a new problem of the check of finding 101 of its review, and a new problem of the check of finding 106 of its second review.
- **Location:** `src/shell/ui/useSavedDraft.ts` (the whole-value mode, near line 51), `src/shell/settings/GeneralTab.tsx:37`, and `src/shell/settings/ScriptSection.tsx:30`.
- **Reason:** The two editors and the whole-value mode are unchanged code of `main`, outside the routines change.

- **Terms:**
  - **Saved draft hook:** `useSavedDraft`, which keeps the draft of an editor through its saves while newer saved values arrive.
  - **Whole-value mode:** the default mode of the hook. It treats the draft as one value: a newer saved value replaces the draft only while the whole draft is unchanged, or while it still equals the draft that went out for a save.
  - **Per-field mode:** the mode `eachField`, which the routines branch added for the routine form. Each field follows the saved value on its own, and a field that went out for a save settles only on the result of that save.
- **Background:**
  - The General tab of the org settings edits the org name and the initials as one whole-value draft (`GeneralTab.tsx`). The script editor edits one script as a whole-value draft (`ScriptSection.tsx`).
  - The comment of the hook and `src/app/screens.md` say: "A failed save keeps the draft".
- **Problem:** Two cases lose an admin's edit:
  - When another admin renames the org or changes its initials during an edit, the hook keeps the whole old draft, so Save writes the other field's old value back.
  - When a newer saved value arrives while Save waits, the hook takes it as the answer of the save and replaces the sent draft. When the save then fails, the typed name or script is gone, against the documented rule.
- **Impact if no action:** A rename by one admin can undo the rename of another, and an admin can lose a typed name or script after a failed save.
- **Root question:** How do the editors of the whole-value mode keep each admin's edit when a newer saved value arrives?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Move the org name editor to the per-field mode, and give the whole-value mode the settle rule of the per-field mode: a sent draft keeps its value until the save resolves, and takes the latest saved value only then. Add a regression for each case. Effort: Small.
- **Left out:** A conflict notice. With B, only edits of the same field conflict, and the newer edit should win.
- **Wider fix:** B, with one settle rule for every mode of the hook.
- **Previous examples:** Findings 101 and 106 of the routines review fixed the same rules in the routine form.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the editors and the whole-value mode are outside the routines change.
