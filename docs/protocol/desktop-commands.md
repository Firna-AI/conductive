# Permissions and Mac commands

This doc holds the requirements and the decisions in force for the
permissions of the page in the Mac app. It also states the side of the Mac
app in Mac commands. It belongs to [Mac app](desktop-app.md), which covers
the page, the window, the navigation, and the packages of the Mac app. The
terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A Mac
until-stop decision names a decision of the change that added Allow all
commands until I stop.

## Permissions

- The page runs in a sandbox, with context isolation and without Node. It
  has no preload script and no bridge to the main process (decision 62).
- Reason: a script in the page then has no more power than in a browser
  tab.
- Mac commands add no bridge and no permission to the page. The page has
  no direct access to the commands of the Mac.
- The page can only answer a request that waits. The answer goes through
  the Worker to the Mac app on the Mac that got the request.
- Only the main frame on the desktop origin can use a sanitized clipboard
  write. Reason: the copy actions of the web app need it.
- The Mac app denies every other permission to the page and its frames.
  This includes clipboard reads, notifications, the camera, the microphone,
  screen capture, and devices.

## Mac commands

This section states the side of the Mac app.
[Agent tools](agent-tools.md#mac-commands) states the requests, their
limits, their results, and what the chat shows.

### The device

- While the Mac app runs and is signed in, it registers its Mac as a
  device of its signed-in user (decision 62).
- The Mac app registers the Mac only while its user has app access. When
  app access arrives, it opens its device connection again, with no new
  launch, as [The waitlist screen](waitlist.md#the-waitlist-screen) says.
- The Mac app holds one device connection to the Worker, on
  `app.conductive.build`. The connection proves its user with the sign-in
  session of the Mac app.
- The Mac is available only while that connection is open. When the Mac
  sleeps, when the Mac app closes or signs out, or when the connection
  ends, the Mac is not available.
- Each user has one device connection at a time. A new connection replaces
  the older one. The requests of the older one end as not available.

### The request on the Mac

- On the Mac that got the request, the compact message in the chat offers
  Deny and Allow (decision 62). A menu beside Allow offers Always allow,
  Allow all commands for 15 minutes, and Allow all commands until I stop
  (Mac until-stop decision 0).
- A dialog over the app was rejected. Reason: the user chose a compact
  message in the chat, with the command and its actions.
- While a request waits, the row of its workspace shows needs input on
  every page of the Mac app. A click on that row opens the request
  (decision 68).
- When the Mac app is in the background, a notification of macOS tells of
  the request. The notification opens the workspace of the request.
- The notification comes from the Mac app. The page still gets no
  permission for notifications, as [Permissions](#permissions) says.

### The choices

- Deny: the command does not run.
- Allow: the command runs once.
- Always allow: the command runs. A later request with the exact same
  command text then runs on that Mac without asking (decision 62).
- Allow all commands for 15 minutes: the command runs. For 15 minutes,
  every later request from the same workspace then runs on that Mac
  without asking (decision 62).
- Allow all commands until I stop: the command runs. Every later request
  from the same workspace then runs on that Mac without asking, until
  Stop (Mac until-stop decision 0).
- Reason: the user asked that each command needs permission, with these
  choices. The user later asked for the choice until Stop, for work that
  needs more than 15 minutes.
- A grant is the permission of the 15 minutes or until Stop. It covers
  every command from one workspace on one Mac.
- Only Stop, a quit of the Mac app, or a sign-out of its account ends a
  grant until Stop (Mac until-stop decision 1). A sleep of the Mac and a
  new device connection keep it.
- Reason: a grant without an end must not outlive the run of the Mac app,
  so a forgotten grant ends at the next restart.
- A grant that ends with its turn, a long fixed limit, a saved grant that
  survives a restart, and a grant that a sleep ends were rejected. Reason:
  the user chose a grant that lasts until Stop, also across turns, and
  that a restart still ends.
- While a grant runs, the Mac app shows a bar on that workspace with Stop.
  The bar of the 15 minutes shows the time left. The bar of a grant until
  Stop shows Until you stop. Stop ends the grant at once.
- The bar of the 15 minutes also offers Keep until I stop. It turns the
  running 15 minutes into a grant until Stop (Mac until-stop decision 2).
- Reason: while a grant runs, no request asks, so the menu of the choices
  does not show. The user needs more time at the moment the 15 minutes
  run out.
- The command runs with the permissions of the user on the Mac, in the
  folder of the request.
- Risk: Always allow does not cover the folder. So an always-allowed
  command runs in any folder that a later request names.

### Saved choices

- The always-allowed commands and the grants stay only on the Mac. The
  Mac app decides from them. The Worker never stores them.
- The Mac app saves the always-allowed commands and the 15 minutes. It
  keeps a grant until Stop only in memory and never saves it (Mac
  until-stop decision 1).
- Reason: the Mac then decides what runs on it, and no record on the
  server can allow a command.
- The account page of the Mac app has a This Mac section. It shows the
  name of the Mac, whether the Mac is available, and each always-allowed
  command by its exact text, with Remove. It also shows each workspace
  with a grant, with the time left or Until you stop, and Stop.
- After Remove, the next request with that command text asks again.
- Remove and Stop revoke their permission in the current Mac app even if
  saving the change fails.
- The revocation stays in force for the rest of the app run, including a
  reconnect. A failed save can still restore an earlier permission after
  a full app restart.
- A failed save does not keep the revoked permission active in memory.
  Reason: a disk error must not leave a permission active after the user
  revokes it.
- The web app in a browser has no This Mac section.

### Settings results

- Each settings result identifies its operation and includes the current
  effective settings.
- Each settings change reports one outcome: done, done but not saved, or
  failed.
- Done means the change took effect and was saved. Done but not saved
  means the change took effect in memory and the save failed.
- Failed means the change did not take effect. Both failure outcomes
  explain the failure.
- A successful settings read reports done.
- Keep until I stop reports done or failed, never done but not saved.
  Reason: the Mac app never saves a grant until Stop.
- This Mac shows the result of each control. The bar shows the result of
  Stop even when the grant no longer runs. It shows the result of a Keep
  that failed while the grant runs.
- A failure stays until the next change of that control, also after a
  read or a new device connection.
- When the original control is gone, Try again can repeat that change.
  The current Mac gets this new explicit action.
- A change that waited for an older connection reports failure after a
  reconnect. It never goes to another connection by itself.
- Reason: the user must see whether a permission changed and can try the
  same action again without restarting the app.
- If a full settings result exceeds the device message budget, the Mac
  returns a small failure with the same operation ID and the size cause.
- That failure keeps the connection, saved commands, and running commands
  active. It adds no limit to saved settings.
- Reason: a large settings list must not interrupt command execution or
  cancel a command.
