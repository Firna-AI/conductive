# Import on the Mac

This doc holds the requirements and the decisions in force for the side of
the Mac app in the import from Conductor. It covers the entry points, the
consent, the scan, the device operations, and the uploads. It belongs to
[Mac app](desktop-app.md), which covers the page, the window, and the
packages of the Mac app.
[Import from Conductor](conductor-import.md) states the list, the stored
work, the reservations, and the result. The terms are those of the
[architecture doc](../architecture.md#terms) and of
[Import from Conductor](conductor-import.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Entry points

- When the Mac app finds the database of Conductor on the Mac, it offers
  the import once, in a bar of the Mac app. The person can dismiss the
  bar. After a dismissal, the bar does not show again on that Mac.
- To find the database, the Mac app reads only whether the file
  `~/Library/Application Support/com.conductor.app/conductor.db` exists.
- The Mac app tells the Worker only that fact, over its device connection,
  so that the page can show the bar. A dismissal goes back to the Mac app
  the same way, and the Mac app keeps it.
- The bar names the current org. It gives no count of workspaces, because
  the Mac app reads nothing of Conductor before the consent.
- The Account page of the Mac app has the section Import from Conductor,
  below This Mac. The section names the current org.
- In the Mac app, the command palette offers Import from Conductor with
  the actions of the org, as [Actions](command-palette-actions.md#actions)
  says.
- Reason: the user asked for the settings and the palette as the ways in.
  The account is open to every member, so every member finds the import.
- The web app in a browser shows none of these entry points.

## Consent

- Before its first read of the data of Conductor on a Mac, the Mac app asks
  in an alert of its own.
- The page cannot answer the alert, because the page has no bridge to the
  Mac app (decision 62).
- The alert says what the Mac app reads. It also says that the Mac app
  sends the list of workspaces to Conductive, to show it in the app.
- The alert never says that the list stays on the Mac. Reason: the page
  gets the list through the Worker, as
  [What the Mac sends to the Worker](conductor-import.md#what-the-mac-sends-to-the-worker)
  says.
- Allow lets the Mac app read. The Mac app keeps that answer on that Mac,
  so a later scan there does not ask again.
- Don't Allow reads nothing. The import screen then offers Ask again,
  which shows the alert again.

## The scan

- A scan reads the database of Conductor in read-only mode. It changes
  nothing in the data of Conductor or in its worktrees.
- The database of Conductor has a private layout. A column that the scan
  does not find leaves its fact out, and it does not stop the scan.
- The scan reads these records:
  - each workspace: its local Conductor ID, its names, its branch, its
    state, the title of its pull request, and its folder
  - each repository: its Git remote, its name, and its default branch
  - each session: its title, its agent, its model, and the ID of its
    memory file
- It reads no message row of Conductor, and no script or env value of
  Conductor.
- It finds the memory file of each session: a session file of Claude, or a
  rollout file of Codex, also a compressed one.
- It reads the Git state of each worktree for the size of its upload. It
  builds no Git bundle and uploads nothing before Import. So the size of
  the commits can be an estimate.
- Reason: the scan must stay fast for many workspaces. The user's Mac
  held 36 such workspaces.

## Device operations

- The page asks the Worker for each operation of the import. The Worker
  sends the operation to the Mac app over its device connection, as
  [The device](desktop-commands.md#the-device) says.
- The Worker sends an operation only to the device connection with the
  sign-in session of the page that asks. A page in a browser starts none.
- Reason: the import reads the Mac where the person works. Each user has
  one device connection at a time, so the device of the user can be
  another Mac.
- A scan asks the Mac app for the list. The Mac app answers with the list,
  or with the cause that stops it: no consent, no data of Conductor, or a
  failed read.
- An upload names the reservations of an import. For each reservation, the
  Mac app builds the stored work and the old documents, and it gives the
  size and the SHA-256 of each part.
- The Worker then gives the Mac app one upload link for each missing part,
  as [Import uploads](access-and-security.md#import-uploads) says.
- While it uploads, the Mac app reports the stored bytes of each
  reservation. The Worker relays them to the page.
- At the end of each reservation, the Mac app sends its result: the files
  that stayed on the Mac, and the sessions that did not import.
- Each operation has an ID. Each message of the Mac app names the
  operation that it answers.
- The Worker accepts a message of the Mac app only for an operation that
  it sent over the same connection.
- Each message on the device connection holds at most 1,000,000 bytes, as
  for [Mac commands](agent-tools.md#the-request). A list or a result that
  does not fit in one message comes in several messages.
- When the device connection ends, its operations end. A scan then fails
  with Try again. An upload stops, and its reservations stay, as
  [Stopped uploads](conductor-import.md#stopped-uploads) says.
- No operation moves to a new connection by itself. Reason: a Mac settings
  change does the same, as
  [Settings results](desktop-commands.md#settings-results) says.

## The uploads

- The Mac app builds the stored work with Git, as
  [The stored work](conductor-import.md#the-stored-work) says.
- It uploads each part as an object of its own, with one plain HTTPS
  upload to the address of its link. It uses no multipart feature of the
  storage.
- Reason: another storage then needs only a new adapter at the Worker, and
  an older Mac app keeps working.
- It sends each part only to the address of its link. It sends no cookie
  and no other credential with the part.
- When a link expires before its upload, the Mac app asks for a new link.
- The page never gets an upload link or a byte of the upload.
- An upload runs while the Mac app runs and its device connection stays
  open. A quit, a sleep, or a lost connection stops it, as
  [Stopped uploads](conductor-import.md#stopped-uploads) says.
