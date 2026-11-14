# Chat key code

This guide belongs to [the chat](README.md). It names the files, the
types, and the functions of the chat that a reader opens first. Each path
is relative to `src/chat/`, the folder of this guide.

- `WorkspaceChat.tsx`: `WorkspaceChat`, which owns its controller, and
  `WorkspaceChatView`, which draws a kept one, with their callbacks.
- `useChatController.ts`: the controller of one workspace and its snapshot,
  through `useWorkspaceStore`.
- `state/controller.ts`: `ChatController`, the public boundary of the chat
  state and its actions, with `show` and `hide` for a kept chat.
- `state/controller-context.ts`: the context of one controller run. It
  holds the local IDs of drafts and files, the upload generations, the
  devices, and the event stream. Each draft ID holds the run.
- `state/tab-order.ts`: the pure row order, the places of the open
  sessions, and the move before or after a neighbour, which keeps a
  temporary tab whose place it changes.
- `components/SessionTabs.tsx`: the tab row, with the session tabs of
  `components/SessionTab.tsx` and the tabs of `renderTab`.
  `components/tab-row.ts`: `RenderTab`, `TabDraw`, and `rowOf`, the tabs of
  the row in the saved order with their titles. `components/tab-keys.ts`:
  `useTabKeys`, the keys of the row, and the copy keys of the shown
  session.
- `components/useTabDrag.ts`: the drag of the tab row: the drop place, the
  move, and the status. `components/TabDragParts.tsx`: the drop line and
  the lifted tab.
- `components/useTabMenu.ts` and `components/TabMenu.tsx`: the tab menu,
  its items with the mark of each item that changes the workspace, the
  items of a read-only row, the long press that opens that row's menu, and
  its drawing at a point or in a sheet.
  `components/useTabMoves.ts`: the moves of the row and Keep open, the
  focus after a move or a keep from the menu, and the words of the status.
- `components/TranscriptCopy.tsx`: `useTranscriptCopy`, the copy of a
  transcript from the tab menu with the toast of its result, and
  `ChatToasts`, the toasts of the host, else the chat's own.
  `components/session-link-copy.ts`: `useSessionLinkCopy`, Copy link of
  the tab menu, which copies the link of a session with the origin of the
  link of the workspace, and the toast of its result.
- `components/row-scroll.ts`: the scroll of a full row, its fades, and the
  scroll of a drag near an end. `components/row-reveal.ts`: the place of a
  tab in the row, and the scroll that brings tabs into view.
  `components/tab-nodes.ts`: the elements of the tabs, which the drag, the
  scroll, and the menu share.
- `components/SessionChat.tsx`: the chat of the open session, and
  `ChatHost`, the start steps and the sandbox bar that the app can draw.
- `components/Composer.tsx`: the message box and its controls, with the
  steering prompt that [Messages](../../docs/protocol/messages-and-attachments.md#messages)
  states. It gives its field the `files` of the draft, and it holds the
  handle of the field. So a pick puts the chips of its files at the caret.
  Its whole box takes a drop of files. `components/SessionChat.tsx` gives
  the zips and the refused folders of a drop to `controller.attachFiles`,
  and keeps one
  source for each `Draft.id`, in `useDraftFiles`.
- `components/composer-drop.ts`: `useComposerDrop`, the drop of files on a
  message box, which the chat and both New workspace composers share.
  [The message field](message-field.md) gives its rules.
- `components/chip-field/`: `ChipTextField`, the message field of every
  composer, with its handle and the chips of attached files.
  [The message field](message-field.md) gives its rules and the files of
  its folder.
- `state/load.ts`: the order of the first reads and the stream start.
- `state/address-session.ts`: `showAddressSession`, the open of the
  session of a session address, behind `ChatController.showAddress`. A
  missing session gets one read of the list, of which only that record
  counts, and a later choice of a tab or an abort stops the lookup.
- `links/`: `workspace-links.ts`, the link syntax, the reader of the
  links of a message field, and `linkTarget`, with the session of a
  session link. Its `sessionTarget` gives the same target for a session
  that the chat names by its IDs. `chat-parts.ts` is the one tokenizer of
  sent messages and answers. In it, each mention of a file of the message is an
  `AttachmentPart`, also when the tree holds that path, and also without a
  tree. Its `filesWithoutChip` gives the files of a message that no part
  shows as a chip. `LinksContext.tsx` gives the workspaces that chips find
  the open of a chip, and the origin of the chat's workspace link.
  `LinkedText.tsx` holds `useChatParts` and
  `ChatText`. `useChatParts` reads the parts of a text with the workspaces
  and the tree of the chat, and the files of a sent message. `ChatText`
  draws the parts with their workspace, session, and file chips, and each
  `AttachmentPart` as the mockups' `SentFileChip`.
  `SessionLinkText` draws a session that the chat names by its IDs, such
  as the session whose agent stopped a turn, with the same session chip.
  [Chips of attached files](../../docs/protocol/file-mentions.md#chips-of-attached-files)
  states the rules of that chip. The chip opens the file tab of its copy
  through `openFile` and `href` of `ChatMentions`. It opens nothing when
  `ChatText` gets no `opens`, or in a chat without `ChatMentions`.
  `AnswerText` reads and draws the text of an answer in one step.
  `mention-copy.ts` makes
  the browser's own copy of chat text give the text of each chip that has
  a `data-mention` mark: each file chip and each `SentFileChip`. Each such
  chip holds its copy text in a `ChipCopyText`, which shows only while the
  root of the page has `COPYING_CLASS`. The style sheet of `ChipCopyText`
  gives that class, so the class name has one source. The copy sets the class, moves an
  edge of the selection inside a chip to the edge of the chip, and the
  next animation frame removes the class before the page paints.
  `chipOf` in `LinksContext.tsx` gives what a chip shows of its workspace.
- `links/session-links.ts`: `useLinkedSession`, the session that a chip
  finds: a live session of the chat's workspace, or one of the one read of
  another workspace in `session-reads.ts`, made again for each load of a
  chat or of New workspace. `chat-links.ts` gives a chat its links, with
  the origin of the link of its workspace.
- `mentions/`: `mention-rows.ts` gives the entries that the list offers and
  their order. `MentionsContext.tsx` gives the files that the chat gets and
  the tree that the list and the chips find, with one value for each tree.
  `MentionIcon.tsx` gives the icon of All files for an entry.
  [`mention-text.ts`](../shared/mention-text.ts) in the shared contracts
  owns the text of a mention, which the chat shares with the Worker.
- `state/workspace-list.ts`: `WorkspaceList`, the list that the chips
  read, and `ownWorkspaceList`, the reads of a chat without sources.
- `state/sources.ts`: `ChatSources`, the app values that a kept chat
  follows in place of its own reads.
- [Transcript key code](transcript.md#key-code): the shared transcript
  modules, the turn words with the end reason of a turn, the work folds,
  and the workspace stream.
- [`agents.ts`](../shared/agents.ts): the shared effort words and model
  labels of the pickers.
- `state/history.ts`: the shared history load of each session, and the
  watch that loads the history of each shown session.
- `state/drafts.ts`: the draft identity, its moves, and its work in flight.
  `holderOf` finds the session that holds a draft now. `afterSend`,
  `keepFiles`, and `endDraftFiles` take files off a draft with their
  marks, as [Attached files of a draft](draft-files.md) says.
- `state/message-actions.ts`: `setDraftText`, which makes the files of a
  draft follow the marks of each new text, and `sendDraft`, the send of a
  draft. It also holds Try again of a failed turn, Stop, and Resume.
- `state/message-send.ts`: `postMessage`, the post of one message and the
  route of its reply, which a draft and a fixed prompt share.
- `state/prompt-actions.ts`: `sendPrompt`, a fixed prompt to the session of
  the chat, which changes no draft, as
  [Fixed prompts](loads-and-sends.md#fixed-prompts) says.
- `state/attachment-actions.ts`: attach and Try again for the files of a
  draft. `attachFiles` gives the IDs of a pick at once, and queues its
  uploads. It puts the names that it refuses in the draft, as
  [Refused files and folders](draft-files.md#refused-files-and-folders)
  says. `resumeFiles` starts again the uploads that a new text brings
  back, such as after undo, and `retryFile` is Try again. Each upload goes
  through the app's `uploadAttachment`, and it ends on its draft after a
  move. It stops when its chip leaves the text, and when the chat stops.
- `state/draft-file-source.ts`: `draftFileSource`, the `FieldFiles` of one
  draft identity, behind `ChatController.draftFiles`. It reads the session
  that holds the draft at each call, and gives its attached and detached
  files. Its `retry` runs Try again, except in a read-only workspace.
- `components/AttachmentChips.tsx`: `SentFiles`, `OversizeNotice`, and
  `FolderNotice`. `SentFiles` lists under a sent message the files without
  a chip in its text. `OversizeNotice` is the notice of the files of a pick
  or a drop over the size limit, also a zip of a folder. `FolderNotice` is
  the notice of the one unreadable folder that `noticedFolder` gives. Both use the words of the mockups'
  `attachmentCopy.ts`. A file of a draft is a chip in the message field,
  which `components/chip-field/attached-file-chip.tsx` draws.
- `state/archive-view.ts`: the tabs and the session history of a
  read-only workspace, which change in the browser only.
- `state/model-moves.ts`: the draft move of a model change, in the snapshot
  that first shows the new session. Its target becomes selected only while
  the source stays selected. A newer session, file, or diff tab stays selected.
- `state/session-records.ts`: the order of session records by event number,
  and the pending edits of a session. It publishes accepted records from
  replies, complete current lists, and event merges. `confirmSessions`
  establishes the current records before the shown session starts its history.
- `state/workspace-records.ts`: the order of the workspace record and its
  start steps and saved error by event number.
- `state/session-login.ts`: whose login a message uses, from the session
  record and the reader, the login label in the composer, and the models
  that the picker of the composer offers.
- `state/linked-replies.ts`: the message and the focus of a reply that names
  a linked session.
- `components/SourceLine.tsx`: the line that links a linked session to its
  source.
- `components/TranscriptItem.tsx` and `components/LostEventLine.tsx`: each
  part of the chat, with the left-out counts and the plain words of a lost
  event from the mockups' `lostCopy.ts`. The line of a stopped turn uses
  the mockups' `StopLine`: the words of a member's Stop or of a stop
  without one, or "Stopped from" and the chip of the stopping session,
  then the notes of the turn. `components/TurnEnd.tsx` draws the
  end of a finished turn: the line of its end reason, from the mockups'
  `EndReasonLine.tsx`, above its duration and its files, and the note of a
  fast turn at standard speed, from the mockups' `StandardSpeedNote.tsx`,
  beside its duration. The mockups' `TurnFileList.tsx` limits the files
  that show before its Show more button, with the app's chips. `UserBubble`
  reads
  the parts of a sent message once, with `useChatParts`. It draws them with
  `ChatText`, and it lists under the message only the files that no part
  shows as a chip. It sets `opens` only when the message state is `sent`.
- `components/WorkFold.tsx` and `components/MessageLine.tsx`: the work fold
  of an ended turn with its steps, and the message line that grows to the
  full text. A message line with a table opens the table under the line.
- `components/agent-text.ts`: `textBlocks`, the paragraphs, headings,
  lists, code blocks, and tables of an agent message, with `TextTable`.
  `components/agent-paragraph.ts`: `Paragraph`, the lines of a paragraph,
  with the text that an underline turns into a heading.
  `components/AgentText.tsx`: `AgentText`, which draws them, with the
  heading style that the file preview shares, and `AgentBlocks`, which the
  message line shares. Their text draws through `AnswerText` of `links/`.
- `components/ToolGroup.tsx`: a run of tool calls, with `FoldLine` and
  `CallLine`, which the work fold shares.
- `components/reading-place.ts`: the keeper of the reader's place, which
  `ChatPane` gives through `ChatKeeper`. While the reader is scrolled up, it
  keeps the top row in view in place for every change of size of the
  transcript. When that row folds away, the fold that took it keeps its
  place. A new message that the user sends from the chat, which shows as a
  pending message of the session, takes the chat to its bottom. At each
  note it writes the place of the shown session, and a new keeper shows the
  place that the session kept.
- `components/chat-place.ts`: the place of a session tab, at the bottom or
  at a row by its `data-row` key, which `TranscriptView` gives each row.
  `ChatController.places` keeps the place of each session tab.
- `components/useFold.ts`: `useFold` opens and closes a fold on a click on
  its line, and gives the line to the keeper, also at the bottom of the
  chat, so the line keeps its place.
- `components/SessionStatus.tsx`: the empty views and the history status of
  a session.
- `transcript-copy.ts`: `copyTranscript`, the pending copy for a workspace,
  session, and detail. It retains resolved text for one minute after a
  clipboard failure. The next press consumes it at once. The cache uses the
  stable services object, its clock, and its delay. It stores nothing on disk.
  `browserCopy` is the clipboard, clock, and delay of the browser, for a
  chat whose host gives no `copy`. The controller's `copyTranscript` calls
  it with the chat API of the controller.
- `api/client.ts` and `api/read-*.ts`: the chat routes, through the shared
  route builders and the app's `ApiClient`, and the readers of their
  responses. `api/read-chat.ts` copies a known `endReason` of a turn end,
  and drops an unknown value. It keeps a speed that `readTurnSpeed` reads,
  and drops any other value. `api/read-changed-file.ts` reads the changed
  files of a turn end, with their real paths and display labels.
- `components/`: the tabs, the chat, the composer, the model picker, and the
  overlays. `ui/`: interactive buttons, menus, sheets, and dialogs.
- `components/send-key.ts`: `useSendKey`, the send key that the composer
  shares with the page and the dialog of New workspace in the app shell.
- `device/`: the Mac commands. Their [README](device/README.md) names
  their key code.
- `dev/`: the development page, its fake writes, its scripted agent, its
  Mac, the `loss` scenario in `dev/dev-loss.ts`, and the `starter` option
  in `dev/dev-logins.ts`. `dev/dev-answers.ts` holds the plans and the
  answers of the scripted agent, which the `answer` option chooses. `dev/dev-routes.ts`
  keeps the bytes of each upload. While the sandbox runs, it copies the
  files of each message that it accepts. `dev/dev-sandbox.ts` copies the
  files of each queued message when the sandbox becomes ready, before the
  agent gets the message. Both use the private store of
  `../app/dev/attachment-files.ts`.
