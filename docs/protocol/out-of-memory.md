# Out of memory

This page belongs to [Agent runner](agent-runner.md). It states what an
out-of-memory kill in a sandbox ends, and its risks. The terms are those
of the [architecture doc](../architecture.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. An
out-of-memory decision number, such as out-of-memory decision 1, names a
decision of the change that keeps the runner and the terminal shells
running after an out-of-memory kill.

- When the sandbox has no free memory, the kernel ends one process. Such
  an end is an out-of-memory kill.
- An out-of-memory kill of a process that an agent started ends only that
  process (out-of-memory decision 1). An example is a large build.
- The runner, the other processes of the agents, and each running turn
  keep running. The agent sees its command fail.
- A process of a [service](services.md#out-of-memory) is the one
  exception. Such a kill stops the whole service, which then shows Failed.
- Reason: one command that uses too much memory must not end each running
  turn of the workspace and its background work.
- A stop and a restart of the whole runner at such a kill was rejected.
  Reason: it ends each running turn in each session, and the chat gives no
  cause.
- A memory limit for the processes of the agents, below the size of the
  sandbox, was not chosen. Reason: the kernel ends the process that uses
  the most memory, and that is almost always the command.
- Risk: the kernel can also end an agent program or the runner. That still
  ends the turns of that program, or each running turn, as at a crash of
  the runner.
