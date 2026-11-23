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
  history keeps each tree delta, the newest full tree, and the newest
  changes list. It can drop each earlier full tree and each earlier changes
  list.
- Reason: earlier changes lists can fill most of the stored history and of
  the memory that its replay needs (Cal, 20 November 2026). A history
  without the earlier tree deltas, which needs one more index, and a
  history without the file reports that older apps need, were rejected.
