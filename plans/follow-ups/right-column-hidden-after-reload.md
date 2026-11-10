# Keep the hidden right column after a reload?

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from branch `calummoore/right-panel-close-icon`, a design question of the toggle of the right column.
- **Location:** `src/app/panels.ts`, `PanelLayout.rightShown`. `docs/architecture/components.md`, the "Web app" section. `docs/architecture.md`, the "Where data lives" table. `src/marketing/privacy.ts`, the "Panel widths" line of the Privacy notice.
- **Reason:** A stored choice changes a rule of the architecture doc and the text of the Privacy notice, and no user decision covers that change.

- **Terms:**
  - **Right column:** the desktop column beside the chat of a workspace. It holds the pull request bar, the file lists, and the tools.
  - **Toggle of the right column:** the `PanelRight` icon button at the end of the workspace header on desktop. Its label is "Hide the right column", or "Show the right column" while the column is hidden.
  - **Panel widths:** the widths of the sidebar and the right column that the user drags. `PanelLayout` in `src/app/panels.ts` keeps them in the browser storage, under `conductive.sidebar-width` and `conductive.right-width`.
- **Background:** The user asked on 2026-11-08 for a close panel icon at the right end of the workspace header that closes the right column. The toggle hides the column for every workspace of the tab. `PanelLayout.rightShown` keeps the choice in memory, so a reload or a new tab shows the column again. The width of the same column survives a reload. `docs/architecture/components.md` says: "The browser stores only the panel widths. All other state comes from the Worker." The "Where data lives" table of `docs/architecture.md` names only the panel widths for the browser. The Privacy notice says: "Panel widths: your browser keeps the widths of the panels of the app. They stay in your browser."
- **Problem:** No requirement says how long a hidden right column stays hidden. A user who works with the column hidden must hide it again after each reload and in each new tab.
- **Impact if no action:** The column comes back at each reload and in each new tab, while its width stays as the user chose it.
- **Root question:** When the user hides the right column, how long does it stay hidden?
- **Options:**
  - **A.** Until the page reloads or closes, as now. No doc changes. Effort: Small.
  - **B.** Across reloads and tabs in the same browser. `PanelLayout` keeps the choice in the browser storage beside the panel widths, and a browser that refuses its storage keeps it until the page closes. Update the architecture doc in both places. `AGENTS.md` then asks for a full read of both legal pages, `src/marketing/terms.ts` and `src/marketing/privacy.ts`, and an update of each sentence that restates the fact. Today that is the "Panel widths" line of the Privacy notice. Effort: Small.
  - **C.** On every device of the user. The Worker keeps the choice as a setting of the user. It needs a field in the account API, a D1 migration, a write at each press of the toggle, and the same doc changes as B. Effort: Medium.
- **Left out:** A choice for each workspace, because the widths are one choice for the tab, and a choice for each workspace makes the column jump at each switch. The toggle keeps one choice for the tab, as a design call of 2026-11-08.
- **Wider fix:** None, because this is one choice, not a class of problem.
- **Previous examples:** The sidebar toggle of the Mac app keeps its state in memory for one run of the app, in `MacChrome.sidebarHidden` of `src/shell/mac/mac-app.tsx`. The panel widths survive a reload.
- **Recommendation:** B. The width of the same column already survives a reload, so a column that comes back at each reload surprises the user.
- **Action:** ask the user, because B changes the architecture rule that the browser stores only the panel widths, and the Privacy notice, and no user decision covers that change.
