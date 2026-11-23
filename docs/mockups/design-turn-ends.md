# The end of a turn

This page belongs to [the chat](design-chat.md). It gives the end of a turn
whose changed files the cloud computer could not read, the line of a
stopped turn, the end of a turn at the time limit of background work, and
the end of a fast turn that ran at standard speed. It also gives the line
that wakes a session when a turn that it watched ends.

- Files that the cloud computer could not read never show as an empty list.
  A finished turn still ends with its duration, then "Changed files
  unavailable" in muted text in place of its files. A stopped turn ends its
  line with the same words. All files keeps the list that it saved before,
  under the notice "The latest list of all files is unavailable", which has
  no time. With no saved list, All files says "The list of all files is
  unavailable" in place of the tree. `lostCopy.ts` holds these words too.
- `StopLine` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
  draws the line of a stopped turn: the stop icon, who stopped the turn,
  then each note of the turn after a dot, such as "Changed files
  unavailable". `stopCopy.ts` beside it holds the words, for the chat and
  for the copy of a transcript.
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
    it into balanced lines, and the chip moves to the next line whole. The
    app uses `StopLine` too.
- A turn that waits for the background work of its agent shows as any
  running turn, as `app/chat/background-limit/waiting` shows. When the
  time limit stops that work, the turn still ends as finished, with its
  duration and its files. One line above that row names the cause:
  "Background work stopped at the time limit".
  - `EndReasonLine` in
    [`src/ui/components/chat/`](../../src/ui/components/chat/) draws the
    line, centred and muted as the other event lines, with a timer icon.
    `endReasonCopy.ts` beside it holds the words of each end reason. The
    app uses `EndReasonLine` too.
  - `TurnEnd` puts the line 8 px above the row, closer than two items of
    the chat, so the two read as one end. The row keeps its own marks,
    such as "Changed files unavailable".
  - The words name what stopped, not the number of the limit, because the
    member cannot change it.
- A fast turn that ran at standard speed still ends as finished, with its
  duration and its files, from fast mode decision 257. A note beside the
  duration names the speed and the cause, such as "Standard speed · Fast
  limit reached", and the files go under the note.
  - `StandardSpeedNote` in
    [`src/ui/components/chat/`](../../src/ui/components/chat/) draws the
    note: muted text with a gauge icon. One line has the height of a chip.
    A narrow chat wraps the note, and the icon stays on its first line. The
    app uses `StandardSpeedNote` too.
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
- `WakeLine` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
  draws the line of the app that wakes a session when a turn that it
  watched ends, from watch decisions 1 C and 6 B, as `app/chat/wakes`
  shows. It has a bell icon, the words of the end, and the session chip of
  the watched session. The end reason of that turn follows after a dot
  when its end names one, such as "Background work stopped at the time
  limit".
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
    with the chip whole. The app uses `WakeLine` too.
  - `wakeCopy.ts` beside it holds the words. The agent of the woken
    session and the copy of a transcript get the same words, with the
    session link in place of the chip.
