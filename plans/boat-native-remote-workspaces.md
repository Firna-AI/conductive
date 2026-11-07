# Boat-Native Remote Workspaces

Status: Active. On branch `calummoore/conductor-alternative-architecture`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductor Cloud goes read-only on 13 November 2026 and shuts down on
20 November 2026. This change builds Conducting, a browser-only replacement, at
`conducting.build`. Users
sign in with GitHub and bring their own Boat key: one Boat
sandbox per workspace, chat with coding agents, a
file list and preview, a terminal, port previews, a GitHub banner, one
prepared cloud computer image per org, and agent tools that create
workspaces.
Nothing runs on the user's computer.

The chosen approach is a Boat-native app. A web app and a Cloudflare
Worker use Boat's files, port URLs, desktop stream, saved snapshots,
environments, and webhooks. A small program of ours in each sandbox runs
the agents through the agent SDKs, as decision 36 says. This change does not cover a mobile app or a provider
other than Boat. The brainstorm notes and sources are
in `.context/brainstorm/notes.md`.

Contract owners. Milestone 2 creates them:

- `docs/architecture.md`.
- `docs/protocol/workspaces-and-sandboxes.md`.
- `docs/protocol/access-and-security.md`.
- `docs/protocol/chat-and-events.md`.
- `docs/protocol/github-banner.md`.
- `docs/protocol/agent-tools.md`.
- `docs/protocol/orgs-and-members.md`. Agent call, 5 November 2026:
  decisions 21, 22, 24, 28 to 31, 42, and 44 to 48 need an owner, and no
  other doc covers orgs, sections, members, and Boat keys.
- `README.md`.

## Decisions

The user answered each decision on 5 November 2026, in the brainstorm of
this branch.

### 1. Choose what to build, and on which stack

- **Root question:** What is the fastest way to a browser-only tool with
  one sandbox per workspace that updates at once and can grow into a
  product?
- **Options:**
  - **A.** Boat-native app over Boat's own agents and API. Chat updates
    arrive by polling about once a second. The agents are locked to Boat.
  - **B.** Fork T3 Code and add managed sandboxes.
  - **C.** An own TypeScript stack on Cloudflare with an own daemon in
    each sandbox.
  - **D.** An own Rust and Postgres stack with a Rust daemon.
  - **E.** Added by the options check: run the agent CLIs as detached
    Boat commands and read their live attach stream. It needs no daemon.
    The stream has no stdin, so a running turn cannot be steered.
    Effort: Medium. Decision 7 records it as the fallback.
- **Left out:** an agent loop in the control plane, an extension of
  `futex-ai/terminal`, GitHub Codespaces or Coder, and a hosted product.
- **Recommendation:** C.
- **Chosen:** A, by the user on 5 November 2026. A is the smallest build
  and needs no daemon. The agent recommended C for streamed updates.
- **Changed by decision 36 on 5 November 2026:** a small program of ours
  in each cloud computer runs the agents through the agent SDKs. Boat
  still provides the sandboxes, files, port URLs, desktop stream, saved
  snapshots, environments, and webhooks.

### 2. Choose the sandbox provider

- **Options:** **A.** Boat. **B.** Sprites on Fly.io.
- **Left out:** E2B, Vercel Sandbox, Daytona, and Modal for price, and
  Cloudflare Containers for size limits. The options check gave Daytona
  about 9 times and Modal about 13 times Boat's price.
- **Chosen:** A, by the user on 5 November 2026, as recommended. Boat is
  the cheapest and already has fork, saved snapshots, environments, port
  URLs, desktop streaming, and webhooks.

### 3. Choose a bridge until the new tool works

- **Options:** **A.** The Conductor Mac app. **B.** T3 Code or Paseo on
  one Boat sandbox. **C.** No bridge. **D.** Added by the options check:
  Claude Code on the web or Codex cloud, with Codespaces for a terminal.
- **Chosen:** C, by the user on 5 November 2026. The agent recommended B.
  All effort goes to this build. A gap after 13 November is likely, so the
  milestones put a usable chat first.

### 4. Use a clone per sandbox, not worktrees

- **Options:** **A.** One clone per sandbox. **B.** One worktree per
  workspace in a shared sandbox.
- **Chosen:** A, by the user on 5 November 2026, as recommended. Each
  workspace starts from the base of its repository and makes a branch.
  The options check found that a fork of a running base can copy a
  half-done refresh. Agent call: a new workspace starts from the saved
  snapshot of the last good refresh, as Boat advises.

### 5. Keep the Boat key away from other sandboxes

Agent call, 5 November 2026: option G. The second options check found
that Boat can limit a key to one environment. G costs nothing and Boat
enforces it, so this is no longer a question for the user.

Reopened on 5 November 2026: users now sign in with GitHub and run on
the app's Boat subscription. The app must then keep the sandboxes,
environments, and agent logins of many users apart from each other and
from the owner's other Boat work, such as ciproxy. The options check
found that the app needs no per-user environments or credential
profiles: Boat's platform guide passes each user's credentials as
per-sandbox variables to `noEnv` sandboxes. Recommendation changed from
G to F, for the shared pool of starts and running sandboxes.

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Background:** The Worker holds one scoped Boat key. A key without a
  sandbox or environment limit reaches every sandbox of its account, also
  the ciproxy sandboxes. Only the D1 ownership check keeps the Worker to its own
  sandboxes.
- **Problem:** A bug or a leak of the key exposes every sandbox of the
  account.
- **Impact if no action:** One Worker bug can reach unrelated sandboxes.
- **Root question:** What keeps the app's users apart from each other,
  and from the owner's other Boat work? The options check wrote this
  root question.
- **Options:**
  - **A.** Keep one account key, and rely on the D1 check. Effort: Small.
  - **F.** Give the app its own Boat organization, whose key sees nothing
    else. Set a 365-day key lifetime and a dated rotation. Register the
    Boat webhook by hand, because it needs `account.admin`. A seat costs
    the plan price, and it adds its full included time. Effort: Small.
  - **G.** Added by the second options check: put the app's sandboxes in
    their own Boat environment, and limit the Worker key to it. Boat then
    refuses every other sandbox. Effort: Small.
  - **H.** Added by the options check: as G, and mark the environment
    safe for third parties, so its sandboxes get none of the owner's
    secrets, GitHub access, or agent logins. Each user's credentials go
    to each sandbox as per-sandbox variables. Effort: Small.
- **Left out:** Per-sandbox keys, because minting them needs
  `account.admin` in the Worker.
- **Wider fix:** F. It keeps every resource of the app apart from the
  owner's other Boat work.
- **Recommendation:** F, together with the safe environment of H. The
  first recommendation was F, then G. All users share one pool of starts
  and running sandboxes, and F keeps that pool and its bill apart from
  ciproxy and the owner's other Boat work. H alone costs nothing, but
  shares the pool.
- **Action:** ask the user, because F costs a Boat seat every month.
- **Chosen:** F, by the user on 5 November 2026, with the safe environment of H as
  recommended. The app gets its own Boat organization.
- **Changed by decision 44 on 5 November 2026:** each user brings their own
  Boat key. The app's own Boat organization and its scoped key serve only
  development and tests.

### 6. Show port previews safely in a frame

Added on 5 November 2026 from the options check. The user chose F on
5 November 2026, as recommended.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Background:** Port previews run code that agents write. Cloudflare
  Access cannot sign in inside a frame, so a framed preview behind Access
  stays blank in Safari, Firefox, and iOS.
- **Problem:** The current design guards previews with Access and shows
  them in a frame. That fails in most browsers.
- **Impact if no action:** Embedded previews stay blank.
- **Root question:** How does only the user open a preview of untrusted
  code, inside the app, in every browser?
- **Options:**
  - **A.** Access on the preview domain, as now. Frames stay blank.
    Effort: Small.
  - **C.** No Access on previews. The API gives a short-lived signed
    grant, and the preview host swaps it for a host-only cookie. Previews
    live under the app's domain. Preview code is then same-site with the
    app. Effort: Medium.
  - **D.** C on a separate registrable domain, with `Partitioned`
    cookies. It costs a second domain. Safari before 26.2 shows blank
    frames. Effort: Medium.
  - **E.** Keep Access, and open each preview in its own tab. There is no
    embedded preview. Effort: Small.
  - **F.** Added by the second options check: a random one-level
    hostname for each preview on the domain of D. The hostname is the
    credential, so frames need no cookie. The workspace Durable Object
    revokes it. Browser history can leak it. Effort: Medium.
  - **G.** Added by the second options check: embed Boat's browser-only
    view of Chrome in the sandbox, opened at the port. It is slower, and
    it has no local developer tools. Effort: Small.
- **Left out:** Boat `_token` URLs in the browser, because a token cannot
  rotate without a public gap.
- **Wider fix:** F.
- **Recommendation:** F. The first recommendation was D. F needs no
  cookie in the frame and keeps preview code off the app's site. Safari
  still blocks the previewed app's own cookies in a frame, so each
  preview also gets an "Open in new tab" link.
- **Action:** asked the user, because D and F cost a second domain, and
  E and G give up a full embedded preview.
- **Chosen:** F, by the user on 5 November 2026.

### 7. Choose how chat output reaches the app

Agent call, 5 November 2026: option F. It keeps the chosen approach and
steer. Milestone 7 measures it. If Boat's partial events lag, this
decision opens again with E.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Performance.
- **Background:** Decision 1 chose the Boat-native app. Boat's own agents
  give their events only by polling, about once a second. Boat's detached
  commands give a live output stream.
- **Problem:** Chat updates arrive in steps of about one second.
- **Impact if no action:** Chat feels slower than Conductor.
- **Root question:** How does agent output reach the chat as it happens,
  without a daemon of our own?
- **Options:**
  - **A.** Boat's integrated agents, polled. Steer, interrupt, and
    conversations come from Boat. Effort: Medium.
  - **E.** Run `claude` and `codex` in JSON streaming mode as detached
    Boat commands, and read the attach stream. Each message starts a new
    turn that resumes the session. A running turn cannot be steered, only
    stopped. Effort: Medium.
  - **F.** Added by the second options check: A, but polled every
    250 ms while a turn runs. It helps only if Boat's partial events
    update that often. Boat allows 10,000 requests a minute per address.
    Effort: Small.
- **Left out:** An own daemon, because decision 1 chose no daemon.
- **Wider fix:** None. This is a one-time choice.
- **Recommendation:** F. The first recommendation was A. F keeps steer
  at a small cost.
- **Action:** applied as an agent call, with the measurement in
  Milestone 7.
- **Replaced by decision 36 on 5 November 2026:** the program in each
  cloud computer pushes the agent events to the Durable Object over a
  WebSocket. Nothing polls Boat's events.

### 8. Limit the workspaces that agents create

Added on 5 November 2026 from the options check. The user chose A on
5 November 2026. The agent recommended B.


Changed on 5 November 2026: other users now run on the app's Boat
subscription. Decision 23 sets limits for each user, and those limits
also count the workspaces that agents create.
- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Background:** Agent tools can create workspaces. Each workspace is a
  paid sandbox. Boat's $20 plan allows 100 sandboxes at once and 200
  starts a day. Boat bills extra starts to the wallet. The app shares
  these limits with ciproxy.
- **Problem:** A looping or injected agent can create many sandboxes.
- **Impact if no action:** Cost and start limits can run out in a day.
- **Root question:** How do we stop agents from creating too many
  workspaces?
- **Options:**
  - **A.** No limit of our own. Boat's plan limits apply. Effort: Small.
  - **B.** At most 5 open workspaces created by agents, and 20 a day.
    Effort: Small.
  - **C.** Each workspace that an agent asks for waits for the user's
    approval in the app. Effort: Medium.
  - **D.** Added by the second options check: turn off Boat's automatic
    top-up and invoiced extra starts. An empty wallet then refuses extra
    starts, also for ciproxy and for you. Effort: Small.
- **Left out:** None.
- **Wider fix:** D. It also catches bugs in the Worker.
- **Recommendation:** B. It caps the cost and keeps agents fast.
- **Action:** asked the user, because a limit is new validation.
- **Chosen:** A, by the user on 5 November 2026. The app adds no limit of
  its own, and Boat's plan limits apply.
- **Superseded** on 5 November 2026: the user's answer to decision 23 limits every
  user, and the limits count the workspaces that agents create.

### 9. Keep only saved software in the org image

Added on 5 November 2026 from the mockups of Milestone 1. Rewritten
the same day for org settings: "Install software" now changes the org's
software image, which every base update of the org starts from.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** "Install software" opens a terminal, and the user
  installs tools, then saves or cancels. Boat cannot restore a sandbox in
  place. The only way back is a new sandbox from a saved snapshot.
- **Problem:** The plan does not say what Cancel does, or what happens
  when two install sessions overlap.
- **Impact if no action:** Cancelled or half-done installs reach every new
  base of the org.
- **Root question:** How does each change to the org image land whole or
  not at all?
- **Options:**
  - **A.** Install in the org image itself. Cancel rebuilds it from its
    last saved snapshot. Effort: Medium.
  - **B.** Each install session works on a new sandbox from the newest
    saved image. Save stores it as the new image, and Cancel deletes it.
    One session runs at a time. Effort: Medium.
  - **C.** Added by the options check: as B, and keep the previous image,
    with a "Revert" action after a bad save. Effort: Small.
- **Note from the options check:** install sessions must not get the org
  env vars, because a sandbox from a saved snapshot copies the variables
  of its source.
- **Left out:**
  - Remove Cancel: leaving the screen would then save half-done installs.
  - Installs by script only: decision 13, option B, covers that.
- **Wider fix:** B. Every image change is then one complete step.
- **Related:** Decision 13. This decision applies only if decision 13 keeps
  "Install software".
- **Recommendation:** B. A needs B's new-sandbox step anyway, because Boat
  cannot restore in place.
- **Action:** ask the user, because this adds image behaviour that no
  requirement covers.
- **Closed:** on 5 November 2026, the user's answer to decision 13 made
  "Install software" a script that the user builds, with no terminal. So
  there is no Cancel and no session race. Agent call: a build runs on a
  copy of the image and replaces it only when it succeeds.

### 10. Choose the repositories of an org

Added on 5 November 2026 from the mockups of Milestone 1. Rewritten
the same day for org settings: the org settings have a Repositories
section.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Each workspace starts from the base of its repository,
  and each base costs paid starts to keep fresh. The GitHub App can reach
  repositories on several GitHub accounts.
- **Problem:** The plan does not say which repositories an org uses, or
  when their bases are made.
- **Impact if no action:** On first use there is nothing to choose.
- **Root question:** How does a repository join an org?
- **Options:**
  - **A.** Org settings, Repositories: the user picks from the
    repositories that the GitHub App can reach, and the app prepares a
    base for each one. Effort: Medium.
  - **B.** Every repository that the GitHub App can reach joins the org,
    each with a base. Effort: Medium.
  - **C.** A repository joins when the user first makes a workspace for
    it, and its base is made then. Effort: Medium.
- **Left out:** Seeding repositories in the database by hand, because it
  fails first use.
- **Wider fix:** None, because this is a missing feature.
- **Open point from the options check:** under decision 21, option A,
  two orgs can pick the same repository. Each org then keeps its own base
  of it, and each push updates both bases.
- **Recommendation:** A. The user chooses which repositories cost a base,
  and the first workspace of a repository starts fast. B would multiply
  the paid starts by every repository that the GitHub App can reach.
- **Action:** ask the user, because this adds a GitHub read and a base
  step that no requirement covers.
- **Chosen:** A, by the user on 5 November 2026. A separate Repositories
  tab chooses the repositories, and every chosen repository is bundled
  into the org's one image.

### 11. Stop sandboxes of forgotten tabs

Added on 5 November 2026 from the mockups of Milestone 1.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** A sandbox stops after 30 minutes with no open tab and
  no running turn. An open tab extends the Boat auto-stop deadline.
- **Problem:** A forgotten background tab counts as open, so its sandbox
  never stops. The plan also does not say what a tab shows when its
  sandbox stops.
- **Impact if no action:** Forgotten tabs keep paid sandboxes running for
  days.
- **Root question:** When must an open workspace keep its sandbox
  running, and what does a tab show after a stop?
- **Options:**
  - **A.** Keep the rule, and add the drawn stopped state with Resume.
    Effort: Small.
  - **B.** Count a tab only while it is visible and the user was active
    in the last 30 minutes. Show the drawn stopped state with Resume.
    Effort: Small.
  - **C.** As B, but resume at once when the tab is visible again, with
    no Resume button. Effort: Small.
  - **D.** Added by the options check: each user action through the
    Worker, and each running turn, moves the Boat auto-stop deadline to
    30 minutes later. The app does not track tabs. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. The stop rule lives in one place.
- **Recommendation:** B. It stops forgotten tabs, and Resume avoids a
  paid start that the user did not ask for. D does not see reading or
  watching the desktop.
- **Action:** ask the user, because the option changes when sandboxes
  stop, which the user sees in cost and in the app.
- **Chosen:** B, changed by the user on 5 November 2026: the cloud computer stops
  after 30 minutes without a running agent turn, also while a tab is open
  and active. The tab then shows a button that resumes it. The answer to
  decision 29 widened this: any user activity on the workspace keeps it
  running.

### 12. Update a base by hand

Added on 5 November 2026 from the mockups of Milestone 1. Rewritten
the same day for org settings.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** A push to the default branch or the daily timer updates
  a repository's base. The mockups draw a refresh button on each base,
  and "Try again" on a failed update.
- **Problem:** The plan has no manual update, so after a failure the next
  update can be a day away. A script change also reaches the bases only
  at their next update.
- **Impact if no action:** New workspaces start from an old base.
- **Root question:** How does the user get a fresh base when they need
  one?
- **Options:**
  - **A.** A refresh button on each base, and "Try again" after a
    failure. Effort: Small.
  - **B.** Update every base of the org when the user saves the startup
    script or the software. Effort: Small.
  - **C.** A and B together. Effort: Small.
  - **D.** Added by the options check: rebuild a base from the org image
    only after the image or the script changes. Otherwise start from the
    last good base and fetch, so pushes stay cheap. Effort: Small.
- **Left out:** An automatic retry, because a broken script fails again.
- **Wider fix:** None.
- **Related:** Decisions 9 and 13. Each update is a paid start.
- **Recommendation:** C together with D. A saved change takes effect at
  once, each paid start still follows an action of the user, and pushes
  only fetch.
- **Action:** ask the user, because this adds an update action that no
  requirement covers.
- **Chosen:** A, by the user on 5 November 2026: the user builds the
  image with "Build computer", also after a failure. The image replaces
  the per-repository bases. Agent call: pushes and the daily timer
  refresh the image by fetching new commits only, as in option D.

### 13. Choose what prepares an org's cloud computers

Added on 5 November 2026 from the mockups of Milestone 1. Rewritten
the same day for org settings, after the user asked whether Software and
the setup script do the same thing. The first version chose between one
and two scripts for each repository. Its finding still holds: Boat runs
every repository setup script of an environment in every sandbox, so the
app runs the scripts itself as commands and shows their output.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Org settings, Sandbox, has three parts:
  - Software: tools that the user installs by hand in a terminal, saved
    once for every base of the org.
  - Setup script: runs in each repository's base after each update of
    the default branch, such as `npm ci`.
  - Start script: runs in each workspace's cloud computer at each start
    and resume, such as starting Redis.
- **Problem:** Software and the setup script overlap. Both put things into
  every base. They differ only in how and when: by hand and kept, or as
  code that runs again after each update.
- **Impact if no action:** The user cannot tell where an install belongs,
  and the app builds and explains three mechanisms.
- **Root question:** What does each layer hold, and what rebuilds it? The
  layers are the org's software image, each repository's base, and each
  start. The options check wrote this root question.
- **Boat facts from the options check:** Boat starts each sandbox from
  exactly one snapshot, and it cannot merge two. So org Software reaches
  a repository base only if each refresh starts from the newest software
  snapshot, which then installs every dependency again. A snapshot keeps
  installed packages and enabled system services, and Boat restarts those
  services after each resume and fork.
- **Options:**
  - **A.** Keep the three parts, and rename them so that the difference
    shows: "Installed tools" by hand, an "Update script" after each
    update, and a "Start script" at each start. Effort: Small.
  - **B.** Two scripts and no terminal: a setup script for tools and
    dependencies, and a start script. Every install is code and
    repeatable. It drops "Install software", which the user's first
    message asked for. Effort: Small.
  - **C.** "Install software" and one startup script. Each base update
    starts from the org's newest software image, clones or fetches the
    repository, and runs the script with a variable that says so, so the
    saved base has warm dependencies. The script also runs at each start.
    It must be safe to run twice. Effort: Small.
  - **D.** "Install software" and one startup script that runs only at
    each start. Dependencies install at each start, so starts and resumes
    get slower. Effort: Small.
  - **E.** Added by the options check: "Install software" and one setup
    script that runs once, when a workspace is created, as in Conductor.
    Workspaces start from the org image and clone their repository, so
    there are no repository bases. Creates wait for the dependency
    install, and resumes stay fast. Effort: Small.
  - **F.** Added by the orchestrator: one org image holds the software
    and a prepared copy of each repository of the org, with its
    dependencies. The app refreshes the image after pushes, and
    workspaces start from it. "Install software" changes the same image.
    Effort: Medium.
  - **G.** Added by the options check: as F, but dependency folders stay
    out of the image, and the setup script runs at each create. Effort:
    Medium.
- **Left out:** System services in place of a start script, because the
  user asked for a startup script.
- **Wider fix:** None.
- **Related:** Decision 9 applies only to options that keep "Install
  software". Decision 12 updates the bases. Decision 17 gives the env
  vars at each start, and base runs get none.
- **Recommendation:** C. It keeps the user's first model, a snapshot plus
  a startup script, removes the overlap, and keeps starts fast. The
  options check agreed after it weighed E, F, and G:
  - E clones each repository at create, so it fails the user's first
    requirement of a small fetch for new workspaces.
  - F and G put every repository of the org into every workspace. They
    must refresh one at a time, and one broken script blocks every
    repository.
- **Action:** ask the user, because the options change what the user
  configures, and B drops a feature that the user asked for.
- **Chosen:** F, adapted by the user on 5 November 2026, from
  Conductor's cloud computer settings. One image per org bundles every
  chosen repository. "Install software" is a script, not a terminal, and
  the user builds the image when the script changes. The startup script
  and the env vars stay. The agent recommended C.

### 14. Accept messages before the sandbox is ready

Added on 5 November 2026 from the mockups of Milestone 1.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The mockups accept messages while a sandbox starts, and
  such a message shows "Sends when the sandbox is ready". On 5 November
  2026 the user made new workspace an empty chat whose first message
  creates the workspace, so that first message always arrives before the
  sandbox is ready.
- **Problem:** The plan does not say whether the app accepts a message
  before the sandbox is ready.
- **Impact if no action:** Milestone 7 can refuse these messages, and
  the drawn create flow then fails.
- **Root question:** Can the user give the agent work before the
  sandbox is ready?
- **Options:**
  - **A.** Queue messages in the workspace Durable Object, and send them
    when the sandbox is ready. Effort: Small.
  - **C.** Added by the options check: as A, and a message sent in a
    stopped workspace resumes it. Effort: Small.
- **Left out:**
  - B, disable the composer until the sandbox is ready: it breaks the
    user's requirement that the first message creates the workspace.
  - A queue in the browser, because a closed tab loses the message.
- **Wider fix:** None.
- **Recommendation:** A. The user writes the task once, and the agent
  starts at the earliest moment. C removes the drawn Resume bar, which
  decision 11 keeps.
- **Action:** ask the user, because the option adds a message queue that
  no requirement covers.
- **Chosen:** A, by the user on 5 November 2026.

### 15. Make the web app work on phones

Added on 5 November 2026 from the mockups of Milestone 1.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Every mockup has a mobile and a desktop layout. A phone
  shows the workspace list, then a workspace with tabs for Chat, Files,
  Terminal, Preview, and Desktop. On 5 November 2026 the user asked for
  touch targets of at least 44 px on phones.
- **Problem:** The plan excludes a mobile app, but it does not say
  whether the web app must work on a phone.
- **Impact if no action:** The UI milestones can build desktop only, and
  their mockup comparisons then fail on mobile.
- **Root question:** On which screen sizes must the web app work?
- **Options:**
  - **A.** The web app is responsive and follows both mockup layouts.
    Effort: Medium.
  - **B.** Build desktop only now, and keep the mobile mockups for a
    later change. The mobile mockups then differ from the app. Effort:
    Small.
  - **C.** Added by the options check: a phone layout for the list, the
    chat, steer, and the banner. The four tools stay desktop-only for now.
    Their mobile mockups then need a new state. Effort: Medium.
- **Left out:** A native app, because the plan excludes it.
- **Wider fix:** None.
- **Recommendation:** A. A user who replaces Conductor Cloud often checks
  a running agent from a phone. The options check recommended C for less
  work. A keeps the finished mockups aligned with the app, and its tool
  screens reuse the desktop components.
- **Action:** ask the user, because the option widens five milestones.
- **Chosen:** A, by the user on 5 November 2026. The web app is responsive.

### 16. Remove finished workspaces from the list

Added on 5 November 2026 from the mockups of Milestone 1.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The plan creates, stops, and resumes workspaces. The
  banner shows when a pull request merges.
- **Problem:** No step removes a workspace. Merged and abandoned
  workspaces stay in the list, and their stopped sandboxes stay in Boat.
- **Impact if no action:** The list grows without end.
- **Root question:** What ends a workspace, by the user or by Boat, and
  what stays? The options check wrote this root question, because Boat
  can delete the disk of a sandbox that is stopped for over 14 days.
  A resume then fails.
- **Options:**
  - **A.** Delete the sandbox, the history, and the list entry. Effort:
    Small.
  - **B.** Archive: delete the sandbox, and keep the history read-only in
    an "Archived" group. Effort: Small.
  - **C.** As B, and offer Archive in the banner after the merge.
    Effort: Small.
  - **D.** Added by the options check: as C, and before the delete, check
    for work that is not committed or not pushed. Mark workspaces near
    day 14 as expiring. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Recommendation:** D. The first recommendation was C. A, B, and C can
  delete work that was never pushed.
- **Action:** ask the user, because the option adds a workspace action
  that no requirement covers.
- **Chosen:** D, by the user on 5 November 2026.

### 17. Store the env vars of each org

Added on 5 November 2026 from the options check of the mockup
decisions. Rewritten the same day for org settings.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Security.
- **Background:** The org settings hold env vars, with write-only values.
  Boat applies a saved environment change to a sandbox only after an
  upgrade call. Boat can also attach variables to one sandbox at create,
  at fork, and at each resume.
- **Problem:** Every workspace sandbox is now safe for third parties
  (`noEnv`), so env vars cannot come from a shared Boat environment. The
  app must give each sandbox its org's values itself.
- **Impact if no action:** The secrets of one org reach the sandboxes of
  all orgs.
- **Root question:** Where do the env vars of each org live, and when
  does a sandbox get them?
- **Options:**
  - **B.** The app stores the values, encrypted, and writes them as an env
    file into the sandbox before the startup script runs. Effort: Medium.
  - **D.** The app stores the values, encrypted, and passes them to Boat
    as per-sandbox variables at create and at each resume. The bases never
    get them. Effort: Medium.
- **Left out:**
  - A, one Boat environment for each org: under decision 21, option A, it
    breaks the one shared key, because each new org needs a new key from
    the Boat dashboard.
  - One shared list for all orgs, because each org has its own settings.
  - Secrets in a saved snapshot, because a snapshot keeps every file.
- **Open point:** a base update runs the startup script without the env
  vars. A private registry token needs a way to reach that one command.
- **Wider fix:** None.
- **Related:** Decision 21.
- **Recommendation:** D. Each org's secrets stay in its own sandboxes, a
  change applies at the next start, and a new org needs no new key. D
  also keeps the values off install sessions.
- **Action:** ask the user, because this decides who stores the secrets.
- **Chosen:** D, by the user on 5 November 2026.

### 18. Choose the banner states

Added on 5 November 2026 from the mockups of Milestone 1.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The mockups draw five banner states: no pull request,
  checks running, checks failed, ready to merge, and merged. The banner
  only links to GitHub.
- **Problem:** Merge conflicts, changes requested, and draft are not
  drawn. A branch without commits still offers "Create pull request".
- **Impact if no action:** Milestone 14 must guess the states.
- **Root question:** Which GitHub states must the banner show, and what
  may it offer?
- **Options:**
  - **A.** Keep the five drawn states and the links. Effort: Small.
  - **B.** As A, plus conflict, changes requested, draft, and closed
    without merge. Show the create link only when the branch has commits.
    The options check added the closed state. Effort: Small.
  - **C.** As B, plus merge and "ask the agent to fix the checks" in the
    app. Effort: Medium.
  - **D.** Added by the options check: as B, plus buttons that send fixed
    prompts to the agent: fix the checks, resolve the conflict, and
    address the review. The agent has the user's GitHub access. Effort:
    Small.
- **Left out:** None.
- **Wider fix:** None.
- **Recommendation:** B. It shows each state that blocks a merge, without
  GitHub write access.
- **Action:** ask the user, because the option adds banner states that no
  requirement covers.
- **Chosen:** B, by the user on 5 November 2026.

### 19. Choose the chats of a workspace

Added on 5 November 2026 from the mockups of Milestone 1. The user
answered it the same day in their composer feedback: the composer chooses
the agent, Codex or Claude only for now, and the effort level, and it
uploads files. This chooses option C, with an effort level and
attachments.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The mockups give each workspace one chat. The user picks
  its agent, Claude Code or Codex, in the new workspace form.
- **Problem:** The design names Boat conversations, but no screen lists
  or switches them, and the plan does not say whether the agent can
  change.
- **Impact if no action:** Milestone 8 chooses the chat model without a
  spec.
- **Root question:** How does the user change the agent, or start fresh
  or parallel work, in one workspace? The options check wrote this root
  question.
- **Options:**
  - **A.** One chat with one agent, chosen at create. Effort: Small.
  - **B.** Several chats as tabs in one workspace, each with its own
    agent. Effort: Medium.
  - **C.** Added by the options check: one chat, with an agent and model
    picker for each message. Boat can change both inside one
    conversation. Effort: Small.
  - **D.** Added by the options check: as C, plus a "New chat" action
    that keeps older chats read-only. Effort: Small.
- **Left out:** A chat shared across workspaces, because it breaks one
  sandbox and one branch per task.
- **Wider fix:** None.
- **Recommendation:** C. The first recommendation was A. Boat supports C
  directly, and the user can switch agent when one reaches its usage
  limit.
- **Action:** asked the user, because the options trade simplicity against
  parallel agents.
- **Chosen:** C, by the user on 5 November 2026, with an effort level and
  file uploads. Only Codex and Claude are offered for now. Later the same
  day the user added B: several agent sessions per workspace, on the same
  branch and cloud computer, shown as closable tabs, as in Conductor. So
  the answer is B and C together.

### 20. Show the steps while a sandbox starts

Added on 5 November 2026 from the restyle of Milestone 1a. The user
chose A on 5 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The restyled mockups `app/new-workspace/creating` and
  `app/shell/starting` show a starting card: a title, the start steps,
  and the time since the start. The steps are, for example, "Starting
  from the newest base" and "Creating branch cal/saved-carts". A resume
  shows "Resuming with your files as you left them".
- **Problem:** The plan says only that the app shows a starting state. No
  requirement says that the Worker reports steps or times.
- **Impact if no action:** Milestones 5 and 6 can build a plain spinner,
  and the app then differs from the mockups.
- **Root question:** What does the user see until each part of the
  workspace works? The options check wrote this root question. At Boat's
  `ready` state, prompts work, but services such as the `ttyd` terminal
  start only after Boat restores the system files.
- **Options:**
  - **A.** Keep the drawn card. The workspace Durable Object records each
    start step with its time, and pushes it to the open tabs. Effort:
    Small.
  - **B.** Show the card and the elapsed time, without steps. Effort:
    Small.
  - **C.** Show only the card title and a loader. Effort: Small.
  - **D.** Added by the options check: as A, plus steps from Boat's start
    states: "Getting a machine" while no machine is ready yet, and
    "Applying your settings" while Boat applies the environment. Effort:
    Small.
  - **E.** Added by the options check: the card ends when the chat works.
    The terminal and the preview each show their own wait until they
    answer. Effort: Small.
- **Left out:** Boat's raw start output, because users read product
  steps, not provider output. A failed start still shows the start script
  output, as the failed base update does.
- **Wider fix:** None. This is a choice for one screen.
- **Recommendation:** D, together with E for the tools. The first
  recommendation was A. Only Boat's state shows a wait for a machine,
  and each tool then waits only as long as it needs.
- **Action:** asked the user, because option A adds behaviour at the
  boundary that no requirement covers.
- **Chosen:** A, by the user on 5 November 2026. The agent recommended D
  with E. The workspace Durable Object records each start step with its
  time, and pushes it to the open tabs.

### 21. Decide what an org owns

Added on 5 November 2026 from the user's design feedback.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** On 5 November 2026 the user asked for orgs. The icon
  rail lists the orgs, and the user can create more. Each org has its own
  settings, and repositories have no settings for now. The sidebar shows
  the org name with a Settings link. Later that day the user decided that
  users sign in with GitHub and run on the app's Boat subscription, not
  their own.
- **Problem:** The plan has no org model. It does not say what an org
  owns: its Boat account or key, its GitHub connection, its agent logins,
  its sandbox software, its scripts and env vars, or its members.
- **Impact if no action:** Milestones 4 and 5 cannot design the D1 schema
  or the Boat and GitHub calls.
- **Root question:** What must stay apart between two orgs of one user?
  The options check wrote this root question. The Boat and GitHub setup
  follows from the answer.
- **Options:**
  - **A.** A light grouping. All orgs use the app's Boat account and
    GitHub App. A user's agent logins serve all of that user's orgs. Each
    org owns its workspaces, its sections, its repositories, and its
    cloud computer settings: the install script, the startup script, and
    the env vars. Effort: Medium.
  - **C.** Orgs mirror GitHub. Each org comes from one GitHub App
    installation, and its repositories come from it. The rest is as A.
    Effort: Medium.
- **Boat facts from the options check:** Boat bills one wallet for each
  personal account or Boat organization, and keys have no wallet. So
  separate billing needs one Boat organization for each org, at one plan
  seat each. One Claude or ChatGPT sign-in can be in only one credential
  profile, so separate agent logins need a second subscription. Only the
  Boat dashboard or an `account.admin` key can create keys.
- **Left out:**
  - B, a full tenant with its own Boat key: users run on the app's Boat
    subscription, as the user decided on 5 November 2026.
  - D, one Boat environment and agent logins for each org: credential
    profiles need `account.admin`, Boat's API cannot add a subscription
    sign-in, and per-sandbox variables already give each org its own
    values.
  - Members and shared orgs were left out first. The user's answer to
    decision 24 added them later on 5 November 2026: a workspace can be
    reassigned to another user.
- **Wider fix:** None.
- **Related:** Decisions 5, 9, 10, 12, 13, and 17 depend on the answer.
- **Later requirement:** on 5 November 2026 the user asked that the
  sandbox provider stays hidden from the user. B would ask for a Boat key
  in each org, so it conflicts with that requirement.
- **Recommendation:** A. The first recommendation was B, which is now
  left out. C lets the user create an org only by installing the GitHub
  App on another account.
- **Effect on other decisions:** decisions 9, 10, 12, and 13 are
  answered. Under A, decision 5 keeps F, and decision 17 keeps D, stored
  for each org.
- **Action:** ask the user, because the options trade setup steps against
  isolation, and no requirement covers orgs yet.
- **Chosen:** A, by the user on 5 November 2026.

### 22. Choose who can sign in

Added on 5 November 2026 from the user's sign-in and billing
decision.

- **Severity:** High. **Effort:** Small.
- **Source:** Design. **Category:** Security.
- **Background:** Users sign in with GitHub and run on the app's Boat
  subscription, so every cloud computer costs the owner money. The
  marketing site offers "Request access" and "Sign in".
- **Problem:** The plan does not say which GitHub users may sign in.
- **Impact if no action:** Anyone with a GitHub account could run paid
  cloud computers on the owner's account.
- **Root question:** Which GitHub users may use the app?
- **Options:**
  - **A.** Invite only. The owner keeps a list of allowed GitHub logins.
    Anyone else sees a page that offers "Request access". Effort: Small.
  - **B.** A waitlist. Anyone signs in and joins it, and the owner
    approves users on an admin page. Effort: Medium.
  - **C.** Open sign-up, with the limits of decision 23. Effort: Medium.
  - **D.** Open sign-up with paid plans that cover the compute. Effort:
    Large.
  - **E.** Added by the options check: allow the members of chosen GitHub
    organizations, checked at each sign-in. Effort: Small.
- **Left out:** Other sign-in methods, because the user chose GitHub only.
- **Note from the options check:** GitHub App user authorization works as
  the sign-in. A user token reaches only what both the user and the app
  can reach, so a user must also install the GitHub App on the account
  that owns their repositories. Onboarding then has an install step.
- **Wider fix:** None.
- **Related:** Decision 23 sets what each user may spend.
- **Recommendation:** A. The owner controls the cost while the product is
  young, and B can follow when more people ask.
- **Action:** ask the user, because this sets who can spend the owner's
  money.
- **Chosen:** C, by the user on 5 November 2026: open sign-up with GitHub, with the
  limits and plans of decision 23. The agent recommended A.

### 23. Limit what each user can spend

Added on 5 November 2026 from the user's sign-in and billing
decision.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design. **Category:** Security.
- **Background:** Each running cloud computer costs money every second on
  the app's Boat account. The $20 Boat plan allows 100 at once and 200
  starts a day for the whole account. Decision 8 set no limit on the
  workspaces that agents create.
- **Problem:** Nothing stops one user from running many cloud computers,
  or from using up the account's daily starts.
- **Impact if no action:** One user can run up the bill, or block the
  starts of every other user.
- **Root question:** How much may each user spend, and what happens at the
  limit?
- **Options:**
  - **A.** No limits, because only allowed users sign in. Effort: Small.
  - **B.** The same limits for every user, such as 3 running cloud
    computers, 100 hours a month, and 20 starts a day. At a limit, a new
    start waits, and the app says why. The options check added the start
    limit, because starts are the scarcest shared resource. Effort:
    Medium.
  - **C.** As B, but the owner sets each user's limits on an admin page.
    Effort: Medium.
- **Left out:** Paid plans, which decision 22, option D, covers.
- **Wider fix:** also turn off Boat's automatic top-up, so spending stops
  at the plan and the wallet. This also catches Worker bugs.
- **Related:** Decisions 8 and 22. The limits also count workspaces that
  agents create, so B overrides the answer to decision 8.
- **Boat facts from the options check:** Boat has no dollar limit for a
  sandbox, a key, or an account, so the app must enforce every limit.
  Boat reports the cost of each sandbox.
- **Recommendation:** B. It caps the worst case at a known cost, and C can
  follow.
- **Action:** ask the user, because a limit is new validation, and B
  changes the user's answer to decision 8.
- **Chosen:** B, by the user on 5 November 2026, as part of a billing model:
  - A free account gets at most 3 workspaces and a number of compute
    minutes. Decision 25 sets the numbers.
  - To get more, the user upgrades to a paid plan at $30 per user per
    month. The plan includes compute worth $15 at Boat's prices, so the
    app keeps half of the price when a user uses all of it.
  - Use above the included amount is charged at Boat's prices plus 10%.
  - The app needs billing. Decisions 26 and 27 decide how.
- **Superseded by decision 45 on 5 November 2026:** the product is free,
  without billing or plan limits.

### 24. Connect each user's agents

Added on 5 November 2026 from the user's sign-in and billing
decision.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design. **Category:** Security.
- **Background:** Agents run on each user's own Claude and ChatGPT
  subscriptions or API keys. Boat keeps agent logins in credential
  profiles, and one sign-in can be in only one profile. The app must not
  show Boat to the user.
- **Problem:** The plan does not say how a user connects Claude and Codex,
  or where the credentials live.
- **Impact if no action:** Other users cannot run agents.
- **Root question:** How does each user connect their agents, and where do
  the credentials live?
- **Options:**
  - **A.** API keys only. The user pastes Anthropic and OpenAI API keys in
    their account settings. The app stores them encrypted, and passes
    them to each of the user's cloud computers. Effort: Small.
  - **C.** The app pays for model use through Boat's AI proxy, with limits
    for each user. Effort: Medium.
  - **D.** Added by the options check: the user pastes a Claude
    subscription token, made with `claude setup-token`, or API keys. The
    app stores them encrypted, and passes them as
    `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY` at
    create and at each resume. Codex needs an OpenAI API key, because Boat
    documents no variable for a ChatGPT subscription. Effort: Small.
- **Left out:**
  - B, a subscription sign-in through Boat's API: Boat's API cannot start
    a provider sign-in for an end user, and its key call refuses sign-ins
    with `400 not_an_api_key`.
  - Signing in inside a cloud computer: the login stays on that
    workspace's disk, so every new workspace needs a new sign-in.
- **Wider fix:** None.
- **Related:** Decisions 5 and 21.
- **Recommendation:** D. The first recommendation was B, which Boat
  cannot do. D adds Claude subscriptions to A, and Boat stays hidden.
- **Action:** ask the user, because it decides who pays for model use
  and where secrets live.
- **Chosen by the user on 5 November 2026:** each workspace belongs to the user who
  created it, until it is reassigned, and its agents use that user's own
  account. This rules out C. Agent call: D, as recommended, because it
  lets a user's Claude subscription serve as their account.
- **Confirmed on 5 November 2026:** the user has Anthropic's permission
  for `claude setup-token` tokens. Decision 37 records the rule.
- **Changed by decision 49 on 6 November 2026:** each turn runs on the
  agent login of the person who sent the message. The workspace owner is
  the person who is responsible for the workspace.

### 25. Set what the free plan includes

Added on 5 November 2026 from the user's answer to decision 23.

- **Severity:** High. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** The user decided that a free account gets at most 3
  workspaces and "x minutes" of compute, then upgrades. A default machine
  costs the app $0.036 an hour, so 600 free minutes cost about $0.36 for
  each user each month.
- **Problem:** The number of minutes is not set. "3 workspaces" can mean
  3 that exist or 3 that run at once.
- **Impact if no action:** Milestone 15a cannot enforce the limits, and
  the pricing section cannot state them.
- **Root question:** What exactly does a free account get each month?
- **Options:**
  - **A.** 3 workspaces that exist at once, not counting archived ones,
    and 300 minutes a month. Effort: Small.
  - **B.** 3 workspaces that exist at once, and 600 minutes a month.
    Effort: Small.
  - **C.** 3 workspaces that run at once, any number that exist, and 600
    minutes a month. Effort: Small.
  - **D.** Added by the options check: as B, plus one org for each free
    account, no automatic image refresh, and image builds counted in the
    free minutes. Effort: Small.
- **Note from the options check:** the cost of a free account is set
  mostly by its org's saved snapshot and its starts, not its minutes.
  The Boat plan includes 10 saved snapshots per $20 seat, and each extra
  one costs $0.056 a day, about $1.70 a month. Starts come from one pool
  that every user shares.
- **Left out:** None.
- **Wider fix:** None.
- **Related:** Decisions 23 and 28.
- **Recommendation:** D. The first recommendation was B. D caps the
  saved snapshots and starts of a free account, which cost more than its
  minutes.
- **Action:** ask the user, because only the user can set the price of
  the free plan.
- **Chosen:** D, by the user on 5 November 2026. A free account gets one
  org, with at most 3 workspaces that exist, and 600 minutes a month. Its
  org image refreshes only when the user builds it, and builds count
  against the minutes.
- **Correction on 5 November 2026:** an earlier record of the choice said
  "not counting archived ones". Only option A said that. Decision 41 asks
  the user whether archived workspaces count.
- **Superseded by decision 45 on 5 November 2026:** the product is free,
  without billing or plan limits.

### 26. Choose the billing provider

Added on 5 November 2026 from the user's answer to decision 23.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** The app charges $30 per user per month with included
  compute, and charges overage by use. Payments from many countries bring
  sales tax and VAT duties.
- **Problem:** The plan has no billing provider.
- **Impact if no action:** Milestone 15b cannot start.
- **Root question:** Which provider can bill a subscription with included
  usage and metered overage, and who carries the tax? The options check
  wrote this root question.
- **Options:**
  - **A.** Stripe Billing with metered prices and Stripe Tax. The owner
    is the seller, and registers for and files the taxes. Effort: Medium.
  - **B.** A merchant of record, such as Paddle or Polar. It is the
    seller, and it handles the tax for a higher fee. Effort: Medium.
  - **C.** Added by the options check: Stripe Managed Payments. Stripe is
    the seller, for 3.5% on top of its normal fees, and only through
    Stripe Checkout or Payment Links. Its docs do not say whether metered
    prices work. Effort: Medium.
- **Fees from the options check:** Stripe Billing with Stripe Tax costs
  2.9% + 30¢ for US cards, plus 0.7% for Billing and 0.5% for Tax, and the
  owner files the taxes. Paddle costs 5% + 50¢. Polar costs 5% + 50¢, or
  3.8% + 40¢ at $20 a month, plus 1.5% for cards from outside the US.
- **Left out:** Billing written by hand, because it repeats what the
  providers already do.
- **Wider fix:** None.
- **Related:** Decision 27.
- **Recommendation:** B, with Polar. It is the seller and handles the
  tax, and its usage meters and meter credits match the included $15
  and the overage. Polar calls its usage billing a new feature. Choose A
  if lower fees matter more than the tax work.
- **Action:** ask the user, because it is a business choice of fees
  against tax work.
- **Chosen:** A, by the user on 5 November 2026: Stripe Billing with Stripe Tax. The
  owner registers for and files the taxes. The agent recommended B.
- **Superseded by decision 45 on 5 November 2026:** the product is free,
  without billing or plan limits.

### 27. Decide who pays for an org's workspaces

Added on 5 November 2026 from the user's answers to decisions 23
and 24.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** The plan costs $30 per user. Each workspace belongs to
  the user who created it, and its agents use that user's account. Orgs
  now have members.
- **Problem:** The plan does not say whether each member pays for their
  own plan and use, or whether the org pays for its members.
- **Impact if no action:** The billing model and the members page cannot
  be designed.
- **Root question:** Who pays for each cost of an org: the members'
  plans, their workspaces, and the org's shared image? The options check
  wrote this root question, because builds, refreshes, and the saved
  image belong to no workspace.
- **Options:**
  - **A.** Each user pays for their own plan, and each workspace's
    compute bills its owner. Effort: Medium.
  - **B.** The org pays for a seat for each member and for all their
    compute. Effort: Medium.
  - **C.** A first, and B later for teams that ask for it. Effort: Medium.
  - **D.** Added by the options check: as C, and the org owner pays for
    the org's image: its builds, its refreshes, and its saved snapshot.
    Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Related:** Decisions 23, 24, and 26.
- **Recommendation:** D. The first recommendation was C, under which
  nobody pays the shared costs. Boat's usage report splits a running
  stretch at a time boundary, so a reassigned workspace bills each owner
  for their own part.
- **Action:** ask the user, because it is a pricing choice.
- **Chosen:** B, by the user on 5 November 2026: the org pays a seat for each member
  and all of the org's compute, including its image. The agent
  recommended D.
- **Superseded by decision 45 on 5 November 2026:** the product is free,
  without billing or plan limits.

### 28. Prevent abuse of free accounts

Added on 5 November 2026 from the user's answer to decision 22.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Security.
- **Background:** Anyone with a GitHub account can sign up and run free
  cloud computers on the app's Boat organization. Boat's terms make the
  platform responsible for what its users do. Boat cannot block outbound
  traffic from a sandbox.
- **Problem:** A throwaway GitHub account can run spam, scans, or mining
  from the app's machines.
- **Impact if no action:** Boat can suspend the app's organization, which
  stops every user.
- **Root question:** How does the app keep every user within Boat's
  rules? The options check wrote this root question, because Boat's terms
  require the platform to pass on and enforce Boat's rules for all
  users.
- **Options:**
  - **A.** Rely on the free limits only. Effort: Small.
  - **B.** Also require a GitHub account older than 30 days with a
    verified email. Effort: Small.
  - **C.** Also require a payment card for the free plan. Effort: Medium.
  - **D.** Added by the options check: as B, plus terms at sign-up that
    pass on Boat's rules, an owner action that suspends a user and stops
    their machines, and an address for abuse reports. Effort: Small.
- **Note from the options check:** GitHub's `GET /user` gives the account
  age, and `GET /user/emails` gives the verified state, with the "Email
  addresses" read permission of the GitHub App. Users have root in their
  machines, so firewall rules inside a machine do not hold.
- **Left out:** None.
- **Wider fix:** D.
- **Related:** Decisions 22 and 25.
- **Recommendation:** D. The first recommendation was B. Boat's terms
  require the terms, the enforcement, and answers to abuse notices.
- **Action:** ask the user, because B and C add sign-up rules.
- **Chosen:** B, by the user on 5 November 2026: sign-up requires a GitHub account
  older than 30 days with a verified email. The agent recommended D.
- **Follow-up:** the options check found that Boat's terms require a
  platform to pass on Boat's rules to its users, enforce them, and answer
  abuse notices. The user asked on 5 November 2026 to add option D after
  the first release, in
  `plans/follow-ups/user-terms-suspension-and-abuse-reports.md`.
- **Questioned on 5 November 2026:** decision 48 asks whether this check
  stays, now that each user brings their own Boat key.
- **Superseded by decision 48 on 5 November 2026:** the sign-up check is
  dropped.

### 29. Count terminal and preview use as activity

Added on 5 November 2026 from the user's answer to decision 11.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** The user decided that a cloud computer stops after 30
  minutes without a running agent turn, also while a tab is open. A stop
  ends every process, such as a dev server behind a port preview.
- **Problem:** A user who works in the terminal, or tests a preview, for
  30 minutes without an agent message loses their machine mid-task.
- **Impact if no action:** Manual work and previews stop without warning.
- **Root question:** Which use keeps a cloud computer running?
- **Options:**
  - **A.** Only running agent turns, as decided. Effort: Small.
  - **B.** Also typing in the terminal and requests to a port preview.
    Effort: Small.
  - **C.** As A, plus a warning 2 minutes before the stop, with "Keep
    running". Effort: Small.
  - **D.** Added by the options check: as A, plus a "Keep running" switch
    that holds the machine for up to 4 hours, paid from the user's
    minutes. Effort: Small.
- **Note from the options check:** under B, the app counts requests and
  keystrokes, not open connections. Otherwise the live-reload connection
  of a dev server keeps the machine running forever.
- **Left out:** None.
- **Wider fix:** None.
- **Related:** Decision 11.
- **Recommendation:** B. It keeps the machine for real work, an open tab
  alone still stops, and users now pay for their own time.
- **Action:** ask the user, because B changes the rule that the user
  chose.
- **Chosen by the user on 5 November 2026:** any user activity on a workspace keeps
  its cloud computer running. Agent call: activity is input in the
  workspace's tabs, such as typing, clicks, and scrolling, terminal
  input, and requests to a port preview. An open tab alone, or an open
  connection such as live reload, does not count.

### 30. Decide what Delete org removes

Added on 5 November 2026 from the mockups of Milestone 1b.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The General tab of the org settings has Delete org. The
  mockup says that it deletes the org with its workspaces and its cloud
  computer. Decision 16 checks a single workspace for unpushed work
  before it deletes it.
- **Problem:** No requirement says what Delete org removes, or whether it
  protects work that was never pushed.
- **Impact if no action:** The app can lose unpushed work in one click.
- **Root question:** How does the user remove an org without losing work
  by accident?
- **Options:**
  - **A.** Delete the org, its workspaces, their cloud computers, and its
    image, after the unpushed-work check of decision 16 for each
    workspace and a confirm that names the org. Effort: Small.
  - **B.** Allow Delete org only when the org has no workspaces left.
    Effort: Small.
  - **C.** Archive the org: hide it, stop its cloud computers, and keep
    its history. Effort: Medium.
  - **D.** Added by the options check: Delete stops every machine at
    once and hides the org. The app deletes everything after 7 days,
    unless the owner restores the org, so members can push their work.
    Effort: Small.
- **Left out:** A delete with no check, because it fails the goal.
- **Note from the options check:** every delete must also remove the
  saved snapshots, which keep costing money, and read the final usage of
  each sandbox first. An owner can delete a member's unpushed work under
  A.
- **Wider fix:** None. Decision 16 holds the shared check.
- **Related:** Decision 16, option D.
- **Recommendation:** D. The first recommendation was A. D protects the
  work of every member, and a stopped machine costs no machine time.
- **Action:** ask the user, because Delete org adds a delete that no
  requirement covers.
- **Chosen:** D, by the user on 5 November 2026.

### 31. Decide what closing a session tab does

Added on 5 November 2026 from the mockups of Milestone 1b.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The user asked that every centre tab can close. A
  workspace can hold several agent sessions as tabs.
- **Problem:** No requirement says what happens to a session when its
  tab closes, especially while its turn runs.
- **Impact if no action:** Milestone 8 can delete history, or leave an
  agent running out of sight and spending money.
- **Root question:** What happens to an agent session when the user
  closes its tab?
- **Options:**
  - **A.** Closing only hides the tab, and a running turn keeps running.
    Effort: Small.
  - **B.** Closing ends the session after a confirm, and deletes its
    history. Effort: Small.
  - **C.** Closing stops a running turn after a confirm. The session
    stays in a list under "+", where it reopens and continues. Effort:
    Small.
  - **D.** Added by the options check: when the user closes a running
    session, the app asks whether to stop the turn or let it finish in
    the background. In both cases the session stays under "+". Effort:
    Small.
- **Left out:** Disabling close while a turn runs, because the user asked
  that every tab can close.
- **Note from the options check:** Boat has no call that deletes a
  conversation, so B could delete only the app's copy. Boat's interrupt
  stops the turn of one conversation and keeps its files, and a later
  prompt resumes it with its memory.
- **Wider fix:** None.
- **Related:** Decision 19.
- **Recommendation:** C. Nothing is lost, and no agent runs where the
  user cannot see it.
- **Action:** ask the user, because the options trade cost against
  history.
- **Chosen:** C, by the user on 5 November 2026, with a history list. When no turn
  runs, closing a session tab moves the session into a history list
  under a history icon in the tab bar, as in Conductor. Each entry shows
  the agent, the title, and the time, and reopens the session. When a
  turn runs, closing asks first, then stops the turn.

### 32. Name the product

Added on 5 November 2026 from the marketing mockups.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** UX wording.
- **Background:** The mockups use the working name "Remote Code", from one
  constant in `docs/mockups/src/brand.ts`. The domain, the GitHub App,
  the sign-in page, and the Stripe account all show the product name.
- **Problem:** The product has no name.
- **Impact if no action:** Milestone 16 cannot register the domain, the
  GitHub App, or the Stripe account.
- **Root question:** What name do visitors and users see?
- **Options:**
  - **A.** Keep "Remote Code". Effort: Small.
  - **B.** Choose a name now, and change the constant. Effort: Small.
  - **C.** Keep the working name until Milestone 16, and choose then.
    Effort: Small.
- **Left out:** No name, because sign-in and the domain need one.
- **Wider fix:** None. One constant already holds the name.
- **Note from the options check:** a GitHub App name must be unique on
  GitHub, at most 34 characters, and not the name of a GitHub account.
  Stripe checks that the website matches the registered business. Check
  the domain, the GitHub App name, and trademarks before choosing.
- **Recommendation:** B. The domain and the GitHub App depend on it.
- **Action:** ask the user, because only the user can name the product.
- **Chosen by the user on 5 November 2026:** the product is "Conducting",
  on the domain `conducting.build`.
- **Risk:** the name and the domain are close to Conductor and
  `conductor.build`. Check trademarks before the app opens to the public.

### 33. Connect an agent in the first run

Added on 5 November 2026 from the marketing mockups. Changed the
same day by decision 44: the first run also needs a Boat key.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The first run installs the GitHub App, then creates the
  first org. Decision 24 lets each user paste a Claude token or API keys
  on the account page. Each new user now also needs a Boat key before a
  cloud computer can start, as decision 44 says. The mockups draw D as a
  proposal, for the agent only.
- **Problem:** No step connects Claude or Codex, so a new user can send a
  first task with no agent.
- **Impact if no action:** The first task fails, and the user must find
  the account page alone.
- **Root question:** How does a new user get a working cloud computer and
  agent before the first task?
- **Options:**
  - **A.** Change nothing. The account page has Connect. Effort: Small.
  - **B.** Add first-run steps that connect a Boat key and Claude or
    Codex. Effort: Small.
  - **C.** Show a notice in the composer when no Boat key or no agent is
    connected. Effort: Small.
  - **D.** B and C together. Effort: Small.
- **Left out:** Signing in inside a cloud computer, which decision 24 left
  out.
- **Wider fix:** None.
- **Note from the options check:** `claude setup-token` runs the Claude
  command-line tool on the user's own computer. A user without it uses an
  API key instead. The app tests each key once when the user connects it.
- **Recommendation:** D. The first run sets the agent up, and the notice
  catches a key that is removed later.
- **Action:** ask the user, because it adds a step and a notice that no
  requirement covers.
- **Chosen:** D, by the user on 5 November 2026.

### 34. Set the limits of the paid plan

Closed on 5 November 2026: decision 45 removed billing and the plan
limits, so this question no longer applies. Added on 5 November 2026 from the marketing mockups.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The free plan allows one org and 3 workspaces. The paid
  plan, drawn as "Team", lists its compute pool, the overage price,
  image refreshes after pushes, invites, and reassignment.
- **Problem:** No rule sets how many workspaces or running machines a
  paid org may have, so a visitor can read it as unlimited.
- **Impact if no action:** Milestone 15a cannot enforce the paid limits,
  and the site cannot state them.
- **Root question:** Which limits stop one paid org from using up the
  capacity that all users share? The options check wrote this root
  question, because the pool limits cost, not capacity.
- **Options:**
  - **A.** No workspace limit. The pool and the overage price bound the
    cost. Effort: Small.
  - **B.** A workspace limit for each member, such as 10. Effort: Small.
  - **C.** A limit on machines that run at once, such as 5 for each
    member. Effort: Small.
  - **D.** Added by the options check: as C, plus decision 23's start
    limit for each hour as well as for each day. Effort: Small.
- **Boat facts from the options check:** the $20 Boat plan gives the
  whole app 100 machines at once, and 12 starts a minute, 60 an hour,
  and 200 a day. Each extra Boat seat adds only 20% of these. Starts
  above a limit cost $0.03 to $0.07 each, up to 6 times the limit, and
  then fail.
- **Left out:** None.
- **Wider fix:** None.
- **Related:** Decision 23 also limits starts a day for every user.
- **Recommendation:** D. The first recommendation was A. Under A, one org
  can use all 60 shared starts of an hour and block every other user.
- **Action:** ask the user, because only the user sets the plans.

### 35. Add the legal pages

Added on 5 November 2026 from the marketing mockups. Changed the
same day by decision 45: the product is free, so B, D, and E no longer
apply, and F is new.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The site offers open sign-up and a paid plan. The footer
  has no legal links. Stripe expects a business to show its terms and
  privacy policy. A follow-up item already adds terms that pass on the
  sandbox provider's rules.
- **Problem:** The plan has no Privacy or Terms page.
- **Impact if no action:** Billing in Milestone 15b can wait on legal
  pages.
- **Root question:** What must the site show before it opens to other
  people? The app collects GitHub logins and emails, and holds users'
  keys. EU and UK privacy law requires a privacy notice for such data.
- **Options:**
  - **A.** Privacy and Terms pages, linked from the footer and the
    sign-in page. Effort: Medium.
  - **B.** As A, plus a refund policy. Effort: Medium.
  - **D.** Added by the options check: as B, plus a cancellation policy,
    a contact page with the business details, the EU function to
    withdraw from a contract, and agreement to the terms at checkout.
    Effort: Medium.
  - **E.** Added by the options check: sell paid plans only to
    businesses, with a tax ID at checkout, so the consumer withdrawal and
    subscription rules do not apply. Effort: Small.
  - **F.** Added on 5 November 2026: no legal pages while only the
    operator uses the app. Add A before the app opens to other people.
    Effort: Small.
  - B, D, and E no longer apply, because decision 45 removed billing.
- **Rules from the options check:** Stripe checks a seller's site for
  contact details, a refund and dispute policy, a cancellation policy,
  and a privacy policy. Since 19 June 2026, the EU requires an online
  "withdraw from contract" function for consumers who have that right.
  UK rules for consumer subscriptions, with renewal reminders and easy
  cancellation, are expected from January 2027.
- **Left out:**
  - No legal pages, because payments need them.
  - C, pages that the billing provider hosts: Stripe hosts no legal pages
    for a business that is the seller.
- **Wider fix:** None.
- **Related:** `plans/follow-ups/user-terms-suspension-and-abuse-reports.md`.
- **Recommendation:** A. The app collects personal data from its first
  outside user, and a lawyer should review the texts. The recommendation
  was D before billing went away.
- **Action:** ask the user, because legal text is new content that no
  requirement covers.
- **Chosen:** A, by the user on 5 November 2026.

### 36. Decide whether to run the agents through SDKs

Added on 5 November 2026 from the user's questions about chat sync
and the agent SDKs. The options check changed the recommendation from the
own program, now D, to C.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Performance.
- **Terms:**
  - **Claude Agent SDK:** Anthropic's library
    `@anthropic-ai/claude-agent-sdk`. It runs the Claude Code program as a
    child process and gives typed events and controls.
  - **Codex App Server:** a mode of OpenAI's `codex` program that streams
    events and takes commands as JSON messages.
- **Background:**
  - Decision 1 chose Boat's built-in agents. Decision 7 polls their events
    every 250 ms while a turn runs. The app converts Boat's events into
    its own event type.
  - For decision 1, the agent recommended an own program in each cloud
    computer. The user chose the smallest build, without one.
  - Boat charges nothing for its agents beyond machine time. Model use
    bills on the user's own agent account.
  - Both agent SDKs start the agent programs as child processes. So they
    must run inside the cloud computer, in a small program of the app.
  - Boat's agents can steer a running turn. The Claude Agent SDK keeps a
    message that arrives during a turn for the next turn.
  - The Codex SDK has no interrupt, no partial text, and no input during a
    turn. OpenAI points to the Codex App Server for streamed events.
- **Problem:** Boat's event feed has no push. Its partial-text behaviour
  is unknown until a test measures it. Polling costs 240 requests a minute
  for each running turn.
- **Impact if no action:** The chat can update in visible steps. About 40
  running turns at once reach Boat's limit of 10,000 requests a minute for
  each address.
- **Root question:** How do the agents run, and how does their output
  reach the chat as it happens?
- **Options:**
  - **A.** Keep Boat's built-in agents, polled every 250 ms while a turn
    runs. Boat keeps steer, interrupt, and conversations. Effort: Medium.
  - **B.** Run `claude` and `codex` in their JSON streaming modes as Boat
    background commands, and read Boat's live output stream. This needs
    no own program. A running turn cannot be steered, only stopped.
    Effort: Medium.
  - **C.** A, with a one-hour test of Boat's event feed before
    Milestone 7. If partial text arrives in steps longer than about half
    a second, apply D. Effort: Medium.
  - **D.** A small program in each cloud computer runs the Claude Agent
    SDK and the Codex App Server. It sends their events to the workspace
    Durable Object over one outbound WebSocket. It numbers the events and
    keeps each one until the Durable Object confirms it. Boat restarts the
    program after each resume. A message sent during a turn waits for the
    next turn. Effort: Large.
- **Left out:**
  - An agent loop in the Worker: the agents need the files and the tools
    of the cloud computer.
  - Boat's own daemon pattern, which reaches the program through a Boat
    port address: it ties the program to Boat.
  - Anthropic's Managed Agents with a self-hosted sandbox: it covers only
    Claude.
  - An own program that drives the command-line tools without the SDK
    packages: the packages run the same tools and add typed events and
    controls.
- **Wider fix:** D. The agents then run on any provider that can run a
  service.
- **Previous examples:** Conductor's cloud computers run a small Node
  program. It drives `claude` in its JSON streaming mode and pushes events
  about every 240 ms.
- **Related:**
  - Decision 1: D adds the own program that the user chose to avoid.
  - Decision 7: C replaces its fallback with D.
  - Decision 37: the same agent logins work under every option.
  - The test in C needs a scoped Boat key from the user.
- **Recommendation:** C. It keeps Boat's real steer and the smaller build,
  and one hour of testing shows whether the larger build is needed.
- **Action:** ask the user, because the fallback in C adds the own program
  that the user chose to avoid in decision 1.
- **Chosen by the user on 5 November 2026:** D. The user said that Boat's
  agents are "really expensive", and asked to use the SDKs if possible.
  The one-hour test of Boat's feed stopped before its first prompt.
- **Agent calls on 5 November 2026:**
  - Codex uses the Codex SDK where it gives interrupt and partial text,
    and the Codex App Server otherwise. Milestone 7 tests it.
  - The agents keep Boat's computer tools. The Cua Driver MCP server,
    `computer`, is on every sandbox, and the SDK can load it.
  - A test of the Claude Agent SDK on a Boat sandbox checks the risks of
    D before Milestone 7. Its report goes under `.context/`.
  - The runner uses the Claude Code binary that the SDK bundles, pinned
    to the SDK's version. Reason: the SDK and its binary release
    together, and a pinned version guards against the bare-mode risk of
    decision 37. In the test, the first start after a resume took 14.5 s
    with it and 8.9 s with the system binary, one sample each. Reading
    the binary took only 0.2 s, so Milestone 7 measures more starts.
- **Test result, 5 November 2026:** all nine checks passed on a Boat
  sandbox: the token, streaming, messages during a turn, interrupt, model
  and effort changes, stop and resume, an outbound WebSocket, and the
  computer tools. Text deltas came every 20 ms. Codex was not tested,
  because there was no OpenAI key. The report is
  `.context/boat-native-remote-workspaces/reports/spike-sdk.md`.
- **Correction from the test:** the Claude Agent SDK also steers. In a
  turn with tool calls, the agent reads a new message at its next tool
  call. In a text-only turn, the message waits for the end of the turn,
  unless the runner sends it with `priority: "now"`, which stops the turn
  and answers at once.

### 37. Use only agent logins that the providers allow

Added on 5 November 2026 from the Agent SDK documentation and Anthropic's
legal page.

- **Severity:** High. **Effort:** Small.
- **Source:** Design. **Category:** Security.
- **Background:**
  - Decision 24 gives each workspace its creator's own agent account. Its
    agent call stores a Claude subscription token from
    `claude setup-token`, or API keys, and passes them to each cloud
    computer.
  - Anthropic's legal page says that "developers may not collect, store,
    or intermediate Claude.ai credentials or session tokens".
  - The Agent SDK overview says: "Unless previously approved, Anthropic
    does not allow third party developers to offer claude.ai login or
    rate limits for their products, including agents built on the Claude
    Agent SDK."
  - OpenAI lets a hosted, paid app use ChatGPT plans only after a waitlist
    for "Sign in with ChatGPT".
- **Problem:** Without Anthropic's approval, the agent call of decision 24
  breaks Anthropic's rules.
- **Impact if no action:** Anthropic can block the tokens or the accounts
  without notice.
- **Root question:** Which agent logins can each user use, within the
  providers' rules?
- **Options:**
  - **A.** API keys only, for every user. Effort: Small.
  - **B.** A, and ask Anthropic and OpenAI to approve subscription sign-in
    for every user. Effort: Small.
  - **C.** B, and the operator's own Claude subscription token for the
    operator's own workspaces. Effort: Small.
- **Left out:** The app pays for model use, because decision 24 chose each
  user's own account.
- **Wider fix:** None. This is a one-time choice.
- **Related:** Decisions 24, 33, and 36.
- **Recommendation:** B.
- **Chosen by the user on 5 November 2026:** the user has Anthropic's
  permission to use `claude setup-token` tokens. So the agent call of
  decision 24 stays: a user pastes a Claude subscription token or API
  keys. Codex keeps an OpenAI API key, because ChatGPT plans need
  OpenAI's waitlist.
- **Risk:** Anthropic plans to make bare mode the default for
  `claude -p`, and bare mode never reads a subscription login. So a later
  Claude Code release can stop the tokens from working.

### 38. Decide what a cancelled org keeps

Closed on 5 November 2026: decision 45 removed billing and the plan
limits, so this question no longer applies. Added on 5 November 2026 from the Milestone 1d mockups. The options
check added D, and the recommendation moved from B to D.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Cancel plan ends the paid plan at the end of the billing
  period. A paid org can have many members and workspaces. A free org has
  one member and at most 3 workspaces.
- **Problem:** No requirement says what happens to the extra members and
  workspaces when the paid plan ends.
- **Impact if no action:** Milestone 15b cannot handle a cancel, and the
  cancel question cannot be drawn.
- **Root question:** What does an org keep when its paid plan ends and it
  no longer fits the free plan? The plan can end by a cancel or by a
  failed payment.
- **Options:**
  - **A.** Allow Cancel plan only when the org fits the free plan. It makes
    cancelling harder, and the UK rules expected from January 2027 ask for
    easy cancellation. Effort: Small.
  - **B.** Cancel always works. The org keeps everything, but nothing
    starts and nothing new is created until it fits the free plan or
    upgrades again. Boat can delete the disk of a cloud computer that is
    stopped for over 14 days, so unpushed work can still be lost.
    Effort: Medium.
  - **C.** Cancel always works. The app removes the other members and
    archives the oldest workspaces. Unpushed work can block the archive.
    Effort: Medium.
  - **D.** As B. Before day 14, the app pushes the unpushed work of each
    waiting workspace to a backup branch on GitHub. Effort: Medium.
- **Left out:** Deleting the extra workspaces, because it loses work.
- **Wider fix:** None. One rule covers the whole case.
- **Related:** Decision 25 sets the free plan. Decision 35 sets the
  cancellation policy.
- **Recommendation:** D. Cancelling stays easy, the limit states already
  show what waits, and the backup keeps unpushed work after day 14.
- **Action:** ask the user, because the rule adds behaviour that no
  requirement covers.

### 39. Decide who owns a removed member's workspaces

Added on 5 November 2026 from the Milestone 1d mockups. The options
check widened the root question and added D, and the recommendation
moved from A to D.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Only an owner removes a member. The agents of a
  workspace use the accounts of its owner, as decision 24 says. The
  mockup's remove question says that the member's workspaces move to the
  owner who removes the member. A member can also leave, or delete their
  account, and then nobody removes them.
- **Problem:** No requirement says who owns the workspaces of a member who
  leaves.
- **Impact if no action:** Milestone 15a can keep workspaces whose agents
  use the accounts of a person who left.
- **Root question:** Who owns a workspace when its owner stops being a
  member: by removal, by leaving, or by deleting their account?
- **Options:**
  - **A.** They move to the owner who removes the member, as drawn.
    Effort: Small.
  - **B.** The remove question asks the owner to pick the new owner.
    Effort: Small.
  - **C.** The app archives them, after the check for unpushed work.
    Effort: Medium.
  - **D.** As A, for a removal. When a member leaves or deletes their
    account, the workspaces move to the org's earliest owner. The last
    owner can leave only when another owner exists, or by deleting the
    org. Effort: Small.
- **Left out:** Keeping the removed person as the owner, because the
  agents would use the accounts of someone outside the org.
- **Wider fix:** None.
- **Related:** Decision 24 gives each workspace its creator's account.
  Decision 46: under its option A, the cloud computers stay in the org's
  Boat account, so a move changes only the agent login.
- **Recommendation:** D. It covers every way to stop being a member, and
  an org always keeps an owner.
- **Action:** ask the user, because it adds behaviour that no requirement
  covers, and D rejects the last owner's leave.
- **Chosen by the user on 5 November 2026:** the workspaces belong to the
  org, so they stay in the org when a member leaves. All members of the
  org already see them.
- **Agent call on 5 November 2026:** a departed member's workspaces move
  to the owner who removed the member, or to the org's earliest owner
  when the member left alone. Reason: each workspace needs a person who
  is responsible for it. After decisions 49 and 54, the move goes to an
  admin, and no login of the person who left stays in use.

### 40. Decide how seat changes are charged mid-period

Closed on 5 November 2026: decision 45 removed billing and the plan
limits, so this question no longer applies. Added on 5 November 2026 from the options check of the Milestone
1d agent calls.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** Seats follow the people: each member takes a seat, and
  a seat starts when the person accepts the invite. The paid plan bills
  $30 a month for each seat. Stripe Billing prorates a quantity change by
  default.
- **Problem:** No requirement says how the app charges a seat that starts
  or ends in the middle of a billing period.
- **Impact if no action:** Milestone 15b cannot set Stripe's proration,
  and an invoice can surprise the owner.
- **Root question:** How does the bill follow a member who joins or leaves
  in the middle of a billing period?
- **Options:**
  - **A.** Prorate both ways, as Stripe does by default. A new seat costs
    the rest of the period, and a removed seat gives a credit for the
    rest. Effort: Small.
  - **B.** Prorate a new seat. A removed seat ends at the next invoice,
    without a credit. Effort: Small.
  - **C.** Change nothing until the next invoice. A new seat is free until
    then, and a removed seat is charged until then. Effort: Small.
- **Left out:** A full month for each new seat, because it charges for
  days before the member joined.
- **Wider fix:** None.
- **Related:** Decision 35 sets the refund policy, which must match.
  Decision 38 covers the end of the plan.
- **Recommendation:** A. Each org pays only for the days that a seat has a
  member, and it is Stripe's default.
- **Action:** ask the user, because it adds billing behaviour that no
  requirement covers.

### 41. Decide whether archived workspaces count toward the free limit

Closed on 5 November 2026: decision 45 removed billing and the plan
limits, so this question no longer applies. Added on 5 November 2026 from the options check of the Milestone
1d agent calls.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** For decision 25, the user chose D, which builds on B:
  "3 workspaces that exist at once". Only option A left archived
  workspaces out of the count. The plan's record of the choice added "not
  counting archived ones" by mistake. Archive, from decision 16, deletes
  the cloud computer and keeps the history read-only.
- **Problem:** The mockups offer Archive as the free way past the limit,
  and say that archived workspaces do not count. The chosen option does
  not say that.
- **Impact if no action:** Milestone 15a can count the limit in a way
  that the user did not choose.
- **Root question:** Which workspaces count toward the free limit of 3?
- **Options:**
  - **A.** Every workspace that exists, archived ones too, as the chosen
    option reads. The free way past the limit is Delete, which also
    removes the history. Effort: Small.
  - **B.** Only workspaces that are not archived. The free way past the
    limit is Archive, as drawn. An archived workspace has no cloud
    computer, so it costs nothing. Effort: Small.
- **Left out:** Counting only the running workspaces, because that is
  option C of decision 25, which the user did not choose.
- **Wider fix:** None.
- **Related:** Decision 25, whose record this corrects. Decision 16
  defines Archive.
- **Recommendation:** B. An archived workspace costs nothing, and Archive
  keeps the history that Delete removes.
- **Action:** ask the user, because B changes the reading of the option
  that the user chose for decision 25.

### 42. Decide who may archive another person's workspace

Added on 5 November 2026 from the Milestone 1d mockups.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Archive deletes a workspace's cloud computer, with any
  unpushed work, after a warning. The mockups show Archive to everyone in
  the org, on every workspace.
- **Problem:** No requirement says who may archive a workspace that
  another person owns.
- **Impact if no action:** Milestone 15c can let any member delete another
  member's cloud computer and unpushed work.
- **Root question:** Who may end a workspace that another person owns?
- **Options:**
  - **A.** Everyone in the org, as drawn. Effort: Small.
  - **B.** Only the workspace's owner and the org's owners. Effort: Small.
  - **C.** Everyone in the org when everything is pushed. With unpushed
    work, only the workspace's owner and the org's owners. Effort: Small.
- **Left out:** Only the org's owners, also for a member's own workspace,
  because a member then cannot clean up their own work.
- **Wider fix:** None.
- **Related:** Decision 39 decides who owns a departed member's
  workspaces.
- **Recommendation:** B. Each member keeps control of their own work, and
  owners can still act on every workspace.
- **Action:** ask the user, because it adds a permission rule that no
  requirement covers.
- **Chosen:** B, by the user on 5 November 2026.

### 43. Decide what happens to a workspace stopped for 14 days

Added on 5 November 2026 from the Milestone 1d mockups. Changed
the same day by decision 44: with users' own Boat keys, E costs the user
and not the app, and the recommendation moved from F to E. The user
asked the same day whether the app can download the disk or keep a
snapshot. That added E and F, and the recommendation moved from C to F.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Boat can delete the disk of a cloud computer that is
  stopped for more than 14 days, and a resume then fails. Boat's cleanup
  does not delete disks yet, but it can start. A resume and a new stop
  start a new 14 days. Decision 16 marks such workspaces as expiring, and
  the mockups draw that mark.
- **Problem:** No requirement says what the app does near day 14. Decision
  38 covers it only for an org whose paid plan ended.
- **Impact if no action:** After the disk is gone, the workspace shows its
  chat, but every start fails, and its unpushed work is lost.
- **Root question:** What happens to a stopped workspace before Boat can
  delete its disk?
- **Options:**
  - **A.** Only mark it, as decision 16 says. After the disk is gone, a
    start fails, and the user archives the workspace. Effort: Small.
  - **B.** Near day 14, the app archives the workspace by itself. Unpushed
    work is lost. Effort: Small.
  - **C.** Near day 14, the app pushes unpushed work to a backup branch on
    GitHub, then archives the workspace. The push can start the
    repository's CI, and it keeps only committed and uncommitted code.
    Effort: Medium.
  - **D.** Near day 14, the app starts the cloud computer briefly and stops
    it again, which starts a new 14 days. Each start counts against
    Boat's start limits and uses machine time. Effort: Small.
  - **E.** Near day 14, the app saves a Boat saved snapshot of the cloud
    computer, then deletes it. A later start makes a new cloud computer
    from that snapshot, exactly as it was. Each saved snapshot past the
    plan's included count costs $0.056 a day, about $1.70 a month, and
    the org images use the same count. Effort: Small.
  - **F.** Near day 14, the app downloads the cloud computer's last
    automatic snapshot, without a start, to the app's own storage on
    Cloudflare R2, then deletes the cloud computer. Boat gives signed
    URLs for the snapshot's chunks, which hold the home folder. A later
    start makes a new cloud computer from the org image and puts the home
    folder back: the code with all its files, and the agent sessions. R2
    costs about $0.015 for each GB a month. The app pays for the storage
    and holds a copy of each user's code. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None. Decision 38 no longer applies.
- **Previous examples:** Option D of decision 38 proposes the same backup
  branch.
- **Related:** Decision 16 defines Archive and the expiring mark. Decision
  38, option D, uses the same backup.
- **Recommendation:** E. It keeps each stopped workspace exactly, in the
  user's own Boat account at the user's cost, and the app holds no copy
  of the user's code.
- **Action:** ask the user, because it adds behaviour that no requirement
  covers.
- **Chosen:** D, by the user on 5 November 2026. Each restart uses a start
  and some minutes of the org's own Boat account.

### 44. Let each user bring their own Boat key

Added on 5 November 2026 from the user's message.

- **Chosen by the user on 5 November 2026:** users bring their own Boat
  key. This reverses the user's earlier call that users run on the app's
  own Boat subscription.
- **Changed by the user on 6 November 2026:** reversed by decision 80. All
  cloud computers run in the app's own Boat account again.
- **Effects:**
  - The app keeps no Boat account for its users. Its own Boat
    organization and key serve only development and tests.
  - Each Boat account's own plan limits, wallet, and terms apply to its
    cloud computers.
  - Decision 46 decides whose key runs an org's cloud computers.
    Decision 47 decides where the app names Boat.
- **Agent calls on 5 November 2026:**
  - The Worker stores each Boat key encrypted, with an encryption key
    that is a Worker secret. It uses a Boat key only for the cloud
    computers that it belongs to, and never sends it to the browser or
    into a cloud computer. Reason: a Boat key gives access to a whole
    Boat account.
  - The key screen asks for a key scoped to one Boat environment, with
    only the actions that the app uses, and tests the key once when it
    is saved.
  - The app does not depend on Boat webhooks, because each user's Boat
    account would need its own. The agent runner reports when a cloud
    computer is ready, and the Worker reads sandbox states from Boat's
    API when it needs them.

### 45. Make the product free, without billing

Added on 5 November 2026 from the user's message.

- **Chosen by the user on 5 November 2026:** remove billing, and make the
  product free for now. The user's reason: the risk is lower now that
  each user brings their own Boat key.
- **Effects:**
  - No plans, no Stripe, no seats, no compute pool, no overage, and no
    plan limits on workspaces, minutes, or members.
  - Decisions 23, 25, 26, and 27 are superseded. Open decisions 34, 38,
    40, and 41 are closed, because they decided parts of billing.
  - Decision 35 narrows to what a free service must show.
  - Milestone 15b is removed. Milestones 15a and 15c lose their billing
    TODOs. Milestone 1e removes billing from the mockups.

### 46. Decide whose Boat key runs an org's cloud computers

Added on 5 November 2026 from decision 44.

- **Severity:** High. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** Each org has one image, a saved snapshot that bundles
  all its repositories, as decision 13 says. A saved snapshot belongs to
  one Boat account, and Boat can share it with another account. Each
  workspace belongs to the user who created it, and its agents use that
  user's own Claude or Codex login.
- **Problem:** An org can have several members, and nothing says whose
  Boat account runs, stores, and pays for its cloud computers.
- **Impact if no action:** Milestones 4 and 5 cannot decide where the keys
  live or where the org image is built.
- **Root question:** Whose Boat account runs an org's cloud computers and
  holds its image?
- **Options:**
  - **A.** One key for each org. An owner pastes it in the org settings.
    Every workspace of the org runs on that Boat account, which also
    holds the org image. Effort: Small.
  - **B.** Each member's own key. Each member's workspaces run on their
    own Boat account, and the app builds or shares the org image into
    each account. A workspace that moves to another member must move to
    another Boat account. Effort: Large.
  - **C.** As A, and a member can add their own key for the workspaces
    that they own. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None.
- **Related:** Decision 39 is simpler under A, because the cloud computers
  stay in the org's Boat account. Decision 33 sets the first-run step
  that asks for the key.
- **Recommendation:** A. One Boat account for each org keeps the image,
  the workspaces, and reassignment in one place, and the org's owners
  control the cost.
- **Action:** ask the user, because the user said "users bring their own
  boat key", and A reads that as one key for each org.
- **Chosen by the user on 5 November 2026:** A. An org owner or an admin
  adds the org's Boat key. The plan's roles are owner and member, so
  decision 54 asks whether "admin" is a new role.

### 47. Decide where the app names Boat

Added on 5 November 2026 from decision 44.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** UX wording.
- **Background:** The user decided that the app does not name Boat, so
  that it can move to another provider later. Clues were acceptable.
  Users now need a Boat account and a Boat key.
- **Problem:** The app cannot ask for a Boat key without naming Boat.
  Visitors cannot know before sign-up that they need a Boat account.
- **Impact if no action:** Users sign up, then find out that they need
  another paid service.
- **Root question:** Where does the app tell users that it runs on Boat?
- **Options:**
  - **A.** Only on the key screen, with links to Boat's sign-up and key
    pages. Elsewhere the app keeps "cloud computer". Effort: Small.
  - **B.** As A, and the marketing site and Get started say that users
    need their own Boat account. Effort: Small.
  - **C.** Name Boat everywhere that it helps, such as in errors and
    limits. Effort: Small.
- **Left out:** Not naming Boat at all, because a user cannot then make
  the key.
- **Wider fix:** None.
- **Recommendation:** B. Visitors learn the requirement before they sign
  up, and the rest of the app still says "cloud computer", so a later
  move stays easy.
- **Action:** ask the user, because it changes the user's requirement to
  keep Boat hidden.
- **Chosen:** B, by the user on 5 November 2026.

### 48. Decide which abuse measures stay

Added on 5 November 2026 from decision 44.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Security.
- **Background:** Decision 28 requires a GitHub account older than 30 days
  with a verified email at sign-up. A follow-up item adds terms, an
  operator action that suspends a user, and an abuse address. Both
  protected the app's shared Boat organization, which Boat's terms made
  the app answer for. Now each user's cloud computers run in their own
  Boat account, under Boat's terms.
- **Problem:** The main reason for these measures is gone. The app still
  signs users in, holds their keys, and acts on GitHub for them.
- **Impact if no action:** The sign-up check refuses new GitHub users for
  a reason that no longer holds.
- **Root question:** Which measures does the app keep against misuse, now
  that each user pays for their own cloud computers?
- **Options:**
  - **A.** Keep both: the sign-up check and the follow-up item. Effort:
    Small.
  - **B.** Drop both. Effort: Small.
  - **C.** Drop the sign-up check. Keep the follow-up item's terms,
    suspend action, and abuse address, for misuse of the app and of
    GitHub through it. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Related:** Decision 28.
  `plans/follow-ups/user-terms-suspension-and-abuse-reports.md`. Decision
  35 sets the legal pages.
- **Recommendation:** C. The check no longer protects a shared account,
  but a public app still needs terms and a way to stop misuse.
- **Action:** ask the user, because it changes decision 28 and a follow-up
  item that the user asked for.
- **Chosen:** C, by the user on 5 November 2026. The sign-up check is
  dropped. The follow-up item on terms, suspension, and abuse reports
  stays.

### 49. Decide whose login runs a teammate's message

Added on 5 November 2026 from the Milestone 2 docs, item 1. Changed
on 6 November 2026 after the user asked how Conductor handles a message
from a teammate: options D and E are new, and the recommendation moved
from C to D.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation. **Category:** Security.
- **Background:**
  - Decision 24 runs each workspace's agents on its owner's own Claude or
    Codex login. A cloud computer gets that login at each start, and
    every process in it can read it.
  - The user said that all members of an org see its workspaces. The
    mockups let any member send messages in another member's workspace,
    and open its terminal.
  - The org's startup script runs in every cloud computer of the org.
  - Conductor's docs let teammates write in each other's chats, but do
    not say whose login a message uses. Conductor's runtime code on this
    machine makes each new message set its sender as the session's user,
    and attaches the sender's GitHub token to that message.
- **Problem:** No rule says whose login runs a teammate's message, or who
  can reach a login in a shared cloud computer. As planned, a teammate's
  message runs on the owner's login, and a teammate can read that login
  from the terminal.
- **Impact if no action:** One member can spend or copy another member's
  personal agent login.
- **Root question:** When a member sends a message in another member's
  workspace, whose login runs the agent, and who can reach that login?
- **Options:**
  - **A.** Change nothing. The owner's login runs every turn, and every
    member uses every workspace and edits the scripts. Effort: Small.
  - **B.** Only the workspace owner sends messages and uses the terminal,
    the previews, and the desktop. Other members see the chat and the
    files read-only. Effort: Small.
  - **C.** As B, and only org owners edit the install script, the startup
    script, and the env vars. Effort: Medium.
  - **D.** Each turn runs on the login of the person who sent the message,
    as Conductor does. When the sender changes, the runner starts the
    agent again with the sender's login, and the session keeps its
    history. That turn's git pushes use the sender's GitHub token. A
    member with a terminal in the same cloud computer can still read the
    current sender's login while that turn runs. This changes decision
    24. Effort: Medium.
  - **E.** As D, but no login enters the cloud computer. An app proxy adds
    the sender's login to each model request. Effort: Large.
- **Left out:** One image for each member, because decision 13 chose one
  image for each org.
- **Wider fix:** E. It keeps every login off the shared machines.
- **Related:** Decision 50 sets the GitHub token. Under D, each turn uses
  its sender's user token, which fits option A of decision 50. Decision
  54 can add an admin role that also edits the scripts.
- **Recommendation:** D. Members work together as in Conductor, and each
  person's turns run on their own login.
- **Action:** ask the user, because D changes decision 24, and each
  option adds behaviour that no requirement covers.
- **Chosen:** D, by the user on 6 November 2026. It changes decision 24.

### 50. Decide the reach of a cloud computer's GitHub token

Added on 5 November 2026 from the Milestone 2 docs, item 2.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation. **Category:** Security.
- **Background:** A git credential helper in each cloud computer asks the
  Worker for a fresh GitHub token for each git operation. The plan says
  that the token is the workspace owner's user token, limited to the
  org's repositories. GitHub's docs say that a user token of a GitHub App
  reaches every repository that both the user and the app can reach, and
  that a refresh takes no repository limit. An installation token can be
  limited to named repositories and permissions.
- **Problem:** The Worker cannot give a cloud computer a user token that
  reaches only the org's repositories.
- **Impact if no action:** A file in a repository can tell the agent to
  push. The agent can then push to any repository that its owner and the
  app share, also outside the org.
- **Root question:** How does a cloud computer get GitHub access that
  reaches only the repositories of its org?
- **Options:**
  - **A.** Keep user tokens, and drop the limit from the plan. Effort:
    Small.
  - **B.** Use installation tokens, limited to the workspace's repository
    and to the permissions that git needs. Pushes and pull requests then
    come from the app, not from the user. Commits still name the user as
    their author. Effort: Medium.
  - **C.** As B, but limited to every chosen repository of the org.
    Effort: Medium.
- **Left out:**
  - A new user sign-in for each workspace, limited to one repository,
    because a refresh drops that limit after 8 hours.
  - A Worker check of the repository in each token request, because the
    token itself still reaches every shared repository.
- **Wider fix:** B. GitHub then enforces the limit.
- **Related:** Decision 49.
- **Recommendation:** B. GitHub enforces the limit, and each workspace
  needs only its own repository.
- **Action:** ask the user, because B changes who shows as the pusher on
  GitHub, which users see.
- **Changed on 6 November 2026:** the recommendation moved from B to A,
  because decision 49 D runs each turn as its sender.
- **Chosen:** A, by the user on 6 November 2026. Each turn's git calls use
  the sender's own GitHub user token, fetched fresh for each call, as
  Conductor does. The plan drops its claim of a limit to the org's
  repositories.

### 51. Decide how a session moves to the other agent

Added on 5 November 2026 from the Milestone 2 docs, item 3.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Decision 19 chose an agent and model picker for each
  message, because Boat's agents could switch both inside one
  conversation. Decision 36 moved the agents into the agent runner. A
  Claude session and a Codex session are separate programs with separate
  memory. The mockups draw one picker with the models of both agents in
  every session.
- **Problem:** No design says what happens when the user picks a model of
  the other agent in a session.
- **Impact if no action:** Milestone 7 builds no switch, or a switch after
  which the new agent knows nothing of the session.
- **Root question:** How does the user move the work of one session to
  the other agent?
- **Options:**
  - **A.** Each session keeps the agent of its first message. Its picker
    lists only that agent's models, and "+" starts a session with the
    other agent. Effort: Small.
  - **B.** A pick of the other agent's model opens a new session with that
    agent, and moves the draft there. Effort: Small.
  - **C.** The runner switches the agent inside the session, and gives the
    new agent the transcript of the session. Effort: Medium.
- **Left out:** Change nothing, because neither SDK can switch agents, so
  the drawn picker has no behaviour.
- **Wider fix:** None.
- **Recommendation:** C. It keeps the user's choice in decision 19, which
  includes a switch when one agent reaches its usage limit.
- **Action:** ask the user, because A and B change the user's choice in
  decision 19, and C adds a hand-over that no decision covers.
- **Chosen:** B, by the user on 6 November 2026, as Conductor does it. A
  model change within the same agent stays in the session. A model of the
  other agent opens a new session with the draft.

### 52. Decide what agents can ask of the workspace tools

Added on 5 November 2026 from the Milestone 2 docs, item 5.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Each cloud computer has an MCP server and a CLI. With the
  workspace token, an agent can create and list workspaces. Decision 8
  set no limit on agent-made workspaces. The plan says nothing more about
  these calls.
- **Problem:** No requirement says what a create call takes, which org and
  owner the new workspace gets, or whether its agent starts at once. No
  requirement says which workspaces a list call returns.
- **Impact if no action:** Milestone 15 invents the contract, and the user
  first meets it in a running agent.
- **Root question:** What can an agent ask for when it creates or lists
  workspaces, and what does it get back?
- **Options:**
  - **A.** A create call takes a repository of the same org and a first
    message. The new workspace gets the calling workspace's org and
    owner, the default section, and the owner's default model. Its agent
    starts on the message at once. A list call returns the name, the
    branch, and the state of each workspace of that owner in that org.
    Effort: Small.
  - **B.** As A, and a create call can also choose the model, the effort,
    and the section. Effort: Small.
  - **C.** As A, but a list call returns only the workspaces that the
    calling workspace created. Effort: Small.
- **Left out:** A create call that waits for the user's approval, because
  decision 8 did not choose an approval step.
- **Wider fix:** None.
- **Recommendation:** A. An agent can split a task into parallel
  workspaces, and each new workspace shows in its owner's list.
- **Action:** ask the user, because the calls add behaviour at a boundary
  that no requirement covers.
- **Chosen:** B, by the user on 6 November 2026, as Conductor does it.
- **Agent call on 6 November 2026:** a list call returns every workspace
  of the org, as Conductor's does. Reason: every member already sees
  them.

### 53. Decide which name starts a branch

Added on 5 November 2026 from the Milestone 2 docs, item 8.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation. **Category:** Mockup.
- **Background:** The plan names each branch `<GitHub login>/<city>-<four
  random characters>`, so that each person's branches stay together. Its
  example was `cal/lisbon-7k2q`. The mockups use the first name, but the
  signed-in user's GitHub login is `calummoore`.
- **Problem:** The plan and the mockups give two rules for the branch
  prefix.
- **Impact if no action:** Milestone 5 can copy the drawn rule, and two
  people with the same first name then share one prefix.
- **Root question:** Which name starts the branch of a new workspace?
- **Options:**
  - **A.** The GitHub login, as the plan says. The plan's example and the
    mockup samples change, for example to `calummoore/lisbon-7k2q`.
    Effort: Small.
  - **B.** The first name in lower case, as drawn. Effort: Small.
- **Left out:** A prefix that the user sets, because no decision asks for
  one.
- **Wider fix:** None.
- **Recommendation:** A. A GitHub login is unique.
- **Action:** ask the user, because it decides which side of a mismatch
  between the mockups and the plan is right.
- **Chosen:** A, by the user on 6 November 2026.

### 54. Decide whether orgs get an admin role

Added on 5 November 2026 from the answer to decision 46.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** The plan's org roles are owner and member. Owners invite
  and remove members, reassign workspaces, and delete the org. For
  decision 46, the user wrote that the "org owner or admin" adds the
  org's Boat key.
- **Problem:** The plan has no admin role, so it is not clear who an admin
  is.
- **Impact if no action:** Milestone 15a builds roles that differ from what
  the user means.
- **Root question:** Which roles does an org have, and who manages its
  Boat key and settings?
- **Options:**
  - **A.** Keep owner and member. "Admin" means owner, and an org can have
    several owners. Effort: Small.
  - **B.** Add an admin role. Admins manage the Boat key, the scripts, the
    env vars, and the members. Only owners delete the org and change the
    owners. Effort: Small.
- **Left out:** Every member manages the key, because the key gives access
  to the org's whole Boat account.
- **Wider fix:** None.
- **Related:** Decision 49, option C, limits the scripts to owners.
  Decision 55.
- **Recommendation:** A. Several owners already give an org more than one
  manager, and two roles stay simple.
- **Action:** ask the user, because the user named a role that the plan
  does not have.
- **Chosen by the user on 6 November 2026:** as Conductor does it.
- **Agent call on 6 November 2026:** the roles are admin and member, as in
  Conductor. This is option A, with the role named "admin" in place of
  "owner".

### 55. Decide what happens when the last owner leaves

Added on 5 November 2026 from the answer to decision 39.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** When a member leaves, their workspaces move to an owner,
  as decision 39 says. An org needs an owner to manage its Boat key and
  its members.
- **Problem:** No rule says what happens when the last owner leaves or
  deletes their account.
- **Impact if no action:** An org can be left with no one who can manage
  it.
- **Root question:** How does an org always keep someone who can manage
  it?
- **Options:**
  - **A.** The last owner can leave only after they make another member an
    owner, or by deleting the org. This adds a refusal. Effort: Small.
  - **B.** When the last owner leaves, the org's earliest member becomes
    an owner. Effort: Small.
  - **C.** When the last owner leaves, the app deletes the org, with the
    7-day restore of decision 30. Effort: Small.
- **Left out:** An org with no owner, because no one could then manage
  its key or its members.
- **Wider fix:** None.
- **Related:** Decisions 39 and 54.
- **Recommendation:** A. The person who leaves chooses the next owner,
  and nobody gets the role by surprise.
- **Action:** ask the user, because A adds a refusal, and each option adds
  behaviour that no requirement covers.
- **Chosen:** A, by the user on 6 November 2026. With decision 54, the rule
  applies to the last admin.

### 56. Decide what happens when an org's Boat key changes account

Added on 6 November 2026 from the Milestone 2 docs.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** An org owner adds the org's one Boat key, as decision 46
  says. The org image and every cloud computer of the org live in the
  Boat account of that key. The plan has no way to move a cloud computer
  to another Boat account.
- **Problem:** No rule says what happens when an owner replaces the key
  with a key of another Boat account.
- **Impact if no action:** The new key cannot reach the old cloud
  computers or the old image. Every workspace then fails to start, and
  its unpushed work is out of reach.
- **Root question:** What happens to an org's cloud computers and image
  when its Boat key changes to another Boat account?
- **Options:**
  - **A.** The app accepts a new key only when it reaches the same Boat
    account. The key screen says why it refuses a key of another account.
    It is a new rejection. Effort: Small.
  - **B.** The app accepts a key of another account after a warning. The
    old workspaces keep their chat read-only, as archived workspaces do,
    and the owner builds the image again. Effort: Medium.
  - **C.** As B, but the app first shares the org image with the new
    account. Effort: Medium.
- **Left out:** Change nothing, because every start then fails without a
  warning.
- **Wider fix:** None.
- **Recommendation:** A. Nothing gets stranded, and an owner who wants
  another Boat account can still create a new org.
- **Action:** ask the user, because A adds a rejection, and each option
  adds behaviour that no requirement covers.
- **Chosen:** A, by the user on 6 November 2026. The user asked for a
  better way later, probably a move of the old cloud computers:
  `plans/follow-ups/migrate-cloud-computers-to-another-boat-account.md`.
- **Changed on 6 November 2026:** decision 80 moved every cloud computer
  back to the app's own Boat account, so no org changes its Boat account,
  and this decision and its follow-up item no longer apply. The follow-up
  item is deleted.

### 57. Decide who may change an org's shared settings

Added on 6 November 2026 from the Milestone 2a docs.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Security.
- **Background:** The install script builds the org image that every new
  workspace starts from. The startup script and the env vars reach every
  sandbox of the org. Decision 49 runs each turn on its sender's login,
  so other members' logins pass through every sandbox. Only admins see
  the Boat key tab.
- **Problem:** No decision says whether a member who is not an admin may
  change the repositories, the install script, the startup script, or
  the env vars.
- **Impact if no action:** Milestone 6 copies the drawn screens, so every
  member can change what runs in every new sandbox. A changed script can
  then read the logins of other members' turns in every new workspace.
- **Root question:** Who may change the settings that every sandbox of an
  org gets?
- **Options:**
  - **A.** Every member, as drawn. The docs then state it. Effort: Small.
  - **B.** Only admins. Members see these tabs read-only. It needs a new
    mockup state. Effort: Small.
- **Left out:** A review step for each change, because no decision asks
  for one, and it adds a new flow.
- **Wider fix:** B.
- **Recommendation:** B. A member can reach one sandbox from its
  terminal, but a script change reaches every new workspace of the org.
  The docs agent recommended A, because members can already reach each
  sandbox and its env vars.
- **Action:** ask the user, because each option adds a permission rule
  that no decision covers.
- **Chosen:** B, by the user on 6 November 2026.

### 58. Decide how to run more of the build at once

Added on 6 November 2026 from the user's question: "the plan seems very
linear, can we not do it more in parallel?" The brainstorm notes are in
`.context/parallel-build/notes.md`.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design. **Category:** Process.
- **Background:** Every feature milestone waited for Milestones 4 and 5,
  and each screen milestone also waited for its backend. The longest
  chain ran 4, 5, 7, 8, then 16. Conductor Cloud goes read-only on 13
  November 2026.
- **Root question:** How do we get to a working Conducting sooner by
  building more parts at the same time?
- **Options:**
  - **A.** Keep the order, and run side by side only after Milestones 5
    and 6. Effort: Small.
  - **B.** A short contracts milestone after Milestone 4, then every
    backend and screen milestone at once against fakes, then wiring.
    Effort: Medium.
  - **C.** Features cut as backend plus screens, built side by side after
    a shared core. Effort: Medium.
  - **D.** As B, with the chat path in the first wave and a first
    deployment of it. Effort: Medium.
- **Left out:** Stacked branches that start before their dependencies
  merge, because the delegating rules forbid it.
- **Recommendation:** D.
- **Chosen:** D, by the user on 6 November 2026.

### 59. Decide how many workspaces may run at once

Added on 6 November 2026 with decision 58.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Process.
- **Options:** **A.** Up to 3. **B.** Up to 5. **C.** Every milestone that
  is ready to start.
- **Recommendation:** B.
- **Chosen:** C, by the user on 6 November 2026.
- **Agent call on 6 November 2026:** the orchestrator reviews and merges
  the chat path first: Milestones 5, 6, 7, 7r, 8, and 8i.

### 60. Decide how the Origin check treats browser reads

Added on 6 November 2026 from Milestone 4.

- **Severity:** High. **Effort:** Small.
- **Source:** Implementation. **Category:** Security.
- **Location:** `worker/security/gate.ts`.
- **Background:** The gate of the app hostname checks a matching `Origin`
  header on every request. The reason is that an upgrade without that
  check lets preview code open chat sockets. Browsers send no `Origin`
  header on an ordinary read from the same site. They always send it on
  a WebSocket upgrade.
- **Problem:** The gate refuses every ordinary browser read.
- **Impact if no action:** The web app cannot read its own data, which
  blocks the screens from Milestone 6 on.
- **Root question:** How do ordinary browser reads pass the gate, while
  writes and sockets stay protected?
- **Options:**
  - **A.** Allow a missing `Origin` header on GET and HEAD reads, and
    check it when it is there. Writes and socket upgrades still need a
    matching `Origin`. Effort: Small.
  - **B.** The web app reads with JSON POST requests, so every request
    carries `Origin`. This changes the API methods. Effort: Medium.
  - **C.** Serve the API on another hostname with credentialed CORS.
    Effort: Medium.
- **Left out:** Keeping the check as it is, because it blocks every
  browser read.
- **Wider fix:** A. One gate covers every route by its method.
- **Recommendation:** A. Reads change nothing, and the check still guards
  every write and every socket.
- **Action:** ask the user, because A changes a requirement of the access
  protocol.
- **Chosen:** A, by the user on 6 November 2026.

### 61. Decide the backend stack

Added on 6 November 2026 from the user's question: "how hard would it be
to use a postgres backend/rust api server - would that make the plan
longer - what could be done to do a minimal version?"

- **Severity:** High. **Effort:** Small, for option E.
- **Source:** Design. **Category:** Code structure.
- **Background:** Decision 1 chose a Cloudflare Worker with D1 and
  Durable Objects. Milestone 4 built sign-in, sessions, keys, the gate,
  and the Boat client in TypeScript. The live parts, which fit Durable
  Objects, are not built yet. The user's usual stack is Rust and
  Postgres.
- **Options:**
  - **A.** Keep the TypeScript Worker, D1, and Durable Objects. Effort:
    Small.
  - **B.** Keep the Worker and the Durable Objects, and replace D1 with
    Postgres through Hyperdrive. About 1 day more. Effort: Medium.
  - **C.** A Rust API server with Postgres, and Durable Objects only for
    the live connections. About 3 to 5 days more. Effort: Large.
  - **D.** One Rust server with Postgres for everything, as one container
    in the EU. About 4 to 6 days more. Effort: Large.
  - **E.** A now, and a follow-up item to move to Rust and Postgres after
    the first usable release, behind the contracts of Milestone 4a.
    Effort: Small now.
- **Left out:** Rust compiled for Workers, because its tools are thinner
  and it gives neither a normal Rust server nor the usual Postgres setup.
- **Recommendation:** E.
- **Chosen:** E, by the user on 6 November 2026. The follow-up item is
  `plans/follow-ups/move-backend-to-rust-and-postgres.md`.
- **Changed by the user on 6 November 2026:** the Rust backend started in
  parallel (decision 71), and decisions 73, 74, and 75 set its shape, its
  database, and its host. The same day, the user parked it again, outside
  this plan. The follow-up item holds the work and those decisions.

### 62. Add a Mac app in parallel

Added on 6 November 2026 from the user's message: "can we add a parallel
milestone to do a mac app - see how we did it in mokly - must be in
parallel and not delay things".

- **Chosen by the user on 6 November 2026:** a Mac app, built the way
  Mokly built its desktop app, in a milestone that runs in parallel and
  delays no other milestone. It changes the first requirement that the
  product has no desktop app. The agents still run only in the cloud.
- **How Mokly does it:** `mokly-ai/mokly-cloud`, folder `ts/desktop`, read
  on 6 November 2026. It is a small Electron shell for macOS and Linux.
  - It bundles the web app's static build and serves it from its own
    origin, `mokly-app://desktop`. It uses the same API, and the API
    accepts that origin.
  - Sign-in finishes in the browser and hands off to the app through the
    `mokly://` scheme, with one app instance.
  - It keeps the window bounds and the session. It has no preload and no
    renderer bridge, and it denies every permission except a sanitized
    clipboard write. Its content security policy equals the web app's.
  - electron-builder packages DMG and ZIP builds for arm64 and x64.
    electron-updater reads pre-releases from the public repository
    `mokly-ai/mokly-desktop`. Release tags sign and notarize on macOS.
  - Playwright tests the shell and the packaged app in CI.
- **Agent calls on 6 November 2026:**
  - macOS only for now, arm64 and x64. Linux can follow, because Mokly's
    setup already covers it.
  - The shell lives in `desktop/` with its own package, so that it shares
    no files with the other milestones except the Worker's origin rules.
  - Until the user has an Apple Developer account, builds have an ad-hoc
    signature. This repository is private, so a release feed needs a
    public repository, such as `Firna-AI/conducting-desktop`.
  - Milestone 17 does not wait for Milestone 15e. If 15e has not merged
    by then, it stays a follow-up branch.
- **Added by the user on 6 November 2026:** the app must have the native
  macOS window buttons, the red, yellow, and green dots, built into the
  app's own top bar, as in Conductor's Mac app. "Otherwise people will
  think its not a serious desktop app." The user's screenshot is in
  `.context/attachments/assets/ee3f326c-4a2a-4bb3-a3de-6ee92adcf521/`.
- **Agent calls on 6 November 2026, for the window buttons:**
  - The window has a hidden title bar, and the native buttons sit inset
    at the top left of the left panel. The sidebar toggle and the back
    and forward buttons sit beside them, as in Conductor's Mac app.
  - The top bars of the app are drag regions that move the window, and
    their buttons are not.
  - The page reserves the space of the window buttons, and drops it in
    full screen, where macOS hides them. It learns this without a preload
    script, from the window controls area that Electron exposes to CSS,
    or else from a marker in the page address.
- **Added by the user on 6 November 2026:** the Mac app registers the Mac
  as a device on which the remote side can run commands, while the Mac is
  awake. Each command needs the user's permission, with the choices to
  allow the command once, to always allow it, or to allow all commands
  for 15 minutes. The mockups come first. Like the Mac app, this work
  blocks no other milestone.
- **Agent calls on 6 November 2026, for device commands:**
  - An agent asks through a "run a command on the Mac" tool. The request
    goes to the Mac of the person who sent the turn, as decision 49 runs
    the turn on its sender's login. Conductor's own tool runs commands on
    the Mac that created the workspace.
  - The request names the command, the folder, the reason, and a time
    limit: 60 seconds by default and 120 at most. A longer limit, up to
    30 minutes, needs a reason that the prompt shows, as Conductor's tool
    does.
  - The prompt shows the command, the folder, the reason, the workspace,
    and the sender. Its choices are Deny, Allow, Always allow, and Allow
    all commands for 15 minutes. When the app is in the background, a
    macOS notification opens the prompt.
  - "Always allow" covers the exact command text on that Mac. "Allow all
    commands for 15 minutes" covers one workspace on that Mac, and shows
    a countdown with Stop. The app's settings list the always-allowed
    commands, each with Remove.
  - The command runs with the user's own permissions, with an output
    limit. When the Mac sleeps, or the app is closed, the tool tells the
    agent that the Mac is not available.
- **Changed by the user on 6 November 2026:** the command approval is a
  compact message in the chat, with the command and action buttons.
  Keep the pending request visible above the composer. The time limit
  can use a small secondary label. Put the other request facts in details.
  The request no longer uses a modal dialog.

### 63. Decide the language of the agent runner

Added on 6 November 2026 from the user's question: "what is the agent
runner? can we make it rust not node for the agent runner".

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Code structure.
- **Background:** The Claude Agent SDK exists only for TypeScript and
  Python. It starts the Claude Code program and speaks a JSON stream
  protocol with it, which Anthropic does not publish as a stable API. The
  Codex App Server takes JSON messages from any language. Conductor's
  own runner is a Node program.
- **Options:**
  - **A.** Node, with both SDKs directly. Effort: Medium.
  - **B.** Rust only, speaking the Claude Code stream protocol itself and
    driving the Codex App Server. About 2 days more. Effort: Large.
  - **C.** A Rust runner with a small Node helper that runs only the two
    SDKs. About 1 day more. Effort: Large.
  - **D.** A now, and C with the Rust backend move of decision 61.
    Effort: Small now.
- **Left out:** Python and its SDK, because it is neither the user's usual
  stack nor faster to build.
- **Recommendation:** D.
- **Chosen:** D, by the user on 6 November 2026. The user first chose A,
  then changed the answer to D the same day. The runner is a Node program
  now. It moves to option C, a Rust runner with a small Node helper for
  the two SDKs, with the Rust backend move of decision 61, as
  `plans/follow-ups/move-backend-to-rust-and-postgres.md` says.

### 64. Decide what the banner shows when GitHub blocks a merge

Added on 6 November 2026 from the Milestone 13 work.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Decision 18 chose nine banner states: no pull request,
  checks running, checks failed, ready to merge, merged, merge conflict,
  changes requested, draft, and closed without a merge. GitHub can also
  block a merge with no conflict and no failed check, for example when an
  approval is missing or the branch is behind its base. The shared types
  could not express these cases.
- **Problem:** No banner state fits a pull request that GitHub blocks for
  another reason.
- **Impact if no action:** The banner shows an error or a stale state,
  and the user cannot see why the merge is blocked.
- **Root question:** What does the banner show when GitHub blocks a merge
  for a reason that the nine states do not cover?
- **Options:**
  - **A.** Show "Ready to merge" once the checks pass. GitHub's merge
    button can then still refuse. Effort: Small.
  - **B.** Add one state, "Blocked", which links to the pull request on
    GitHub. Effort: Medium.
  - **C.** Add two states: "Blocked" for missing approvals and other
    rules, and "Out of date" for a branch behind its base, with "Update
    branch". Effort: Medium.
  - **D.** Show the full list of GitHub's blockers in the bar. Effort:
    Large.
- **Left out:** Keeping the error or the old state, because it hides the
  blocker.
- **Wider fix:** B. One general state also covers GitHub rules that come
  later.
- **Recommendation:** C.
- **Chosen:** B, by the user on 6 November 2026. The bar shows "Blocked"
  when GitHub blocks the merge and no other state applies. Its action
  opens the pull request on GitHub. Milestone 4b adds the state to the
  contracts, the fakes, and the mockups.

### 65. Limit the size of each body that the Worker reads

Added on 6 November 2026 from a finding check of the Milestone 9 review.

- **Severity:** High. **Effort:** Medium.
- **Source:** Review. **Category:** Security.
- **Background:** The request gate reads the whole JSON body of each
  signed-in write, with no byte limit. Cloudflare accepts request bodies
  up to 100 MB on the Free and Pro plans. The Boat transport reads each
  Boat answer in full, and a command answer can hold up to 8 MiB of
  output for each stream. An isolate has 128 MB of memory.
- **Problem:** One large body can fill the memory of an isolate.
- **Impact if no action:** A signed-in user can crash an isolate on
  purpose, which stops the requests of other users on it.
- **Root question:** How does the Worker keep each body that it reads to
  a safe size?
- **Options:**
  - **A.** A byte limit in the request gate only, for example 1 MB, with
    a 413 answer. Effort: Small.
  - **B.** One bounded body reader. The request gate uses it with a 1 MB
    limit. The Boat transport uses it with a budget for each fixed Boat
    route, above Boat's documented maximum for that route. Effort:
    Medium.
  - **C.** A Cloudflare rule that refuses request bodies over 1 MB before
    the Worker runs. Effort: Small.
- **Recommendation:** B.
- **Chosen:** B, by the user on 6 November 2026. Milestone 4c builds it on
  the bounded reader of the Milestone 9 file read.

### 66. Put the README rule where agents read it

Added on 6 November 2026 from finding 2 of the Milestone 15 review.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Review. **Category:** Process.
- **Background:** The `plans` skill says that a README holds no plan
  reference. Agents read the `documentation` skill when they edit a
  README, and that skill does not state the rule. So READMEs got status
  lines that went stale.
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Add the rule to the `documentation` skill. Effort: Medium.
- **Recommendation:** B.
- **Chosen:** B, by the user on 6 November 2026, in a workspace of
  `futex-ai/skills`. This repository changes nothing for it.
- **Done:** `futex-ai/skills` pull request #91 added the rule to the
  `documentation` skill. The user merged it on 7 November 2026.

### 67. Decide the content security policy of both apps

Added on 6 November 2026 from the Milestone 15e work.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Decision 62 copies Mokly's Mac app, whose content
  security policy equals the web app's. The Conducting web app sends no
  content security policy today. The Milestone 15e branch prepared one
  policy for both apps. It allows only the app's own scripts and styles,
  its own API and sockets, GitHub avatars, and the frames that the app
  names, such as port previews. It blocks inline scripts, plugins, and
  framing of the app by other sites.
- **Problem:** The two policies can be equal only if the web app starts
  to send this policy, which adds a new restriction to the web app.
- **Impact if no action:** The two apps use different policies, and the
  web app has no second defence against an injected script.
- **Root question:** Which content security policy do the web app and
  the Mac app use?
- **Options:**
  - **A.** Send the prepared policy from both apps now. Each later screen
    adds its frame and connection sources. Effort: Small.
  - **B.** Send the policy only from the Mac app for now. The web app
    gets it later. Effort: Small.
  - **C.** Send no policy from either app. Effort: Small.
- **Left out:** Loading the policy from the server at run time, because
  it adds a network dependency and does not settle the choice.
- **Wider fix:** A.
- **Recommendation:** A. The app has few screens now, so the policy costs
  least to add now.
- **Action:** ask the user, because each option changes a requirement.
- **Chosen:** A, by the user on 6 November 2026. Both apps send the
  prepared policy. Milestone 15e applies it to the web app and states it
  in the access protocol.

### 68. Show when a workspace waits for the user

Added on 6 November 2026 from the user's request: "we can add some kind
of indicator to the workspace" and "maybe a blue indicator is the
workspace asking for help/approval/prompt".

- **Chosen:** by the user on 6 November 2026. A workspace gets one more
  state, needs input. It shows while the agent waits for the user, such
  as for help, an approval, or an answer. It is not only for Mac
  commands.
- **Agent calls on 6 November 2026:**
  - The mark is blue, like Working, with a different shape: a filled
    middle column that pulses, where Working draws a ring. So the two
    states never depend on colour alone. The pulse stops when the system
    asks for reduced motion.
  - The workspace header and its row in the list show it, in the web app
    and in the Mac app. On any other page of the Mac app, the row of the
    waiting workspace shows it, and a click opens the request.
  - The contract value is `input` in `WorkspaceState`. Milestone 15f sets
    it while a Mac command request waits. Each later feature that waits
    for the user sets it too.

### 69. Pin the Node of the product's programs in each org image

Added on 6 November 2026 from finding 3 of the Milestone 15 review.

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review. **Category:** Product bug.
- **Background:** The workspace tools are TypeScript files that Node 24
  runs directly, and the agent runner is a Node program too. Boat's base
  image has Node 24, but the org's install script runs with `sudo` and
  can replace it. The launcher of the tools already ignores the shell's
  search path and `NODE_OPTIONS`.
- **Problem:** An org script that replaces the system Node breaks the
  tools, and later the runner.
- **Options:**
  - **A.** Keep the system Node, and tell orgs not to replace Node 24.
    Effort: Small.
  - **B.** Build the tools into JavaScript that Node 18 and later runs.
    Effort: Medium.
  - **C.** Install a private Node that only the product's programs use.
    Effort: Medium.
  - **D.** Fail the image build when the Node is not Node 24. Effort:
    Small.
- **Recommendation:** C.
- **Chosen:** C, by the user on 6 November 2026. Each org image gets one
  pinned Node 24 release in its own folder, and the tools and the runner
  start it by its full path. The org's own Node stays for the org's code.
  Milestone 5a builds it.

### 70. Decide how soon an open tab loses access

Added on 6 November 2026 from finding 1 of the Milestone 7 review.

- **Severity:** High. **Effort:** Medium.
- **Source:** Review. **Category:** Security.
- **Background:** The Worker checks the session and the membership when a
  tab opens its event socket. After that, the workspace Durable Object
  sends each new event to the tab.
- **Problem:** A removed member, a signed-out tab, or a tab of a deleted
  org kept getting new chat events.
- **Options:**
  - **A.** Close each socket after 5 minutes. Effort: Small.
  - **B.** Check the access of all open tabs again at most every 30
    seconds, with one D1 read, and close each tab that fails. Effort:
    Medium.
  - **C.** Check access before each event. Effort: Medium.
  - **D.** B, plus a close at once on removal and Delete org. Effort:
    Medium.
- **Recommendation:** B.
- **Chosen:** B, by the user on 6 November 2026. The access protocol
  states the 30-second rule. Milestone 7 applies it in its second fix
  round. The runner side already checks the workspace token before each
  agent login.

### 71. Give each org its own database

Added on 6 November 2026 from the user's request: "not each workspace -
each org".

- **Severity:** High. **Effort:** Large.
- **Source:** Design. **Category:** Code structure.
- **Background:** One D1 database holds the records of all orgs. Each
  workspace has its own Durable Object for its chat.
- **Options:**
  - **A.** One Durable Object for each org, for the org's records, built
    before the first deployment. Effort: Large.
  - **B.** Keep one D1 now, and give each org its own database with the
    move to Rust and Postgres. Effort: Small now.
  - **C.** Keep D1 as the record, with a read copy of the members in a
    Durable Object for each org. Effort: Medium.
- **Recommendation:** A.
- **Chosen:** by the user on 6 November 2026: keep the planned storage for
  now, one D1 database and one Durable Object for each workspace. In
  parallel, the Rust backend starts now, as part of this plan, and it
  does not block the first merge. The database for each org becomes part
  of the Rust backend's design. This changes the timing of decision 61 E,
  which moved to Rust only after the first usable release.
- **Changed by the user on 6 November 2026:** the Rust work is parked and
  leaves this plan. `plans/follow-ups/move-backend-to-rust-and-postgres.md`
  holds it, with decisions 73, 74, and 75.

### 72. Name the member who stopped the agent

Added on 6 November 2026 from the Milestone 8 work.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Implementation. **Category:** UX wording.
- **Background:** All members of an org see the same chat history. The
  mockup said "You stopped the agent", but the stop event did not record
  who pressed Stop.
- **Options:**
  - **A.** Keep "You stopped the agent". Effort: Small.
  - **B.** Use a neutral message. Effort: Small.
  - **C.** Record who pressed Stop, and name that member. Effort: Medium.
- **Recommendation:** C.
- **Chosen:** C, by the user on 6 November 2026. A stopped turn records
  the member who pressed Stop. The chat shows "Priya stopped the agent",
  or "You stopped the agent" to Priya.
- **Agent call on 6 November 2026:** a turn that stops with no Stop
  request, such as when the cloud computer stops, shows "The agent
  stopped". Reason: such a stop has no member to name. The user can
  override this text.

### 73. Decide the shape of the Rust backend

Added and answered on 6 November 2026 (C). The user parked the
Rust work the same day, so the decision with its options moved to
`plans/follow-ups/move-backend-to-rust-and-postgres.md`.

### 74. Decide the database for each org in Postgres

Added and answered on 6 November 2026: one Postgres database for every
org. The user parked the Rust work the same day, so the decision with its
options moved to
`plans/follow-ups/move-backend-to-rust-and-postgres.md`.

### 75. Decide where the Rust backend runs

Added and answered on 6 November 2026 (A). The user parked the
Rust work the same day, so the decision with its options moved to
`plans/follow-ups/move-backend-to-rust-and-postgres.md`.

### 76. Decide what happens to a runner event that the workspace refuses

Added on 6 November 2026 from round 2 finding 3 of the Milestone 7
review.

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review. **Category:** Product bug.
- **Background:** The workspace stores each runner event before it
  confirms it, and Cloudflare stores at most 2 MB in one value. A large
  file tree, tool output, or file list can pass that. The workspace also
  refuses an invalid event and an event of a turn that is not active. A
  refused event closed the connection without a confirm, so the runner
  sent it again after each reconnect, and the stream stopped there.
- **Options:**
  - **A.** A size limit and a reply that lets the runner replace a large
    event. Effort: Medium.
  - **B.** Store large events in bounded parts. Effort: Medium.
  - **C.** Store large events in object storage. Effort: Large.
  - **D.** Store a small marker for each event that the workspace refuses
    for a fixed reason, and confirm it. Effort: Medium.
  - **E.** D, and cap the event shapes in the runner contract. Effort:
    Medium.
- **Recommendation:** E.
- **Chosen:** E, by the user on 6 November 2026. Milestone 4d changes the
  contracts, and Milestone 7s changes the workspace.
- **Agent calls on 6 November 2026,** which the user can override:
  - One stored runner event holds at most 1 MiB, half of Cloudflare's
    limit for one value, so the envelope always fits.
  - A full file tree and a long list of changes go as several numbered
    parts. A tree delta with many changes goes as several deltas with
    consecutive revisions.
  - A tool's detail and the file list at the end of a turn keep a cap and
    a count of the rest.
  - The chat shows the marker of a refused event as one line that names
    what was lost.

### 77. Decide the order of the open session tabs

Added on 6 November 2026 from a finding check of the Milestone 7
review.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review. **Category:** Docs or spec.
- **Options:**
  - **A.** The order of creation. A new session opens as the last tab.
    Effort: Small.
  - **B.** The order of the last activity. Effort: Small.
- **Recommendation:** A.
- **Chosen:** A, by the user on 6 November 2026. The chat protocol states
  it.

### 78. Bind each invitation to the person it names

Added on 6 November 2026 from round 2 finding 4 of the Milestone 15a
review.

- **Severity:** High. **Effort:** Medium.
- **Source:** Review. **Category:** Security.
- **Background:** An admin invited a person by GitHub login, and the
  Worker compared that login with the login stored at the user's last
  sign-in. A login can be renamed and taken by another account, so a
  stale stored login let account 400 accept an invitation meant for
  account 500.
- **Options:**
  - **A.** Look up the GitHub ID at invite time, and match on it. Effort:
    Medium.
  - **B.** Put the GitHub ID in a signed invitation code. Effort: Medium.
  - **C.** An admin approves each account before it joins. Effort: Large.
  - **D.** A, with the lookup behind a members hook. Effort: Medium.
  - **E.** The admin's browser looks up the account. Effort: Medium.
  - **F.** Keep the code until the wiring milestone. Effort: Small.
  - **G.** D, and show the invited account on the invitation. Effort:
    Medium.
- **Recommendation:** D, with G later.
- **Chosen:** by the user on 6 November 2026, a new option: "invites
  should be sent via email, then we can check that when the user logs in
  with github". An admin invites a person by email, and the app sends the
  invitation to that address. The person joins with a GitHub account that
  has that address as a verified email. Milestone 15g builds it.
- **Agent calls on 6 November 2026:**
  - The app reads the verified emails at sign-in with `GET /user/emails`,
    through the "Email addresses" read permission that decision 28 already
    needs.
  - The person still accepts each matching invitation, as today, so a
    sign-in alone joins no org.
  - Invitations by GitHub login go away, so one way remains.

### 79. Choose the email service for invitations

Added on 6 November 2026 from decision 78.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Process.
- **Options:**
  - **A.** Postmark, as in Mokly Cloud. Effort: Small.
  - **B.** Resend. Effort: Small.
  - **C.** Cloudflare's email sending from Workers. Effort: Small.
- **Recommendation:** A.
- **Chosen:** B, by the user on 6 November 2026. Milestone 15g sends the
  invitations through Resend, with `conducting.build` as the sender
  domain. The Resend API key is a Worker secret.

### 80. Decide what Remove key does to running cloud computers

Added on 6 November 2026 from the Milestone 6 work.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The Boat key tab had Remove key, and without the key the
  Worker could not stop the org's cloud computers.
- **Options:**
  - **A.** Stop every cloud computer of the org, then delete the key.
  - **B.** Refuse the removal while a cloud computer runs.
  - **C.** Delete only the key.
  - **D.** Drop Remove key.
- **Recommendation:** A.
- **Chosen:** by the user on 6 November 2026, a wider change: "I think we
  go back to using our own account for Boat". This reverses decision 44.
  All cloud computers run in the app's own Boat account again, so no org
  has a Boat key, and this question no longer applies.
- **Agent calls on 6 November 2026,** which the user can override:
  - The app's Boat key becomes one Worker secret.
  - The Boat key tab, the encrypted store of org keys, and the key steps
    of Get started go, because no org has a key.
  - The marketing site and Get started no longer ask users for a Boat
    account. The app names Boat to no user, which replaces decision 47.
  - A new milestone makes the switch after the running milestones merge,
    and before the first deployment, so that no stored key needs a
    migration.
  - Decision 45 made the product free because each user paid for their
    own Boat account. That reason is gone, so decisions 81 and 82 ask
    again about cost and abuse.

### 81. Decide the cost model now that the app pays for compute

Added on 6 November 2026 from decision 80.

- **Severity:** High. **Effort:** Small.
- **Source:** Design. **Category:** Product bug.
- **Background:** Decision 45 removed billing and all limits, because each
  user paid for their own Boat account. Under decision 80, the app's own
  Boat account pays for every cloud computer.
- **Options:**
  - **A.** Free with limits for each user. Effort: Medium.
  - **B.** Bring billing back. Effort: Large.
  - **C.** Invite-only. Effort: Small.
  - **D.** Free with no limits. Effort: Small.
- **Recommendation:** C for the first deployment, then A.
- **Chosen:** D, by the user on 6 November 2026: "we can add billing
  later". The product stays free with no limits, and the app's Boat
  account pays for all use.

### 82. Decide when the abuse controls come

Added on 6 November 2026 from decision 80.

- **Severity:** High. **Effort:** Small.
- **Source:** Design. **Category:** Security.
- **Background:** All users share the app's Boat account again, and Boat's
  terms make the platform responsible for what its users do.
- **Options:**
  - **A.** Terms at sign-up, an operator suspension, and an abuse address,
    before the first deployment. Effort: Medium.
  - **B.** Keep them as follow-up items after the merge. Effort: Small now.
  - **C.** The operator suspension now, the rest before an open sign-up.
    Effort: Small.
- **Recommendation:** C.
- **Chosen:** B, by the user on 6 November 2026: "do as follow ups". The
  follow-up item `plans/follow-ups/user-terms-suspension-and-abuse-reports.md`
  holds the three measures.

### 83. Keep the preview credential away from other sites

Added on 6 November 2026 from a finding check of the Milestone 11 review.

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review. **Category:** Security.
- **Background:** The random hostname of a port preview is its credential.
  Browsers send `Origin` on cross-site requests and WebSocket connections
  despite `no-referrer`, so a preview page can leak its hostname to each
  site that it calls. The redirect rewrite also matches only `https`.
- **Options:**
  - **A.** Accept the leak, and match `http` in the redirect rewrite.
    Effort: Small.
  - **B.** Move the credential out of the hostname, into a cookie that the
    preview domain sets. Effort: Medium.
  - **C.** B, and check Boat's forwarded headers in the live smoke test.
    Effort: Medium.
- **Recommendation:** C.
- **Chosen:** C, by the user on 6 November 2026. Milestone 11a builds it,
  and Milestone 16 checks Boat's forwarded headers.

### 84. Decide the size limits of Boat replies

Added on 6 November 2026 from the Milestone 4c work.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation. **Category:** Security.
- **Background:** Decision 65 B gave each Boat route a budget above Boat's
  documented maximum. Boat publishes no total size for most replies, and a
  command reply can reach about 96 MiB of escaped JSON.
- **Options:**
  - **A.** 1 MiB for account, lifecycle, snapshot, metadata, and error
    replies, and 18 MiB for command replies. Keep the file budget.
    Effort: Medium.
  - **B.** Wait until Boat publishes complete limits. Effort: Large.
  - **C.** Read command replies as a stream, and keep only the last part
    of each output stream. Effort: Large.
- **Recommendation:** A.
- **Chosen:** A, by the user on 6 November 2026. This changes decision 65
  B: a Boat reply over its budget fails, also when Boat would allow it.
  Milestone 4c applies it.

### 85. Make the members tests pass the gate every time

Added on 6 November 2026 from the merge of Milestone 15a.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Test.
- **Background:** Each members test started its own Miniflare and D1
  database. Alone, a test took about 2 seconds, and one long scenario took
  5 seconds. On the merged tree, the complete gate failed twice, each time
  on another members test at about 5.1 seconds.
- **Options:**
  - **A.** A 20-second limit for the members tests only. Effort: Small.
  - **B.** Fewer test files at the same time. Effort: Small.
  - **C.** One Miniflare and one database for each members test file, with
    the data reset between tests. Effort: Medium.
- **Recommendation:** A now, and C as a follow-up item.
- **Chosen:** C, by the user on 6 November 2026. The Milestone 15a branch
  makes the change before it merges. The time limit stays at 5 seconds.

### 86. Decide whether a preview ID can come back

Added on 6 November 2026 from round 2 finding 2 of the Milestone 12
review.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review. **Category:** Docs or spec.
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **C.** Each open gives a new ID, and the API never gives out a revoked
    ID again. Effort: Small.
  - **D.** Hide revoked previews by their address. Effort: Medium.
- **Recommendation:** C.
- **Chosen:** C, by the user on 6 November 2026. The preview contract states
  the rule, and Milestone 11a tests it in the backend.

### 87. Show the chat at once on a return to a workspace

Added on 6 November 2026 from the user's question: "Will they be cached?"

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Performance.
- **Background:** Each open of a workspace loads its history from the
  workspace Durable Object. The browser stores only the panel widths.
- **Options:**
  - **A.** No cache. Each open loads the newest page again. Effort: Small.
  - **B.** A cache in memory only. The web app keeps the chat of each
    workspace that the tab showed. A return shows the chat at once, then
    loads only the new events. A reload or a new tab starts empty.
    Effort: Medium.
  - **C.** B, and a cache on the disk in IndexedDB for each signed-in
    member. The chat stays on the device. Effort: Large.
- **Recommendation:** B.
- **Chosen:** B, by the user on 6 November 2026. Milestone 8i builds it.

### 88. Keep a small Markdown file from freezing the Files page

Added on 6 November 2026 from round 2 finding 6 of the Milestone 10
review.

- **Severity:** High. **Effort:** Small.
- **Source:** Review. **Category:** Security.
- **Background:** The Markdown preview fills each short table row with
  empty cells up to the header's width. The page then builds a grid of
  columns times rows, so a 1,202-byte file made 40,000 cells, and a 40 KB
  file froze the page.
- **Options:**
  - **B.** Skip the empty cells, with one wide cell for the rest of each
    row. A partial fix. Effort: Small.
  - **D.** Count the empty cells of all tables in one file. Past a fixed
    budget, such as 65,536, end the table and show the rest as text, as
    cmark-gfm and markdown-it do for one table. Effort: Small.
  - **F.** Measure the whole parsed file, and show the source when it is
    far larger than the file. Effort: Medium.
  - **C.** Render only the visible rows and columns. Effort: Large.
- **Recommendation:** D.
- **Chosen:** D, by the user on 6 November 2026. Milestone 10 applies it,
  and the Files rules of the workspaces protocol state the limit.

### 89. Start work in an empty repository

Added on 6 November 2026 from finding 5 of the Milestone 5 work.

- **Severity:** High. **Effort:** Medium.
- **Source:** Review. **Category:** Product bug.
- **Background:** A workspace branch starts from the default branch. A new
  GitHub repository with no commits has no default branch, so the start
  failed.
- **Options:**
  - **A.** An unborn workspace branch in the cloud computer. Effort: Small.
  - **B.** A, through one shared branch helper. Effort: Small.
  - **C.** A first commit in the cloud computer only. Effort: Small.
  - **E.** Refuse the start until the repository has a commit. Effort:
    Small.
  - **D.** Push an empty first commit to the default branch with the
    sender's GitHub token. Effort: Medium.
- **Recommendation:** D.
- **Chosen:** D, by the user on 6 November 2026. Milestone 5 applies it.

### 90. Copy a large repository into an org image build

Added on 6 November 2026 from finding 6 of the Milestone 5 work.

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review. **Category:** Product bug.
- **Background:** The Worker downloaded each repository and sent it into
  the build's cloud computer in 64 KiB parts, one Boat command each, in
  one background job, so that no GitHub token entered the org image. A
  1 GiB repository needed 16,384 commands.
- **Options:**
  - **D.** Larger Boat uploads, one repository per job. Effort: Medium.
  - **B.** A Git proxy in the Worker for builds. Effort: Medium.
  - **E.** The build clones straight from GitHub with a short-lived token.
    Effort: Medium.
  - **A.** Store the copy's progress across jobs. Effort: Large.
  - **C.** Move the copy into Cloudflare Workflows. Effort: Large.
- **Recommendation:** E.
- **Chosen:** E, by the user on 6 November 2026, from the question "can we
  not just delete the token after the git clone?". Each clone uses its
  own installation token, limited to that one repository and to reading.
  The token exists only in the clone command's environment, and Git
  writes it nowhere. The Worker revokes it right after the clone, before
  any repository code runs. Milestone 5 applies it, and the access
  protocol states it.

### 91. Show the live start steps of a new workspace

Added on 6 November 2026 from finding 7 of the Milestone 5 work.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review. **Category:** Product bug.
- **Background:** The create request answered only after the cloud
  computer started, so the browser could not follow the start steps.
- **Options:**
  - **D.** Answer when the workspace is stored. A later failure goes out
    as a workspace event, which returns the message to the composer.
    Effort: Medium.
  - **C.** Stream the progress through the create request. Effort: Large.
  - **E.** Keep a failed create as a workspace in an error state. Effort:
    Large.
- **Recommendation:** D.
- **Chosen:** D, by the user on 6 November 2026. Milestone 5 applies it.

### 94. Decide where the repositories live in a cloud computer

Added on 6 November 2026 from the check of round 2 finding 17 of the
Milestone 5 review.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Review. **Category:** Product bug.
- **Background:** The mockups and their sample install script put each
  repository at `~/code/<name>`. The build used internal folders, and the
  scripts got no path.
- **Options:**
  - **B.** Keep the internal folders, with one variable for each
    repository. Effort: Small.
  - **A.** Each repository at `~/code/<name>`. Effort: Small.
  - **C.** A, a variable with each repository's folder, and the startup
    script and the terminal of a workspace start in its repository's
    folder, as Conductor does. Effort: Small.
- **Recommendation:** C.
- **Chosen:** C, by the user on 6 November 2026. Milestone 5 applies it.


### 92. Keep the Mac CI jobs within budget

Added on 6 November 2026, when GitHub Actions stopped for a failed payment
or a spending limit.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Process.
- **Background:** The Mac workflow ran two Mac jobs on each push and pull
  request that changed `src/`. Mac minutes cost about ten times Linux.
- **Options:**
  - **A.** Raise the spending limit only. Effort: Small.
  - **B.** CI on pull requests, and on pushes to `main` and the primary
    branch only. Effort: Small.
  - **C.** B, and pull requests run only the Apple silicon job. Effort:
    Small.
  - **D.** C, and the Mac workflow runs nightly for web changes. Effort:
    Small.
- **Recommendation:** C.
- **Chosen:** C, by the user on 6 November 2026. The orchestrator applies
  it on the primary branch.

### 93. Give every request body a limit by default

Added on 6 November 2026 from PR #21 finding 10 and PR #20 item 4.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review. **Category:** Security.
- **Background:** Six handlers read their bodies with no limit, although
  decision 65 B gives one shared reader.
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **E.** A lint against direct body reads. Effort: Small.
  - **B.** A default 1 MB limit at the Worker entry, which a route can
    raise for itself. Effort: Medium.
- **Recommendation:** B.
- **Chosen:** B, by the user on 6 November 2026. Milestone 4g builds it.

### 95. Use a preview grant once

Added on 6 November 2026 from PR #20 round 1 finding 5.

- **Severity:** High. **Effort:** Small.
- **Source:** Review. **Category:** Security.
- **Background:** A used preview launch link worked again until its
  60-second grant expired.
- **Options:**
  - **D.** Keep the reusable grant. Effort: Small.
  - **B.** Each grant works once, with the one-use records of sign-in.
    Effort: Small.
  - **C.** The workspace Durable Object issues and uses up the grants.
    Effort: Medium.
- **Recommendation:** B.
- **Chosen:** B, by the user on 6 November 2026. Milestone 11a applies it.

### 96. Recover from a lost workspace update

Added on 6 November 2026 from item 1 of Milestone 8j.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** The updates that belong to no chat session are the file
  list, the changed-files list, the start steps, and the workspace name. A
  later full update of the same kind replaces each of them.
- **Options:**
  - **A.** A notice in the Files panel only. Effort: Medium.
  - **B.** A notice below the workspace header. Effort: Medium.
  - **D.** A notice beside the affected data. Effort: Medium.
  - **E.** After a lost update, the workspace asks the runner for a fresh
    full report of that kind, and the browser shows nothing. A notice
    shows beside the data, as in D, only when the fresh report is lost
    too. Effort: Medium.
- **Recommendation:** E.
- **Chosen:** E, by the user on 6 November 2026, from the question "some
  updates are basically replaced by a later update right, like the file
  list, it doesn't matter so long as we have the latest one?". Milestone
  7s adds the runner command and the failed repair to the contracts and
  the workspace, Milestone 7t answers the command in the runner, and
  Milestone 8l shows the notice of a failed repair.

### 97. Retry only the newest turn

Added on 6 November 2026 from the check of PR #24 round 1 finding 2.

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review. **Category:** Product bug.
- **Background:** The retry route checked only that a turn failed, so an
  old Try again could send an older message again.
- **Options:**
  - **A.** Rely on the chat, which shows Try again only on the newest
    turn. Effort: Small.
  - **D.** The session record names the one message that may be retried,
    and the route refuses any other with 409. Effort: Medium.
- **Recommendation:** D.
- **Chosen:** D, by the user on 6 November 2026. Milestone 8k builds it.

### 98. Keep Node types out of the production Worker

Added on 6 November 2026 from PR #2 finding 4, wider fix G.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review. **Category:** Code structure.
- **Background:** The Worker type project included the tests, so a
  Node-only import in Worker code passed the typecheck.
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** A lint against `node:` imports in `worker/`. Effort: Small.
  - **C.** Split the Worker type project into production and tests.
    Effort: Small.
- **Recommendation:** C.
- **Chosen:** C, by the user on 6 November 2026. Milestone 4h builds it.

### 99. Keep the Preview and Source switch

Added on 6 November 2026 from PR #14 round 2 finding 9, wider fix D.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Review. **Category:** Code structure.
- **Options:**
  - **A.** Keep the segmented control, with its own test. Effort: Small.
  - **D.** Build the switch from two links. Effort: Medium.
- **Recommendation:** A.
- **Chosen:** A, by the user on 6 November 2026. Nothing changes.


### 100. Rename the product to Conductive

Added on 6 November 2026 from the user's request: "can we change the name
from conducting to conductive - I have purchased conductive.build domain
we can use for it".

- **Chosen:** by the user on 6 November 2026. The product is
  "Conductive", on `conductive.build`, with the app on
  `app.conductive.build`. This replaces the name of decision 32.
- **Agent calls on 6 November 2026,** which the user can override:
  - Every form of the name changes, also the internal ones: the
    environment variables, the request header, the service names, the
    Mac app's name, bundle ID, and URL scheme, the D1 database name, the
    test domains, and the brand file names. Reason: nothing is deployed
    yet, and each internal name costs more to change after the first
    release.
  - Decision records keep the old name, because they are history.
  - Milestone 15j does the rename. It starts now and merges after the
    open milestones, so that it renames the names that they add.


### 101. Decide who owns the GitHub App

Added on 7 November 2026, when the user asked to set up the GitHub App and
Cloudflare.

- **Options:**
  - **A.** The Firna-AI organization.
  - **B.** The user's personal account.
- **Recommendation:** A.
- **Chosen:** A, by the user on 7 November 2026. The app is named
  "Conductive".

### 103. Let agents change GitHub workflow files

Added on 7 November 2026, with decision 101.

- **Background:** GitHub refuses a push that changes `.github/workflows/`
  unless the app has the Workflows permission.
- **Options:**
  - **A.** No Workflows permission.
  - **B.** The app asks for the Workflows permission, so agents can change
    CI files.
- **Recommendation:** B.
- **Chosen:** B, by the user on 7 November 2026.

## Design

Each item below is an agent call of 5 November 2026 unless it says
otherwise. The user can override any of them.

**Components.**

- The web app is React with Vite, and it uses `futex-ai/ui` components,
  published as `@firna/ui`. Reason: the user's shared component library
  already has the controls. On the web it needs only React and
  `lucide-react`.
- The repository is one npm package, laid out as `calummoore/twilight-timer`
  is: the web app under `src/`, the Worker and its Durable Objects under
  `worker/`, built by Vite with `@cloudflare/vite-plugin`, and served as
  Worker static assets. Reason: the user pointed to that repository on
  5 November 2026 as a working Cloudflare Worker setup. It replaces the
  three npm workspaces of the first plan.
- Parts that `@firna/ui` lacks live as local app components: link
  buttons and link tabs, notices, empty states, the file tree, the
  terminal frame, dense 26 px button wrappers, dense list rows, and the
  13 px type scale in token CSS. Reason: the library has none of them
  yet, and its smallest button is 30 px with 15 px body text. The wider
  fix adds them to the library, in
  `plans/follow-ups/firna-ui-missing-parts.md`.
- The repository `.npmrc` sets `legacy-peer-deps=true`. Reason: npm 11
  cannot install `@firna/ui` 4.0.0 on the web without it, because its
  optional `react-native` peer range is older than the newest
  `react-native`. The library's own package smoke test uses the same flag.
- The mockups use `@mokly/mokly` 0.18.0, the newest release, with no
  runtime patches. `futex-ai/accounting` pins 0.14.0 with three patches
  for a much larger catalogue.
- The Worker serves the API, the proxies, and the webhook endpoints. It
  holds the Boat key. Reason: the browser must never hold the key.
- D1 holds repositories, workspaces, and settings. Boat labels alone are
  not enough, because they are fixed after create or fork.
- One Durable Object per workspace holds the open tabs, the connection
  of the agent program, the idle timer, and the banner state. Its storage keeps the chat
  history, so a stopped workspace still shows it. It runs with the
  Western Europe location hint, near Boat's machines.
- A small `SandboxProvider` interface wraps the Boat client. Reason: a
  later change can add another provider or an own daemon.
- Chat events use our own event type, mapped from the SDK events by the
  agent runner. Reason: one event type serves both agents.

**Mockups.** The UI implementors made these calls in Milestones 1, 1a,
and 1b, and the orchestrator accepted them on 5 November 2026:

- The look is Graphite, which the user chose on 5 November 2026:
  dark-first, near-black with cool greys, one sky accent, dense 26 px
  rows and controls, 13 px Inter text, and monospace labels, with a
  matching light scheme. The tokens live in `docs/mockups/src/design/`.
- Desktop shows the org rail, the sidebar with the org name and the
  user's sections, the centre column, and the right column. The centre
  column has the workspace header, then closable tabs for agent sessions
  and open files, then the chat or the file page. The right column has
  the pull request bar, then the All files, Changes, and Checks lists,
  then the Terminal, Preview, and Desktop tabs. The sidebar and the right
  column resize from 200 to 360 px and from 320 to 640 px. Below 900 px
  the list moves to its own page.
- A phone shows an org switcher and the workspace list, then a workspace
  with a compact pull request row and five bottom tabs: Chat, Files,
  Terminal, Preview, and Desktop. Menus open as sheets, sessions are tabs
  above the chat, and files open as pages of the Files tab.
- Each workspace row shows a 3 by 3 dot-matrix mark: working, finished
  with unread output, ready, starting, stopped, or error. Each state has
  its own shape, so it never depends on colour alone. Bold means unread
  output.
- Deleting a section moves its workspaces to General, so nothing is lost.
- A selected tab is a filled pill, and the accent marks only what is
  active, so no box gets a coloured edge.
- Tabs are links, so each tool and file view has its own address.
- The user opens a port preview by typing its port. The plan has no port
  discovery.
- Environment variable values are write-only, so secrets never reach the
  browser.
- The Inter font ships in the repository with its licence, because the
  `@firna/ui` theme names it first.

**Users and sign-in.** The user decided these on 5 November 2026:

- Users bring their own Boat key, as decision 44 says. This reverses the
  earlier call that users run on the app's own Boat subscription.
- Users sign in with GitHub. No other sign-in method is offered.

**Orgs and members.** The user decided these on 5 and 6 November 2026,
in the answers to decisions 22, 24, 30, 39, 42, 44 to 49, 54, and 55:

- Each org runs on one Boat key, which an admin adds, as decisions 44, 46,
  and 54 say.
- The product is free for now, without billing or plan limits, as
  decision 45 says. Each Boat account's own plan limits apply.
- Anyone with a GitHub account can sign up, as decisions 22 and 48 say.
- Each workspace belongs to the user who created it, until it is
  reassigned. Each turn runs on the agent login of the person who sent
  the message, as decision 49 says.
- Delete org stops every machine and hides the org at once, and deletes
  everything after 7 days unless an admin restores it.
- Only a workspace's owner and the org's admins can archive the
  workspace.
- When a member leaves, their workspaces stay in the org, as decision 39
  says. They move to the admin who removed the member, or to the org's
  earliest admin.
- The roles are admin and member, as decision 54 says. The last admin
  can leave only after they make another member an admin, or by deleting
  the org, as decision 55 says.

Agent calls of 5 November 2026:

- Orgs get members, because a workspace can be reassigned to another
  user. An admin invites members by GitHub login. Only an admin can
  reassign a workspace or remove a member.
- A member who is not an admin sees the Members tab and each workspace's
  owner without actions.
- Only admins change the repositories, the install script, the startup
  script, and the env vars, as decision 57 says. Members see these tabs
  read-only.
- Agent call, 6 November 2026: only admins rename the org, and members
  see the General tab read-only. Reason: the admins manage the org's
  settings, as decisions 54 and 57 say.
- Agent call, 6 November 2026: the agent runner gets the sender's agent
  login over its connection for each turn, and never writes it to disk.
  Reason: Boat sets a sandbox's variables only at create and at resume,
  and decision 49 runs each turn on its sender's login.
- The app offers one machine size for now, Boat's default size of
  4 vCPU and 8 GB.
- A Boat key that Boat refuses counts as no key, so the composer notice of
  decision 33 shows.
- Only admins see the Boat key tab of the org settings. Its label names
  Boat, because it leads to the key screen, and a move to another
  provider renames both together.
- Get started has four steps: the GitHub App, the first org, the org's
  Boat key, and Claude or Codex. Reason: the key belongs to the org.
- Agent call, 6 November 2026, from Milestone 4: the Boat key needs the
  actions `account.read`, `sandbox.create`, `sandbox.read`,
  `sandbox.update`, `sandbox.stop`, `sandbox.resume`, `sandbox.fork`,
  `sandbox.delete`, `exec`, `snapshot.read`, and `snapshot.write`. Later
  milestones add `file.read`, `host`, and `desktop`. Boat's `ci` preset
  deletes only the sandboxes that its own key created, so the key screen
  asks for custom actions in place of the preset.
- Agent call, 6 November 2026: the health check and the GitHub sign-in
  with its callback need no sign-in. The callback checks its `state`
  value instead.

Decision 45 removed the plans, the seats, the compute pool, the overage,
the metering, the upgrade, and the free plan's limits on 5 November 2026.

**Orgs, sections, and the composer.** The user decided these on
5 November 2026, in feedback on the Graphite mockups:

- The icon rail lists the user's orgs, and the user can create orgs. Each
  org has its own settings. Repositories have no settings for now.
- The sidebar header shows the org name, with a Settings link on the
  right.
- Sidebar sections are groupings that the user defines. They are not
  tied to a repository. Each section collapses, and has a menu with three
  dots.
- Each workspace row shows a status mark on the left, in the style of
  Conductor's dot-matrix marks, then the title and the time. The marks on
  the right go away.
- The composer uploads files, chooses the agent, Codex or Claude only for
  now, and sets the effort level. The agent runner sets the model and the
  effort for each message, and passes the attachments.
- The Changes tab starts with a summary: the number of changed files and
  the added and removed lines.

The user added these requirements later on 5 November 2026:

- Files, diffs, and agent sessions open as closable tabs in the centre
  column, as in Conductor. "+" starts a new agent session in the same
  workspace, on the same branch and cloud computer. The right column keeps
  the pull request bar, the file lists, and the tool panel.
- The app names Boat only on the Boat key screen, on the marketing site,
  and in Get started, as decision 47 says. Everywhere else it says "cloud
  computer", so that it can move to another provider later.
- A new workspace starts as an empty chat window. The first message
  creates it. The branch is generated from a city name with a random
  suffix. The name is generated too.
- Touch targets on phones are at least 44 px high.
- Workspaces move between sections by drag and drop. Each section's menu
  can create a workspace in that section.
- One picker chooses the model and the effort level, such as "Opus 5.5
  Max". It does not show the words Claude or Codex.
- The success status mark is bright green. The ready mark stays muted.
- The left panel and the right panel are resizable. Agent call: each
  divider drags, and the app remembers the widths in the browser.

Agent call, 5 November 2026: the branch is `<GitHub login>/<city>-<four
random characters>`, such as `calummoore/lisbon-7k2q`, so branches stay
grouped by user. The workspace name starts as the city name. When the
agent's
first answer arrives, the Worker asks the agent for a title of three to
five words in a side conversation, and renames the workspace.

**Marketing site.** The user asked for it on 5 November 2026. Agent
call: the marketing site is a few static pages, public at the root of
the app domain, served from the Worker's static assets. The app moves to
an `app.` subdomain with GitHub sign-in. Reason: visitors must see the
site without signing in, and the app keeps one sign-in boundary.
Agent call, 5 November 2026: the main action keeps "Start free with
GitHub", and the site says that users need their own Boat account.
Reason: the app is free, as decision 45 says, and decision 47 names Boat
on the site.

Agent call, 5 November 2026: the copy says "agents powered by Claude and
Codex", not "Claude Code and Codex". Reason: Anthropic forbids "Claude
Code" in a product that builds on its Agent SDK, and in the feature names
of a product that runs Claude Code. The mockups change after Milestone 1d.

**Access and security.** These calls answer the user's question of
5 November 2026 on secure access to Boat.

- Users sign in with GitHub only, as the user decided on 5 November
  2026. Agent call: the app's GitHub App also signs users in, through its
  user authorization, so one app gives both the identity and the
  repository access. The Worker keeps the session in a signed cookie that
  is HttpOnly, Secure, and SameSite=Lax. This replaces Cloudflare Access.
- Agent call: each request checks that the signed-in user is a member of
  the org that owns the workspace that it names. Decision 22 decides who may sign in.
- Each Boat key is the user's own, as decision 44 says. The Worker
  stores it encrypted, uses it only for the cloud computers that it
  belongs to, and never sends it to the browser or into a cloud
  computer.
- Agent call: a git credential helper in the org image asks the Worker
  for a fresh GitHub token on each git operation, signed with the
  workspace token. Reason: GitHub App user tokens expire after 8 hours,
  and per-sandbox variables change only at a resume.
- The Worker calls only a fixed list of Boat routes. It has no general
  pass-through. Before each sandbox call, it checks that the sandbox
  belongs to a workspace of an org of the signed-in user in D1.
- Each hostname has one gate that runs before every route and every
  WebSocket upgrade. It checks the sign-in, a matching `Origin` header,
  and a JSON body for writes. Reason from the options check: an upgrade
  without an `Origin` check lets preview code open chat sockets.
- Webhooks and agent tools use a hostname without the sign-in gate.
  Their gate checks the webhook signature or the workspace token instead.
  Agent call: the agent runner and the git credential helper call this
  hostname for machines with the workspace token.
- The proxies forward only an allowlist of headers and cookies. They never
  forward the app's session cookie to Boat.
- The terminal socket runs on the app hostname. The Worker connects it to
  the private `ttyd` port with the Boat `_port_auth` cookie and a
  per-workspace `ttyd` password. Reason: sandbox code can make a port
  public with `host --public`, and the password still guards it.
- Port previews live on a separate registrable domain, as the user chose
  in decision 6. Each preview gets a random hostname one level under that
  domain, with at least 128 random bits. The hostname is the credential.
  Reason: frames then need no cookie, and Universal SSL covers one level.
- D1 maps each active preview hostname to its workspace and port. The
  workspace Durable Object revokes the hostname when the workspace stops,
  when the user closes the preview, and after 24 hours. Reason: a leaked
  hostname then stops working soon.
- The preview proxy adds the `_port_auth` cookie on the server side, and
  it drops any `_port_auth` cookie that the browser sends. It forwards
  the preview app's own cookies.
- The preview proxy sets `Referrer-Policy: no-referrer` on each response.
  Reason: the default policy sends the preview origin, which is the
  credential, to other sites.
- Each preview has an "Open in new tab" link. Reason: Safari blocks the
  preview app's own cookies inside a frame.
- The Worker asks Boat for a new desktop URL on each page load. The URL
  works for 10 minutes and carries its token in the fragment.
- The Worker verifies the signature of each GitHub webhook. The app does
  not depend on Boat webhooks, as decision 44 says.
- Each workspace sandbox gets its own workspace token as a sandbox
  variable. Agent tools can only create and list workspaces with it. The
  app sets no limit on the workspaces that agents create, as the user
  chose in decision 8.

**Workspaces and sandboxes.**

- Each org has one cloud computer image, a saved snapshot that bundles
  every repository that the org chose, as the user decided on 5 November
  2026. Reason from the user: one snapshot per org, not one per
  repository, which would get expensive fast.
- The user builds the image with "Build computer": it runs the install
  script on a copy of the image, with every chosen repository cloned,
  and replaces the image only when the build succeeds. A build keeps a
  history. Agent call: a failed build keeps the last good image.
- Agent call: a push to the default branch of a chosen repository
  refreshes the image at most once in 30 minutes, and a daily timer
  refreshes it too: resume a copy, fetch the new commits of every
  repository, save, and stop. A refresh does not run the install script.
  Reason: the first requirement keeps new workspaces to a small fetch,
  and each resume counts as a Boat start.
- A new workspace starts from the newest good image, with labels for the
  user, the repository, and the workspace. It then creates its branch in
  its repository's folder.
- Each workspace sandbox has a Boat auto-stop deadline as a safety net.
  The workspace Durable Object extends it while the user is active or an
  agent turn runs, as decisions 11 and 29 say. Reason: a new sandbox stops after one hour by default.
- Agent call: every workspace sandbox starts with `noEnv`, so that it gets
  none of the Boat account's secrets. It gets no agent login at start.
  The runner gets the sender's login for each turn, as decision 49 says.
  Git uses the sender's GitHub user token for each call, as decision 50
  says.
- The org settings keep a startup script, which runs in each workspace's
  cloud computer at each start and resume, and env vars. Decision 17 chose
  where the env vars live.
- A sandbox stops after 30 minutes with no user activity and no running
  agent turn, as decisions 11 and 29 say. Reason: a Boat stop ends all processes, so it must not cut off
  work. Opening the workspace resumes it, and the app shows a starting
  state until the runner reports ready.
- Near day 14 of a stop, the app starts the cloud computer briefly and
  stops it again, so that Boat keeps its disk, as decision 43 says.
- The terminal is `ttyd` as a systemd service in the org image,
  exposed as a private Boat port. Reason: Boat has no terminal API, and
  enabled services come back after each resume.

**Agents and tools.**

- A small Node program in each cloud computer, the agent runner, runs
  the agents, as decision 36 says. It uses the Claude Agent SDK for
  Claude, and the Codex SDK or the Codex App Server for Codex.
- The runner is an always-on systemd service, so it starts again after
  each resume. It opens one outbound WebSocket to the workspace Durable
  Object, with the workspace token. It numbers each event and keeps it
  until the Durable Object confirms it, so a dropped connection loses
  nothing.
- The Durable Object stores the events and sends them to the open tabs.
  It forwards prompts, messages sent during a turn, interrupts, and model
  and effort changes to the runner.
- The agent sessions live in the home folder, which Boat keeps across
  stop, resume, and fork.
- The runner reads the per-sandbox variables, such as the workspace
  token, from `/run/ascii-secrets/env.sh` before it starts the SDK. Reason: a
  systemd service does not get them.
- The runner reads the files of the Claude Code program as soon as its
  service starts, without a login, and the chat shows a starting state
  until the runner reports ready. The first turn then starts the agent
  with the sender's login, as decision 49 says. Reason: the first start
  after a resume took 6 to 8 s in the test, while Boat restored the disk.
- Agent call, 6 November 2026: the first turn of a workspace that an
  agent creates runs on the login of the person who sent the calling
  turn, as decision 49's rule gives.
- The runner combines the text deltas, about 50 a second, before it
  sends them.
- A message sent during a turn goes to the agent at once. The agent reads
  it at its next tool call, or at the end of a text-only turn.
- The chat shows a thinking state from the thinking token counts, because
  the agent streams no thinking text.
- The chat hides the messages that the SDK adds, such as "[Request
  interrupted by user]", and shows an interrupted turn as stopped, not as
  an error. It matches each result to its messages through
  `user_message_uuids`.
- Each chat session runs one Claude Code process of about 190 MB.
- Agent call, 6 November 2026, from the user's question about file
  lists: the agent runner also reports the workspace's files. It watches
  the repository and pushes the file tree and the changes summary against
  the default branch, with uncommitted and untracked work, over its
  connection. It sends one full list when it connects, then only the
  changes. It reads one file or one diff on request. The Durable Object
  keeps the last state, so the tabs update live and still show the last
  state while the cloud computer sleeps. Reason: Boat's API can run
  `git` and read files, but only while the machine runs, one request at a
  time, and with no live updates.
- Agent call, 5 November 2026: the runner connection carries a protocol
  version. The Durable Object serves each version that a live image or
  sandbox can hold, and each image build installs the newest runner.
  Reason: a stopped sandbox can resume weeks later with an old runner.
- Agents create workspaces through an MCP server and a CLI in the org image. Both call the Worker with the workspace token.
- Agents use the computer tools of the Cua Driver, the MCP server
  `computer` on every sandbox, for browser work. The app embeds the Boat
  desktop stream, so the user can watch.

**GitHub banner.** A GitHub App sends pull request, check, status, and
push webhooks. The Worker routes each event to the workspace of its
branch. When a tab opens, the Worker reads the current pull request and
check state from the GitHub API.

**Prerequisites from the user.** A Cloudflare account on Workers Paid.
Two domains on that account: one for the app, and a separate registrable
domain for port previews. A Boat key for development and tests, as
decision 44 says. For signed public Mac builds, later: an Apple Developer
ID with a notarization key, and a public repository for the release feed,
as decision 62 says. A GitHub App with its key. Anthropic's Commercial Terms, accepted
through an Anthropic Console account, because they govern products that
run Claude Code. Milestone 16 needs all of them. Earlier milestones use
fakes.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Set up the Mokly catalogue and draw every screen and flow of the plan,
each in a mobile and a desktop variant.

- [x] Set up `@mokly/mokly` under `docs/mockups`, with a build and a
      mockup check command. Follow the setup of `futex-ai/accounting`.
      Render the screens with `@firna/ui` components.
- [x] Draw the app shell with the workspace list, the GitHub banner, and
      the sandbox states: ready, starting, stopped, and error.
- [x] Draw the new workspace screen and the repository settings screen:
      base status, install software, startup script, and env vars.
- [x] Draw the workspace chat: messages, tool calls, the running state,
      steer, and interrupt.
- [x] Draw the files panel with All and Changes, and the Markdown and
      code preview.
- [x] Draw the terminal, the port preview with its "Open in new tab" link,
      and the desktop view.
- [x] Draw two flows: create a workspace, and reopen a stopped workspace.
- [x] Run the mockup check. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Milestone completed after the orchestrator reran the mockup check, the
lint, and the format check, checked the folder sizes, the edge borders,
and the copy, and looked at key screenshots. Evidence:
`.context/boat-native-remote-workspaces/reports/milestone-1-ui-implementor.md`
and `.context/boat-native-remote-workspaces/checks/`.

## Milestone 1a: Conductor-style visual design

Tags: mockup

Depends on: 1

The user asked on 5 November 2026 for a design that looks like Conductor,
sleek, professional, and polished, with the mockup on the home page of
`conductor.build` as the reference. Restyle every screen and flow of
Milestone 1. Keep the screens, the states, the flows, and the features of
the plan. Do not copy Conductor's name, logo, or brand assets. The user
then chose the Graphite direction on 5 November 2026. Conductor's layout
stays the structure, and Graphite sets the look.

- [x] Restyle the shared look: light neutral surfaces, hairline borders,
      a compact type scale, small radii, and few accent colours, with a
      matching dark scheme.
- [x] Rework the desktop layout as in the reference: the workspace list
      on the left, the chat in the centre, and a right column with the
      pull request bar above the files, changes, and checks tabs, and the
      terminal, preview, and desktop tabs below.
- [x] Restyle the chat: user messages in light bubbles on the right,
      plain agent text, collapsed tool-call summaries, file chips with
      line counts after a turn, and a composer that names the agent.
      Decision 19 decides an agent and model picker.
- [x] Restyle the phone layouts to the same look.
- [x] Ask the user to choose a design direction. The user asked on
      5 November 2026 to review five directions: Conductor, Graphite,
      Studio, Paper, and Soft. The user chose Graphite the same day, from
      their descriptions, and asked to remove the directions from the
      catalogue.
- [x] Apply Graphite to every screen and flow: dark-first, near-black with
      cool greys and one bright accent, dense, an icon rail beside the
      workspace list, and monospace labels, with a matching light scheme.
      Keep the layout from the Conductor reference.
- [x] Remove the design directions, their switching code, and the tokens
      of the other four directions from the catalogue.
- [x] Run the mockup check. Smoke-test the changed pages, and compare them
      with the reference images.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Milestone completed after the orchestrator reran the mockup check, the
lint, and the format check, looked for leftovers of the removed
directions, and looked at key screenshots in dark and light. Evidence:
`.context/boat-native-remote-workspaces/reports/milestone-1a-ui-implementor.md`
and `.context/boat-native-remote-workspaces/checks/shots-1a/`.

## Milestone 1b: Orgs, sections, and the composer

Tags: mockup

Depends on: 1a

Redraw the mockups for the user's feedback of 5 November 2026. Draw the
org settings as the recommendation of decision 21 says, and mark each
part that waits on an open decision.

- [x] Turn the icon rail into the org switcher, with a create action, and
      draw the create-org screen.
- [x] Show the org name in the sidebar header, with a Settings link.
- [x] Replace the repository settings screens with org settings, and
      remove the screens that only repository settings need.
- [x] Make sidebar sections user-defined, collapsible, and with a menu
      with three dots. Show how a workspace moves between sections.
- [x] Put a dot-matrix status mark on the left of each workspace row, and
      remove the marks on the right.
- [x] Add file uploads, the agent choice for Codex and Claude, the model,
      and the effort level to the composer and to the new workspace form.
- [x] Add the changes summary to the Changes tab.
- [x] Open files, diffs, and agent sessions as closable tabs in the
      centre column, with "+" for a new session.
- [x] Remove every mention of the sandbox provider.
- [x] Redraw new workspace as an empty chat window with generated names.
- [x] Make phone touch targets at least 44 px high.
- [x] Replace "Move to section" with drag and drop, and add "New
      workspace" to the section menu.
- [x] Combine the model and effort pickers into one.
- [x] Redraw the Sandbox page as the org's cloud computer, as the user
      asked: the build card with "Build computer" and its history, the
      install script with the preinstalled tools, the startup script, and
      the env vars. Move repositories to their own tab, and remove the
      bases and the install terminal.
- [x] Keep the file tab header on one line.
- [x] Show the resize handles of the left panel and the right column.
- [x] Run the mockup check. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show, and rewrite decisions 9, 10, 12, 13, and 17 for
      org settings.

Milestone completed after the orchestrator reran the mockup check, the
lint, and the format check, searched for provider and Conductor names,
and looked at key screenshots. Evidence:
`.context/boat-native-remote-workspaces/reports/milestone-1b-ui-implementor.md`
and `.context/boat-native-remote-workspaces/checks/shots-1b/`.

## Milestone 1c: Marketing website

Tags: mockup

Depends on: 1b

The user asked on 5 November 2026 for a marketing website like
Conductor's home page, with similar claims, in the Graphite design, and
honest to this app's features. Draw it in the Mokly catalogue first.

- [x] Draw the home page at phone and desktop sizes: a header, a hero
      with a real app screen, feature sections, a call to action, and a
      footer.
- [x] Claim only what the plan decides. Leave out customer logos,
      testimonials, user counts, certifications, a desktop or mobile
      app, an API, and any feature that waits on an open decision.
- [x] Draw the pricing section: the free plan and the $30 plan per user
      with its included compute and its overage, as decision 23 says.
- [x] Never name the sandbox provider.
- [x] Draw the GitHub sign-in page, and the first run after sign-in,
      which installs the GitHub App on the account that owns the user's
      repositories. Sign-up is open, as decision 22 says.
- [x] Run the mockup check. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show, including the product name.

Milestone completed after the orchestrator reran the mockup check, the
lint, and the format check, and looked at the whole page. Evidence:
`.context/boat-native-remote-workspaces/reports/milestone-1c-ui-implementor.md`
and `.context/boat-native-remote-workspaces/checks/shots-1c/`.

## Milestone 1d: Plans, billing, and members

Tags: mockup

Depends on: 1c

Draw the screens that the billing model and the org members need, as the
user decided on 5 November 2026.

- [x] Draw the org billing page in the org settings: the plan, the
      seats, the usage this month against the included pool, the
      overage so far, and links to upgrade and to manage payment.
- [x] Draw the upgrade flow to the paid plan, with the seat count, and
      the hand-off to Stripe Checkout.
- [x] Draw the limit states: a free org at 3 workspaces, at its 600
      minutes, and at its daily starts, and a free org that tries to
      invite a member, each with one way forward.
- [x] Draw the sign-up refusal for a GitHub account that is too new or
      has no verified email. Agent call: it names the reason and the fix,
      such as "Verify your email on GitHub" or the date when the account
      can sign up, because an error names what failed and how to recover.
- [x] Make "Get started" the only first run. Remove the shell first-run
      state and the not-connected create-org state, and point their
      links to "Get started". Agent call: two first runs would disagree.
- [x] Draw Delete org and the 7-day restore state.
- [x] Draw the session history menu under a history icon in the centre
      tab bar, and closing a tab while a turn runs.
- [x] Draw the org members page: invite by GitHub login, the roles, and
      removing a member.
- [x] Draw reassigning a workspace to another member, and show the owner
      of each workspace.
- [x] Run the mockup check. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.
- [x] Redraw the seats to follow the people. Remove Change seats and the
      seat picker. Show the member count and the price in the billing
      tab, the upgrade flow, and the members tab.
- [x] At the free workspace and minutes limits, show Upgrade to Team
      first and the free way forward second.
- [x] Draw Archive, as decision 16 says: the action on a workspace, the
      check for unpushed work, and the Archived group.
- [x] Draw Create org for a person who already owns a free org: the paid
      plan and the hand-off to Stripe Checkout.
- [x] Draw what a member who is not an owner sees in the org settings and
      in the owner menu.
- [x] Run the mockup check. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.
- [x] In the archived phone view, remove the Files, Terminal, Preview,
      and Desktop tabs, because the cloud computer is gone.
- [x] Show Archive only to the workspace's owner and the org's owners, as
      decision 42 says. Hide it in a member's view of another person's
      workspace.
- [x] Run the mockup check. Smoke-test the changed pages.

## Milestone 1e: Free product and own Boat keys

Tags: mockup

Depends on: 1d

Change the mockups for decisions 44 and 45.

- [x] Remove the billing tab, the upgrade flow, the plan limit states,
      the seats, the Team plan, and the pricing section of the marketing
      site.
- [x] Remove the free plan's limits and the paid Create org.
- [x] Draw the Boat key screen in the org settings, for org owners, with
      links to Boat's sign-up and key pages, as decisions 46 and 47 say.
- [x] Draw the first-run steps that connect the org's Boat key and the
      user's agent, and the composer notice for a missing key or agent,
      as decision 33 says.
- [x] Draw the agent Connect form: Claude with a token or a key, Codex
      with a key, and a connected login with Remove.
- [x] Rename the product to Conducting, on `conducting.build`.
- [x] Say on the marketing site and in Get started that users need their
      own Boat account. Keep "Start free with GitHub".
- [x] Remove the sign-up refusal, as decision 48 says.
- [x] Keep only the Terms and Privacy links, as decision 35 says.
- [x] Remove the expiring mark, because decision 43 keeps each stopped
      disk alive.
- [x] Draw the four added banner states of decision 18, and a branch
      without commits.
- [x] Run the mockup check. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 1f: Roles, logins, and branch names

Tags: mockup

Depends on: 1e

- [x] Rename the org role "owner" to "admin" in every screen, as decision
      54 says. Keep "owner" for the person who owns a workspace.
- [x] Change the reassign menu notes for decision 49: each message runs on
      the login of the person who sends it, and reassigning does not stop
      the cloud computer.
- [x] Mark the other agent's models in the picker as opening a new
      session, as decision 51 says.
- [x] Change the branch samples to the GitHub login, such as
      `calummoore/lisbon-7k2q`, as decision 53 says.
- [x] Run the mockup check. Smoke-test the changed pages.

## Milestone 1g: Read-only org settings for members

Tags: mockup

Depends on: 1f

- [x] Draw the Repositories and Cloud computer tabs read-only for a member
      who is not an admin, as decision 57 says.
- [x] Run the mockup check. Smoke-test the changed pages.

## Milestone 2a: Protocol updates for decisions 49 to 55

Depends on: 2

- [x] Update `docs/protocol/` and `docs/architecture.md` for decisions 49,
      51, 52, 53, 54, and 55, and remove their open-decision lines.

## Milestone 2: Documentation and protocol

Depends on: 1, 1a, 1b, 1c, 1d, 1e

State the requirements and the decisions in force for the work below.

- [x] Write `AGENTS.md` with the `agents-md` skill, and link `CLAUDE.md`
      to it.
- [x] Write `README.md` with the features, the setup, and the key code.
- [x] Write `docs/architecture.md` with the components and their
      boundaries.
- [x] Write the six protocol docs named under "Contract owners".
- [x] Add the build output to `.gitignore`.

## Milestone 3: Repository bootstrap

Depends on: 2

Create the app package and the complete gate, following the setup of
`calummoore/twilight-timer`.

- [x] Extend the root package with `src/` for the web app, `worker/` for
      the Worker, and `src/shared/` for the types that both use.
- [x] Add Vite with `@vitejs/plugin-react` and `@cloudflare/vite-plugin`,
      and serve the app as Worker static assets with the API first.
- [x] Add strict TypeScript, Vitest, and the 300-line file check, and
      extend ESLint and Prettier from the mockups to the app code.
- [x] Add one gate command and a GitHub Actions workflow that runs it.
- [x] Add the Wrangler configuration with D1 and the Durable Object
      binding. Do not deploy.
- [x] Build the package, and run the gate.
- [x] Add `dist` and `.wrangler` to the global ignores of ESLint, and add
      `.dev.vars` to `.gitignore` with the Wrangler configuration.

## Milestone 4: Worker core and Boat client

Depends on: 3

- [x] Add GitHub sign-in through the GitHub App, signed session cookies,
      and the user and org records.
- [x] Add the Boat client behind `SandboxProvider`, with the fixed route
      list and typed errors. It uses the Boat key that decision 46
      assigns.
- [x] Store each Boat key encrypted, test it once when it is saved, and
      never send it to the browser or into a cloud computer.
- [x] Refuse a new Boat key of another Boat account, as decision 56 says.
- [x] Confirm which Boat key actions the app needs, and match the key
      screen's text about the key preset.
- [x] Add the D1 schema and its migrations for repositories, workspaces,
      and settings.
- [x] Add the membership check and the `Origin` check.
- [x] Test the client and the checks against a fake Boat server.

## Milestone 4a: Contracts

Depends on: 4

Fix the interfaces that let the later milestones build at the same time,
as decision 58 says.

- [x] Define the API types between the web app and the Worker for every
      feature milestone, in `src/shared/`.
- [x] Define the message types between the agent runner and the workspace
      Durable Object: the protocol version, the event numbers, and the
      confirm and resend rules. Include the file tree, the changes
      summary, and file and diff reads.
- [x] Write the D1 tables that every feature milestone needs. Give each
      later milestone its own range of migration numbers.
- [x] Define the Worker's host routing: the marketing site at the root
      domain, the app at `app.`, and the hostname for machines.
- [x] Add a fake API server and recorded chat events, so that each screen
      milestone builds without its backend.
- [x] Add a fake runner, so that the Durable Object builds without a cloud
      computer.
- [x] Apply decision 60 A in the gate: a GET or HEAD read may come without
      `Origin`, a present `Origin` must match, and every write and socket
      upgrade needs a matching `Origin`.
- [x] Run the complete gate.

## Milestone 4b: Blocked banner state

Depends on: 4a

Add the Blocked state of decision 64. Milestones 13 and 14 build on it.

Agent call, 6 November 2026: use the Ban icon and the existing amber tone.
Add the `blocked` variant at `app/banner/blocked/blocked`, to keep the existing paths.

- [x] Add the Blocked state to the banner type in `src/shared/github.ts`,
      to the fake API, and to the banner mockups, at desktop and phone
      sizes. Branch: `conductor/boat-native-remote-workspaces-milestone-4b`.
- [x] Run the complete gate. Branch: `conductor/boat-native-remote-workspaces-milestone-4b`.

## Milestone 4c: Bounded body reads

Depends on: 9

Apply decision 65 B as changed by decision 84 A. The bounded reader of
the Milestone 9 file read is the base.

Agent call, 6 November 2026: replies above the new limits get HTTP 502
with fixed error text. Reason: the request was valid, but the provider
reply exceeded the Worker's budget.

- [x] Use one bounded body reader in the request gate, with a 1 MB limit
      for each JSON body. A larger body gets a 413 answer.
      Branch: `conductor/boat-native-remote-workspaces-milestone-4c`.
- [x] Share the content type check, bounded read, and JSON object check
      in one function. Name it in the HTTP README for later callers.
      Branch: `conductor/boat-native-remote-workspaces-milestone-4c`.
- [x] Use the same reader in the Boat transport, with a budget for each
      fixed Boat route: 1 MiB for account, lifecycle, snapshot, metadata,
      and error replies, and 18 MiB for command replies. Keep the file
      budget. A larger reply fails, also when Boat would allow it.
      Branch: `conductor/boat-native-remote-workspaces-milestone-4c`.
- [x] Test each Boat budget with a stream that counts its chunks. An
      oversized command reply says "The command output is too large."
      Branch: `conductor/boat-native-remote-workspaces-milestone-4c`.
- [x] Test an oversized body at the gate and at a Boat route, with a
      stream that counts its chunks. State the 1 MB limit in the access
      protocol. Branch: `conductor/boat-native-remote-workspaces-milestone-4c`.
- [x] Run the complete gate. Branch: `conductor/boat-native-remote-workspaces-milestone-4c`.

## Milestone 4d: Runner event limits

Depends on: 4a

Apply decision 76 E to the contracts. Milestone 7r builds the runner to
this contract.

Scope call on 6 November 2026: the user chose option D for review item 1.
This branch may update the Worker chat and files readers, tests, and
fakes. Missing required fields are invalid events. The default file
samples remain complete single-part reports. Separate samples cover
multipart reports. Production enforcement stays in Milestone 7s.

Agent calls on 6 November 2026, within decision 76 E:

- Measure the 1 MiB cap on compact UTF-8 JSON of the complete runner event
  envelope. This includes runner identity fields and leaves room for the
  workspace storage wrapper.
- Keep browser file reports complete. Use separate runner parts with a
  revision, part number, and part count. This preserves browser response
  shapes and keeps partial reports out of the browser.
- Cap each runner file-event payload at 256 KiB. Cap each tree delta at
  512 changes too. The byte cap bounds arbitrary path lengths. The count
  cap bounds the tree work of one event.
- Give trees and changes independent revision sequences within one
  runner stream. Number parts from 1. Keep confirmed parts across
  reconnects. Use newer full reports to recover missing or refused data.
  This permits complete reports without partial updates.
- Cap serialized tool detail at 64 KiB. Count omitted normalized source
  UTF-8 bytes before JSON escaping. Preserve null detail and whole
  Unicode code points. This keeps the excerpt and its count clear.
- Cap turn file summaries at 200 entries and 256 KiB of serialized array
  data. Count omitted files. This bounds the chat summary while the
  Changes response keeps the full list.
- Use workspace-only refusal markers with the three fixed reasons.
  Include verified turn context or null. Use `unknown` for an invalid
  event type. This names lost data without copying the refused payload.
- Keep runner protocol version 1. No runner is live, and Milestone 7r
  adopts this contract after merge.

Verification evidence: `.context/boat-native-remote-workspaces/checks/milestone-4d-verification.md`.

- [x] Add the byte limit of one stored runner event to the runner
      contract. Branch: `conductor/boat-native-remote-workspaces-milestone-4d`.
- [x] Send a full file tree and a long list of changes as several
      numbered parts. Cap the changes of one tree delta.
      Branch: `conductor/boat-native-remote-workspaces-milestone-4d`.
- [x] Give a tool's detail and the file list at the end of a turn a cap
      and a count of the rest.
      Branch: `conductor/boat-native-remote-workspaces-milestone-4d`.
- [x] Add the chat event that marks a refused runner event, with the
      stream, the event number, the event type, and the reason.
      Branch: `conductor/boat-native-remote-workspaces-milestone-4d`.
- [x] Update the fakes, the recorded events, and the chat and files
      protocol rules. Branch: `conductor/boat-native-remote-workspaces-milestone-4d`.
- [x] Apply option D to the current Worker readers and their test inputs.
      Preserve every existing assertion and keep multipart samples
      separate from the default single-part reports.
      Branch: `conductor/boat-native-remote-workspaces-milestone-4d`.

## Milestone 4e: Contracts for the app shell

Depends on: 4a

Give the app shell the contracts and fake replies that its approved
mockups need. Milestone 6 uses these replies before backend wiring.
Worker routes stay with the wiring and backend milestones.

Scope update, 6 November 2026: decision 80 returns the app to its own Boat
account. Drop the Boat key details and removal TODO. No org has a Boat key.

Agent calls, 6 November 2026:

- Keep initials and base image fields optional, so existing records in
  the Worker and open branches remain valid.
- Keep `repositoryIds` as GitHub's numeric IDs. The account repository
  list supplies those IDs before an org exists.
- Return the base image software with org settings, so both views of the
  Cloud computer tab can read the checked list.

Merge resolution: `.context/boat-native-remote-workspaces/merge-plan-resolution.diff`.

- [x] Add the org initials and chosen repositories to the create request.
      Add the repository list that the create screen reads.
      Branch: `conductor/boat-native-remote-workspaces-milestone-4e`.
- [x] Add the base image software list where the Cloud computer tab reads
      it. Check Boat's docs and record the source and date beside it.
      Branch: `conductor/boat-native-remote-workspaces-milestone-4e`.
- [x] Run the complete gate.
      Branch: `conductor/boat-native-remote-workspaces-milestone-4e`.

## Milestone 4f: The app's own Boat account

Depends on: 5, 6, 15a, 15c

Apply decision 80 before the first deployment.

- [ ] Run every cloud computer with the app's one Boat key, from a Worker
      secret. Remove the encrypted store of org keys and its routes.
- [ ] Remove the Boat key tab, the key repair of deleted orgs, and the key
      steps of Get started, in the screens and the mockups.
- [ ] Remove the Boat account requirement from the marketing site and
      Get started, so that the app names Boat to no user.
- [ ] Update the protocol docs, the architecture doc, and the naming rule
      of `AGENTS.md`.
- [ ] Run the complete gate.

## Milestone 4g: A default request body limit

Depends on: 4c

Apply decision 93 B.

- [ ] Pass every request body through one bounded stream at the Worker
      entry, 1 MB by default. A route that needs more, such as a file
      upload, declares its own limit there.
- [ ] Keep `readJsonObject` and `readBoundedJson` for parsing, and remove
      the copies that the default makes unneeded.
- [ ] Test the default, a raised limit, and a route that a later change
      adds. State the rule in the access protocol.
- [ ] Delete `plans/follow-ups/request-body-lint.md`, and close
      `plans/follow-ups/agent-tools-unbounded-body.md` when the default
      covers it.

## Milestone 4h: Worker types without Node

Depends on: none

Apply decision 98 C.

- [ ] Split `tsconfig.worker.json` into a production project without Node
      types and a test project with them, and check both in
      `npm run typecheck`.
- [ ] Fix each Node-only import or Node global that the split finds in
      production Worker code.
- [ ] Delete `plans/follow-ups/worker-typecheck-accepts-node-imports.md`.

## Milestone 5: Bases and workspace lifecycle

Depends on: 4a

- [ ] Build the org image from the install script and the chosen
      repositories, keep the build history, and refresh the image after
      pushes.
- [ ] Create a workspace: fork, labels, branch, and workspace token.
- [ ] Add the workspace Durable Object: tabs, idle stop, and resume on
      open.
- [ ] Record each start step with its time in the workspace Durable
      Object, and push it to the open tabs, as decision 20 says.
- [ ] Update the workspace state from the runner's reports, and read the
      sandbox state from Boat's API when the runner does not report.
- [ ] Add the daily refresh timer and the 30-minute push limit.
- [ ] Test the lifecycle against the fake Boat server.
- [ ] Near day 14 of a stop, start the cloud computer briefly and stop it
      again, as decision 43 says.
- [ ] Count user activity as decision 29 says, and stop after 30 minutes
      without activity or a running agent turn.
- [ ] Add the git credential helper to the org image, and the Worker's
      token route behind the workspace token. The route returns a fresh
      GitHub user token of the current turn's sender, as decision 50 says.

## Milestone 5a: Pinned Node runtime

Depends on: 5, 7r

Apply decision 69 C.

- [ ] In each org image build, download one pinned Node 24 release, check
      its SHA-256 against a constant in the code, and extract it to a
      folder named for its version under `/opt/conducting/runtime/`. Skip
      the download when that release is already there.
- [ ] Start the workspace tools and the agent runner with that Node by its
      full path. The root folder of the tools installer also prefixes the
      runtime path.
- [ ] Test with a stand-in runtime under the root folder and a failing
      `node` first on the search path. Say in the README how to update the
      version and the checksum.

## Milestone 6: App shell and workspaces

Tags: ui

Depends on: 4a

It builds against the fake API of Milestone 4a. Milestone 8i wires it.

- [x] Build the app shell, the workspace list, and the sandbox states,
      with the starting card and its steps.
      Branch: `conductor/boat-native-remote-workspaces-milestone-6`.
- [x] Add draggable dividers on both sides of the chat: one for the
      left panel and one for the right column. Remember the widths.
      Branch: `conductor/boat-native-remote-workspaces-milestone-6`.
- [x] Build the new workspace and the org settings screens.
      Branch: `conductor/boat-native-remote-workspaces-milestone-6`.
- [x] Compare each screen with its mockup.
      Branch: `conductor/boat-native-remote-workspaces-milestone-6`.
- [x] Build sections, Archive with its check and the Archived group, and
      Get started with its first-run steps.
      Branch: `conductor/boat-native-remote-workspaces-milestone-6`.
- [x] Build the account page with the stored agent logins, and the org
      settings. The Boat key screen is dropped by decision 80.
      Branch: `conductor/boat-native-remote-workspaces-milestone-6`.

## Milestone 7r: Agent runner

Depends on: 4a

- [ ] Build the agent runner: a small Node program that runs the Claude
      Agent SDK and Codex, installed as an always-on systemd service in
      every cloud computer.
- [ ] Connect the runner to the workspace Durable Object over one
      outbound WebSocket with the workspace token. Number the events,
      and resend each one that the Durable Object has not confirmed.
- [ ] Start each turn with the sender's agent login from the connection,
      and warm Claude Code without a login when the service starts.
- [ ] Test Codex streaming: the Codex SDK where it gives interrupt and
      partial text, and the Codex App Server otherwise. Save the result
      under `.context/`.
- [ ] Measure the first agent start after a resume over several runs,
      with the runner inside and outside the home folder. Keep the faster
      place.
- [ ] Watch the repository, and push the file tree and the changes summary
      against the default branch over the connection. Read one file or one
      diff on request.
- [ ] Test the runner against the fake Durable Object of Milestone 4a.

## Milestone 7: Chat backend

Depends on: 4a

- [x] Add prompt, message during a turn, interrupt, and model and effort
      endpoints. The Durable Object forwards them to the runner. Branch: `conductor/boat-native-remote-workspaces-milestone-7`.
- [x] Pass the sender's agent login to the runner for each turn, and start
      the agent again when the sender changes, as decision 49 says. Branch: `conductor/boat-native-remote-workspaces-milestone-7`.
- [x] Keep each session on one agent. A model of the other agent opens a
      new session with the draft, as decision 51 says. Branch: `conductor/boat-native-remote-workspaces-milestone-7`.
- [x] Map the SDK events to our event type, store them, and push them to
      the open tabs over a WebSocket. Branch: `conductor/boat-native-remote-workspaces-milestone-7`.
- [x] Test the mapping against recorded SDK events, and the resend after
      a dropped connection, with the fake runner of Milestone 4a. Branch: `conductor/boat-native-remote-workspaces-milestone-7`.

## Milestone 7s: Runner event limits in the workspace

Depends on: 4d, 7, 9

Apply decision 76 E in the workspace Durable Object.

- [ ] Check the byte limit with the other event checks.
- [ ] Store a marker for each event that the workspace refuses for a
      fixed reason, confirm it, and move the cursor on. A refused end of
      turn still ends the turn. A storage or network failure still closes
      the connection.
- [ ] Join the parts of a file tree and of a changes list before the
      files store takes them.
- [ ] Test each refusal, a tree in parts, and a resend after a refusal.
- [ ] Apply decision 96 E: add a runner command that asks for a fresh full
      report of the file list, the changes list, the start steps, or the
      workspace name. Send it once after the workspace refuses such an
      update. When the fresh report is refused too, store the marker as a
      failed repair. State both rules in the protocol.

## Milestone 7t: Fresh reports from the runner

Depends on: 7r, 7s

Apply the runner half of decision 96 E.

- [ ] Answer the fresh-report command of Milestone 7s with a full report
      of the asked kind: the file list and the changes list in numbered
      parts, the start steps, or the last workspace name.
- [ ] Test each kind, and a command during a running turn.

## Milestone 8: Chat UI

Tags: ui

Depends on: 4a

It builds against the fake API and the recorded events of Milestone 4a.
Milestone 8i or 15i wires it to its backend.

- [x] Build the chat with messages, tool calls, the running state,
      steer, and interrupt. Branch: `conductor/boat-native-remote-workspaces-milestone-8`.
- [x] Show the stored history while the sandbox is stopped or starting. Branch: `conductor/boat-native-remote-workspaces-milestone-8`.
- [x] Compare each screen with its mockup. Branch: `conductor/boat-native-remote-workspaces-milestone-8`.
- [x] Build several sessions as tabs, with the session history. Branch: `conductor/boat-native-remote-workspaces-milestone-8`.
- [x] Queue the messages that arrive before the sandbox is ready, and
      show the workspace title that the agent writes. Branch: `conductor/boat-native-remote-workspaces-milestone-8`.

Evidence: `.context/boat-native-remote-workspaces/milestone-8-verification.md`.

## Milestone 8j: Runner limits in the chat

Tags: ui

Depends on: 4d, 8

Decision 76 E: the runner caps the detail of a tool and the file list of
a finished turn, and counts the rest. The workspace stores a marker for
each runner event that it refuses. Milestone 4d keeps the counts and the
markers of each session in the chat state, but shows nothing. It drops a
marker that belongs to no session. Added on 6 November 2026 from round 1
finding 2 of the Milestone 4d review.

- [ ] Draw in the chat mockups how much tool detail and how many files the
      runner left out, and the line of a refused event, which names what
      was lost.
- [x] Draw where a marker that belongs to no session shows, and bring the
      pictures to the user. The user chose decision 96 E: the workspace
      repairs such a loss, and Milestone 8l shows a notice only for a
      failed repair. Branch: `conductor/boat-native-remote-workspaces-milestone-8j`.
- [ ] Show them in the chat screens.
- [ ] Compare each screen with its mockup.

## Milestone 8k: Retry only the newest turn

Depends on: 7s, 8j

Apply decision 97 D.

- [ ] The session record names the one message that Try again may retry:
      the retry message of the newest turn when that turn failed, or
      none.
- [ ] The retry route refuses any other message with 409. The chat shows
      Try again only on the failed item that the record names.
- [ ] Test an old Try again in a second tab, and update the chat protocol.
- [ ] Delete `plans/follow-ups/chat-retry-newest-turn.md`.

## Milestone 8l: Notices of a failed repair

Tags: ui

Depends on: 7s, 8j

Apply the browser half of decision 96 E.

- [ ] Show a notice beside the affected data only for a failed repair: in
      the Files panel for the file list and the changes list, and below
      the workspace header for the start steps and the workspace name. A
      newer complete report clears it.
- [ ] Keep the notices in the memory of the tab. A tab that opens later
      reads them from the stored history.
- [ ] Compare each screen with its mockup.

## Milestone 8i: Chat path wiring

Depends on: 5, 6, 7, 7r, 8, 8j

- [ ] Wire the app shell, the chat screens, the chat backend, and the
      runner together, with a real Boat sandbox.
- [ ] Keep the chat of each workspace that the tab showed in memory, as
      decision 87 says. A return to the workspace shows the chat at once,
      then gets only the events after its last event number. A reload or a
      new tab starts empty.
- [ ] Test the chat end to end: create a workspace, send a message, stream
      the answer, stop and resume, and send again.

## Milestone 16a: First deployment

Depends on: 8i

This milestone needs the prerequisites from the user.

- [ ] Deploy the chat path to the user's Cloudflare account, with GitHub
      sign-in, so that the user can work in Conducting.
- [ ] Smoke-test it with a real Boat sandbox.
- [ ] Check that chat survives a restart: send a message before the
      runner connects, deploy again, then check the history, the event
      numbers, and the delivery of the waiting message.

## Milestone 9: Files backend

Depends on: 4a

- [x] Keep the file tree and the changes summary that the runner pushes in
      the workspace Durable Object, and serve them to the Files and
      Changes tabs, also while the cloud computer sleeps. Branch: `conductor/boat-native-remote-workspaces-milestone-9`.
- [x] Read one file with a size limit, and one diff against the default
      branch, through the runner. Use Boat's file read when the runner is
      not connected. Branch: `conductor/boat-native-remote-workspaces-milestone-9`.
- [x] Test both against the fake runner and the fake Boat server. Branch: `conductor/boat-native-remote-workspaces-milestone-9`.

## Milestone 10: Files UI

Tags: ui

Depends on: 4a

It builds against the fake API and the recorded events of Milestone 4a.
Milestone 8i or 15i wires it to its backend.

- [x] Build the All and Changes lists, the Markdown and code preview,
      and the diff of a changed file. Branch: `conductor/boat-native-remote-workspaces-milestone-10`.
- [x] Compare each screen with its mockup. Branch: `conductor/boat-native-remote-workspaces-milestone-10`.

## Milestone 11: Terminal, previews, and desktop backend

Depends on: 4a

- [x] Add the `ttyd` service with a per-workspace password to the org image setup.
      Branch: `conductor/boat-native-remote-workspaces-milestone-11`.
- [x] Expose private ports, and proxy them with the `_port_auth`
      cookie, including WebSockets.
      Branch: `conductor/boat-native-remote-workspaces-milestone-11`.
- [x] Issue random preview hostnames on the preview domain, map them in
      D1, and revoke them on stop, on close, and after 24 hours.
      Branch: `conductor/boat-native-remote-workspaces-milestone-11`.
- [x] Set `Referrer-Policy: no-referrer` on each preview response.
      Branch: `conductor/boat-native-remote-workspaces-milestone-11`.
- [x] Add the desktop URL endpoint.
      Branch: `conductor/boat-native-remote-workspaces-milestone-11`.
- [x] Check whether an open desktop stream ends when its 10-minute URL
      expires. Save the result under `.context/`. If it ends, report a
      mockup gap for a Reconnect state.
      Branch: `conductor/boat-native-remote-workspaces-milestone-11`.
- [x] Test the proxy with a fake upstream: a revoked or unknown hostname
      gets no answer from the sandbox, and a browser `_port_auth` cookie
      never reaches it.
      Branch: `conductor/boat-native-remote-workspaces-milestone-11`.

## Milestone 11a: Preview credential in a cookie

Depends on: 11

Apply decision 83 C.

- [ ] Move the credential of a port preview out of its hostname, into a
      cookie that the preview domain sets, so that the hostname is no
      secret.
- [ ] Match `http` as well as `https` in the redirect rewrite.
- [ ] Update the port preview rules of the access protocol, and test the
      cookie, a leaked hostname, and both redirect schemes.
- [ ] Test that a port opened again after a revoke gets a new preview ID,
      as decision 86 says.

## Milestone 12: Terminal, previews, and desktop UI

Tags: ui

Depends on: 4a

It builds against the fake API and the recorded events of Milestone 4a.
Milestone 8i or 15i wires it to its backend.

- [x] Build the terminal with xterm.js, the port preview with its "Open
      in new tab" link, and the desktop frame. Branch: `conductor/boat-native-remote-workspaces-milestone-12`.
- [x] Compare each screen with its mockup. Branch: `conductor/boat-native-remote-workspaces-milestone-12`.

## Milestone 13: GitHub banner backend

Depends on: 4a

- [x] Receive and verify GitHub App webhooks. Branch: `conductor/boat-native-remote-workspaces-milestone-13`.
- [x] Route each event to the workspace of its branch, and push it to the
      open tabs. Branch: `conductor/boat-native-remote-workspaces-milestone-13`.
- [x] Read the current pull request and checks when a tab opens. Branch: `conductor/boat-native-remote-workspaces-milestone-13`.
- [x] Test with recorded webhook payloads. Branch: `conductor/boat-native-remote-workspaces-milestone-13`.

## Milestone 14: GitHub banner UI

Tags: ui

Depends on: 4a

It builds against the fake API and the recorded events of Milestone 4a.
Milestone 8i or 15i wires it to its backend.

- [x] Build the pull request bar of the right column, the compact pull
      request row on phones, and the Checks tab. Branch: `conductor/boat-native-remote-workspaces-milestone-14`.
- [x] Compare it with its mockup. Branch: `conductor/boat-native-remote-workspaces-milestone-14`.

## Milestone 15: Agent tools

Depends on: 4a

- [x] Add the create and list workspace endpoints for workspace tokens,
      as decision 52 says: create takes a repository and a first message,
      and can choose the agent and model, the effort, and the section.
      List returns the org's workspaces.
      Branch: `conductor/boat-native-remote-workspaces-milestone-15`.
- [x] Add the CLI and the MCP server to the org image setup.
      Branch: `conductor/boat-native-remote-workspaces-milestone-15`.
- [x] Test the token scope and both tools.
      Branch: `conductor/boat-native-remote-workspaces-milestone-15`.

## Milestone 15a: Members backend

Depends on: 4a

- [x] Add org members: invites by GitHub login, the admin and member
      roles, and removal. Branch: `conductor/boat-native-remote-workspaces-milestone-15a`.
- [x] Give each workspace an owner, the user who created it, and let an
      admin reassign it. Branch: `conductor/boat-native-remote-workspaces-milestone-15a`.
- [x] Refuse the last admin's leave until another member is an admin, as
      decision 55 says. Branch: `conductor/boat-native-remote-workspaces-milestone-15a`.
- [x] Allow only admins to change the repositories, the scripts, and the
      env vars, as decision 57 says. Branch: `conductor/boat-native-remote-workspaces-milestone-15a`.
- [x] Add Delete org with the 7-day restore, and remove the saved
      snapshots before each delete. Branch: `conductor/boat-native-remote-workspaces-milestone-15a`.
- [x] Test the reassignment and Delete org against the fake Boat server. Branch: `conductor/boat-native-remote-workspaces-milestone-15a`.

## Milestone 15c: Members UI

Tags: ui

Depends on: 4a

It builds against the fake API and the recorded events of Milestone 4a.
Milestone 8i or 15i wires it to its backend.

- [x] Build Delete org with its restore. Branch: `conductor/boat-native-remote-workspaces-milestone-15c`.
- [x] Show the Repositories and Cloud computer tabs read-only to members,
      as decision 57 says. Branch: `conductor/boat-native-remote-workspaces-milestone-15c`.
- [x] Build the org members page and workspace reassignment. Branch: `conductor/boat-native-remote-workspaces-milestone-15c`.
- [x] Compare each screen with its mockup. Branch: `conductor/boat-native-remote-workspaces-milestone-15c`.

## Milestone 15g: Email invitations

Depends on: 15a, 15c

Apply decision 78. It must merge before Milestone 15i wires the
acceptance route.

- [x] Change the contracts, the fakes, and the D1 schema so that an
      invitation names an email in place of a GitHub login. Branch: `conductor/boat-native-remote-workspaces-milestone-15g`.
- [x] Send each invitation by email through the email service of decision
      79. In development, a mailer writes the link to the log. Branch: `conductor/boat-native-remote-workspaces-milestone-15g`.
- [x] At sign-in, read the verified emails of the GitHub account, and show
      the pending invitations that name one of them. Cancel a departed
      member's pending invitations. Branch: `conductor/boat-native-remote-workspaces-milestone-15g`.
- [x] Change the invite form of the members mockups and screens to an
      email field. Branch: `conductor/boat-native-remote-workspaces-milestone-15g`.
- [x] Test with a fake GitHub that returns verified emails, and a fake
      mailer. Branch: `conductor/boat-native-remote-workspaces-milestone-15g`.

Agent calls, 6 November 2026:

- Keep verified emails in a private D1 table. Refresh them before a
  browser session or a desktop handoff, so neither flow uses stale emails.
- Keep a failed send pending for retry. Use the invitation ID and the
  message digest for Resend idempotency, so identical retries keep their key.
- Link to the app root with the invite ID in `?invite=`. Milestone 15i
  connects the pending invitation reader and explicit acceptance to the shell.
- Use the log mailer for loopback app origins and inject it in tests.
  Other origins need `RESEND_API_KEY`, so a missing key cannot report delivery.

Evidence: `.context/milestone-15g/` holds the delegated reports, test
proofs, migration proof, and screenshots of both schemes and sizes.

User approval, 6 November 2026, for round 1 finding 2 of the
[PR #22](https://github.com/Firna-AI/remote-code/pull/22) review: the user
chose option B. When a person removed an invited email from GitHub and
signed in, the refresh lost the match that cancels their invitations at
departure. A removed person could then verify the email again and accept.

- Each invitation keeps a durable match to each user whose verified email
  it named, at invitation or at sign-in.
- When a member leaves or an admin removes them, the same batch cancels
  the matched invitations of that org.
- Acceptance still needs a current verified email.
- The same request fixes the pending list. It leaves out the orgs where
  the user is already a member.
- The user approved a change in place to the unmerged migration
  `202611072100_email_invitations.sql`, because nothing is deployed.

## Milestone 15i: Feature wiring

Depends on: 8i, 9, 10, 11, 12, 13, 14, 15, 15a, 15c, 15g

- [ ] Wire each feature's screens to its backend inside the app shell.
- [ ] Connect the lifecycle hooks of the Milestone 15a members backend to
      the workspace Durable Object and the sandboxes. `deleteWorkspaceState`
      must delete the chat history of the workspace. Run
      `cleanupDeletedOrgs` on a Cron Trigger, so that Delete org removes
      everything of the org after 7 days, as the orgs protocol says.
      Added on 6 November 2026, because no milestone connected these hooks.
- [ ] Run the complete gate, and compare each screen with its mockup.

## Milestone 15j: Rename to Conductive

Depends on: none

Apply decision 100. Merge it after the milestones that are open when it
starts, and rename each name that they add.

- [ ] Change the name and the domain in `docs/mockups/src/brand.ts`, and
      in each text that names the product: `AGENTS.md`, the READMEs,
      `docs/`, the marketing site, the legal pages, the mockups, and the
      present-tense lines of the plan. Keep the decision records as they
      are.
- [ ] Rename the internal names: the `CONDUCTING_*` environment
      variables, the `X-Conducting-Turn-Id` header, the `conducting-*`
      services, the Mac app's name, bundle ID, and URL scheme, the D1
      database name, the test domains, and the brand file names.
- [ ] Redraw the name in the brand lockups of `docs/brand/`, and make the
      marketing pictures and the screenshots that show the name again.
- [ ] Merge the primary branch last, and rename each new occurrence. Then
      a search for "conducting" finds only decision records and history.

## Milestone 15d: Marketing site

Tags: ui

Depends on: 4a

- [x] Build the marketing site at the root of `conducting.build`, as
      Milestone 1c draws it. Branch: `conductor/boat-native-remote-workspaces-milestone-15d`.
- [x] Write the Terms and Privacy pages, as decision 35 says. A lawyer
      reviews them before the app opens to other people. Branch: `conductor/boat-native-remote-workspaces-milestone-15d`.
- [x] Compare each page with its mockup. Branch: `conductor/boat-native-remote-workspaces-milestone-15d`.

## Milestone 15e: Mac app

Depends on: 4a

Build the Mac app as decision 62 says. No other milestone waits for it.

- [x] Draw the Mac app window in the mockups first: the native window
      buttons inset at the top left of the left panel, with the sidebar
      toggle and the back and forward buttons beside them, in a normal
      window and in full screen.
- [x] Draw the device commands in the mockups first: the permission
      prompt with its four choices, the macOS notification, the countdown
      of the 15-minute window, the app's list of always-allowed commands,
      and the chat's tool states: waiting for approval, denied, done, and
      Mac not available.
- [x] Add `desktop/`, an Electron shell for macOS, as Mokly's
      `ts/desktop` does. It bundles the built web app and serves it from
      `conducting-app://desktop`. Branch: `conductor/boat-native-remote-workspaces-milestone-15e`.
- [ ] Give the window a hidden title bar with the native window buttons
      inset in the app's top bar, drag regions on the top bars, and the
      reserved space that full screen drops, as decision 62 says. Branch: `conductor/boat-native-remote-workspaces-milestone-15e`.
- [x] Let the Worker accept the desktop origin in the `Origin` check, in
      CORS for the API, and for the session cookie. Hand off the GitHub
      sign-in from the browser to the app through the `conducting://`
      scheme, with one app instance. Branch: `conductor/boat-native-remote-workspaces-milestone-15e`.
- [x] Keep the window bounds and the session across launches. Open other
      sites in the browser. Deny every permission except a sanitized
      clipboard write. Use no preload and no renderer bridge, and match
      the web app's content security policy. Branch: `conductor/boat-native-remote-workspaces-milestone-15e`.
- [x] Package DMG and ZIP builds for arm64 and x64 with electron-builder,
      with an ad-hoc signature for now. Add electron-updater on a GitHub
      release feed, off in development. Branch: `conductor/boat-native-remote-workspaces-milestone-15e`.
- [x] Add Playwright tests of the shell and a packaged launch check to CI. Branch: `conductor/boat-native-remote-workspaces-milestone-15e`.
- [x] Write `docs/protocol/desktop-app.md`, and update the README and the
      architecture doc. Branch: `conductor/boat-native-remote-workspaces-milestone-15e`.
- [x] Fix the frame navigation and updater review findings, and test the
      fixes. Branch: `conductor/boat-native-remote-workspaces-milestone-15e`.
- [x] Preserve local asset responses without sign-in settings, and verify
      ad-hoc signatures in PR packages. Branch: `conductor/boat-native-remote-workspaces-milestone-15e`.
- [x] Make the local web bootstrap compatible with the shared content
      policy. Use the React module preamble and accept matching local
      module origins when `APP_ORIGIN` is missing or empty. Branch: `conductor/boat-native-remote-workspaces-milestone-15e`.

## Milestone 15f: Mac device commands

Depends on: 15, 15e

Let agents run commands on the user's Mac, as decision 62 says. No other
milestone waits for it.

- [ ] Register the Mac as a device of the signed-in user while the app
      runs and the Mac is awake, over one connection to the Worker.
- [ ] Add the "run a command on the Mac" agent tool. Route each request to
      the Mac of the person who sent the turn, and answer "not available"
      when that Mac is not connected.
- [ ] Show the permission prompt with Deny, Allow, Always allow, and Allow
      all commands for 15 minutes, and a macOS notification when the app
      is in the background.
- [ ] Run the command with its time limit and an output limit, and return
      the output to the agent.
- [ ] Keep the always-allowed commands and the 15-minute window on the
      Mac, with Remove and Stop.
- [ ] Test the prompt choices, the time limits, and the offline answer.
      Update `docs/protocol/desktop-app.md` and
      `docs/protocol/agent-tools.md`.
- [ ] Set the workspace state to needs input while a command request
      waits, and back when the user answers it, as decision 68 says.

## Milestone 16: Deployment and live smoke test

Depends on: 15i, 15d, 16a

This milestone needs the prerequisites from the user.

- [ ] Deploy the Worker, D1, and the web app to the user's Cloudflare
      account, with GitHub sign-in.
- [x] Create the D1 database with the Western Europe location hint, near
      the workspace Durable Objects and Boat's machines. Cloudflare fixes
      the place of the database when it creates it. Added on 6 November
      2026. Done on 7 November 2026: `conductive`, in `WEUR`, with every
      merged migration applied. Branch: `calummoore/conductor-alternative-architecture`.
- [ ] Smoke-test with a real Boat sandbox: create a workspace, chat, open
      a file, use the terminal, open a preview, stop, and resume.
- [ ] Check that a private Boat port does not answer on the public
      address of the sandbox without its token.
- [ ] In a real workspace, run `conducting workspaces list` and an MCP
      `tools/list` request, so that the installed agent tools start on
      the image's Node.
- [ ] Kill ttyd once, and check that systemd restarts it with the same
      password, and that the terminal opens again without a new start.
- [ ] Check which forwarded headers Boat sends to a preview app, such as
      `X-Forwarded-Proto`, as decision 83 asks.

## Milestone 17: Verification, commit, review, and pull request

Depends on: every other milestone except 15e and 15f

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.
