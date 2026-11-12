# Message attachments

This doc holds the requirements and the decisions in force for the files
that a message carries. It covers the upload and the copy of each file,
the files in the message field and their drop, and the files of a sent
message. It belongs to
[Messages and attachments](messages-and-attachments.md), which covers the
messages of a session. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws these screens
at `app/attachments`, in New workspace, and in the flow
`user-flows/drop-a-file`.

## Attachments

- Each file of a message can contain at most 100 MB, or 100,000,000
  bytes.
- Reason: Cloudflare accepts a request body of at most 100 MB on a zone of
  the Free or Pro plan, and the browser sends each file in one request, as
  [Attachment uploads](access-and-security.md#attachment-uploads) says. A
  higher limit was rejected, because it needs uploads in parts or a zone of
  the Business or Enterprise plan.
- The composer refuses a larger file before its upload, and names the
  limit. The Worker refuses a larger file too, with HTTP 413 and the error
  code `attachment_too_large`.
- The chip of each file shows its upload while it runs, as
  [The chip in the field](#the-chip-in-the-field) says. A failed upload
  offers Try again and Remove. Send waits while a file uploads, and while a
  failed upload waits for Try again or Remove.
- Each attached file has a × that removes it, as
  [Remove a chip of the composer](file-mentions.md#remove-a-chip-of-the-composer)
  says. This × is the Remove of a failed upload.
- An upload works also before the cloud computer of its workspace exists,
  and while that cloud computer starts or is stopped (decision 132).
- The Worker stores each uploaded file in one R2 bucket of the app, outside
  the cloud computer (decision 132).
- Storage in the object of each workspace was rejected, because each file
  must then go in chunks. Uploads only into a running cloud computer were
  rejected, because a message to a new or stopped workspace could then not
  carry files at once.
- [Orgs and workspaces](isolation.md#orgs-and-workspaces) states
  which messages can use an uploaded file.
  [Attachment uploads](access-and-security.md#attachment-uploads) states
  how the browser sends a file (decision 144).
- When the turn of a message starts, the Worker copies each file of the
  message into the cloud computer of the workspace (decision 132).
- Each file goes to `.context/attachments/<digest>/<safe name>` in the
  folder of the workspace's own repository (decisions 242 and 262 D). The
  digest is 32 lowercase hexadecimal characters from the ID of the file
  only. So a file has one copy path for its life.
  [The context folder](repository-folders.md#the-context-folder) states the
  folder.
- The safe name keeps the ASCII letters, digits, dots, underscores, and
  hyphens of the original name. One hyphen replaces each run of other
  characters. It keeps at most 100 characters, with its extension in
  lowercase. An empty stem becomes `file`.
- The reply of each upload gives the copy path of its file in `path`. Each
  file of a sent message gives it too.
- Reason: the text of a message names each file by this path, as
  [The send](#the-send) says. So Try again sends the same text, and no
  part of the app builds or rewrites a path. A digest of the IDs of the
  message and the file was rejected, because each new message, such as a
  Try again, then needs new paths in its text.
- Each message copies its files before the agent gets it, also when an
  earlier message copied the same file. So a later message with the same
  file, such as a Try again, writes the same bytes to the same path again.
- Reason: the agent then reads the bytes of the upload. A copy only when
  the path holds no file was rejected, because a later message could then
  read a copy that an agent changed or deleted.
- Risk: two messages with the same file can copy it to one path at the
  same time, while an agent reads it. An example is a send whose reply was
  lost, then an edit and a new send.
- Before the first file of each copy, the Worker writes a `.gitignore` file
  that holds `*` into `.context/attachments/`. So Git ignores each copied
  file, also when the runner adds no exclude rule.
- Reason: agents and members who use the terminal find each file next to
  the code, and Changes and commits leave it out. The Worker copy reaches
  every workspace at once, also one with an older runner. Both agents
  start in the folder of that repository.
- A hidden file in the home folder was rejected, because agents and
  members do not find it there. A runner link to a hidden copy was
  rejected, because each file then has two names. A download by the runner
  was rejected, because only the Worker reads the bucket.
- The agent gets a message only after each of its files is in the cloud
  computer. This holds also for a message that joins a running turn.
- While the files of a message copy, each later message of the same turn
  waits. The agent then gets the messages of that turn in the order that
  the workspace accepted them.
- Stop and the turns of other sessions do not wait for a copy.
- Reason: a later message can correct an earlier one. A rule that holds all
  work of the workspace during a copy was rejected, because it would hold
  Stop and the other sessions.
- With the message, the agent gets one line that tells it to read each
  file before it answers (decision 244). This line comes once, after the
  text of the message. Then one line for each file gives its absolute
  path, its name, its media type, and its size in bytes. The copy holds
  the exact bytes of the upload.
- Codex also gets each image as image input. For a message with an image,
  its read line also says that each image is in the message. Reason: Codex
  then spends no tool step on an image that it already has.
- Reason: the read instruction stands next to the files. The size tells
  the agent how large a file is before it reads it, as in Conductor.
- A rule in the agent instructions was rejected, because it stands once in
  each session, far from the files. Conductor's block, with only a path
  and a size, was rejected, because the agent loses the name and the media
  type. A read line in the text of the message was rejected, because that
  text holds only what the member wrote.
- Image input for Claude was not chosen, because an image that the model
  service cannot decode can fail the whole turn.
- An older runner gives the agent no read line and no size. Each build of
  the org image installs the newest runner, as
  [The agent runner](agent-runner.md#the-agent-runner) says.
- A turn cannot start when a file of its message cannot reach the cloud
  computer. That turn fails and names the cause. Try again copies the
  files again.
- A copy that fails for a message that joins a running turn fails that
  turn in the same way. The workspace also stops the agent of that turn, as
  [The agent runner](agent-runner.md#the-agent-runner) says.
- The app deletes the files of a workspace with the workspace, also in the
  purge of a deleted org (decision 132).
- A failed first start deletes no file of the first message. The files stay
  with the accepted message in the failed workspace, as
  [Create a workspace](create-a-workspace.md#a-failed-first-start)
  says. Try again uses them in the same workspace.
- The app deletes an unsent file 7 days after its upload (decision 132). A
  file is unsent while no accepted message uses it.
- When a send names a draft file that the app deleted, the composer shows
  that file as a failed upload. Its Try again uploads the file again from
  the device.

## Files in the message field

- These rules hold in each composer of a chat: the chat of a workspace,
  the New workspace page, and the New workspace dialog. The Feedback dialog
  keeps its own screenshots, as [Screenshots](feedback.md#screenshots)
  says.
- Each attached file is a chip at its place in the text of the message
  field (decision 263 A). No row of files shows above the text.
- A file from the file picker goes to the caret, or to the end of the text
  when the field has no caret.
- Reason: a pick and a drop then work the same way, and the text says where
  each file belongs. A row for picked files, or for the files that upload
  or failed, was rejected, because a file then shows in two places. A pick
  that always goes to the end was rejected, because a pick and a drop then
  work in different ways.

### Drops

- Each of these composers takes a drop of files on its whole message box:
  the text, the bar, and the padding. In the New workspace dialog, the
  message box is the whole dialog card.
- A drop on the text puts the files at the place under the pointer. A drop
  on the rest of the box puts them at the caret, or at the end of the text
  when the field has no caret. Reason: the user asked for the files at the
  cursor, which can mean the pointer or the caret.
- During a drag of files over the text, the field draws a drop caret at
  the place under the pointer. The caret and the selection of the field
  move only at the drop. Reason: a cancelled drag then leaves the selection
  as it was.
- While files are over the box, its full border shows the drop state. The
  box adds no hint text, so the draft keeps its room.
- While the composer takes no change, such as during a create, its box
  takes no drop. The pointer then shows that a drop does nothing.
- A drop of files outside each message box does nothing. Reason: the
  browser would open the file in place of the app, and each draft lives
  only in the memory of its tab. The Feedback dialog still takes a drop
  and a paste of screenshots.
- A dropped folder gets no chip. A notice of the composer names each
  dropped folder, and says to attach the files in it. Its Attach files
  opens the file picker. The other files of the drop still attach.
- Reason: an upload of a folder fails, and a failed chip that Try again
  cannot fix tells the member nothing.
- A dropped file over the size limit gets no chip. The composer refuses it
  as it refuses a picked file, as [Attachments](#attachments) says.
- A paste of a file or an image, such as a screenshot from the clipboard,
  attaches no file. The field takes only the plain text of a paste.

### The chip in the field

- Each chip of an attached file is one unit of the text, as a file chip is.
  Backspace and Delete remove it whole, and the arrow keys step over it.
- The chip has the size of a file chip. Its icon cell shows the kind of the
  file, the progress of its upload, or a failed mark. The name of the file
  and a muted label follow. The title of the chip is the name of the file.
- While the upload runs, the label shows the share of the file that the
  browser sent, such as "64%". Before the first measurement, it shows
  "Uploading". A ready chip shows the size of the file.
- A failed chip shows "Failed". On a computer, the chip also offers Try
  again, and that Try again takes the keyboard focus.
- A screen reader hears "Attached file" before the name. Reason: the member
  can then tell an attached file from a file chip of the workspace.
- A press on the name of a chip in the field opens nothing. Reason: the
  cloud computer gets the file only when the turn of its message starts.
- A space follows each new chip, as after a pick of the list of `@`
  (decision 213). After the files of a drop or a pick, the caret stands
  after the last new chip, and the field has the focus.
- The files of one drop or pick go in their order, as one step of undo.
- A chip that leaves the text takes its file off the draft, and it stops
  the upload of that file. Reason: the draft never sends a file that its
  text does not show.
- Undo brings back the chip and its file. A ready file comes back ready,
  and a stopped upload starts again.
- The draft keeps each file whose chip left the text until a send, a
  sign-out, or a new draft. Until then, undo or a paste of its mention can
  bring back its chip.
- A copy or a cut of a ready chip gives its mention, as for a file chip. A
  copy or a cut of a chip that uploads or failed gives the name of its
  file. Reason: only a ready file has its copy path.
- A paste of the mention of a file of the draft gives back its chip. In
  another composer, that mention stays text.
- A cut and a paste, or a drag, in the same field keeps each chip with its
  file, as [The message field](workspace-links.md#the-message-field) says.
- The field shows a chip only for a file of its draft. Typing never makes
  such a chip.

### The send

- At Send, the text of the message holds `@` and the copy path of each file
  at the place of its chip, such as `@.context/attachments/<digest>/a.png`
  (decision 262 D). The message lists its files in the order of their
  chips.
- Reason: each reader of the text then finds each file at its place, also
  after Try again. The name of each file in its place was rejected, because
  two files with one name are then ambiguous to the agent. A numbered
  token, such as `[File 1]`, was rejected, because typed text can then
  become a chip.
- A token of the file that the Worker turns into the path at the send was
  rejected, because each send then needs a new check of its tokens. A
  stored token that the Worker turns into the path for the runner was
  rejected, because the agent then reads other text than the stored
  message (decision 216).
- In a chat, Send clears the text with its chips at once, as
  [Messages](messages-and-attachments.md#messages) says. A failed send
  gives back the text with its chips, so Send again sends the same text.
- In New workspace, a create that succeeds clears the text, unless the
  member changed the text during the create. A failed create keeps the
  text with its chips, so Send again sends the same text.
- When a file leaves the draft without its chip, its chip leaves the text
  too. Examples are a create whose text the member changed during the
  create, a model change that keeps fewer files, and a sign-out. Reason:
  the text never shows a chip without its file.
- A draft that a model change moves to a new session keeps each chip at its
  place.
- The first message of a new workspace needs text beside the chips of its
  files. A message in a chat can hold only files.

## Files of a sent message

- A sent message shows the chip of each file whose mention its text holds,
  as [Chips of attached files](file-mentions.md#chips-of-attached-files)
  says (decision 262 D).
- Each file of the message without a chip in its text shows under the
  message, with its name and its size.
- Try again sends the same text and the same files under a new message ID.
  Each mention still names the copy of its file, because the copy path
  comes from the file only.
- [Messages](messages-and-attachments.md#messages) and
  [Sessions](agents-and-sessions.md#sessions) state how a title names each
  file. [The text](session-transcripts.md#the-text) states how a transcript
  copy names it.
