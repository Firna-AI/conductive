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
  drag, so its view has the caret where a pick from Attach files in the
  menu of its + button goes. Its
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
`app/files/code/at-line` has the code tab that a press on a file chip with
a line target opens, from answer chip decision 2 of 13 November 2026. The
lines of the target have a soft amber fill, and the first of them sits in
the middle of the view, on desktop and on a phone.
`app/files/markdown` has README.md and `app/files/diff` has the diff of
AddressForm.tsx, each in the temporary tab that a press opened, beside the
kept tab of the code file of `app/files/code`. README.md has a note in a
quote with a bold label, a table cell on two lines, a variable with a line
through it, text in italics, a picture at a web address, a task list, and
a rule, in the look of a reply of the chat, as
[the Markdown of replies](design-markdown.md) gives. The picture shows its
alt text as a link, from item 10 B of the Markdown plan of 18 November
2026, and each task shows a fixed check box.
`app/files/image` has a picture of the branch in the temporary tab, from
decision 265 B. Its `cannot-draw` variant has an image whose bytes the
browser cannot draw, with "Download this file to open it". Its
`from-answer` variant has the screenshot after.png of the agent, which a
press on its picture in `app/file-mentions/answers` opened in the
temporary tab, from screenshot decision 2 of 18 November 2026. The
picture has its zoom bar under it, from Cal's request of 22 November
2026. Its `expanded` variant has the picture in the large window of an
expanded Preview tab, after Expand. The `image-view` component page has a
`zoomed` variant, and the `picture-zoom-bar` component page has the
states of the bar.

`app/files/html` has `.context/report.html` in the temporary tab, in
Preview, from HTML preview decision 1 A, which Cal chose on 18 November
2026. An agent wrote the report as a web page. The page shows in a frame
under the header, with its own styles and the bars that its script draws.
The header has Download beside the path, then Reload, Open, Copy, and the
switch between Preview and Source. On a phone, Reload and Open take a
second line of the header, right above the page. The row of the report is
marked in the open context folder of All files. Its variants:

- Its `source` variant has the text of the file in Source, with line
  numbers and the syntax colours of HTML, as a code file shows.
- Its `opening` variant has the page that `app/tools/preview-opening`
  draws, in the frame. The tab shows this one wait from the press until
  the page loads: while the app opens the preview, then while the frame
  loads.
- Its `older-software` variant has a notice in place of the page: the
  preview needs newer cloud computer software, and the member selects
  Restart in the workspace header. The notice has no button of its own,
  and the header has no Reload and no Open. When the workspace leaves
  Starting after the Restart, the page shows by itself.
- Its `failed` variant has a preview that did not open, because the cloud
  computer did not answer. In place of the page, the tab shows the
  failure of a Preview tab: "The preview couldn't open", the message of
  the server, and Try again. The header has no Reload and no Open.

`app/files/temporary` draws the temporary tab, from decisions 284 to 287.
Its canonical screen has README.md, which a press in All files opened in
the temporary tab at the end of the row, with its title in italics.
While it shows, Escape closes it. Its variants:

- Its `replaced` variant has the diff of AddressForm.tsx in the place of
  README.md, after a press in Changes, before a new session that opened
  after README.md.
- Its `kept` variant has README.md kept by a double-click, with an upright
  title, and the diff of AddressForm.tsx in a new temporary tab at the end
  of the row.
- Its `menu` variant has the tab menu of the temporary tab: Keep open, a
  line, Copy path, a line, Move left and Move right, a line, then Close
  tabs to the right.
- Its `drag` variant has a drag of the temporary tab, whose lifted copy
  keeps the italics. A drop in another place keeps the tab.

A phone row shows no file tabs, so the phone views of these pages show the
file as a page of the Files tab. `app/tabs` names the page in the text of
its drag, and `app/tabs/menu` in the text of the tab menu.

`app/files/menu` draws the menu of a row of All files and Changes, from
decisions 1 to 4 of the file row menu change. Its canonical screen has the
menu of AddressForm.tsx in All files, at the pointer of a right click: Add
to chat, a line, then Copy path. The row keeps the fill of a hover, as a
tab with an open menu does. On a phone, a long press opens the menu as a
sheet with the name of the row as its title. The page shows only its
canonical screen. Its child pages:

- `app/files/menu/folder` has the menu of the folder `src/app/checkout`,
  with the same items.
- `app/files/menu/changes` has the menu of AddressForm.tsx in Changes. Its
  `deleted` variant has the menu of postcodeLookup.ts, which the branch
  deletes, with only Copy path.
- `app/files/menu/copied` has the toast "Path copied" after Copy path. Its
  `failed` variant has the toast of a copy that failed.
- `app/files/menu/stopped` has the menu while the cloud computer is
  stopped. Its bar takes the place of the message field, so the menu has
  only Copy path. A read-only workspace shows no rows: an archived
  workspace has no file lists, and the refused start of a suspended org
  takes the place of All files and Changes. So no page draws a row menu of
  a read-only workspace.
- `app/files/menu/added` has Address autocomplete after Add to chat, with
  the chip of AddressForm.tsx at the end of its draft and the caret after
  the chip. On a phone, it has the chat of that session, with no caret.
- `app/files/menu/read-only-tab` has the tab menu of useAddressAutocomplete.ts
  in a workspace of a suspended org, with only Copy path.

`app/files/limited` and `app/files/changes/limited` draw the lists of a
large branch, from runner file report limits: Cal's decision M4 = F of
20 November 2026, and items 1 F, 2 B, and 3 A of 23 November 2026. The
branch of Checkout address autocomplete recorded the address answers of
its tests again. So it holds 68,412 files and folders, and it changes
2,243 files. Each limited list shows its notice in a quiet row: at the top
of All files, and under the summary of Changes. The row stays in view
while the rows scroll. Each count comes from the list, not from the limit.
The file counts of the Changes tab and of the summary, the line totals,
and the counts in the notices, show with thousands separators. Items 1 F
and 2 B show only
in which rows appear, with no group and no label. A link to a file that a
list leaves out still opens the file.

Each file link of a limited screen opens the limited page of its file or
list, from the table of `src/limitedListPaths.ts`: the rows and the tabs of
the lists, the back links and the Files tab of a phone, the file tabs, and
the file chips of the chat. So the reader keeps the lists of the large
branch. The Checks tab and the other views of the workspace keep their
standard pages.

- `app/files/limited` has All files with 50,000 entries. Its row says
  "18,412 files and folders are not listed. Find them in the terminal, or
  ask the agent." The count holds the folders too, because the limit counts
  each folder. The changed files and their folders stay in the list, with
  their marks. The other entries follow in path order, so the end of
  `tests/fixtures` and `tsconfig.json` at the root stay out. The Changes tab
  counts the whole change, 2,243 files, and links to
  `app/files/changes/limited`. Its `unavailable` variant has the saved list
  after a read of the files that failed. The row at the top keeps its
  count, and the amber notice "The latest list of all files is unavailable"
  stays under the lists, with no time.
- `app/files/changes/limited` has Changes with 1,000 files, in the order of
  Changes, by path. The summary and the Changes tab give the whole change:
  2,243 files, which add 55,866 lines and remove 17,843 lines. The row under
  the summary says "The totals include 1,243 files that are not listed.
  Review them in the terminal, or ask the agent." Its `repair-failed`
  variant has the saved list after a failed repair. The totals and the row
  stay, and the amber notice "The latest list of changes is unavailable"
  stays under the lists, with its time.
- `app/files/diff/limited`, `app/files/code/limited`, and
  `app/files/markdown/limited` are the `limited` variants of the file pages.
  They have the diff of AddressForm.tsx, the code file
  useAddressAutocomplete.ts, and README.md open beside the limited lists,
  with the row of the open file marked. On a phone, the back link of each
  file page opens its limited list.

`app/file-mentions/list/limited` has the list of `@` of the same branch, as
[workspace links, file and skill mentions, and tools](catalogue-workspace-tools.md)
gives.

The flow `user-flows/drop-a-file` goes from the drag of a screenshot onto
the message box, through the drop, the upload, and Send, to the sent
message and the file tab of the screenshot.
