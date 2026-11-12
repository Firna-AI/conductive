# Screens: Feedback

This guide belongs to [Screens](screens.md). It gives the rules of the
Feedback dialog that the Help row of the command palette opens.
[Command palette and keys](palette-and-keys.md) gives the rules of the
palette itself. [Feedback](../../docs/protocol/feedback.md) states the
rules of the dialog.

## Feedback

The mockups `app/feedback`, its child pages, and
`app/command-palette/search/feedback` draw these screens.

- Send feedback is the one row of the Help group, on each signed-in page,
  also without an org and in a suspended org. `feedbackRow` in
  `palette/palette-rows.ts` gives it no link, because the dialog has no
  address. `palette-groups.ts` puts Help after Window, so the row also
  ends the actions of the All tab.
- The row closes the palette first, as every row does. Then `useRowAction`
  in `../shell/palette/row-action.ts` calls `app.feedback.open` with the
  org of the palette, the open workspace, and the Mac app flag of the
  source. The flag never comes from `AppServices.platform`.
- `FeedbackLayer` sits beside `PaletteLayer` in every desktop frame and in
  the phone frame. It draws `FeedbackDialog` while the model is open and
  the person is signed in. The dialog is the wide `Dialog`, which shows as
  a `Sheet` on a phone.
- The message box is the chip text field with `owner={app.feedback}`, so a
  draft that the model clears also clears the field. It takes the focus
  through the `initial` target of `Dialog` and `Sheet`. When the dialog
  closes, the focus goes back to the element that had it before. Its send
  key comes from `useSendKey`.
- `ScreenshotChips` draws the chips above the text, each with its name, its
  size, and Remove. Add screenshots sits under the text.
- `FeedbackFacts` draws the context line and the reply line. A reply read
  that is null or loads shows the loading line. A ready read shows the
  address, or the line without one. A failed read shows `LoadFailure` with
  its error and Try again, which calls `readReply`.
- Send is on only when `canSend` holds and the intake reads no file. Send
  and the send key call `send`. When `send` gives true, the dialog closes
  and `useToast` shows "Thanks for your feedback" in the success tone. A
  false result shows no toast. A failed send keeps the draft, with its
  notice.
- Cancel, Escape, and a press outside call `close`, which keeps the draft.
  The model refuses a close while a send runs.
- A change of the address keeps the dialog open, with the context of its
  open, because the page under the dialog takes no input.

### Screenshots

- `screenshotIntake(app)` gives one `ScreenshotIntake` for each app. It
  takes the files of each pick, paste, and drop one at a time, in order,
  and counts the files that it still reads.
- It reads the first 12 bytes of a file first, and refuses at once a file
  that is not a PNG, JPEG, GIF, or WebP image. Then it reads the whole
  file, checks it with `readImage`, and removes its metadata with
  `stripMetadata`. It makes no object URL, canvas, or decode.
- After the removal, the screenshots of a draft can hold at most 7,000,000
  bytes in all, as the Worker counts them.
- `stripMetadata` keeps the pixels, the colour profile, the transparency,
  and the frames of an animation. A JPEG keeps its orientation in a new
  small EXIF segment. The parser of each format, such as `png-metadata.ts`,
  holds the rules of that format.
- An unreadable or broken image gets the notice of another type. A new
  pick, paste, or drop clears the notices that show. A queued file can
  report a refusal later, including a file from an earlier addition.
  Each notice names its file. A send clears the notices.
- A paste adds files only when the clipboard holds files and no plain
  text, through `pastedFiles` in `../shell/feedback/screenshot-input.ts`.
  While the dialog shows, `useScreenshotDrop` takes a drop anywhere on the
  window, so the browser does not open the file.
- The picker offers the four image types, and the first bytes still
  decide.
