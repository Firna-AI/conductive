# Late secret requests

This doc holds the requirements and the decisions in force for a secret
request after the wait of its tool call ends. It covers late requests and
late answers. It belongs to [Secret requests](secret-requests.md), which
covers the requests, their time limit, and temporary values. The terms are
those of [Secrets](secrets.md#terms) and of the
[architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue-secrets.md) draws the late
requests at `app/secret-requests/late`.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. A needs-input decision names a
decision of the change that keeps each open request above the composer,
as [The request stack](request-stack.md) says.

## Late requests

- A late request stays in the [request stack](request-stack.md) of its
  session until a member answers it or it ends (needs-input decision 1 A).
  It keeps the choices of its card.
- Reason: each open request then waits at the composer with its choices.
  So a member finds the request that the workspace waits for, also in a
  long chat.
- A late request that leaves the composer for its place in its turn was
  rejected, because a member must then scroll up to find it. A line above
  the composer that scrolls to the request was rejected, because the
  member then answers far up the chat and scrolls back.
- A list of the open requests under Needs input in the workspace header
  was rejected, because it adds a place away from the composer.
- A line on it says that the agent stopped waiting, and that Allow tells
  the agent in a new turn.
- In the stack, it keeps the full form of its card. Reason: a member must
  see the command before the answer.
- It shows no age. Reason: a request shows no time limit, and its line
  already says that the agent stopped waiting.
- It brings back no Stop, because Stop follows the running turn.
- After its answer or its end, it leaves the stack at once and takes its
  place in its turn. A request that gets its answer in time does the same.
- At its place, a late request never folds into the work of its turn, so
  its answer and its line stay in view.

## Late answers

- When a member allows a late request, a line of the app tells the agent
  in the session that asked (secrets decision 10 B). This holds for Allow
  for this session, for a temporary value, and for Save as secret.
- The line names the member who answered and each secret, and it says
  what the answer gives. It never holds a value. It is not a message of
  the member who answered.
- The agent gets the same text, with the name of the member who answered.
  One shared function writes these words for the chat and for the agent,
  so the two texts cannot drift apart.
- The line starts a turn in that session. The turn acts for the sender of
  the turn that asked, under the login rules of that sender. So its GitHub
  token, its Mac requests, and the writes of its workspace tools follow
  that sender.
- When a turn of that session runs at the time of the answer, the line
  joins that turn, as a message does. That turn keeps its sender.
- The [wake](session-watches.md#delivery) of a watch follows these rules
  for its turn, its sender, and its login.
- When the line can start no turn, the app sends nothing. Examples are a
  starter who does not share the login with that sender, a login that is
  gone, and a sender who left the org.
- The late request then says that the agent learns of the answer at the
  next message. The grant of the answer stays.
- When the login of the session is gone, the late request instead names
  the action that gets the agent going again. That action connects the
  login of the session again. [Agents](agents-and-sessions.md#agents)
  states the login of each session.
- For a personal login, the line says that the starter connects the agent
  again, such as "The agent learns of it when Cal connects Claude again."
- For the org login, the line says that an admin connects the login of the
  org again, such as "The agent learns of it when an admin connects Acme's
  Claude login again." Only an admin connects an org login, as
  [The Agents tab](org-logins.md#the-agents-tab) says.
- Reason: a message of another member then opens a new session, as
  [Messages](messages-and-attachments.md#messages) says, so the next
  message does not reach this agent.
- Reason: a session never moves to another login. So a new personal login
  of the starter does not serve a session on the org login.
- Reason: the answer then acts as an answer in time does, and the share
  setting of each login keeps its rule.
- A turn on the login of the starter, also while the starter does not
  share it, was rejected, because the share setting exists to stop that
  use.
- A line that does not say who connects the login was rejected. An
  example is "The agent learns of it when the login of this session works
  again." Reason: no member then learns who must act.
- A rule that sends nothing whenever the message of the member who
  answered would open a new session was rejected. Most late answers of
  other members would then send nothing, because a new subscription login
  is not shared by default.
- A notice that waits for the next message of the session was rejected.
  So was a new linked session, because it has none of the earlier history.
- Reason for the turn: the agent asked for the answer, and the work that
  needs it waits. A [change note](capabilities-agents.md#where-the-note-goes)
  of the capabilities waits for the next message instead. No agent asked
  for that change, and it can reach each session of the workspace.
- A late Deny sends nothing. The late request then shows that it was
  denied. Reason: no agent waits, because its call already ended.
- One answer sends at most one line for each session, also when it allows
  [covered requests](secret-requests.md#covered-requests). It sends none to
  a session where a waiting call gets the values. Reason: that agent
  already has them.
