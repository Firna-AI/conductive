# Workspace development page lacks command palette

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, during the header browser check on branch `calummoore/header-branch-name-removal`.
- **Location:** `src/shell/workspace/dev/DevPage.tsx`, `src/shell/palette/palette-context.ts:24`, and `src/shell/palette/PaletteProvider.tsx`.
- **Reason:** The header change does not change the development page's app providers.

- **Terms:**
  - **Workspace development page:** The local page at `/src/shell/workspace/dev/`, which renders the workspace screen over the fake API.
  - **PaletteProvider:** The React provider that gives the shell its command palette and open layers.
- **Background:**
  - Run `npx vite --config src/shell/workspace/dev/vite.config.js --port 5182` from the repository root.
  - Open `http://localhost:5182/src/shell/workspace/dev/?viewport=desktop&scheme=dark&repair=none&controls=off`.
  - Chrome reports `Error: The app has no command palette.` from `usePalette` in `palette-context.ts`.
  - `DevPage` supplies the app, navigation, panels, features, viewport, and theme providers around `Shell`.
  - It supplies no `PaletteProvider`. The test wrapper `AppProviders` in `src/shell/test-render.tsx` includes this provider.
- **Problem:** The shell's `SearchRow` reads the missing command palette. React stops rendering the development page.
- **Impact if no action:** Developers cannot check the workspace screen through its documented development page.
- **Root question:** How does the workspace development page supply the command palette that its shell requires?
- **Options:**
  - **A.** Put `PaletteProvider` around `Shell` inside the existing app and navigation providers. Effort: Small.
- **Left out:** Hiding `SearchRow` hides part of the real shell. Importing the test renderer couples the development entry to test rendering. Only restoring the required provider directly fits this focused repair.
- **Wider fix:** None. `PaletteProvider` already owns the command palette and open layers. The development entry must use it.
- **Previous examples:** `AppProviders` in `src/shell/test-render.tsx` already includes `PaletteProvider`. A temporary browser page using that wrapper rendered both header sizes successfully.
- **Recommendation:** A. It restores the documented development page with the existing app provider.
- **Action:** fix after merge, apply A, because the missing provider is outside the header display change.
