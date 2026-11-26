# Unopened screens keep an unbounded colour list

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-19, from the independent check of finding 1 in the round-1 review of branch `calummoore/follow-up-colour-changes-before-first-hn3n`. The check noted it as a new problem and gave it no grades.
- **Location:** `src/terminal/xtermColours.ts:41,45,61,66` and `src/terminal/screenConnection.ts:76,85`.
- **Reason:** The growth needs a reproduction and a memory measurement before a bounded form can be chosen, and this branch runs neither.

- **Terms:**
  - **xterm.js:** The library that parses terminal output and draws the browser terminal screen, at version 6.0.0 in the lock file.
  - **OSC:** A terminal control sequence that can change, reset, or query colours.
  - **Colour adapter:** `keepColoursUntilOpen` in `src/terminal/xtermColours.ts`, which keeps the colour changes of a screen until its first open.
  - **Colour slot:** One colour that a program can change: one of the 256 palette colours, the text colour, the background, or the cursor.
  - **ThemeService:** The xterm.js service that keeps the colours of a screen, which xterm.js creates only in `open`.
- **Background:**
  - `openScreen` in `src/terminal/screenConnection.ts` installs the colour adapter at line 76, before any output. Directly after `xterm.open`, at line 85, it calls the function that applies the kept events.
  - Until that call, the adapter pushes each colour event with a change or a reset onto the array `kept`, at `xtermColours.ts:61`. That call empties the array, at line 66. Each change of the xterm.js theme before the open also empties it, at line 45.
  - The array has no limit and no compaction. A later change of the same colour slot adds an entry, and the earlier entry stays.
  - The screen outlives each connection, so the array spans every connection of the screen until its first open. A screen that never opens keeps the array for its whole life.
  - A screen stays unopened while its host has no size, such as in a hidden column or behind another tool. A pane mounts only for a terminal that the user showed, as `src/terminal/OpenTerminals.tsx` says.
  - xterm.js keeps at most 2,000 lines of history for the text of a hidden screen. The array has no such bound.
  - Before the colour adapter, xterm.js dropped these events, so a hidden screen kept none of them.
  - Every viewer of a terminal parses the same live output. So the screen of each viewer that has not opened yet keeps the same events.
  - The evidence is a source read only. No runtime reproduction ran, and nobody measured the memory of the array. The rate at which real programs send colour changes is unknown.
- **Task:**
  1. Reproduce the growth through the real `openScreen` and xterm.js, with `hiddenHost` of `src/terminal/hiddenHost.test-support.ts`. Send known numbers of colour changes, such as OSC 4 and OSC 11 changes, before the open.
  2. Measure the number of kept entries and the memory at each count. Also measure how many events a hidden screen keeps per second from fast output, such as a loop that prints colour changes. Record the commands and the results.
  3. Open the screen, and check that its colours match those of a screen that was open the whole time.
  4. Select a bounded colour-state form. Compare candidates, such as the latest change or reset of each colour slot, with the current array. The form must give the same colours after the open as the current replay.
  5. Implement the chosen form with a regression through `openScreen`. A form that changes the colours after the open changes behaviour, so propose it to the user as a decision first.
- **Impact if no action:** Until its first open, a hidden screen keeps in memory every colour change and reset of its output since the last theme change. The size of the array in real use, and its effect on the page, are unmeasured.
- **Needs:** Nothing. The reproduction and the measurement run locally with real xterm.js.
- **Done when:** The reproduction and the memory measurement are recorded. Then the screen keeps the colour changes from before its first open in a bounded form, with a regression through `openScreen`, or the user decides to keep the current array.
- **Related:**
  - The app sets a new xterm.js theme at each change of its light or dark colour scheme. A theme change before the open discards the kept colour changes and resets from before it, as ThemeService does on an open screen. The changes and resets after it stay. This shortens the array but sets no bound. The bounded form keeps this rule, and the test "discards the program colours from before a hidden screen changes its theme, and keeps later program colours when it opens" in `src/terminal/screenConnection.open.test.ts` checks it.
  - `terminal-colours-private-adapter.md` holds the blocked upstream fix of the colour adapter. Its option C, with ThemeService before `open`, removes the array and so this growth. Its option B keeps a queue of events too, so it needs a bound as well.
