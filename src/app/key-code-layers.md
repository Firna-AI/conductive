# Key code: the palette, the layers, and the dialogs

This page is part of the [web app guide](README.md), beside
[Key code](key-code.md). It names the entry points of the command
palette and the keyboard shortcuts, the layers of each frame, New
workspace as a dialog, and feedback. Each path is relative to `src/app/`,
the folder of this page.

- `palette/`: the command palette without React. `palette-results.ts`
  gives the groups and the empty state of each tab for a query, from
  `palette-groups.ts` and the rows of `palette-rows.ts`. `palette-status.ts`
  gives the status part, which stands in place of the workspace groups
  while the list or the repository names load or after a read failed,
  and the reads that its Try again does again. `matcher.ts`
  ranks the matches. `rowTexts` includes the workspace number label, such
  as `W-395`, in the search texts. `withNumberLabel` adds that label when
  a query word matches it. `../shell/palette/PaletteList.tsx` draws it
  between the list mark and the name. `commands.ts` holds the labels, the search words, and
  `actionCommands`, the command of the keys of each action. Each command
  row names its command in `CommandRow.command`. The Account group of the
  Settings tab lists `accountSettingIds` in the order of the Account page
  of `../shell/account/AccountScreen.tsx`, tab by tab, so This Mac follows
  Sign-in in the Mac app. A section that the page adds or moves takes the
  same place in that list. The group ends with Keyboard shortcuts, which
  opens that tab. `feedbackRow` in `palette-rows.ts` is the row of Send
  feedback, with no link, and `palette-groups.ts` ends the Actions tab
  with its Help group.
  `listed-commands.ts` gives `listedCommands`, the commands that the
  palette lists now with their rows, which the keys of the palette run.
  It leaves out Switch to org 1 to 9, which the org rail runs.
  `page-actions.ts` gives the offers of the parts of the page and
  `workspaceActionIds`. `palette-org.ts` chooses the org of the palette,
  and gives `switchCommand`, the key of the Switch to row of an org by its
  place in the rail. `controller.ts` gives the open state and the offers
  of one tab, with `show`, the one way to open the palette.
- `../shell/palette/`: the layer of the palette. `PaletteProvider.tsx`
  offers the palette key to the shortcut layer and closes the palette,
  `PaletteLayer.tsx` draws it in a frame, `palette-context.ts` gives
  `usePaletteOffer`, and `SearchRow.tsx` is the Search row of the list,
  with the palette key of the keymap. `PaletteKeys.tsx` offers the
  commands that the palette lists to the keys, with `useRowAction` of
  `row-action.ts`, the action of a row: its own run, its page, New
  workspace as the page or the dialog, or the Feedback dialog of Send
  feedback. `PaletteList.tsx` ends each command row with the key of its
  command.
  `use-palette-source.ts` gives `usePaletteBase`, what the actions and the
  settings read, and the list and the repositories of the org with their
  load states. `PaletteStatus.tsx` draws the status part.
- `../shell/shortcuts/`: the shortcut layer: the one key listener on
  `AppServices.onKey`, the keymap with the changes of the account, the
  commands that the parts of the page offer, the terminals that keep
  their keys, the recorder mark, the open layers, and the key hints. Its
  [README](../shell/shortcuts/README.md) says how a key goes, and which
  part of the page offers each command.
- `../shell/account/shortcuts/`: the Keyboard shortcuts tab of the
  account, with its recorder, Replace, Remove, Reset, Reset all, and
  search. Its [README](../shell/account/shortcuts/README.md) gives its
  rules.
- `../shell/ui/layers.ts`: `OpenLayers`, the open menus of every UI kit,
  which say whether they closed, and the modal layers with their owners.
  The shortcut listener reads them before a key runs a command, and the
  palette reads them before it opens.
- `../shell/layout/frames.tsx`: the frames: the desktop frame with the
  rail, a desktop page alone, such as Create org, and the phone frame.
  `../shell/layout/DesktopLayers.tsx`: `DesktopLayers`, the layers and the
  main area that every desktop frame shares: sheets and dialogs, the New
  workspace dialog, the command palette, and the Feedback dialog. The
  phone frame holds the palette and the Feedback dialog too.
- `../shell/ui/Overlay.tsx`: `OverlayHost`, `useLayerFocus`, and
  `useDismiss`, the layer of sheets and dialogs, and `useModalLayer`, which
  every sheet and dialog uses. Escape closes only the newest layer. Its
  optional `returnFocus` names a trigger that a render can replace, such as
  the row of a phone menu sheet.
  `../shell/ui/screen-focus.ts`: `requestScreenFocus`, the focus of a new
  screen after a layer closes with a move, which the main area of a
  desktop frame takes through `useScreenFocus`.
- `../shell/new-workspace/NewWorkspaceHost.tsx`: `NewWorkspaceHost`, the
  New workspace dialog of a desktop frame, and `useNewWorkspace`, the one
  way that each place opens New workspace as the dialog or the page.
  `NewWorkspaceDialog.tsx`: the dialog.
- `../shell/new-workspace/useNewWorkspaceForm.ts`: the form that the page
  and the dialog share: the repository, the notices, the readiness, and
  the send. `parts.tsx`: their repository menu. `waiting.tsx`: the notice
  of a repository that waits for its build.
  The model of each form is the `owner` of its chip field. The shared chip
  field supplies their focus handle. `CaretAtEndPlugin`
  restores the saved caret position when keyboard focus enters. Without a
  saved position, it puts the caret at the end. It lives in
  `../chat/components/chip-field/focus-plugins.tsx`.
- `../chat/components/send-key.ts`: `useSendKey`, the send key of every
  composer.
- `feedback-model.ts`: `FeedbackModel`, which `AppModel.feedback` holds.
  `open` takes the org, the workspace, and the `desktop` flag of the page,
  and reads the reply address. `readReply` reads it again, for Try again.
  `canSend` is the readiness of Send. `addScreenshot` takes a screenshot
  that the dialog has already checked. `send` gives true only for an
  accepted send. `feedback-state.ts`: `FeedbackState`, what the dialog
  shows, and `FeedbackScreenshotInput`. `api/read-feedback.ts`:
  `readFeedback`, the strict reader of the reply address. The send uses
  the `ignore` reader for its 204. [Data lifecycle](data-lifecycle.md)
  gives the rules of the draft.
- `version.ts`: `APP_VERSION`, the stamp of `../../build-version.ts`, which
  both Vite configs define.
- `dev/feedback-routes.ts`: the feedback routes of the dev fake, with the
  `feedback` option of `dev/options.ts`. `feedback-model.test.ts`,
  `feedback-lifetime.test.ts`, and `dev/feedback-routes.test.ts` check
  them, with `feedback.test-support.ts`.
- `screenshots/screenshot-intake.ts`: `ScreenshotIntake`, and
  `screenshotIntake(app)`, the one intake of each app. It takes the files
  of a pick, a paste, or a drop in order, checks their first bytes, removes
  their metadata, and keeps the 7 MB limit. `IntakeState` and
  `RefusedScreenshot` give what the dialog shows.
- `screenshots/strip-metadata.ts`: `stripMetadata`, the removal of the
  metadata of a `CheckedImage`, and `toBase64`. `png-metadata.ts`,
  `jpeg-metadata.ts`, `webp-metadata.ts`, and `gif-metadata.ts` hold the
  parser of each format, on the helpers of `image-bytes.ts`, whose
  `UnreadableImage` marks a broken file. `strip-metadata.test.ts` and
  `screenshot-intake.test.ts` check them, with `images.test-support.ts`.
- `../shell/feedback/`: `FeedbackLayer`, the layer of each frame, and
  `FeedbackDialog`. `FeedbackFacts` draws the context line, the reply line,
  and a failed read. `ScreenshotChips` draws the chips.
  `screenshot-input.ts` gives `pastedFiles` and `useScreenshotDrop`.
  `FeedbackDialog.test.tsx` mounts the dialog in happy-dom, with
  `feedback-test-kit.tsx`.
- `../shell/ui/Dialog.tsx` and `Sheet.tsx`: their optional `initial` names
  the part that takes the focus as they open. The Feedback dialog passes
  its message box. `Sheet` puts its content in the scrolling `.body` of
  the mockup sheet.
- [feedbackCopy.ts](../../docs/mockups/src/components/feedback/feedbackCopy.ts):
  the words of the row, the dialog, and the toast that the app and the
  mockups share.
