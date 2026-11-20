# Palette mockup says a switch opens the list

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from branch `calummoore/milan-hmhx`, a problem outside the scope of its review.
- **Location:** `docs/mockups/src/entries/app/command-palette/actions/index.mockup.tsx`, the `description` of the entry.
- **Reason:** PR #353 made the text wrong before this branch, so its fix belongs to a separate change.

- **Terms:**
  - **Switch to row:** a row of the command palette that opens another org of the person.
- **Background:** The description of the mockup `app/command-palette/actions` says "A switch to an org opens its list." Since PR #353 of 13 November 2026, a Switch to row opens the last workspace that the person opened in that org, and only an org without one opens its list, as `docs/protocol/org-rail-order.md` says under "Opening an org".
- **Problem:** The visual spec of the palette states the old behaviour.
- **Impact if no action:** A reader of the catalogue expects a switch to open the list.
- **Root question:** Does the description of the Actions tab say what a Switch to row opens?
- **Options:**
  - **A.** Change the sentence to "A switch to an org opens the last workspace that the person opened there, else its list." Effort: Small.
- **Left out:** Only one approach is real, because the protocol doc settles the behaviour.
- **Wider fix:** None. The `documentation` skill already covers this class.
- **Recommendation:** A. The description then matches the protocol.
- **Action:** fix after merge, apply A, because the text is outside the scope of the branch that found it.
