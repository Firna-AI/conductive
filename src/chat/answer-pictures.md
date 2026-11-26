# Pictures in answers

This guide belongs to [Text links](text-links.md). It gives the rules of
the code that reads and draws the pictures of answers.
[Pictures in answers](../../docs/protocol/file-mentions-answers.md#pictures-in-answers)
states the requirements. These parts read and draw the pictures:

- `answerParts` sets `picture` on the `file-link` part of an image of a
  PNG, JPEG, GIF, or WebP file, which `pictureType` of
  `src/files/page/file-view.ts` knows by the name. `picture` holds the
  image as the agent wrote it, from `imageSource` of the parser. A link, a
  folder, and each other file, such as an SVG file, keep `picture` null.
  The part does not know where it shows, so one reading serves each
  place.
- `AnswerText` takes `pictures`, an `AnswerPictures` with the ID of the
  agent message. It draws a part with `picture` as `FilePicture` only with
  `pictures`, else as `FileTextLink`. `AgentText` and `MessageLine` make
  their drawing with `answerDrawing` of `components/answer-drawing.tsx`,
  with the ID of their item in the transcript. The drawing gives
  `pictures` where the `TextPlace` of a block allows pictures. The shared
  `AgentBlocks` allows them in paragraphs and list items, also inside a
  quote. A heading and a table cell allow none, so the image keeps its
  link there.
- The shared `LineBlocks` allows pictures only while the line is open,
  from the `LineState` that `MessageLine` gives it. The blocks that open
  under the line draw through `AgentBlocks`, so they show pictures as an
  answer does. So the closed line shows the link and stays one line. The
  hidden copy of a line that starts with a table gets the state of a
  closed line, so it shows no picture.
- `FilePicture`, in `links/FilePicture.tsx`, draws the shared
  `AnswerPicture` with an opener: the link of `fileOpener`. So a plain
  press opens the file tab in each state, and a press with a modifier key
  stays with the browser. The title is the path. The alternative text and
  the label of the box are the label as plain text, without its marks,
  with a space for each line break. The link shows the label as
  `AnswerText` draws it, with its code and its marks, so it looks as the
  link of each other file.
- Without `ChatMentions.pictures`, the picture shows the link and watches
  nothing. With a reader, the box of the label shows until the read and
  the decode end. `useNearView`, in `ui/near-view.ts`, watches the box
  with an `IntersectionObserver`. The read starts when the box comes
  within 400 CSS px of the part of the chat that shows.
- `ChatPane` gives its scroll box to the observer as its root, through
  `NearViewRoot`. Reason: a scroll box clips each element at its own
  edges, so a margin around the window does not reach into the chat.
  Outside a chat, the margin applies to the window. Without
  `IntersectionObserver`, the read starts at once.
- `usePictureRead`, in `links/picture-read.ts`, reads the path with
  `ChatPictures.read`, with the ID of the agent message as `message`.
  Then `decodePicture` of `src/files/page/decode-picture.ts` gives the
  size. A failed read and bytes that the browser cannot draw show the
  link. An unmount, or a change of the reader, the path, or the message,
  aborts the read and stops the decode.
- When the shell takes the reader away, as when the sandbox stops, each
  picture shows its link. When the reader comes back, the read gives the
  result that the reader kept, and the picture shows again.
- A picture is a link, so a press on a picture in an open message line
  opens the file, and `useFold` leaves the line open.
- In the box and the picture states, `FilePicture` puts its link in a
  span with `data-mention`, beside a `ChipCopyText` with the Markdown
  image as the agent wrote it. So a copy gives that Markdown, as a copy of
  a chip gives its mention, and the copy holds no picture bytes. The link
  state has no such span, so a copy gives the label, as for each other
  link.
