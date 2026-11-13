# Links in text

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. It gives the look of a
web link in untrusted text, and what a press on each kind of link opens.
[Workspace, session, and file chips](design-chat.md#workspace-session-and-file-chips)
gives the chips, which take the place of a link to a workspace of the org.
`app/chat/links` draws the links of chat text, and the flow
`user-flows/open-a-local-server` opens a local address.

## The link part

- `TextLink` in `src/components/common/` draws a link in untrusted text.
  It is the one link part of chat text and of the Markdown preview of a
  file, from chat link decision 1. It takes no fixtures, so the app can
  use it too.
  - The words of the link take the link colour, `--ui-link`, and an
    underline 2 px under the text, as a link of the file preview has.
  - The link keeps the font, the size, and the weight of the text around
    it. So a link in bold stays bold, and a link in code keeps its code
    box and its monospace font.
  - A long link breaks anywhere to fit the line, so it never passes the
    edge of a phone screen. A closed message line cuts a link with its
    ellipsis, as it cuts the rest of its text.
  - The title of a link gives the whole address, as the URL parser writes
    it. So a host in another script shows its ASCII form.
  - `TextLink` draws its element through an `opener`, as `WorkspaceChip`
    does. The opener makes an anchor that opens a new tab, or a link of
    the app. Without an opener, the link keeps its look and opens
    nothing, as for a page that the mockups do not draw.

## Links in chat text

- `MessageText` reads the links of chat text with `workspaceLinks.ts`.
  `WebLinkText.tsx` beside it draws each link that is not a chip. Only
  `http` and `https` addresses are links.
  - A bare address shows as the text has it. Punctuation, quotes, `*`,
    `_`, `~`, and `]` at its end stay out of it, and so does a `)` that
    closes no `(` inside it.
  - In an answer and in a message line of the work of a turn, a Markdown
    link shows as its label. A label that reads as an address shows the
    real address in its place. The label is read as it shows, without
    code marks, bold marks, and invisible characters. It reads as an
    address when it then holds `://` or starts with `www.`, as
    `app/chat/links/label-address` shows.
  - In a message of a member, a Markdown link shows as typed, and its
    address is the link, as `app/chat/links/sent` shows.
  - Code that holds only one address, without the spaces at its ends,
    shows it as a link inside its code box. A workspace link in such code
    is a link, not a chip, so the code keeps its text. Longer code stays
    code.
  - An address with a user name or a password stays text, because its
    text can fake its host. So does an address of the app that names no
    page, such as an API address.
- A press on a link of the app opens its page in the app, in the same
  window, as a chip does. A press on a local address opens the port
  preview of its port in the workspace of the chat, as
  `app/chat/links/local-address` shows. The hosts of a local address are
  `localhost`, `127.0.0.1`, `[::1]`, and `0.0.0.0`. A press on any other
  link opens a new tab with no opener and no referrer. The Mac app opens
  it in the default browser.
- In a message line, a press on a link opens the link, and the line stays
  open or closed, as `app/chat/links/work` shows.
- The message box, the tool call lines, the terminal, and code blocks keep
  each address as text.
- The mockups open the screen of a workspace for its link, and
  `app/tools/preview` for a local address of port 3000. A link to a page
  that they do not draw opens no screen, such as the workspace of another
  org in `app/workspace-links/messages/other-org`.
