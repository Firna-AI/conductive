# Runner reports

This guide belongs to the [agent runner](README.md).

The workspace sends a `report.refresh` command when it needs a fresh full
report of one kind.
[Lost workspace updates](../docs/protocol/agent-runner.md#lost-workspace-updates)
states the requirements.

- The runner takes a request without a session or a credential. The agents
  never get it. So a running turn keeps its agent process and its input.
- After the `welcome`, the runner takes commands while the refresh after the
  connect still runs. So a request does not wait for `runner.ready`.
- A `files.snapshot` or `changes.updated` request scans the repository again.
  It sends a full report of that kind only, in numbered parts.
- The repository watcher, the refresh after each connect, and these two
  report requests share one scan queue. So such a report request waits for
  each earlier scan. The events of two scans never interleave. File reads
  and diffs do not use this queue.
- A watcher scan compares each kind with the last scan of that kind. So a
  request for one kind hides no later update of the other kind.
- The runner keeps the latest `start.updated` and `workspace.title`
  reports in memory. Each saved state includes them. A confirm does not
  remove them. They stay after a restart.
- A `start.updated` or `workspace.title` request selects the current
  report and appends its filtered copy in one store operation. It saves
  the copy before it sends it, with a new event number.
- Until the runner accepts an event of that kind, such a request sends
  nothing. The runner has no source of new start steps or new workspace
  names yet.
- The runner skips a command ID that it has seen. When the runner answers
  with a report, the save of the last report event also saves the ID. So a
  repeat of that ID after a reconnect or a restart sends nothing. If the
  runner process ends before that save, a repeat after the restart gets a
  new answer. The outbox still resends an unconfirmed answer.
- A state file from an older runner has no saved events of these two kinds
  and no saved IDs. The runner still reads it.

## Listening ports

- `ProcPortScanner.scan()` reads the TCP socket tables and resolves new
  sockets through process file descriptors. It caches each socket's complete
  selected labels. The executable link identifies the program or interpreter.
  A rewritten interpreter title without an identifiable script has no name.
- `PortReporter` keeps two successful scans for each addition or removal.
  A failed table read keeps the last list and writes a local warning.
- Production `main.ts` supplies a scan every 2 seconds. Its timer stops at
  shutdown. The optional `RunnerOptions.ports` boundary lets tests inject
  scans and scheduling without reading the host socket tables.
- The port scan queue is separate from the repository scan queue. Agent
  commands do not wait for either queue.
- Each connect sends the current full stable list, including an empty list.
  A `ports.updated` refresh scans again and sends that list with its command
  receipt. The scan keeps the same two-scan rule for new and closed ports.
- A scan reads no process environment and makes no request to a server.
  It selects only a program, script, or module and one allowed command word.
  Its complete folder stays relative to the repository folders.
- The runner filters known credentials from those complete selected labels.
  Its outbox and reconnect keep complete labels, including labels longer
  than the displayed limits. A private byte budget can omit a whole optional
  label. It never cuts a private label.
- The workspace filters its captured marked env values from complete labels.
  Only then does it shorten names and folders for storage and browsers.

[Listening ports](../docs/protocol/agent-runner.md#listening-ports)
states the filters, labels, limits, and scan timing.

## Skills

- `SkillReporter` in `src/skills.ts` makes the skill list of each agent.
  It sends the lists in one `skills.updated` event. The optional
  `RunnerOptions.skills` boundary gives the `SkillLists` that the agent
  providers read, and lets tests start a fake Codex app server. Production
  `main.ts` always gives it.
- Each connect reads both lists and sends the full report before
  `runner.ready`, also when both lists are empty.
- The repository watcher of the file reports also signals the skills
  report, after the same wait of 100 milliseconds. Signals that come while
  a scan waits share one more scan. The skills scan queue is separate from
  the repository scan queue and from the port scan queue.
- A scan sends a report only when a list changed. A `skills.updated`
  refresh scans again and sends the full report with its command receipt.
- The Claude list holds each `.claude/skills/<folder>/SKILL.md` of the
  repository folder. The name is the front matter `name`, else the folder
  name. The description is the front matter `description`, else the first
  line of text without a heading mark, as Claude takes it. A front matter
  that does not read is ignored, as Claude ignores it, and the runner warns.
  `disable-model-invocation: true` sets `manualOnly`. A skill whose
  `user-invocable` is set to a value other than `true`, `yes`, `on`, or `1`
  stays out, because Claude then hides it from the menu of its user.
- The Codex list is the `skills/list` answer of a short Codex app server.
  It starts with the shared Codex home `~/.conductive/codex`, in the
  repository folder, without a login and without the `CONDUCTIVE_`
  variables of the runner. It asks with `forceReload`, keeps each enabled
  skill, and closes the server. A session with a gateway token has its own
  Codex home without a `skills` folder, so the list does not use it.
- The runner asks the app server after each connect, after a change of a
  `SKILL.md` in the Codex folders, and for a repository change or a refresh
  that comes 30 seconds or more after the last question. Each question
  starts one app server process.
- When the app server gives no answer within 5 seconds, ends, or refuses,
  the Codex list holds each `SKILL.md` below `.agents/skills` and
  `.codex/skills`, to a depth of 6 folders, without hidden folders, as Codex
  scans. Each such skill needs a front matter with a `description`, as
  Codex needs it. The runner warns once, until the app server answers
  again.
- A scan reads a `SKILL.md` again only when its size, times, or inode
  changed. One `SKILL.md` that does not read, or that holds more than
  1 MiB, warns and leaves out its skill. A skill folder that does not read
  keeps the last list of its agent and warns. A scan gives each warning
  once, until a scan no longer gives it.
- The runner leaves out a skill whose name holds white space or a control
  character, or more than 256 characters, and a skill whose name holds a
  known credential. It warns for each one. Of two skills with one name, it
  keeps the one that the agent gives first.
- The runner filters known credentials out of each description with the
  shared output filter. It never cuts a description, because the
  workspace filters marked secret values only after it gets the report. It
  sends a description over 4096 characters as an empty string, and warns.
- Each list keeps the first 200 skills in name order, by UTF-16 code
  units. A larger list warns.
- The runner gives the serialized report a 512 KiB budget. It fits whole
  descriptions in list order, Claude first. A description that does not fit
  becomes an empty string, with a local warning. The names alone stay
  within that budget.
- The report holds no path. `SkillLists` keeps the reported skills with
  the absolute path of each `SKILL.md`, for the skill input of Codex, as
  [Skills of a message](agent-input.md#skills-of-a-message) says.

[The skills report](../docs/protocol/skill-mentions.md#the-skills-report)
states the folders, the limits, the filters, and when the report goes.
