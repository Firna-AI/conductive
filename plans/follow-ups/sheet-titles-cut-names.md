# Sheet titles cut long names on a phone

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-25, from branch `calummoore/remove-repo-from-menu-ouc2`, wider fix of review finding 7.
- **Location:** `src/ui/components/common/Sheet.module.css:43`, `src/shell/ui/Sheet.tsx`, `src/shell/ui/Dialog.tsx`
- **Reason:** The direct fix, a wrapping title for the Remove question of a repository, landed. The shared default reaches 16 sheets outside the diff.

- **Terms:**
  - **Sheet:** the panel that rises from the bottom of a phone screen. A dialog and a menu open as a sheet on a phone.
- **Background:**
  - The sheet title is one line with an ellipsis.
  - `Dialog` and `Sheet` now take an optional `wrapTitle`. The Remove question of a repository uses it, so its title shows the whole repository name.
  - Every other confirmation sheet still cuts its title. The phone row menu sheet of a chosen repository is titled with the repository name, and a long name is cut there too.
- **Problem:** A confirmation that names its target only in the title can hide part of that name on a phone.
- **Impact if no action:** A person can confirm an action on a phone without seeing the whole name of its target.
- **Root question:** How does each confirmation on a phone show the whole name of its target?
- **Options:**
  - **A.** Pass `wrapTitle` to each confirmation that names its target in the title. Each new caller must remember it. Effort: Small.
  - **C.** Make confirmation titles wrap by default, in the app and the mockups, and give menu sheets a separate one-line title style. Remove the `wrapTitle` option. Effort: Small.
- **Left out:** A tooltip: a phone has no pointer.
- **Wider fix:** C. A right default removes the option that each caller must remember.
- **Previous examples:** `plans/follow-ups/file-header-cuts-name-before-folder.md`.
- **Recommendation:** C.
- **Action:** fix after merge, apply C, because it changes the title of every confirmation sheet outside the diff.
