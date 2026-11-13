# Links in the terminal

Status: Active. On branch `calummoore/delft-vl39`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Terminal tool shows each web address in its output as plain text. A
dev server prints its address, such as `http://localhost:5173/`, and the
user must copy it by hand. That local address names the cloud computer,
so it fails in the user's own browser. On 13 November 2026 the user asked
for terminal links that open on a click, "maybe while holding cmd", with a
screenshot of a Vite dev server in the terminal.

This change makes each `http` and `https` address in the terminal a link.
Cmd+click on a Mac, or Ctrl+click on Windows and Linux, opens it. A local
address opens the port preview of its port in the Preview tool. Every
other address opens in a new tab, or in the default browser from the Mac
app. The user chose this approach in a brainstorm on 13 November 2026:
terminal links decisions 1 B and 2 A. The user chose decisions 3 D and
4 B on the same day. The brainstorm notes are in `.context/terminal-links/brainstorm.md`.

The change does not cover the path of a local address in the preview,
which `plans/follow-ups/local-address-path-in-preview.md` records. It does
not cover file paths in the output, links in the chat, the tool call lines
of the chat, or keyboard access to a terminal link.

Contract owners:

- [Tools of a workspace](../docs/protocol/workspace-tools.md#terminal).
- [Port previews](../docs/protocol/port-previews.md).
- The [terminal README](../src/terminal/README.md) and the
  [previews README](../src/previews/README.md).
- The [tools part](../src/shell/workspace/screen-parts.md#the-tools-part).
- The [mockup catalogue](../docs/mockups/catalogue.md), at `app/tools`.

## Terms

- **Local address:** an address whose host is `localhost`, `127.0.0.1`,
  `[::1]`, or `0.0.0.0`, as in the chat links plan.
- **Port preview:** the Preview tool of a workspace. It shows a web server
  of the cloud computer by its port.
- **Decision 246:** the mouse rule of the terminal in
  `docs/protocol/workspace-tools.md#terminal`. A plain drag selects text. A
  held Cmd, or Ctrl off a Mac, gives a click or a drag to the program.
- **OSC 8 link:** a link that a program marks with an escape code, such as
  `ls --hyperlink`. Its text can differ from its address.

## Decisions

A terminal links decision number names a decision of this change. The
options check of 13 November 2026 changed decision 3 and added decision
4. Its report is in `.context/terminal-links/options-check-report.md`.

### 1. A local address in the terminal fails

- **Answer:** B, on 13 November 2026. The user's words: "it loads the
  preview screen for that port for localhost - otherwise your own
  browser".
- **Changed after the answer:** the options check corrected the effort of
  C. B stays the answer.
- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/terminal/xtermScreen.ts`.
- **Background:** Dev servers print a local address. That address names
  the cloud computer, not the user's computer. The app reaches a port of
  the cloud computer through a port preview.
- **Problem:** A link that opens a local address unchanged opens the
  user's own computer.
- **Impact if no action:** The most common link, a dev server address,
  fails.
- **Root question:** When the user opens a local address from the
  terminal, what should the user see?
- **Options:**
  - **A.** Open every link unchanged in a new tab. Effort: Small.
  - **B.** Open other links in a new tab. A local address opens the port
    preview of its port in the Preview tool, with the same checks as a
    typed port. Effort: Medium.
  - **C.** Do B, but open the preview address in a new browser tab.
    Effort: Medium. With the path of the address, the effort is Large,
    because the grant flow of the Worker changes, as
    `plans/follow-ups/local-address-path-in-preview.md` says.
- **Left out:** A change of the text in the output: it breaks what the
  program printed.
- **Wider fix:** None, because this is a new feature.
- **Previous examples:** Chat links decision 2 C in
  `plans/pressable-chat-links.md` chose the same rule for chat text.
- **Recommendation:** B. It opens the server where the user works, as the
  server list of the Preview tool does.
- **Action:** ask the user, because B and C trade the frame in the app
  against a full tab.

### 2. Which click opens a terminal link

- **Answer:** A, on 13 November 2026.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/workspace-tools.md`, the Terminal section.
- **Background:** By decision 246, a plain drag selects text, and a held
  Cmd gives a click to a program that uses the mouse, such as tmux.
- **Problem:** A click that opens a link must not break selection, and
  Cmd+click belongs to the program today.
- **Impact if no action:** No link opens.
- **Root question:** Which click opens a link, and keeps selection and
  programs that use the mouse?
- **Options:**
  - **A.** Cmd+click on a Mac, or Ctrl+click elsewhere, opens a link. Off
    a link, the click still goes to the program. A link under the pointer
    shows an underline and a hint. Effort: Small.
  - **B.** A plain click opens a link. Risk: a click that starts a
    selection opens a tab. Effort: Small.
  - **C.** Do A, but only while no program has the mouse. Risk: the same
    click acts differently at different times. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** Decision 246.
- **Recommendation:** A. It is the user's suggestion, and it changes
  decision 246 only on a link.
- **Action:** ask the user, because A changes decision 246.

### 3. A touch press has no Cmd or Ctrl key

- **Answer:** D, on 13 November 2026. The user added: "on hover underline
  it, so they can see its clickable".
- **Changed after the options check:** the check found that "phone" in the
  code is a window width, not the input. It wrote a better root question,
  added D, E, and F, and brought back the long press as F. The
  recommendation changed from B to D.
- **Severity:** Low. **Likelihood:** Common. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/terminal/TerminalScreen.tsx`.
- **Background:**
  - The app uses the phone layout for a window narrower than 640 px, in
    `src/shell/ui/viewport.tsx`. A narrow desktop window gets it too, with
    a keyboard. A tablet gets the desktop layout, often with no keyboard.
  - In the phone layout, the Terminal tool shows a key row with Esc, Tab,
    Ctrl, Up, and Down. Its Ctrl applies to the next key only.
  - xterm.js 6 has no touch selection. A tap reaches it as mouse events.
- **Problem:** With decision 2 A alone, a user who touches the screen
  cannot open a link.
- **Impact if no action:** On a touch screen, the user can neither open
  nor copy an address in the terminal. A local address stays reachable
  through the server list of the Preview tool.
- **Root question:** How does a user who touches the screen, with no held
  Cmd or Ctrl, open a terminal link?
- **Options:**
  - **A.** No link opens on a touch. Effort: Small.
  - **B.** A tap on a link opens it in the phone layout. Cost: a plain
    mouse click in a narrow desktop window then opens a link too, which
    decision 2 rejected. A tablet gets no way. Effort: Small.
  - **C.** A tap on a link shows a small menu with Open and Copy. Cost: a
    new control and its mockup. Effort: Medium.
  - **D.** Do B, but decide by the press, not by the layout. A touch tap
    on a link opens it on every layout. A mouse click keeps decision 2.
    A touch shows no hint. Cost: a tap on a link can open it by mistake.
    Effort: Small.
  - **E.** The Ctrl of the key row applies to the next tap too. Ctrl, then
    a tap on a link, opens it. Cost: two taps, and no hint shows the rule.
    Effort: Small.
  - **F.** A long press on a link opens it. Cost: a timer on touch events,
    and the gesture is hard to find. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** D, from the options check. The first recommendation
  was B. D gives one tap where no key exists, and keeps decision 2 for
  each mouse.
- **Action:** ask the user, because D adds a tap rule that no requirement
  covers, and A and D trade reach against stray opens.

### 4. An OSC 8 link can hide where it leads

- **Answer:** B, on 13 November 2026.
- **Severity:** High. **Effort:** Small.
- **Source:** Design. From the options check of this plan.
- **Category:** Security.
- **Location:** `src/terminal/TerminalScreen.tsx`, the `linkHandler`
  option of xterm.js.
- **Background:**
  - An OSC 8 link shows text that a program chooses. Its address can lead
    elsewhere.
  - Today xterm.js opens it on a plain click. First it shows a browser
    dialog with the real address and a warning.
  - Code in the sandbox is untrusted, so it can print such a link.
  - Chat links decision 5 asks the same question for label links, and it
    is still open.
- **Problem:** With decision 2 A alone, a Cmd+click opens an OSC 8 link
  with no sight of its real address.
- **Impact if no action:** A program in the sandbox can send the user to
  a false sign-in page.
- **Root question:** How does the user see where an OSC 8 link leads
  before it opens?
- **Options:**
  - **A.** Open it on Cmd+click like any link. Effort: Small.
  - **B.** The hint of an OSC 8 link names its real host, such as "⌘-click
    to open evil.example". Effort: Small.
  - **C.** Keep a dialog with the real address after the Cmd+click.
    Cost: two steps for each OSC 8 link. Effort: Small.
  - **D.** An OSC 8 link opens nothing. Cost: tools such as
    `ls --hyperlink` lose their links. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** Chat links decision 5.
- **Recommendation:** B. It shows the real host before the press and
  needs no extra step.
- **Action:** ask the user, because the options trade safety against an
  extra step, and no option is clearly best.

## Design calls

These calls are mine, made on 13 November 2026 under the decision test.

- The terminal reuses the shared address reader and the port address of
  the Preview tool from `plans/pressable-chat-links.md`. Branch
  `calummoore/riga-m3j3` builds both, in its Milestones 3 and 4:
  `webLink` of `src/markdown/web-links.ts` and `previewPortHref`. This
  change does not build them again. Milestone 3 starts when they reach
  `main`. The options check found that branch.
- The terminal finds links with `@xterm/addon-web-links`, the link addon
  of xterm.js. It joins an address that the terminal wraps onto the next
  row. A program that draws its own rows, such as tmux, cuts a long
  address at the end of the row.
- Each found address goes to `webLink`. Only `http` and `https` addresses
  open, and an address with a user name or a password opens nothing. Such
  a refused address shows no hint. The addon ends an address in a
  slightly different way from the chat reader. For example, it never
  takes `(` or `)`.
- The terminal checks the local hosts before `webLink`. Every local
  address in the terminal names the cloud computer, also
  `http://127.0.0.1:5173`, the app origin of `npm run dev`.
- Any other private address, such as the `Network:` line of a dev server,
  opens in the user's browser. The user's answer to decision 1 says so:
  "otherwise your own browser".
- A local address opens `previewPortHref` of its port, with the same
  request and checks as a typed port. The path, the query, and the hash
  do not carry over, as chat links decision 2 C says.
- An app page opens in the app, in the same window, as a chip does. Every
  other link opens through `openInNewTab` of the app services: a new tab
  with no referrer and no opener. The Mac app sends it to the default
  browser.
- OSC 8 links use the same key and the same kinds, through the
  `linkHandler` option of xterm.js. Decision 4 says what the user sees
  first.
- The hint is a small box below the link, with the key in the form of the
  app's shortcut hints: "⌘-click to open" on a Mac and "Ctrl+click to
  open" elsewhere. It shows at once while a mouse pointer is on a link. A
  native `title` was rejected, because it shows only after a wait. The
  underline and the hint show only under a mouse pointer, as the user
  asked with decision 3.
- A Cmd+click on a link does not reach a program that has the mouse.
  xterm.js sends it to the program and also opens the link, so the
  terminal stops the press itself.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw a terminal link with its hint, and the flow from a local address to
its preview.

- [x] Draw a link under the pointer in
      `docs/mockups/src/components/tools/TerminalView.tsx`, with a hovered
      mark for the terminal lines of `docs/mockups/src/fixtures/terminal.ts`.
- [x] Add the page `app/tools/terminal-links`, beside `app/tools/terminals`,
      because that page holds five screens: the dev server output with its
      local address under the pointer, the underline, and the hint.
- [x] Add the user flow `user-flows/open-a-terminal-link`: the hint, then
      the Preview tool with the preview of the port.
- [x] Draw the answers of decisions 3 and 4: the variant `labelled` with
      the host in the hint, and a phone with no underline and no hint.
- [x] Update `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages on both
      sizes.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. The mockups showed no problem. The screenshots are
      in `.context/terminal-links/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] `docs/protocol/workspace-tools.md`: add the link rules of decisions 1
      and 2 to the Terminal section, and the answers of decisions 3 and 4.
      Change the text of decision 246: a held Cmd or Ctrl gives a click to
      the program, except on a link.
- [x] `docs/protocol/port-previews.md`: a Cmd+click on a local address in
      the terminal opens the preview of its port.
- [x] Narrow `plans/follow-ups/terminal-and-tool-call-links.md` to the tool
      call lines, its option C, because this change does its option B.
- [x] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact. No sentence restates a changed fact.
- [x] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact. No sentence is wrong. The
      guide `terminal-and-previews.md` gets the new rules in Milestone 3,
      when they ship.
- [x] Check the rows of `src/marketing/from-conductor/` for a feature that
      this change ships.

## Milestone 3: Links in the terminal

Tags: ui

Depends on: 1, 2, and Milestones 3 and 4 of `plans/pressable-chat-links.md`
on `main`

- [x] Merge `origin/main` with the shared reader and the port address.
      On 13 November 2026 the user asked to build the change before
      `calummoore/riga-m3j3` merged. So this branch merges that branch,
      and carries its commits until it reaches `main`.
- [x] Add `@xterm/addon-web-links`. Load it in
      `src/terminal/TerminalScreen.tsx`, and set the `linkHandler` option
      for OSC 8 links.
- [x] Open a link only with the key of decision 2, and on a touch as
      decision 3 says. Give `TerminalTool` a `links` prop with the context
      of the app and its `open`.
- [x] Track the link under the pointer through the `hover` and `leave`
      callbacks. Show the hint there, as decision 4 says for OSC 8 links.
- [x] Stop a Cmd+click on a link from the program, in a bubble listener
      on `.xterm-screen` that runs after the link part of xterm.js. A
      capture listener on `.xterm` would stop the link too.
- [x] In `src/shell/workspace/tools/ToolsPart.tsx`, open a local address
      at `previewPortHref`, an app page in the app, and other links with
      `openInNewTab`.
- [x] Test the key, the kinds, a refused address, OSC 8 links, a touch
      tap, and a Cmd+click while a program has the mouse.
- [x] Add the link rules to the public guide
      `src/marketing/docs/terminal-and-previews.md`: in "Open Terminal",
      and beside the steps that open a server by its port.
- [x] Update the [terminal README](../src/terminal/README.md) and the
      [tools part](../src/shell/workspace/screen-parts.md#the-tools-part).
- [x] Smoke-test in `npm run dev`, on the tools development page in
      Chrome on Linux: a dev server address, an OSC 8 link, and mouse
      reports on. The development page gained a button that prints an
      OSC 8 link. A real touch screen was not available, so the DOM test
      covers the touch.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests. Run `npm --prefix desktop ci` and
      `npm ci --prefix runner`, then the complete gate, `npm run check`.
      The static checks passed. The Worker tests time out at 15 seconds in
      this sandbox, also on `origin/main`, so CI proves the tests.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report. Two rounds ran. Finding 4 was fixed. Findings 1,
      2, 5, and 6 have follow-up items. Finding 3 waits for the user, in
      `plans/follow-ups/terminal-links-to-the-app.md`.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] In the Mac app, Cmd+click a dev server address and a public link in
      the terminal.
