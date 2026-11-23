# The words of the automation notes have two copies

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, an item of the report of its second fix round.
- **Location:** `src/shell/automations/AutomationNote.tsx` and the mockup note in `docs/mockups/src/screens/automationParts.tsx`.
- **Reason:** The words work today, and one shared module is a structure change outside the findings of the fix round.

- **Terms:**
  - **Automation notes:** the notes of the automation page: why an automation turned off (three failed runs, an owner who left, a removed repository) and who can change it.
  - **Shared UI:** the parts, styles, and words that the app and the mockups both use, in `src/ui/`. Since the user's decision of 2026-11-23, a module that the app uses lives there, and the mockups import it. A lint rejects an import of `docs/mockups/` in shipped code. `src/ui/README.md` gives the rules.
- **Background:** The app and the mockups each write the words of the automation notes. Other automation words already have one shared home that both import, such as `src/ui/components/automations/triggerCopy.ts`, which `src/shell/automations/AuthorFilter.tsx` imports.
- **Problem:** A change of a note's words in the mockups does not reach the app, and the two copies can drift.
- **Impact if no action:** The app can show words that the visual spec no longer holds.
- **Root question:** How do the app and the mockups share the words of the automation notes?
- **Options:**
  - **A.** Move the words of the automation notes into one module under `src/ui/components/automations/`, which imports no fixture, and use it in the mockup note and in `AutomationNote`. Effort: Small.
- **Left out:** A test that compares the two copies, because a structural move removes the copy.
- **Wider fix:** A.
- **Previous examples:** `triggerCopy.ts`, which both sides import.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the words work today and the move is outside the findings of the fix round.
