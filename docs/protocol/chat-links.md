# Chat links

This doc holds the requirements and the decisions in force for the links
of chat text. It belongs to [Chat Markdown](chat-markdown.md), which
defines an agent message and holds the other Markdown of agent messages.
Chat Markdown also says how a link shows while the agent writes and in the
saved history. [Workspace links](workspace-links.md) holds the chips of
workspace links. The terms are those of the
[architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue.md) draws links at
`app/chat/links`, and the flow `user-flows/open-a-local-server` opens a
local address.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A chat link
decision number, such as chat link decision 1, names the dated record of
one decision of the change that makes each web address of chat text a
link.

## Links

- Chat text is the text of agent messages and of sent messages, also in
  the message lines of the work of a turn. Each `http` and `https` address
  in chat text is a link (chat link decision 1 D).
- Reason: a member opens each address with one press. The Mac app has no
  address bar, so a copy cannot open a page of the app there.
- A workspace link outside code shows as a chip, as
  [Messages and answers](workspace-links.md#messages-and-answers) says.
- The line of a tool call shows each address as text. So does the message
  field, as [The message field](workspace-links.md#the-message-field)
  says.
- An address of another scheme, such as `mailto:` or `vscode:`, stays
  text. Reason: in untrusted text, an address of a custom scheme can start
  an app on the computer of the reader.
- An address with a user name or a password, such as
  `https://github.com@evil.example/`, stays text. Reason: its text can
  fake its host.
- A link of the app is an address at the app origin that names a page of
  the app. A press opens that page in the app, in the same window, as a
  press on a chip does. Reason: the Mac app opens no second window, as
  [Navigation](desktop-app.md#navigation) says.
- The page that opens is the page that the app reads from the address,
  with its query and its hash. So a press never leads out of the app, also
  for an address with doubled slashes.
- A click with a modifier key keeps the action of the browser.
- An address at the app origin that names no page, such as an address of
  the API, stays text.
- A press on a [local address](#local-addresses) opens the preview of its
  port. A press on any other link opens a new tab with
  `noopener noreferrer`, and the Mac app opens it in the default browser.
  Reason: the other site cannot see the app address or move the app page.
- A press on a link in a message line opens the link. The line stays open
  or closed, as for a chip.
- A link has the colour and the underline of a link in the file preview.
  A link in bold stays bold, and a link in code keeps its code box. A long
  link breaks to fit the line. The [mockups](../mockups/design-links.md)
  give the look.
- The title of each link gives its whole address. A host in another
  script shows there in its ASCII form.
- A list of the links under each message was rejected, because a link
  then leaves its sentence. A preview card for each link was rejected,
  because the Worker would then fetch untrusted addresses.

### Bare addresses and Markdown links

- A bare address is a web address with no Markdown around it. It shows as
  the text has it.
- A bare address ends at a space or an angle bracket. Punctuation, quotes,
  `*`, `_`, `~`, and `]` at its end stay out of it. A `)` at its end stays
  in only when it closes a `(` inside the address, as on GitHub.
- In an agent message, a Markdown link shows as its label, and its title
  gives its address (chat link decision 1 D). Reason: the text then reads
  as the agent meant it, with no raw brackets.
- The chat tests each label as it shows: without code marks, bold marks,
  invisible characters, and the spaces at its ends. The invisible
  characters are the default ignorable code points of Unicode, such as a
  zero-width space.
- A label that then holds `://`, or starts with `www.` in any case, shows
  the real address in its place, as the text has it.
- Reason: sandbox code can shape agent text, so a label can name another
  address than its link. A label that reads as an address then cannot
  hide where its link leads.
- In a sent message, a Markdown link shows as typed. Its brackets and its
  label stay text, and its address is a link as a bare address is.
  Reason: a sent message shows the text as the member typed it.
- A Markdown link whose address stays text shows as typed, also in an
  agent message.
- The Markdown of an image, such as `![alt](address)`, is not a Markdown
  link. It shows as typed, as [Formatting](chat-markdown.md#formatting)
  says, and its address is a link as a bare address is.

### Local addresses

- In chat text, a local address is an address whose host is `localhost`,
  `127.0.0.1`, `[::1]`, or `0.0.0.0`. Its port is the port of the address,
  or the default port of its scheme: 80 for `http`, and 443 for `https`.
- A press on a local address opens the preview of its port, in the
  Preview tool of the workspace of the chat (chat link decision 2 C).
  [Port previews](port-previews.md) says how the preview opens.
- `0.0.0.0` counts as a local address in chat text, because servers often
  print it. The redirect rule of
  [port previews](terminal-previews-and-desktop.md#port-previews) keeps
  its three hosts.
- An address at the app origin is never a local address, also when the
  app runs on a local host, as in development.
- In a read-only workspace, such as an archived workspace, a local address
  stays text. Reason: no server runs there.

### Links in code

- Inline code shows a link only when its text, without the spaces at its
  ends, is one address that is a link by the rules above (chat link
  decision 3 B). The link stays inside its code box.
- A workspace link alone in inline code is such a link, not a chip. So
  the code keeps its text.
- Other inline code and each code block keep each address as text.
- Reason: an agent often puts an address alone in code, and means it to be
  opened. Longer code keeps its exact text and stays easy to select.
- Links in all code were rejected. A press in a command could then open
  an address that the command calls, and a drag would move a link, not
  select its text.
