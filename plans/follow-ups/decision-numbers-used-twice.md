# Decision 145 names two different decisions

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from `calummoore/keyboard-shortcuts-settings`, the options check of the keyboard shortcuts plan.
- **Location:** `docs/protocol/access-and-security.md:358` and `docs/protocol/command-palette.md:15`
- **Reason:** The keyboard shortcuts change only cites these docs. A renumber, or a rule that stops the reuse, is a separate docs and process change.

- **Background:** A decision number, such as decision 36, names the dated record of one decision, as `docs/architecture.md` says under "Decision numbers". The record lives in the plan of the change, then in its pull request description. On `main`, `docs/protocol/access-and-security.md` cites decision 145 for the real file paths and branch names that the browser gets. `docs/protocol/command-palette.md` cites decision 145 for the palette key, ⌘K or Ctrl+K. On 2026-11-09, open branches also reused the numbers 142 to 146 for other decisions. On the same day, the keyboard shortcuts plan first used 180 to 184, while pull request #87 put 181, 182, 184, and 185 on `main` for the workspace titles. That plan moved to 190 to 194 before its merge.
- **Problem:** One number names two decisions, so a reader cannot tell which dated record a citation means.
- **Impact if no action:** A reader can follow the wrong record. Each new reuse adds another wrong citation, and old pull request descriptions do not change.
- **Root question:** How does each decision number name exactly one decision?
- **Options:**
  - **A.** Give the palette key decision a free number in `docs/protocol/command-palette.md`, and note the old number in the description of the palette pull request. Effort: Small.
  - **B.** A, plus a list of the used numbers under `docs/`, which each plan updates when it adds a decision. Effort: Small.
  - **C.** A, plus a range of numbers for each branch, as `migrations/README.md` reserves migration prefixes for each milestone. Effort: Small.
- **Left out:** Change nothing, because the wrong citation stays.
- **Wider fix:** B. One list makes a reused number visible before it merges.
- **Previous examples:** The reserved migration ranges in `migrations/README.md` solve the same clash for migration prefixes.
- **Recommendation:** B. It fixes this case and stops the next reuse with one small file.
- **Action:** ask the user, because B adds a new rule for every plan.
