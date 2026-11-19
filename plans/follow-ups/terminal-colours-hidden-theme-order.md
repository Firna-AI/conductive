# Queued colours override a newer colour scheme

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-19, from finding 1 of the round-1 review of branch `calummoore/follow-up-colour-changes-before-first-hn3n`. An independent check confirmed it, kept B, added options D, E, and F, and graded C Small, not Medium.
- **Location:** `src/terminal/xtermColours.ts:48`, `src/terminal/TerminalScreen.tsx:156`, and xterm.js 6.0.0's `src/browser/services/ThemeService.ts:73,81` and `src/browser/CoreBrowserTerminal.ts:190,472` in `node_modules/@xterm/xterm/`.
- **Reason:** The defect is Rare and not High, and its fix costs no more after the merge.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **xterm.js:** The library that parses terminal output and draws the browser terminal screen, at version 6.0.0 in the lock file.
  - **OSC:** A terminal control sequence that can change, reset, or query colours.
  - **Colour adapter:** `keepColoursUntilOpen` in `src/terminal/xtermColours.ts`, which keeps colour changes until the screen opens.
  - **Colour scheme:** The app's light or dark appearance, which follows the system setting in `src/shell/ui/ThemeRoot.tsx`.
  - **ThemeService:** The xterm.js service that keeps the colours of an open screen and applies each new theme.
- **Background:**
  - The screen parses output while hidden, and it opens only after its host has a size. The user chose this, with the colour adapter, on 19 November 2026.
  - The colour adapter keeps each colour change and reset from before the first open. Directly after `xterm.open`, at `xtermColours.ts:48`, it gives them to xterm.js.
  - `open` creates ThemeService from the theme option of that moment, at `CoreBrowserTerminal.ts:472`. So the kept events always come after the theme, also after a newer theme.
  - `TerminalScreen.tsx:156` sets `xterm.options.theme` at each change of the colour scheme. It does this also before the open, because `xtermRef` holds the unopened terminal from `openScreen`.
  - Before the open, nothing reacts to that theme. The only listener of the theme option is in ThemeService, at `ThemeService.ts:73`.
  - On an open screen, a new theme runs `_setTheme` at `ThemeService.ts:81`. It sets the text, background, and cursor colours, all palette colours, and the target of each reset, so earlier program colours go.
  - Before the colour adapter, xterm.js dropped each colour event before the open, at `CoreBrowserTerminal.ts:190`. So the replay of the adapter brings back the stale colours.
  - This is a separate timing defect. Without a theme change between the output and the open, the replay gives the right colours, as the colour test in `src/terminal/screenConnection.open.test.ts` checks.
  - The colour scheme changes only with the system setting, and a program must also set colours while the screen has never opened. So the defect is Rare. A visible wrong colour is Medium.
  - The evidence is source reads of the app and of xterm.js 6.0.0. No runtime reproduction ran, and no test sets the theme between the output and the open.
- **Problem:** The adapter keeps earlier colour events across a theme change before the first open. For example, parse `OSC 11;#111111`, set theme background `#fafafa`, then open the screen. Line 48 restores `#111111`, although an already open screen ends with `#fafafa`.
- **Impact if no action:** A newly shown terminal can use obsolete program colours after the user changes the colour scheme.
- **Root question:** How does a hidden terminal preserve the order of program colours and colour-scheme changes?
- **Options:**
  - **A.** Clear pending colour events from the existing theme-update caller. Add a regression through `openScreen`. Each future theme caller must remember this step. Effort: Small.
  - **B.** Let the adapter observe xterm.js theme-option changes until open. Clear earlier events when the theme changes, and retain later events. Dispose that subscription after open. Add a regression through `openScreen`. This adds another private dependency. Effort: Small.
  - **C.** Give the screen one controller for theme updates and pending colour events. Route theme assignments through it, so it owns their order. This avoids another private subscription but changes the caller interface. Effort: Small.
  - **D.** In the adapter, record the object of `xterm.options.theme` with the kept events. When a later colour event or the open finds another theme object, drop the kept events first. This reads the public option only. It adds no private part and needs no caller change. xterm.js has no public event for an option change, so a public replacement of the adapter can keep D but not B. D misses a scheme change and its reversal before the open when a caller sets the same theme object again. The current code never does that, because `terminalTheme` makes a new object for each change. Add a regression through `openScreen`. Effort: Small.
  - **E.** Fix the cause in upstream xterm.js: create ThemeService before `open`. Then upgrade, delete the adapter, and keep its tests. This is option C of `plans/follow-ups/terminal-colours-private-adapter.md`, so it closes that item too. It is blocked: an external contribution needs user approval, and the release date is unknown. Effort: Medium, plus the wait for a release.
  - **F.** Carry a local patch of the built xterm.js that creates ThemeService at construction. Then delete the adapter. This is option E of the same item. It is blocked: a new install step that can fail needs user approval. Each upgrade must make the patch again. Effort: Large.
- **Left out:**
  - Change nothing: a hidden screen then breaks the existing colour-scheme rule "It follows a change of the colour scheme" in `src/terminal/README.md`.
  - Open hidden screens at once: it reverses the deferred open, which exists because xterm.js measures the font in the page.
  - Keep program colours across every theme change, on every screen: it fails the goal. It also changes open screens, which follow the colour scheme now.
  - Set the theme only at the open: it fails the goal. The theme then comes before or after all kept events, so it keeps the stale colours or also discards the newer ones.
  - Write reset sequences into the output at each scheme change: it fails the goal. They parse after output that xterm.js still holds, so they also discard colours that an open screen keeps. A write can also split an escape sequence of a program.
  - A fix in the terminal bridge of the sandbox: the bridge passes the raw output, and a screen without a bridge, as with an older image, needs the same fix.
- **Wider fix:** B. It handles theme changes at their source, including future callers. E removes the cause in xterm.js, but it is blocked, and `terminal-colours-private-adapter.md` already holds it.
- **Previous examples:** None found for queued colour events crossing a theme change. Searches covered terminal history, `plans/`, and permitted `.context/` files.
- **Related:**
  - `terminal-colours-private-adapter.md` holds the blocked upstream wider fix of the same colour adapter. Its option C is option E here, so one upstream fix closes both items. The fix of this item also updates that item, as the last paragraph says.
  - `terminal-colours-hidden-queue-growth.md` records that the same kept events have no bound. B clears them at each theme change, which shortens the list but sets no bound. The fix that lands second keeps the rule of the first.
- **Recommendation:** B. It sees each theme change that xterm.js acts on, at the moment that an open screen resets its colours, and it needs no caller change. E best protects the codebase, but it needs a separate user approval.
- **Action:** fix after merge, apply B, because this Rare display defect is not High and needs a colour-scheme change before the first open.

The options share these assumptions, which the independent check confirmed:

- A change of the colour scheme discards the program colours from before it. The sources are `_setTheme` of xterm.js 6.0.0 and the README rule above.
- To drop the kept events from before a theme change gives the same colours as to apply them before the theme, because `_setTheme` sets every colour and each reset target. This holds for xterm.js 6.0.0. E and F drop this assumption.
- The screen opens only when its host has a size, and it parses output while hidden, as the user chose on 19 November 2026.
- App code keeps the colour events until the open, as the same choice says. This holds while `terminal-colours-private-adapter.md` waits for the user. E and F drop it.

The fix of this item also updates `terminal-colours-private-adapter.md`. It adds a theme-order rule to the rules for a replacement of the adapter: a theme change before the open discards the colour events from before it. With B, it also adds the new private event to the private parts that the item lists. B reaches `optionsService` and its `onSpecificOptionChange` on `_core`. Both names exist in xterm.js 6.0.0 and keep their names in the built `lib/xterm.mjs` and `lib/xterm.js`.
