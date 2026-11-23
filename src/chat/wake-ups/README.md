# Wake-ups

The wake-ups of the chat: the pending wake-ups of the shown session, with
Cancel, and the lines that a wake-up adds when it fires or ends. An agent
sets a wake-up with a workspace tool, and the Worker keeps it until its
time. See [the chat](../README.md) for the whole chat,
[Wake-ups: the chat](../../../docs/protocol/wake-ups-chat.md) for the
requirements, and the mockups at `app/chat/wake-ups` in the
[catalogue of the chat](../../../docs/mockups/catalogue-chat-and-automations.md)
for the screens.

## Rules for this code

- The chat reads the pending wake-ups of a session from two sources. The
  read of `GET .../sessions/{sessionId}/wake-ups` gives the pending
  wake-ups at a workspace event number. It runs each time that the history
  of the session loads, beside its newest page, because a wake-up can wait
  for days in a page of the history that has not loaded yet. The events
  `session.wake-up-scheduled`, `session.wake-up-fired`, and
  `session.wake-up-ended` come in the pages of the history and in the
  stream, as the other events of the session do.
- `pendingWakeUps` gives the pending wake-ups of a session, the soonest
  first. The newest read gives the ones that waited at its event number.
  An event after that number adds a wake-up that an agent set later. A
  wake-up that fired or ended never waits again, so a repeat, a late page,
  or a late read changes nothing. A failed read keeps the wake-ups of the
  events, and the full history brings the rest.
- The cards stand at the top of the footer of the chat of the session,
  above the notices, the requests that wait, and the composer or the bar,
  as `PendingWakeUps` of the mockups draws them. The tab of a session and
  the popover of an explanation both show them. A pending wake-up waits
  for no member, so it marks nothing as waiting, and the workspace state
  comes from the Worker alone.
- Each member sees Cancel, which asks no question (wake-up decision 3 B).
  A read-only workspace, archived or of a suspended org, shows the cards
  with no Cancel. While a Cancel waits for its reply, its button is busy
  and the wake-up takes no second Cancel. The reply ends the card at once,
  also when the wake-up already fired or ended. The end line comes with
  the event of the cancel. A 404 `wake_up_not_found` ends the card with no
  notice, because the session has no such wake-up. Any other failure keeps
  the card and shows "The wake-up didn't cancel" with the cause.
- The transcript fold of `src/shared/transcript/` turns a fired or ended
  wake-up into one `wake-up` item at its place, as
  [Transcript rules](../transcript.md) says. `WakeUpItemLine` draws it:
  `WakeUpLine` of the mockups for a fire, with the text of the agent as
  the text of a message, and `WakeUpEndLine` for an end, with the chip of
  the sending session after a cancel through the workspace tools.
- The words come from `wakeUpCopy.ts` of the mockups, which the Worker
  and a copy share. `wake-up-words.ts` names the members of the contract
  for the reader: "You" to the member who cancelled, and "you" to the owner
  of a login that is gone. A member whom the chat does not know, such as
  one who left the org, is not named. The org login names the org of the
  chat, from `ChatReaders.orgName`.
- Each time is in the local time of the reader, from `wakeUpTime`, with
  the clock of the chat and its time zone, `Clock.timeZone`. The words of
  a card and of an end line read the clock again each minute, so
  "tomorrow" turns into "today" at midnight. Each safe integer time has
  words, also past the year 275760, where the dates of JavaScript end.

## Tests

- `wake-up-state.test.ts` checks the merge of the reads and the events:
  the order of the cards, a read at its event number in any order of
  arrival, a repeat, a late page, and a late read.
- `wake-ups.test.tsx` loads the chat on the fake API. It checks the cards
  from the read while an older page loads, the cards of two tabs as
  events come, a Cancel that ends its card at the reply and its line after
  a reload, a failed Cancel, a read-only workspace, the line of a fire in
  a loaded history and in a replay, and the words of each end line.
- `WakeUpLines.dom.test.tsx` mounts the chat. It checks a line that joins
  the running turn as a new part and a line that starts a turn, with an
  event that the stream sends again, and a Cancel that a person presses,
  with the chip of a cancel through the workspace tools.
- `../../shared/wake-up-time.test.ts` checks the words of times past the
  range of a JavaScript date.

### Key code

- `wake-up-state.ts`: `WakeUpsState`, the reads and the events of the
  pending wake-ups, and `pendingWakeUps`.
- `wake-up-actions.ts`: the routes of the read and of Cancel,
  `readWakeUps`, and `cancelWakeUp`.
- `PendingWakeUpCards.tsx`: the cards of the shown session with Cancel.
- `WakeUpItemLine.tsx`: the line of a wake-up at its place, the clock of
  the reader, and the text of the agent.
- `wake-up-words.ts`: the words of an end line for the reader.
