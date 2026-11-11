# Attached files of a draft

This guide belongs to [the chat](README.md). It gives the rules of the
attached files of a draft in each composer: the chat, and the page and the
dialog of New workspace.
[Files in the message field](../../docs/protocol/message-attachments.md#files-in-the-message-field)
states the requirements. [The message field](message-field.md) gives the
rules of the field that shows the chips of these files. Both owners share
the state code of the app. [`draft-files.ts`](../app/draft-files.ts) holds
the upload of one file, and
[`draft-file-state.ts`](../app/draft-file-state.ts) holds the files of the
marks of a draft text.

## The sources

- A draft holds two lists of files. `files` holds each attached file, in
  the order of its first mark in the draft text. `detached` holds each file
  whose last mark left the text, which undo or a paste can bring back. A
  file is in one list only, with one entry, also when the text holds its
  mark more than once. The chat keeps the lists in `Draft` of
  `state/chat-snapshot.ts`, and New workspace in `Draft` of
  `../app/new-workspace-model.ts`.
- The field reads both lists through a `FieldFiles` source. In the chat,
  `ChatController.draftFiles(draftId)` gives the source of one draft
  identity, from `state/draft-file-source.ts`. At each call, the source
  finds the session that holds that draft now, with `holderOf`. So a draft
  that moves to another session keeps its files, also during a store
  notification before React draws the new session. `SessionChat` keeps one
  source for each `Draft.id`, with `useDraftFiles`. In New workspace,
  `NewWorkspaceModel.filesSource` reads the draft of the model.
- Each source gives the attached files, then the detached files. It keeps
  each file object until that file changes, and it calls its listeners
  through the store of its owner.
- Try again goes through `retry` of the source. In the chat, it runs
  `retryFile` of `state/attachment-actions.ts` for the session that holds
  the draft, and it does nothing in a read-only workspace. In New
  workspace, it runs `NewWorkspaceModel.retryFile`, which does nothing
  while a create runs. Try again uploads the kept `File` of a failed
  attached file again, with the same ID. A detached file that failed stays
  failed until its chip comes back.

## The attach

- `ChatController.attachFiles(sessionId, files)` and
  `NewWorkspaceModel.attach(files)` attach the files of one pick. Each
  gives the IDs of the new files at once, while their uploads run. These
  are the local IDs of `DraftFile.id`, not the attachment IDs of the upload
  replies. The field writes them in its marks, through
  `FieldHandle.insertFiles`.
- A file over the size limit gets no ID and no upload. Its name goes to
  the notice of the draft, which the next pick replaces. A read-only chat,
  and New workspace while its create runs, attach nothing and give an
  empty list.
- The attach adds the new files to `files` at once, so the field can put
  their chips into the text in the same event. A composer must insert the
  chips of the IDs that it gets. The next text of the field makes `files`
  follow its marks, so a file without a mark then becomes detached, and
  its upload stops.

## Marks and files

- Each new text of the field goes to its owner as it is:
  `ChatController.setDraft` in the chat, and `NewWorkspaceModel.setText`
  in New workspace. The owner makes the files follow the marks of that
  text with `reconcileFiles`, and it changes the files and the text in one
  update.
- A file whose last mark leaves the text becomes detached, and its upload
  stops. A file with more than one mark, such as after a paste of its
  copy, stays attached while one mark stays.
- A detached file whose mark comes back, such as from undo or from a paste
  of its copy, is attached again. A ready file comes back as it was, with
  its attachment and its path, and it uploads nothing. A file whose upload
  stopped uploads again from the start. A failed file comes back failed.

## Uploads

- Each upload runs in a generation: an abort controller that the owner
  keeps for the file ID. The chat keeps it in `ChatContext.uploads`, and
  New workspace keeps it in `DraftUploads`. A pick, and a text that brings
  back stopped uploads, each reserve the generations of their files at
  once. Then their uploads start one at a time, through `runFileQueue`.
- A detach and the end of the files end the generation of a file. A
  restart after undo and Try again give the file a new generation. A
  progress, a reply, or a failure of an older generation then changes
  nothing. This holds also for a queued upload that starts after its
  generation ended. `runFileJob` checks the generation before the request
  and at each report.
- An upload changes its file only while the file is attached. In the
  chat, it finds its draft by the draft ID, so its progress and its outcome
  land on the draft also after a move. New workspace also checks the
  message ID of the draft and the life of the person who is signed in.

## The send

- Send takes the files that the marks of the draft text name: each
  attached file once, in the order of its first mark, through
  `markedFiles`. A detached file never goes. Send waits while one of these
  files uploads or failed.
- `messageText` writes the text of the message. It is the decoded text of
  the draft, with `@` and the returned copy path of the file at each mark,
  as `mentionText(path, false)` writes it. Each mark of a file gets the
  mention. The browser never builds a copy path. The request lists the
  attachment IDs of the files in the same order.
- In the chat, a message can hold only chips. New workspace needs words
  outside the chips of its files: `withoutMarks(text).trim() !== ''`.
- Send keeps the draft text that it took, as the field wrote it, with its
  marks and its escapes. After a send that succeeds, the draft text clears
  when it is still that text. A text that the member changed during the
  send stays, without the marks of the sent files and of the detached
  files. A file that the member added during the send stays, with its
  mark, for the next message. The send also ends the detached files.
  `afterSend` of `state/drafts.ts` applies this in the chat.
- A send that fails keeps the text with its marks, and the files. When the
  Worker no longer has a sent file, each sent file turns failed, attached
  or detached, through `failSentDraft`. So undo cannot bring back such a
  file as ready. Try again uploads its kept `File`.
- A create of New workspace that succeeds ends the upload generations. It
  starts a new draft with a new message ID, which keeps the model choice
  and a picked repository. A text that changed during the create stays,
  without the marks of the files of the old draft.

## Moves and ends

- A model change sends the draft text as the field wrote it, with its
  marks and its escapes. It also sends the attachment IDs of its marked
  ready files, in the order of their first marks. Neither the request nor
  the move decodes that text or writes it again.
- The draft that moves to a new session keeps its text, its identity, its
  attached and detached files, and its uploads.
  [Sessions, logins, and drafts](sessions.md) gives the rules of the move.
  After the reply, `keepFiles` of `state/drafts.ts` takes each sent file
  that the reply did not keep off both lists, with all its marks. A file
  that the member added after the request stays.
- `ChatController.stop`, also at a sign-out, aborts each running and
  queued upload. In the same snapshot, `endDraftFiles` takes the attached
  and the detached files off each draft, with their marks. New workspace
  does the same when the life of the person who is signed in ends.
- Each `start` of a chat begins with `stop` and a fresh snapshot, so the
  drafts of the earlier run end. Each draft ID holds the number of its
  run. So a source of an earlier draft finds no draft, and it never reads
  the files of a later one. Code treats a draft ID as opaque. File IDs
  count again in each run.
- Code that takes marks out of a draft text writes the text again with
  `withoutFileMarks`, which uses `draftText` of
  [`draft-marks.ts`](../app/draft-marks.ts). So literal text keeps its
  escapes. `withoutMarks` gives the decoded words of a draft for a check,
  never a draft text.
