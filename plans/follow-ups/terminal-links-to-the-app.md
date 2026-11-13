# Terminal links to the app break the terminal rules

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-13, from review finding 3 of branch `calummoore/delft-vl39` (terminal links).
- **Location:** `src/terminal/terminalLinks.ts`, `docs/protocol/workspace-tools.md` (the Terminal section), `src/marketing/docs/terminal-and-previews.md`.
- **Reason:** The rule for links to the app's own addresses changes a requirement, so the user chooses it.

- **Terms:**
  - **App origin:** the address of the web app, `https://app.conductive.build`. The marketing site, `https://conductive.build`, is another origin.
  - **App page:** an address of the app origin that the router of the app reads as a page.
- **Background:**
  - Terminal links decision 1 B: a local address opens the Preview tool at its port, and every other link opens in the user's browser. The protocol doc and the public guide state this rule.
  - The code follows the chat rule of `docs/protocol/chat-links.md`: an app page opens in the app, in the same window, and any other address of the app origin, such as `/api/...`, opens nothing.
  - The Mac app drops each new window to the app origin, in `desktop/src/navigation.ts`. So a new tab to an app page opens nothing there.
- **Problem:** In the web app, a terminal link to an app page opens in the same window, and an app address that is no page opens nothing. The terminal rules and the guide do not say this.
- **Impact if no action:** The terminal behaviour and its requirements disagree.
- **Root question:** Must terminal links to the app origin follow the chat rule, or the new-tab rule of terminal links decision 1 B?
- **Options:**
  - **A.** Open every link that is not local in a new tab. Cost: in the Mac app, a link to an app page opens nothing. Effort: Small.
  - **B.** Keep the chat rule: an app page opens in the same window, and another app address opens nothing. Write the rule in the terminal protocol and the guide. Effort: Small.
  - **C.** Do B, but open another app address in a new tab. Cost: it opens raw API answers in the web app, and nothing in the Mac app. Effort: Medium.
  - **D.** The web app opens every app address in a new tab. The Mac app opens app pages in the window and other app addresses nowhere. Cost: the terminal differs from chat text. Effort: Small.
- **Left out:** Change nothing: the contract stays contradictory.
- **Wider fix:** None. The `documentation` skill already makes docs and behaviour agree.
- **Previous examples:** `plans/follow-ups/codex-save-guide-omits-endpoints.md`.
- **Recommendation:** B. It matches chat text, the Markdown preview, and the navigation rules of the Mac app.
- **Action:** ask the user, because B adds an exception that terminal links decision 1 B does not state.
