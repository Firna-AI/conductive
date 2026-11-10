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
  the value that shows.
- The routine page reads its routine when it mounts and at each return to
  the page. A save sends only the fields that the owner changed, so it
  keeps a turn-off that the app made after the read. Its answer is the
  whole routine, and the Routines list takes it at once, with the last run
  that the list has. A delete takes the routine out of the list, and a
  later visit of its address reads it again.
- The Runs list of the routine page reads the newest 50 runs when it
  shows, every 10 seconds while it shows, and at each return to the page.
  Show older runs reads the page after the oldest run that the list shows.
  From then on, the list keeps each run that it showed, and each read of
  the newest runs updates them, so a new run that pushes runs out of the
  newest page leaves no gap. Run now shows its run first at once, and the
  Routines list takes it as the last run. A later read of the runs brings
  its next state.
- The chat reads the routine of a run workspace with the saved view, at
  each load of the chat. The header shows it until the next load.
- A list write shows its change at once, and a failure takes back that
  change only. An answer confirms only the fields of its write: a move
  answer sets the section of the workspace, not its state. A workspace
  record from an event, an open, or Archive keeps the place of its row,
  because only a read of the list and a move change the place.
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
- A read or a Resume reply carries the event number of its state. It shows
  only when no newer state has shown, from the stream or another reply.
  After it, an older stream event changes nothing. A new owner, an
  Archive, or a cleared unread state carries no number. Each shows at once
  and stays over the reply of a pending Resume. A reply after close
  changes no workspace state.
- A workspace event applies its saved public error with the workspace
  state. An older event without the error keeps the current error. An
  explicit null clears it. Event errors carry no log, so the model keeps
  a null log for them.
- An admitted create stays in `OrgModel.creations` until its start ends.
  A failed start takes the workspace out of the list, and gives the first
  message back in a form of its own. A sign-out, or a sign-in of another
  person, forgets every create.
  [Creation recovery](creation-recovery.md) gives the rules.
- The invitations of the user read at the first show of `/` for that user,
  through `AppModel.invitations`. The first load and the other addresses
  never wait for them. A failed read shows on `/` with Try again and
  Continue to workspaces, and keeps the user signed in. Only Accept
  invitation joins an org. The joined org goes to the list of orgs and
  opens, and Get started reads again. A sign-out, or a sign-in of another
  person, forgets the invitations, and an answer for the person before
  changes nothing.
- The tab keeps the `WorkspaceModel` of each workspace that it showed, for
  the signed-in user, as
  [The kept workspace](../shell/workspace/README.md#the-kept-workspace)
  says. A return opens the model again, and its stream starts after the
  event number that it reached. A sign-out, or a sign-in of another user,
  closes and forgets every kept model.
- An open reads the workspace detail, shows it, and starts the read marks
  and the event stream. Only then does a stopped or failed workspace get
  its Resume. So a refused or failed start keeps the detail and the
  stream, and `startError` of `WorkspaceModel` holds the error. A manual
  Resume still rejects for its caller.
- A `user_suspended` refusal holds only while the owner stays the same. A
  new owner in the detail, or from `reassigned(workspace)`, clears it. A
  late refusal for a former owner sets nothing.
- A suspended org takes no write except a leave. [A suspended
  org](suspended-org.md) gives how the app learns of it, from the org list
  or from an `org_suspended` refusal, and what its screens show.
- The settings of the cloud computer are one value of the org in
  `OrgModel`. Every opening of the Cloud computer tab shares them, so a
  save from a closed tab shows in the reopened tab.
- The Cloud computer tab follows the builds while it shows. When the newest
  build ends, by any path, the tab reads the settings again, because the
  server changes them at a build, such as `needsBuild`.
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
- An archived detail stops the marks for the rest of its visit, also while
  the history replays records from before the archive. A replay in pages
  moves `last` only after its final page, so a mark never passes output
  that a later page holds.
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
  The `create` of the Files part finds the store that the tab keeps for the
  workspace, as the [files integration](../files/README.md#integration)
  shows.
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
