# Each place applies its own name emphasis

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/workspace-status-icons`, review round 1, the wider fix B of finding 2.
- **Location:** `docs/mockups/src/components/workspaces/status.ts`, `docs/mockups/src/components/workspaces/WorkspaceRow.tsx`, `docs/mockups/src/components/palette/PaletteRows.tsx`, `docs/mockups/src/components/chat/WorkspaceChip.tsx`, `src/shell/list/WorkspaceRow.tsx`, `src/shell/palette/PaletteList.tsx`, and the style modules `docs/mockups/src/components/workspaces/WorkspaceRow.module.css`, `docs/mockups/src/components/palette/CommandPalette.module.css`, and `docs/mockups/src/components/chat/WorkspaceChip.module.css`.
- **Reason:** One shared name part moves the name styles of the list, the palette, and the chips, beyond the chip defect that its branch fixed.

- **Terms:**
  - **Workspace:** one task in Conductive, the coding tool at `conductive.build`. A workspace has its own branch, cloud computer, and chat.
  - **List mark:** the mark of 3 × 3 cells before a workspace name in the workspace list, the command palette, and a chip. Its colour shows the GitHub state, and its motion shows whether the agent works.
  - **Chip:** the small box that shows a workspace link in chat text or in a message field.
  - **Emphasis:** the look of a workspace name for its state. `activityPresentation` in `docs/mockups/src/components/workspaces/status.ts` gives `strong` for unread output, `active` for working and needs input, `dim` for stopped and archived, and `normal` for the other states.
- **Background:**
  - The list mark gives a ready workspace and a workspace with unread output the same cells. So bold text is the only visible sign of unread output.
  - "The list mark" in `docs/protocol/workspace-life.md` says: "Bold text alone marks unread output." The user approved the plan with that rule on 10 November 2026.
  - Each place applies the emphasis in its own code, with its own styles:
    - The list rows: `docs/mockups/src/components/workspaces/WorkspaceRow.tsx` and `src/shell/list/WorkspaceRow.tsx`. `WorkspaceRow.module.css` gives `.strong` the ink colour and the strong weight, `.active` the ink colour, and `.dim` the muted colour.
    - The palette rows: `docs/mockups/src/components/palette/PaletteRows.tsx` and `src/shell/palette/PaletteList.tsx`. `CommandPalette.module.css` gives `.strong .label` the strong weight and `.dim .label` the muted colour.
    - The chips: `docs/mockups/src/components/chat/WorkspaceChip.tsx`, which the app also draws.
  - The chip first had no emphasis, so an unread chip looked like a ready chip. The workspace mark review found this on 10 November 2026.
  - The direct fix gives an unread chip name the class `strong` of `WorkspaceChip.module.css`. It reads the emphasis from `activityPresentation`. The rule `.text .strong` sets `--ui-weight-strong`, which is 600, in any order of the stylesheets.
  - Every other chip name keeps the weight 500 of `.name` in `InlineChip.module.css`. A stopped or archived chip name is not dimmed. `InlineChip.module.css` also styles file chips, so the chip weight lives in `WorkspaceChip.module.css`.
- **Problem:** Each place that shows a workspace name must apply the emphasis itself. A new place can leave it out, as the chip did.
- **Impact if no action:** A later place can show a workspace with unread output that looks ready. This also holds on a phone, where the workspace list is not on the screen.
- **Root question:** How does each place that shows a workspace name keep the emphasis of its state?
- **Options:**
  - **A.** Add one helper that gives the emphasis class of a name for a state. Each place still calls it. Cost: a new place can still skip the call. Effort: Small.
  - **B.** Add one shared name part that requires the workspace state and applies its emphasis. Use it for the names of the list rows, the palette rows, and the chips, in the mockups and in the app. Each place passes its own classes, so it keeps its layout and its colours. Effort: Medium.
- **Left out:**
  - A test or a lint that checks every name for the emphasis is a detection fix. B is a structural fix, and the item adds no new gate.
  - A separate unread mark breaks the user's list mark decision of 10 November 2026. That decision gives the mark one colour, for the GitHub state.
  - Changing nothing keeps the omission possible, so it fails the goal.
- **Wider fix:** B. A name part that cannot render without a state prevents a missed emphasis in each later place.
- **Previous examples:** The workspace mark change of 10 November 2026: the chip name had no unread emphasis.
- **Recommendation:** B. It makes the state a required input of every workspace name, and each place keeps its own look.
- **Action:** fix after merge, apply B, because it moves the name styles of the list, the palette, and the chips beyond the chip defect.

## Scope and completion checks

- The shared part renders only the name. The mark, the number label, the time, and the hidden words stay with each place.
- Each place keeps its look:
  - List rows keep the ink colour and the strong weight of unread. They keep the ink colour of working, needs input, and the selected row, and the muted colour of stopped and archived.
  - Palette rows keep the strong weight of unread and the muted colour of stopped and archived.
  - Chips keep the strong weight of unread and the weight 500 of every other state, with no muted colour.
- The Rename field of a row still takes the place of the name while it shows.
- Done when:
  - Every name of a workspace in the list, the palette, or a chip uses the shared part, in `docs/mockups/` and in `src/`.
  - `npm run mockups:check` passes. The App shell, the command palette, and the workspace links pages look the same as before in both schemes and both sizes.
  - The unread checks of `src/shell/list/WorkspaceRow.test.tsx`, `src/shell/palette/PaletteRows.test.tsx`, and `src/shell/workspace/LinkChips.test.tsx` pass, with no loosened assertion.
  - `docs/mockups/design-marks.md` and `docs/mockups/design-chat.md` name the shared part.
