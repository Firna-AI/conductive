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

### 3. How the chats stay available until the import

Changed on 9 November 2026: decision 4 imports each workspace only when
the user is ready, also after 20 November. So this item now asks how the
chats stay available, and it adds options F and G. The options check of
the same day added H and I.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** The chosen option said that the user signs in with
  Conductor, or pastes an API key. The MCP sign-in has no tool for
  sections, and only the REST API with a personal key returns them. A user
  key belongs to one Conductor org. From 20 November, Conductor deletes the
  cloud data, so every way through the API stops then. Conductor's own
  advice is Transfer to local and Export data, and Export data also works
  only until 20 November. Sync files copies each cloud workspace and its
  `.context` to the user's Mac.
- **Problem:** Options A to E read the chats through the API at the time of
  the import. Decision 4 lets the import wait until the user is ready,
  which can be after 20 November.
- **Impact if no action:** A workspace that the user imports after
  20 November arrives with no chats, and the agent has no transcript to
  start from.
- **Root question:** How do the chats, names, and sections of a Conductor
  workspace stay available until the user imports it?
- **Options:**
  - **A.** The user pastes a Conductor API key. The Worker reads with it
    only for the request that carries it, and does not store it. It works
    only until 20 November. Effort: Medium.
  - **B.** The user signs in with Conductor through the OAuth of its MCP
    server, and pastes a key for the sections. It works only until
    20 November. Effort: Large.
  - **C.** The browser calls the Conductor read routes with the pasted key
    and sends each page to the Worker. Nobody has checked that Conductor
    accepts calls from the browser. It works only until 20 November.
    Effort: Medium.
  - **D.** The Worker stores the key encrypted and imports in the
    background. The app then holds a key that can also write to the user's
    Conductor account. It works only until 20 November. Effort: Large.
  - **E.** The user signs in through OAuth, and the Worker calls the REST
    routes with that sign-in. The REST routes probably refuse the token.
    It works only until 20 November. Effort: Large.
  - **F.** The import reads Conductor's Export data archive. The user must
    download the archive before 20 November. It needs no key. The archive
    format is not documented, so one sample archive must first show the
    chats, names, and sections. Effort: Large.
  - **G.** A one-off save now, for the user's own workspaces. A script in
    this Conductor workspace reads, with the user's key, every transcript,
    also of the archived sessions, and the name, repository, and sections
    of each open Conductor workspace. It writes them as files to
    `.context/conductor-export/` of this workspace, and Sync files copies
    them to the Mac. The import of this workspace skips that folder. It
    must finish before 13 November. Only this user gets it. Effort: Small.
  - **H.** G, but the user runs the script on the Mac, and it saves into a
    plain folder outside the Sync folder. It can run until 20 November,
    and Sync files cannot change or remove the saved files. The Mac needs
    Node or curl, and the key is on the Mac during the run. Effort: Small.
  - **I.** A Save step in Conductive copies the names, sections, and
    transcripts into the app's own storage before 20 November, with a
    pasted key. It creates no workspace, and a later import reads the copy.
    It must ship before 20 November. The app then keeps raw transcripts of
    workspaces that the user may never import. Effort: Large.
- **Left out:** OAuth only through the MCP server, because the user asked
  to select sections, and the MCP server has no tool for them. A command in
  each Conductor workspace that uses its own key, because G reads the same
  data from one place. Transfer to local, because G is better on every
  point: Transfer to local puts the chats into Conductor's own files on the
  Mac, one workspace at a time, and may stop on 13 November. Change
  nothing, because Conductor deletes the chats from 20 November.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Related:** Decision 6 reads the work from the same Mac copies, or from
  the private repository of its option E, which can also hold these files.
- **Recommendation:** G. A small script saves every chat now, so the user
  can import at any time. Copy the saved files out of the Sync folder
  before 20 November, because nobody has checked what Sync files does when
  Conductor deletes the cloud workspaces. Download Export data too, as a
  backup. If G cannot run before 13 November, H can run until 20 November.
  The plan first recommended A.
- **Action:** ask the user, because G reads all of the user's Conductor
  chats with their key, and it replaces the API reads of the chosen option.

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

New on 9 November 2026. The options check of the same day changed its
root question, added options D to G, and changed the recommendation from
A to E.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Sync files copies each Conductor cloud workspace to
  `~/conductor/remote-workspace-sync/<repository>/<workspace ID>/` on the
  user's Mac. Checked on 9 November 2026: the copies hold the files that
  Git sees, `.context`, and Git data that reaches the newest commit. They
  hold no ignored folders, and they total 34 GB. A copy sits on its commit
  with no branch name. The copies stop changing on 13 November, and nobody
  has checked that they stay after 20 November. A Mac command returns at
  most 64 KiB of output. The page of the Mac app has no bridge to its main
  process. The GitHub token of a turn reaches every repository where its
  sender installed the GitHub App.
- **Problem:** The work that GitHub does not hold exists only in the Mac
  copies: commits that are not pushed, changed and untracked files, and
  `.context`. No product path brings that work into a cloud computer in
  bulk.
- **Impact if no action:** Decision 4 cannot bring that work, and it stays
  behind.
- **Root question:** How does the Conductor work that GitHub does not hold
  reach the cloud computer of an imported workspace?
- **Options:**
  - **A.** The Conductive Mac app gets an Import from Conductor screen. Git
    on the Mac finds the difference, and the Mac app sends it at the first
    start through a new device operation of the Worker, in parts of at
    most 1,000,000 bytes. The Mac app has no release yet, no product
    screens, and no bridge to its main process. Effort: Large.
  - **B.** The web app takes a folder upload. The user picks a copy folder
    in the browser, and the browser sends the files that differ from the
    branch on GitHub. Commits that are not on GitHub become uncommitted
    changes. It needs a new path into the cloud computer. Effort: Large.
  - **C.** A command-line tool on the Mac does what A does. It needs a new
    sign-in of its own. Effort: Large.
  - **D.** The agent of the new workspace pulls the work with Mac commands.
    Git on the Mac makes a bundle of the commits that are not on GitHub,
    and tar packs the changed files and `.context`. The agent reads them in
    parts of 64 KiB. It needs no new product code. The Mac app must run and
    be signed in, and a large difference is slow. Effort: Small.
  - **E.** A private GitHub repository holds the work. Before 20 November,
    a script on the Mac turns each copy into a snapshot commit with its
    uncommitted files and `.context`, in a separate folder so that the
    copy does not change. It pushes each snapshot to its own branch of one
    private repository. At the import, the agent's first turn fetches that
    branch through the git credential helper, and restores the commits and
    the uncommitted files. Git moves any size and keeps the commits. GitHub
    then holds `.context`. The GitHub App must be installed on that
    repository. Effort: Medium.
  - **F.** The agent serves an upload page in the cloud computer, and the
    user opens it as a port preview and picks the copy folder there. The
    page sends the files in parts. It needs no product code. Commits that
    are not on GitHub become uncommitted changes. Effort: Medium.
  - **G.** The import screen shows one Terminal command with a one-time
    upload address. Git, tar, and curl on the Mac send a bundle and an
    archive of the difference. It needs a new upload route, a new kind of
    credential, and a new path into the cloud computer. Effort: Large.
- **Left out:** Snapshot branches in the workspaces' own repositories,
  because all eight are public and would publish `.context` and the chats.
  A lasting copy in the app's own storage, because Stop and resume already
  rejected a copy of user code in the app's storage. A push from Conductor
  only, because it leaves `.context` behind, and decision 4 brings it.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Related:** Decision 3. With its option G, the saved chats can go to the
  same private repository.
- **Recommendation:** E. Git moves a difference of any size and keeps the
  commits, and the import then needs no Mac and no new path into the cloud
  computer. After the push, the work no longer depends on the Mac copies.
  If GitHub must not hold `.context`, D is the smallest path. A stays the
  product form for a later release of the Mac app. The plan first
  recommended A.
- **Action:** ask the user, because E puts `.context` in a private GitHub
  repository, and the options trade that against product code and the
  Mac app.

### 7. Where the user reads the old chats

New on 9 November 2026. The options check of the same day changed its
root question, added options D and E, graded B as Large, and changed the
recommendation from B to D.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** Decision 5 gives the agent the transcript as its starting
  point, as files in `.context` of the repository folder. The Files tool
  shows only the files that Git sees, so it does not show `.context`. A
  copy of the old messages into the chat needs a conversion of Conductor's
  raw events, a way to store events that no runner sent, and read-only
  session screens. The runner maps Codex App Server notifications, and
  nobody has checked Conductor's Codex items against that form.
- **Problem:** With files only, the user cannot read the old chats in
  Conductive. The user asked to skip the copy if it is too hard.
- **Impact if no action:** The user reads the old work only through the
  agent, or outside Conductive.
- **Root question:** Where does the user read the old chats of an imported
  workspace after Conductor shuts down?
- **Options:**
  - **A.** Not in Conductive. The agent reads the transcript files, and the
    user asks the agent. Effort: Small.
  - **B.** The import copies the old messages into read-only sessions in
    the session history of the workspace. Effort: Large.
  - **C.** The Files tool also shows the transcript files, so the user can
    open them as Markdown. Effort: Medium.
  - **D.** A, and the save of decision 3 also writes each chat as a
    Markdown file beside its raw pages. The user reads the chats on the Mac,
    or in the private repository of option E of decision 6. The agent reads
    the same files. It needs no product code. Effort: Small.
  - **E.** The imported workspace lists its old chats, and each entry opens
    the Markdown file of that chat in `.context` as a file tab, through the
    file routes that exist. A chat opens only while the cloud computer
    runs, and a file over 5 MiB must be split. Effort: Medium.
- **Left out:** Conductor's own Mac app after Transfer to local, because
  the move can take the workspace out of the Sync copies, and nobody knows
  if that app keeps working after the shutdown.
- **Wider fix:** None.
- **Previous examples:** An archived workspace already shows its chat
  read-only. A session with an unknown starter already keeps its history.
- **Related:** Decision 3 says where the transcripts come from.
- **Recommendation:** D. It gives the user every old chat now, with no
  product code, and B stays possible later, because the save keeps the raw
  pages. If the user wants the chats inside Conductive, E costs less than
  B. The plan first recommended B.
- **Action:** ask the user, because the user made the copy depend on its
  effort, and the options trade product work against reading the chats
  inside Conductive.

## Design

Each call below is an agent call of 8 November 2026, unless it names a
decision.

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
