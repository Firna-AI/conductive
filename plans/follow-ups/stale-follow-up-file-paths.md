# Two follow-up items name stale files

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/components-location-misunderstood-d7lu`, the outside-scope lists of review rounds 1 and 2 and the check of review finding 3.
- **Location:** `plans/follow-ups/composer-inline-touch-controls.md:55` and `:58`. `plans/follow-ups/automation-note-words-two-copies.md:6`.
- **Reason:** Both lines were stale on `origin/main` before the change that found them.

- **Source:** Review.
- **Category:** Docs or spec.
- **Background:**
  - Commit `8872e9252`, "remove the Conductor comparison page", deleted `docs/mockups/src/components/parity/ParityIntro.module.css` and `parityRows.module.css`.
  - The words of the mockup automation notes are in `docs/mockups/src/screens/automationNote.tsx`. `docs/mockups/src/screens/automationParts.tsx` only imports `AutomationNote` from there.
- **Problem:** `composer-inline-touch-controls.md` still names the two deleted stylesheets as copies of a touch rule. `automation-note-words-two-copies.md` gives `automationParts.tsx` as the location of the note words.
- **Impact if no action:** A reader looks for files that do not exist, or in the wrong file.
- **Root question:** Do these items name the files that hold their problem?
- **Options:**
  - **A.** Remove the two deleted stylesheets from lines 55 and 58 of the touch item. Change the location of the notes item to `docs/mockups/src/screens/automationNote.tsx`. Effort: Small.
- **Left out:** A link check for follow-up items: no command checks Markdown paths, and a new check needs the user.
- **Wider fix:** None. The `plans` skill already asks each change to keep the items it touches current.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because both lines are outside the change that found them.
