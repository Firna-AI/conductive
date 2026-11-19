# Colour changes before first show are lost

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-19, from finding 1 of the hidden-terminal line-spacing review.
- **Location:** `src/terminal/screenConnection.ts:78`, `src/terminal/xtermScreen.ts`, and xterm.js 6.0.0's `src/browser/CoreBrowserTerminal.ts:189,472`.
- **Reason:** This rare display defect needs a colour-state change that is separate from the hidden-host line-spacing fix.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **xterm.js:** The library that parses terminal output and draws the browser terminal screen.
  - **Host:** The page element that contains the terminal screen.
  - **OSC:** A terminal control sequence that changes or queries colours.
  - **ThemeService:** The xterm.js service that keeps colours and handles their changes.
- **Background:** The screen and connection start at mount. The screen opens only after its host has positive dimensions. Text and bridge messages are parsed before the first open. xterm.js creates ThemeService inside its `open` method.
- **Problem:** The xterm.js colour handler returns without ThemeService, so it drops colour changes and resets parsed before the first open. For example, the output `\x1b]11;#123456\x07kept` keeps the text but loses the background change. A screen that showed once keeps later changes while hidden.
- **Impact if no action:** A startup script or program that sets colours before the terminal first shows displays incorrect colours. No runtime reproduction ran during the review.
- **Root question:** How does a terminal screen keep the colour changes of output that it parses before its first show?
- **Options:**
  - **A.** Keep colour state in a screen adapter through public OSC handlers. Handle changes, resets, and queries through that state. Apply it when the screen opens. This duplicates some xterm.js handling. Effort: Medium.
  - **B.** Carry a reproducible xterm.js patch that creates ThemeService at construction. The app bundles the built, minified library. A patch therefore needs a bundle patch or a source build. The package has no patch tool. A new install step that can fail needs user approval. Effort: Large.
  - **C.** Accept the loss and document it. This accepts a regression from the previous screen lifecycle and needs user approval. Effort: Small.
  - **D.** Wrap the private `_handleColorEvent` in `openScreen` before output starts. Before ThemeService exists, keep colour changes and resets in order, and drop queries. After `xterm.open`, pass the kept events to the original handler. Add a regression that changes a colour before open and queries it after open. The private names can change on an upgrade. Effort: Small.
  - **E.** Use public OSC handlers for 4, 10, 11, 12, 104, 110, 111, and 112. Keep changes and resets before open, then replay them. Preserve output order when queued output changes the same colour. This uses public APIs but needs more state and ordering code. Effort: Medium.
  - **F.** Fix the lifecycle in upstream xterm.js, then upgrade to a release with the fix. Create ThemeService before open, or retain colour events until open. This removes local colour handling. An external contribution needs user approval, and release timing is unknown. Effort: Medium, plus the wait for a release.
- **Left out:** Opening at mount, including in another element, reverses the chosen deferred-open lifecycle. Holding all output until open stops live bridge processing and replies. A bridge-only replay misses older bridges and plain tmux clients.
- **Wider fix:** F, blocked until the user authorizes upstream work. This item records that wider fix with the direct fix of the same colour-state problem. D can proceed independently.
- **Previous examples:** None found for pre-open colour controls. The library source confirms the guard and the creation of ThemeService in open.
- **Related:** `terminal-rebuild-loses-colour-state.md` records older colour changes lost by a bridge rebuild. It is a separate source of colour loss.
- **Recommendation:** D. It keeps colour handling in xterm.js without a dependency or install change. The first review recommended B. The independent check found D and the blocked upstream wider fix F.
- **Action:** fix after merge, apply D, because the defect is Rare and the colour adapter is separate from line spacing.

The xterm.js 6.0.0 built `lib/xterm.mjs` keeps the names `_handleColorEvent` and `_themeService`. Its constructor looks up the colour handler when an event runs. Check those facts before a private wrapper. The regression must fail if an upgrade breaks the adapter.

The bridge passes raw pane output to the browser. Thus OSC colour changes can reach xterm.js before open. After bridge hello, `TerminalSession` drops xterm.js replies because tmux answers programs. A late colour-query reply can reach the shell as input, so the deferred change replay must not replay pre-open queries.

Before the line-spacing fix, `openScreen` opened at mount, including under a hidden ancestor. That created ThemeService before output arrived. The intended spacing fix keeps deferred open and the live connection. This follow-up must preserve both.
