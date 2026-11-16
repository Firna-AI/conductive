# Terminal styles use private xterm.js classes

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from the check of review finding 5 of branch `calummoore/delft-vl39` (terminal links).
- **Location:** `src/terminal/TerminalScreen.module.css`, the rule on `.xterm.enable-mouse-events:not(.xterm-cursor-pointer)`.
- **Reason:** The rule is already on `main`, and the terminal links branch did not change it.

- **Terms:**
  - **Private class:** a class name that xterm.js sets on its own elements and does not list in its public API.
- **Background:** While a program has the mouse, a plain drag still selects text. So the screen keeps the text cursor, through a CSS rule on two private classes of xterm.js.
- **Problem:** The rule depends on another package's class names, which the `typescript` skill forbids. An update of xterm.js can rename them with no error.
- **Impact if no action:** After such an update, the pointer shows an arrow while a program has the mouse, though a drag still selects.
- **Root question:** How does the screen keep the text cursor while a program has the mouse, with only what Conductive owns?
- **Options:**
  - **A.** Set a data attribute on the host from `xterm.modes.mouseTrackingMode` at each mode change, and style the cursor from that attribute. Effort: Small.
  - **B.** Keep the rule, and add a test that fails when the classes change. Effort: Small.
- **Left out:** Change nothing: the dependency stays hidden.
- **Wider fix:** A. It removes the dependency.
- **Previous examples:** `plans/follow-ups/terminal-link-press-rule.md` removes the private `.xterm-screen` lookup of the link code.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the rule is on `main` outside the review scope.
