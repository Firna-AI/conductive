# Sessions, logins, and drafts

This guide belongs to [the chat](README.md). It gives the rules of the
draft moves, the login of each session, and the linked sessions.

- Each draft has an identity. When a model of the other agent moves the draft
  to a new session, its files that still upload and its send in flight
  finish on the draft there.
- The chat chooses the ID of that new session, so the draft moves in the
  same snapshot that first shows the session, from the stream or from the
  reply. A later record or reply never moves a draft again, so a tab that
  the user types in keeps its text. The reply then removes the sent files
  that the backend did not keep from the draft that moved, wherever it is.
- Each session runs on the agent login of its starter, the member who
  started it, as [Messages](../../docs/protocol/chat-and-events.md#messages)
  says. The line under the composer names that login: "Uses your Claude
  login", or "Uses Cal's Claude login" to another member. The name comes from
  the session record, so a starter who left the org keeps a name.
- A message in the reader's own session needs that session's login. The
  record's `loginAvailable` decides, because the account that the chat read
  can be older. A message in the session of another member, whose login
  works, needs no login of the reader, so no Connect notice shows.
- While the login of another starter is not available, or an older record
  names no starter, a message starts a new linked session on the reader's
  own login. The notice over the composer says so before Send, and the
  composer offers no steering. Without an own login, the Connect notice
  shows in its place, and Send is off.
- The reply of Send and of Try again names the session that took the
  message. The record of a linked session from the reply shows only while no
  other record of it came, so a record from the stream or an action wins.
  The message waits as pending there until the stream or the history shows
  it, and a second reply with the same message adds nothing.
- Only the tab that sent moves to the linked session, and only while it
  still shows the session of the request. A user who opened another tab
  during the send keeps that tab.
- The draft of the request moves with the view, in the same snapshot, with
  its identity, its text, its files, and its uploads. So a user who typed
  more during the send types on in the same box, and the next message goes
  to the session that holds the accepted one. The source gets a new empty
  draft.
- The draft stays when the source holds another draft now, when another
  send of the draft still waits, or when the linked session holds
  unfinished work. Then a source with unfinished work stays shown, and each
  draft keeps its work. The linked session loads its own history when it
  shows.
- A linked session starts with a line that links back to its source
  session. The link selects an open source, and reopens a closed one, with
  the actions of the tabs and the session history.
