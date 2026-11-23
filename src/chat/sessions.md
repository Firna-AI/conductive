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
- Each session runs on its login: the personal login of a member, or the
  org login of the org, as
  [Messages](../../docs/protocol/messages-and-attachments.md#messages)
  says. A session takes the default login of its starter at its first
  message, and keeps it. The record names that login in `login`. An empty
  session has none yet, and an older record names none.
  [The default login](../../docs/protocol/org-logins.md#the-default-login)
  states the order, which only the server works out.
- When a message spends the login of another member, a label in the bar
  of the composer names that login, such as "Cal's login". The name comes
  from the session record, so a starter who left the org keeps a name.
  When a message runs on the org login, the label names the org, such as
  "Acme's login", for each member, also for the starter. A message on the
  reader's own login shows no label.
- A message in the reader's own session with no login yet takes the
  default login of the reader. `defaultLogins` of the account names it for
  each org and agent, and `newSessionLogin` of the app reads it. So the
  label names the org login while the server names it, also beside an own
  login of the reader, as while an admin turned on "Use for every member".
  An account that names no default login, from an older reply, leaves the
  own login of the reader.
- A message in the reader's own session needs the login of that session.
  The record's `loginAvailable` decides, because the account that the chat
  read can be older. A login that its starter keeps private still works
  for that starter. A message in the session of another member, who shares
  a login that works, or in a session on the org login, needs no login of
  the reader, so no Connect notice shows.
- While the login of the session cannot serve the reader, a message starts
  a new linked session on the default login of the reader. That is the
  case while the login of another starter is not available, or that
  starter keeps it private, or an older record names no starter. It is
  also the case while the org login of the session is not available, such
  as after an admin removed it, and while the own login of the reader's
  session is not available but the org login serves the reader. The
  record's `loginAvailable` and `loginShared` decide. The notice over the
  composer says so before Send, with the reason, and the composer offers
  no steering. Stop still ends a running turn. The reason names the owner
  of the login of the session: another member, or the org. It names nobody
  for the reader's own login and for an older record. The label names the
  login of the new session when that is the org login.
- The default login of the new session is the one that the server names.
  When the record says that this login cannot serve, the server named it
  before the record changed. After the org login, the own login of the
  reader serves while the app can use it. After the own login, the chat
  cannot know whether the org login serves, so it asks to connect.
- Without a login that serves the reader, the Connect notice shows in
  place of the notice of the new session, and Send is off. A login with an
  `unusableCause` of the account, such as a ChatGPT sign-in that OpenAI
  did not renew, counts as none. The shared `linkedCopy.ts` holds the
  words of the notice.
- The model picker of the composer follows the model list of the login
  that a message runs on: the list of the reader's own endpoint, or the
  last list of the org endpoint, which `orgModelList` of the default login
  gives (org login decision 3 A). In a session on the login of another
  member, it hides no model of the agent of the session, because the
  reader does not see the list of that member. A model of the other agent
  opens a new session on the default login of the reader, so it follows
  the list of that login. The picker keeps the current model of the
  session. `composerModels` in `state/session-login.ts` decides, with
  `offeredModels` of the app. The menu shows a favourite of the account
  only when the picker offers its model, so it leaves out each favourite
  that All models leaves out, as
  [Hidden favourites](../../docs/protocol/model-favourites.md#hidden-favourites)
  says. The favourite stays saved.
- An empty session of another member takes the default login of that
  member at its first message. Its record names that login in
  `defaultLogin` until then, while a login serves that member. So the
  composer of the reader follows it as the login of the session: the label
  names the org, such as "Acme's login", or that member, and the picker of
  the org login follows the last list of the org endpoint. A fixed `login`
  wins over `defaultLogin`. The reader's own empty session follows the
  default logins of the reader's account instead, as above. When the
  record names no default login, the record's `loginAvailable` and
  `loginShared` decide, as for the personal login of that member, so a
  message then starts a linked session. `loginOwnerName` in
  `../app/login-owner.ts` names the owner of each login, also for the line
  under the prompt of an automation.
- The reply of Send and of Try again names the session that took the
  message. The session record of the reply follows the
  [record order rule](loads-and-sends.md#record-order).
  The message waits as pending there until the stream or the history shows
  it, and a second reply with the same message adds nothing.
- Only the view that sent moves to the linked session: the tab that sent,
  or the popover of an explanation, for a follow-up and for Try again. It
  moves only while it still shows the session of the request. A user who
  opened another tab, or the popover of another explanation, during the
  send keeps it. The popover moves no tab, as
  [Explain](explain/README.md) says. `showTarget` in
  `state/linked-replies.ts` takes the view that sent: the shown tab by
  default, or a `SendingView`, such as the popover.
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
