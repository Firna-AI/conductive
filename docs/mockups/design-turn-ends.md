# The end of a turn

This page belongs to [the chat](design-chat.md). It gives the end of a turn
whose changed files the cloud computer could not read, the line of a
stopped turn, the end of a turn at the time limit of background work, and
the end of a fast turn that ran at standard speed. It also gives the line
that wakes a session when a turn that it watched ends, and the wake-ups of
an agent: a pending wake-up, the line of a wake-up at its time, and the
line of a wake-up that ended with no turn.

- Files that the cloud computer could not read never show as an empty list.
  A finished turn still ends with its duration, then "Changed files
  unavailable" in muted text in place of its files. A stopped turn ends its
  line with the same words. All files keeps the list that it saved before,
  under the notice "The latest list of all files is unavailable", which has
  no time. With no saved list, All files says "The list of all files is
  unavailable" in place of the tree. `lostCopy.ts` holds these words too.
- `StopLine` in `src/components/chat/` draws the line of a stopped turn:
  the stop icon, who stopped the turn, then each note of the turn after a
  dot, such as "Changed files unavailable". `stopCopy.ts` beside it holds
  the words, for the chat and for the copy of a transcript.
  - A Stop of a member shows "You stopped the agent" to that member and
    "Priya stopped the agent" to the others. A stop with no Stop, such as
    when the cloud computer stops, shows "The agent stopped".
  - A stop by the agent of a session with a workspace tool, also through a
    close of the session, names no member, from decision 279. The line
    says "Stopped from", then the session chip of that session, as
    `app/chat/agent-stops` shows. A press on the chip opens the session,
    as in a message. The copy of a transcript gives the session link in
    place of the chip.
  - The line is centred and muted, as `LostLine` is. A narrow chat wraps
    it into balanced lines, and the chip moves to the next line whole. It
    takes no fixtures, so the app can use it too.
- A turn that waits for the background work of its agent shows as any
  running turn, as `app/chat/background-limit/waiting` shows. When the
  time limit stops that work, the turn still ends as finished, with its
  duration and its files. One line above that row names the cause:
  "Background work stopped at the time limit".
  - `EndReasonLine` in `src/components/chat/` draws the line, centred and
    muted as the other event lines, with a timer icon. `endReasonCopy.ts`
    beside it holds the words of each end reason. The line takes no
    fixtures, so the app can use it too.
  - `TurnEnd` puts the line 8 px above the row, closer than two items of
    the chat, so the two read as one end. The row keeps its own marks,
    such as "Changed files unavailable".
  - The words name what stopped, not the number of the limit, because the
    member cannot change it.
- A fast turn that ran at standard speed still ends as finished, with its
  duration and its files, from fast mode decision 257. A note beside the
  duration names the speed and the cause, such as "Standard speed · Fast
  limit reached", and the files go under the note.
  - `StandardSpeedNote` in `src/components/chat/` draws the note: muted
    text with a gauge icon. One line has the height of a chip. A narrow
    chat wraps the note, and the icon stays on its first line. It takes no
    fixtures, so the app can use it too.
  - `speedCopy.ts` beside it holds the words of each cause: "Fast limit
    reached" for the fast limit of Claude, and "Older cloud computer
    software" for a cloud computer whose software ignores fast mode.
  - The words name no time until a limit resets, because the note stays in
    the chat after the reset.
  - A stopped turn ends its line with the same words after a dot, before
    the notes of its files, such as "You stopped the agent · Standard speed
    · Fast limit reached".
  - A fast turn that ran at fast speed, and a turn without fast mode, show
    no note.
- `WakeLine` in `src/components/chat/` draws the line of the app that
  wakes a session when a turn that it watched ends, from watch decisions
  1 C and 6 B, as `app/chat/wakes` shows. It has a bell icon, the words of
  the end, and the session chip of the watched session. The end reason of
  that turn follows after a dot when its end names one, such as
  "Background work stopped at the time limit".
  - The words are "A turn finished in", "A turn failed in", and "A turn
    stopped in". They come before the chip, as "Stopped from" does. The
    end comes first, so it stays on the first line when the chip wraps,
    and a screen reader hears it before the chip.
  - The chip names the workspace of the session with its label and its
    state mark, so the line names no workspace in words. The line shows no
    raw error and names no member, because the watched session shows them.
  - The end reason has the words of `endReasonCopy.ts`, as the line above
    the duration of that turn has them.
  - One bell marks each end, because the icon of a stop or of an error
    would read as an end of a turn of this session.
  - The line is not a message of a member. It starts a turn of the
    session, or it joins the turn that runs as a new part, as a message
    during a turn does. It never folds into the work of its turn.
  - It is centred and muted, as `StopLine` is, and a narrow chat wraps it
    with the chip whole. It takes no fixtures, so the app can use it too.
  - `wakeCopy.ts` beside it holds the words. The agent of the woken
    session and the copy of a transcript get the same words, with the
    session link in place of the chip.

## Wake-ups

An agent can ask to go on with its work at a later time with a workspace
tool, and end its reply. The Worker keeps each such wake-up, so the session
waits with no turn, and its cloud computer can stop.
[The chat and automations](catalogue-chat-and-automations.md) page gives
the pages of `app/chat/wake-ups`.

- `PendingWakeUps` and `PendingWakeUp` in `src/components/chat/` draw the
  pending wake-ups of a session, from wake-up decision 3 B, as
  `app/chat/wake-ups` shows.
  - Each pending wake-up is a compact card with a full hairline outline,
    as a request above the composer: the alarm icon, its time, such as
    "Wake-up tomorrow at 09:00", and Cancel at the end. The text that the
    agent set follows under them.
  - The text shows two lines that end in an ellipsis. A press shows all of
    it, with its line breaks and its code, as a message line in the work
    of a turn opens.
  - The cards stand soonest first at the top of the footer of the chat:
    above the requests, and above the composer, or above the bar of a
    cloud computer that does not run. They take the rules of the region of
    the requests: at most 40% of the window, and a fade at an edge that
    cuts a card.
  - A pending wake-up waits for no member, so the workspace shows no Needs
    input for it.
  - Each member sees Cancel, which asks no question first, as Stop asks
    none. A read-only workspace shows no Cancel.
  - The time is in the local time of the reader, on the 24-hour clock:
    "today at 16:30", "tomorrow at 09:00", "yesterday at 09:00", or its day,
    such as "Mon 30 Nov at 09:00". A day of another year adds the year.
- `WakeUpLine` beside them draws the line that a wake-up adds at its time,
  as `app/chat/wake-ups/fired` shows: the alarm icon, "Wake-up:", then the
  text that the agent set, with its code and its chips, a little stronger
  than the lead.
  - The line starts a turn of the session, or joins the turn that runs as
    a new part, as a message during a turn does. It is not a message of a
    member, so it has no bubble, and it never folds.
  - The agent, a copy, and `read_session` get the same text, from
    `wakeUpText`.
- `WakeUpEndLine` beside them draws the line of a pending wake-up that
  ended with no turn. It is centred and muted, as the stop line is.
  - A wake-up that reached its time and could start no turn shows a clock
    alert, from wake-up decision 4 B, as `app/chat/wake-ups/not-started`
    shows. The line says that the wake-up could not start, then names the
    action that gets the agent going again, in the words of a late secret
    request: "The agent can go on after Cal connects Claude again", "after
    an admin connects Acme's Claude login again", or "at the next
    message". The agent goes on only after that action, so the line says
    "can go on". A closed session and an archived workspace name the cause
    in place of the action.
  - A Cancel shows the alarm that is off and names the member who pressed
    it, from wake-up decision 5 B, as `app/chat/wake-ups/cancelled` shows:
    "Priya Raman cancelled the wake-up for tomorrow at 09:00", and "You
    cancelled" to that member. A member who left the org gives "The
    wake-up for tomorrow at 09:00 was cancelled".
  - A cancel through the workspace tools names no member, as a stop
    through the tools names none, from decision 279.
    `app/chat/wake-ups/cancelled/from-session` shows its line: the title
    of the card, then "Cancelled from" after a dot, then the session chip
    of the sending session. An example is "Wake-up tomorrow at 09:00 ·
    Cancelled from" and the chip. The words come before the chip, as
    "Stopped from" does. A narrow chat moves the chip to the next line
    whole. A cancel by the agent of the same session gives the same line,
    with the chip of that session.
  - Each of these lines names the wake-up by its time, as its card did,
    because a session can have several wake-ups.
- `wakeUpCopy.ts` beside them holds all these words and the words of a
  time. A copy and `read_session` give a time in UTC, from
  `wakeUpTimeUtc`, such as "24 November 2026, 09:00 UTC", because the
  Worker does not know the time zone of the reader. The module draws
  nothing and reads no fixtures, so the Worker can import it. The parts
  take no fixtures either, so the app can use them.
  - A copy and `read_session` give the line of a cancel through the tools
    with the session link in place of the chip, from `cancelledFromText`.
  - They end with the pending wake-ups of the session, from
    `pendingWakeUpsCopy`, as the chat shows them in its footer. The
    heading "Pending wake-ups" comes first, at the level of the heading of
    a sender. So the wake-ups do not read as the work of the last turn.
    Then each wake-up, the soonest first, gives the title of its card in
    italics, with its time in UTC, such as "Wake-up 24 November 2026,
    09:00 UTC". The text that the agent set follows, as a copy gives the
    text of a message. A session with no pending wake-up adds nothing.
