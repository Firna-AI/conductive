# Terminal colours depend on private xterm.js parts

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-19, from branch `calummoore/follow-up-colour-changes-before-first-hn3n`, which fixed `terminal-colours-before-first-show.md` with its option D. Option C here keeps that item's blocked upstream option F. Options A, B, D, and E keep its options D, E, A, and B, and **Left out** keeps its option C.
- **Location:** `src/terminal/xtermColours.ts:29`, its calls in `openScreen` at `src/terminal/screenConnection.ts:76,85`, and xterm.js 6.0.0's `src/browser/CoreBrowserTerminal.ts:168,189,472` in `node_modules/@xterm/xterm/`.
- **Reason:** The upstream fix needs a public contribution to xterm.js, which the user has not approved, and then an xterm.js release with the fix.

- **Source:** Review.
- **Category:** Code structure.
- **Terms:**
  - **xterm.js:** The library that parses terminal output and draws the browser terminal screen, at version 6.0.0 in the lock file.
  - **Host:** The page element that holds the terminal screen.
  - **OSC:** A terminal control sequence: OSC 4, 10, 11, and 12 change or query colours, and OSC 104, 110, 111, and 112 reset them.
  - **ThemeService:** The xterm.js service that keeps the colours of the screen and applies their changes.
  - **Colour adapter:** `keepColoursUntilOpen` in `src/terminal/xtermColours.ts`, the local fix that keeps colour changes until the screen opens.
- **Background:**
  - The screen takes output at once, but `openScreen` opens it only after its host has a size. So a hidden screen parses the OSC colour changes of programs before its first open.
  - xterm.js creates ThemeService only in `open`, at `CoreBrowserTerminal.ts:472`. Before that, its private colour handler `_handleColorEvent` drops each colour event, at line 190.
  - On 19 November 2026, the user chose the colour adapter as the local fix. Before any output, it replaces `_handleColorEvent` on `_core`, the private core of the terminal.
  - Until the open, the adapter keeps colour changes and resets in order, and drops colour queries. Directly after `open`, it gives the kept events to the original handler, and then passes each event on.
  - The adapter works because the core looks up `_handleColorEvent` for each event, at line 168. The built `lib/xterm.mjs` and `lib/xterm.js` keep these names.
  - The adapter does not warn or throw. When `_core` or `_handleColorEvent` is missing, it does nothing, and the screen loses those colours again.
  - The test "applies the colour changes and resets of output that came before the screen opened, in order, and answers only the colour queries after it opens" in `src/terminal/screenConnection.open.test.ts` then fails.
- **Problem:** The colour adapter depends on private parts of xterm.js: `_core`, `_handleColorEvent`, the numbers of the colour request types, and the lookup of the handler for each event. xterm.js does not list them in its public API. An upgrade, also a minor one in the `^6.0.0` range of `package.json`, can change them with no type error.
- **Impact if no action:** The adapter stays as the fix, and the cause stays in xterm.js. An upgrade that changes a private part fails the test above, and the adapter then needs work.
- **Root question:** How does the app keep its support for the colour changes from before the first open working across xterm.js upgrades?
- **Options:**
  - **A.** Change nothing. Keep the colour adapter and its test. The test shows a break at the upgrade that causes it, and that upgrade then changes the adapter. Effort: Small.
  - **B.** Replace the adapter with public OSC handlers for 4, 10, 11, 12, 104, 110, 111, and 112. Keep changes and resets before the open, then replay them. Preserve output order when queued output changes the same colour. This uses public APIs but needs more state and ordering code. Effort: Medium.
  - **C.** Fix the lifecycle in upstream xterm.js: create ThemeService before `open`, or keep colour events until `open`. Then upgrade to a release with the fix, delete the adapter, and keep its test of the colour changes. An external contribution needs user approval, and release timing is unknown. Effort: Medium, plus the wait for a release.
  - **D.** Keep colour state in a screen adapter through public OSC handlers. Handle changes, resets, and queries through that state, so a query before the open gets an answer in time. Apply the state when the screen opens. This duplicates some xterm.js handling. Effort: Medium.
  - **E.** Carry a reproducible xterm.js patch that creates ThemeService at construction. The app bundles the built, minified library, so a patch needs a bundle patch or a source build. The package has no patch tool. A new install step that can fail needs user approval, and each upgrade must make the patch again. Effort: Large.
- **Left out:**
  - Opening at mount, also in another element: it reverses the deferred open, which exists because xterm.js measures the font in the page.
  - Holding all output until the open: it stops the live bridge messages and their replies while the screen is hidden.
  - A colour replay by the terminal bridge only: it misses older bridges and plain tmux clients.
  - Accepting the loss: it fails the goal and brings back the fixed defect.
- **Wider fix:** C. It removes the cause in xterm.js, so the app needs no colour code of its own.
- **Previous examples:** `plans/follow-ups/terminal-css-private-classes.md` and `plans/follow-ups/terminal-link-press-rule.md` record other app code that depends on private parts of xterm.js. None found for colours.
- **Related:** `terminal-colours-hidden-theme-order.md` records kept colours that override a newer colour scheme, and `terminal-colours-hidden-queue-growth.md` records kept events with no bound. Both come from the same colour adapter. Option C here, with ThemeService before `open`, also fixes both, and it is option E of the theme-order item. The theme-order fix adds its rule to the rules for a replacement at the end of this item.
- **Recommendation:** C. It removes the private dependency of this app and fixes the cause for every user of xterm.js.
- **Action:** ask the user, because on 19 November 2026 the user approved only the local fix and kept upstream work for a separate approval.

Each replacement of the adapter keeps these rules:

- It gives no late answer to a colour query from before the open. Before a bridge hello, `TerminalSession` in `src/terminal/terminalSession.ts` sends the replies of xterm.js to the shell. A late answer can therefore reach the shell as input.
- It keeps the deferred open, and the live connection of a hidden screen.
- It keeps a test of the colour changes from before the open, so that a later break fails it. The test above expects no answer to an early query. An option that answers such a query in time changes that part of the test.
