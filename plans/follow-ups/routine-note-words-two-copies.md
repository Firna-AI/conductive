# The words of the routine notes have two copies

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, an item of the report of its second fix round.
- **Location:** `src/shell/routines/RoutineNote.tsx` and the mockup note in `docs/mockups/src/screens/routineParts.tsx`.
- **Reason:** The words work today, and one shared module is a structure change outside the findings of the fix round.

- **Terms:**
  - **Routine notes:** the notes of the routine page: why a routine turned off (three failed runs, an owner who left, a removed repository) and who can change it.
  - **Mockups:** the visual spec in `docs/mockups/`. The app takes its words from them, and it may import a mockup component or module, but not a mockup screen, fixture, `paths.ts`, `ScreenLink`, or Mokly.
- **Background:** The app and the mockups each write the words of the routine notes. Other routine words already have one shared home that both import, such as `docs/mockups/src/components/routines/triggerCopy.ts`, which `src/shell/routines/AuthorFilter.tsx` imports.
- **Problem:** A change of a note's words in the mockups does not reach the app, and the two copies can drift.
- **Impact if no action:** The app can show words that the visual spec no longer holds.
- **Root question:** How do the app and the mockups share the words of the routine notes?
- **Options:**
  - **A.** Move the words of the routine notes into one module under `docs/mockups/src/components/routines/`, which imports no fixture, and use it in the mockup note and in `RoutineNote`. Effort: Small.
- **Left out:** A test that compares the two copies, because a structural move removes the copy.
- **Wider fix:** A.
- **Previous examples:** `triggerCopy.ts`, which both sides import.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the words work today and the move is outside the findings of the fix round.
