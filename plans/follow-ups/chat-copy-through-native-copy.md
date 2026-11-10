# Chat copies with file chips skip the native copy

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, finding 8 of review round 2: the wider fix that the branch split off, with a new problem of its check.
- **Location:** `src/chat/links/mention-copy.ts`, `docs/mockups/src/components/chat/FileChip.tsx`.
- **Reason:** the native method needs checks in Firefox and Safari, and its browser spec runs outside the gate.

- **Terms:**
  - **File chip:** a chip in a sent message for `@` and a path, such as `@src/app.ts`.
  - **Copy handler:** the document `copy` listener in `src/chat/links/mention-copy.ts`.
- **Background:** `docs/protocol/file-mentions.md` says that a copy of a chip gives its mention. The copy handler builds the copied text itself when a selection holds a file chip: it walks the text of the selection, puts each chip's mention in its place, and leaves out text that the browser leaves out: the content of a closed `<details>`, text that `checkVisibility()` hides, and text that takes no selection. A copy without a file chip stays native.
- **Problem:** The handler copies its own idea of the page, not the browser's. It sets only `text/plain`, so a paste into a rich editor loses the formatting and the links of answers. Each new way to hide text needs a new rule in the walker.
- **Impact if no action:** Copies that hold a file chip can still differ from what the person sees in a browser that hides text in a way that the walker does not know, and rich pastes lose formatting.
- **Root question:** How does a copy give each file chip's mention and leave the rest to the browser's own copy?
- **Options:**
  - **A.** Keep the walker, and add rules as new hiding methods appear. Effort: Small.
  - **D.** Let the browser's own copy run, and delete the walker. Give each file chip a hidden text with its mention. During a copy, a class on the page shows that text and hides the chip, and the next animation frame removes the class before the page paints. Move a selection edge inside a chip to the edge of the chip. Add a real-browser spec, as `desktop/tests/command-literal.spec.ts` does for a copy. A Chrome 157 probe gave `Read @README.md now`, also after Ctrl+A. Effort: Medium.
- **Left out:** A copy that reads `Selection.toString()` between the chips, because Chrome keeps the steps of a closed work fold in it after a select-all, and happy-dom keeps all text. A variant that reads `innerText`, because it keeps text that takes no selection.
- **Wider fix:** D.
- **Previous examples:** `src/chat/device/LiteralText.tsx`, which also replaces the copied text.
- **Recommendation:** D, after a check in Firefox and Safari.
- **Action:** fix after merge, apply D, because it needs checks in other browsers and a spec outside the gate.
