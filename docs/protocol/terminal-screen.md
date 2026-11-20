# Terminal screen

This doc holds the requirements and the decisions in force for the screen
of each terminal: its output history, the selection and the mouse, its
size, its keys, and the paste. It belongs to
[Terminal](terminal.md#the-screen). The terms are those of the
[architecture doc](../architecture.md#terms) and of
[Terminal](terminal.md#terms). A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## The screen

- Every byte of output reaches the screen and its output history, also
  when a program writes faster than the screen redraws. The user chose
  this on 13 November 2026.
- Reason: the user copies long output, such as a build log. A terminal
  that keeps only the lines that end on the screen was rejected, because a
  test showed that it lost most lines of fast output. A copy of the
  history through the clipboard writes of tmux, a separate history view,
  and a join of screens during a drag were also rejected. The first lets a
  sandbox process write the user's clipboard, and the others leave the
  drag in the terminal broken or fragile.
- A new connection first shows the output history of the shell, up to
  2,000 lines, then its current screen. The screen keeps up to 2,000 lines
  of history. The user chose 2,000 lines on 13 November 2026.
- Reason: a reload shows the same history as a live screen. 5,000 and
  10,000 lines were rejected, because each connection then sends more
  data, which is slow on a phone.
- A plain drag selects text on the screen and in its output history, and
  the user can copy it, such as with Cmd+C on a Mac. A drag past the top
  or the bottom edge scrolls the history. This also holds while a program
  in the shell, such as vim, uses the mouse (decision 246).
- The wheel scrolls the output history. While a program in the shell uses
  the mouse, the wheel, the right button, and the middle button reach the
  program. A held Cmd on a Mac, or Ctrl on Windows and Linux, gives a
  click or a drag to the program, except a click on a link, as
  [Terminal links](terminal-links.md) says.
- Reason: the user expects to select and copy as in the rest of the page.
  A copy through the clipboard writes of the program was rejected, because
  any process in the sandbox could then write the user's clipboard.
- All viewers of a shell share one size, at most 500 columns and 200 rows.
  A new connection sets it, and so does the viewer where the user last
  typed, pasted, or resized. Each other viewer shows the shell at that
  size: with smaller text when the size is larger than its panel, and with
  empty space when it is smaller.
- Reason: the output of a program fits one size, so one size keeps the
  line breaks right for every viewer. The limit stops a program in the
  shell from setting a size that no browser can hold.
- Each key reaches the program in the shell. The terminal has no key
  commands and no status line of its own, so Ctrl-b reaches the shell. The
  user accepted this on 13 November 2026.
- Reason: terminal tabs open more shells, so the shell needs no window
  keys of its own.
- A paste reaches a program as a paste, also after a reconnect, so a
  program that marks pastes, such as vim or Bash, does not run the pasted
  text as keys.
- A workspace with older terminal software shows only its visible screen
  in the history until the terminal service of a newer release starts, as
  [Older software](terminal.md#older-software) says.
- When the connection ends, the user can still select and copy the text
  that stays on the screen (decision 245).
- Reason: the screen keeps its output so that the user can still use it,
  such as an error message.
- On a phone, a row of keys adds the keys that a phone keyboard lacks.
