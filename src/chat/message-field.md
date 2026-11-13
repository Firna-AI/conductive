# The message field

This guide belongs to [the chat](README.md). It gives the rules of the
message field of each composer: its chips, also of attached files, its
clipboard, its drag, and its handle. It also gives the drop of files on
the message box.
[Attached files of a draft](draft-files.md) gives the rules of the files
that those chips show, from the attach to the send.

- The message field of every composer is the chip text field of
  `components/chip-field/`, as
  [The message field](../../docs/protocol/workspace-links.md#the-message-field)
  says. It holds plain text and a chip for each workspace link. A paste and
  a draft that comes back turn each workspace link into a chip, and typed
  text stays text. A paste reads only the plain text of the paste event.
  The draft is plain text with the exact link of each chip, apart from the
  marks and the escapes of a field with attached files. A space goes
  beside a chip only where the text beside it would join its link, also in
  a copy. When the list of the org changes, a chip whose workspace left it
  becomes ordinary text, and a pasted or restored link whose workspace the
  list now holds becomes a chip, with no new step of undo. A new draft from
  the owner, such as an empty one after a send, clears the undo history,
  and the owner's echo of the field's own text changes nothing. The field
  also takes an identity for its draft as `owner`: `Draft.id` in the chat,
  and the model of each form in New workspace. A new owner replaces the
  content, the selection, and the undo history, also when its text is
  equal, so undo never takes the text of one draft into another. A draft
  that moves to another session keeps its identity, so its undo moves with
  it. The field stays mounted, so it keeps the focus. The field stays a
  focusable textbox while it takes no change, such as during a create. Its
  chips find their workspaces through `LinksProvider`. A known session link
  shows as a session chip, which works as a workspace chip there. New
  workspace, which loads no chat, reads the sessions of each linked
  workspace once for each load of the form, in `OrgLinks`.
- Inside the mentions of a chat, `@` opens the list of the files and the
  folders, and `/` opens the list of the skills of `agent`, the agent of
  the model chosen now in the composer. Both lists share
  `MentionListPlugin`: the open state, the highlight, the keys, and the
  place above the box. They differ in their rows, their lines, and Enter:
  the list of `@` keeps Enter while it shows no row, and the list of `/`
  closes when no skill matches and lets Enter send while it shows no row.
  [Skill mentions](../../docs/protocol/skill-mentions.md) states the list
  of `/` and its chips. A paste, a draft that comes back, and a skill list
  that loads later make a skill chip of each skill text that a list of
  either agent names, so a chip stays a chip after a change of the model.
  Typed text stays text. The draft keeps the skill text, such as `/plans`.
- A composer can give the field the files of its draft as `files`, a
  `FieldFiles`. Only a field with `files` reads marks and shows the chips
  of attached files.
  [The chip in the field](../../docs/protocol/message-attachments.md#the-chip-in-the-field)
  states the requirements of these chips. The chat and both New workspace
  composers give `files` for the whole life of each draft, as
  [The sources](draft-files.md#the-sources) says. The chat gives
  `ChatController.draftFiles(Draft.id)`, and New workspace gives
  `NewWorkspaceModel.filesSource`. No composer draws a row of files above
  the field. A field without `files`, such as that of Feedback, holds plain
  text. It reads no mark, escapes nothing, and keeps no private copy. Its
  drag is the drag of Lexical.
- The Attach files button of each composer opens the file picker. Attach a
  smaller file, in the notice of a file over the size limit, opens it too.
  Attach files, in the notice of a dropped folder that could not be read,
  opens it too.
  A pick attaches its files, which gives their IDs at once, as
  [The attach](draft-files.md#the-attach) says. In the same change event,
  the composer puts their chips into the field with
  `FieldHandle.insertFiles`. The chips go to the caret that the field kept
  while the button had the focus, or to the end when the field has no
  caret.
- With `files`, the draft text holds the mark of each attached file at the
  place of its chip, with the spaces of a mention. Its other text is
  literal text, which the field escapes as
  [`draft-marks.ts`](../app/draft-marks.ts) of the app says. So typed and
  pasted text, and the link or the mention of each workspace or file chip,
  keep each character. Only the node of an attached file writes a mark.
  Read and build such a draft only through that module. The draft of a
  field without `files` has no escapes. So a composer gives `files` for
  the whole life of a draft, or never.
- `FieldFiles` gives `files()`: each file that the draft holds, also a file
  whose chip left the text. Undo or a paste can then bring its chip back.
  It also gives `retry(id)`, which uploads a failed file again, and
  `subscribe(listener)`, which calls the listener after each change of
  `files()`. Each method reads the state of the owner at the call, not the
  props of the last render. So a pick can attach its files and insert
  their chips in the same event.
- The field shows a chip only for a file that `files()` gives. A draft
  that comes back shows the chip of each mark of such a file. The field
  drops each other mark, and gives the owner the text without it. When a
  file leaves `files()`, its chip leaves the text after React draws the
  change. This adds no step of undo, keeps the caret, and takes no focus.
  Undo cannot bring the chip back. An owner changes the files and the text
  of a draft in one update. Otherwise the field takes out the chip and
  reports a text between the two changes. When the owner changes,
  `files()` gives the files of the new draft in the same render, because
  the field reads the new text at once. The field never adds or takes off
  a file of the draft. The owner reads the marks of each new text from
  `onChangeText`, and its files follow them, as
  [Marks and files](draft-files.md#marks-and-files) says.
- The chip of an attached file is one unit of the text, as a file chip
  is. It draws the pure `DraftFileChip` of the mockups with the live
  upload of its file, also while the field takes no change. Its × removes
  it as one step of undo. Try again calls `retry`, and then the field takes
  the focus back. Both do nothing while the field takes no change. The
  editor ignores a key, a cut, or a paste in a control of the chip, so
  Enter on Try again never sends. Each such event still reaches the page.
- With `files`, a copy, a cut, or a drag gives plain text with no mark and
  no escape. A ready attached file gives the mention of its copy path, and
  another attached file gives its name. Each other chip gives its link or
  its mention, and the text stays as typed. A cut is its own step of undo.
- With `files`, the field keeps in memory the draft text of its last copy,
  cut, or drag, with its marks. It keeps that copy for the owner of the
  draft that it came from. So the kept copy follows its owner, also when a
  draft moves to another session with its identity. For that owner, a
  paste or a drop of its plain text takes the kept text while the draft
  holds each of its files. Each chip then comes back with its file. In
  another draft, or when the draft no longer holds one of its files, a
  paste takes the plain text, as the next rule says. The name of an absent
  file then stays text.
- With `files`, a paste of other plain text is literal text, so it never
  makes a mark. Each mention of the copy path of a ready file of the draft
  becomes the chip of that file, also when its chip left the text. A
  mention of the copy path of any other file stays text.
- With `files`, a drag of a selection with a chip moves it with its chips,
  as one step of undo. A drop inside the dragged text keeps it. A drag of
  text alone and a drop of other text take the drag and the drop of
  Lexical. The field leaves a drop of files to the message box, and
  Lexical does not cancel it. The box takes that drop, as the next rules
  say.
- Each composer takes a drop of files on its whole message box, through
  `useComposerDrop` of `components/composer-drop.ts`: the text, the bar,
  and the padding. The box of the New workspace dialog is its whole card.
  Only a drag of files takes part, so a drag of text or of a chip keeps
  the drag of the field. While files hover over the box, it shows its drop
  state, and the field draws the drop caret under a pointer over the text.
  The drop state follows the elements that the drag entered and has not
  left, so a move from the text to the bar keeps it.
- In the chat of a workspace, the whole column is the drop area of the
  box, through `useChatDropArea` of `components/chat-drop-area.ts`. The
  column gives each drag event to the box that it holds, so a drop on the
  tabs or the transcript works as a drop on the bar. The box then spreads
  no handlers of its own, so each event reaches it once. A drag event from
  a portal, such as the menu of a tab, reaches the column through React
  but is not on its element, so the column leaves it to the guard. While
  no box shows, the column takes no drag.
  [Drops](../../docs/protocol/message-attachments.md#drops) states the
  requirements.
- At the drop, `droppedItems` of [`file-drags.ts`](../app/file-drags.ts)
  gives the items in their order. An item whose entry is a directory is a
  folder. Each other item of kind file is a file, also an empty one. A
  drop without a folder attaches its files at once. A drop with a folder
  first zips each folder with `intakeOf`, then attaches the files and the
  zips in the order of the drop, with the refused folders, also for a drop
  of folders alone. Then `insertFiles(ids, point)` puts the chips at the
  place under the pointer, else at the caret, else at the end. The hook
  stops the zips that run when the box leaves the page, and a drop whose
  zips end after the composer stopped taking changes attaches nothing. The
  box cancels each event of a drag of files, so the browser opens no file
  and inserts no path.
- The chat box takes a drop whenever its composer shows, also while a
  message sends or a file uploads, because its field takes changes then.
  The New workspace page and dialog take no drop while a create runs, and
  the dialog of a suspended org takes none. Such a box offers no drop, so
  the pointer shows that a drop does nothing. Its drop state and its drop
  caret go as soon as it stops taking changes, also during a hover.
  Outside each box and its drop area, `useFileDropGuard` of the app makes a drop of files do
  nothing, as [Composition](../app/README.md#composition) says.
- `FieldHandle` gives `focus()`, `insertFiles(ids, point?)`,
  `showDropCaret(point)`, and `clearDropCaret()`. A `FieldPoint` is a point
  of the page, from `clientX` and `clientY` of a pointer event.
  `insertFiles` puts a chip for each file of `ids` that `files()` gives.
  The chips go to the place under the point over the text, else to the
  caret, else to the end. They go in order, each with a space after it, as
  one step of undo. The last chip gets no space when a space or a line
  break follows. The caret then stands after the last chip, and the field
  takes the focus. A caret that selects text keeps the text, and the chips
  go to its focus. A field without the focus keeps its caret for
  `insertFiles`. A field that takes no change puts no chip.
- `showDropCaret` draws the drop caret at the place under the point over
  the text, and hides it elsewhere. The drop caret is a layer over the
  text, and it never moves the caret or the selection. `insertFiles` and
  `clearDropCaret` hide it. A field that takes no change draws no drop
  caret. `useComposerDrop` calls `showDropCaret` at each `dragover` of
  files while the composer takes changes. It calls `clearDropCaret` when
  the drag leaves the box, at the drop, and when the composer stops taking
  changes.
- `components/chip-field/`: `ChipTextField`, the message field of every
  composer, over Lexical. `chip-nodes.tsx` holds the chip node and the
  node of a link that waits for its workspace. `file-mention-nodes.tsx`
  holds the file chip node and the node of a mention or a skill text that
  waits for its list. `skill-mention-nodes.tsx` holds the skill chip node,
  its chip, and the agent of the field. `field-nodes.ts` turns a draft
  text or a paste into nodes.
  `field-content.ts` turns nodes into the draft text and the copy text,
  and reconciles the chips with the list. `mention-content.ts` reconciles
  the chips of a kind with their list, finds the query of `@` or `/`, puts
  a pick in its place, and turns a waiting text into plain text when typing
  continues it. `skill-content.ts` splits a text into skill texts with the
  shared `skillTextAt`, and gives the skill chips, their reconcile, and the
  pick. `mention-list-plugin.tsx` holds `MentionListPlugin`, which both
  lists share. `mention-plugins.tsx` holds the list of `@`, the reconcile
  of the file and skill chips, and `useFieldSources`. `skill-plugins.tsx`
  holds the list of `/`. `undo-plugin.tsx` holds the undo history,
  which starts from the content at mount, so the first change is one step
  of undo. `field-text.ts` joins the parts of a text with the separator
  rule. `field-plugins.tsx` holds the value, Enter, editable, and
  reconcile plugins. `clipboard-plugins.tsx` holds the copy, the cut, the
  paste, the drag, and the drop. `focus-plugins.tsx` holds `FieldHandle`,
  `HandlePlugin`, and the plugin of the `caretAtEnd` option. At each focus
  without a press of the pointer, such as from Tab, that plugin puts the
  caret back where it was, or at the end of a kept draft. The New
  workspace page and dialog use that option.
- In `components/chip-field/`, `attached-files.tsx` holds `FieldFiles`,
  its provider, and what a chip shows of a draft file.
  `attached-file-node.tsx` holds the node of an attached file, whose text
  is its mark, and `attached-file-chip.tsx` draws its live chip.
  `owned-files.ts` takes the chip of a file that leaves the draft out of
  the text. `insert-files.ts` puts the chips of `insertFiles` in place.
  `point-caret.ts` finds the caret and the box of the drop caret at a
  point. `drop-caret.tsx` draws the drop caret, and `drop-move.ts` puts
  the nodes of a drop in place. `field-focus.ts` and `use-latest.ts` hold
  small helpers of the plugins.
