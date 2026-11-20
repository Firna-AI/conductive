# Terminal shell

This doc holds the requirements and the decisions in force for the shell
of each terminal: its folder and prompt, the focus, its connection, its
end, its command history, its folder after a restore, and what an
out-of-memory kill ends. It belongs to
[Terminal](terminal.md#the-shell). The terms are those of the
[architecture doc](../architecture.md#terms) and of
[Terminal](terminal.md#terms). A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A terminal
tabs decision number, such as terminal tabs decision 5, names a decision
of the change that adds terminal tabs to the Terminal tool. An
out-of-memory decision number, such as out-of-memory decision 2, names a
decision of the change that keeps the runner and the terminal shells
running after an out-of-memory kill.

## The shell

- Each terminal opens its shell in the sandbox, in the folder of the
  workspace's repository (decision 94).
- The default shell prompt shows only the current folder name, such as
  `mokly`, in place of the full path.
- On desktop, a click on the Terminal tab of the tools panel moves the
  keyboard focus to the shown terminal. So does Go to Terminal, from its
  row of the command palette or its key, ⌘J on a Mac or Ctrl+J elsewhere.
  The user asked for the tab on 16 November 2026, and chose the same for
  Go to Terminal on the same day.
- On desktop, New terminal of the command palette, the + of the terminal
  tabs, and a click on a terminal tab also move the focus to the terminal
  that they show (terminal tabs decision 5 D). A keyboard user who moves
  along the tabs keeps the focus on the row.
- A terminal that still opens or connects takes the focus when it shows,
  unless the user moved the focus in the meantime. A choice of another
  tool drops that wait.
- On a phone, none of these controls moves the focus. Reason: the keyboard
  of the phone would then cover the page.
- Reason: a click on the tab says that the user wants to type in the
  shell, so a second click in the terminal is a wasted step. A member who
  opens or picks a terminal also types in it next. A focus that stays in
  place was rejected, because typed text and Enter then often go to the
  message box, and so to the agent. A terminal that takes the focus after
  the user chose another field was rejected, because the user's keys then
  go to the shell.
- The shell of each terminal keeps running when its connection drops. Each
  new connection of the terminal attaches to that shell, with its running
  commands and its current screen (decision 118).
- Reason: a connection can drop at any time, such as at a network change
  or when Cloudflare updates the runtime of the Worker. A shell that ends
  with its connection was rejected, because the user then loses a running
  command, such as a dev server.
- When the user ends the shell of a terminal, such as with `exit`, the
  next connection of that terminal opens a new shell in the same tab.
- When the connection of a terminal drops with no close of the server,
  such as at a deploy of the Worker or a network failure, that terminal
  connects again once by itself. It shows Disconnected with Reconnect only
  when that try fails: the new connection ends without output, or within
  one minute of its first output. A connection that stays open for one
  minute after its first output works, so a later drop gets its own try.
  Cal chose this on 17 November 2026, as option B of item 4 of the
  investigation of a failed session close.
- A close of the server, such as at the end of the shell, at the close of
  the terminal, at a stop, at a Restart, or at a loss of access, still
  shows Disconnected at once.
- The screen keeps the output of an ended connection until a new
  connection of the same terminal shows its own output. This holds for the
  automatic try and for Reconnect, so a try that fails keeps the output to
  copy, as [the screen rules](terminal-screen.md) say for an ended
  connection (decision 245).
- Reason: a deploy restarts the Durable Object of each workspace, which
  drops each open terminal. More tries with a wait between them were
  rejected for now, because one try covers a deploy.
- A stop of the sandbox ends the shell of each terminal and its commands,
  as [Stop and resume](workspace-life.md#stop-and-resume) says. The list
  of terminals stays. The first connection of each terminal after the
  resume opens a new shell.
- The commands that the user typed in a shell stay in the command
  history after a stop. The new shell after the resume finds them, such as
  with the Up arrow or Ctrl-R (terminal history decision 1). Terminal
  history decisions are the decisions of the change that added this rule.
- Each command goes into the history file when it ends, before the next
  prompt. A command that still runs at the stop, such as a dev server, does
  not go in. An empty or unset `HISTFILE` keeps the history out of the
  file.
- Reason: Bash writes its history file only when the shell exits. The
  shell exits only during the shutdown at a stop, and a test on
  16 November 2026 found no history file after the resume. The append
  writes each command while the sandbox runs. A
  shell that also reads the new commands of the other shells at each
  prompt was rejected, because it changes the order of the Up arrow while
  the user works.
- After a start from a saved snapshot, the sandbox provider restores the
  disk in the background. A shell that starts after the restore ends opens
  in the live repository folder. A shell that started earlier moves to the
  live copy of its own folder once, at its first prompt after the app sees
  the end of the restore (decisions 147 and 149).
- Reason: when the restore ends, a running program keeps an old view of
  the disk at another path. A restart of the shell was rejected, because it
  ends running commands. A terminal that waits for the end of the restore
  was rejected, because the Terminal tool then waits too.
- Apart from that one move, the terminal never moves a running shell by
  itself. The app learns the end of the restore from a signal that the
  sandbox provider documents (decision 149).
- Reason: a move each time that the real folder of a shell differs from
  the path in its prompt was rejected, because it also moves a shell
  outside a restore. A check of the provider's path of the old view was
  rejected, because the provider does not document that path.

## Out of memory

- An out-of-memory kill of a command in a terminal ends only that command
  (out-of-memory decision 2). An example is a large build. Such a kill is
  the end of one process by the kernel when the sandbox has no free
  memory, as [Out of memory](agent-runner.md#out-of-memory) says.
- Each shell keeps running, and so does each other command, such as a dev
  server. The shell of the ended command shows its end and takes the next
  command.
- Reason: one command that uses too much memory must not end the shells
  and the running commands of every member of the workspace.
- An end of every shell of the workspace at such a kill was rejected.
  Reason: each member then loses each running command.
- A memory limit for the commands of the terminals, below the size of the
  sandbox, was not chosen. Reason: the kernel ends the process that uses
  the most memory, and that is almost always the command. The runner
  follows the same choice (out-of-memory decision 1).
- Risk: the kernel can also end the program that holds the shells. That
  still ends every shell and its commands.
