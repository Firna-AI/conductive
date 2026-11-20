# Palette keeps a hidden repository filter

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from pull request #420, review finding 4.
- **Location:** `src/app/palette/palette-results.ts:64`, `src/app/palette/palette-groups.ts:188`, `src/shell/palette/PaletteFilters.tsx:22`, `src/shell/palette/PalettePanel.tsx:40`.
- **Reason:** The removal case needs unusual timing while the palette stays open, has a simple workaround, and gets no harder to fix later.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Command palette:** The app dialog that finds workspaces and runs actions.
  - **Repository choice:** A repository offered by the filter because the org selects it or a listed workspace uses it.
  - **Removed workspace:** An archived workspace whose 14 days ended; it leaves lists while its chat remains readable by link.
- **Background:** `repositoryChoices` offers repositories selected by the org or used by a listed workspace. `useListTime` renders the palette again when an archived workspace reaches removal. The Workspaces tab starts with All repositories and Active each time the palette opens, as `docs/protocol/command-palette.md` requires.
- **Problem:** When an unselected repository's last listed archive reaches removal, its choice disappears. `PalettePanel` retains `query.repositoryId`. `PaletteFilters` cannot find that ID among the choices, so it shows and checks All repositories. `palette-groups.ts` still filters the results by the retained ID. The empty line can name that hidden repository, and a search can show Nothing matches.
- **Impact if no action:** Other repositories stay hidden while the control says all repositories are searched. Selecting All repositories again, or closing and reopening the palette, corrects it. A checked menu entry still runs its action, so this workaround works.
- **Root question:** How does the palette keep the repository filter that it shows equal to the filter that it applies when the chosen repository stops being a choice?
- **Options:**
  - **A.** Keep the current repository among the choices until the palette closes. Add a regression case to the existing filter test. Effort: Small. This covers today's causes but keeps the separate fallback in the control.
  - **B.** Clear the repository filter when its choice disappears. Add the regression case. Effort: Small. This changes the person's selected search scope.
  - **C.** Resolve the repository filter once in the palette model. Use it for results, empty text, and controls. Preserve the selection until the person changes it or closes the palette. Include that repository among the choices so the menu checks it. Add the regression case. Effort: Small.
  - **D.** Count repositories from every workspace in the payload, including removed workspaces. Update the choices assertion in `src/app/palette/workspaces-tab.test.ts` and the comment of `repositoryChoices`. Effort: Small. This offers repositories with no listed workspace and does not cover repository removal by an admin.
- **Left out:** Keeping the mismatch fails the goal. A removed-workspace filter does not fix it. Freezing list time breaks removal at the deadline. Freezing choices prevents later loaded choices from appearing. Storing the repository name in the query duplicates a lookup that C can share; only org purge deletes the repository rows. Changing the control alone still needs the lookup of A or C. Server filtering cannot replace the client deadline because the payload keeps removed rows for direct links.
- **Wider fix:** C removes the separate control fallback, so a later cause of a missing choice cannot produce a different displayed filter.
- **Previous examples:** The same mismatch exists on main when an admin removes a chosen repository that no workspace uses. After the next focus refresh, its choice disappears while the query retains its ID. This case is outside the archive change, but C also fixes it.
- **Related:** `members-tab-workspace-copy.md` proposes a shared reader of listed workspaces. It would replace the time filter in `repositoryChoices`, but does not reconcile the selected repository. Either fix can land first.
- **Recommendation:** C. It preserves the person's choice and makes the displayed filter match the applied filter.
- **Action:** fix after merge, apply C, because the archive case needs unusual timing and has a simple workaround.
