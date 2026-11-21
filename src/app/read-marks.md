# Read marks

This page is part of the [web app guide](README.md). It gives the rules
of the read marks of an open workspace. [Data lifecycle](data-lifecycle.md)
gives the other rules of the data that the screens read and write.

- Output that an open, visible workspace shows counts as read. The read
  mark tells the Worker the last event number that the user saw.
- Each kept `WorkspaceModel` owns one `WorkspaceReadMarks` for all its
  visits. It follows two numbers, not the `unread` state of the workspace,
  and a close keeps both. The shown number is `last` of the event stream: the
  stream has applied the complete state through that number. The confirmed
  number is the newest mark that the Worker accepted.
- While the shown number is above the confirmed number,
  `WorkspaceReadMarks` sends a mark through the shown number. One request
  runs at a time. When the shown number rises meanwhile, the next request
  takes the new number, after a short wait. A failed request tries again
  after a longer wait. An open sends a mark that is still due, also without
  a new event.
- An `unread` detail becomes `ready` when the confirmed number reaches the
  shown number, and the shown number reaches the event number of the
  detail. A read or a Resume reply gives the detail its event number, and
  so does each stream event that changes it. So after a return, a read can
  show `unread` at a number that the stream has not reached. That detail
  stays `unread` until the stream reaches its number and a mark covers it.
  An unread list row changes with the detail.
- While the model is closed, the page is hidden, or the workspace is
  archived, `WorkspaceReadMarks` sends no new mark and keeps no timer. When
  the page shows again, the mark goes through the current shown number. A
  page without the focus still shows its output, so the focus does not
  count.
- An archived detail stops the marks until a Restore shows, also while the
  history replays records from before the archive. After a Restore, the
  next mark covers the output that came while the workspace was archived.
  A replay in pages moves `last` only after its final page, so a mark never
  passes output that a later page holds.
- Known limit: a request that never answers holds back each later mark,
  because the API client has no timeout.
