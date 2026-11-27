# Chat history

This page belongs to [Chat and events](chat-and-events.md#events). It
states how the stored history of a workspace keeps agent messages, tool
calls, and file reports. The terms are those of the
[architecture doc](../architecture.md#terms).

- When an agent message or a tool call has ended, the stored history can
  leave out its earlier text or states. The chat still shows it at the
  place of its first event, in its final form.
- Reason: the final form holds the whole content. So a replay gets smaller,
  and the chat loses nothing.
- Of the [file reports](file-reports.md), the stored
  history keeps each tree delta, the newest full tree, the newest full
  changes list, and the newest [changes delta](changes-deltas.md) after
  that list. It can drop each earlier full tree and each earlier full
  changes list.
- A new changes delta replaces the earlier changes delta in the stored
  history. A new full changes list replaces both.
- Reason: earlier changes lists can fill most of the stored history and of
  the memory that its replay needs (Cal, 20 November 2026). A history
  without the earlier tree deltas, which needs one more index, and a
  history without the file reports that older apps need, were rejected. A
  tab that misses a changes delta reads the list again, as
  [In the browser](changes-deltas.md#in-the-browser) says.
- A replay to a socket that does not name the delta form sends the newest
  changes delta as the complete changes list at that delta, with its event
  number, as [Events](workspace-events.md#events) says. When the workspace
  no longer holds that list, such as after a move to another repository,
  the replay leaves that event out.
- Reason: the history holds no earlier changes delta to send, and a
  replay already leaves out each event that the history dropped.
