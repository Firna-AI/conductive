# Message attachments

This doc holds the requirements and the decisions in force for the files
that a message carries. It belongs to
[Messages and attachments](messages-and-attachments.md), which covers the
messages of a session. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Attachments

- Each file of a message can contain at most 25 MB, or 25,000,000 bytes
  (decision 132).
- The composer refuses a larger file before its upload, and names the
  limit. The Worker refuses a larger file too, with HTTP 413 and the error
  code `attachment_too_large`.
- The composer shows each upload while it runs. A failed upload offers Try
  again and Remove. Send waits while a file uploads, and while a failed
  upload waits for Try again or Remove.
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
  folder of the workspace's own repository (decision 242). The digest is
  32 lowercase hexadecimal characters from the IDs of the message and the
  file. [The context folder](repository-folders.md#the-context-folder)
  states the folder.
- The safe name keeps the ASCII letters, digits, dots, underscores, and
  hyphens of the original name. One hyphen replaces each run of other
  characters. It keeps at most 100 characters, with its extension in
  lowercase. An empty stem becomes `file`.
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
  text holds only the words of the member.
- Image input for Claude was not chosen, because an image that the model
  service cannot decode can fail the whole turn.
- An older runner gives the agent no read line and no size. Each build and
  each refresh of the org image installs the newest runner, and a
  workspace start updates an older runner, as
  [The agent runner](agent-runner.md#the-agent-runner) says.
- A turn cannot start when a file of its message cannot reach the cloud
  computer. That turn fails and names the cause. Try again copies the
  files again.
- A copy that fails for a message that joins a running turn fails that
  turn in the same way. The workspace also stops the agent of that turn, as
  [The agent runner](agent-runner.md#the-agent-runner) says.
- The chat shows the name and the size of each file of a sent message.
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
