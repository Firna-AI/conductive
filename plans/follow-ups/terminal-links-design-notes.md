# Design notes still exclude terminal links

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from pull request #366, merge review finding 7 and its independent check.
- **Location:** `docs/mockups/design-links.md:64-65` and `docs/mockups/catalogue-workspace-tools.md:43`.
- **Reason:** Both feature review fix rounds are used. The protocol, code, public guide, and terminal links mockup already give the correct behavior.

- **Terms:** The Terminal tool is the workspace view that shows shell output through xterm.js.
- **Background:** Terminal web addresses open on Cmd+click on a Mac, Ctrl+click elsewhere, or a touch tap. The Links section of [Terminal](../../docs/protocol/terminal.md#links) gives the rules. The mockup `app/tools/terminal-links` and the flow `user-flows/open-a-terminal-link` draw that behavior.
- **Problem:** [Links in text](../../docs/mockups/design-links.md) still says the terminal keeps each address as text. The [tools catalogue](../../docs/mockups/catalogue-workspace-tools.md) also omits the terminal links page and flow, although the catalogue lists the other tool pages.
- **Impact if no action:** A reader gets conflicting instructions and can miss the terminal links mockup.
- **Root question:** How do the design notes and catalogue reflect the terminal links that already work?
- **Options:**
  - **A.** Remove the terminal from the text-only list. Link to the Terminal protocol and name the terminal links mockup. Add the page and flow to the tools catalogue. Effort: Small.
  - **B.** Do A and describe the underline, pointer hint, real host of a labelled link, and absence of a hint on touch screens. Keep the behavior rules in the protocol. Effort: Small.
- **Left out:** Turning terminal links off breaks the user's recorded choice. Copying all behavior rules creates another copy to maintain and would depend on the separate app-address routing decision. Only A and B preserve the behavior without that duplication.
- **Wider fix:** None. The documentation skill already requires aligned docs.
- **Previous examples:** [Terminal links to app addresses](terminal-links-to-the-app.md) records another terminal code and protocol mismatch.
- **Related:** The app-address routing item affects only an option that copies routing rules. A and B link to the protocol and do not depend on its answer.
- **Recommendation:** A. It corrects both gaps without adding optional design prose.
- **Action:** fix after merge, apply A, because both feature review fix rounds are used.
