# Attachment transfers

This doc holds the requirements and the decisions in force for the way
each attached file gets into the cloud computer of its workspace. It
covers the transfer of each file, the deletion of its stored copy, the
check of a later message, and what the agent gets with a message. It
belongs to [Message attachments](message-attachments.md), which covers the
size limit, the upload, and the storage of each file.

The stored copy of a file is its copy in the R2 bucket of the app, as
[Attachments](message-attachments.md#attachments) says. The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A
large-upload decision number, such as large-upload decision 1, names a
decision of the change that lets a message carry files of up to 1 GB. The
[mockup catalogue](../mockups/catalogue.md) draws a file that is no longer
in the cloud computer at `app/attachments/missing`.

## The transfer

- When the turn of a message starts, the cloud computer of the workspace
  downloads each file of the message that it did not get before, from the
  Worker (decision 132 and large-upload decision 2). This download is the
  transfer of the file. [Later messages](#later-messages) states the use
  of a file that it already got.
- The Worker starts each download in the cloud computer, and the runner
  takes no part. Reason: a transfer then reaches every workspace at once,
  also one with an older runner.
- Each download uses a one-use token for its file, as
  [Hostnames and gates](access-and-security.md#hostnames-and-gates) says
  (large-upload decision 5).
- A copy that the Worker sends into the cloud computer was rejected.
  Reason: Cloudflare lets a request from the Durable Object of the
  workspace carry at most 100 MiB.
- A higher limit from Cloudflare, a copy in pieces of about 64 MiB that one
  command then joins, and a copy from the Worker outside its Durable
  Object were not chosen. The user chose the download.
- A download by the runner with its workspace token was rejected. Reason:
  an older runner then gets no file, and that token reaches every file of
  the workspace.
- Each file goes to its copy path, as
  [Attachments](message-attachments.md#attachments) says. The file shows
  at that path only after its whole download, with the size of the upload.
  A failed download leaves no part of the file at that path.
- Each download first writes a `.gitignore` file that holds `*` into
  `.context/attachments/`. So Git ignores each file there, also when the
  runner adds no exclude rule.
- Reason: agents and members who use the terminal find each file next to
  the code, and Changes and commits leave it out. Both agents start in the
  folder of that repository.
- A hidden file in the home folder was rejected, because agents and
  members do not find it there. A runner link to a hidden copy was
  rejected, because each file then has two names.
- A message that needs a file while the transfer of that file into the
  same cloud computer runs waits for that transfer. It starts no second
  transfer. Reason: the app deletes the stored copy after the first
  transfer, as [The stored copy](#the-stored-copy) says.
- After a restart of the Durable Object of the workspace, a second
  download of a file can start. Two downloads of one file never mix their
  bytes at its copy path.
- The agent gets a message only after each of its files is in the cloud
  computer. This holds also for a message that joins a running turn.
- While the files of a message transfer, or while the Worker checks them,
  each later message of the same turn waits. The agent then gets the
  messages of that turn in the order that the workspace accepted them.
- Stop and the turns of other sessions do not wait for a transfer or a
  check.
- Reason: a later message can correct an earlier one. A rule that holds all
  work of the workspace during a transfer was rejected, because it would
  hold Stop and the other sessions.
- The chat shows no progress of a transfer.
- A turn cannot start when a file of its message cannot reach the cloud
  computer. That turn fails and names the cause. Its Try again transfers
  again each file that the cloud computer did not get.
- A transfer or a check that fails for a message that joins a running turn
  fails that turn in the same way. The workspace also stops the agent of
  that turn, as [The agent runner](agent-runner.md#the-agent-runner) says.
- Risk: each cloud computer keeps its files for the life of its workspace,
  on a disk of about 51 GB.

## The stored copy

- The app deletes the stored copy of a file after the first transfer of
  that file into a cloud computer (large-upload decision 3).
- The app deletes it only after the first start of that cloud computer
  succeeds. Until then, a failed first start can replace the cloud
  computer, and its Try again transfers the file again. So a failed first
  start loses no file, as
  [A failed first start](create-a-workspace.md#a-failed-first-start) says.
- Reason: the user asked the app to clear each upload once the cloud
  computer has it. A stored copy for 24 more hours, and a deletion only of
  files above 25 MB, were not chosen.
- The app keeps the record of the file: its name, its media type, its
  size, and its copy path. So each sent message still shows its chips, and
  a later message can still name the file.
- [Attachments](message-attachments.md#attachments) states when the app
  deletes an unsent file, and the files of a deleted workspace.

## Later messages

- A later message or a Try again with a file that the cloud computer
  already got starts no new transfer (large-upload decision 3). Before the
  agent gets the message, the Worker checks that each such file is still
  at its copy path, with the size of its upload.
- When a file is gone or its size changed, the turn fails with the error
  code `attachment_missing`. Its cause names the file: "<name> is no
  longer in the cloud computer. Attach it again in a new message."
- When two or more files of the message are gone, the cause names each of
  them in the order of the message, such as "<name> and <name> are no
  longer in the cloud computer. Attach them again in a new message." So
  the check reads each such file of the message before it fails the turn.
- Reason: one new message then carries every missing file, and no later
  try fails for a file that the first failure did not name. A new upload
  makes a new file, which only a new message can carry.
- Try again stays on such a failed turn, as on every failed turn. It fails
  again until each file is back at its path. Reason: a member or an agent
  can put a file back at its path.
- While the stored copy exists, a message for another cloud computer of
  the workspace transfers the file again. After the deletion, such a
  message fails with `attachment_missing`.
- Risk: an edit that keeps the size of a file goes unnoticed. A later
  message then reads the edited file.
- A check of a SHA-256 digest was not chosen, because each later message
  then reads up to 1 GB again. A read-only second copy was not chosen,
  because it doubles the disk use, and an agent can still delete it.
- A read-only file was not chosen, because each edit of the file then gets
  an error. Reason: such an edit is rare, and a changed size ends with a
  clear message.

## What the agent gets

- With the message, the agent gets one read line after the text of the
  message (decision 244). The read line says: "The sender attached these
  files. Read each file, or the parts of a large file that you need,
  before you answer." (large-upload decision 4).
- Then one line for each file gives its absolute path, its name, its media
  type, and its size in bytes.
- Reason: the read instruction stands next to the files. The size tells
  the agent how large a file is before it reads it, as in Conductor. An
  agent that reads all of a very large file fills its context and wastes
  time.
- A rule in the agent instructions was rejected, because it stands once in
  each session, far from the files. Conductor's block, with only a path
  and a size, was rejected, because the agent loses the name and the media
  type. A read line in the text of the message was rejected, because that
  text holds only what the member wrote.
- No read line for a large file was rejected, because the agent can then
  miss the file. A read line with a size rule for large files was not
  chosen, because one line for every file needs no such rule.
- The first 2 KB of a large text file after its file line was not chosen,
  because the runner then reads each such file and adds tokens to the
  message.
- Codex also gets each image of at most 25,000,000 bytes as image input
  (large-upload decision 4). A larger image gets only its file line.
  Reason: the model gateway refuses a request body above 100,000,000
  bytes, and an image input goes in the body of a model request.
- The read line says that an image is in the message only for an image
  that Codex gets as image input. Reason: Codex then spends no tool step
  on an image that it already has, and it still reads each larger image.
- Image input for Claude was not chosen, because an image that the model
  service cannot decode can fail the whole turn.
- An older runner can give an older read line, or no read line and no
  size. It can also give Codex a larger image as image input, so its model
  request can fail. Each build of the org image installs the newest runner,
  as [The agent runner](agent-runner.md#the-agent-runner) says.
