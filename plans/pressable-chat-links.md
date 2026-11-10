# Pressable links in the chat

Status: Active. On branch `calummoore/chat-link-handling`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The chat shows each web address of an agent answer or a sent message as
plain text, except a link to a workspace of the same org, which shows as a
chip. A member copies each other address into a browser by hand. In the
Mac app, even a link to the app needs a copy, because the window has no
address bar. On 10 November 2026 the user asked for links in the chat to
work automatically, with a screenshot of an answer whose pull request
address showed as text.

This change makes each `http` and `https` address of chat text a link. A
Markdown link of an answer shows as its label. A local address, such as
`http://localhost:3000`, opens the port preview of its port. An address
alone in inline code is a link too. The file preview draws its links with
the same link part, so a link to a page of the app opens in the app there
too. The change does not cover tool call lines, the terminal, code blocks,
the message field, file paths in answers, or bare addresses in the file
preview.

Contract owners:

- [Chat Markdown](../docs/protocol/chat-markdown.md).
- [Workspace links](../docs/protocol/workspace-links.md).
- [Port previews](../docs/protocol/port-previews.md).
- [Workspace tools](../docs/protocol/workspace-tools.md), for the file
  preview.
- The [chat README](../src/chat/README.md) and
  [Agent text](../src/chat/agent-text.md).
- The [Files README](../src/files/README.md) and the
  [previews README](../src/previews/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).

Replaced ways:

- The anchor that `inlineNodes` of the file preview draws for itself →
  the shared link part. Consumers: `src/files/markdown/inline-render.tsx`
  and the link test of `src/files/markdown/MarkdownView.test.tsx`. Moved
  and deleted in Milestone 6.
- The bare address readers `bareLinkAt` and `bareLink` of
  `src/chat/links/workspace-links.ts` and the link reading of
  `docs/mockups/src/components/chat/workspaceLinks.ts` → the reader of
  `src/markdown/web-links.ts`. Consumers: `chatParts`, `textParts` of the
  message field, `MessageText` of the mockups, and their tests. Moved and
  deleted in Milestone 3.

## Terms

- **Bare address:** a web address with no Markdown around it, such as
  `https://github.com/Firna-AI/home/pull/2`.
- **Markdown link:** a label in brackets followed by an address in
  parentheses, such as `[PR #2](https://github.com/…)`.
- **Label link:** a Markdown link that shows as its label, by decision 1.
- **Workspace chip:** a small box in chat text that shows the state, the
  number, and the name of a workspace of the same org.
- **File preview:** the Files view that shows a Markdown file of the
  branch as formatted text.
- **Local address:** in chat text, an address whose host is `localhost`,
  `127.0.0.1`, `[::1]`, or `0.0.0.0`, such as `http://localhost:3000`.
- **Port preview:** the Preview tool of a workspace. It shows a web server
  of the cloud computer by its port.

## Decisions

A chat link decision number names a decision of this change. The protocol
docs cite it so, as [Decision numbers](../docs/architecture.md#decision-numbers)
says. The options check of 10 November 2026 changed decisions 2 and 4,
and added decisions 5 and 6. Its report is in
`.context/pressable-chat-links/options-check-report.md`.

### 1. Links in chat text cannot be pressed

- **Answer:** D, on 10 November 2026.
- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design. First recorded in
  `plans/follow-ups/chat-links-not-pressable.md` on 9 November 2026.
- **Category:** Product bug.
- **Location:** `src/chat/links/chat-parts.ts:165` and `:173`,
  `src/chat/links/LinkedText.tsx:79`, `docs/protocol/chat-markdown.md:27`.
- **Background:**
  - Sandbox code can shape agent text, so the text is untrusted.
  - The chat shows each Markdown link as its raw text.
  - The file preview already shows Markdown links from untrusted files as
    their label. It allows only `http`, `https`, and `mailto` addresses.
    Each link opens in a new tab with `noopener noreferrer`.
  - The Mac app blocks each new window that opens an app page, in
    `navigationTarget` of `desktop/src/navigation.ts`. So an app link must
    open in the same window, as a chip does.
- **Problem:** A member cannot press a web address in chat text.
- **Impact if no action:** Members copy each link into a browser by hand.
- **Root question:** How does a person open a web address in a message or
  an agent answer?
- **Options:**
  - **A.** Show each `http` and `https` address in chat text as a link. A
    Markdown link shows as typed, and its address is the link. An app link
    opens in the app. Every other link opens in a new tab, or in the
    default browser from the Mac app. Cost: Markdown links keep their raw
    brackets. Effort: Medium.
  - **C.** Do A, and show a Markdown link of an answer as its label. The
    link's title gives the real address. When the label is itself a web
    address, the link shows the real address in its place. Cost: on a
    phone, the real address shows only after a long press. Effort: Medium.
  - **D.** Do C, and use the same link part for the links of the file
    preview. A link in a file to an app page then works in the Mac app
    too. Cost: the change also reaches the file preview. In a browser, an
    app link of a file then opens in the same window, not in a new tab.
    Effort: Medium.
  - **E.** Added by the options check. Do D, and show the host after each
    label link that leaves the app, such as "PR #2 · github.com". Effort:
    Medium.
  - **F.** Added by the options check. Do D, and ask before a label link
    opens. Effort: Medium.
- **Left out:**
  - B, links of the app only: the user's message asks for the GitHub link
    to open.
  - A row of the links under each message: A also shows each real address
    and keeps the link in its sentence.
  - A preview card for each link: the Worker would fetch untrusted
    addresses, and the goal needs no card.
  - Links marked in the chat events: this changes the events and the
    saved history, and the browser must still check each link.
  - A link library, such as `linkify-it`: the chat's own reader covers
    each address form that the goal needs, with no new dependency.
  - `mailto:` and custom schemes, such as `vscode:`: a custom scheme in
    untrusted text can start an app on the reader's computer. The Mac app
    sends an address with another scheme nowhere.
  - Change nothing: it fails the goal.
- **Wider fix:** D. One link part then serves each view of untrusted text.
- **Previous examples:** None found.
- **Related:** Decisions 2 and 3 add two rules that apply to each option.
  Decision 5 asks E and F, which build on the answer D.
- **Recommendation:** C, before the answer. D best protects the codebase,
  because one link part then serves each view.
- **Action:** ask the user, because C changes the rule in
  `docs/protocol/chat-markdown.md` that a link shows as typed.

### 2. Local addresses point to the reader's computer

- **Answer:** C, on 10 November 2026.
- **Changed after the answer:** the background and B's cost were wrong.
  Since PR #154, the port form lists the servers that listen in the
  sandbox. The options check added D and E. C stays the recommendation.
- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/chat/links/workspace-links.ts:40`,
  `src/previews/PreviewTool.tsx:93`.
- **Background:** Agents start dev servers in the cloud computer and give
  a local address for them. The port form of the Preview tool lists the
  servers that listen in the sandbox (decision 220). A press on a server
  opens its preview.
- **Problem:** With decision 1, a local address becomes an ordinary link.
  A press then opens the reader's own computer, not the cloud computer.
- **Impact if no action:** The press shows an error page, or another
  server on the reader's computer.
- **Root question:** How does a member open a server on the cloud computer
  when an answer gives its local address?
- **Options:**
  - **A.** Link a local address the same as any other address. Cost: a
    press opens the reader's own computer. Effort: Small.
  - **B.** Keep each local address as plain text. Cost: the member opens
    the Preview tool and presses the server there. Effort: Small.
  - **C.** A press on a local address opens the port preview for its port,
    in the workspace of the chat. Cost: the preview opens at the first
    page of the server, because a launch address holds no path. Effort:
    Medium.
  - **D.** A press opens the port form of the Preview tool, with its list
    of servers. A press on the row of the port then opens the preview.
    Cost: two presses. Effort: Small.
  - **E.** Do C, and carry the path, the query, and the hash into the
    preview. Cost: a change of the grant flow in the Worker, a check
    against open redirects, and new protocol rules. Effort: Large.
- **Left out:**
  - Replace each local address in the text with its preview address: it
    breaks the rule of `docs/protocol/port-previews.md` that nothing opens
    by itself.
  - An agent tool that gives the preview address: answers still copy
    local addresses from the output of servers.
- **Wider fix:** C, in the shared opener of decision 1D. Each view that
  draws links with it then follows one rule.
- **Previous examples:** None found.
- **Related:** Decision 3: with its answer B, a local address in code also
  follows this decision. Decision 4 extends this rule.
  `plans/follow-ups/local-address-path-in-preview.md` records E.
- **Recommendation:** C. It opens the server with one press where the
  answer shows its address.
- **Action:** ask the user, because with C a press in chat text opens a
  port preview, and no requirement covers that.

### 3. Addresses in inline code cannot be pressed

- **Answer:** B, on 10 November 2026.
- **Severity:** Low. **Likelihood:** Common. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/chat/links/chat-parts.ts:91`,
  `docs/protocol/workspace-links.md:92`.
- **Background:** Agents often put an address alone in inline code, such
  as `https://conductive.build` in the user's screenshot. Today a link in
  code stays code, also for chips, because code shows its exact text.
  GitHub does not link addresses in code either.
- **Problem:** With decision 1 alone, an address in inline code stays text.
- **Impact if no action:** The member copies each address that an agent
  puts in code.
- **Root question:** How does a member open a web address that an agent
  puts in code?
- **Options:**
  - **A.** Keep code as code, with no links. Cost: the member must copy
    each such address. Effort: Small.
  - **B.** When inline code holds only one web address, make it a link
    inside its code box. Longer code and code blocks stay as typed. Cost:
    the chat then differs from GitHub. Effort: Small.
  - **C.** Link each web address in inline code and in code blocks. Cost:
    a press in a command can open an address that the command calls. Also,
    dragging a link moves it and does not select text. Effort: Small.
  - **D.** Added by the options check. Show a small open button after
    each code part that holds a web address, and keep the code as text.
    Cost: a new control, a mockup, and a protocol rule. Effort: Medium.
- **Left out:** A copy button for code: the member still pastes the
  address into a browser.
- **Wider fix:** None, because this rule applies to one view only.
- **Previous examples:** None found.
- **Related:** Decision 2: with B, a local address in code also follows
  decision 2. `plans/follow-ups/chat-code-not-read-as-markdown.md`: the
  chat reads inline code with single backticks only, so B links only such
  code.
- **Recommendation:** B. An address alone in code is meant to be opened,
  and longer code keeps its exact text and stays easy to select.
- **Action:** ask the user, because B changes the rule in
  `docs/protocol/workspace-links.md` that a link in code stays code.

### 4. Local addresses in a file preview

- **Answer:** Open.
- **Severity:** Low. **Likelihood:** Common. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/files/markdown/inline-render.tsx:33`.
- **Background:** Decision 2 makes a local address in chat text open the
  port preview. The file preview draws Markdown links of repository files.
  Many project READMEs link a local address, such as "Open
  [http://localhost:3000](http://localhost:3000) with your browser".
  With decision 1D, both views draw links with one link part.
- **Problem:** A press on such a link in the file preview opens the
  reader's own computer, not the cloud computer.
- **Impact if no action:** The press shows an error page, or another
  server on the reader's computer.
- **Root question:** How does a member open a server on the cloud computer
  when a file of the branch links its local address?
- **Options:**
  - **A.** Keep the link as it is: it opens the reader's own computer.
    Effort: Small.
  - **B.** Apply decision 2 in the file preview too: a press opens the
    port preview of its port, in the workspace of the file. Effort: Small.
  - **C.** Show such a link of a file as its label, with no link. Cost:
    the member opens the Preview tool and presses the server there.
    Effort: Small.
- **Left out:** None.
- **Wider fix:** B. One rule then serves each link of the workspace.
- **Previous examples:** None found.
- **Related:** Decision 2 gives the rule. Milestone 6 waits for this
  answer for one TODO only.
- **Recommendation:** B. The shared opener already applies decision 2 to
  each link that it draws, so B needs no code of its own.
- **Action:** ask the user, because B adds a press in the file preview
  that opens a port preview, and no decision covers that.

### 5. A label link can hide where it leads

- **Answer:** Open.
- **Severity:** High. **Effort:** Small.
- **Source:** Design. From the options check of this plan.
- **Category:** Security.
- **Location:** `src/chat/links/chat-parts.ts:165`,
  `src/files/markdown/inline-render.tsx:33`.
- **Background:**
  - By decision 1D, a Markdown link of an answer shows as its label, and
    its title gives the real address.
  - Sandbox code can shape agent text, so a label can lie about where its
    link leads.
  - A browser shows the address under the pointer at the bottom of the
    window. The Mac app shows only the title, after a short wait. A phone
    shows the address after a long press.
  - The file preview and GitHub already show labels of untrusted files in
    this way.
- **Problem:** A label such as "github.com/acme/app/pull/2" can lead to
  another host. A reader who presses at once does not see the real
  address.
- **Impact if no action:** An attacker who can shape agent text can send
  a member to a false sign-in page.
- **Root question:** How does a reader see where a label link leads before
  the press?
- **Options:**
  - **A.** Keep the title. Test each label as it shows, without code
    marks, bold marks, and invisible characters. A label that then holds
    `://` or starts with `www.` shows the real address in its place. Cost:
    a label without these marks, such as "github.com/acme", can still lead
    to another host. Effort: Small.
  - **B.** Do A, and show the host after each label link of an answer
    that leaves the app, such as "PR #2 · github.com". Cost: more text in
    each answer, a mockup change, and the chat differs from GitHub.
    Effort: Medium.
  - **C.** Do A, and ask before a label link opens. A press shows the real
    address and an Open button. Cost: two presses for each label link, and
    a new menu with its mockup. Effort: Medium.
- **Left out:**
  - The real address in place of every label: decision 1 chose labels.
  - A comparison of a host in the label with the host of the address: a
    file name, such as "agent-text.ts", looks like a host, so many honest
    labels would show their address.
- **Wider fix:** B. It shows each destination, so no rule must know each
  shape of a false label.
- **Previous examples:** None found. The file preview has the same
  exposure today.
- **Related:** Decision 1: B and C are its options E and F. Decision 6
  sets the copy of a label link.
- **Recommendation:** A. It keeps the look of decision 1 and stops the
  false labels that read as addresses. B best protects readers, because
  each destination shows without a hover.
- **Action:** ask the user, because B and C trade more text or a second
  press for safety, and no option is clearly best.

### 6. A copy of a label link loses its address

- **Answer:** Open.
- **Severity:** Low. **Likelihood:** Common. **Effort:** Small.
- **Source:** Design. From the options check of this plan.
- **Category:** Product bug.
- **Location:** `src/chat/links/mention-copy.ts`.
- **Background:** A copy of chat text gives the mention of each file chip,
  through one copy handler in `src/chat/links/mention-copy.ts`. A browser
  copies a link as its text in the plain copy. The session menu copies a
  whole transcript as Markdown. The open item
  `plans/follow-ups/workspace-chip-copy-in-messages.md` recommends that a
  copy of a workspace chip gives its link.
- **Problem:** With decision 1D, a plain copy of an answer gives the label
  of each label link and loses its address.
- **Impact if no action:** A member who pastes an answer into a plain text
  field loses the address of each label link.
- **Root question:** What does a copy of a label link give?
- **Options:**
  - **A.** The label, as the browser copies a link. Cost: a plain paste
    loses the address. Effort: Small.
  - **B.** The Markdown source, such as `[PR #2](https://github.com/…)`,
    through the copy handler of file chips. Cost: a plain paste shows
    brackets. Effort: Small.
  - **C.** The label and the address, such as "PR #2
    (https://github.com/…)". Cost: a third format, which neither the agent
    nor Markdown uses. Effort: Small.
- **Left out:** None.
- **Wider fix:** B, with the same mark on workspace chips, as
  `plans/follow-ups/workspace-chip-copy-in-messages.md` recommends. One
  copy rule then gives the source of each part.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/workspace-chip-copy-in-messages.md`: the
  same handler and the same question for chips. Decision 5.
- **Recommendation:** B. A copy keeps each address, in the words that the
  agent wrote.
- **Action:** ask the user, because B adds a copy rule that no requirement
  covers.

## Design calls

These calls are mine, made on 10 November 2026 under the decision test.

- Links show in agent answers, sent messages, and the message lines of a
  folded turn, because one reader reads all three. The message field
  keeps links as text, because a press there places the caret.
- Only `http` and `https` addresses become links in chat text. The file
  preview keeps `mailto` links, as today.
- In chat text, an address with a user name or a password, such as
  `https://github.com@evil.example/`, stays text, because its text can
  fake its host. So does an address of the app origin that the router
  reads as no page, such as an API address. The file preview keeps both
  as links, as today, so it gets no stricter rule.
- An address with the app origin that the router reads as a page opens in
  the app, in the same window, as a chip does. A click with a modifier key
  keeps the action of the browser.
- An app address is the raw segments of the path, without decoding,
  joined with one slash, then the query and the hash of the link. Chips
  use it too. This applies option D of
  `plans/follow-ups/chip-leading-slashes-wrong-host.md` to every page.
- The reader checks the app origin before the local hosts, because the
  app origin of `npm run dev`, `http://127.0.0.1:5173`, is a local address.
- Every other link opens in a new tab with `noopener noreferrer`, so other
  sites get no app address. The Mac app sends it to the default browser.
- Each web link gives its address as its title, as the URL parser writes
  it. So a host in another script shows its ASCII form.
- A bare address keeps a `)` that closes a `(` inside it, as on GitHub.
  Trailing punctuation, quotes, `*`, `_`, and `~` stay out of it.
- A label is tested as it shows, as option A of decision 5 says. Every
  option of decision 5 keeps that test.
- A Markdown link of a sent message shows as typed, and its address is the
  link. A Markdown link whose address is not `http` or `https` shows as
  typed, as today.
- A press on a local address opens the preview of its port with the same
  request and checks as a typed port, as a press on a listed server does.
  The link names the Preview tool of the chat's workspace with the port.
  The path, the query, and the hash do not carry over. In a read-only
  chat, a local address stays text, because no server runs there.
- `0.0.0.0` counts as a local address in chat text, because servers often
  print it. The chat rule names its four hosts. The redirect rule of port
  previews keeps its three hosts.
- Inline code becomes a link only when its text, without the spaces at its
  ends, is one address that the reader accepts. A workspace link alone in
  code becomes such a link, not a chip, so the code keeps its text.
- Links take the colour and the underline of file preview links. A link
  in bold stays bold. A long link breaks to fit the line. A link in code
  keeps its code box.
- A press on a link in a message line opens the link and does not toggle
  the line, as a press on a chip does. The hidden copy of a closed line
  draws every link as text, as it draws no chips.
- The browser reads the links from the text at each update. So a live
  answer and the same answer from the saved history show the same links.
- The mockups draw the screens of Milestone 1 with their own reader.
  Milestone 3 moves them to the shared reader, with no change to a screen,
  because the shared reader does not exist before Milestone 3.

## Components

- `src/markdown/web-links.ts`: the one reader of addresses for chat text,
  the file preview, and the mockups. It finds a bare address and gives
  its kind: an app page with its app address, a local address with its
  port, a web link, or no link. It imports no React and no app module.
  The app gives it the check for a page of the app.
- `docs/mockups/src/components/common/TextLink.tsx`: the look of a link in
  untrusted text, for the mockups, the chat, and the file preview. It
  draws its anchor through an `opener`, as `WorkspaceChip` does.
- An opener in `src/shell/ui/` with a context. The workspace screen gives
  it the app origin, the app navigation, and the address of the Preview
  tool for a port. Outside that context, every link opens in a new tab. A
  plain mode draws every link as text, for the hidden copy of a line.
- `chatParts` and `LinkedText` in `src/chat/links/`: the link parts of
  chat text.
- The Preview tool: an address that names a port opens that port.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the links of chat text, the local address flow, and the changed link
screen of another org, on desktop and on a phone.

- [ ] Add `TextLink` with its CSS module in
      `docs/mockups/src/components/common/`, as the design says.
- [ ] Draw the link parts in `MessageText` and
      `docs/mockups/src/components/chat/workspaceLinks.ts`: bare
      addresses, labels of Markdown links in answers, a label that is an
      address, an address alone in inline code, and a local address.
- [ ] Add the page `app/chat/links`, with these five screens:
  - [ ] An answer with a bare pull request address, a Markdown link as
        its label, and an address alone in inline code.
  - [ ] A Markdown link whose label is another address. The real address
        shows.
  - [ ] An answer with `http://localhost:3000`. A press opens
        `app/tools/preview`.
  - [ ] A sent message with a bare address and a Markdown link as typed.
  - [ ] A closed and an open message line of a folded turn, with a link.
- [ ] Draw the answer of decision 5, when it is B or C.
- [ ] Add the user flow `user-flows/open-a-local-server`: the answer with
      the local address, then the port preview of port 3000.
- [ ] Update `app/workspace-links/messages`: the link to a workspace of
      another org is now a link that opens in the app.
- [ ] Update `docs/mockups/catalogue.md` for the new page, the flow, and
      the changed screen.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages on both
      sizes with `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions of links in chat text, of local
addresses, and of links in the file preview.

- [ ] `docs/protocol/chat-markdown.md`: add a section on links with the
      rules of decisions 1, 2, 3, 5, and 6 and the design calls that a
      reader can observe. Change the rule that other links show as typed,
      and the rejection that names links as a reason. Define the chat
      link decision number.
- [ ] `docs/protocol/workspace-links.md`: a link that is not a chip is a
      link, and an address alone in inline code is a link in code. Change
      "No link makes the app send a request that reaches another org", so
      that only a press opens a page of another org.
- [ ] `docs/protocol/port-previews.md`: a press on a local address of the
      chat opens its preview, as a press on a listed server does.
- [ ] `docs/protocol/workspace-tools.md`: a link of the file preview opens
      as a link of the chat does, with the answer of decision 4.
- [ ] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update
      each sentence that restates a changed fact, as
      [Website docs](../docs/protocol/website-docs.md) says.
- [ ] Check the rows of `src/marketing/from-conductor/` for a feature that
      this change ships, and update its status or note.

## Milestone 3: The shared link reader

Depends on: 2

Add the one reader of addresses, and build each app address from the
route.

- [ ] Add `src/markdown/web-links.ts` with the kinds of the design and
      the end rule of a bare address.
- [ ] Move `chatParts` and `textParts` to its bare address reader. Delete
      `bareLinkAt` and `bareLink` of `src/chat/links/workspace-links.ts`.
- [ ] Move `docs/mockups/src/components/chat/workspaceLinks.ts` to the
      shared reader. Run `npm run mockups:check`. No screen changes.
- [ ] Build the address of each chip with the app address builder. Add
      the doubled-slash case of
      `plans/follow-ups/chip-leading-slashes-wrong-host.md` to
      `src/chat/links/workspace-links.test.ts`. Delete that item.
- [ ] Add `src/markdown/web-links.test.ts`: each kind, the refused schemes
      and credentials, the end rule, the local hosts with and without a
      port, and an app origin on a local host.
- [ ] Name the reader in [Agent text](../src/chat/agent-text.md).

## Milestone 4: The Preview tool opens a port from its address

Tags: ui

Depends on: 2

- [ ] Read a port from the address of the Preview tool in
      `src/shell/workspace/tools/tool-address.ts`, and build that address.
- [ ] In `src/previews/PreviewTool.tsx`, open the port of the address with
      the same request and checks as a typed port. An open port shows its
      preview with no request. Then the address names the preview.
- [ ] Test the open of a port from the address, the open port, and a
      failed open.
- [ ] Update the [previews README](../src/previews/README.md).

## Milestone 5: Links in chat text

Tags: ui

Depends on: 1, 3, 4

- [ ] Add the opener and its context in `src/shell/ui/`. The workspace
      screen gives the app origin, the navigation, and the address of a
      port.
- [ ] Make `chatParts` give a link part for each address that is not a
      chip, as the design and the answer of decision 5 say.
- [ ] Draw the link parts in `LinkedText` with `TextLink`, also in the
      message lines of a folded turn. The hidden copy of a line uses the
      plain mode.
- [ ] Apply the answer of decision 6 to a copy of chat text.
- [ ] Update the tests that expect other links as text, such as
      `src/shell/workspace/LinkChips.test.tsx` and
      `src/chat/links/workspace-links.test.ts`. Add tests for the link
      parts and for a press on each kind of link.
- [ ] Update the [chat README](../src/chat/README.md) and
      [Agent text](../src/chat/agent-text.md).
- [ ] Delete `plans/follow-ups/chat-links-not-pressable.md`.
- [ ] Smoke-test in `npm run dev`: a bare address, a Markdown link, a
      local address, and an address in code.

## Milestone 6: Links in the file preview

Tags: ui

Depends on: 3, 5

- [ ] Draw each link of `inlineNodes` with `TextLink` and the opener of
      Milestone 5. Delete the anchor of `inlineNodes`. Keep the links
      that the design keeps for the file preview.
- [ ] Give the file preview the opener context in the workspace screen.
- [ ] Apply the answer of decision 4 to local addresses in a file.
- [ ] Move the link test of `src/files/markdown/MarkdownView.test.tsx`
      to the shared link part, and add a link to an app page.
- [ ] Update the safety rules of the [Files README](../src/files/README.md).

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests. Run `npm ci`, `npm --prefix desktop ci`,
      and `npm ci --prefix runner`, then the complete gate,
      `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] In the Mac app, press a web link, an app link, and a local address
      of an answer. The web link opens in the default browser. The app
      link and the local address open in the window. This needs a Mac,
      which the cloud computer of this work does not have.
