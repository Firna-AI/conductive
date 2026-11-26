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
  `state/chat-runs.ts`: `ChatRuns`, which the controller extends: the
  store of the snapshot, the context of each run, and `start`, `stop`,
  `show`, and `hide`.
- `state/controller-context.ts`: the context of one controller run. It
  holds the local IDs of drafts and files, the upload generations, the
  devices, and the event stream. Each draft ID holds the run.
- `state/tab-order.ts`: the pure row order, the places of the open
  sessions, and the move before or after a neighbour, which keeps a
  temporary tab whose place it changes.
- `state/saved-view.ts`: `withView` and `viewWriter`. The initial read of
  the saved view and its reread after a Restore set the view of the
  snapshot directly. Each local change of the view uses `withView`, and
  each save uses `ChatContext.saveView`, which `viewWriter` makes. The
  writer sends the current view, one request at a time. A failed initial
  read leaves the view null. While it is null, `withView` changes nothing
  and the writer sends nothing.
- `components/SessionTabs.tsx`: the tab row, with the session tabs of
  `components/SessionTab.tsx` and the tabs of `renderTab`.
  `components/tab-row.ts`: `RenderTab`, `TabDraw`, `rowOf`, the tabs of the
  row in the saved order with their titles and marks, and `sessionMarks`.
  `components/tab-keys.ts`: `useTabKeys`, the keys of the row, and the copy
  keys of the shown session.
- `components/useTabDrag.ts`: the drag of the tab row: the drop place, the
  move, and the status. `components/TabDragParts.tsx`: the drop line and
  the lifted tab.
- `components/useTabMenu.ts`: the tab menu, and the long press that opens
  the menu of a read-only row. `ui/PointMenu.tsx` draws it at a point or in
  a sheet, as it draws the menu of overlapping marks. `components/tab-menu-items.ts`: the groups of
  its items, with Copy path of the host, the mark of each item that
  changes the workspace, and the items of a read-only row.
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
- `components/SessionChat.tsx`: the chat of the open session.
  `components/session-parts.tsx`: `ChatHost`, the start steps, the sandbox
  bar, the tools of the composer, and the GitHub branch that the app can
  give. It also provides
  `useSessionParts`, the lines, the cards, and the requests that wait of
  one session, which its tab and the popover of an explanation share.
  `components/transcript-inputs.ts`: `useTranscriptInputs`, the Mac
  commands and the secret requests of that session, and the inserts, the
  readers, and Try again that its transcript gets. Each keeps its value
  while its data stays the same.
- `components/Composer.tsx`: the message box and its controls, with the
  steering prompt that [Messages](../../docs/protocol/messages-and-attachments.md#messages)
  states. It gives its field the `files` of the draft, and it holds the
  handle of the field. So a pick puts the chips of its files at the caret.
  Its whole box takes a drop of files. `components/SessionChat.tsx` gives
  the zips and the refused folders of a drop to `controller.attachFiles`,
  and keeps one
  source for each `Draft.id`, in `useDraftFiles`.
- `components/ComposerTools.tsx`: `ComposerTool`, a tool of the host, such
  as Capabilities, and `ToolButton`, its icon with its label as a native
  tooltip, whose control opens above the icon on a computer. A second
  press, a press outside, Escape, and the key of the command palette close
  it.
- `components/ComposerMenu.tsx`: `ComposerStart`, the start of the bar of
  every composer. A computer shows the attach button and the icon of each
  tool. A phone shows one + button, "More options", whose menu holds
  Attach files and a row for each tool. A tool then opens its control as a
  sheet, and the focus goes back to the + button when the sheet closes
  (secrets decision 16 G).
- `components/ComposerButtons.tsx`: `StopButton`, Stop with its word and
  its key on a computer, and only its icon on a phone, where its spoken
  name stays "Stop" (secrets decision 16 G).
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
- [Text key code](text-key-code.md): the links, the chips, the mentions,
  the pictures, and the Markdown of chat text, in `links/`, `mentions/`,
  and `markdown/`.
- `state/workspace-list.ts`: `WorkspaceList`, the list that the chips
  read, and `ownWorkspaceList`, the reads of a chat without sources.
- `state/sources.ts`: `ChatSources`, the app values that a kept chat
  follows in place of its own reads.
- [Transcript key code](transcript.md#key-code): the shared transcript
  modules, the turn words with the end reason of a turn, the work folds,
  and the workspace stream. It also names `TranscriptView` and its rows.
- [`agents.ts`](../shared/agents.ts): the shared effort words and model
  labels of the pickers.
- `state/history.ts`: the shared history load of each session, and the
  watch that loads the history of each shown session.
- `state/drafts.ts`: the draft identity, its moves, and its work in flight.
  `holderOf` finds the session that holds a draft now. `afterSend`,
  `keepFiles`, and `endDraftFiles` take files off a draft with their
  marks, as [Attached files of a draft](draft-files.md) says.
  `withEndedDraftFiles` does it for each draft when `ChatController.stop`
  runs.
- `state/message-actions.ts`: `setDraftText`, which makes the files of a
  draft follow the marks of each new text, and `sendDraft`, the send of a
  draft. It also holds Try again of a failed turn, Stop, and Resume.
- `state/message-send.ts`: `postMessage`, the post of one message and the
  route of its reply, which a draft and a fixed prompt share.
- `state/prompt-actions.ts`: `sendPrompt`, a fixed prompt to the session of
  the chat, which changes no draft, as
  [Fixed prompts](loads-and-sends.md#fixed-prompts) says.
- `state/mention-actions.ts`: `addToChat`, which shows the session of the
  chat, or starts a new one, and asks its message field for the chip of a
  file or a folder, and `takeMention`, which ends the request, as
  [Add to chat](loads-and-sends.md#add-to-chat) says.
  `components/composer-requests.ts`: the requests that parts outside the
  composer make of its field, `useRequestedFocus` and
  `useRequestedMention`, with `ComposerFocus`.
- `state/attachment-actions.ts`: attach and Try again for the files of a
  draft. `attachFiles` gives the IDs of a pick at once, and queues its
  uploads. It puts the names that it refuses in the draft, as
  [Refused files and folders](draft-files.md#refused-files-and-folders)
  says. `resumeFiles` starts again the uploads that a new text brings
  back, such as after undo, and `retryFile` is Try again. Each upload goes
  through the app's `uploadAttachment`, and it ends on its draft after a
  move. A new try resumes the kept upload of the file. It stops when its
  chip leaves the text, and when the chat stops.
- `state/draft-file-source.ts`: `draftFileSource`, the `FieldFiles` of one
  draft identity, behind `ChatController.draftFiles`. It reads the session
  that holds the draft at each call, and gives its attached and detached
  files. Its `retry` runs Try again, except in a read-only workspace.
- `components/AttachmentChips.tsx`: `SentFiles`, `OversizeNotice`, and
  `FolderNotice`. `SentFiles` lists under a sent message the files without
  a chip in its text. `OversizeNotice` is the notice of the files of a pick
  or a drop over the size limit, also a zip of a folder. `FolderNotice` is
  the notice of the one unreadable folder that `noticedFolder` gives. Both use the words of the shared
  `attachmentCopy.ts`. A file of a draft is a chip in the message field,
  which `components/chip-field/attached-file-chip.tsx` draws.
- `state/archive-view.ts`: the tabs and the session history of a
  read-only workspace, which change in the browser only.
- `state/model-moves.ts`: the draft move of a model change, in the snapshot
  that first shows the new session. Its target becomes selected only while
  the source stays selected, as `showsSession` of `state/sessions.ts`
  checks. A newer session tab stays selected. A selected tab of any other
  kind, such as a file, diff, or Preview tab, also stays selected. A failed
  close in `state/close-actions.ts` selects the restored tab again only
  through the same check.
- `state/session-records.ts`: the order of session records by event number,
  and the pending edits of a session. It publishes accepted records from
  replies, complete current lists, and event merges. `confirmSessions`
  establishes the current records before the shown session starts its history.
  `replaySessionRecords` starts one replay of stored pages, for a history
  load or for the stored history of the stream.
- `state/session-replay.ts`: `SessionReplay`, the merges and the end of one
  replay. The end places the tabs, as
  [Record order](loads-and-sends.md#record-order) says. It also keeps, for
  each session, the record that places its tab, apart from its newest
  record. A pending close applies over that record, and a failed close goes
  back to it.
- `state/workspace-records.ts`: the order of the workspace record and its
  start steps and saved error by event number.
- `state/session-login.ts`: whose login a message uses, from the session
  record, the reader, and the default logins of the account: the login of
  the session, a member's or the org's, or the login of a new linked
  session. It also gives the login label in the composer, and the models
  that the picker of the composer offers. `state/blockers.ts` gives the
  Connect notice when no login serves the message.
- `state/linked-replies.ts`: the message of a reply that names a linked
  session, and the view that sent, which follows that session with the
  draft: the shown tab, or the popover of an explanation. The shown tab
  selects the linked session only through the same check as a model move,
  also when no draft moves.
- `components/SourceLine.tsx`: the line that links a linked session to its
  source.
- `components/TranscriptItem.tsx` and `components/LostEventLine.tsx`: each
  part of the chat, with the left-out counts and the plain words of a lost
  event from the shared `lostCopy.ts`. The line of a stopped turn uses
  the shared `StopLine`: the words of a member's Stop or of a stop
  without one, or "Stopped from" and the chip of the stopping session,
  then the notes of the turn. `components/TurnEnd.tsx` draws the
  end of a finished turn: the line of its end reason, from the shared
  `EndReasonLine.tsx`, above its duration and its files, and the note of a
  fast turn at standard speed, from the shared `StandardSpeedNote.tsx`,
  beside its duration. The shared `TurnFileList.tsx` limits the files
  that show before its Show more button, with the app's chips. `UserBubble`
  reads
  the parts of a sent message once, with `useChatParts`. It draws them with
  `ChatText`, and it lists under the message only the files that no part
  shows as a chip. It sets `opens` only when the message state is `sent`.
- `components/WorkFold.tsx` and `components/MessageLine.tsx`: the work fold
  of an ended turn with its steps, and the message line that grows to the
  full text. A message line with a table opens the table under the line.
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
- `components/scrolled-up.ts`: `useScrolledUp` says whether the reader
  reads at least `scrolledUpFrom` above the bottom. While they do,
  `ChatPane` shows the shared `ToBottomButton` above the footer, and a
  press calls `bottom` of the keeper.
- `components/chat-place.ts`: the place of a session tab, at the bottom or
  at a row by its `data-row` key, which `components/transcript-rows.tsx`
  gives each row.
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
- `ui/clock.ts`: `Clock`, `useNow`, and `ChatClock`, the clock that
  `ChatBody` gives from its `clock`. Each part that shows a live time, such
  as the row of a running turn and the start steps, reads `ChatClock` and
  keeps its own tick while it shows, in a tab and in a popover alike. The
  sandbox bar of an archived workspace reads it with no tick, for the day
  when the workspace leaves the list. `ChatBody` ticks only for the session
  history.
- `api/client.ts` and `api/read-*.ts`: the chat routes, through the shared
  route builders and the app's `ApiClient`, and the readers of their
  responses. `api/read-chat.ts` copies a known `endReason` of a turn end,
  and drops an unknown value. It keeps a speed that `readTurnSpeed` reads,
  and drops any other value. `api/read-changed-file.ts` reads the changed
  files of a turn end, with their real paths and display labels.
  `api/read-continued.ts` reads the note of Continue and the note of a
  repository change with their real branches and their optional labels,
  with the same `label` reader.
  `api/read-capability-change.ts` reads the note of a change of the
  capabilities. A change of an unknown kind makes the whole note
  unreadable, so the chat skips it.
  `api/read-view.ts` reads the saved view of the view route, with each
  Preview tab at its place in the row and the shown terminal.
- `components/`: the tabs, the chat, the composer, the model picker, and the
  overlays. `ui/`: interactive buttons, menus, sheets, and dialogs.
  `ui/near-view.ts`: `useNearView`, which says when an element comes near
  the view of the chat, and `NearViewRoot`, the scroll box that `ChatPane`
  gives as the view. The pictures of answers start their reads with it.
- `components/model-rows.ts`: `modelMenuRows`, the rows of the model menu,
  as [Model favourites](../../docs/protocol/model-favourites.md#the-model-menu)
  gives them: the favourites that the picker offers, All models with the
  models of each agent, Effort with the efforts of the model, and Fast.
  With no favourite to show, the menu starts with All models. The rows name no menu component, so
  each model picker can draw them. `components/model-menu.ts` draws them as
  the entries of `ui/Menu.tsx` for the picker of a session, and
  `../shell/ui/ModelPicker.tsx` as the entries of the shell menu.
  `ui/Menu.tsx` opens the submenu of an item, such as All models, beside the
  menu, or in its place in the phone layout, with `../shell/ui/submenu.tsx`,
  which the shell menu shares. `ui/menu-rows.tsx` draws the rows and moves
  the focus between them.
- `components/send-key.ts`: `useSendKey`, the send key that the composer
  shares with the page and the dialog of New workspace in the app shell.
- `device/`: the Mac commands. Their [README](device/README.md) names
  their key code.
- `secrets/`: the secret requests, their answers, the runs, and the line of
  a late answer. Their [README](secrets/README.md) names their key code.
- `explain/`: Explain, the marks of explanations, and the popover. Its
  [README](explain/README.md) names its key code.
- `components/WaitingRequests.tsx`: the stack just above the composer of
  the open Mac commands and secret requests, with Previous, Next, and the
  moves of the focus. `components/request-stack.ts` holds `WaitingItem`,
  `stackCards`, the order of its cards, and `placeAfter`, the card on top
  after a change. The shared `RequestStackFrame` and `stackEntries` of
  `../ui/components/chat/` draw and order the stack of the app and of the
  mockups.
- `dev/`: the development page, its fake writes, its scripted agent, its
  Mac, the `loss` scenario in `dev/dev-loss.ts`, and the `starter` option
  in `dev/dev-logins.ts`. `dev/dev-answers.ts` holds the plans and the
  answers of the scripted agent, which the `answer` option chooses. `dev/dev-routes.ts`
  keeps the bytes of each upload. While the sandbox runs, it copies the
  files of each message that it accepts. `dev/dev-sandbox.ts` copies the
  files of each queued message when the sandbox becomes ready, before the
  agent gets the message. Both use the private store of
  `../app/dev/attachment-files.ts`.
