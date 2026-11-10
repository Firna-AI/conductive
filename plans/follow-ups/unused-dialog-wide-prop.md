# Dialog has an unused width prop

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the second-pass check of finding 4 on `calummoore/user-preferences-screen`.
- **Location:** `src/shell/ui/Dialog.tsx:19`, `:47`, and `:55`, and `docs/mockups/src/components/common/ConfirmDialog.module.css`.
- **Reason:** Main already has this unused prop, and the merge integration does not change it.

- **Terms:**
  - **Width prop:** The optional `wide` input declared by the shared shell Dialog component.
- **Background:** Dialog and its internal DialogBox declare `wide?: boolean`. DialogBox passes `props.wide && styles.wide` to the class-name helper. The imported confirmation stylesheet defines no `wide` class.
- **Problem:** The input has no rendered effect, and no caller supplies it. The root package is private, so this is not a published component API.
- **Impact if no action:** A later caller can request a wide dialog and receive the default width. The unused declaration also obscures which sizes the component supports.
- **Root question:** How should the shared Dialog expose only its implemented inputs?
- **Options:**
  - **A.** Confirm the reachability search, then remove the unused prop from both declarations and remove its CSS lookup. Keep the rendered default dialog. Effort: Small.
- **Left out:** Keeping the no-op input fails the cleanup goal. Implementing a wide variant adds a feature with no caller or requirement. There is one cleanup option because no implemented width behavior exists to preserve.
- **Wider fix:** None. The existing dead-code rule requires reachability proof and cleanup. This item applies that rule to the unsupported input.
- **Previous examples:** None found.
- **Recommendation:** A. It removes an unsupported capability without changing any current dialog.
- **Action:** fix after merge, apply A, in a separate branch.

Repeat the search before removal. `rg -n -U '<Dialog\b[^>]*\bwide\b' src` found no caller. `rg -n '\bwide\b' src/shell/ui/Dialog.tsx docs/mockups/src/components/common/ConfirmDialog.module.css` found only the two prop declarations and the lookup. Check spread props, tests, configuration, and any kept requirement too. If a live caller now exists, preserve its behavior and reassess the item.
