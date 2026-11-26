# Chat protocol docs

This page lists the protocol docs that belong to
[Chat and events](../protocol/chat-and-events.md), and what each covers.
[Protocol docs](protocol-docs.md) lists the other protocol docs.

- [Messages and attachments](../protocol/messages-and-attachments.md)
  - [Message attachments](../protocol/message-attachments.md): the size
    limit, the upload, the storage, and the deletion of the files of a
    message, and their chips and their drop in the message field.
    - [Attachment transfers](../protocol/attachment-transfers.md): the
      transfer of each file into the cloud computer, the deletion of its
      stored copy, the check of a later message, and what the agent gets.
  - [Fast mode](../protocol/fast-mode.md): the Fast switch of the model
    menu, the models that show it, who may turn it on, and the speed of a
    turn that cannot run fast.
  - [Dropped answers](../protocol/dropped-answers.md): the continue
    message of a Claude turn after its model answer drops.
- [The scroll of the chat](../protocol/chat-scroll.md): the row that
  stays in view, the scroll after a send, and the place that each tab
  keeps.
- [The request stack](../protocol/request-stack.md): the open requests of
  a session above its composer, the order of their cards, the moves
  through the stack, and the requests for the same secrets.
- [File mentions](../protocol/file-mentions.md): the list of `@` in the
  composer, the chips of files and folders, Add to chat, the sent chips
  of attached files, and the removal of each chip of the composer.
  - [File mentions: files in answers](../protocol/file-mentions-answers.md):
    the file chips, the file links, and the pictures in the answers of
    the agents, and their line targets.
- [Skill mentions](../protocol/skill-mentions.md): the list of `/` in the
  composer, the skill chips and their text, and the skills report of the
  runner that fills the list.
  - [Skill sources](../protocol/skill-sources.md): the skills that each
    agent loads, the skills that the runner reports, and the order of the
    list.
- [Agent runner](../protocol/agent-runner.md): the connection of the runner,
  its events and their limits, its turns, what an out-of-memory kill ends,
  the background work of Claude turns with its note and its time limit,
  its port reports, its skills report, and the repair of lost workspace updates.
  - [Background work of Claude turns](../protocol/background-work.md):
    the wait of a Claude turn for background work, its note, and its time
    limit.
  - [Listening ports](../protocol/listening-ports.md): the scanner's
    eligibility, labels, limits, and full reports.
  - [Lost workspace updates](../protocol/lost-workspace-updates.md): the
    reports that belong to no session, the repair request after a refused
    update, and the notice of a failed repair.
  - [Runner warnings](../protocol/runner-warnings.md): the warnings of the
    Worker for runner connections and for turn ends with no Stop request,
    and the process-start ID of the runner.
  - [Services](../protocol/services.md): the named programs outside every
    turn, with [Service calls](../protocol/service-calls.md),
    [Services in the app](../protocol/services-in-the-app.md), and
    [Service reports](../protocol/service-reports.md).
- [Session transcripts](../protocol/session-transcripts.md): copying a
  session as concise or full Markdown, and the text of a copy.
  - [Transcript routes](../protocol/transcript-routes.md): the route of
    a copy.
  - [Transcript reads by agents](../protocol/transcript-reads.md): the
    route of `read_session`, and the parts of a long text.
- [Workspace events](../protocol/workspace-events.md): the events that
  each tab gets and their order, the stored history that each connection
  sends, the reads and the cutoffs that give a new tab the state of a
  workspace, the time and the end of each notice of a failed repair, the
  workspaces that a tab keeps, and older apps.
- [Chat history](../protocol/chat-history.md): how the stored history
  keeps agent messages, tool calls, and file reports.
