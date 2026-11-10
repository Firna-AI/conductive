# Import from Conductor

Status: Active. On branch `calummoore/conductor-import-option`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductive replaces Conductor Cloud. Conductor Cloud goes read-only on
13 November 2026, and on 20 November 2026 Conductor starts to delete the
cloud data. Conductor's own advice is Transfer to local, which moves a
cloud workspace and its chats into the Conductor Mac app. Conductor's Mac
app keeps working until early 2027.

This change adds an import of local Conductor workspaces, also the cloud
workspaces that the user transferred, into Conductive. Only the Conductive
Mac app imports. It reads the work, the chats, and the names on the user's
Mac. Each imported workspace appears at once, with a "from Conductor" flag,
its name, and its old sessions, and with no cloud computer. When the user
opens it, the app asks to activate it. Activation starts the cloud
computer, and the runner copies the stored work in. The change also lets a
new workspace continue a branch that already exists on GitHub.

This change does not import Conductor sections, Conductor's env vars, or
Conductor's setup scripts. It reads no data through the Conductor API. The
brainstorm notes and sources are in `.context/conductor-import/notes.md`,
and the options checks are in `.context/import-from-conductor/`.

Contract owners:

- A new protocol doc, `docs/protocol/conductor-import.md`, which
  Milestone 2 creates.
- [Mac app](../docs/protocol/desktop-app.md), for the scan of the Mac and
  the new device operations.
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md),
  for imported workspaces, activation, and a new workspace on an existing
  branch.
- [Chat and events](../docs/protocol/chat-and-events.md), for the old
  sessions.
- [Access and security](../docs/protocol/access-and-security.md), for the
  stored import data.
- The [architecture doc](../docs/architecture.md), for the import flow.
- The READMEs of the changed areas: [desktop](../desktop/README.md),
  [worker/app-api](../worker/app-api/README.md),
  [worker/lifecycle](../worker/lifecycle/README.md),
  [worker/chat](../worker/chat/README.md), [runner](../runner/README.md),
  [src/app](../src/app/README.md), and
  [src/shell/workspace](../src/shell/workspace/README.md).

## Facts that the design uses

Checked on 8 and 9 November 2026. The notes give each source.

- The Conductor API reads no files. A transferred workspace keeps no link
  to its cloud ID, so the API cannot add data to it.
- Transfer to local makes a normal local Conductor workspace: a Git
  worktree under `~/conductor/workspaces/<repository>/<folder>/`, whose Git
  data sits in `~/conductor/repos/<repository>/`. The worktree has its
  branch, its commits, the files that Git sees, and `.context`.
- Transfer to local writes each chat as the agent's own session file:
  - Claude: `~/.claude/projects/<folder path with dashes>/<session ID>.jsonl`,
    in the Claude Code session format, which the Claude Agent SDK resumes.
  - Codex: `~/.codex/sessions/<year>/<month>/<day>/rollout-<time>-<session ID>.jsonl`.
    Older Codex files are compressed as `.jsonl.zst`.
- Conductor's Mac app keeps its records in
  `~/Library/Application Support/com.conductor.app/conductor.db`, a
  SQLite database with a private layout. The user's file is 25 GB.
  - `workspaces`: the local ID, `workspace_name`, `directory_name`,
    `branch`, `state`, `pr_title`, `workspace_path`, and the repository.
    A transferred workspace keeps its cloud name in `workspace_name`.
    Workspaces that were always local have no `workspace_name`.
  - `repos`: the Git remote, the name, the default branch, and the setup,
    run, and archive scripts.
  - `sessions`: the title, the agent, the model, and the ID of the agent's
    session file.
  - `session_messages`: every message that Conductor shows. The two test
    workspaces had 33 and 14 messages in their sessions.
  - `navigation_sections` and its links exist, but they hold no rows. So
    the Mac has no sections.
- The user had 36 local Conductor workspaces that were not archived.
  Folder names repeat across repositories and over time, so only the local
  ID names a workspace.
- The page of the Conductive Mac app has no bridge to its main process, by
  decision 62 of the main plan. The Mac app reaches the Worker through its
  device connection, where each message holds at most 1,000,000 bytes.
- Decision 132 of the main plan chose one R2 bucket for message
  attachments. Milestone 8p of the main plan builds it. Today every
  attachment upload fails. Milestone 8p also leaves open how a file gets
  into a cloud computer: a new provider route that writes files, or the
  runner connection.
- A short-lived upload link to R2 needs an R2 access key as a new Worker
  secret, which `docs/deployment.md` must list.
- Each workspace record of Conductive needs a first message, a first
  session, and a model. The resume refuses a workspace with no cloud
  computer.
- A tab that opens loads every stored chat event of its workspace.
- The runner gives the agent no instructions of its own. Claude reads only
  the project settings of the repository.
- Cloudflare limits: a Worker request gets 30 s of CPU by default and
  128 MB of memory, and a request body holds at most 100 MB on the Free
  and Pro zone plans. A storage object holds up to 10 GB, in rows of at
  most 8 MB.

## Decisions

### 1. How Conductor work comes into Conductive

- **Root question:** How does a Conductor user bring their work into
  Conductive and continue where they stopped?
- **Options:**
  - **A.** No product change, only a guide. Effort: Small.
  - **B.** A new workspace can continue a branch or an open pull request
    from GitHub. Effort: Medium.
  - **C.** B, plus an import through the Conductor API. Effort: Large.
  - **D.** B, plus an upload of Conductor's Export data archive. Effort:
    Large.
  - **E.** B, plus an import of local Conductor workspaces by the Mac app.
    Effort: Large.
  - **F.** B, plus an import of local Conductor workspaces through a
    Terminal command now, and through the Mac app later. Effort: Large.
  - **G.** F plus C. Effort: Large.
- **Recommendation:** B on 8 November, then F on 9 November.
- **Chosen:** C, by the user on 8 November 2026, with three additions:
  - New branch stays the default of New workspace.
  - A subtle control lets the user pick an existing branch, because that
    choice is not common.
  - The user chooses what to import: everything, or single workspaces.
- **Clarified by the user on 9 November 2026:** the import serves every
  Conductive user, built into the app, with no large performance cost.
- **Changed to E, by the user on 9 November 2026:** "we do it directly
  from the files/local workspaces", and "import only works in the mac app".
  Reason: the API reads no files, and the user's test showed that Transfer
  to local brings the files, the branch, and the chats onto the Mac.

### 2. Two open workspaces on one branch

- **Root question:** What does the app do when a new or imported workspace
  would use the branch of another open workspace in its org?
- **Options:** **A.** Allow it, and show nothing. **B.** Allow it, and name
  the other workspace. **C.** One open workspace for each branch. **D.** C,
  held by a unique index. **E.** C, with a new branch from the taken one.
- **Recommendation:** D.
- **Chosen:** A, by the user on 9 November 2026. Two open workspaces can
  use one branch, and the app shows nothing.

### 3. How the chats, names, and sections reach Conductive

- **Root question:** How does every user keep the chats, names, and
  sections of each workspace, also for a workspace that the user imports
  later?
- **Options:** A to F read them through the Conductor API, I and K save
  them before 20 November, and L reads Conductor's data on the Mac. The full
  options are in commit `8adf573`.
- **Recommendation:** I.
- **Settled on 9 November 2026 by decision 1, option E:** the names and the
  chats come from the Mac, where they stay until early 2027. Decision 10
  says what happens to the sections.

### 4. How the user continues an imported workspace

- **Root question:** How does the user continue the work of an imported
  workspace on a cloud computer?
- **Options:** A first message starts it, opening starts it, the import
  starts it, a read-only import with Continue into a new workspace, or a
  first start with the message rules of a resume.
- **Recommendation:** D, a new linked workspace.
- **Chosen:** the user's design of 9 November 2026. The import creates
  the workspace at once with a "from Conductor" flag, its name, and its
  sessions, and with no cloud computer. When the user opens it, the app
  asks to activate it. Activation creates and starts the cloud computer,
  and then copies the stored work in. The agent recommended D. This needs a
  new kind of first start.

### 5. How the agent of an activated workspace continues its old work

Changed on 9 November 2026: Transfer to local writes each chat as the
agent's own session file, which makes option E possible. The options
check of the same day added F and G, graded E as Large, and changed the
recommendation from E to F.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `runner/src/providers/claude.ts`, `runner/src/providers/codex.ts`.
- **Background:** The runner resumes Claude with the SDK option `resume`,
  and Codex with the App Server call `thread/resume`. It keeps the agent
  data in `~/.conductive/claude` and `~/.conductive/codex` of the cloud
  computer. It pairs each Conductive session with its agent session only
  in its own state file, from the agent's own event. Only a Claude file
  depends on the folder path of the repository. By default, Claude Code
  deletes a session file that nobody used for 30 days, so an old session
  can have no file. Conductor's `session_messages` keeps every message.
  Conductive gives Codex only an OpenAI API key, and a Conductor Codex
  session may have run on a ChatGPT login.
- **Problem:** With B, the agent rereads a transcript and loses its
  working memory. With E, a session whose file is gone has no source.
- **Impact if no action:** Each activated workspace starts colder than it
  needs to.
- **Root question:** How does the agent of an activated workspace continue
  its old work?
- **Options:**
  - **B.** The old chats go into `.context` as Markdown, and the agent reads
    them. The runner gives no instructions today, so the first message or a
    new instruction must name the files. Effort: Medium.
  - **E.** Activation puts each session file into the agent data of the
    cloud computer, writes each pair into the runner state, and gives each
    imported session its starter. The old session then continues with its
    full memory. B stays the fallback for a session that does not resume.
    Effort: Large.
  - **F.** E, and a session whose agent file is gone gets B's text from its
    `session_messages` rows. Nobody has read the layout of those rows.
    Effort: Large.
  - **G.** F, and the import also rebuilds an agent file from the rows of
    such a session, so that it can resume too. It writes one private format
    from another, and signed thinking blocks survive only if the rows keep
    them. Effort: Large.
- **Left out:** A summary in the first message, because it needs a model
  call and loses detail. An agent tool that reads old chats, because B
  gives the same text with no new token call. Mac commands that read the
  old files, because they fail when the Mac is off.
- **Wider fix:** None. Each session either resumes or falls back to B.
- **Previous examples:** Decisions 51 and 115 of the main plan start new
  sessions without earlier history in other cases.
- **Related:** Decision 7 shows the old part of each session. Decision 8
  carries the files.
- **Recommendation:** F. The agent picks up where it stopped, and a session
  without its file still reaches the agent as text. The plan first
  recommended E. If the checks before Milestone 1 find no session without
  its file, E is enough.
- **Chosen before:** B, by the user on 9 November 2026: the agent starts
  from the transcript.
- **Action:** ask the user, because F changes the answer that the user
  gave.

### 6. How the work that GitHub does not hold reaches the cloud computer

- **Root question:** How does the app move, for every user, the Conductor
  work that GitHub does not hold into the cloud computer of the imported
  workspace?
- **Options:** a Mac app screen, a browser upload, a command-line tool,
  Mac commands, a private repository, an upload page, a Terminal command,
  an upload during the first start, a hidden ref, or the attachment bucket.
  The full options are in commit `8adf573`.
- **Recommendation:** K, the attachment bucket.
- **Settled on 9 November 2026 by decisions 1, 4, and 9:** the Mac app
  sends the work to a data bucket at the import, and activation copies it
  in. Decision 8 says what the bucket holds.

### 7. How the old sessions show

Changed on 9 November 2026: the import reads each chat on the Mac, and
the user's design copies the sessions into the workspace at once. The
options check of the same day changed the root question, added I and J,
and changed the recommendation from H to I.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/chat/history-pages.ts`, `src/app/workspace-model.ts`,
  `src/files/model/files-store.ts`.
- **Background:** The first show of a workspace in a tab replays its whole
  stored log, for the workspace model, the Files panel, and the chat. The
  history read of one session also lists every stored event. One cloud
  workspace held about four sessions. The runner maps only live stream
  messages, in the runner package. Session file lines need new mapping,
  and Codex rollout lines need a new Codex mapping. After activation,
  decision 5 can let an old session continue.
- **Problem:** Old sessions in the live log add to the replay of every
  first show. The same replay slows every long workspace.
- **Impact if no action:** Imported workspaces open slowly, as long native
  workspaces already do.
- **Root question:** How do the old sessions of an imported workspace show,
  before and after activation, without slowing the workspace?
- **Options:**
  - **B.** Copy them into the live log as read-only sessions. Each first
    show then replays every old event. Effort: Large.
  - **F.** Each old session becomes one Markdown file. The imported
    workspace lists its old sessions as links, and a link opens the file in
    the app's existing Markdown view. The app keeps these files for the life
    of the workspace, so the links work before activation and while the
    cloud computer is stopped. Activation also puts them in
    `.context/conductor/` for the agent. It needs no event mapping and no
    change to how the chat loads. A resumed session starts as a new session
    tab that links back to its old file. Effort: Medium.
  - **H.** Store each old session apart from the live log, as the app's
    own chat events. It opens as a session tab, and it loads only when
    opened. A resumed session adds its new turns below the old part.
    Effort: Large.
  - **I.** B, with readers that read only their own part of the log. The
    session read uses an index for each session, and the workspace and
    Files streams replay only their own kinds of events. Every long
    workspace then opens faster too. The chat events rules guard that
    code, and the Events requirements need a new sentence. Effort: Large.
  - **J.** The old part of each session comes from its `session_messages`
    rows, so a session whose agent file is gone still shows. It works with
    B, F, H, or I. Nobody has read the layout of the rows. Effort: Large,
    or Medium with F.
- **Left out:** Views that need a running cloud computer or the agent,
  because the user's design shows the sessions at once. G, F with the raw
  pages kept, because the Mac keeps the raw data. A conversion in the
  browser, because no provider event type may reach the browser. A view
  only on the Mac, because it fails on the user's other devices.
- **Wider fix:** I. It removes the cause for every workspace, whatever
  fills the log. H must know that an event came from the import.
- **Previous examples:** An archived workspace already shows its chat
  read-only.
- **Related:** Decision 5: a resumed part needs E or F there, and the
  Markdown of option F here can serve B there.
- **Recommendation:** F. The user asked on 9 November 2026 for links to
  Markdown files, so a document look is enough, and F adds no load to the
  chat. Add J for each session without its agent file. The slow replay of
  long workspaces is a separate problem, and option I can fix it in its own
  change. The plan first recommended H, then I.
- **Action:** ask the user, because the user asked a question and has not
  chosen F yet.
- **Chosen:** F, by the user on 10 November 2026. The user did not choose
  J. If the checks before Milestone 1 find sessions without their agent
  file, J comes back as a question.

### 8. What the data bucket holds

- **Root question:** What must the bucket hold so that activation restores
  the work exactly?
- **Options:** **A.** The files that differ from GitHub, by hash. **B.** The
  whole working tree. **C.** The whole copy with its Git history. **D.**
  A Git bundle of the commits that GitHub lacks, the changed and untracked
  files that Git sees, `.context`, and the agent session files of the
  workspace.
- **Agent call, 9 November 2026:** D. The Mac app runs Git, so D is exact
  and small: it keeps every commit, and Git fetches the rest from GitHub at
  activation. B and C upload far more, and A loses the commits.

### 9. What reads the data on the Mac

- **Root question:** Which program reads a user's local Conductor data?
- **Options:** **A.** The browser, with folder picks. **B.** A Terminal
  command. **C.** The Conductive Mac app.
- **Recommendation:** B now, C later.
- **Chosen:** C, by the user on 9 November 2026: "descope the browser, so
  import only works in the mac app".

### 10. The sections of imported workspaces

- **Root question:** Which section does an imported workspace go to?
- **Options:** **A.** One section, "Import from Conductor". **B.** One
  section for each repository. **C.** The cloud sections, through the API
  until 20 November, matched by name and branch.
- **Chosen:** A, by the user's rule of 9 November 2026: "drop sections and
  just import everything into a single section e.g. 'Import from
  Conductor' if getting sections is hacky/non-trivial". The Mac has no
  sections, and a transferred workspace keeps no cloud ID, so only C could
  give them, and C is a guess.

### 11. A size limit for imported files

Added on 10 November 2026, from the user's question "is there a file size
limit?". The design first set a limit of 100 MB as an agent call, but a
new limit needs the user's approval. The options check of the same day
changed the root question, added E and F, and changed the recommendation
from B to B with E.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** The import package holds the changed and untracked files
  that Git sees. A user can have large untracked files that `.gitignore`
  does not exclude, such as data sets, videos, or build output. GitHub
  refuses a file over 100 MiB in a push. The runner connection carries any
  total size in parts, so a large package only takes longer to send. The
  import list shows the upload size of each workspace. Nobody has measured
  the free disk of a new cloud computer.
- **Problem:** No requirement bounds the size of an imported file, a
  package, or the unpacked work on the disk of the cloud computer.
- **Impact if no action:** One very large file can make an import and its
  activation slow, and it can fill the disk of the cloud computer.
- **Root question:** How does the import treat large files, with no lost
  work, no slow import or activation, and no full disk in the cloud
  computer?
- **Options:**
  - **A.** No limit. Every file that Git sees comes along, whatever its
    size. Effort: Small.
  - **B.** A changed or untracked file over 100 MiB stays on the Mac, and
    the import result lists it. The rule never applies to the Git bundle,
    the agent session files, or the Markdown files, which must stay whole.
    Effort: Small.
  - **C.** B, and the Mac app asks before it uploads a workspace whose
    package passes 1 GB. Effort: Small.
  - **D.** No fixed limit. The list shows each file over 100 MiB with a box
    that starts as "left out", and the user can include it. Effort: Medium.
  - **E.** Activation first checks that the bucket data fits the free disk
    of the cloud computer, with room to unpack it. When it does not fit,
    activation stops before it changes the checkout, keeps the bucket data,
    and names both sizes. It works with A, B, C, or D. It is a new failure.
    Effort: Medium.
  - **F.** The Worker keeps a byte total for the bucket data of each
    imported workspace. It gives each upload link for a stated part size,
    checks the size that the bucket stored, and gives no more links when
    the total passes a fixed bound. It works with any option. It is a new
    rejection at the server. Effort: Medium.
- **Left out:** A limit in the runner connection, because it acts only
  after the upload already cost the time and the storage. A bound that
  refuses a whole workspace, because one large file then keeps the code
  out too. A rule by file or folder name, because a data set or a video has
  no fixed name. Compression, because it sets no bound. A move of large
  files into Git LFS, because it adds commits to the user's branch. A fetch
  from the Mac when the cloud computer needs a file, because it fails when
  the Mac is off. A download link for the runner, because the security
  rules allow no such credential in a cloud computer.
- **Wider fix:** F. A bound where the Worker gives each upload link holds
  for every client and for each later path into the shared bucket.
- **Previous examples:** Decision 132 of the main plan set a limit of 25 MB
  for each chat attachment. Decisions 65 and 93 put the default body limit
  at the Worker entry, so that a new route cannot forget it.
- **Related:** Decision 5: an agent session file must stay whole, or its
  session cannot resume.
- **Recommendation:** B with E. B leaves out only the single files that
  cannot be part of a branch on GitHub without Git LFS, which are usually
  data, not code. E is the only option that protects the disk. F protects
  the codebase best. Choose D if a skipped file must be able to reach the
  cloud computer. The plan first recommended B alone.
- **Action:** ask the user, because each option except A adds a new limit,
  a new failure, or a new rejection.

### 12. One upload path for attachments and the import

- **Root question:** How do all files that users upload reach the bucket?
- **Options:** **A.** Keep decision 132 of the main plan: attachments go
  through the server, with 25 MB for each file. **B.** Attachments use the
  import's direct upload in parts, with the file limit of decision 11.
  **C.** Separate paths, with the attachment limit just under the 100 MB
  request ceiling.
- **Recommendation:** B.
- **Chosen:** A, by the user on 10 November 2026, "for now". Decision 132
  of the main plan stays as it is.

## Design

Each call below is an agent call of 9 November 2026, unless it names a
decision or the user.

### Entry and detection

- The import lives in the Mac app only (decision 9).
- The user starts it from the settings or from the command palette, as
  the user asked.
- When the Mac app finds `conductor.db`, it offers the import once. The
  user can dismiss the offer.
- Before it reads any Conductor data, the Mac app asks the user, in a
  dialog of its own.
- The page talks to the main process only through the Worker and the
  device connection. Reason: the page has no bridge to the main process,
  by decision 62.

### The list

- The Mac app reads `conductor.db` in read-only mode and lists every local
  Conductor workspace that is not archived. This includes the transferred
  cloud workspaces. Reason: the local workspaces use the same data, and
  Conductor's Mac app also ends in early 2027.
- Each row shows the name, the repository, the branch, the sessions, and
  the size of the upload. The name is `workspace_name`, then the pull
  request title, then the branch, then the folder name.
- The user selects everything or single workspaces (decision 1).
- A row whose repository is not a chosen repository of the org cannot
  import. It says that an admin can add the repository.
- A workspace that the org already imported shows as imported, with a
  link to it. The app records the local Conductor ID for this.

### The import, at once

- The Worker creates each selected workspace with the "from Conductor"
  flag, its name, its branch, and no cloud computer, in the section
  "Import from Conductor" (decision 10). It creates that section when it
  does not exist.
- The Mac app reads each session file, also a compressed one, and turns
  it into one Markdown file: the messages, the agent's answers, and short
  lines for its tool steps (decision 7). It uploads the file with the
  bucket data.
- The Mac app copies a symbolic link as a link, and never follows it.
  Reason: a link to a large folder outside the worktree would otherwise
  upload that whole folder.
- A file that GitHub holds in Git LFS comes from GitHub at activation. A
  changed Git LFS file travels as a changed file, under decision 11.
- The Markdown files stay under a prefix of their own in the bucket for
  the life of the workspace. Activation does not delete them. Reason: a
  file can pass the 8 MB row limit of a storage object, and the links must
  work while no cloud computer runs.
- The Mac app builds the bucket data of decision 8 with Git, and uploads
  it straight to the bucket with short-lived upload links. No Worker
  request carries the bytes.
- Decision 11 says which files are too large to import.
- Each part, each session page, and each request stays small, as the
  performance rules below say.

### Activation

- Opening an imported workspace shows the links to its old sessions and
  asks to
  activate it (decision 4).
- Activation starts a cloud computer from the newest good org image. Git
  fetches the branch from GitHub, or the default branch when GitHub lacks
  the branch.
- The runner connects to the workspace, as at every start. Before the
  first turn, the workspace sends it the bucket data over that connection,
  in parts below 1 MiB, each with its byte range and its SHA-256. Both ends
  of the connection take only JSON text, so each part is Base64 text, and
  the bound counts the encoded part. The workspace sends the next part only
  after the runner confirms the last one, so that no side holds the whole
  package in memory. The
  runner checks each part and writes it to disk. Reason: this path needs
  no new provider route and gives the cloud computer no new credential.
  Milestone 8p of the main plan has the same choice for attachments, and
  can use the same path. A short-lived download link would be faster for a
  large package, but the security rules allow no such credential in a
  cloud computer today.
- The runner then fetches the commits from the bundle, checks out the
  branch at the newest commit of the Mac, and copies the changed files and
  `.context` over the checkout. It puts the session files in place as
  decision 5 says, and the Markdown files in `.context/conductor/`. Then
  the app deletes the bucket data of that workspace, except the Markdown
  files.
- A failed activation keeps the workspace, its sessions, and its bucket
  data, and it offers Try again.
- The import adds `.context/` to the local exclude file of the clone, so
  that Git ignores it and no push sends it.
- Bucket data of a workspace that the user never activates stays until the
  workspace is deleted, as decision 132 does for attachments.

### Continue a branch in New workspace

- New branch stays the default (decision 1). Under the repository picker,
  the line that says the workspace starts on a new branch gets a quiet
  link that changes the branch.
- The link opens a picker with the branches and the open pull requests of
  the repository on GitHub. The picker does not offer the default branch.
- A workspace on an existing branch keeps the name of that branch. Its
  start fetches that branch and checks it out with tracking.
- When the branch no longer exists on GitHub at the start, the start fails
  and names that cause.

### Performance

- The app moves only the work that GitHub does not hold. Git fetches the
  pushed history inside the cloud computer.
- The heavy steps run on the Mac or in the cloud computer: the Mac app
  reads the database and runs Git, and the runner applies the work.
- No Worker request handles more than one session page or one upload part.
- Each imported workspace keeps its data in its own storage object and its
  own bucket prefix, so imports run side by side.
- No cloud computer starts until the user activates a workspace.

## Checks before Milestone 1

These checks settle facts that decisions 5 and 7 need. They need no
product code. Save their results under `.context/import-from-conductor/`.

- [ ] Read the layout of one `session_messages` row on the user's Mac,
      after the user agrees.
- [ ] Count the local sessions whose agent file is gone.
- [ ] Measure the free disk of a new cloud computer, for decision 11.
- [ ] Prove one resume of a transferred Claude session file and of a Codex
      rollout file in a cloud computer, with each login kind that
      Conductive offers: a Claude subscription token, an Anthropic API key,
      and an OpenAI API key for a Codex history from a ChatGPT login.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw every screen and flow of the change, at the Mac app's desktop size,
and at phone size where a screen shows on a phone. The tab of a resumed
session waits for decision 5.

- [ ] Add the quiet branch link to the New workspace screen, and the
      branch picker with branches and open pull requests.
- [ ] Add the import entry in the settings and in the command palette, and
      the one-time offer when the Mac app finds Conductor data.
- [ ] Add the consent dialog, the list with Select all, the rows that
      cannot import, and the already imported rows.
- [ ] Add the import progress and the result, with the files that
      decision 11 leaves out.
- [ ] Add an imported workspace: its flag, the links to its old sessions,
      the Markdown view of one old session, the Activate
      question, activation progress, and a failed activation.
- [ ] Add the user flow `import-from-conductor`, from the offer to an
      activated workspace.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Create `docs/protocol/conductor-import.md` with the requirements of
      the scan, the consent, the list, the import, the bucket data, and
      activation.
- [ ] State the new device operations in the Mac app protocol doc.
- [ ] State imported workspaces, activation, and the branch choice of a
      new workspace in the protocol doc that holds Create a workspace.
- [ ] State the old sessions in Chat and events.
- [ ] State the retention of the bucket data in Access and security.
- [ ] Add the import flow to the architecture doc.
- [ ] Split each touched doc that passes the length target into linked
      pages, as the `documentation` skill says. Remove each split doc from
      `plans/follow-ups/protocol-docs-split.md`.
- [ ] Update the feature list of `README.md`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Continue an existing branch

Depends on: 2

- [ ] Add a Worker route that lists the branches and the open pull
      requests of a chosen repository, without the default branch.
- [ ] Accept an existing branch in the create request. Keep New branch as
      the default.
- [ ] Fetch and check out the existing branch at the first start, with
      tracking, and fail with a clear cause when it is gone.
- [ ] Add Worker tests against the fake GitHub server, as the `testing`
      skill says.
- [ ] Update the READMEs of `worker/lifecycle` and `worker/github`.

## Milestone 4: Imported workspaces and their data

Depends on: 2

- [ ] Let a workspace record exist with no first message and no cloud
      computer, with the "from Conductor" flag and the local Conductor ID,
      with its migration.
- [ ] Add the import routes: create the imported workspaces in the section
      "Import from Conductor", record each old session with its title and
      its Markdown file, and give short-lived upload links for the bucket
      data.
- [ ] Add the route that reads the Markdown file of an old session for a
      member of the org.
- [ ] Add the R2 bucket of decision 132 when Milestone 8p of the main plan
      has not merged it yet, and keep each workspace's data under its own
      prefix.
- [ ] Add Worker tests, as the `testing` skill says.
- [ ] Update `worker/app-api/README.md` and `worker/chat/README.md`.

## Milestone 5: Activation

Depends on: 4

- [ ] Add the activation start: a first start with no first message.
- [ ] Send the bucket data to the runner over the runner connection, in
      checked parts below 1 MiB, before the first turn.
- [ ] Let the runner apply the bundle, the changed files, and `.context`,
      put the Markdown files of the old sessions in `.context/conductor/`,
      and add `.context/` to the local exclude file.
- [ ] Put each session file in the agent data of the cloud computer, write
      each pair into the runner state, and give each imported session its
      starter, as decision 5 says.
- [ ] Delete the bucket data after a successful activation, and keep it
      after a failed one.
- [ ] Add Worker and runner tests, as the `testing` skill says.
- [ ] Update the READMEs of `worker/lifecycle` and `runner`.

## Milestone 6: The Mac app scan and upload

Depends on: 4

- [ ] Detect `conductor.db`, and offer the import once.
- [ ] Ask the user before the first read of Conductor data.
- [ ] Read `conductor.db` in read-only mode, and tolerate a missing column.
- [ ] Find each session file, also a compressed one, and turn each session
      into one Markdown file, as decision 7 says.
- [ ] Build the bucket data of decision 8 with Git, and upload it with the
      short-lived links.
- [ ] Add the device operations of the scan and the upload.
- [ ] Add the tests of the Mac app, as the `testing` skill says.
- [ ] Update `desktop/README.md`.

## Milestone 7: Branch control in New workspace

Tags: ui

Depends on: 1, 3

- [ ] Build the quiet branch link and the picker from the mockups.
- [ ] Add the web app tests, as the `testing` skill says.
- [ ] Update `src/app/README.md`.

## Milestone 8: Import screens and imported workspaces

Tags: ui

Depends on: 1, 4, 5, 6

- [ ] Build the entry, the offer, the list, the progress, and the result
      from the mockups.
- [ ] Build the imported workspace: its flag, the links to its old
      sessions, their Markdown view, and the Activate question.
- [ ] Add the web app tests, as the `testing` skill says.
- [ ] Update `src/app/README.md` and `src/shell/workspace/README.md`.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Smoke-test the import in the Mac app with one transferred Claude
      workspace and one transferred Codex workspace, after the user agrees.
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

- [ ] Publish a Mac app release, so that users other than the developers
      can import.
- [ ] Smoke-test the import on the deployment with a real transferred
      workspace.
- [ ] Consider the import of Conductor's setup scripts and env vars from
      `conductor.db`, as a separate change.
