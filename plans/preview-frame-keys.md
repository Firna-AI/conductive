# Shortcut keys in a port preview

Status: Active. On branch `calummoore/iframe-preview-key-handling-iogx`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A port preview shows in an iframe on the preview domain, `conductive.page`.
While the focus is in that frame, no app shortcut works, because the app
window never hears a key of a frame from another site. The rule in force
says so in [Where a key goes](../docs/protocol/keyboard-shortcuts.md#where-a-key-goes).
The user asked on 2026-11-18 that a key that the preview page does not use
works as normal.

The change adds a small key forwarder to each HTML page that the preview
proxy serves into a frame. The forwarder posts each left key to the app.
The app runs it only for an allowed command, a command that shows or opens
something. The app tells the frame which keys it takes, so that the
forwarder can stop the browser's own action for those keys. The change does
not cover the live desktop frame, a preview in a new browser tab, or a page
that its own `<meta>` CSP protects from inline scripts. Those keep today's
rule.

Terms:

- **Left key:** a key that the preview page does not use. No listener of
  the page called `preventDefault`, `stopPropagation`, or
  `stopImmediatePropagation` for it.
- **Forwarder:** the script that the proxy adds to the page. It posts each
  left key to the app with `postMessage`.
- **Allowed command:** a command that a key from a preview may run.
- **Taken keys:** the keys of the allowed commands that the app offers
  now. The app sends them to the frame.

Contract owners:

- [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md).
- [Terminal, previews, and desktop](../docs/protocol/terminal-previews-and-desktop.md)
  and [Port previews](../docs/protocol/port-previews.md).
- The [shortcut layer README](../src/shell/shortcuts/README.md), the
  [shortcut model README](../src/app/shortcuts/README.md), the
  [previews README](../src/previews/README.md), and the
  [preview backend README](../worker/previews/README.md).

## Decisions

The approaches came from a brainstorm on 2026-11-18. Its report is in
`.context/preview-keys/approaches.md`. The user answered each decision on
2026-11-18. The options check of the same day added options to each
decision. Its report is in `.context/preview-frame-keys/options-check.md`.
It found that the choice of decisions 1 and 3 does not meet its own
reason. So decisions 1 and 3 wait for the user again. Milestones 2 to 4
wait for them.

### 1. Which commands a key from a preview may run

Status: open again. The user chose A on 2026-11-18. The options check
added D to G and changed the recommendation from A to E.

- **Background:** the preview page is untrusted. Any script in it can post
  fake keys, and no browser API proves a real press in a frame from another
  site. A person can also press a command key by habit.
- **Problem found by the check:** many commands that "show or open
  something" move the focus to a place where Enter acts. Examples: the
  message field sends on Enter, the terminal runs a command on Enter, and
  the palette runs its highlighted row on Enter. A page that sees the
  person type can post a fake key just before the next Enter, and the
  person's own text then goes to the agent or the shell. New session also
  writes a session record at once (`src/chat/state/session-actions.ts`),
  and New terminal opens a shell that every member sees.
- **Root question:** how can a key that a preview leaves run the person's
  commands, while a fake key or a stray press cannot change the person's
  work?
- **Options:**
  - **A.** Allow only commands that show or open something. Effort: Small.
  - **B.** Allow every command. A fake key can then merge a pull request.
    Effort: Small.
  - **C.** Allow every command for a real press in the Mac app, and only the
    list of A elsewhere. It needs option B or C of decision 2. Effort:
    Large.
  - **D.** A with a shorter list. Leave out each command that writes data,
    opens something outside the app page, or moves the focus to a place
    where Enter acts, except the palette. Those keys then do nothing from a
    preview. Effort: Small.
  - **E.** D, and a key of a command that is not allowed moves the focus
    from the frame to a neutral place of the app, such as the panel of the
    Preview tab. It runs nothing. The next press is a real press in the app,
    and it runs the command with the normal rules. The page learns the whole
    keymap of the person, because the forwarder must stop these keys too.
    Effort: Medium.
  - **F.** A, and each command that is not allowed asks first, in a dialog
    that ignores input in its first second. It needs a mockup and changes
    the rule that Merge PR merges at once. Effort: Large.
  - **G.** A, and a setting of the Keyboard shortcuts tab lets each person
    allow more commands. A person who allows Merge PR gives that power to
    each hostile page. Effort: Large.
- **Left out:** user activation as an extra check, because the person's
  own typing in the page keeps it live, and it names no key.
- **Wider fix:** a deny default. A command that the allowed list does not
  name never runs from a preview, so a new command is safe by default.
- **Recommendation:** E, from the options check. The first recommendation
  was A. E keeps the reason of A, that a fake key only changes the view,
  and it still gives every command a path from a preview.

### 2. Where the app learns of a left key

- **Root question:** how can the app's shortcuts keep working while the
  focus is in a port preview, without taking keys that the page uses?
- **Options:**
  - **A.** The preview proxy adds the forwarder, in every host. Effort:
    Large.
  - **B.** The Mac app checks each real press in its main process, with a
    preload script in the frame. Mac app only. Effort: Large.
  - **C.** A, plus receipts of real presses from the Mac app. Effort:
    Large.
  - **D.** A, and a control in the Preview bar sends no key of that preview
    to the app. It needs a mockup. Effort: Medium. Added by the options
    check, as a later step when a page shows double actions.
  - **E.** The relay in the sandbox adds the forwarder, with the Rust
    `lol-html` crate. A sandbox keeps today's rule until its software
    updates. Effort: Large. Added by the options check.
  - **F.** A browser extension runs the forwarder in an isolated world of
    the frame. It helps only people who install it. Effort: Large. Added by
    the options check.
- **Left out:**
  - Tell the person to click outside the frame: the keys still fail.
  - The Mac app takes each command key before the frame: the preview loses
    keys that it uses, such as its own ⌘K.
  - Hidden Mac menu items: macOS matches keys by its own rules, not by
    [the matching rules](../docs/protocol/keyboard-shortcuts-matching.md).
  - A native view for each preview in the Mac app: C gives the same real
    presses in today's frame, and A also covers the browser.
  - Each user adds the script to their own app: it fails for each
    repository without the script.
  - The app takes the focus back by itself: plain keys would run commands
    while the person types in the preview.
- **Choice:** A, 2026-11-18. Reason: only A works in a browser tab, and
  the list of decision 1 keeps a fake key harmless. The options check kept
  A.

### 3. Stop the browser's own action for a forwarded key

Status: open again. The user chose A on 2026-11-18. The options check
added C and D and changed the recommendation from A to C.

- **Problem found by the check:** one flat list of taken keys skips the
  rules of the model. In Chrome on a Mac, the model leaves ⌘1 to ⌘9 and ⌘L
  to the browser (`src/app/shortcuts/browser-keys.ts`). A flat list then
  stops ⌘1 in the frame, and nothing runs. A recorded ⌥ key on a Mac can
  also stop a typed character, such as å, in a text field of the page.
- **Root question:** how can a key from a preview that runs a command stop
  the browser's own action, when the frame must decide before the app
  answers?
- **Options:**
  - **A.** The app sends the frame the taken keys. The forwarder stops each
    left key that matches one. The page learns these keys. Effort: Small.
  - **B.** The forwarder stops nothing, and some keys act twice, such as
    Ctrl+K in Chrome on Windows. Effort: Small.
  - **C.** A, but the shortcut model builds the list. The app sends one list
    for each focus kind: the page, a text field, and a single-line field.
    Each list holds only the keys that the model would act on for that focus
    in this browser. Effort: Small.
  - **D.** The Worker builds the default keys into the forwarder, and the
    app sends nothing. A key that the person changed then acts twice.
    Effort: Medium.
- **Left out:** stop every left key with a modifier, because ⌘C, ⌘F, and ⌘P
  would then fail in the preview.
- **Wider fix:** C. The model is the one source of each stop, so a later
  rule of the model also reaches the forwarder.
- **Recommendation:** C, from the options check. The first recommendation
  was A. C keeps A and stops only the keys that the app will act on.

## Design

Each line below is an agent call of 2026-11-18, unless it names a
decision.

### The allowed commands

- One list in `src/app/shortcuts/` names the allowed commands (decision 1).
  The model reads it for each forwarded press. A command that the list
  does not name never runs from a preview. This deny default makes a new
  command safe with no extra test.
- The list waits for decision 1. Option D or E keeps only the commands
  that write no data, open nothing outside the app page, and move the focus
  to no place where Enter acts, plus the palette. Example: Previous and
  Next tab, the workspace keys, the org keys, the sidebars, and the Go to
  rows except Go to Terminal.

### The forwarder

- The Worker adds the forwarder, not the relay in the sandbox. The Worker
  owns the changes that face the browser, and each sandbox gets the
  forwarder at once.
- The proxy adds it only to a request with `Sec-Fetch-Dest: iframe` and a
  2xx answer of type `text/html`. This also covers a form post that loads a
  page in the frame. A new tab is a top-level load, so it gets no
  forwarder.
- A changed answer gets `Vary: Sec-Fetch-Dest`, so that no cache gives it
  to another kind of load. The forwarder does nothing when it runs a second
  time in one page.
- HTMLRewriter adds one inline `<script>` at the end of `<head>`, or at the
  end of the document when the page has no `<head>` tag. At the end of
  `<head>`, it does not push `<meta charset>` past the first 1024 bytes.
- The script removes its own element at once, so a framework that hydrates
  the whole document sees no extra tag.
- The proxy drops the `ETag` of a changed answer, because the body is no
  longer the body of the server. A missing `Content-Length` is already the
  rule of the header allowlist.
- The proxy forwards no CSP header of the server today. A page with a
  `<meta>` CSP that blocks inline scripts gets no forwarder. Its keys then
  behave as today.
- When it starts, the forwarder posts an empty ready message to
  `window.parent`. The message holds no data, so its target origin can be
  `*`. The app answers with the taken keys. So the keys reach the page that
  replaced the launch page, with no wait for a change.
- The forwarder posts no key until the app sends it the taken keys. It
  accepts that message only from `window.parent`. It then posts each left
  key only to the origin of that message.
- An inner frame of the preview page, such as the canvas of Storybook,
  keeps today's rule. Its parent is the preview page, not the app. A
  follow-up item can add a relay through the parent forwarder.
- At each trusted keydown in the capture phase of the window, the forwarder
  adds a one-time listener for the bubble phase of the window. That
  listener runs after the listeners of the page. A key is left when it
  reaches that listener and `defaultPrevented` is false.
- The forwarder posts only a key with ⌘, Ctrl, or Alt. It posts no repeat
  and no key during text composition.
- The message holds the key, the code, the four modifiers, and the focus
  kind: a text field, a single-line text field, or the page.
- When a left key matches a taken key, the forwarder calls
  `preventDefault` and `stopPropagation`. So the browser's own action does
  not run (decision 3).
- The forwarder source lives in `src/shared/`. Its key match uses the same
  matcher module as the app, so both match the same keys. A
  `Function.toString()` of a function that imports helpers does not work.
  So Milestone 2 adds a build step that bundles the forwarder with its
  matcher into one string for the Worker.

### The app

- A new key source in `src/shell/shortcuts/` reads `message` events. It
  accepts a message only when all of these hold:
  - Its `source` is the window of a preview frame that `PreviewFrame`
    marks.
  - Its origin is the preview origin that the launch page of that frame
    announced.
  - That frame has the focus.
  - A strict reader accepts its fields.
- The launch page of a frame load posts the exact preview origin to its
  parent before its form post. The app accepts that message only from its
  own API origin and from the window of that frame. So the app learns the
  origin with no change to the `Preview` wire type, and a later navigation
  of the frame to another site cannot post keys.
- The source gives the press to the same shortcut listener, with the focus
  kind of the frame and no layout switch state. A preview never counts as a
  terminal.
- The model gives a pass for a forwarded press whose command is not
  allowed.
- The app never dispatches a DOM event for a forwarded key. It only runs
  the command that the model chose.
- The app sends the taken keys to the frame after each ready message, and
  again when the keymap or the offers change. Decision 3 says how the app
  builds them.
- A forwarded command that hides the frame moves the focus to the app,
  because the hidden frame leaves the layout.
- The live desktop keeps every key. Its stream does not pass through the
  proxy, and the app hides Desktop for now.
- The rule is the same in each layout, also on the phone Preview page.

### Compatibility

- An older Mac app copy bundles an older page with no listener, so it
  ignores the messages, and its keys behave as today.
- The runner and the relay do not change. The `Preview` wire type does not
  change.
- Each failure is safe: the keys then behave as today.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol docs state the new rules. The guides and the legal pages
restate each changed fact. This milestone waits for decisions 1 and 3,
because the protocol doc states the allowed commands and the taken keys.

- [ ] In `docs/protocol/keyboard-shortcuts.md`, replace the frame rule of
      "Where a key goes" with the rule for left keys, the allowed commands,
      and the taken keys. Keep the live desktop rule.
- [ ] In `docs/protocol/terminal-previews-and-desktop.md` and
      `docs/protocol/port-previews.md`, state that the proxy adds the
      forwarder to HTML frame loads, and its limits.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Read each guide in `src/marketing/docs/` in full, at least
      `terminal-and-previews.md`, `security.md`, and `mac-app.md`. Update
      each sentence that restates a changed fact.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 2: Shared forwarder and matcher

Depends on: 1

A pure module in `src/shared/` holds the forwarder source, the message
types and their strict readers, and the key match that the forwarder and
the app share. This milestone waits for decisions 1 and 3, because
option E of decision 1 and decision 3 change what the forwarder stops.

- [ ] Write the forwarder with the rules of "The forwarder".
- [ ] Write the readers of the ready message, the announce of the launch
      page, the taken keys, and the key message.
- [ ] Make the forwarder and the app use one key matcher. Add the build
      step that bundles the forwarder with it into one string.
- [ ] DOM tests: a left key posts, a used key does not post, a stopped key
      does not post, a taken key stops the browser action, nothing posts
      before the taken keys arrive, and a message from another window
      changes nothing.

## Milestone 3: Worker

Depends on: 2

The proxy adds the forwarder. The launch page announces the preview origin.

- [ ] Spike first, and save the results under `.context/preview-keys/`:
      - [ ] HTMLRewriter does not exist in the Node tests. Choose a seam
            that tests the proxy rule without it.
      - [ ] Check that a gzip or Brotli answer reaches HTMLRewriter
            decoded through `connection.wrap`, and that the browser gets a
            valid body.
- [ ] Add the forwarder in `worker/previews/proxy.ts` for the loads of
      "The forwarder". Drop the `ETag` of a changed answer.
- [ ] Post the preview origin to the parent from the launch page in
      `worker/previews/launch-document.ts`, inside its nonce CSP. Post only
      when the page is in a frame.
- [ ] Tests: frame loads of HTML get the script, other loads and types do
      not, a top-level load does not, a WebSocket upgrade does not, and the
      launch page posts only the exact origin.
- [ ] Update `worker/previews/README.md`.

## Milestone 4: App

Depends on: 2

The app hears forwarded keys and runs allowed commands. This milestone
waits for decisions 1 and 3.

- [ ] Add the allowed list of decision 1, with a deny default.
- [ ] Let the model pass a forwarded press of a command that is not
      allowed.
- [ ] Mark each preview frame in `PreviewFrame` for the key source.
- [ ] Add the key source with the checks of "The app".
- [ ] Send the taken keys after each ready message and on each change of the
      keymap or the offers.
- [ ] Tests: an allowed command runs, a command that is not allowed passes,
      a message from another window or origin runs nothing, a message while
      the frame has no focus runs nothing, and an unknown field runs
      nothing.
- [ ] Update `src/shell/shortcuts/README.md`, `src/app/shortcuts/README.md`,
      and `src/previews/README.md`.

## Milestone 5: Smoke test

Depends on: 3, 4

- [ ] With `npm run dev`, open a preview of a small server in Chrome. Check
      that ⌘K or Ctrl+K opens the palette from the frame, that a page that
      uses the key keeps it, and that Merge PR does not run from the frame.
- [ ] Check the same in the Mac app, if a build can run here. Otherwise
      record the check as blocked.
- [ ] Save the evidence under `.context/preview-keys/`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On `conductive.build`, open a preview and check that ⌘K opens the
      palette from the frame.
