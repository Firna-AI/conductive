# Two menu item types repeat their fields

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-25, from branch `calummoore/remove-repo-from-menu-ouc2`, wider fix of review finding 6.
- **Location:** `src/ui/components/common/Menu.tsx:10`, `src/shell/ui/Menu.tsx:12`, `src/shell/layout/useTileMenu.tsx:96`
- **Reason:** The direct fix, one shared list for the repository row menu, landed. The type change reaches shared menu types outside the diff.

- **Background:**
  - The mockups draw menus with `MenuItem` in `src/ui/components/common/Menu.tsx`. The app draws them with `MenuAction` in `src/shell/ui/Menu.tsx`.
  - Both types define the same presentation fields: label, icon, disabled, tone, and others. The mockup type also takes `trailingIcon`, `trailingLabel`, `highlighted`, and `submenu`.
  - A shared list that the app spreads into `MenuAction` can carry a mockup-only field. It compiles, and the app drops it.
  - The org tile menu in `useTileMenu.tsx` still copies `label`, `icon`, and `disabled` one by one from `tileMenuItems`.
- **Problem:** A field of a shared menu list can show in the mockup and drop in the app with no type error.
- **Impact if no action:** The mockup and the app can drift on a menu item.
- **Root question:** How do the mockup and the app menus share one set of item fields?
- **Options:**
  - **A.** Move the org tile menu to the spread of the repository menu. Effort: Small.
  - **C.** Define the presentation fields once in `src/ui/components/common/Menu.tsx`. Build `MenuItem` and `MenuAction` from it, and type the shared lists with it. A field that the app menu cannot draw then fails the typecheck. Effort: Small.
- **Left out:** A parity test: C is a structural fix.
- **Wider fix:** C.
- **Previous examples:** `plans/follow-ups/files-preview-header-names-one-definition.md`.
- **Recommendation:** C, with A for the tile menu.
- **Action:** fix after merge, apply C, because it changes two shared menu types outside the diff.
