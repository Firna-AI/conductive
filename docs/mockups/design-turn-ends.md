# The ends of turns

This page belongs to [the design of the chat](design-chat.md). It gives
the files that the cloud computer could not read, the line of a stopped
turn, and the end of a turn at the time limit of background work. It also
gives the lines after a stop of the cloud computer during a turn, and the
end of a fast turn that ran at standard speed.

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
    "Priya stopped the agent" to the others. A stop with no Stop shows
    "The agent stopped", such as at a restart of the agent runner, as
    `app/chat/turns/runner-restarted` shows. A stop with an end reason
    names the cause in its place, such as "The cloud computer stopped".
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
- When the cloud computer stops while the agent works, and no member and
  no part of the app asked for the stop, the turn ends as stopped. Its
  line names that end reason: "The cloud computer stopped". A line of the
  app right under it says what comes next, as
  `app/chat/cloud-computer-stops` shows.
  - `ContinuationLine` in `src/components/chat/` draws that line, centred
    and muted as the other event lines, with a play icon that answers the
    stop icon above it. `continuationCopy.ts` beside it holds the words,
    and `endReasonCopy.ts` the words of the stopped line. The line takes no
    fixtures, so the app can use it too.
  - The line does not repeat the cause, because the stopped line names
    it. It never says that the cloud computer started before it did. It
    ends with no period, as the other event lines.
  - When a continuation turn waits, it says "The agent continues when the
    cloud computer starts again". That turn starts at the line, and its
    work folds as the work of any turn. The message that tells the agent
    to continue does not show in the chat.
  - When the login of the session is gone, no turn waits. The line names
    who connects it again, with the words of a late answer to a secret
    request: "The agent can continue after Cal connects Claude again". It
    says "you" to the starter, and it names an admin for the org login.
  - When the cloud computer stopped again soon after the last
    continuation, or the time limit of the chain of turns ended, no turn
    waits. The line says "Send a message to continue".
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
