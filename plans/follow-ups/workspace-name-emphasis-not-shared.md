# List-mark text emphasis has several owners

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/workspace-status-icons`, review round 1, the wider fix B of finding 2.
- **Location:** `docs/mockups/src/components/workspaces/status.ts`, `docs/mockups/src/components/workspaces/WorkspaceRow.tsx`, `docs/mockups/src/components/palette/PaletteRows.tsx`, `docs/mockups/src/components/chat/WorkspaceChip.tsx`, `docs/mockups/src/components/chat/SessionChip.tsx`, `src/shell/list/WorkspaceRow.tsx`, `src/shell/palette/PaletteList.tsx`, and the style modules `docs/mockups/src/components/workspaces/WorkspaceRow.module.css`, `docs/mockups/src/components/palette/CommandPalette.module.css`, and `docs/mockups/src/components/chat/WorkspaceChip.module.css`.
- **Reason:** One shared text part moves the emphasis of rows, palette results, workspace names, and session titles beyond the two chip forms fixed directly.

- **Terms:**
  - **Workspace:** a Conductive workspace has one branch at a time, a cloud computer, and chat sessions.
  - **List mark:** the mark of 3 × 3 cells beside the text of a workspace row, palette result, workspace chip, or session chip. Its colour shows the GitHub state, and its motion shows whether the agent works.
  - **Chip:** the small box that shows a workspace or session link in chat text or a message field.
  - **Emphasis:** the look of a workspace name for its state. `activityPresentation` in `docs/mockups/src/components/workspaces/status.ts` gives `strong` for unread output, `active` for working and needs input, `dim` for stopped and archived, and `normal` for the other states.
- **Background:**
  - The list mark gives a ready workspace and a workspace with unread output the same cells. So bold text is the only visible sign of unread output.
  - `docs/protocol/workspace-marks.md` says: "Bold text alone marks unread output." The user approved the plan with that rule on 10 November 2026.
  - Each place applies the emphasis in its own code, with its own styles:
    - The list rows: `docs/mockups/src/components/workspaces/WorkspaceRow.tsx` and `src/shell/list/WorkspaceRow.tsx`. `WorkspaceRow.module.css` gives `.strong` the ink colour and the strong weight, `.active` the ink colour, and `.dim` the muted colour.
    - The palette rows: `docs/mockups/src/components/palette/PaletteRows.tsx` and `src/shell/palette/PaletteList.tsx`. `CommandPalette.module.css` gives `.strong .label` the strong weight and `.dim .label` the muted colour.
    - The chips: `docs/mockups/src/components/chat/WorkspaceChip.tsx`, which the app also draws. `SessionChip.tsx` now renders through it, with the session title as the link name and its icon and spoken Session prefix before that name.
  - The chip first had no emphasis, so an unread chip looked like a ready chip. The workspace mark review found this on 10 November 2026.
  - The direct fix gives an unread chip name the class `strong` of `WorkspaceChip.module.css`. It reads the emphasis from `activityPresentation`. The rule `.text .strong` sets `--ui-weight-strong`, which is 600, in any order of the stylesheets.
  - Every other chip name keeps the weight 500 of `.name` in `InlineChip.module.css`. A stopped or archived chip name is not dimmed. `InlineChip.module.css` also styles file chips, so the chip weight lives in `WorkspaceChip.module.css`.
  - On 11 November 2026, the fresh integration review found the same omission in session chips. They used the list mark but kept their title at weight 500. Ready and unread therefore looked the same. The direct structural fix renders SessionChip through WorkspaceChip, which now owns the mark, state words, removal cells, and unread emphasis for both forms. A ready/unread transition in the existing mounted session-chip test protects the title and its required text ancestor.
  - The cross-surface shared part still has work to do. Rows, palette results, and the chip shell apply the state independently. A future place that shows the list mark but no workspace name, such as a session title, must not be omitted from its scope.
- **Problem:** Each place that shows the list mark must also apply its text emphasis. A place can omit it even without a workspace name, as session chips did.
- **Impact if no action:** A later place can show a workspace with unread output that looks ready. This also holds on a phone, where the workspace list is not on the screen.
- **Root question:** How does every place that shows the list mark keep the bold text that alone shows unread output?
- **Options:**
  - **A.** Add one helper that gives the emphasis class of a name for a state. Each place still calls it. Cost: a new place can still skip the call. Effort: Small.
  - **B.** Add one shared name part that requires the workspace state and applies its emphasis. Use it for the names of list rows and palette rows, and for workspace names and session titles in chips, in the mockups and the app. Each place passes its own classes, so it keeps its layout and its colours. Effort: Medium.
- **Left out:**
  - A test or a lint that checks every name for the emphasis is a detection fix. B is a structural fix, and the item adds no new gate.
  - A separate unread mark breaks the user's list mark decision of 10 November 2026. That decision gives the mark one colour, for the GitHub state.
  - Changing nothing keeps the omission possible, so it fails the goal.
- **Wider fix:** B. A text part that requires the workspace state prevents a missed emphasis in each place that shows the list mark.
- **Previous examples:** The workspace chip omission of 10 November 2026 and the session chip omission of 11 November 2026 share this cause.
- **Recommendation:** B. It makes the state a required input of every workspace name, and each place keeps its own look.
- **Action:** fix after merge, apply B, because it moves the name styles of the list, the palette, and the chips beyond the chip defect.

## Scope and completion checks

- The shared part renders the workspace name or session title. The mark, the number label, the time, and the hidden words stay with each place.
- Each place keeps its look:
  - List rows keep the ink colour and the strong weight of unread. They keep the ink colour of working, needs input, and the selected row, and the muted colour of stopped and archived.
  - Palette rows keep the strong weight of unread and the muted colour of stopped and archived.
  - Chips keep the strong weight of unread and the weight 500 of every other state, with no muted colour.
- The Rename field of a row still takes the place of the name while it shows.
- Done when:
  - Every text surface beside the list mark uses the shared part: workspace names in rows/palette/chips and session titles in session chips, in `docs/mockups/` and `src/`. SessionChip reaches it through WorkspaceChip.
  - `npm run mockups:check` passes. The App shell, the command palette, and the workspace links pages look the same as before in both schemes and both sizes.
  - The unread checks of `src/shell/list/WorkspaceRow.test.tsx`, `src/shell/palette/PaletteRows.test.tsx`, and `src/shell/workspace/LinkChips.test.tsx`, and `src/shell/workspace/SessionChips.test.tsx` pass, with no loosened assertion.
  - `docs/mockups/design-marks.md` and `docs/mockups/design-chat.md` name the shared part.
