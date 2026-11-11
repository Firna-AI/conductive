# Screens: the command palette and Feedback

This guide belongs to [Screens](screens.md). It gives the rules of the
command palette of the app shell, and of the Feedback dialog that its Help
row opens. The
[command palette protocol](../../docs/protocol/command-palette.md) states
what the palette does, and [Feedback](../../docs/protocol/feedback.md)
states the rules of the dialog.

## The command palette

- The command palette is a layer of each frame: `PaletteLayer` sits in
  the `OverlayHost` of the frame, and the open palette holds the frame
  inert, as a sheet or a dialog does. Its search field takes the focus,
  and `trapTab` keeps Tab inside. When a control that has the focus goes
  away, such as a filter after a change of the tab, the field takes the
  lost focus back. When the palette closes, the frame is active again
  before the focus goes back.
- Escape closes the palette from its own element, in the capture phase
  of React. An open menu of a filter hears Escape first, on the document,
  and stops it, so Escape closes only that menu. A press outside closes
  the desktop dialog, and Cancel closes the phone page. A change of the
  address and a sign-out close the palette too.
- The palette key comes from `AppServices.onKey`, which hears each key in
  the capture phase and not as a passive listener, so the palette can
  stop the browser's own action. Every UI kit of the app notes its open
  menus and modal layers through `useMenuLayer` and `useModalLayer` of
  `../shell/ui/layers.ts`: the shell, the chat, and the members UI. A
  menu says whether it closed, and a menu whose change runs refuses. A
  modal layer has an owner: the dialog of the palette has the palette.
  The owner of the terminal marks its element with `usePaletteTerminal`,
  where Ctrl+K stays with the terminal.
- `PaletteController.show` is the one way to open the palette, for the
  key and for the Search row. It opens only when no dialog or sheet of
  another owner holds the input, and when every open menu closed. The
  key closes an open palette, and does nothing while a dialog or a sheet
  of another owner is open over it, such as the sheet of a filter.
- A part of the page offers its actions to the palette while it shows,
  through `usePaletteOffer`: the workspace screen, the workspace list
  that the page shows, and the sidebar toggle of the Mac app. A row
  closes the palette first. Its action runs once the palette has left
  the page, so a field that the action opens can take the focus, and a
  question shows alone.
- The palette reads the list and the repositories of its org through
  `OrgModel.watch` while it is open, and shares those reads with the list
  of the page. So the list and the palette show the same failure, and Try
  again in either one reads the list again. The palette has no copy of
  its own. Its Try again reads again each part that failed, through
  `OrgModel.reload`.
- `AppModel.lastOrg` keeps the org that the tab opened last, in memory
  only. The Account sidebar of the Mac app and the palette on a page
  without an org read it through `keptOrg`.

## Feedback

The mockups `app/feedback`, its child pages, and
`app/command-palette/search/feedback` draw these screens.

- Send feedback is the one row of the Help group, on each signed-in page,
  also without an org and in a suspended org. `feedbackRow` in
  `palette/palette-rows.ts` gives it no link, because the dialog has no
  address. `palette-groups.ts` puts Help after Window, so the row also
  ends the actions of the All tab.
- The row closes the palette first, as every row does. Then `PalettePanel`
  calls `app.feedback.open` with the org of the palette, the open
  workspace, and the Mac app flag of the source. The flag never comes from
  `AppServices.platform`.
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
