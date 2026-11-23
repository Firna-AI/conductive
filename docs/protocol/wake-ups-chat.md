# Wake-ups: the chat

This page belongs to [Wake-ups](wake-ups.md), which states the wake-up
calls and the turn that a wake-up starts. It states what the chat shows
for each wake-up: the pending wake-ups, their times, the wake-up line, and
the end lines. The terms are those of [Wake-ups](wake-ups.md#terms) and of
the [architecture doc](../architecture.md#terms). A decision number names
a dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A wake-up decision number names a decision of the change that adds
the wake-up calls, as [Wake-ups](wake-ups.md) says. The
[mockup catalogue](../mockups/catalogue.md) draws these screens at
`app/chat/wake-ups`.

## The pending wake-ups

- The chat of a session shows each of its pending wake-ups, with its time,
  its text, and Cancel (wake-up decision 3 B).
- Reason: a wake-up can be days away, and it can start work on a login. So
  the members must see it and be able to cancel it. No sign of a pending
  wake-up was rejected. A mark of the workspace in the list was not chosen.
- Each pending wake-up is a compact card at the top of the footer of the
  chat, the soonest first. The cards stand above the requests that wait,
  and above the composer or the bar of a cloud computer that does not run.
  The [mockups](../mockups/design-turn-ends.md#wake-ups) draw them.
- Reason: a member must see a pending wake-up at each place of the scroll,
  and the chat already keeps the items that wait there.
- The card shows the time, such as "Wake-up tomorrow at 09:00", Cancel,
  and the first two lines of the text. A press shows the whole text.
  Reason: the text can be long, and the card must stay small.
- A pending wake-up waits for no member. So it sets no needs input, as
  [Workspace states](workspace-life.md#workspace-states) defines it.
- Each member sees Cancel. Cancel asks no question first. Reason: Stop asks
  none, and a cancel has the rights of a Stop, as
  [Cancel a wake-up](wake-ups.md#cancel-a-wake-up) says.
- A [read-only workspace](session-transcripts.md#terms) shows its pending
  wake-ups with no Cancel.
- Each open tab of the workspace shows the same pending wake-ups. A new
  wake-up, a fire, and an end change them in each tab.
- A copy and `read_session` end with the pending wake-ups of the session,
  the soonest first. Each gives its time in UTC and the text that the agent
  set.
- Reason: a copy holds the items of the chat in the order of the chat, as
  [What each copy holds](session-transcripts.md#what-each-copy-holds)
  says. The chat shows the cards at the end, in its footer.

## Times

- The chat gives each time in the local time of the reader, on the 24-hour
  clock: "today at 16:30", "tomorrow at 09:00", "yesterday at 09:00", or
  the day, such as "Mon 30 Nov at 09:00". A day of another year adds the
  year.
- A copy and `read_session` give each time in UTC, such as "24 November
  2026, 09:00 UTC". The replies of the calls give the time in UTC too, as
  [Set a wake-up](wake-ups.md#set-a-wake-up) says. Reason: the Worker does
  not know the time zone of the reader, as for the time of a copy.

## The wake-up line

- A wake-up that fires adds one [wake-up line](../architecture.md#terms)
  to its session. It is not a message of a member, so the chat shows no
  bubble and no sender for it.
- The line gives the lead "Wake-up:", then the text that the agent set.
  The chat shows that text as the text of a message, with its code and its
  chips. Reason: one short lead reads well in the chat, for the agent, and
  in a copy, also when the line joins a running turn.
- One shared text gives these words to the chat, the agent, a copy, and
  `read_session`. So the texts cannot drift apart.
- The agent gets the line as a message, with its
  [sender line](message-lines.md#the-sender-line). So an older runner
  needs no update for a wake-up.
- A copy gives the line with no heading of a sender.
- The chat, its loaded history, and a copy show each wake-up line once, at
  its place in the order of the events, as
  [Events](chat-and-events.md#events) says.
- A wake-up line starts a new part of its turn, as a message during a turn
  does. It never folds, as
  [The work of a turn](chat-and-events.md#the-work-of-a-turn) says.

## End lines

- A pending wake-up that ends with no turn leaves one end line at its
  place in the chat. The line names the wake-up by its time, as its card
  did. Reason: a session can have several wake-ups.
- The chat events of an end line carry the time of the wake-up, and the
  member or the cause. So each tab gives the words in the local time of
  its reader.
- An end line reaches no agent. The agent lists its wake-ups before it
  relies on one, as
  [Tool descriptions and guidance](wake-ups.md#tool-descriptions-and-guidance)
  says.

### The line of a cancel

- The line of a cancel names the member who cancelled (wake-up decision
  5 B), such as "Priya Raman cancelled the wake-up for tomorrow at 09:00".
  To that member, it says "You".
- A cancel by a member who left the org gives "The wake-up for tomorrow at
  09:00 was cancelled". Reason: the chat names no member who left, as for
  a stop line.
- Reason for wake-up decision 5 B: a cancel is an action of a member that
  ends later work, as Stop is. So the chat records it as it records a
  Stop. A cancel with no line was rejected.
- A cancel through the workspace tools names no member, as a
  [stop through the tools](messages-and-attachments.md#stops-by-the-workspace-tools)
  names none (decision 279). The line still names the wake-up by its time.
  It gives "Cancelled from" and the session chip of the sending session.
- This holds also when an agent cancels a wake-up of its own session. A
  copy and `read_session` give the session link in place of the chip.
- Reason: wake-up decision 5 B records a cancel as a stop line does, and
  decision 279 gives a stop through the tools these words.

### The line of a wake-up that could not start

- The line of a wake-up that could not start says so (wake-up decision
  4 B).
  [A wake-up that can start no turn](wake-ups-delivery.md#a-wake-up-that-can-start-no-turn)
  gives the cases.
- The line then names the action that gets the agent going again, in the
  words of a [late request](secret-late-answers.md#late-answers):
  - For a personal login that is gone: "The wake-up for today at 09:00
    could not start. The agent can go on after Cal connects Claude
    again."
  - For the org login: "after an admin connects Acme's Claude login
    again".
  - For a sender who left the org, and for a starter who no longer shares
    the login with the sender: "at the next message".
- Reason: the agent goes on only after that action and a new message. So
  the line says "can go on".
- A closed session and an archived workspace name the cause in place of an
  action, such as "The wake-up for today at 09:00 could not start, because
  the workspace was archived."
