# Key code: drafts and attached files

This page is part of the [web app guide](README.md), beside
[Key code](key-code.md). It names the entry points of the draft text and
the attached files of a draft, which the chat and New workspace share.
Each path is relative to `src/app/`, the folder of this page.
[Attached files of a draft](../chat/draft-files.md) gives their rules, and
[The message field](../chat/message-field.md) gives the rules of the field
that shows their chips.

- `attachment-upload.ts`: `uploadAttachment`, the one upload of a file for
  every composer: the start call, each part in its order, and the complete
  call. A failed part goes again alone, after a wait on the timer of the
  composer, and a try resumes the kept upload of an earlier try. `upload-parts.ts`: `PartedUpload`, an upload that the
  Worker started, with its receipts, the bytes of each part, the readers
  of the replies, the waits before the retries of a part, and the failures
  that a part can survive or that end the upload. `draft-files.ts`: `DraftFile`, the upload state of each file of a
  draft, with its kept upload, and `runFileJob`, the upload of one file in
  its generation. `runFileQueue` starts the reserved uploads of a pick, or of
  a text that brings files back, one at a time, and `stopFile` ends a
  generation and its upload job at once. `splitPick` splits one attach: the files that upload, the
  names of the files and the zips over the size limit, and a copy of the
  names of the folders that could not be read, from `IntakeRefusals`.
- `new-workspace-files.ts`: `DraftUploads`, the uploads of a first message
  before its workspace exists. Its `attach` gives the IDs of a pick at
  once, and keeps the refused names that the caller gives, also with no
  files. Its `setText` makes the files follow the marks. A change of
  person ends its uploads, its files, and the names that it refused.
- `draft-file-state.ts`: the files of the marks of a draft text, which the
  chat and New workspace share. `DraftFileState` holds the attached and the
  detached files of a draft. `reconcileFiles` makes them follow the marks
  of a new text, and `markedFiles` gives each marked file once, in the
  order of its first mark. `messageText` writes the text of a send, with
  the returned path of the file at each mark. `withoutFileMarks` takes the
  marks of some files out of a draft text, and `failSentDraft` turns the
  sent files failed when the Worker no longer has them.
- `draft-marks.ts`: the draft text of a message field with attached files,
  which the chip text field and the mockups share. `fileMark` writes the
  mark of a file: its draft ID between U+E000 and U+E001. `literalText`
  escapes literal text: each U+E000, U+E001, and U+E002 becomes U+E002 and
  `0`, `1`, or `2`. So only an attached file makes a mark. `draftParts`
  gives the parts of a draft in order: decoded literal text, and the ID of
  each mark. `withoutMarks` gives the decoded text alone, for a check of
  the words. `draftText` writes a draft from its parts again: the escaped
  text of each text part and the mark of each file part. Code that builds
  a draft writes its text with `literalText` and its files with
  `fileMark`, and code that rebuilds one from its parts uses `draftText`.
  No code joins decoded parts into a draft by hand. The draft of a field
  without attached files has no escapes, so no code reads it with these
  functions. `draft-marks.test.ts` checks the escapes, malformed escapes, a
  literal path beside a real mark, opaque file IDs, and a rebuilt draft in
  which literal text makes no mark.
- `draft-files.test-support.ts`: the test helpers of the attached files.
  `controlledUploads` gives uploads whose parts wait for the test. It
  answers the start and the complete call itself, so each job is the one
  part of a file. `started` waits until a part has started, and `finish`
  confirms a part and completes its upload with the file that the test
  names. `refusedPart` is the reply of a part that does not go again.
  `firstCall` picks the first start call or the first complete call of
  the uploads, so that a test can hold it.
  `withPickedFiles` writes the marks of new files at the end of a draft
  text, as the field does. `uploadsSettled` waits until no file of a list
  uploads. `pickWorkspaceFiles` attaches files, with optional refusals, to
  a New workspace model, writes the marks of the files, and waits for
  their uploads. `unreadable` gives the refusals of folders that could not
  be read.
