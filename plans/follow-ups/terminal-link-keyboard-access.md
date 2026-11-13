# Keyboard users cannot open a terminal link

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from the options check of the plan `plans/terminal-links.md` on branch `calummoore/delft-vl39`.
- **Location:** `src/terminal/TerminalScreen.tsx`.
- **Reason:** The user asked for links that open on a click, and keyboard access needs its own control and key.

- **Terms:**
  - **Terminal link:** a web address in the output of the Terminal tool. Cmd+click on a Mac, or Ctrl+click elsewhere, opens it.
  - **Local address:** an address whose host is `localhost`, `127.0.0.1`, `[::1]`, or `0.0.0.0`. In the terminal, it opens the Preview tool at its port.
- **Background:**
  - The Terminal tool draws its output with xterm.js. Every key in the terminal goes to the shell.
  - The terminal links change lets a mouse or a touch open a link. The keyboard has no way to reach a link.
  - The Preview tool lists the servers that listen in the cloud computer, so a keyboard user can still open a local server there.
- **Problem:** A user who uses only the keyboard cannot open a public link that the terminal shows.
- **Impact if no action:** Such a user copies the address by hand, with a keyboard selection that xterm.js does not offer either.
- **Root question:** How does a keyboard user open an address that the terminal shows?
- **Options:**
  - **A.** Change nothing. The Preview tool covers local servers. Effort: Small.
  - **B.** Add a command palette action, "Open a link from the terminal", that lists the links of the visible rows. Effort: Medium.
  - **C.** Add a link list beside the screen for screen readers only. Effort: Medium.
- **Left out:** A key in the terminal that opens the link at the cursor: every key goes to the shell, so the key would break a program.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** B. The palette already holds the terminal actions, and it reaches each link with the keyboard.
- **Action:** ask the user, because B adds a palette action that no requirement covers.
