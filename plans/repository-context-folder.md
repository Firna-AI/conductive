# Attached files and notes in the `.context` folder

Status: Active. On branch `calummoore/repo-context-attachments`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today the Worker copies each attached file of a chat message to a hidden
file in the home folder of the cloud computer,
`/home/user/.conductive-attachment-<digest>.<ext>`. It is away from the
code, and agents and members do not find it next to the repository.
Conductor keeps a `.context` folder in the repository folder of each
workspace instead. Git ignores it through `.git/info/exclude`. Attached
files go to `.context/attachments/`, and agents keep notes and screenshots
there.

This change does the same in Conductive. The Worker copies each attached
file into `.context/attachments/` in the repository folder of the
workspace (decision 242). At each start, the runner makes the `.context`
folder and makes Git ignore it, and the agent instructions name the folder
(decision 243). The text that each message adds for its files tells the
agent to read each file before it answers, and it gives the size of each
file (decision 244). The change does not show `.context` files in All
files or Changes, so members find them in the terminal. It does not show
images in the chat, and it adds none of Conductor's pull request context
files or artifacts.

Contract owners:

- [Messages and attachments](../docs/protocol/messages-and-attachments.md#attachments).
- [Repository folders](../docs/protocol/repository-folders.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- [Conductor Cloud comparison](../docs/protocol/conductor-cloud-comparison.md#statuses).
- [Chat attachment storage and delivery](../worker/chat/attachments.md).
- The [runner README](../runner/README.md) and the
  [sandbox provider README](../worker/sandbox/README.md).

Replaced ways:

- The hidden file `/home/user/.conductive-attachment-<digest>.<ext>` →
  `.context/attachments/<digest>/<safe name>` in the repository folder.
  Consumers: `attachmentPath` and its callers in the claim and the copy,
  the runner delivery that sends the paths, the copy, delivery,
  destination, and integration tests of `worker/chat/`,
  `runner/src/providers/attachments.test.ts`, the comment of
  `RunnerAttachment.path` in `src/shared/runner.ts`, and
  `worker/chat/attachments.md`. Moved in Milestones 2 and 3. Milestone 2
  deletes the old path builder.

## Decisions

The options check of 10 November 2026 changed both root questions, added
options C and D to decision 243, and kept both recommendations. Its report
is in `.context/repository-context-folder/options-check.md`.

### 242. Attached files live outside the repository

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/chat/attachment-record.ts:71`
- **Background:** The Worker sets the path of each file when the workspace accepts the message. It copies the file when the turn starts. The agent gets the path, the name, and the media type. Boat's [upload URL reference](https://docs.boat.dev/api/reference/agent/create-upload-url) says that Boat creates missing folders, so the Worker can write into `.context/attachments/` directly.
- **Problem:** Each attached file is a hidden file in the home folder, away from the code. Agents and members who use the terminal do not find it in the repository folder.
- **Impact if no action:** Agents and members need the hidden absolute path. The layout stays different from Conductor's.
- **Root question:** Where do attached files live, so that agents and terminal users find them in the repository folder, and Changes and commits never include them?
- **Options:**
  - **A.** The Worker writes each file straight into `.context/attachments/` in the repository folder. It also writes a `.gitignore` that holds `*` into that folder. The path code, its tests, and the Worker docs change. Effort: Medium.
  - **B.** The Worker keeps its hidden copy. Before the agent gets the message, the runner hard-links each file into `.context/attachments/` and adds the Git ignore rule. Each file then has two names. Only cloud computers from a new org image get the change. Effort: Medium.
- **Left out:**
  - A runner download of each file. A direct read of the bucket breaks the rule that only the Worker reads the bucket, as [Orgs and workspaces](../docs/protocol/isolation.md#orgs-and-workspaces) says. A download through a new Worker route, or the bytes over the runner connection, is worse than A on every point.
  - A folder outside the repository, no change, and a folder with no Git ignore rule. Each fails the goal.
  - A folder inside `.git/`. It fails the request for `.context`, and the runner refuses each file read under `.git`.
  - A hidden copy with one folder link from `.context/attachments/`. It keeps the two names of B, and A is better on every point that the goal names.
- **Wider fix:** None. This is a design question, not a class of defect.
- **Previous examples:** Conductor saved the user's screenshot of 6 November 2026 under `.context/attachments/assets/<id>/`, as the plan `boat-native-remote-workspaces.md` records. Decision 132 A chose R2 storage and the Worker copy. Fix round 1 of PR #71 chose the digest name with its extension.
- **Related:** Decision 243 decides whether the rest of `.context/` also becomes a notes folder.
- **Recommendation:** A. It reaches every workspace at once, also workspaces with older runners, and it keeps one copy of each file.
- **Action:** ask the user, because A adds a requirement that no protocol doc has yet: the place where each file lands in the cloud computer.
- **Chosen:** A, by the user on 10 November 2026.

### 243. Choose the scope of the `.context` folder

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `runner/src/instructions.ts:21`
- **Background:** Conductor tells agents that `.context/` is a folder that Git ignores, for notes, screenshots, and files for other sessions. The comparison page lists ".context folder" as Under consideration, in `src/marketing/from-conductor/areas/workspaces-and-branches.ts`. Decision 242 makes only `.context/attachments/`. It tells agents nothing about the folder.
- **Problem:** Agents have no notes folder that Git ignores. A note that an agent writes in the repository shows in Changes and can go into a commit.
- **Impact if no action:** Agent notes and screenshots can go into commits. The comparison row stays Under consideration.
- **Root question:** Where do agents keep notes, screenshots, and files for other sessions, so that those files stay out of Changes and commits?
- **Options:**
  - **A.** A folder for attached files only. The comparison row stays Under consideration. Effort: Small.
  - **B.** The whole folder. At each start, the runner makes `.context/` and adds it to `.git/info/exclude`. The agent instructions name the folder and what it is for. `docs/protocol/agent-instructions.md` and the comparison row change. In a repository that tracks its own `.context/`, Git then ignores new files in that folder. Only cloud computers from a new org image get the change. Effort: Medium.
  - **C.** A notes folder outside the repository folder, such as `/home/user/notes`. The runner makes it, and the agent instructions name it. It needs no Git rule, and `git clean -fdx` does not delete it. The notes and the attached files then live in two places, and the comparison row can move only to Works differently. Added by the options check. Effort: Small.
  - **D.** As B, but the Worker's start command makes `.context/` and its exclude rule at each create and each resume. The runner adds only the instruction text. A workspace from an older org image then gets the folder at its next start, but its agents are not told about it. A defect in the step can fail every start unless the step warns and continues. Added by the options check. Effort: Medium.
- **Left out:**
  - A `.context/` line in the `.gitignore` of each repository. It adds a tracked change on every branch.
  - A rule that the org image build writes. It also waits for a new org image, and it does not come back after an agent removes it. B is better on every point.
  - A global Git ignore file. It covers every repository of the cloud computer and can clash with an ignore file of the org. The local exclude file is better on every point.
  - A `.gitignore` with `*` inside `.context/`. It stops working when an agent remakes the folder, and it can replace a tracked file. The exclude rule is better on every point.
  - Instructions that tell each agent to add the rule. One skipped step puts notes in Changes, so it fails the goal.
- **Wider fix:** None. This is a design question, not a class of defect.
- **Previous examples:** Conductor wrote `.context/` into `.git/info/exclude` of its own workspaces. The comparison row `context-folder` names the feature.
- **Related:** Decision 242 makes `.context/attachments/`. B adds the rest of the folder around it.
- **Recommendation:** B. One owner keeps the folder, its rule, and the instruction text together, and it completes the Conductor feature that the comparison page tracks.
- **Action:** ask the user, because B changes the agent instructions that a protocol doc states, and it changes the status of a comparison row.
- **Chosen:** B, by the user on 10 November 2026. Options C and D came after the choice.

### 244. The attached-file text has no read instruction

The options check of 10 November 2026 changed the root question, added
options E and F, and kept the recommendation. Its report is in
`.context/repository-context-folder/options-check-244.md`.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `runner/src/providers/attachment-description.ts:4`
- **Background:** For each message with files, the runner adds one line per file to the agent's input: `Attached file: {"name":…,"mediaType":…,"path":…}`. Fix round 1 of PR #71, in commit `35265e46`, chose this one-line JSON form, so that a name with quotes or a line break stays inside its value. Codex also gets each image as image input. Conductor adds a block before the message instead: "The user has attached these files. Read them before proceeding." It lists each path with its size.
- **Problem:** The current text gives the facts, but it does not tell the agent to read the files. An agent can answer without opening a file.
- **Impact if no action:** An agent can skip a file that the member expects it to read. The text stays different from Conductor's.
- **Root question:** How does each agent take in every file that a message carries before it answers?
- **Options:**
  - **A.** Keep the current text. The agent gets the facts only. Effort: Small.
  - **B.** Put one rule in the agent instructions: "When a message has attached files, read them before you answer." It is stated once for each session, far from the files. A session that started before the change never gets it, and only cloud computers from a new org image get it. Effort: Small.
  - **C.** Put one line before the file lines of each message: "The sender attached these files. Read each file before you answer." Keep the JSON lines, and add the size to each. Only cloud computers from a new org image get it. Effort: Small.
  - **D.** Use Conductor's block as it is, with a path and a size on each line. The agent then loses the original name and the media type of each file. Only cloud computers from a new org image get it. Effort: Small.
  - **E.** As C, and give Claude each image as image input, as Codex gets it today. The runner reads each image when it sends the message, and an image that the model service refuses gets the path only. An image that the service cannot decode can fail the whole turn. Added by the options check. Effort: Medium.
  - **F.** As C, but the Worker adds the read line to the text of the message in the runner command, and the runner adds only the size. Older org images get the line at once. App text then goes into the field that holds the member's words, and the text gets two owners. Added by the options check. Effort: Small.
- **Left out:**
  - A line that the composer adds to the member's text. It breaks the rule that the stored message and the chat hold only the member's words, as [Agent instructions](../docs/protocol/agent-instructions.md) says.
  - A runner check that the agent read each file. It fails the goal, because the runner cannot see every read.
- **Wider fix:** None. This is a design question, not a class of defect.
- **Previous examples:** Fix round 1 of PR #71 chose the JSON form. Conductor's block is in the user's copy of Conductor's prompts.
- **Related:** Decision 243 changes the same agent instructions. B would add its rule to that text.
- **Recommendation:** C. It puts the instruction next to the files, in the one place that builds the agent input. If Claude still skips attached images after C ships, E is the next step.
- **Action:** ask the user, because C changes a requirement in `docs/protocol/messages-and-attachments.md`, which says that the agent gets the path, the name, and the media type of each file.
- **Chosen:** C, by the user on 10 November 2026. Options E and F came after the choice.

## Design calls

My calls, on 10 November 2026:

- Each file goes to `.context/attachments/<digest>/<safe name>`. The
  digest is the first 32 characters of the lowercase hexadecimal SHA-256
  of the message ID and the attachment ID. Reason: the digest keeps the
  copy of each message apart, as the old path did, and a folder name never
  starts with a hyphen.
- The safe name keeps ASCII letters, digits, dots, underscores, and
  hyphens, as the repository folder names do. One hyphen replaces each run
  of other characters. The name keeps at most 100 characters, with its
  extension in lowercase. An empty stem becomes `file`. Reason: a readable
  name helps agents and members, as in Conductor, and the provider binds
  each upload to its exact canonical path.
- The stored command keeps each path relative to the repository folder, in
  a type of its own. The Worker resolves it from the current folder map of
  the workspace, at the copy and again when it sends the command to the
  runner. So every runner gets an absolute path, as today. Reason: a new
  workspace can accept its first message before its runtime folder map
  exists, and a retried first start can use a newer map. A runner from an
  older org image needs no change.
- The files go into the repository folder of the workspace's own
  repository, not into the other repositories of the image. Reason: both
  agents start there.
- Before the first file of each copy, the Worker writes
  `.context/attachments/.gitignore` with `*`. Reason: Git then ignores the
  files also under a runner from an older org image, with no new provider
  route. Each copy writes the same bytes, so two copies at once do no harm.
- `SandboxProvider.writeFile` creates missing parent folders. Boat does
  this. The sandbox README states it for each later adapter. The upload
  fakes model no folders, so only the live check shows it.
- At each start, before its first file report, the runner adds `/.context/`
  to the local exclude file that `git rev-parse --git-path info/exclude`
  names. Then it makes `.context/` and `.context/attachments/`. It adds
  the line once. It leaves a `.context` that is a file or a link alone. It
  warns and continues after a failure. Reason: the anchored rule hides no
  `.context` folder deeper in the repository, the sandbox user owns both
  folders before the first upload, and a failed step must not stop the
  runner.
- The agent instructions get two entries after the repository folders.
  The first is `Context folder: "<repository folder>/.context"`. The second
  is "Git ignores the context folder. Keep notes, screenshots, and files
  for other sessions of this workspace there. Attached files arrive in its
  attachments folder." Reason: these are Conductor's facts, in the form of
  the other entries. The user saw this text on 10 November 2026.
- The agent instructions do not ask agents to show screenshots in replies.
  Reason: the chat does not show images, as
  [Chat Markdown](../docs/protocol/chat-markdown.md) says.
- For decision 244, the read line comes once after the text of the
  message, before the first file line. Each file line adds `sizeBytes`
  from the metadata of the message. Codex keeps its image input after
  each file line, and its read line adds "Each image is also in this
  message." Reason: the line then stands next to the files in both agents,
  and Codex spends no tool step on an image that it already has. The size
  tells the agent how large a file is before it reads it, as in Conductor,
  and needs no file read in the cloud computer.
- A command that deletes ignored files, such as `git clean -fdx`, deletes
  the folder and the attached files in it. The protocol doc states this
  limit. Reason: Conductor has the same limit, and the bucket keeps each
  file.
- A message accepted before the deploy keeps its old path. Its copy check
  fails once, and Try again gives the message a new path. Reason: the
  project is not in production.
- A repository with a `.context` file or link at its top cannot take
  attached files. The copy fails with the existing copy error. Reason: such
  a repository is rare, and a second location doubles the path rules.
- The comparison row moves to Available in this change, because the merge
  ships the feature. The comparison mockup reads the same rows, so the plan
  has no mockup milestone.
- Decisions 242 to 244 took the next free numbers on 10 November 2026.

## Milestone 1: Documentation and protocol

Depends on: none

State the requirements and the decisions in force for the work below.

- [ ] In [Attachments](../docs/protocol/messages-and-attachments.md#attachments),
      state that the Worker copies each file into `.context/attachments/`
      in the repository folder of the workspace, and that Git ignores each
      copied file. Give decision 242 with its reason and the rejected
      alternatives.
- [ ] In the same section, state that the agent gets one line that tells
      it to read each file before it answers, and the size of each file
      with its path, name, and media type. Give decision 244 with its
      reason, the reason for the size, and the rejected alternatives.
- [ ] In [Repository folders](../docs/protocol/repository-folders.md), add
      the section "The context folder" with decision 243: the folder, its
      exclude rule, its creation at each start, the tracked files that stay
      tracked, and the `git clean` limit. Update the first paragraph of the
      doc.
- [ ] In [Agent instructions](../docs/protocol/agent-instructions.md), add
      the folder to the facts and its use to the guidance.
- [ ] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact, or record that no sentence does.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 2: Attached files go into `.context/attachments/`

Depends on: 1

- [ ] `attachmentPath` returns the relative path of the design calls. Add
      tests for the safe name: spaces, other scripts, a long name, an empty
      stem, and an extension in capitals.
- [ ] The stored command keeps the relative paths in their own type.
- [ ] The copy reads the folder of the workspace's repository from its
      folder map, writes the `.gitignore`, and then writes each file under
      that folder. Add tests for the paths that the provider gets.
- [ ] The runner delivery resolves each path from the same folder before
      it sends the command. Add a test for the path that the runner gets,
      also after a restart that reads a stored copy proof.
- [ ] Move the delivery, destination, and integration tests to the new
      path, with every assertion.
- [ ] Delete the old path builder.
- [ ] Update `worker/chat/attachments.md`, the comment of
      `RunnerAttachment.path`, and the File writes section of
      `worker/sandbox/README.md`.
- [ ] Run `npm run test -- worker/chat worker/sandbox`.

## Milestone 3: The runner makes the folder

Depends on: 1

- [ ] Add the start step of the design calls, before the first file report.
- [ ] Name the folder and its use in the agent instructions.
- [ ] Add the read line and the size of each file to the attached-file
      text of both agents, as decision 244 and the design calls say.
- [ ] Move the sample path of `runner/src/providers/attachments.test.ts` to
      the new form. Move the exact attached-file text that
      `runner/src/providers/instructions.test.ts` asserts for both agents.
- [ ] Add tests: the step in a temporary repository, a repeated start, a
      `.context` file, a failed step, the instructions, and the
      attached-file text of both agents.
- [ ] Update the [runner README](../runner/README.md) and the Agent input
      section of `worker/chat/attachments.md`.
- [ ] Run `npm --prefix runner run typecheck` and `npm --prefix runner test`.

## Milestone 4: The comparison row

Tags: ui

Depends on: 2, 3

- [ ] Set the `context-folder` row to Available, with a note that says
      what Conductive does. Follow the claim rules of the comparison doc and
      the copy rules of the `product-ui` skill.
- [ ] Run `npm run mockups:check`. Look at the row on the comparison page
      and in its mockup.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      complete gate, `npm run check`.
- [ ] Check that no other plan on `origin/main` or an open branch uses
      decisions 242 to 244. Renumber them when one does.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy and a new org image build, attach a file in a real
      cloud computer. Check that the agent reads it from
      `.context/attachments/`, that Changes does not list it, that
      `.git/info/exclude` holds `/.context/`, and that the agent can write
      a note into `.context/`.
- [ ] In a workspace from an older org image, attach a file. Check that
      the agent reads it and that Changes does not list it.
