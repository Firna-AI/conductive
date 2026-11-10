# The command palette and feedback

These pages are part of [the mockup catalogue](catalogue.md).

## The command palette

`app/command-palette` shows the All tab of the command palette over the
list of Acme. Send feedback comes last among its actions. Its child pages:

- `app/command-palette/workspaces` has the Workspaces tab. Its
  `repository` variant has the menu of the repository filter, and its
  `archived` variant has the archived workspaces. Its `empty` variant has
  the Archived filter of `acme/marketing-site`, which holds no archived
  workspace, and the line that says where they show. Its `unavailable`
  variant has a workspace list that did not load: the notice with Try
  again fills the tab.
- `app/command-palette/actions` has the Actions tab over the list. The
  Help group ends the tab, with Send feedback. Its `workspace` variant has
  the tab over an open workspace, whose actions come first.
  Its `archived` variant has the tab over an archived workspace, as Priya,
  a member who is not an admin, sees it: Session history and Restore workspace.
- `app/command-palette/settings` has the Settings tab.
- `app/command-palette/search` has a search that finds a workspace and an
  archived one. Its states are child pages, which kept the paths of its
  saved states, so the page shows only its canonical screen:
  - `search/no-results` has a search without results.
  - `search/loading`, `search/unavailable`, and
    `search/repositories-unavailable` have a search for "new" while the
    repository names load, after the workspace list did not load, and
    after the repository names did not load. A spinner, or a notice with
    Try again, stands first in place of the workspace groups, and the
    actions and the setting that match follow. With an empty field, the
    All tab needs only the list. While the list loads, or after it did not
    load, the status part stands before Actions, in place of Recent
    workspaces.
  - `search/feedback` has a search for "feedback", whose only result is
    Send feedback.
- `app/command-palette/number-search` has a search that finds a workspace
  by its label, `W-395`, from decision 212. Its `number-part` variant
  finds each workspace whose label holds `39`, with the label before the
  name in each row.

In `search/unavailable` and `workspaces/unavailable`, the list behind the
palette on desktop shows the same failure, because it reads the same
workspace list.

## Feedback

`app/feedback` shows the Feedback dialog over the list of Acme, as Send
feedback opens it from the palette: a dialog on desktop, and a sheet on a
phone. Its canonical screen has a message and a pasted screenshot. Its
child pages:

- `app/feedback/states` has the empty dialog, as it opens without a kept
  draft. Its `no-reply-address` variant has an account without a primary
  verified email. Its `sending` variant has a send that runs, and its
  `failed` variant has a send that did not reach the server. Its `sent`
  variant has the toast over the list after a send.
- `app/feedback/reply` has the kept draft while the reply address loads,
  with a spinner on the reply line. Its `failed` variant has a read that
  did not reach the server: the notice of a failed read, with Try again,
  takes the place of the reply line. Send waits in both, and the draft and
  Cancel stay available.
- `app/feedback/refusals` has a capture of a page that the dialog did not
  add, because the screenshots of the message would pass 7 MB. Its
  `other-type` variant has a photo that is not a PNG, JPEG, GIF, or WebP
  image.

`user-flows/send-feedback` goes from the palette through a search, the
message, a pasted screenshot, and the send, to the toast.

`FeedbackDialog` in `src/components/feedback/` draws the dialog in the
`wide` layout of `ConfirmDialog`. Its message box holds the chips of
`AttachmentChips` above the text, and Add screenshots under it. A notice
under the box names a file that the dialog did not add, or a send that
failed. `FeedbackReply.tsx` beside it draws the reply line from the read of
the reply address, and the `LoadFailure` notice of a read that failed.
`feedbackCopy.ts` holds the words of the row, the dialog, and the toast, so
the app can share them. `SuccessToast` in `src/components/common/` draws
the toast after a send, where `FailureToast` draws its own.
