# Import from Conductor

Status: Active. [PR #223](https://github.com/Firna-AI/remote-code/pull/223) is open as draft. The pull request that completes the work deletes this plan, as the `plans` skill says.

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
- **Chosen:** E, by the user on 10 November 2026, in place of B. The plan
  recommended F, then E after decision 7 chose F without J.

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
- **Chosen:** B and E, by the user on 10 November 2026.

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
- A workspace whose upload stopped shows as unfinished, with Try again,
  until its reservation expires (decision 14).

### The import, at once

- For each selected workspace, the Worker first records a reservation.
  The Mac app uploads the workspace's package and Markdown files under
  the reservation's own bucket prefix.
- When the last part is stored and checked, the Worker creates the
  workspace with the "from Conductor" flag, its name, its branch, and no
  cloud computer, in the section "Import from Conductor" (decisions 10
  and 13). It creates that section when it does not exist. So no member
  ever sees a workspace with incomplete work.
- An upload that stops keeps its reservation. The Mac list shows its row
  as unfinished, with Try again, which uploads only the missing parts
  (decision 14). An unfinished reservation and its parts expire after
  7 days, as decision 14 records.
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
- Agent call, 10 November 2026: the Mac app uploads each part as its own
  file, with a plain upload to the address that the server gives it, and
  uses no storage-specific multipart feature. The server keeps all access
  to the bucket behind one small storage adapter, as it does for the
  cloud computer provider. Reason: another storage then needs only a new
  adapter on the server, and an old Mac app keeps working.
- A changed or untracked file over 100 MiB stays on the Mac, and the
  import result lists it. The Git bundle, the memory files, and the
  Markdown files always upload whole (decision 11).
- Agent call, 10 November 2026: a session whose memory file is gone does
  not import, and the import result names it. Reason: the user chose no
  read of Conductor's database, in decisions 5 and 7, so such a session
  has no source.
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
- Before it sends the package, activation checks that the package fits
  the free disk of the cloud computer, with room to unpack it. When it
  does not fit, activation stops before it changes the checkout, keeps the
  package, and names both sizes (decision 11).
- The runner then fetches the commits from the bundle, checks out the
  branch at the newest commit of the Mac, and copies the changed files and
  `.context` over the checkout. It puts the Markdown files in
  `.context/conductor/`.
- The runner puts each memory file into the agent data of the cloud
  computer, under the folder path of the repository for Claude, and writes
  each pair of a Conductive session and its agent session into its state.
  Each imported session gets the importer as its starter. The old session
  then continues with its memory (decision 5).
- A session that does not resume falls back to its Markdown file in
  `.context/conductor/`, and the first message of its new session names
  that file. Then
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
- A pull request whose branch lives in another repository, such as a fork,
  shows as unavailable, with its reason and Open on GitHub. The picker
  compares repository IDs, not branch names (decision 15).

### Performance

- The app moves only the work that GitHub does not hold. Git fetches the
  pushed history inside the cloud computer.
- The heavy steps run on the Mac or in the cloud computer: the Mac app
  reads the database and runs Git, and the runner applies the work.
- No Worker request handles more than one session page or one upload part.
- Each imported workspace keeps its data in its own storage object and its
  own bucket prefix, so imports run side by side.
- No cloud computer starts until the user activates a workspace.

### Integration facts and design calls, 10 November 2026

These calls apply the approved import design to the current implementation.
They do not reopen a user decision. The earlier dated facts stay as history.

- Main now has attachments, the provider file write, agent instructions,
  provider accounts, and the computer ledger. The import reuses its bucket.
- Keep the approved runner connection for activation delivery. Reason: it
  gives the import bounded, checked delivery with no bucket credential in
  the cloud computer. Attachments keep their separate path.
- Cite this change as import decision N in the protocol docs. Reason: its
  decision numbers must be distinct from the main plan's decision numbers.
- Relay only local ID, name, repository, branch, session count, and upload
  size for a scan. Keep no server copy of its list or result. Scan again
  when the import opens, so the list stays current.
- Bind each import operation and reply to the asking page's paired device
  connection. Do not move it to a new connection. Reason: one user's
  current connection can belong to another Mac.
- Split lists and results across bounded device messages. Reason: a large
  list must not fail only because it passes one frame's byte limit.
- Keep consent and offer dismissal on the Mac. Reason: they describe that
  Mac's access and discovery.
- Apply the approved 100 MiB file rule inside .context too. Its exemptions
  remain the bundle, memory files, and old documents.
- A changed source after a stopped upload gets a new whole package.
  Reason: restored work must come from one consistent source state.
- Reservation expiry counts seven days from creation. Find the ordinary
  import section by name and create it at the top only when absent.
- Match a local source to a chosen repository by its GitHub remote.
- Activation uses the activating member's GitHub token. The importer starts
  imported continuation sessions. The activating member starts the new
  Untitled session. Reason: each credential keeps its existing owner.
- Activation requires the latest good image and uses the existing create
  refusal when none exists. A failed activation shows error. Not active
  applies before the first activation starts.
- Prepare native memory during activation. A session that cannot continue
  uses its old document. Keep stored user messages as the member wrote
  them. The implementation must verify the exact fallback point.
- Old documents omit thinking, provider metadata, and full tool output.
  They use the existing unmasked file-content policy. Reason: they are
  documents, while raw native memory stays private.
- Use CHAT_ATTACHMENTS_S3_BUCKET_URL, CHAT_ATTACHMENTS_ACCESS_KEY_ID, and
  CHAT_ATTACHMENTS_SECRET_ACCESS_KEY for the server's upload adapter.
  The key pair covers only the shared private bucket.
- Advance the Terms revision to 2026-11-10-conductor-import. Reason: each
  later sign-in must record the updated Terms, under the existing consent
  rule. Existing sessions get no new gate.

- Agent calls for branch continuation, 10 November 2026: keep the branch
  choice optional for native callers. Save its mode for retry. Keep one
  combined cursor for the two bounded GitHub lists. Follow an empty
  filtered page while its cursor remains. Suppress duplicate branch rows
  through the ref's associated open pull requests. Distinguish a confirmed
  absent remote ref from authentication and transport failures. Hide the
  default branch only in the picker. Preserve the lifecycle code map in a
  linked area page to meet the file-length rule.

- Agent calls for inactive records, 10 November 2026: use inactive as the
  API literal, matching the approved mockup status. Keep first session,
  turn, and message IDs null until real identities exist. Preserve native
  runtime rows and unique keys in a forward migration. Keep the importer
  distinct from a reassigned owner. Share the approved inactive notice
  contract in UI-only Milestone 3a before continuing the backend service.
- Agent call for native restore, 10 November 2026: copy Claude history to
  the target project key and map only the copied Codex session header's
  provider identity to conductive. Offline probes preserved the original
  source bytes and all response items. Actual provider acceptance still
  needs a real continuation turn, so preparation must not certify it.
- Agent calls for the import service, 10 November 2026: keep one portable
  contract family under `src/shared/` for the Worker, the Mac app, the
  runner, and the browser. Reason: no side needs a copy or a converter of
  the manifest and operation types. Give each reservation its own Durable
  Object through the existing workspace binding, with one serial queue for
  its controls, seals, and deletions. Reason: the writes and the cleanup of
  one prefix must not race, and no new binding is needed. Keep the
  reservation ledger and a normalized manifest inventory in D1, read and
  written in bounded pages. Reason: no request rebuilds a whole package, and
  no total size cap applies. Prove prerequisites with source-bound receipts
  of the current GitHub heads, read with the importer's token on the
  Worker. Reason: a stale remote-tracking ref cannot prove that GitHub holds
  a commit, and the Mac needs no Git credential. Acknowledge each Mac frame,
  send large private replies in acknowledged fragments, and run import
  waits outside the device broker's serial queue. Reason: frames stay
  bounded with no total list cap, and an import never delays commands,
  settings, or heartbeats. Keep durable cleanup ownership with no org
  foreign key, a write marker for each admitted seal, and a second deletion
  after the latest link expiry. Reason: a late upload or a lost seal reply
  must not leave or recreate data after cleanup. Add a fixed-size private
  Git disk summary to the snapshot. Reason: the content byte totals cannot
  describe the checkout and the Git expansion of an unpushed HEAD before
  the transfer.
- Agent call for Archive after the main merge, 10 November 2026: keep the
  approved Archive question, with no check, before a successful
  activation. After a successful activation, use main's one-action
  Archive, its toast, and its 14-day Restore. Offer Restore only while a
  cloud computer is kept, as main's Restore rule says, so the toast after
  the Archive of a never-started import offers no Restore. Reason: main
  replaced the native Archive question with one action and a toast, and
  its Restore needs a kept computer. This aligns the import with those
  existing rules. It adds no requirement and reopens no decision.
- Agent call for the saved tab of an old document, 10 November 2026: keep
  the tab of an old document in the saved view of its member, as
  `{ kind: 'conductor-document', documentId }`, as the view keeps a file
  tab. The host renderer of the tab row takes only file and diff tabs, and
  the row skips this tab until Milestone 8 shows it, with no loss of the
  saved tab. Reason: an old document opens as a file opens, and the server
  keeps the view state. This applies existing rules. It adds no store,
  route, migration, existence check, or refusal, and no requirement.
- Agent call for the Git LFS objects that GitHub holds, 10 November 2026:
  add the private control `repository.lfs` to the existing upload
  operation. The Mac app sends pages of `ImportLfsObject` pairs, each a
  SHA-256 `oid` and its `sizeBytes`, with its reservation and its facts
  ID. The Worker reads the GitHub LFS Batch API of the canonical chosen
  repository, with the stored token of the importer. It returns the same
  pairs as `available` or `missing`. A matching download action means that
  GitHub advertises the object now. A matching 404 or 410 means missing.
  An authentication, rate-limit, network, or invalid reply gets the
  existing recoverable `github_unavailable`. The Mac app leaves out an
  unchanged LFS file only when its pair is available. Activation still
  checks the exact bytes when it fetches the object. No link, header, or
  token reaches the Mac or the browser. Reason: a commit receipt proves
  only the pointer. An upload of every LFS file breaks the rule that the
  import moves only the work that GitHub does not hold. It also lists
  large unchanged files as left on the Mac. This applies the existing LFS,
  performance, and exact-byte rules. It changes no schema, manifest, or
  storage, and it adds no public result, receipt, limit, gate, or
  requirement.
- Parent design call for the activation-only installer, 10 November 2026:
  the first activation of an imported workspace installs the current runner
  archive and the workspace tools in its own new cloud computer, before the
  restore. The user's actual request was the attached transcript and the
  implementation of all milestones and tasks of this plan. The user made no
  separate choice of this installer exception. The acceptance parent
  classifies it as a necessary implementation call inside the approved new
  first activation. Reason: that activation has no first message and no
  first turn, and it needs the current import receiver and its checked
  delivery, which the runner of an older org image can lack. Developer
  autonomy covers this bounded mechanic. Ordinary and native create, resume,
  and retention, the build-only install of the terminal programs of decision
  148, the minimum isolation pin from the image, and the rejected install at
  each ordinary start stay as they are. It adds no global update, no rerun
  of an org install, no gate for an old image, and no automatic upgrade of
  ordinary starts. `port-previews.md`, `architecture/components.md`, and
  `imported-workspaces.md` state this narrow exception. The earlier
  bootstrap preparation missed their literal words. It did not prove that
  no such rule existed.
- Parent wording clarification for the import Archive question, 10 November
  2026: the question says "It cannot be activated while archived. Its old
  sessions stay readable." The approved earlier words said that the
  workspace can no longer be activated after Archive. That wrongly implied
  a permanent ban. An interrupted activation with a kept computer comes back
  stopped through Restore, and an explicit Activate then continues it. The
  acceptance parent resolved this as a routine clarification of the words,
  not as a new decision. The question, the block of Activate while the
  workspace is archived, and Restore with a kept computer stay as they are.
  It adds no action and no policy. An import that never started a computer
  still offers no Restore. The completed mockup milestones keep their words
  as history.
- Root merge call for the Terms revision, 10 November 2026: the merge of
  captured main `ce5ca2d1` sets the Terms revision to
  `2026-11-10-conductor-import-feedback-routines-gateway`. This value
  differs from both parents: `2026-11-10-conductor-import` of this branch
  and `2026-11-10-feedback-routines-gateway` of main. Reason: the combined
  Terms and Privacy text holds the import text of this branch and the
  routine, feedback, and gateway text of main, so it differs from the text
  of each parent. Each later sign-in must record it, under the existing
  consent rule. The integration root made this call as a mechanical merge
  call, not as a user decision. The backend owner of the merge owns the
  constant in `src/shared/terms.ts` and its test. For the merged tree, it
  replaces the revision of the earlier call above. It adds no gate for an
  existing session.

- Desktop agent calls, 10 November 2026: keep consent and dismissal in
  one Mac-wide preference store. Give each authenticated device connection
  its own import controller. Run source work in worker threads, and wait
  for worker and Git cleanup at app exit. Reason: cancellation must stop
  the old connection's work without a restart on the next connection.
- Use a checked source-index copy for scan estimates, and a fresh private
  HEAD index for selected raw-byte capture. Reason: a source index can
  hide a clean materialized LFS payload through its cached file metadata.
  Keep source hooks, filters, file monitors, lazy fetch and auth out of
  both paths.
- Keep local common-ancestor hints outside the selected source digest.
  Resolve and verify actual omissions from private staged objects and
  current source-bound Worker receipts. Page proofs and retain each OID's
  receipt. Reason: a default branch can advance beyond the unpublished
  source branch, and unrelated local refs must not invalidate a retry.
- Normalize only a generated bundle's prerequisite header, after proving
  that declared excluded roots cover every original boundary. Preserve
  its pack, capabilities and ref bytes. Check a cold receiver with only
  declared root closures. Reason: Git can declare more boundaries than
  the chosen roots, and a source repository can hide missing objects.
- Share import control turns across the connection and wait for earlier
  socket writes. Keep the native pending allowance and at most one
  import frame in flight. An intentional operation cancellation keeps
  the live connection. Reason: per-operation acknowledgements alone do
  not bound shared transport traffic.
- Classify an unchanged LFS working file only from its staged HEAD
  pointer, matching payload hash, size and mode, and positive private
  availability in the chosen GitHub repository. A Git commit receipt
  proves no LFS payload availability. Pointer commit reachability is not
  also required when GitHub advertises the payload. Finish the complete
  inventory and fingerprint before obtaining the separate Git commit
  prerequisite receipt. Reason: an unpushed pointer can name an available
  payload, while a pushed pointer can name a missing one.
- Keep detailed desktop import rules and entry points in
  `desktop/src/import/README.md`, with a short link in the desktop README.
  Reason: the area README keeps the desktop README below 300 lines.
- Unpack the compiled import worker and its portable shared modules from
  the ASAR archive. Check the real device-session, worker, package and
  explicit-retry flow in the existing Electron test layout. Reason: the
  worker needs physical compiled files in a packaged app. These fixture
  checks do not certify the user's Mac source, native consent, or scan
  timing.

### Mockup design calls, 10 November 2026

These are agent calls from Milestone 1, within the decisions in force.

- The settings entry is an "Import from Conductor" section below This Mac
  in the Mac app account. The offer is a dismissible bar of the Mac app.
  Both name the current org. The offer gives no count before consent.
  Reason: the account is available to every member, and detection reads
  only the presence of the database file.
- Consent uses the Mac app's own alert. Don't Allow leads to Ask again.
  The text does not promise that the list stays on the Mac. The Worker
  relays the list to the page, because the page has no bridge to the Mac.
  Milestone 2 must cover this data flow and the legal pages.
- The list keeps unavailable rows, with the reason and the admin's Add
  repository link. Imported rows link to their workspace. Select all
  shows a mixed mark for a partial selection. Counts and upload sizes
  come from the selected rows. Reason: the user must see what can import.
- Upload progress distinguishes completed workspaces from unfinished
  reservations. Only completed workspaces have workspace links or appear
  in the org list. Try again on an unfinished row resumes its missing
  parts. After seven days, the reservation expires and its parts cannot
  be reused. The source work stays on the Mac. Reason: decisions 13 C
  and 14 D keep incomplete work out of the org.
- The result names each changed or untracked file over 100 MiB that stayed
  on the Mac. It also names each session that did not import because its
  memory file is gone. These are separate lists with their own reasons.
  Reason: the user must know which files and sessions did not transfer.
- The section "Import from Conductor" stands at the top of the list.
  An imported workspace shows "Not active" with its own mark until its
  first start. The header keeps "From Conductor" after activation.
  Reason: Stopped would imply that a cloud computer had already existed.
- Old sessions appear as document links in the empty chat and in the
  session history. A phone opens their Markdown in Chat, with a way back.
  Each drawn readable state keeps its own document and return destinations,
  including a failed activation and an archive before activation.
  Reason: old documents must stay reachable after a new chat fills the tab.
- Before activation, files and tools show Not active, with no Changes
  count. The activation question takes the place of the composer.
  Activation uses the existing start card, queued composer, general
  failure, and Try again. The existing whole-start limit stays in force.
- A resumed session uses a normal session tab and links back to its old
  document. Only its new turns appear in the live chat. A session that
  cannot resume opens a fresh session whose first message names its old
  document in `.context/conductor/`. Reason: decision 5 E restores memory
  where possible and keeps the approved document fallback.
- The session examples show the resumed Claude session and the Codex
  fallback, with the old sessions before the new-session tab. A document
  opened from the resumed session returns to that session on a phone.
  Reason: the two examples show memory continuation and document fallback
  without replaying the old chat into the live log.
- The disk-space failure names the space needed for the package and
  unpacking, and the space available. It says that the stored work is
  kept. It offers the existing Try again action. Reason: decision 11 E
  stops activation before changing the checkout when the work cannot fit.
- New workspace has the quiet branch line on the page and a quiet picker
  beside the repository in the desktop dialog. The picker has search,
  loading, failure, and no-match states. A phone uses a sheet. Opening
  Change keeps the current choice and draft. Reason: the dialog preference
  must give the same branch choice as the page.
- Each branch link also keeps the full form state, including its org,
  notices, and viewer. An example without a matching drawn destination
  keeps that control static. Reason: a catalogue link must not replace
  the user's draft or org with another example.
- A pull request from another repository stays visible as unavailable,
  with its reason and Open on GitHub. It cannot select that branch.
  The page, dialog, and phone sheet share this row. Reason: decision 15 A
  explains the restriction before the user creates a workspace.
- The imported header and org rail use matching list and owner destinations,
  or keep an undrawn control static. Only the inactive admin example has
  the drawn import list. The import flow's own controls also keep their
  viewer and selection. Reason: a catalogue link must not hide the imported
  section or change the signed-in person.
- Terminal fixtures use the current workspace's repository and branch.
  An explicit workspace record supplies running-process output. Other
  terminals show an idle prompt. Native examples keep their existing
  output. Reason: the imported workspace must not show another branch's
  terminal or claim that a server is running in its idle example.
- A failed first start on a branch that is gone keeps the workspace and
  its messages. It names the branch and offers Try again after the user
  restores the branch on GitHub. The existing failed-first-start rule
  settles this case. Changing to a new branch is a separate feature.
- Archive of a never-activated import says that the old sessions stay
  readable and that activation becomes impossible. It says neither that
  everything is pushed nor that it deletes a cloud computer. The existing
  Archive and retention rules settle this case. The approved retention
  rule stays in force. This milestone adds no storage cleanup policy.
- The scan must obtain each row's upload size without building every
  bundle before the user chooses. Milestone 6 must check that cost.
  The shared notice contract and its app switch must change together.
  Reason: the mockups exposed both consumers of the new state. Milestone 3a
  changed both, and Milestone 8 uses that contract.
- Native fixture collections keep their original entries. Import examples
  add their fixtures explicitly. Reason: the app's tests and development
  data also read the native collections. An import-only section must not
  appear there before an import.

### Decisions from the mockups

These continue the decision numbers above. Milestone 1 raised them on
10 November 2026, and the user answered each one on the same day.

#### 13. A workspace whose upload is not complete

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** Design, "The import, at once" and "Activation".
- **Terms:**
  - **Bucket:** The cloud storage that holds the uploaded work and old
    session documents before a cloud computer exists.
- **Background:** The current design creates each workspace before its
  upload ends. Every org member can open it. Decision 8 requires the
  complete work at activation. Only the importing Mac can finish the upload.
- **Problem:** No requirement says what members can open or activate
  while the upload is incomplete. Old session files can also be absent.
- **Impact if no action:** An early activation can restore incomplete
  work. An old-session link can name a file that is not stored yet.
- **Root question:** What can members see and do before an imported
  workspace's work is complete in storage?
- **Options:**
  - **A.** Show an upload state. Keep Activate and old-session links off
    until that workspace's upload ends. Check the same state at the
    server for an old tab. Effort: Medium.
  - **B.** Keep Activate on. Wait for that workspace's upload, then start
    activation. This adds a persistent wait to the start path. Effort: Large.
  - **C.** Create each workspace when its own upload ends. It then appears
    with its complete work and documents. This changes when it appears
    during the import. Effort: Medium.
  - **D.** A, but upload the old-session documents first. Each link works
    when its own file is stored. Activate waits for the rest. This needs
    a stored mark for each document. Effort: Medium.
  - **E.** Keep Activate on. If the work is incomplete, fail activation
    before a cloud computer starts. Name the upload as the cause. An
    unavailable document says that its upload is incomplete. Effort: Small.
- **Left out:** Copying only the uploaded part loses work. Reading missing
  work from the Mac fails when the Mac is off. Hiding a workspace from
  other members breaks the org visibility rule. Waiting for every selected
  workspace before creating any is worse than C for each workspace.
- **Wider fix:** C. A workspace with incomplete work never reaches an org
  member, screen, or activation route.
- **Previous examples:** The first-build rule keeps Send and Create off
  and refuses a create from an old tab. The follow-up
  `plans/follow-ups/workspace-waits-for-first-build.md` records the wider
  change needed for a persistent wait.
- **Related:** Decision 14 has the same cause. Its D needs C here.
- **Recommendation:** C. It removes incomplete workspaces from every
  consumer. The UI proposal recommended A. The options check changed it
  to C. Choose D if appearance before the upload remains required.
- **Action:** ask the user, because C changes the current appearance
  timing, and the other options add incomplete-upload behaviour that no
  requirement covers.
- **Chosen:** C, by the user on 10 November 2026.

#### 14. An upload that stops before completion

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** Design, "The import, at once", and Milestone 6.
- **Terms:**
  - **Reservation:** An unfinished import record that holds uploaded parts
    before a workspace exists.
- **Background:** The importing Mac can sleep, quit, or lose its network.
  The current design creates workspaces before their uploads end. The list
  then marks their local IDs as already imported.
- **Problem:** No requirement says how an interrupted upload finishes or
  is undone. The already-imported row also prevents another normal import.
- **Impact if no action:** Members can have a workspace with no complete
  work and no way to finish the import.
- **Root question:** How does a stopped upload finish or get undone
  without lost work or an unusable workspace?
- **Options:**
  - **A.** Keep the workspace. Mark its upload as incomplete. The Mac
    import list offers Try again for that row. Effort: Medium.
  - **B.** Delete the unfinished workspace and make its row importable
    again. This must not delete an accepted message. Effort: Medium.
  - **C.** The Mac app tries again by itself when it opens again.
    This can resume an action that the user stopped. Effort: Medium.
  - **D.** With 13 C, keep an unfinished reservation instead of a
    workspace. The Mac list offers Try again from the stored parts.
    A separate retention rule must define when unused parts expire.
    Effort: Medium.
- **Left out:** Preventing sleep or asking before quit does not handle
  network failure. Hiding an unfinished workspace from other org members
  breaks the org visibility rule.
- **Wider fix:** D with 13 C. An interrupted upload cannot leave an
  unusable workspace in the org.
- **Previous examples:** A failed first start keeps its workspace and
  accepted messages. Mac settings changes offer Try again after a lost
  connection instead of moving the action to a new connection themselves.
- **Related:** Decision 13 sets whether the workspace already exists.
  B must preserve any messages accepted under 13 B or E. D needs 13 C.
- **Recommendation:** D if 13 C is chosen. It keeps recovery on the Mac
  that holds the work. The UI proposal recommended A. The options check
  changed it to D with C of decision 13. If creation stays before upload,
  A remains the recommendation.
- **Action:** ask the user, because upload recovery has no requirement,
  and the best option depends on decision 13.
- **Chosen:** D, by the user on 10 November 2026.
- **Agent call, 10 November 2026:** an unfinished reservation and its
  stored parts expire after 7 days. Reason: the Mac still holds the source,
  so an expiry loses nothing, and 7 days matches the unsent draft
  attachments of decision 132 of the main plan.

#### 15. Continue a pull request from a fork

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** Design, "Continue a branch in New workspace";
  `worker/github/client.ts`, `worker/github/banner.ts`, and
  `worker/github/webhook-routing.ts`.
- **Terms:**
  - **Fork:** A copy of a GitHub repository whose branches belong to the
    copy.
  - **Head repository:** The repository that holds a pull request's
    branch. The base repository receives the pull request.
- **Background:** The picker offers the chosen repository's open pull
  requests. One can have its branch in a fork. The current workspace,
  banner, and webhook model follows one repository and one branch.
  Git uses the sender's user token, whose access can cover several installs.
- **Problem:** The plan names no fork rule. Fetching a branch by name in
  the chosen repository can find no branch, or the wrong branch.
  The current banner does not follow a pull request from another repository.
- **Impact if no action:** A fork choice can fail, continue different
  work, or promise to update a pull request that the workspace cannot track.
- **Root question:** Which open pull requests can the user continue from
  the chosen repository, and where does the continued work go?
- **Options:**
  - **A.** Continue only pull requests whose head repository matches the
    chosen repository. Show other rows as unavailable, with a reason and
    Open on GitHub. This also handles a deleted fork. Effort: Medium.
  - **B.** Copy a fork pull request onto a new branch of the chosen
    repository. Name that copy before create. Fetch the pull request ref
    from the base repository, and use the normal new-branch name rule.
    It does not update the original pull request. Effort: Medium.
  - **C.** Continue the original fork branch and pull request when the
    sender can push there. Track both repositories through start, pushes,
    the banner, checks, and webhooks. Other fork rows use A. This changes
    the repository model and needs proof of the user token's push access.
    Effort: Large.
  - **D.** Hide fork pull requests without a note. Search shows the usual
    no-match state. This is smaller, but gives no reason for a missing
    pull request that the user can see on GitHub. Effort: Small.
  - **E.** Use C when the sender can push to the fork, and B otherwise.
    A row can change kind when access changes. Effort: Large.
- **Left out:** Removing every pull request breaks decision 1. A fetch
  alone does not settle the push target. A branch name alone can select
  different work, including the chosen repository's default branch.
  Refusing only at start tells the user too late. Adding the fork as a
  chosen repository still does not make the banner follow the original
  pull request in its other repository.
- **Wider fix:** A. Compare repository IDs, not branch names, before
  offering continuation. B and D use the same identity rule. C still
  needs a fallback for a fork that the sender cannot change.
- **Previous examples:** The banner reader and webhook router already
  compare the head repository with the workspace repository. Their tests
  reject another repository's pull request as a match.
- **Related:** Decision 1 includes open pull requests. Decision 2 permits
  shared branches, which does not settle fork repository identity.
- **Recommendation:** A. It gives the reason while keeping the existing
  repository model for an uncommon action. The options check kept A and
  added D and E. B lets a maintainer take over work without fork access.
- **Action:** ask the user, because the new picker has no fork rule,
  and filtering, copying, and continuing the original have real trade-offs.
- **Chosen:** A, by the user on 10 November 2026.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw every screen and flow of the change, at the Mac app's desktop size,
and at phone size where a screen shows on a phone. Decisions 5, 11, 13,
14, and 15 were chosen on 10 November 2026. The screens below draw those
choices. A workspace appears only when its own upload ends.

- [x] Add the quiet branch link to the New workspace screen, and the
      branch picker with branches and open pull requests.
- [x] Add the settings entry and the one-time offer when the Mac app finds
      Conductor data.
- [x] Add the palette entry.
- [x] Add the consent dialog, the list with Select all, the rows that
      cannot import, and the already imported rows.
- [x] Add the normal import progress and result.
- [x] Add the result list of the files over 100 MiB that stay on the Mac,
      and of the sessions whose memory file is gone (decision 11).
- [x] Add an imported workspace: its flag, the links to its old sessions,
      the Markdown view of one old session, the Activate
      question, activation progress, and a failed activation.
- [x] Add the first start on an existing branch and the failed start when
      that branch is gone. Keep the accepted messages and Try again.
- [x] Add Archive of a never-activated import and its archived workspace.
      Keep the old session documents readable. Show no false statement
      about pushed work or a deleted cloud computer.
- [x] Add the resumed-session tab: a session tab that links to its old
      document and continues with the agent's memory, and the fallback
      when a session does not resume (decision 5).
- [x] Add the activation that stops because the package does not fit the
      disk, with both sizes (decision 11).
- [x] Show each workspace appearing only when its own upload ends, and
      revise the progress and the user flow to match (decision 13).
- [x] Add the unfinished row with Try again in the Mac list, and its expiry
      after 7 days (decision 14).
- [x] Add pull requests from forks as unavailable rows, with the reason and
      Open on GitHub, on the page, in the dialog, and on a phone
      (decision 15).
- [x] Add the user flow `import-from-conductor`, from the offer to an
      activated workspace.
- [x] Keep import fixtures separate from the native section collection
      that the app's tests and development data read.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Fix review 1: keep old-document and return links paired in every
      drawn readable lifecycle state, with a failed-activation document.
- [x] Fix review 2: preserve the originating form and full state in branch
      navigation, including the phone view of the dialog.
- [x] Fix review 3: derive terminal identity and process output from its
      workspace, while preserving native fixture output.
- [x] Fix review 4: keep imported header and org-list navigation in a
      matching state and viewer, without changing native defaults.
- [x] Fix review 5: keep the import flow's own controls in their saved
      viewer and selection, or static when no matching example exists.
- [x] Keep the phone org switcher static in the import list until a
      matching org-sheet example exists. Preserve native list defaults.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Verification evidence: `.context/import-from-conductor/checks/milestone-1-report.md`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Create `docs/protocol/conductor-import.md` with the requirements of
      the scan, the consent, the list, the import, the bucket data, and
      activation.
- [x] State incomplete-upload availability and recovery after decisions
      13 and 14. If unfinished reservations are chosen, settle their
      retention before implementation.
- [x] State the new device operations in the Mac app protocol doc.
- [x] State which scan metadata the Worker relays to the page. Read both
      legal pages in full and update each sentence that restates the
      changed facts. Consent must not promise a local-only list.
- [x] State imported workspaces, activation, and the branch choice of a
      new workspace in the protocol doc that holds Create a workspace.
- [x] State the fork pull request rule after decision 15. If C or E is
      chosen, update the repository model and banner routing requirements.
- [x] State Not active, the current org as the import destination, and
      the place of the import section. State Archive before activation
      under the existing Archive and retention rules.
- [x] State the old sessions in Chat and events.
- [x] State the retention of the bucket data in Access and security.
- [x] Add the import flow to the architecture doc.
- [x] Split each touched doc that passes the length target into linked
      pages, as the `documentation` skill says. Remove each split doc from
      `plans/follow-ups/protocol-docs-split.md`.
- [x] Update the feature list of `README.md`.
- [x] Check each relative link of each changed Markdown file.

Verification evidence: `.context/import-from-conductor/current/docs-report.md`.

## Milestone 3: Continue an existing branch

Depends on: 2

- [x] Add a Worker route that lists the branches and the open pull
      requests of a chosen repository, without the default branch. Mark a
      pull request whose branch is in another repository as unavailable,
      by repository ID (decision 15). Page
      the list and support the search shown in the picker.
- [x] Apply decision 15 to fork pull requests. Use repository IDs for
      identity. B needs a copy from the pull request ref. C or E also
      needs the head repository, push access, banner, and webhook changes.
- [x] Accept an existing branch in the create request. Keep New branch as
      the default.
- [x] Fetch and check out the existing branch at the first start, with
      tracking, and fail with a clear cause when it is gone.
- [x] Add Worker tests against the fake GitHub server, as the `testing`
      skill says.
- [x] Update the READMEs of `worker/lifecycle` and `worker/github`.

Verification evidence: `.context/import-from-conductor/current/milestone-3-report.md`.

## Milestone 3a: Shared inactive view state

Tags: ui

Depends on: 1, 2, 3

Implementation found that the approved Not active views use an import-only
notice while the app shares a narrower native notice contract. Align that
contract before the imported record can flow through the app. This keeps
the approved visuals and changes no backend requirement.

- [x] Add the existing inactive status to the app's sandbox view state.
- [x] Align the shared notice contract and both renderers with the approved
      Activate bar and Not active panels. Preserve native states.
- [x] Verify the typecheck and targeted view-state checks. Update the area
      README and the affected mockup note if its contract description changes.

Verification evidence: `.context/import-from-conductor/current/inactive-contract-report.md`.

## Milestone 4: Imported workspaces and their data

Depends on: 2

- [x] Add and test the private portable storage port and R2 adapter for
      short-lived plain PUT targets, verified sealed parts, bounded reads,
      streamed old documents, and prefix deletion. Keep temporary upload
      keys separate from sealed keys. This subtask adds no route, schema,
      reservation, or activation wiring. Branch: `conductor/import-from-conductor-private-storage`.
      Storage design calls, 10 November 2026: scope the port to one org and
      reservation, separate work and document groups, and use atomic
      create-only sealed keys. Reason: upload replay and concurrent seals
      must preserve the verified bytes. Use five-minute PUT targets and
      caller-supplied part and read bounds. Reason: bound each operation
      without a package or document total limit. Evidence:
      `.context/import-from-conductor/storage-report.md`.
- [x] Let a workspace record exist with no first message and no cloud
      computer, with the "from Conductor" flag and the local Conductor ID,
      with its migration. Record Not active and whether activation
      completed, so Archive can choose the correct words.
- [x] Add the reservation of each selected workspace, with short-lived
      upload links under its own bucket prefix.
- [x] Create the workspace in the section "Import from Conductor" only when
      its last part is stored and checked, and record each old session with
      its title and its Markdown file (decision 13).
- [x] Keep an unfinished reservation for Try again, and expire it with its
      parts after 7 days (decision 14).
- [x] Add the route that reads the Markdown file of an old session for a
      member of the org.
- [x] Add the R2 bucket of decision 132 when Milestone 8p of the main plan
      has not merged it yet, and keep each workspace's data under its own
      prefix.
- [x] Add Worker tests, as the `testing` skill says.
- [x] Update `worker/app-api/README.md` and `worker/chat/README.md`.
- [ ] Prove with the live bucket and its key pair that a signed PUT link
      stores the exact bytes, and that live R2 refuses an expired link, a
      wrong size, a wrong SHA-256, and a second PUT to the same temporary
      key. Local R2 cannot run this proof, and no live key pair exists yet.

Records checkpoint evidence: `.context/import-from-conductor/current/milestone-4-records-report.md`.
Service checkpoint evidence: `.context/import-from-conductor/current/m4-service-report.md`. Docs evidence: `.context/import-from-conductor/current/m4-docs-report.md`.

## Milestone 5: Activation

Depends on: 4

- [ ] Prove one resume of a transferred Claude memory file and of a Codex
      rollout file in a cloud computer, with each login kind that
      Conductive offers: a Claude subscription token, an Anthropic API key,
      and an OpenAI API key for a Codex history from a ChatGPT login.
- [ ] Measure the free disk of a new cloud computer.
- [x] Check before activation that the package fits the free disk of the
      cloud computer (decision 11).
- [x] Add the activation start: a first start with no first message.
- [x] Send the bucket data to the runner over the runner connection, in
      checked parts below 1 MiB, before the first turn.
- [x] Let the runner apply the bundle, the changed files, and `.context`,
      put the Markdown files of the old sessions in `.context/conductor/`,
      and add the root rule `/.context/` to the local exclude file.
- [x] Put each memory file in the agent data of the cloud computer, write
      each pair into the runner state, and give each imported session its
      starter. Fall back to the Markdown file for a session that does not
      resume (decision 5).
- [x] Delete the bucket data after a successful activation, and keep it
      after a failed one.
- [x] Add Worker and runner tests, as the `testing` skill says.
- [x] Update the READMEs of `worker/lifecycle` and `runner`.

Verification evidence: `.context/import-from-conductor/current/m5-activation-report.md` and
`.context/import-from-conductor/current/m5-runner-corrections-report.md`. Docs evidence:
`.context/import-from-conductor/current/m5-docs-report.md`.

## Milestone 6: The Mac app scan and upload

Depends on: 4, 7c

- [x] Detect `conductor.db`, and offer the import once. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Ask the user before the first read of Conductor data. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Read `conductor.db` in read-only mode, and tolerate a missing column. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Obtain row sizes without building a bundle for every unselected
      workspace. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [ ] Measure the scan cost with the user's recorded 36-workspace case.
      Compare the current workspace, session and missing-file aggregates.
      Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Find each session file, also a compressed one, and turn each session
      into one Markdown file, as decision 7 says. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Build the bucket data of decision 8 with Git, and upload it with the
      short-lived links. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Let the classification in the Mac app use the `repository.lfs`
      result of Milestone 7c before the final fingerprint and the
      prerequisite receipt. Leave out an unchanged Git LFS file only when
      its pointer matches the source and its pair is available. Upload
      each other local LFS payload as a changed file, under the 100 MiB
      rule. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Leave each changed or untracked file over 100 MiB on the Mac, and list
      it (decision 11). Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Count the sessions whose memory file is gone, and list them in the
      result. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Keep the reservation of a stopped upload, and upload only its missing
      parts on Try again (decision 14). Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Add the device operations of the scan and the upload. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Add the tests of the Mac app, as the `testing` skill says. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Update `desktop/README.md`. Branch: `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Keep the working files of a nested repository, untracked or
      staged, under the outer and nested local ignore rules. This applies
      review finding 3, option C. Branch:
      `conductor/import-from-conductor-mac-scan-and-upload`.
- [x] Resolve only the trusted home and user-data prefixes, once at the
      worker entry, through one typed constructor. This applies review
      finding 4, option B in typed form. Branch:
      `conductor/import-from-conductor-mac-scan-and-upload`.
- [ ] Check the real native consent alert on the user's Mac. Branch:
      `conductor/import-from-conductor-mac-scan-and-upload`.
- [ ] Run the controlled source pack, restore and unchanged/changed retry
      proof on a real Mac, with private temporary staging. Branch:
      `conductor/import-from-conductor-mac-scan-and-upload`.
- [ ] Check the production source-worker import flow in source and
      packaged Electron on both supported Mac architectures. Branch:
      `conductor/import-from-conductor-mac-scan-and-upload`.

Root design call, 11 November 2026:

- Resolve only the trusted home and app user-data prefixes, once at the
  worker entry, through one typed constructor. Keep the `exists` job on
  its single pre-consent check of the database file. Keep the no-follow
  policy of every descendant: source children, `.claude`, `.codex`, their
  collection roots, stage folders, and staged parts. Reason: an alias in
  a trusted prefix must not hide present memory files or block staged
  parts. The existing discovery and upload requirements settle this
  detail. This records the root outcome of review finding 4, option B in
  typed form. It changes no protocol, legal page, public guide, Electron
  profile path, or descendant link policy.

Review round 3 summary, 11 November 2026: the review of `d6bd4fbf` and
four independent finding checks gave four follow-up items. Both child fix
rounds are used, so no source fix is released.

- [Submodule working content](follow-ups/conductor-import-submodule-working-content.md):
  needs the user's decision. Root recommends E, which names the work as
  staying on the Mac. Root has not asked the question yet.
- [Omitted LFS HEAD pointer](follow-ups/conductor-import-omitted-lfs-head-pointer.md),
  [fixture permissions](follow-ups/conductor-import-fixture-permissions.md),
  and [Git storage lifetime](follow-ups/conductor-import-git-storage-lifetime.md):
  fix after merge.
- Focus for the full primary review. These stay open, are not fixed, and
  have no finding number:
  - `desktop/src/import/candidate-paths.ts:23`: the no-index nested check
    can drop a tracked file of a nested repository that matches that
    repository's own ignore pattern.
  - The desktop LFS facts accept a stricter pointer form than the
    receiver. The receiver also reads the legacy `hawser` version line and
    other `oid` and `size` orders, so the count comparison can fail.
  - `desktop/src/import/git.ts:229`: the scan's copied split index lacks
    its shared index file, so a row size can be unknown. Runtime
    behaviour is unverified.
  - If no full primary review runs, record each one as an explicit open
    follow-up item, so that it is not lost.

Review record: `.context/reviews/conductor/import-from-conductor-mac-scan-and-upload/findings.md`.

Implementation and verification evidence:
`.context/import-from-conductor/current/m6-final-report.md`.

## Milestone 7: Branch control in New workspace

Tags: ui

Depends on: 1, 3

- [x] Build the quiet branch control on the page and in the desktop
      dialog. Keep the current choice and draft when the picker opens. Branch: `conductor/import-from-conductor-branch-picker-ui`.
- [x] Build the search, loading, failure, and no-match states. Keep New
      branch available. Change the first-message helper so it does not
      promise a new branch after an existing branch was chosen. Branch: `conductor/import-from-conductor-branch-picker-ui`.
- [x] Build the fork row and chosen state that decision 15 requires. Branch: `conductor/import-from-conductor-branch-picker-ui`.
- [x] Add the web app tests, as the `testing` skill says. Branch: `conductor/import-from-conductor-branch-picker-ui`.
- [x] Update `src/app/README.md`. Branch: `conductor/import-from-conductor-branch-picker-ui`.

Agent calls, 10 November 2026:

- Use Show more for paging, as the existing lists do. A failed later page
  keeps the loaded rows and offers Try again.
- Search after the existing 300 ms pause, or at Enter. Enter in the search
  sends no message. The form keeps its search and rows across a picker
  close, while a close stops pending search and paging work.
- Focus the search on a computer and the checked row in a phone sheet.
  Show more focuses the first added row. This keeps keyboard use clear
  and keeps the phone keyboard from covering the initial list.
- Keep the native create request unchanged for New branch. Use the
  existing API fields for all row details, with no invented branch age or
  fork name.
- Capture the New workspace dialog opener once through the existing
  focus callback. This preserves the opener when development effect
  replay lets the message editor take the focus again.
- Verify that development-only focus case in Chrome. The DOM test runner
  does not reproduce the editor's focus timing. Keep the browser proof
  as evidence within the approved scope, without a new browser gate.
- Fit the desktop picker to the visible window before focus moves into
  it. Keep its wide-window placement, shift left only when needed, and
  let the rows scroll in the available height. This keeps the whole
  picker reachable at the narrow desktop boundary and after resizing.

Verification evidence: `.context/import-from-conductor/milestone-7/final-report.md`.

## Milestone 7a: Archive mockups after the main merge

Tags: mockup

Depends on: 1, 3a

The main merge replaced the native Archive question with one action, a
toast, and a 14-day Restore that needs a kept cloud computer. The approved
import question before a successful activation stays. No mockup draws the
toast after the Archive of a never-started import, which offers no Restore,
or an archived import that was activated. These TODOs draw those states
before Milestone 8 builds them. They change no requirement.

- [x] Draw the toast after the Archive of a never-started import, with no
      Restore, over the workspace and over the list, on desktop and phone.
      Keep the approved Archive question and the old-document links.
- [x] Draw an activated import that is then archived: one-action Archive,
      its toast and archived bar with the last day of Restore, its row in
      the Archived group, and Restore back to its section, stopped. Keep
      its old-document links and its navigation in the same workspace and
      state. Native examples keep main's toast and Restore.
- [x] Correct `docs/mockups/design-import.md`, which says that a failed
      activation never had a cloud computer. Keep the question with no
      check before a successful activation, and keep the stored work.
- [x] Run the focused mockup checks, the Markdown link check, and the
      strict mockup build. Smoke the changed pages and the native Archive
      pages in Chrome, on desktop and phone, in light and dark. Save the
      evidence under `.context/import-from-conductor/`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Verification evidence: `.context/import-from-conductor/current/m7a-mockup-gap-report.md`.

## Milestone 7b: The saved tab of an old document

Depends on: 4

The server keeps the view of each member, with its open tabs. An old
document opens as a file opens, so its tab must stay in that view. The
shared tab contract and the Worker's check of a saved view hold only
session, file, and diff tabs today. This backend milestone adds the tab of
an old document before Milestone 8 shows it. It adds no store, route,
migration, existence check, or refusal, and it changes no requirement.

- [x] Add `{ kind: 'conductor-document'; documentId: string }` to the
      shared `WorkspaceTab` contract in `src/shared/workspace-view.ts`.
      Keep the session, file, and diff tabs as they are.
- [x] Let `worker/app-api/workspace-view.ts` read, save, and return that
      tab in a saved view, also as the active tab, with the checks of each
      other tab. Keep each saved native view readable and unchanged.
- [x] Let the client callers take that tab: `readTab` in
      `src/chat/api/read-responses.ts`, `tabKey` in
      `src/chat/state/tab-order.ts`, and `equalTabs` in
      `src/shell/workspace/files/view-tabs.ts`. In
      `src/chat/components/tab-row.ts`, limit `HostTab` to file and diff
      tabs, and let `rowOf` skip any other tab while the saved view keeps
      it until Milestone 8 shows it.
- [x] Add the test of a saved view with mixed tabs through the production
      HTTP route, as the `testing` skill says.
- [x] Update the README of each changed area, with `src/shared/README.md`
      and `worker/app-api/README.md`.

Verification evidence: `.context/import-from-conductor/current/m7b-document-tabs-report.md`.
Docs evidence: `.context/import-from-conductor/current/m7b-docs-report.md`.

## Milestone 7c: The Git LFS objects that GitHub holds

Depends on: 4

A file that GitHub holds in Git LFS comes from GitHub at activation, and a
changed Git LFS file goes as a changed file. A receipt of a commit proves
that GitHub holds the pointer of a file, not the LFS object that the
pointer names. This backend milestone adds one private control,
`repository.lfs`, to the existing upload operation. With the stored token
of the importer, the Worker reads which LFS objects of the chosen
repository GitHub holds. Milestone 6 then leaves out of the upload only an
unchanged file whose object GitHub holds. This milestone changes no
manifest, storage, public contract, or schema. It adds no limit, gate, or
refusal, and it changes no requirement.

- [x] Add `ImportLfsObject`, `{ oid: string; sizeBytes: number }`, in the
      portable `src/shared/conductor-import-lfs.ts`. Add the private
      `repository.lfs` device event with `reservationId`, `factsId`, and
      `objects`, and its private control result with `factsId`,
      `available`, and `missing`, which use the same pairs. Extend their
      readers. Bound each page so that the event and its acknowledgement
      each fit one existing frame. Keep each existing control and result
      as it is.
- [x] Let the reservation service answer `repository.lfs` from the GitHub
      LFS Batch API of the canonical chosen repository, with
      `freshGitHubUserToken` of the stored importer. Check import access,
      the reservation, and its repository facts before the read, and
      import access again before the answer. Use HTTPS with no redirect,
      ignore each LFS address that the source names, and send no download
      request. A matching download action is available, and a matching
      404 or 410 is missing. An authentication, rate-limit, network, or
      invalid reply gets the existing recoverable `github_unavailable`.
      Store no receipt, and keep the commit receipts as they are.
- [x] Add the tests through the production private control, as the
      `testing` skill says: available and missing pairs, invalid and
      mismatched replies, authentication, rate-limit, and network
      failures, revoked access, bounded pages, and no token, link, or
      header in the result.
- [x] Update the README of each changed area and its linked pages, with
      `worker/conductor-import/README.md` and
      `src/shared/conductor-import.md`.

Verification evidence: `.context/import-from-conductor/current/m7c-lfs-facts-report.md`.

## Milestone 8: Import screens and imported workspaces

Tags: ui

Depends on: 1, 4, 5, 6, 7a, 7b, 7c

Process authorization of the parent for the user, 10 November 2026: the
disjoint UI source of this milestone can start once the public contracts that
it uses are frozen, while the private proofs and repeats of Milestone 5
continue. The milestones on the `Depends on:` line still govern the final
integration and the completion checks of this milestone. This is a process
approval. It adds no product decision and changes no required gate.

- [x] Build the entry, the offer, the list, the progress, and the result
      from the mockups.
- [x] Show Select all with a mixed mark for a partial selection. Use the
      selected rows for the count and upload size.
- [x] Build the imported workspace: its flag, the links to its old
      sessions, their Markdown view, and the Activate question.
- [x] Show Not active with no premature file count or project file list.
      Use the shared notice contract from Milestone 3a.
- [x] Keep the old-session links in the session history after a new chat
      fills the tab. Keep phone navigation in the same workspace and
      lifecycle state, including its Markdown view and archived state.
- [x] Use the imported Archive question and archived words before a
      successful activation. Keep the old documents readable. Do not say
      that work is pushed or a cloud computer was deleted when neither
      fact is true.
- [x] Add the web app tests, as the `testing` skill says.
- [x] Update `src/app/README.md` and `src/shell/workspace/README.md`.
- [x] After Milestone 6 pushes its production code, change the note of the
      `local-workspaces` row in
      `src/marketing/from-conductor/areas/workspaces-and-branches.ts`: the
      import through the Mac app becomes in progress. Keep the row ID and
      its status, add no due date, and keep the check time, as
      [Conductor comparison](../docs/protocol/conductor-comparison.md#statuses)
      says.

Verification evidence: `.context/import-from-conductor/current/m8-ui-report.md`
and, for the comparison note, `.context/import-from-conductor/current/m8/package-9/`.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

Captured-main integration record: `.context/import-from-conductor/current/next-main-integration/root-integration-audit.md`.
Desktop integration record: `.context/import-from-conductor/current/next-m6-integration/root-integration-audit.md`.
PR main integration record: `.context/import-from-conductor/current/pr-main-integration/root-integration-audit.md`.

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
