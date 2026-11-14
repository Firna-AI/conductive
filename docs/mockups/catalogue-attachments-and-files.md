# Attachments and files

These pages are part of [the mockup catalogue](catalogue.md).

`app/attachments` draws the attached files of a message, from decisions
132, 144, and 262 to 265. It also draws large-upload decisions 1 and 3,
the decisions of 12 November 2026 for files of up to 1 GB: each file can
be up to 1 GB, and the app deletes its stored copy of a file once the
cloud computer has it. Each attached file is a chip at its place in the
text of the message box, so the text says where each file belongs. Its
canonical screen has a screenshot that uploads in the chat of Checkout
address autocomplete, with an uploaded console log later in the sentence.
The `failed`, `too-large`, `sent`, and `queued` pages moved from saved states
of the page into their own folders, and they kept their paths. So the page
shows only its canonical screen. Its child pages:

- `app/attachments/drop` has a screenshot that hovers over the message box:
  the drop state of the box, and the drop caret in the text. A phone has no
  drag, so its view has the caret where a pick from the paperclip goes. Its
  `dropped` variant has the screenshot at the place of the drop, with the
  caret after it. On a phone it has the picked screenshot at the caret. Its
  `folder` variant has a drop with a folder, which the notice over the box
  names.
- `app/attachments/failed` has a failed upload, with Try again in its chip.
- `app/attachments/too-large` has a file over 1 GB. It gets no chip, and a
  notice names it.
- `app/attachments/sent` has the sent message, with each file as a chip at
  its place, while the agent answers. Its `listed` variant has a message
  whose text holds no mention of its files, so they show under it.
- `app/attachments/open` has the copy of the screenshot in the temporary
  tab, with its picture. A press on the sent chip of the screenshot opens
  it there.
- `app/attachments/queued` has the first message of a new workspace with its
  files, while the sandbox starts. Its chips open nothing until the message
  goes out to the agent.
- `app/attachments/missing` has a Try again that failed, because the
  screenshot of its message is no longer in the cloud computer. The notice
  of the failed turn names the file and asks to attach it again in a new
  message, and Try again stays. The earlier failure of the same message
  shows no Try again. Its `two-files` variant has both files gone, and the
  notice names both.

The New workspace page and dialog show the same chips in the task, as
`app/new-workspace/files` and `app/new-workspace/dialog/files` show. The
`drop` variant of `app/new-workspace/dialog/files` has the sketch over the
dialog: the whole card is its message box, so its full border shows the
drop state. Its phone view is the New workspace page, with the caret where
a pick goes.
`app/file-mentions/chips/attached-file` has the pointer over an attached
file in the text, where a × takes the place of its icon.

`app/files` shows All files. The `changes`, `code`, `markdown`, and `diff`
pages moved from saved states of the page into their own folders, and they
kept their paths. So the page shows only its canonical screen.
`app/files/markdown` has README.md and `app/files/diff` has the diff of
AddressForm.tsx, each in the temporary tab that a press opened, beside the
kept tab of the code file of `app/files/code`.
`app/files/image` has a picture of the branch in the temporary tab, from
decision 265 B. Its `cannot-draw` variant has an image whose bytes the
browser cannot draw, with "Download this file to open it".

`app/files/temporary` draws the temporary tab, from decisions 284 to 287.
Its canonical screen has README.md, which a press in All files opened in
the temporary tab at the end of the row, with its title in italics. Its
variants:

- Its `replaced` variant has the diff of AddressForm.tsx in the place of
  README.md, after a press in Changes, before a new session that opened
  after README.md.
- Its `kept` variant has README.md kept by a double-click, with an upright
  title, and the diff of AddressForm.tsx in a new temporary tab at the end
  of the row.
- Its `menu` variant has the tab menu of the temporary tab: Keep open, a
  line, then Move left and Move right.
- Its `drag` variant has a drag of the temporary tab, whose lifted copy
  keeps the italics. A drop in another place keeps the tab.

A phone row shows no file tabs, so the phone views of these pages show the
file as a page of the Files tab. `app/tabs` names the page in the text of
its tab menu and of its drag.

The flow `user-flows/drop-a-file` goes from the drag of a screenshot onto
the message box, through the drop, the upload, and Send, to the sent
message and the file tab of the screenshot.
