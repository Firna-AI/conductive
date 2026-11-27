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
- A reserve file was rejected, because it counts as used disk, and a
  forced stop skips its delete. A larger root reserve of the file system
  and a user quota were rejected, because root and Docker pass them. A
  volume for build output was rejected, because other files still fill the
  disk. A line that the agent runner keeps for agent commands, with no
  hold, was rejected, because the hold keeps the line exactly and also
  stops Docker.
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
- Root writes stop at the line. Writes of the user of the cloud computer,
  such as the agents and the terminals, stop 3.47 GB earlier, at the space
  that the file system keeps for root.
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
- No org env var with that name reaches a sandbox, on any provider.
  Reason: an org then can neither set nor change the line.

## The hold

- A part of the [sandbox software](sandbox-software.md#the-disk-hold)
  sets the hold as root, apart from the agent runner (disk hold
  decision 1).
- That part sets the hold at each boot of the sandbox, again every
  5 minutes, and at once when the
  [background restore of the disk](terminal-shell.md#the-shell) ends.
- Reason: the hold then also covers the startup script, Docker, and a
  restarted runner. The check every 5 minutes also sets the hold again
  after a change, such as a change by an agent with root rights.
- A hold that the agent runner sets was rejected, because the runner
  starts only after the startup script. A hold that only the start command
  of the Worker sets was rejected, because nothing then sets the hold
  again while the sandbox runs.
- An older sandbox gets that part with an update of its software. It then
  holds its line from its next boot.

## A disk above the line

- A disk that is already above the line keeps working. Its first hold
  gives it a line of its own, 2 GB above its used size.
- That line never moves up. It moves down as files go, until it reaches
  the line of the provider. A new machine keeps that line too.
- Reason: each workspace that works today keeps working, and a new machine
  does not give the 2 GB again.
- Risk: the 2 GB can take a disk near the limit of its provider past that
  limit. Its next resume then fails.

## Restores and starts

- The hold never blocks a start or the background restore of the disk.
- Until that restore ends, the hold lets back each disk that the provider
  accepted. The line applies from the end of the restore.
- Each start of the sandbox of a workspace first releases the hold that
  its machine still has. Reason: a resume onto the same machine keeps the
  hold of its last run, and the start must write its own files.
- A failed hold never blocks a start. The sandbox software logs the
  failure and tries again later. Reason: a start then fails no more often
  than with no hold.
- Risk: writes before the first hold of a start, such as during the
  restore, can take the disk past the line. The first hold then treats it
  as [a disk above the line](#a-disk-above-the-line).
- When writes fail at the line, the agent runner still saves its own
  state as a best effort, so that the chat keeps its events.
