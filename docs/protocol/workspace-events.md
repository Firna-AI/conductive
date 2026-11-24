# Workspace events

This page belongs to [Chat and events](chat-and-events.md#events). It
states how the events of a workspace reach each tab, how a new tab gets
the current state of a workspace, and what a tab keeps. The terms are
those of the [architecture doc](../architecture.md#terms) and of
[Terms](#terms) below. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A state
read decision number, such as state read decision 1, names a decision of
the change that gives a new tab the state of a workspace from reads.

## Terms

- **Tab:** one open copy of the app, in a tab of the browser or in the
  window of the Mac app.
- **Event number:** the number of an event that a workspace stores. The
  numbers start at 1 and follow the one order of the events of the
  workspace.
- **Stream:** the events of a workspace after an event number, in event
  order. Each stream uses its own connection. The chat, the Files lists,
  and the rest of the workspace, such as its header, its notices, and its
  tools, each follow their own stream: the chat stream, the Files stream,
  and the workspace stream.
- **Full replay:** a stream after event 0. It sends the whole stored
  history of the workspace.
- **Read:** a request of a tab for the current state of one part of a
  workspace. The workspace read is the read of the workspace itself. The
  two Files reads are the reads of the file tree and of the changes list.
- **Cutoff:** the event number through which a read gives the state. A
  stream that starts after the cutoff loses no event.
- **Open failed repair:** a failed repair whose notice has not ended, as
  [Notices of a failed repair](#notices-of-a-failed-repair) says.

## Events

- The browser gets chat events only in the app's own event type. No SDK
  event type and no provider event type reaches the browser.
- Reason: one event type serves both agents, and the web app needs no
  change when an SDK changes its events.
- Every open tab of a workspace gets the same events in the same order.
- A tab that shows a session gets the newest part of its stored history
  first. The live events start after that part, and the earlier history
  loads above it (decision 280).
- Reason: the newest messages and the work of a running turn show after
  one read, also in a long session. Live events after the full history
  were rejected, because a long session then showed nothing new until its
  whole history had loaded.
- A connection opens before its stored history comes. One connection
  sends at most about 8 MB of stored history. Then the workspace closes
  it, and the tab connects again after the last part that it got.
- Reason: the stored history of a connection waits in the memory of the
  workspace until the tab reads it, and that memory has a fixed limit. A
  replay of the whole history on one connection was rejected, because a
  long history then stopped the workspace.
- The chat shows each event of a session once and in event order, also
  when earlier history arrives after newer events.
- While the earlier history loads, the chat says so above the messages
  that it shows.
- The Durable Object of the workspace stores the chat history, so the chat
  survives a stop of the sandbox. [Chat history](chat-history.md) states
  what the stored history keeps.
- A tab keeps the chat of each workspace that it showed in memory. A
  return to that workspace shows the chat at once, then gets only the new
  events (decision 87).
- A reload or a new tab starts empty. No chat stays on the disk of the
  device.
- A cache on the disk was rejected, because the chat, with its code and
  any secret that an agent printed, would stay on the device.

## The state of a new tab

- When a tab shows a workspace that it does not keep, it gets the current
  state of the workspace from reads, not from full replays. This holds
  for a new tab, a reload, and the first show of a workspace in a tab
  (state read decision 1 B).
- The workspace stream starts after the cutoff of the workspace read.
- The Files stream starts after the smaller cutoff of the two Files
  reads. Each Files list takes only the events after the cutoff of its
  own read. This holds also for the failed repair of the list and for its
  repository.
- Reason: a tab needs only a few current values from the history. Two
  full replays for each new tab, of the workspace stream and of the Files
  stream, were rejected, because each replay of a long history costs the
  workspace memory and time. A stream from the newest event with no read
  of the state was rejected, because the tab then loses the list of
  listening ports and the notices of failed repairs.
- The chat keeps its own read of the newest part of the history of each
  session, as [Events](#events) says (decision 280).
- Besides the workspace itself, the workspace read gives this state at
  its cutoff:
  - the newest list of listening ports, or no list when the workspace has
    no report of its ports, such as after the sandbox stops
  - the newest skills report, or none
  - each open failed repair of the workspace name, the start steps, and
    the list of listening ports, with the time of its first failure
- After a failed repair of the skills report, the workspace keeps a
  skills report with no lists. The list of `/` in the composer then says
  that the list of skills is unavailable, as
  [The list in the workspace](skill-mentions.md#the-list-in-the-workspace)
  says. No other notice shows.
- Each Files read gives, at its own cutoff, its list, the open failed
  repair of that list, and the repository of the workspace. When the
  workspace has no report of that list yet, the read still gives its
  cutoff, its failed repair, and the repository.
- Each read gives its state together with its cutoff. The state includes
  each event through the cutoff and no later event.
- A read never leaves the state out to answer sooner. When the workspace
  must first rebuild the state from its stored history, such as after a
  change by an older Worker that does not keep this state, the read waits
  for the rebuild.
- The rebuild does not stop the chat or the reports of the agent runner.
- Reason: a read without the state sends the tab back to a full replay.
  Cost: the first read after such a change can wait for the rebuild.
- A read that fails with no cutoff, such as after a network error or a
  refused request, gives no state. When the tab still follows a stream
  after such a read, that stream starts with a full replay. After a reply
  of an older Worker without this state, the stream also starts with a
  full replay. The Files stream starts its replay as soon as either Files
  read gives no cutoff, even while the other read is pending.
- A Files read of a list that has no report yet answers that the list is
  unavailable, and it still gives its cutoff. That cutoff counts as the
  cutoff of the read.
- A failed Files read does not stop the updates of the other Files list.
  A report in the stream can fill the failed list.
- The device keeps none of this state on its disk, as
  [Web app](../architecture/components.md#web-app) says. So each new tab
  reads it again.

## Notices of a failed repair

- A notice of a failed repair shows beside the data that is out of date,
  as [Lost workspace updates](lost-workspace-updates.md) says. The notice
  gives the time of the first failure of its kind. A further failure of
  that kind keeps that time.
- The notice ends at the next complete report of its kind, or when its
  repair ends. A report that the workspace makes itself counts too. So
  the null list of listening ports at a stop ends the notice of that
  list.
- A failure after that end shows a new notice, with its own time.

## Kept workspaces

- Besides the chat, a tab keeps the state of each workspace that it
  showed in memory, such as its notices, its tools, and its Files lists.
- A return to a kept workspace gets only the events after the last event
  of each of its streams, also when the return reads the workspace again.
- Reason: a jump to the cutoff of a newer read would skip events that a
  kept part needs, such as the end of a preview.

## Older apps

- An older copy of the app, such as an older Mac app or an open tab of an
  older app, can still start its streams with full replays. The workspace
  keeps serving them, with the bound of each connection that
  [Events](#events) states (state read decision 1 B).
- Reason: the Mac app bundles its own copy of the web app, as
  [The page](desktop-app.md#the-page) says. So an older Mac app keeps its
  full replays until it updates.
