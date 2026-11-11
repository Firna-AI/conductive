# Notices of a failed repair

This page is part of the [workspace screen](README.md) guide. It says
when a bar below the header names workspace data that is out of date,
how the bar clears, and what Dismiss does.

The workspace name and the start steps belong to no chat session. The
workspace can refuse an update of one of them. After such a first loss, it
asks the runner for a fresh full report, and the screen shows nothing.
When the workspace refuses that report too, the repair failed. Then a bar
below the header names the data that is out of date, with the time since
the repair failed.
[Lost workspace updates](../../../docs/protocol/agent-runner.md#lost-workspace-updates)
gives the rules. The Files panel shows the notices of the file lists, as
[the Files screens](../../files/README.md#integration) say.

- `HeaderNotices` keeps these failed repairs. It is a store of its own,
  apart from `WorkspaceModel`. The tab keeps one for each workspace that it
  showed, as [The kept workspace](README.md#the-kept-workspace) says.
- Only a marker with `repairFailed: true` and no session adds a failed
  repair. A first loss adds nothing. The chat owns the markers of a session.
- Only a later full report of the same kind in the stream clears a failed
  repair: `workspace.title` for the name, and `start.updated` for the start
  steps. A report of another kind and `workspace.updated` clear nothing.
- A reply of a route clears nothing, such as the reply of Resume. Only the
  order of the stream shows that a report is newer than the failure.
- The notice of the start steps stays after the start ends, until a full
  report of the start steps.
- A further failure of a failed kind keeps the time of the first one.
- The bar of the name comes first, then the bar of the start steps. On
  desktop they sit above the session tabs. On a phone they sit above the
  pull request row, on every tab.

Place `<HeaderNoticeBars notices={notices} />` directly after the
header. It draws `notices.shown` with the CSS module of the
mockups' `LostUpdateBar` and the words of `lostCopy.ts`. Its Dismiss is the
shell's `IconButton`. The ages use the clock of `AppServices`, and they
move on every 30 seconds.

Dismiss hides a bar in the mounted view only:

- It sends nothing to the Worker, and the failed repair stays.
- A further failure of the same kind stays hidden.
- Each mount of the screen starts a new view with `newView`, so a return
  shows the bar again. A new tab reads the stored history, so it shows the
  bar too.
- A full report of that kind clears the failed repair. A failure after
  that report shows again, also in the view where Dismiss hid the bar.
