# Data lifecycle

This page is part of the [web app guide](README.md). It gives the rules
of the data that the screens read and write.

- A screen asks for the org parts that it shows, as in
  `useEffect(() => org.watch('repositories', 'list'), [org])`. A part
  reads when its first screen mounts, each time that the user comes back
  to the page, and on a timer while a screen shows it. The last screen
  that leaves stops the timer. Screens that show a part share its reads.
- The timer is short while a row works, needs input, or starts, while the
  last run of a routine waits, starts, works, or needs input, or while a
  build runs. Otherwise it is slow, so that changes from other tabs and
  other people show. Repositories and the members read at entry and at
  focus only. The waits are choices of the app, not product
  limits.
- Each part is a `Resource`. A screen sees the answer of the newest read,
  then the changes that the server confirmed after that read started, such
  as events, then the waiting writes in the order that they went out. A
  read that started before a change keeps the change. A failed read keeps
  the value that shows. A part can name the errors that prove that its
  value no longer exists, as the routine page does for `routine_not_found`.
  Such a read shows its error also over the value.
- The routine page reads its routine when it mounts and at each return to
  the page. Each field that the owner did not change takes the field of the
  newer routine, and an edited field keeps its edit. A save sends only the
  fields that the owner changed, so it keeps a turn-off that the app made
  during the edit. Its answer is the whole routine, and the Routines list
  takes it at once, with the last run that the list has. A delete takes
  the routine out of the list, and a later visit of its address reads it
  again.
- A read of the routine that gets `routine_not_found` shows that the
  routine is not available, also in place of a routine that shows. Any
  other failed read keeps the routine. The other requests of the page go
  through one client of the routine: the reads of the runs, Show older
  runs, Save, Turn off, Run now, and Delete. When one of them gets
  `routine_not_found`, the routine reads again, after the read that runs,
  if any, and that read decides. A write can get that refusal also while
  the routine exists, so the refusal alone decides nothing.
- The Runs list of the routine page shows a number of pages of 50 runs:
  one at first, and one more after each Show older runs. It reads them
  when it shows, every 10 seconds while it shows, and at each return to
  the page. Each read gets that many pages from the newest run, one after
  the other, and replaces the whole list. So the list has no gap, and each
  row shows the state of the last read. When new runs arrive, the oldest
  rows move behind Show older runs. Show older runs reads the page after
  the oldest run that the list shows, and adds it at once. A read that
  started before keeps that page only while its own pages end at the same
  run. Run now shows its run first at once, and the Routines list takes it
  as the last run. A later read of the runs brings its next state.
- The chat reads the routine of a run workspace, with the pull request of
  its run, with the saved view, at each load of the chat. The header shows
  them until the next load.
- A list write shows its change at once, and a failure takes back that
  change only. An answer confirms only the fields of its write: a move
  answer sets the section of the workspace, not its state. A workspace
  record from an event, an open, Archive, or Restore keeps the place of its
  row, because only a read of the list and a move change the place.
- A save can answer with the whole value, such as the repositories or
  computer settings. Its answer counts from its arrival. A read that
  started before it changes nothing.
- The saves of one value go out one at a time. The next save starts after
  the answer of the one before, because an answer carries no order of its
  own. A failed save rejects only its own caller, and the next save goes.
  List writes do not wait for each other.
- A repository save adds or removes that repository only. It keeps the
  choices from other saves and other clients. The save queue keeps an add
  before a later remove of the same repository.
- Each repository save and each save of the install script reads the
  builds again, because an add starts a build, and each of these saves
  changes `BuildsResponse.changes`.
- A read or a Resume reply carries the event number of its state. It shows
  only when no newer state has shown, from the stream or another reply.
  After it, an older stream event changes nothing. A new owner, an
  Archive, a Restore, or a cleared unread state carries no number. Each
  shows at once and stays over the reply of a pending Resume. A reply
  after close changes no workspace state.
- Archive and Restore raise `updatedAt`, also at the same clock, and
  `archivedAt` can repeat. So a record from the other side of an Archive
  or a Restore shows only when its `updatedAt` is newer, whatever its
  source. A reply of Archive or Restore changes only its own fields, and
  only when it is newer, so a later Archive, Restore, or Resume stays.
- A record below the `updatedAt` of the newest Archive or Restore that
  shows changes nothing, also on the same side of the boundary. So a
  replay of an older active record cannot open the way for the older
  Archive after it. The Worker never lowers `updatedAt`, so each newer
  record passes.
- An open workspace follows the Archive and Restore records that the org
  list confirmed, in both directions, and a newer record of an archived
  workspace, such as the end of its Restore. So none of them waits for the
  event stream. It also checks the list when it opens, and before a read
  or a Resume reply shows. A known Archive or Restore stays over an older
  open or Resume reply. An Archive or a Restore while the first read of an
  open waits makes that open resume nothing. A failed read then keeps the
  detail of that change, and the visit follows the event stream. With no
  read before it, the stream replays from the last number that the model
  applied. A first read that fails with no such change shows its failure
  and follows nothing.
- A workspace event applies its saved public error with the workspace
  state. An older event without the error keeps the current error. An
  explicit null clears it. Event errors carry no log, so the model keeps
  a null log for them.
- A create request lives in `OrgModel.creations` until it answers. A
  sign-out, or a sign-in of another person, ends every request that still
  runs. A failed first start keeps its workspace in the list.
  [Creation recovery](creation-recovery.md) gives the rules.
- The invitations of the user read at the first show of `/` for that user,
  through `AppModel.invitations`. The first load and the other addresses
  never wait for them. A failed read shows on `/` with Try again and
  Continue to workspaces, and keeps the user signed in. Only Accept
  invitation joins an org. The joined org goes to the list of orgs and
  opens, and Get started reads again. A sign-out, or a sign-in of another
  person, forgets the invitations, and an answer for the person before
  changes nothing.
- `AppModel.feedback` keeps the feedback draft, the reply read, and the
  snapshot of a failed send in the memory of the tab, and in no browser
  storage. A close keeps them. A sign-out, a sign-in of another person,
  or a move to the waitlist clears them, and an answer for the person
  before changes nothing.
- Each open of the Feedback dialog reads the reply address again, and
  shares a read that still runs. While that read loads or after it failed,
  the draft stays and `canSend` is false. `readReply` reads again, for Try
  again. A ready reply without an address still allows a send.
- The first send of a draft keeps a snapshot: the text, the content of each
  screenshot, the org, the workspace, the Mac app flag, and the app
  version. A retry sends that snapshot with the same draft ID, also after a
  close. An edit of the text or the screenshots drops the snapshot, so the
  next send takes fresh values. While a send runs, a close or an edit does
  nothing, and a second send shares the request.
- `send` gives true only for an accepted send of the current person. It
  then closes the dialog and clears the draft, and a later edit starts a
  new draft ID. A failed or stale send gives false.
- `screenshotIntake(app)` keeps one `ScreenshotIntake` for each app. It
  holds the files that it still reads, and their notices, in the memory of
  the tab. A file that it still reads joins the draft after a close. A
  change of the person drops the waiting files and the notices.
- The reply of the session says whether the person has app access.
  Without it, the first load reads only the waitlist state, and the boot
  is `waiting`. The waitlist reads the invitations of the person at its
  first show.
- The waitlist reads the app access again each time that the person comes
  back to the page, with the invitations. The reply of Use code holds the
  app access, and an Accept reads the waitlist state again. No timer reads
  it. A read at a return waits for no running use of a code or Accept, and
  a failed read there changes nothing.
- When app access arrives, the address changes first, while the waitlist
  still shows: `/` after a code or an approval, and the org after an
  Accept. Then `AppModel.admit` reads what every screen shares, and the
  app opens. A failed read shows that the app did not load, with Try
  again. A new start, a sign-out, or the open of the app makes an older
  answer of the waitlist change nothing.
- The invite code of the account reads each time that the Account page
  opens, because its uses change while the page is closed.
- The tab keeps the `WorkspaceModel` of each workspace that it showed, for
  the signed-in user, as
  [The kept workspace](../shell/workspace/README.md#the-kept-workspace)
  says. A return opens the model again, and its stream starts after the
  event number that it reached. A sign-out, or a sign-in of another user,
  closes and forgets every kept model.
- An open reads the workspace detail, shows it, and starts the read marks
  and the event stream. Only then does a stopped workspace, or one whose
  later start failed, get its Resume. A failed first start waits for Try
  again. So a refused or failed start keeps the detail and the stream, and
  `startError` of `WorkspaceModel` holds the error. A manual Resume still
  rejects for its caller.
- A `user_suspended` refusal holds only while the owner stays the same. A
  new owner in the detail, or from `reassigned(workspace)`, clears it. A
  late refusal for a former owner sets nothing.
- A suspended org takes no write except a leave. [A suspended
  org](suspended-org.md) gives how the app learns of it, from the org list
  or from an `org_suspended` refusal, and what its screens show.
- The settings of the cloud computer are one value of the org in
  `OrgModel`. Every opening of the Cloud computer tab shares them, so a
  save from a closed tab shows in the reopened tab.
- The Cloud computer tab follows the builds while it shows. The builds,
  not the settings, say which saved changes the org image lacks, in
  `BuildsResponse.changes`. They read again while a build runs and at
  its end, so the end of a build reads no settings.
- While the tab shows, `ComputerModel` owns one `BuildLogFollower` for the
  log of the newest build that runs or failed. A newer build replaces the
  follower, so an answer for an older build changes neither the log nor
  the timer. When the builds show the end of the build before the log
  does, the follower reads the final log. When this update arrives during
  an active read, the follower keeps it. After that read, the follower
  reads again, unless that answer already shows the new state.
- Each read of the follower gets the build details at `buildPath`: the
  build with its full log, in one answer. The follower takes the state and
  the lines from the same answer, never from two reads. The follower sends
  this read at the start, on its timer, for Try again, and when the builds
  show a new state. While a read runs, a new read waits for its answer and
  sends nothing. The Worker also serves an event stream of each build, as
  the [lifecycle routes](../../worker/lifecycle/README.md#browser-routes)
  say. The app does not read it.
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
  The list row changes with the detail.
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
- The chat, the GitHub views, the terminal tool, the preview tool, the
  workspace screen, the Files part, and the files development pages keep
  one store for each workspace through `useWorkspaceStore`. The hook makes
  the store, connects it after the render, and follows its snapshot. It
  stops the store at unmount. A switch of workspace stops the old store and
  makes a new one. The
  [tool README](../terminal/README.md#workspace-events) gives the rules of
  the tool store. The store of `WorkspaceScreen` is a view of the kept
  workspace, so its stop keeps the parts, as the
  [workspace integration](../shell/workspace/README.md#integration) shows.
  The `create` of the Files connection of the screen finds the store that
  the tab keeps for the workspace, as the
  [files integration](../files/README.md#integration) shows.
- A feature store that reads the raw socket messages itself, as the files
  do, follows the event source of the app through `replaySubscribe`. Each
  message reaches the store unchanged.
- When the connection drops, `replaySubscribe` opens again after the same
  growing wait as the ordered stream. The new connection starts after the
  last number that the store holds complete:
  - While more history pages come, the `nextAfterEventNumber` of the last
    page, capped at the cutoff of the replay.
  - After the final page, its cutoff.
  - After the replay, the newest live event.
- A live event during an unfinished replay moves no number. The store holds
  that event until the final page.
- `WorkspaceStream.reconnects` counts the replays that end after a dropped
  connection or a gap. A part that keeps its own reads, such as the
  member's GitHub access of the pull request bar, reads again at each new
  count. A start after a stop counts nothing.
