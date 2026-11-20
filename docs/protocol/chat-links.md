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
local address. It draws the images of agent messages at
`app/chat/formatting/pictures`.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A chat link
decision number, such as chat link decision 1, names the dated record of
one decision of the change that makes each web address of chat text a
link. A Markdown parser decision, such as Markdown parser decision 5 A, is
a decision of the change that reads Markdown with one parser, as
[Chat Markdown](chat-markdown.md) says.

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
  `*`, `_`, and `~` at its end stay out of it. A `)` or a `]` at its end
  stays in only when it closes a `(` or a `[` inside the address. GitHub
  uses the same rule for a `)`.
- In an agent message, an address in angle brackets, such as
  `<https://example.com/a>`, is a link when the address is a link by the
  rules of this doc. It shows without its brackets, as the text has it.
  Otherwise it shows as typed.
- In an agent message, a Markdown link shows as its label, and its title
  gives its address (chat link decision 1 D). Reason: the text then reads
  as the agent meant it, with no raw brackets.
- A Markdown link can hold a link title: text in quotes or in parentheses
  after its address, such as `[docs](https://example.com/a "Docs")`. The
  chat reads a link title and the spaces around the address as the file
  preview does. The chat does not show the link title (chat link decision
  7 B).
- Reason: the chat and the file preview then read the same Markdown in the
  same way. A link title after the label was rejected, because it adds
  more untrusted text. A link title as the title of the link was rejected,
  because that title gives the real address.
- The chat tests each label as it shows: without the marks of code, bold,
  emphasis, and strikethrough, without invisible characters, and without
  the spaces at its ends. The invisible characters are the default
  ignorable code points of Unicode, such as a zero-width space.
- A label that then holds `://`, or starts with `www.` in any case, shows
  the real address in its place, as the text has it.
- A label that then shows nothing also shows the real address in its
  place (chat link decision 8 B). Examples are an empty label, and a label
  of invisible characters only, also in bold.
- Reason: sandbox code can shape agent text, so a label can name another
  address than its link. A label that reads as an address then cannot
  hide where its link leads. A link whose label shows nothing shows its
  address, so the reader sees where it leads.
- For a label that shows nothing, an empty link was rejected, because the
  keyboard can reach a link with no words. The Markdown as typed was
  rejected, because its raw brackets then show.
- In a sent message, a Markdown link shows as typed. Its brackets, its
  label, and its link title stay text, and its address is a link as a
  bare address is. Reason: a sent message shows the text as the member
  typed it.
- A Markdown link whose address stays text shows as typed, also in an
  agent message. A file target instead opens its file, as
  [Files in answers](file-mentions-answers.md#files-in-answers) says.
- In an agent message, the Markdown of an image, such as
  `![alt](address)`, shows its alt text, and no picture at a web address
  loads (Markdown parser decision 5 A, 17 November 2026).
- When the address of the image is a link by the rules of this doc, the
  alt text is a link to that address, with the rules of a label. So alt
  text that reads as an address, or that shows nothing, shows the address
  in its place. Otherwise only the alt text shows.
- An image of a file of the workspace instead shows its alt text as a link
  that opens that file, or a picture of that file, as
  [Files in answers](file-mentions-answers.md#files-in-answers) says.
- An image inside the label of a Markdown link shows its alt text as words
  of that label.
- Reason: a picture at a web address makes the browser of each reader
  call a server that sandbox text chose, and the
  [content security policy](access-and-security.md#content-security-policy)
  blocks it. A picture that loads at once, or at a press, was not chosen
  for that reason. A picture through the Worker was not chosen, because
  the Worker would then fetch untrusted addresses.
- In a sent message, the Markdown of an image shows as typed, as a
  Markdown link does, and its address is a link as a bare address is.

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
