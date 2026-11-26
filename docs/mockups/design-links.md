# Links in text

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. It gives the look of a
web link in untrusted text, and what a press on each kind of link opens.
It also gives the links and the pictures of files in answers.
[Workspace, session, and file chips](design-chips.md)
gives the chips, which take the place of a link to a workspace of the org.
`app/chat/links` draws the links of chat text, and the flow
`user-flows/open-a-local-server` opens a local address.

## The link part

- `TextLink` in
  [`src/ui/components/common/`](../../src/ui/components/common/) draws a
  link in untrusted text. It is the one link part of chat text and of the
  Markdown preview of a file, from chat link decision 1. The app and the
  mockups both import it.
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

- `MessageText` draws the links of the text of a member from the parts
  that `chatParts` of the app gives. `AnswerText` draws the links of an
  answer from the parts that `answerParts` of the app gives.
  `workspaceLinks.ts` beside them gives both readers the workspaces of the
  chat, and where each web address leads. `WebLinkText.tsx` beside them
  draws each link that is not a chip. Only `http` and `https` addresses
  are links.
  - A bare address shows as the text has it. Punctuation, quotes, `*`,
    `_`, and `~` at its end stay out of it. A `)` or a `]` at its end
    stays in only when it closes a `(` or a `[` inside the address.
  - In an answer and in a message line of the work of a turn, a Markdown
    link shows as its label. Its link title, the text in quotes or in
    parentheses after its address, does not show. A label that reads as
    an address, or that shows nothing, shows the real address in its
    place. The label is read as it shows, without code marks, bold marks,
    invisible characters, and the spaces at its ends. It reads as an
    address when it then holds `://` or starts with `www.`, as
    `app/chat/links/label-address` shows.
  - In a message of a member, a Markdown link shows as typed, with its
    link title, and its address is the link, as `app/chat/links/sent`
    shows.
  - In an answer and in a message line, a Markdown image whose target is
    no file of the workspace shows its alt text, and no picture loads,
    from item 5 A of the Markdown plan, which the user chose on 17
    November 2026. At a web address, the alt text is a link to the
    address, with the rules of a Markdown link: alt text that reads as an
    address, or that shows nothing, shows the address in its place. With
    no valid address, only the alt text shows, as
    `app/chat/formatting/pictures` shows. An image of a file of the
    workspace is a link that opens the file, or the picture of a picture
    file, as [Files in answers](#files-in-answers) gives.
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

## Files in answers

- A Markdown link of an answer to a file of the workspace shows as a link
  with its label, from answer chip decision 4. Its title is the path, and
  a press opens the file tab. `FileLinkText` in `MentionChip.tsx` of
  `src/components/chat/` draws it.
- A Markdown image of an answer to a PNG, JPEG, GIF, or WebP file shows as
  a small picture, from screenshot decision 2 of 18 November 2026, as
  `app/file-mentions/answers` shows. An SVG file and a link without `!`
  stay links. `AnswerPicture` in
  [`src/ui/components/chat/`](../../src/ui/components/chat/) draws it. The
  app and the mockups both import it.
  - The picture stands in the line of text at the place of the image. The
    text of the line keeps to its top edge, as beside a chip.
  - The picture keeps its proportions. It is never larger than its own
    size, never wider than the answer, and never higher than 240 px. A
    hairline in the border colour keeps a light picture apart from a light
    answer, and its corners have the medium radius.
  - Its alternative text is the label, and its title is the path. A press
    opens the file tab, as `app/files/image/from-answer` shows.
  - While the read of the file runs, a box as wide as the answer and
    240 px high shows the icon of a picture and the label, in the muted
    colour on the raised fill, as `app/file-mentions/answers/loading`
    shows. A press on the box opens the file tab too.
  - The chat reads no picture while the cloud computer does not run, so
    the image shows as the link, as `app/file-mentions/answers/stopped`
    shows. A failed read shows the same link.
  - A heading and a table cell show the image as the link. A closed
    message line in the work of a turn shows it as the link too, so the
    line stays one line. The open line shows the picture, as
    `app/file-mentions/answers/work` shows.
  - Each state holds only inline parts, because it stands in a paragraph.
    So the box shows an icon and no spinner, which draws a block.
- `AnswerText` shows the pictures where `pictures` asks: in the
  paragraphs and the list items of an answer, also in a quote, and in an
  open message line. `ChatPictures` in `chatPictures.tsx` gives the chat the state of
  its reads, and the `pictures` state of the workspace screen sets it.
- The mockups open the screen of a workspace for its link, and
  `app/tools/preview` for a local address of port 3000. A link to a page
  that they do not draw opens no screen, such as the workspace of another
  org in `app/workspace-links/messages/other-org`.
