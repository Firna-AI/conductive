# The Search row draws ⌘ as an empty box

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from `calummoore/keyboard-shortcuts-settings`, Milestone 1 of the keyboard shortcuts plan.
- **Location:** `fontLabel` in `docs/mockups/src/design/metrics.ts`, the key style of the Search row in `docs/mockups/src/components/workspaces/SidebarLinks.module.css` (around line 60), and `src/marketing/pictures/hero-desktop-light.webp` and `hero-desktop-dark.webp`.
- **Reason:** The fix changes a shared design token and needs a new capture of the marketing pictures, which the keyboard shortcuts branch does not touch.

- **Terms:**
  - **Search row:** the row under New workspace in the sidebar and on the list page. It opens the command palette and shows the palette key, such as ⌘K.
  - **Label font:** the monospace font of small labels, from the `fontLabel` token. The app and the mockups share it.
- **Background:** The Search row shows its key in the label font. SF Mono on a Mac draws ⌘ and ⇧. The fonts of a Linux machine, such as the sandbox that captures the pictures, do not. The app's own Search row imports the same CSS module as the mockups. On 2026-11-09, the desktop hero pictures of the marketing site showed ⌘K as an empty box and K. In the keyboard shortcuts branch, the key chips use Inter, which draws ⌘ on every system.
- **Problem:** Off a Mac, a key such as ⌘K or ⇧⌘P in the label font shows empty boxes in place of ⌘ and ⇧.
- **Impact if no action:** Visitors of the marketing site see a broken symbol in the hero picture. A reviewer off a Mac cannot read a palette key that a person changed.
- **Root question:** How does a key in the label font draw the Mac key symbols on every system?
- **Options:**
  - **A.** Add the sans font after the label font in the key style of the Search row. Capture the pictures again with `npm run marketing:pictures`. Effort: Small.
  - **B.** Add the sans font after the monospace fonts in the `fontLabel` token. Capture the pictures again. Effort: Small.
  - **C.** Draw the key of the Search row as key chips. This changes the Search row on every page. Effort: Medium.
- **Left out:** Capture the pictures only on a Mac, because the result then depends on the machine.
- **Wider fix:** B. The token covers every label that can hold such a symbol.
- **Previous examples:** None found.
- **Recommendation:** B. One line in the token fixes every label, and a test of option A in the sandbox drew ⇧⌘P correctly.
- **Action:** fix after merge, apply B, because it changes a shared token and the marketing pictures, which this branch does not touch.
