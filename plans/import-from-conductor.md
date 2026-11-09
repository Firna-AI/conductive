# Import from Conductor

Status: Active. On branch `calummoore/conductor-import-option`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductive replaces Conductor Cloud. Conductor Cloud goes read-only on
13 November 2026. On 20 November 2026 it shuts down, and Conductor starts
to delete the cloud data. Today a Conductive workspace always starts on a
new branch with an empty chat, so no Conductor work can continue in
Conductive with its branch and its chats. This change adds two things.
A new workspace can continue a branch that already exists on GitHub. A
user can import their Conductor Cloud workspaces, with their names,
sections, branches, and chats, through the Conductor API.

The answers of 9 November 2026 change the scope. Each workspace imports
only when the user is ready, with its files: the files that Git sees and
`.context`, from the copy that Conductor's Sync files keeps on the user's
Mac. Decisions 3, 6, and 7 decide how the files and the chats get there.
Until they are answered, the paragraph below is the scope of 8 November.

The import works only until 20 November 2026, because the Conductor API
then has no data to read. So the import must ship well before that date.
A user who has work that is not pushed must push it in Conductor, or use
Conductor's Transfer to local, before 13 November. This change does not
import that work, Conductor's setup scripts, or Conductor's env vars. The
brainstorm notes and sources are in `.context/conductor-import/notes.md`.
The options check of the decisions is in `.context/import-from-conductor/`.

Contract owners:

- A new protocol doc, `docs/protocol/conductor-import.md`, which
  Milestone 2 creates.
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md),
  for a new workspace on an existing branch.
- [Chat and events](../docs/protocol/chat-and-events.md), for imported
  sessions.
- [Access and security](../docs/protocol/access-and-security.md), for the
  Conductor API key.
- The [architecture doc](../docs/architecture.md), for the Conductor API as
  an external service.
- The READMEs of the changed areas: [worker/app-api](../worker/app-api/README.md),
  [worker/lifecycle](../worker/lifecycle/README.md),
  [worker/github](../worker/github/README.md),
  [worker/chat](../worker/chat/README.md), [src/app](../src/app/README.md),
  and [src/shell/workspace](../src/shell/workspace/README.md).

## Facts that the design uses

Checked on 8 November 2026. The notes give each source.

- The Conductor API is `https://api.conductor.build/v0`. It is in beta.
  A user makes a personal key at `https://app.conductor.build/home/api-keys`.
  The API needs a Pro, Teams, or Enterprise plan. Conductor Cloud needs the
  same plans, so every Conductor Cloud user can make a key.
- A key has no scopes. It can do everything that its user can do in
  Conductor, also writes. A user key belongs to one Conductor org.
- The API also knows workspace keys and sign-in tokens. Some routes
  refuse them. Nobody has checked which read routes accept a sign-in token.
- Checked on 9 November 2026 with no credentials: only the MCP server
  publishes OAuth metadata. That metadata offers self-service client
  registration, PKCE, refresh tokens, and public clients with no secret.
  The REST routes answer with 401 and no OAuth challenge, and their
  OpenAPI document names only a bearer token. So the REST routes probably
  do not accept the MCP sign-in token.
- The read routes give projects with their Git remote, workspaces with
  their name, repository, state, and creator, personal sections with
  their workspace IDs, sessions with their name and model, and full
  transcripts. A transcript holds Conductor's user messages and the raw
  Claude stream events or Codex items.
- The sessions route leaves out archived sessions unless the call asks
  for them.
- No route returns the branch, the env vars, or the setup script of a
  workspace. The `branch` field exists only in the input of a create.
- The read-only SQL route is "temporarily disabled". So the import reads
  each transcript page by page.
- Conductor's MCP server offers an OAuth sign-in with no key. Its grant
  covers one Conductor org. The MCP server has no tool for sections.
- Conductor's own exits are Export data and Transfer to local. Export
  data works until 20 November. It is not clear that Transfer to local
  works after 13 November.
- In Conductive, each workspace record needs a first message, a first
  session, and a model, and the resume refuses a workspace with no cloud
  computer.
- The runner gives the agent no instructions of its own. Claude reads only
  the project settings of the repository.
- Checked on 9 November 2026: Conductor's own advice for the shutdown is
  Transfer to local, to keep working on the Mac, and Export data, for a
  copy of all data. It names no format for the archive, and it does not
  name the API.
- Conductor's Sync files keeps a copy of each cloud workspace on the
  user's Mac, under `~/conductor/remote-workspace-sync/`. A copy holds the
  files that Git sees, `.context`, and Git data with the newest commit,
  but no branch name and no ignored folders. The user's copies total 34 GB.
- All eight repositories of the user's open Conductor workspaces are
  public on GitHub.
- The Files tool of Conductive shows only the files that Git sees, so it
  does not show `.context`.
- Nobody has checked if Sync files removes the Mac copies when Conductor
  deletes the cloud workspaces on 20 November.
- A Mac command returns at most 64 KiB of output, and each message on the
  device connection holds at most 1,000,000 bytes. The page of the Mac app
  has no bridge to its main process.
- The GitHub token that a cloud computer gets for a turn reaches every
  repository where the sender installed the GitHub App and has access.
- No product path brings user files into a cloud computer today. Message
  attachments answer that they are not available.
- Cloudflare limits, checked on 9 November 2026: a Worker request gets 30 s
  of CPU by default, up to 5 minutes, and 128 MB of memory. A request body
  holds at most 100 MB on the Free and Pro zone plans. A storage object
  holds up to 10 GB, in rows of at most 8 MB.
- One page of 100 Conductor transcript messages is about 570 KB, and it
  takes about 0.1 s to read.

## Decisions

### 1. How Conductor work comes into Conductive

- **Root question:** How does a Conductor user bring their work into
  Conductive and continue where they stopped?
- **Options:**
  - **A.** No product change, only a guide. Effort: Small.
  - **B.** A new workspace can continue a branch or an open pull request
    from GitHub. It needs no access to Conductor. Effort: Medium.
  - **C.** B, plus an import through the Conductor API of the names,
    sections, and chats, with the branch of each workspace guessed and
    confirmed. It stops working on 20 November. Effort: Large.
  - **D.** B, plus an upload of Conductor's Export data archive. Its
    format is not documented. Effort: Large.
  - **E.** B, plus an import of local Conductor workspaces by the Mac app.
    Effort: Large.
- **Left out:** A command in each Conductor workspace that pushes its work,
  because it must run before 13 November, and Transfer to local already
  saves work that is not pushed. Setup scripts from the repositories,
  because none of six team repositories commits one. The agents' session
  memory, because no known export holds the agents' session files.
- **Recommendation:** B. The agent recommended D as a later step.
- **Chosen:** C, by the user on 8 November 2026, with three additions:
  - New branch stays the default of New workspace.
  - A subtle control lets the user pick an existing branch, because that
    choice is not common.
  - The user chooses what to import. The user can import everything, but
    can also select single sections or single workspaces.
- **Clarified by the user on 9 November 2026:** the import serves every
  Conductive user, built into the app, with no large performance cost. It
  is not a one-off move of one user's work.

### 2. Two open workspaces on one branch

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/workspaces-and-sandboxes.md`, Create a
  workspace, and the plain index `workspaces_branch` in
  `migrations/202611060100_contracts.sql`.
- **Background:** Today each new branch gets a random suffix, so no two
  workspaces share a branch. Decision 1 adds two ways to pick an existing
  branch: the branch control of New workspace and the import. Two rows of
  one import can also find the same branch. Each workspace has its own
  cloud computer with its own copy of the repository.
- **Problem:** No requirement says if two open workspaces can use one
  branch. The architecture doc says that each workspace has its own branch.
- **Impact if no action:** Two agents can commit to one branch from two
  copies. The second push fails until that agent pulls. Both workspaces
  show the same pull request.
- **Root question:** What does the app do when a new or imported workspace
  would use the branch of another open workspace in its org?
- **Options:**
  - **A.** Allow it, and show nothing. Effort: Small.
  - **B.** Allow it. The branch control and the import list name the open
    workspace that uses the branch. Effort: Small.
  - **C.** Allow one open workspace for each branch. The branch control
    and the import list offer to open the workspace that uses the branch.
    The Worker refuses a second workspace on that branch. An archived
    workspace does not count. Effort: Small.
  - **D.** C, and D1 also holds the rule. A unique index on the repository
    and the branch of each workspace that is not archived replaces the
    plain index. Every create path then meets the rule, also the import,
    and two creates at the same time cannot both pass. Decision 4 says if
    an imported workspace with no cloud computer counts. Each create path
    turns the index error into the refusal of C. Effort: Small.
  - **E.** C, but when the branch is taken, the user can also start a new
    branch from the head of that branch. Two people then work side by
    side without a shared branch. Until the taken branch merges, Changes
    and the pull request of the new branch also show its commits. Effort:
    Medium.
- **Left out:** An archive of the other workspace that frees its branch,
  because only the workspace owner and the admins can archive a workspace.
  A guard on pushes in the cloud computer, because agent code there can
  remove it. A lock on GitHub, because it also blocks people and tools
  outside the app.
- **Wider fix:** D. The database holds the rule for every create path.
- **Previous examples:** None found. Random branch names prevent the case
  today.
- **Related:** Decision 4 says if an imported workspace with no cloud
  computer counts.
- **Recommendation:** D. It keeps the behaviour of C, and the rule also
  holds in the import and when two creates run at the same time. The plan
  first recommended C. The options check showed that more than one create
  path gives a workspace its branch.
- **Action:** ask the user, because C and D add a new rejection.
- **Chosen:** A, by the user on 9 November 2026. Two open workspaces can
  use one branch, and the app shows nothing. The agent recommended D.

### 3. How the chats, names, and sections reach Conductive

Changed twice on 9 November 2026. First, decision 4 lets the import wait
until the user is ready. Then the user said that the import must serve
every Conductive user, built into the app, with no large performance
cost. So G and H, which serve one user, are left out. The options check of
the same day brought back I, added K and L, left out J, and changed the
recommendation from A to I.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** The Conductor API gives the names, the sections, and the
  transcripts with a personal key, until 20 November. One page of 100
  messages is about 570 KB and takes about 0.1 s. One user had 70 open
  workspaces with 297 sessions. A Worker request gets 30 s of CPU by
  default and 128 MB of memory. A storage object holds up to 10 GB, in rows
  of at most 8 MB. Export data, Conductor's own copy, also works only until
  20 November, and its format is not documented. Nobody has checked the
  rate limits of the Conductor API under the load of every user.
- **Problem:** The import must keep each user's chats before Conductor
  deletes them, without one large job, also for a workspace that the user
  imports later.
- **Impact if no action:** The chats of each user are lost on 20 November,
  or one import job meets the CPU and memory limits of the Worker.
- **Root question:** How does every user who leaves Conductor keep the
  chats, names, and sections of each workspace in Conductive, also for a
  workspace that the user imports after 20 November?
- **Options:**
  - **A.** The user pastes a Conductor API key. The browser drives the
    import of the selected workspaces, one transcript page for each
    request. Each request reads one page, converts it, and writes it into
    the storage of its imported workspace. The key stays in the browser's
    memory. It keeps only the chats of the workspaces that the user imports
    before 20 November, and all of it must ship before that date. Effort:
    Medium.
  - **B.** The user signs in through the OAuth of Conductor's MCP server,
    and pastes a key for the sections. It keeps the key risk of A and adds
    a sign-in. Effort: Large.
  - **C.** The browser calls the Conductor read routes itself and sends
    each page to the Worker. The content security policy must change, and
    nobody has checked that Conductor allows calls from the browser.
    Effort: Medium.
  - **D.** The Worker stores the key encrypted and imports in the
    background, in timed steps. A closed tab does not stop the import. The
    app then holds a key that can also write to the user's Conductor
    account, until the import ends. Effort: Large.
  - **E.** The user signs in through OAuth, and the Worker calls the REST
    routes with that sign-in. The REST routes probably refuse the token.
    Effort: Large.
  - **F.** The browser reads the Export data archive on the user's device
    and sends only the selected workspaces, page by page. It works after
    20 November when the user downloaded the archive before that date and
    it holds the chats. One sample archive must show the format first.
    Effort: Large.
  - **I.** A Save step, before 20 November. With the pasted key, it reads
    the names, the sections, and every transcript page of the selected
    workspaces. Each Worker request stores one raw page, in one storage
    object for each Conductor workspace, so the saves of many users run
    side by side. It creates no workspace. When the user is ready, the
    import reads the save, converts it, and creates the workspace, also
    after 20 November. The app keeps raw chats of workspaces that the user
    may never import, so it needs a retention rule and a line on the
    privacy page. Only the save must ship before 20 November. Effort: Large.
  - **K.** I, but the save goes to the user's device. The Worker returns
    each page and stores nothing. The browser writes the pages into a
    folder that the user picks, or downloads them, and the later import
    reads them in the browser. Only Chromium browsers can write a folder,
    and the user must keep the files. Effort: Large.
  - **L.** The browser reads the chats that Conductor keeps on the Mac
    after Transfer to local, and sends the selected chats page by page.
    Conductor does not document that data, so a sample must show the
    format first. Transfer to local may stop on 13 November. Effort: Large.
- **Left out:** G and H, because each serves only the user who runs the
  script, and K is their form for every user. J, because a start may give
  a cloud computer only its workspace token and the org's env vars, and
  agent code there could read a key that can write to the user's Conductor
  account. J also starts each workspace before 20 November, against
  decision 4. OAuth only through the MCP server, because it has no tool
  for sections. A command in each Conductor workspace, because the API
  reads the same data from one place. Change nothing, because Conductor
  deletes the chats from 20 November.
- **Wider fix:** I. It keeps every chat from before 20 November, whatever
  the user imports later and whenever.
- **Previous examples:** None found.
- **Related:** Decision 4 imports each workspace when the user is ready.
  Decision 6 brings the files. Decision 7 says how the chats show.
- **Recommendation:** I. Only the save of the raw pages must ship before
  20 November. The conversion, the workspaces, and the views can follow,
  tested on real saved pages, and each workspace imports when the user is
  ready. Add F later for users who downloaded Export data. The plan first
  recommended A, then G, then A.
- **Action:** ask the user, because I keeps raw chats in the app before the
  user imports them, which needs a retention rule, and no requirement
  covers it.

### 4. How the user continues an imported workspace

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/workspaces-and-sandboxes.md`, Create a
  workspace and Stop and resume, and `worker/lifecycle/workspace-data.ts`.
- **Background:** Today the first message of a new workspace creates the
  workspace and starts its cloud computer. A failed first start removes
  the new workspace. Opening a stopped workspace resumes its cloud
  computer. An import creates many workspaces at once, with chats but with
  no message to send. Each start uses the shared start limits of the app's
  sandbox account. A cloud computer that started once also restarts near
  day 14 of each stop.
- **Problem:** No requirement says how the work of an imported workspace
  continues on a cloud computer. Today's workspace records and resume
  cannot hold a workspace that has never started.
- **Impact if no action:** The implementation picks a way. It can start
  many cloud computers that nobody uses, or build a new kind of first
  start under time pressure.
- **Root question:** How does the user continue the work of an imported
  workspace on a cloud computer?
- **Options:**
  - **A.** The first message in the imported workspace starts its cloud
    computer, as the first message of a new workspace does. A Start action
    in the tool panel starts it without a message. It needs a new kind of
    first start in the lifecycle code. Effort: Large.
  - **B.** Opening the imported workspace starts its cloud computer, as
    opening a stopped workspace resumes one. A look at an old chat then
    uses a start. It needs a new kind of first start. Effort: Large.
  - **C.** The import starts the cloud computer of each imported workspace
    at once. Many starts then run together, and each one then restarts
    about every 14 days until someone archives it. It needs a new kind of
    first start. Effort: Large.
  - **D.** The imported workspace stays read-only with no cloud computer.
    A message or Continue in it creates a new workspace through the
    existing create path. The new workspace gets the imported branch,
    name, and section, and the two workspaces link to each other. The old
    chats and the new work are then in two workspaces. The user cannot
    look at the files before Continue. Effort: Medium.
  - **E.** A, but the first start follows the message rules of a resume.
    The workspace keeps its messages while it starts. A failed start shows
    the error state with Try again, and the messages stay. Effort: Large.
- **Left out:** Files from GitHub before any start, because the file tools
  read only from the runner, and one start shows the files.
- **Wider fix:** None.
- **Previous examples:** Decision 11 chose Resume over a resume at once
  when a tab shows again.
- **Related:** Decision 2 asks if an imported workspace with no cloud
  computer counts as open. Decision 5, option E, fits only when the
  imported session itself continues, as in A or E.
- **Recommendation:** D. It continues the work through the existing create
  path and its tested failure handling, and it uses no start for a
  workspace that nobody continues. The plan first recommended A. The
  options check showed that A, B, and C need a new kind of first start. If
  one workspace for each task matters more than that cost, E is the
  better form of A.
- **Action:** ask the user, because the options trade cost against a
  wait and against one workspace for each task, and no requirement covers
  a workspace that has never started.
- **Chosen:** a new option, by the user on 9 November 2026: download the
  files of each workspace, by the rule of the files that Git sees plus
  `.context`, and import a workspace only when the user is ready. Checked
  the same day: Conductor's Sync files already keeps such a copy on the
  user's Mac. The Conductor API cannot read files. All eight repositories
  of the user's open workspaces are public, so a snapshot branch on GitHub
  would publish `.context` and the chats. The import of a workspace creates
  it through the create path, as D does. Decision 6 says how the files
  move from the Mac.

### 5. How the agent learns the context of the old chats

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** The import shows the old chats read-only. A new session
  starts a fresh agent. Each Claude transcript holds every message and
  tool call as raw Claude events. The runner gives the agent no
  instructions of its own today.
- **Problem:** The new agent does not know what the old chats decided.
- **Impact if no action:** The user must repeat the context of the work
  in the first message.
- **Root question:** How does the agent that continues an imported
  workspace get the context of its Conductor chats?
- **Options:**
  - **A.** It does not. The user quotes what the agent needs. Effort:
    Small.
  - **B.** At the first start, the app writes each imported chat as a
    Markdown file in the home folder of the cloud computer, outside the
    repository. An instruction to the agent names the folder, so the agent
    reads a chat when it needs it. The runner needs a way to give that
    instruction. This can ship after 20 November, because the imported
    chats stay in Conductive. Effort: Medium.
  - **C.** The first message of the new session carries a short summary
    of the old chats. The summary needs a model call on the user's agent
    login, and it loses detail. Effort: Medium.
  - **D.** A new agent tool reads an imported chat on request, one page at
    a time. The workspace token then gets a new call, which changes Access
    and security and Agent tools. With option D of decision 4, the token
    must also read another workspace. Effort: Medium.
  - **E.** The import keeps the raw Claude events. At the first start, the
    app rebuilds each imported Claude session as a session file of the
    pinned agent program, so the session continues with its full memory.
    Codex sessions use B. It depends on a private file format, and a trial
    must first prove that a rebuilt file resumes. Effort: Large.
- **Left out:** Files of the old chats in the repository, because B gives
  the agent the same files and keeps the branch clean. A summary on a
  model account of the app, because the app uses no model account of its
  own.
- **Wider fix:** None. Decisions 51 and 115 already start sessions without
  earlier history in other cases.
- **Previous examples:** Decisions 51 and 115 rejected a copy of a
  conversation into another session of the same workspace.
- **Related:** Decision 4. Option E here fits only with option A or E of
  decision 4.
- **Recommendation:** B. It works for both agents, it can ship after
  20 November, and it keeps the rules of the workspace token.
- **Action:** ask the user, because the options trade effort against the
  agent's context, and no requirement covers it.
- **Chosen:** B, by the user on 9 November 2026: the agent starts from the
  transcript. The user allowed the chat to skip a copy of the old
  messages if that copy is too hard. Decision 7 asks about that copy.
- **Agent call, 9 November 2026:** the transcript files go into `.context`
  of the repository folder, not into the home folder. Reason: decision 4
  brings `.context` along, and the runner and the file routes read only
  inside the repository folder. The import adds `.context/` to the local
  exclude file of the clone, so that Git ignores it in every repository
  and no push sends it.

### 6. How the work that GitHub does not hold reaches the cloud computer

Changed on 9 November 2026: the user said that the import must serve
every Conductive user, built into the app, with no large performance
cost. So E now needs a private repository for each user, and H is left
out. The options check of the same day added I, J, and K, graded D as
Large, and changed the recommendation from B to K.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Git fetches the pushed history of a branch from GitHub
  inside the cloud computer, with no Worker in the path. The rest of the
  work exists only on the user's Mac: in the copies of Sync files, or in a
  local Conductor workspace after Transfer to local. Nobody has checked,
  for every user, that Sync files keeps a copy of each workspace, or that
  the copies stay after 20 November. Nobody has checked that the rest is
  small, and `.context` also holds the files that users attached to
  Conductor messages. Decision 132 of the main plan chose one R2 bucket
  for message attachments, at most 25 MB for each file, which the Worker
  copies into the cloud computer when the turn starts. Milestone 8p builds
  it, and today each attachment upload fails. A request body holds at most
  1,000,000 bytes unless its route sets a higher limit. Try again after a
  failed first start creates a new workspace ID.
- **Problem:** For every user, the import must move the rest of the work
  into the new cloud computer without moving the whole repository through
  the app.
- **Impact if no action:** Work that is not on GitHub stays behind for
  every user.
- **Root question:** How does the app move, for every user, the Conductor
  work that GitHub does not hold into the cloud computer of the imported
  workspace?
- **Options:**
  - **A.** The Conductive Mac app gets an Import from Conductor screen, and
    sends the difference through a new device operation in parts. The Mac
    app has no release yet, no product screens, and no bridge to its main
    process. Effort: Large.
  - **B.** The user picks the copy folder in the browser. The browser
    compares each file with the branch on GitHub by its Git hash, and
    uploads only the files that differ and `.context`, in parts. The
    workspace keeps the upload until its first start, when the runner
    applies it, and then deletes it. The route must set a limit above
    1,000,000 bytes. Try again after a failed first start loses the upload,
    because it uses a new workspace ID. Commits that are not on GitHub
    become uncommitted changes. Effort: Large.
  - **C.** A command-line tool on the Mac does what A does, with a sign-in
    of its own. Effort: Large.
  - **D.** The agent of the new workspace pulls the work with Mac commands,
    in parts of 64 KiB. Every user first needs a release of the Mac app,
    and a 50 MB difference takes about 1,000 commands. Effort: Large.
  - **E.** A private GitHub repository of each user holds a snapshot of the
    work, which a script on the Mac pushes. Each user must create that
    repository and install the GitHub App on it. GitHub then holds
    `.context`. Effort: Medium.
  - **F.** The agent serves an upload page in the cloud computer, which the
    user opens as a port preview. The page sends parts below 1,000,000
    bytes. Commits that are not on GitHub become uncommitted changes.
    Effort: Medium.
  - **G.** The import shows one Terminal command with a one-time upload
    address. Git on the Mac makes a bundle of the commits that are not on
    GitHub and an archive of the other changes. The same storage and runner
    step as B apply them. It keeps the commits. Nobody has checked that a
    copy holds each commit that GitHub lacks. The user needs Terminal.
    Effort: Large.
  - **I.** B, with no copy at rest. The import first creates the workspace
    through the create path. The browser then sends each part through the
    Worker to the runner, which applies it at once, and the first message
    waits for the last part. The tab must stay open during the start, and
    Try again sends the parts again. Effort: Large.
  - **J.** For a private repository, the browser sends the difference
    through the Worker to GitHub, as a commit on a ref that is not a
    branch. The first start fetches that ref and turns it into uncommitted
    changes. Nothing rests in the app. A public repository still needs
    another option, and the import must delete the ref after use. Effort:
    Large.
  - **K.** B, on the attachment path of decision 132. The parts wait in the
    upload bucket as files of the import's first message. The Worker copies
    them into the cloud computer when the first turn starts, and the runner
    unpacks them into the repository folder before the agent starts. The
    upload survives a failed first start, because no failure loses a first
    message or its attachments. It waits for Milestone 8p, one file holds
    at most 25 MB, and the import must delete its parts after the runner
    applies them. Effort: Large.
- **Left out:** Snapshot refs in public repositories, because they publish
  `.context`, and J covers private ones. A lasting copy in the app's own
  storage, because Stop and resume rejected a copy of the disk there, and
  K deletes its parts after use. A push from Conductor only, because it
  leaves `.context` behind. H: the app asks the agent of each Conductor
  workspace to upload its work, because it ends on 13 November.
- **Wider fix:** K. One path then brings every file into a cloud computer:
  composer attachments, the imported work, and the transcripts.
- **Previous examples:** Decision 132 of the main plan chose the same
  bucket for message attachments.
- **Related:** Decision 4 chose to import the files when the user is ready.
  Decision 7 can put the transcripts on the same path.
- **Recommendation:** K. It is B on the bucket and the delivery that
  decision 132 already chose, so the import adds no second store, and the
  upload survives a failed first start. If no user code may rest in the
  app, choose I. Add G later, once a copy is shown to hold the commits.
  The plan first recommended A, then E, then B.
- **Action:** ask the user, because K waits for Milestone 8p and keeps the
  work in the bucket until its turn, and I trades that against a tab that
  must stay open.

### 7. Where the user reads the old chats

Changed on 9 November 2026: the import must serve every Conductive user.
D needs the one-off save, so it is left out, and F is new. The options
check of the same day added G and changed the recommendation from F to G.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Decision 5 gives the agent the transcript as its starting
  point, as files in `.context` of the repository folder. The Files tool
  does not show `.context`. A copy of the old messages into the chat needs
  a conversion of Conductor's raw events into the app's own chat events, a
  way to store events that no runner sent, and read-only session screens.
  A tab that opens gets every stored chat event of the workspace. The app
  already shows Markdown in file tabs. Conductor keeps message attachments
  in `.context/attachments/`, which decision 4 imports.
- **Problem:** With files only, the user cannot read the old chats in
  Conductive. The user asked to skip the copy if it is too hard.
- **Impact if no action:** The user reads the old work only through the
  agent.
- **Root question:** Where does the user read the old chats of an imported
  workspace after Conductor shuts down?
- **Options:**
  - **A.** Not in Conductive. The agent reads the transcript files, and the
    user asks the agent. Effort: Small.
  - **B.** The import copies the old messages into read-only sessions in
    the session history of the workspace. Each new tab then loads every
    old event. Effort: Large.
  - **C.** The Files tool also shows the transcript files. A stopped
    workspace needs a start first, and a file read stops at 5 MiB. Effort:
    Medium.
  - **E.** The imported workspace lists its old chats, and each entry opens
    the Markdown file of that chat in `.context` as a file tab, while the
    cloud computer runs. Effort: Medium.
  - **F.** The import stores each old chat as one Markdown document in the
    storage of the imported workspace. The workspace lists the old chats,
    and each opens in a read-only view, also while no cloud computer runs.
    The first start writes the same Markdown into `.context` for the
    agent. Effort: Medium.
  - **G.** F, and the import also keeps each raw transcript page in the
    storage of the imported workspace. A later B, a better view, or a
    rebuilt agent session can then come from Conductive's own copy after
    20 November. The raw pages need about 570 KB for each 100 messages.
    With option I of decision 3, the save already keeps them. Effort:
    Medium.
- **Left out:** D, while no save writes Markdown on the user's device. With
  option K of decision 3, D comes back. Conductor's own Mac app after
  Transfer to local, because nobody knows if it keeps working after the
  shutdown.
- **Wider fix:** G. Any later view then comes from Conductive's own copy,
  not from a source that is gone.
- **Previous examples:** An archived workspace already shows its chat
  read-only. A session with an unknown starter already keeps its history.
- **Related:** Decision 3 brings the transcripts, and its option I keeps
  the raw pages.
- **Recommendation:** G. It keeps the view of F, which needs no start, and
  it keeps open the later path to B, which needs the raw pages. The plan
  first recommended B, then D, then F.
- **Action:** ask the user, because no option is clearly best: G stores
  more, and B shows the chats in the chat itself at a higher cost.

## Design

Each call below is an agent call of 8 November 2026, unless it names a
decision.

### Performance

Agent calls of 9 November 2026, for the import that serves every user:

- The app moves only the work that GitHub does not hold. Git fetches the
  pushed history inside the cloud computer.
- No Worker request handles more than one transcript page or one upload
  part.
- The heavy steps run on the user's device or in the cloud computer: the
  browser compares files and reads archives, and the runner applies the
  work.
- Each imported workspace keeps its data in its own storage object, so
  imports run side by side with no shared bottleneck.
- No cloud computer starts until the user continues a workspace.
- With option I of decision 3, an imported workspace exists only from the
  moment that the user imports it. Until then, the save holds its data. A
  failed first start then loses no chat, because the save still holds it.
- When the import can read the newest commit of a copy, it uses that
  commit to find the branch and the base of the difference, in place of
  the guess from the transcript.
- The Markdown of an old chat links its attachments in
  `.context/attachments/`.
- The import reads only a few Conductor pages at a time for each user, and
  it waits and tries again after a refusal, because nobody has checked the
  rate limits of the Conductor API.

The answers of 9 November 2026 to decisions 4 and 5 change this design:
the files come from the Mac copies, and each workspace imports only when
the user is ready. The rewrite of this design and of the milestones waits
for decisions 3, 6, and 7. Until then, the sections below that read the
Conductor API at the time of the import are not in force.

### Continue a branch in New workspace

- New branch stays the default (decision 1). Under the repository picker,
  the line that says the workspace starts on a new branch gets a quiet
  link that changes the branch.
- The link opens a picker with the branches and the open pull requests of
  the repository on GitHub. A pull request shows its title and its branch.
- The picker does not offer the default branch. Reason: a workspace works
  on its own branch, and Changes compares with the default branch. The
  Worker adds no refusal for it.
- A workspace on an existing branch keeps the name of that branch. The rule
  that a branch name starts with the GitHub login applies only to new
  branches. Reason: the branch already exists on GitHub.
- Its name starts as the pull request title, or as the branch name, and
  the agent's title then renames it, as it does today.
- Its start fetches that branch and checks it out with tracking, in place
  of a new branch from the default branch. Changes still compares with the
  default branch.
- When the branch no longer exists on GitHub at the start, the start fails
  and names that cause. The user can then pick another branch or a new
  branch.

### The import entry

- "Import from Conductor" is a quiet secondary action beside New workspace
  at the top of the workspace list, and in the empty list. Reason: a
  one-time move needs an entry that people find but that does not crowd
  the list.
- The entry shows until 20 November 2026. Reason: the import cannot work
  after that date.
- The import goes into the org of the list that opened it. Any member can
  import, as any member can create a workspace.

### Connect and list

- The connect step follows decision 3. With option A, the user pastes a
  key, and the screen links to Conductor's key page. The screen says that
  a key reads one Conductor org.
- The list shows only the Conductor workspaces that the user created, and
  hides the archived ones. Reason: each person imports their own work with
  their own key, and no import takes over the work of another person.
- The list groups the workspaces by the user's Conductor sections, then
  "No section". Select all, a section box, and a workspace box each select
  what they name (decision 1). A section box selects only the user's own
  workspaces in it.
- A row whose repository is not a chosen repository of the org shows that
  it cannot import, with the hint that an admin can add the repository.
  Reason: a workspace starts from the org image, which holds only the
  chosen repositories. The app matches the GitHub owner and name of the
  Conductor Git remote.
- The app records the Conductor workspace ID on each imported workspace.
  The list marks a workspace that the org already imported, links to it,
  and leaves it unselected. Decision 2 says if it can import again on the
  same branch.

### Branch of each row

- The app finds the branch in the transcript: Git output that names the
  branch, and pull request links. It keeps a candidate only when the branch
  exists on GitHub and is not the default branch. The newest mention wins.
  Reason: the API gives no branch.
- The row shows the found branch. The same quiet control as New workspace
  changes it.
- When the app finds no branch on GitHub, the row uses a new branch. The
  row says that the Conductor work stays behind unless the user pushes it
  in Conductor first.

### The import run

- The browser drives the import, one page of transcript per request. It
  keeps the key in memory only. Reason: a long chat needs many reads, and
  option A of decision 3 keeps the key out of storage.
- The Worker uses the key only for the request that carries it. It never
  stores the key, never logs it, never sends it to a cloud computer, and
  never returns it.
- The Worker calls only these Conductor routes: `GET /me`,
  `GET /v0/projects`, `GET /v0/workspaces`, `GET /v0/sections`,
  `GET /v0/workspaces/{id}/sessions`, and `GET /v0/sessions/{id}/messages`.
  It calls no route that writes.
- The import also reads the archived sessions of each workspace. They go
  to the session history. Reason: they are part of the old work.
- Each imported workspace shows in the list at once, in an Importing state,
  until its chats are complete. An import that stops resumes from the last
  imported message when the user opens the import again.
- A section of the import maps to the org section with the same name. The
  import creates the section when it does not exist. A workspace in no
  Conductor section goes to General. Reason: org sections are shared, and
  any member can already create one.

### Imported workspaces and chats

- The workspace owner is the person who imported it. The name comes from
  Conductor.
- An imported workspace has no first message. The workspace reads accept
  such a workspace, whatever decision 4 chooses.
- Each Conductor session becomes a read-only session with its Conductor
  title. The newest opens as a tab. The others go to the session history.
- The import converts the raw Claude stream events and Codex items into
  the app's own chat event type, with the same size limits as runner
  events. It reuses the mapping rules of the runner where they fit. It
  skips Conductor's own system events.
- An attachment of an old message does not import. The chat says that it
  was not imported.
- A message from the user shows as the user's. A message from another
  Conductor person shows as "Conductor user", because the API gives only
  that person's ID.
- Decision 4 says how the work continues on a cloud computer. When the
  imported workspace gets its own cloud computer and its first start
  fails, the workspace stays with its chats. Reason: the import made
  lasting records before any start.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw every screen and flow of the change, at phone and desktop sizes. The
screens that decisions 2, 3, and 4 affect wait for their answers.

- [ ] Add the quiet branch link to the New workspace screen, and the
      branch picker with branches and open pull requests. Show the mark
      of decision 2.
- [ ] Add "Import from Conductor" beside New workspace in the workspace
      list, and in the empty list.
- [ ] Add the import screens: the connect step of decision 3, the list
      with Select all, section boxes, workspace boxes, the branch of each
      row, the rows that cannot import, and the already imported rows.
- [ ] Add the import progress and the result, with a stopped import that
      resumes.
- [ ] Add an imported workspace: the Importing state, the read-only
      session tab, the session history entries, and the way to continue
      the work that decision 4 chooses, with its failure.
- [ ] Add the user flow `import-from-conductor`, from the list to an
      imported workspace whose work continues on its branch.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

Write the requirements and the decisions for the work below.

- [ ] Create `docs/protocol/conductor-import.md` with the requirements of
      the import, the key, and the imported sessions.
- [ ] State the branch choice of a new workspace, and decision 2, in the
      protocol doc that holds Create a workspace.
- [ ] State decision 4 and the way an imported workspace continues.
- [ ] State the read-only imported sessions in Chat and events.
- [ ] State the rules of the Conductor key in Access and security.
- [ ] Add the Conductor API to the external services and the flows of the
      architecture doc.
- [ ] Split each touched doc that passes the length target into linked
      pages, as the `documentation` skill says. Remove each split doc from
      `plans/follow-ups/protocol-docs-split.md`.
- [ ] Update the feature list of `README.md`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Continue an existing branch

Depends on: 2

- [ ] Add a Worker route that lists the branches and the open pull
      requests of a chosen repository, through the GitHub App. Leave out
      the default branch.
- [ ] Accept an existing branch in the create request. Keep New branch as
      the default.
- [ ] Fetch and check out the existing branch at the first start, with
      tracking. Fail with a clear cause when the branch is gone.
- [ ] Apply decision 2 in every path that gives a workspace a branch.
- [ ] Add Worker tests against the fake GitHub server, as the `testing`
      skill says.
- [ ] Update the READMEs of `worker/lifecycle` and `worker/github`.

## Milestone 4: Conductor client, list, and branch match

Depends on: 2

- [ ] Add a Conductor client in the Worker that calls only the listed read
      routes, and that keeps the key out of storage and logs.
- [ ] Add a fake Conductor server under `worker/test-support/`.
- [ ] Add the list route: the user's own workspaces that are not archived,
      their sections, their repository match, and the already imported
      mark.
- [ ] Add the branch match from the transcript and GitHub.
- [ ] Add the D1 record of the Conductor workspace ID of each imported
      workspace, with its migration.
- [ ] Add Worker tests, as the `testing` skill says.
- [ ] Add the README of the new Worker area, and update
      `worker/app-api/README.md`.

## Milestone 5: Import workspaces and chats

Depends on: 3, 4

- [ ] Let the workspace reads accept an imported workspace that has no
      first message.
- [ ] Add the import route that creates each workspace with its section,
      its branch, and its Importing state. Apply decision 2 there.
- [ ] Add the page route that imports one page of a transcript and resumes
      after the last imported message. Read the archived sessions too.
- [ ] Convert Conductor's Claude stream events and Codex items into the
      app's own chat events, with the runner limits.
- [ ] Store the imported sessions read-only, with their titles.
- [ ] Continue the work on a cloud computer as decision 4 says.
- [ ] Add Worker tests, as the `testing` skill says.
- [ ] Update the READMEs of `worker/chat` and `worker/lifecycle`.

## Milestone 6: Branch control in New workspace

Tags: ui

Depends on: 1, 3

- [ ] Build the quiet branch link and the picker from the mockups.
- [ ] Add the web app tests, as the `testing` skill says.
- [ ] Update `src/app/README.md`.

## Milestone 7: Import screens

Tags: ui

Depends on: 1, 4, 5

- [ ] Build the entry, the connect step, the list, the progress, and the
      result from the mockups.
- [ ] Keep the key in memory only, and hide the entry after 20 November
      2026.
- [ ] Add the web app tests, as the `testing` skill says.
- [ ] Update `src/app/README.md`.

## Milestone 8: Imported workspaces in the app

Tags: ui

Depends on: 1, 5

- [ ] Build the Importing state, the read-only session tabs and history
      entries, and the way to continue of decision 4, from the mockups.
- [ ] Add the web app tests, as the `testing` skill says.
- [ ] Update `src/shell/workspace/README.md`.

## Milestone 9: Old chats for the agent

Depends on: 5

This milestone applies only when decision 5 chooses B, C, D, or E.
Otherwise delete it.

- [ ] Give the agent the context of the old chats as decision 5 says.
- [ ] Add the tests, as the `testing` skill says.
- [ ] Update the READMEs of the changed areas.

## Milestone 10: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Smoke-test the import in local development against the real
      Conductor API, with read routes only, after the user agrees.
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

- [ ] Deploy before 13 November 2026 if possible, so that users can still
      push their Conductor work. Deploy before 20 November 2026 at the
      latest.
- [ ] Smoke-test the import on the deployment with a real Conductor key.
- [ ] After 20 November 2026, delete the Conductor client and the import
      screens, which are then dead. Keep the imported workspaces and their
      read-only sessions.
