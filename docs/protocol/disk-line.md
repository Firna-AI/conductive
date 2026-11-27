# Disk line

This doc holds the requirements and the decisions in force for the disk
line of each sandbox. The line keeps the saved disk of a workspace small
enough to resume. It belongs to [Stop and resume](stop-and-resume.md).
[The org image](org-image.md#the-org-image) states the free storage of a
build under the line. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A disk hold decision number names a decision of the change that
adds the disk line.

## The line

- A resume needs the saved disk of the sandbox to fit the limit of its
  provider. A sandbox whose saved disk is above that limit cannot resume.
  Its members then lose the workspace until an operator recovers it by
  hand.
- So the sandbox of each workspace holds its disk under the disk line of
  its provider, when that provider has one (disk hold decision 1). The
  disk line is the used size of the disk of `/` at which all writes stop,
  also the writes of root. A hold of the file system keeps the space above
  the line free from every program, also from root and from Docker.
- The workspace user can use the ext4 root reserve on a disk with a line
  (disk hold decision 8 E). Programs that run as root share the same
  space. When the workspace user fills the disk to the line, root writes
  also stop. The available space that `df` reports still excludes the
  root reserve.
- At the line, each write fails with "No space left on device", so the
  work stops there. Writes work again when files go, such as when the
  agent or a member deletes build output.
- The app deletes no file to keep the line. Each sandbox keeps the one
  machine size of [The provider](workspaces-and-sandboxes.md#the-provider).
- The sandbox of a build gets no hold, as
  [The org image](org-image.md#the-org-image) says.
- Reason: Cal asked for a hold of a block of the disk. Cal rejected
  automatic deletes of build output, such as before each stop or by a
  timer. Cal also rejected a resume on a larger size, a limit that the
  provider enforces, and a disk warning in the app.
- A reserve file in place of the hold was rejected, because it counts as
  used disk, and a forced stop skips its delete. A larger root reserve of
  the file system and a user quota were rejected, because root and Docker
  pass them. A volume for build output was rejected, because other files
  still fill the disk. A line that the agent runner keeps for agent
  commands, with no hold, was rejected, because the hold keeps the line
  exactly and also stops Docker.
- A notice in the chat before the line, and a start step near the line,
  were not chosen (disk hold decision 1). The app shows no notice when a
  sandbox nears or reaches the line. The
  [agent instructions](agent-instructions.md#what-the-instructions-hold)
  tell each agent of the line.

## The line of each provider

- On Boat, the line keeps the own files of each sandbox under Boat's
  documented limit of 51 GB for its machine size. Own files are the files
  that differ from Boat's base image, without the operating system and the
  pre-installed tools.
- So the Boat line is 72 GB of used disk: the 21.95 GB that a new Boat
  sandbox uses, plus 51 GB, rounded down to a whole GB. The own files then
  stay under about 50 GB.
- Reason: Cal chose Boat's documented limit, not the largest budget of
  76 GB of used disk that a Boat error once named (disk hold decision 1).
  Boat's measure for a resume seems to keep the highest size of own files
  that a sandbox ever reached, and a delete did not lower it. So the own
  files must never pass the limit.
- The cleanup that Boat runs when space is low also runs at the line,
  because the hold makes the disk look full. That cleanup deletes caches
  that Boat can download again: the apt cache, the journal logs, and the
  pulled Docker images that no container uses. Boat never deletes own
  files.
- A sandbox on E2B has no line for now, so it gets no hold. Reason: E2B
  documents no disk limit for a resume yet.
- The Worker gives the line to the sandbox of each workspace as the
  variable `CONDUCTIVE_DISK_LINE_BYTES`, in bytes, at each create and each
  resume. A sandbox without that variable gets no hold. Reason: the Worker
  chooses the provider of each sandbox.
- Two resumes get no line: the restart near day 14 of an archived
  workspace, and the restart near day 14 of a workspace whose org is
  [deleted](delete-org.md).
  [When the line applies](#when-the-line-applies) gives the reason.
- No org env var with that name reaches a sandbox, on any provider.
  Reason: an org then can neither set nor change the line.

## The hold

- A part of the [sandbox software](sandbox-software.md#the-disk-hold)
  sets the hold as root, apart from the agent runner (disk hold
  decision 1).
- That part sets the hold at these times:
  - at each boot of the sandbox, and again every 5 minutes
  - at once when the app sees that the
    [background restore of the disk](terminal-shell.md#the-shell) has
    ended
  - at once when a [workspace command](#when-the-line-applies) ends
- While the restore runs, the app checks for its end every 5 seconds,
  also during a start.
- Each time, it holds the line only when the line applies. Otherwise, it
  releases the hold. On a disk with a line, the workspace user gets
  access to the ext4 root reserve each time.
- Reason: the hold then also covers Docker, the programs that the startup
  script leaves running, and a restarted runner. The check every 5 minutes
  also sets the hold again after a change, such as a change by an agent
  with root rights.
- A hold that the agent runner sets was rejected, because the runner does
  not always run when the line applies. An example is the
  [restart near day 14](stop-and-resume.md#the-restart-near-day-14) of a
  stop. A hold that only the start command of the Worker sets was
  rejected, because nothing then sets the hold again while the sandbox
  runs.
- An older sandbox gets that part with an update of its software. It then
  holds its line from its next boot.

## A disk above the line

- A disk that is already above the line keeps working. Its first hold
  gives it a line of its own, 2 GB above its used size.
  Members and root programs can use those 2 GB.
- That line never moves up. It moves down as files go, until it reaches
  the line of the provider. A new machine keeps that line too.
- Reason: each workspace that works today keeps working, and a new machine
  does not give the 2 GB again.
- Risk: the 2 GB can take a disk near the limit of its provider past that
  limit. Its next resume then fails.

## When the line applies

- A workspace command is a command that the app runs in the sandbox of a
  workspace for one of these actions:
  - a start
  - the [restart near day 14](stop-and-resume.md#the-restart-near-day-14)
    of a stop
  - [Continue](continue.md)
  - a [repository change](repository-change.md)
- The fetch of a branch and the startup script are examples of workspace
  commands.
- The line applies only when the
  [background restore of the disk](terminal-shell.md#the-shell) has ended
  and no workspace command runs. This holds also at the restart near
  day 14 of a stop, with the two exceptions below. At other times, the
  hold is released, and writes can pass the line.
- So the hold never blocks a workspace command or the background restore
  of the disk. Until the restore ends, the released hold lets back each
  disk that the provider accepted.
- The line does not apply at the
  [restart near day 14](stop-and-resume.md#the-restart-near-day-14) of an
  archived workspace, or at that of a workspace whose org is
  [deleted](delete-org.md). These restarts only keep the disk of a stopped
  sandbox, and they run no workspace command. They get no line, so the
  sandbox software neither holds the line nor releases the hold during
  them.
- Reason: these restarts run no startup script, no agent runner, and no
  work of a member. They only resume the sandbox and stop it again.
- Each workspace command releases the hold when it begins. This also
  releases the hold that a resume onto the same machine keeps from its
  last run. The hold stays released until the command ends, also when the
  restore ends during the command.
- Reason: a command at the line can then still write its files and its
  result. Without them, a start fails, and its members cannot use their
  workspace.
- The release changes only the hold of the disk of `/`, and only in a
  sandbox with a line. It changes nothing on another disk. Reason: the
  release then undoes only the hold that the sandbox software sets. A
  release of every disk of the sandbox was rejected, because it also
  changed disks that have no hold. On a small disk, that change can take
  away free space.
- When a workspace command ends, the line applies again at once, unless
  the restore has not ended or another workspace command runs.
- A workspace command keeps the hold released for at most 25 minutes.
  After that time, the next check applies the line, also while the command
  still runs. Reason: a command that never ends then cannot keep the line
  away. The limit is longer than the 20 minutes of the
  [time limit of a start](workspace-life.md#time-limits-of-builds-and-starts).
- A failed hold never blocks a workspace command. The sandbox software
  logs the failure and tries again later. Reason: a command then fails no
  more often than with no hold.
- Risk: writes while the hold is released, such as during the restore or
  during a workspace command, can take the disk past the line. The next
  hold then treats it as [a disk above the line](#a-disk-above-the-line).

## Saves of the agent runner

- When writes fail at the line, the agent runner still saves its own
  state as a best effort, so that the chat keeps its events.
- For that, the part of the sandbox software that sets the hold keeps a
  reserve of 256 MiB on the disk of `/`, in a folder that only root can
  reach. The reserve counts as used disk under the line. That part makes
  the reserve only when the line applies and at least 1 GiB is free for
  the user of the cloud computer. That free space includes the shared
  ext4 root reserve.
- When a state save of the runner fails because the disk is full, the
  runner runs a root command of that part, which deletes the reserve. The
  runner then tries the save once more. That command deletes only the
  reserve.
- Reason: a program without root rights cannot put a file at the path of
  the reserve, so the delete never removes a file that the sandbox
  software did not make. A reserve that the runner keeps beside its state
  file was rejected, because another program can put its own file at that
  path before the delete.
