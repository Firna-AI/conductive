# Messages and attachments

This doc holds the requirements and the decisions in force for the messages
of a session. It belongs to
[Chat and events](chat-and-events.md), which covers the agents, the
sessions, what the chat shows, and the events.
[Message attachments](message-attachments.md) holds the files that a
message carries. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. An own endpoint decision number names a decision of the change that
adds the own endpoint logins, as [Tokens and secrets](tokens-and-secrets.md)
says.

## Messages

- The composer chooses the model and the effort of each message, and with
  the model its agent (decision 19).
- A change to another model of the same agent stays in the session
  (decision 51).
- A model of the other agent opens a new session with that agent, and the
  draft moves there with its files.
- Reason: neither SDK can switch agents inside one session. A hand-over of
  the transcript to the other agent was rejected. The user chose the way
  that Conductor works.
- When the login of the starter cannot be used, a message of another member
  starts a new session on that member's own login (decision 115). The same
  happens when the starter does not share the login (decision 116). A Try
  again of another member does the same. A login cannot be used, for
  example, after the starter leaves the org or removes the login.
- The workspace checks the login of the starter again when it accepts each
  message. When the member has no login for the agent either, the workspace
  refuses the message and starts no session.
- The new session has none of the earlier history. Its record names the
  first session in `sourceSessionId`, and the chat links to it. The first
  session keeps its history and its login.
- A copy of the first conversation, and a move of the first session to
  the login of the member, were rejected.
- The reply to a message or a Try again carries the record of the session
  that took it. A repeat of the same message gets the same session.
- The session record shows the result of the last login check in
  `loginAvailable`. Each tab gets a changed result. The check does not ask
  the provider whether it accepts the login.
- The same check shows in `loginShared` whether the starter shares the
  login with the other members. Every member reads the same value. Each tab
  gets a changed value. `loginAvailable` stays true for a login that only
  the starter can use.
- The workspace does not watch the logins or their share settings for
  changes. So a tab can show an old result until the next check.
- When the record already shows that the login of the starter cannot be
  used, or that the starter does not share it, the composer of another
  member says before the send that the message starts a new session. When
  that member has no login for the agent, the composer shows the notice of
  a missing login instead.
- Reason: the composer shows before the send which login a message uses. A
  record without the share setting was rejected, because the composer then
  names the login of the starter until the send.
- When a message runs on the login of another member, the composer names
  that member inside the message box, such as "Priya's login". A line under
  the box was rejected, because the box then moved between sessions.
- The label names an own endpoint login in the same way, such as "Priya's
  login". A label that names the host of the endpoint was rejected, because
  the members of an org trust each other with their logins (own endpoint
  decision 5).
- The composer names no login when a message runs on the user's own login.
  A name for the own login was rejected, because it tells the user nothing
  new.
- The composer attaches files to a message, as [Attachments](#attachments)
  says.
- [The send key](create-a-workspace.md#the-send-key) gives the key that
  sends a message from the composer (decision 143 of PR #73).
- The composer shows a notice when the user has no login for the agent of
  the chosen model (decision 33). It shows no such notice when the message
  runs on the login of another member.
- The first message of a new workspace creates the workspace, as
  [Create a workspace](create-a-workspace.md)
  says. The app accepts that message before the sandbox is ready
  (decision 14).
- A message from the agent tools follows these rules. Its text ends with
  the lines of [The `Sent by:` line](session-calls.md#the-sent-by-line).
- The app also accepts a later message while the sandbox is not ready
  (decisions 14 and 130). Examples are the first start, a resume, and the
  error state of a failed first start.
- The workspace keeps such a message, and gives it to the agent when the
  sandbox is ready. The agent of each session gets these messages in the
  order that the workspace accepted them (decision 130).
- A message that waits for the sandbox shows no label of its own. A label
  under each such message was rejected, because the start steps, or the
  bar of a failed first start, already show that the sandbox is not ready.
- A queue in the browser was rejected, because a closed tab would lose the
  message.
- Reason: a failed first start keeps its workspace and its queued messages,
  as [Create a workspace](create-a-workspace.md#a-failed-first-start)
  says. So members can add work at once, and an accepted message survives
  a reload of the tab. A hold of later messages in the composer until the
  first start succeeds was rejected for these reasons.
- While the login of the starter can be used, a message that the starter
  sends during a turn joins that turn. A message of another member joins it
  too while the starter shares the login. Such a message goes to the agent
  at once, unless files must reach the cloud computer first, as
  [Attachments](#attachments) says. The agent reads it at its next tool call.
- The composer uses its placeholder to show that a message steers the
  running turn. It shows no steer hint under the message box.
  Reason: a hint under the box moves it when the user starts to type.
- In a turn without tool calls, the agent reads such a message when the
  turn ends.
- A message that the workspace accepted stays in its session, also when the
  login of the starter is gone later. The same holds for a message of
  another member when the starter stops sharing the login later. A turn
  that needs that login then fails and names the cause. Try again can then
  start a new session.
- Stop interrupts the running turn. The chat shows an interrupted turn as
  stopped, not as an error.
- The chat names the member who pressed Stop: "Priya stopped the agent",
  or "You stopped the agent" to Priya (decision 72). The workspace
  records that member when the Stop request arrives. The runner cannot
  set it, because agent code runs on the same cloud computer.
- A turn that stops with no Stop request, such as when the cloud
  computer stops, shows "The agent stopped".
- While the login of the starter can be used, the next message of the
  starter after a stop continues the same session. The next message of
  another member does the same while the starter shares the login.
- A turn that fails names the cause, and Try again retries the turn.
- Try again can retry only the newest turn of a session, and only when that
  turn failed (decision 97). It sends the retry message that the failure
  names.
- The session record names that message in `retryMessageId`. In every
  other case, the field holds null, also after a refused end. Each tab gets
  the record from the session routes and the `session.updated` events.
- A message or a Try again that starts a new session also sets
  `retryMessageId` of the first session to null.
- The chat shows Try again only on the failed turn whose retry message the
  record names.
- The retry route refuses each other message of the session with HTTP 409
  and the error code `retry_not_available`. The chat then says in plain
  words that only the newest failed request can run again.
- Reason: a tab that missed newer events can still show an older Try again.
  A check in the chat alone was rejected, because such a tab could send an
  older message again. The agent would then answer out of order.
- For a workspace with no name, the app asks a small model of Workers AI
  for a title after accepting its first message (decision 184). The request asks
  for three to five words. Workers AI is the model service of Cloudflare,
  on the account that hosts the app.
- The model writes the title from the text of that message. It leaves out
  the `---` line and the `Sent by:` line of a message from the agent tools.
  Reason: the title names the task, not its sender. The request holds no
  other data of the workspace. It uses no agent login of a member. The
  chat does not show it.
- The reply to the message does not wait for the title. The workspace
  then takes the title as its name, as
  [Workspace and session names](agents-and-sessions.md#workspace-and-session-names) says.
- When the request fails, the name of the workspace does not change. The
  app then asks again when it accepts the next message with text in the
  workspace. It asks only while the workspace has no name.
- A later request also uses the text of the first message. Only when the
  first message has no text does it use the text of the message that
  starts it.
- A first message with no text starts no request. The next message with
  text in the workspace then starts it.
- Reason: the name shows within seconds, while the sandbox starts, and the
  operator chooses the model and its speed.
- A request in the sandbox on the agent login of the member was rejected.
  The name then waits for the sandbox, and each title spends the
  subscription of the member.
- A Claude model with an API key of the operator was rejected, because it
  sends each first message to another company. A name from the first
  words of the message, with no model, was rejected, because such names
  are weaker.
- The request also asks for plain words with no underscores (decision 255).
- The app changes each underscore of the answer to a space. The title then
  follows the rule of a title from a message, as
  [Sessions](agents-and-sessions.md#sessions) says. So each run of spaces
  becomes one space.
- The title keeps its hyphens and its letter case, because words such as
  "sign-in", "GitHub", and "iOS" need them.
- This rule covers only a title that the model writes. A session title from
  a member's message keeps its underscores. A name from a create call keeps
  them too, as [Create and list calls](agent-tools.md#create-and-list-calls)
  says.
- Reason: the model writes names such as `add_conductive_app`, also when
  the request asks for spaces. A change of the request alone was rejected
  for that reason.
- A larger model was rejected, because no model is sure to keep the format,
  and each title then costs more and takes longer.
- A change of the shown name only was rejected, because the stored name
  then keeps the underscores. A refusal of a title with underscores was
  rejected, because the workspace then stays "Untitled".
- A split of a one-word title at each hyphen, dot, and slash was rejected,
  because it changes names such as "Node.js".
- The same rule for a session title from a member's message was rejected,
  because a member can write `user_id` on purpose.
- A title that keeps a word with underscores from the first message was
  rejected, because the name then holds underscores that no member asked
  for. A member who wants underscores names the workspace with Rename.

### Messages from the bar

- An [agent action](github-banner.md#agent-actions) of the pull request bar
  sends its fixed prompt as a message of the member who clicks, to the
  session that the member saw last, with its model and effort.
- It follows each rule of a message from the composer, and the draft stays
  as it is. The chat shows it as a message of that member, with no mark of
  the action. Reason: an action is a message (decision 220).

## Attachments

[Message attachments](message-attachments.md#attachments) states the size
limit, the upload, the storage, the copy into the cloud computer, and the
deletion of the files of a message.

## Workspace links

[Workspace links](workspace-links.md) states how each composer, sent message, and agent answer shows workspace links.
