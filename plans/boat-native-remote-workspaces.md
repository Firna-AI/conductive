# Boat-Native Remote Workspaces

Status: Active. On branch `calummoore/conductor-alternative-architecture`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductor Cloud goes read-only on 13 November 2026 and shuts down on
20 November 2026. This change builds a browser-only replacement. Users
sign in with GitHub and run on the app's own Boat subscription: one Boat
sandbox per workspace, chat with coding agents, a
file list and preview, a terminal, port previews, a GitHub banner, one
prepared cloud computer image per org, and agent tools that create
workspaces.
Nothing runs on the user's computer.

The chosen approach is a Boat-native app. A web app and a Cloudflare
Worker use Boat's own agents, files, port URLs, desktop stream, saved
snapshots, environments, and webhooks. There is no daemon of our own in
the sandbox. This change does not cover a mobile app or a provider
other than Boat. The brainstorm notes and sources are
in `.context/brainstorm/notes.md`.

Contract owners. Milestone 2 creates them:

- `docs/architecture.md`.
- `docs/protocol/workspaces-and-sandboxes.md`.
- `docs/protocol/access-and-security.md`.
- `docs/protocol/chat-and-events.md`.
- `docs/protocol/github-banner.md`.
- `docs/protocol/agent-tools.md`.
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

Open. Added on 5 November 2026 from the marketing mockups.

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

### 33. Connect an agent in the first run

Open. Added on 5 November 2026 from the marketing mockups.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The first run installs the GitHub App, then creates the
  first org. Decision 24 lets each user paste a Claude token or API keys
  on the account page.
- **Problem:** No step connects Claude or Codex, so a new user can send a
  first task with no agent.
- **Impact if no action:** The first task fails, and the user must find
  the account page alone.
- **Root question:** How does a new user get a working agent before the
  first task?
- **Options:**
  - **A.** Change nothing. The account page has Connect. Effort: Small.
  - **B.** Add a third first-run step that connects Claude or Codex.
    Effort: Small.
  - **C.** Show a notice in the composer when no agent is connected.
    Effort: Small.
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

### 34. Set the limits of the paid plan

Open. Added on 5 November 2026 from the marketing mockups.

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

Open. Added on 5 November 2026 from the marketing mockups.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The site offers open sign-up and a paid plan. The footer
  has no legal links. Stripe expects a business to show its terms and
  privacy policy. A follow-up item already adds terms that pass on the
  sandbox provider's rules.
- **Problem:** The plan has no Privacy or Terms page.
- **Impact if no action:** Billing in Milestone 15b can wait on legal
  pages.
- **Root question:** What must the site show and do before it sells
  subscriptions? The options check wrote this root question, because
  some rules need working functions, not only pages.
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
- **Recommendation:** D. The first recommendation was B, which misses
  items that Stripe checks and the EU withdrawal function. A lawyer
  should review the texts.
- **Action:** ask the user, because legal text is new content that no
  requirement covers.

### 36. Decide whether to run the agents through SDKs

Open. Added on 5 November 2026 from the user's questions about chat sync
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

Open. Added on 5 November 2026 from the Milestone 1d mockups. The options
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

Open. Added on 5 November 2026 from the Milestone 1d mockups. The options
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
- **Recommendation:** D. It covers every way to stop being a member, and
  an org always keeps an owner.
- **Action:** ask the user, because it adds behaviour that no requirement
  covers, and D rejects the last owner's leave.

### 40. Decide how seat changes are charged mid-period

Open. Added on 5 November 2026 from the options check of the Milestone
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

Open. Added on 5 November 2026 from the options check of the Milestone
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
- One Durable Object per workspace holds the open tabs, the idle timer,
  the event poll, and the banner state. Its storage keeps the chat
  history, so a stopped workspace still shows it. It runs with the
  Western Europe location hint, near Boat's machines.
- A small `SandboxProvider` interface wraps the Boat client. Reason: a
  later change can add another provider or an own daemon.
- Chat events use our own event type, mapped from Boat's events in the
  Worker. Reason: option C of decision 1 stays possible later.

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

- Users run on the app's own Boat subscription, not their own.
- Users sign in with GitHub. No other sign-in method is offered.

**Plans, billing, and members.** The user decided these on 5 November
2026, in the answers to decisions 22 to 30:

- Anyone with a GitHub account older than 30 days, with a verified
  email, can sign up.
- The org pays. A paid org pays $30 a month for each member's seat, and
  pays for all of its compute, including its image builds and refreshes.
- Each seat includes compute worth $15 at Boat's prices, so the app keeps
  half of the price when the org uses all of it. More use is charged at
  Boat's prices plus 10%.
- A free account gets one org with at most 3 workspaces that exist and
  600 minutes a month. Its image refreshes only when the user builds it,
  and builds count against the minutes.
- Billing uses Stripe Billing with Stripe Tax. The owner registers for
  and files the taxes.
- Each workspace belongs to the user who created it, until it is
  reassigned. Its agents use that user's own account.
- Delete org stops every machine and hides the org at once, and deletes
  everything after 7 days unless an owner restores it.

Agent calls of 5 November 2026:

- Orgs get members, because a workspace can be reassigned to another
  user. An owner invites members by GitHub login. The roles are owner
  and member. Only an owner can reassign a workspace or remove a member.
- A free org has one member, its owner. Inviting a member needs the paid
  plan, because the seat is the paid unit.
- The included compute of a paid org is a pool: $15 for each seat each
  month.
- The app offers one machine size for now, Boat's default size of
  4 vCPU and 8 GB. At $0.036 an hour, $15 of compute is about 416 hours.
- The app meters compute from Boat's usage report for each sandbox,
  which gives seconds and list-price dollars up to the moment of the
  request. It reads the final usage after each stop and before each
  delete. The report counts machine time only, so the app also counts
  the saved snapshot days and the builds of each org's image itself.
- Seats follow the people. Each member takes a seat, owners too, and a
  seat starts when the person accepts the invite. The owner buys no
  separate seat count. Reason: the user priced the paid plan at "$30 per
  user". Decision 40 sets how a seat change in the middle of a billing
  period is charged.
- At the free workspace and minutes limits, Upgrade to Team is the first
  action. The free way forward is the second: at the minutes limit,
  waiting for the next month, and at the workspace limit, the way that
  decision 41 sets. Reason: the user said that a free account "has to
  upgrade" at these limits.
- Reassigning a workspace stops its cloud computer first. Reason: Boat
  sets a sandbox's variables only at create and at resume, so the next
  start must pass the new owner's agent credentials.
- The billing tab shows the pool in hours of the standard machine. The
  app converts every cost in the pool at the machine price, also
  snapshot days and image builds. Reason: the marketing page uses hours,
  and one machine size makes the conversion exact.
- A member who is not an owner sees the Members tab and each workspace's
  owner without actions, and does not see the Billing tab. Reason:
  members need to know who is in the org, and only owners act on the
  bill.
- A person who already owns a free org creates each new org on the paid
  plan, and Create org hands off to Stripe Checkout. Reason: decision 25
  gives each free account one org.

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
  now, and sets the effort level. Boat's prompt API accepts a provider, a
  model, and a `reasoningEffort` level on each prompt, and attachments.
- The Changes tab starts with a summary: the number of changed files and
  the added and removed lines.

The user added these requirements later on 5 November 2026:

- Files, diffs, and agent sessions open as closable tabs in the centre
  column, as in Conductor. "+" starts a new agent session in the same
  workspace, on the same branch and cloud computer. The right column keeps
  the pull request bar, the file lists, and the tool panel.
- The sandbox provider stays behind the scenes. The app never names Boat,
  so that it can move to another provider later. The provider key is
  deployment configuration, not a user setting.
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
random characters>`, such as `cal/lisbon-7k2q`, so branches stay grouped
by user. The workspace name starts as the city name. When the agent's
first answer arrives, the Worker asks the agent for a title of three to
five words in a side conversation, and renames the workspace.

**Marketing site.** The user asked for it on 5 November 2026. Agent
call: the marketing site is a few static pages, public at the root of
the app domain, served from the Worker's static assets. The app moves to
an `app.` subdomain with GitHub sign-in. Reason: visitors must see the
site without signing in, and the app keeps one sign-in boundary.
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
- Agent call: each request checks that the signed-in user owns the org
  and the workspace that it names. Decision 22 decides who may sign in.
- The Boat key is a scoped key and a Worker secret. It has only the
  actions that the app uses, and no `account.admin` action. Its scope
  follows the answer to decision 5.
- Agent call: a git credential helper in the org image asks the Worker
  for a fresh GitHub token on each git operation, signed with the
  workspace token. Reason: GitHub App user tokens expire after 8 hours,
  and per-sandbox variables change only at a resume.
- The Worker calls only a fixed list of Boat routes. It has no general
  pass-through. Before each sandbox call, it checks that the sandbox
  belongs to a workspace of the signed-in user in D1.
- Each hostname has one gate that runs before every route and every
  WebSocket upgrade. It checks the sign-in, a matching `Origin` header,
  and a JSON body for writes. Reason from the options check: an upgrade
  without an `Origin` check lets preview code open chat sockets.
- Webhooks and agent tools use a hostname without Access. Their gate
  checks the webhook signature or the workspace token instead.
- The proxies forward only an allowlist of headers and cookies. They
  strip the Access cookie and every `Cf-Access-*` header before Boat.
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
- The Worker verifies the signature of each GitHub and Boat webhook.
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
  The workspace Durable Object extends it while a tab is open or an agent
  turn runs. Reason: a new sandbox stops after one hour by default.
- Agent call: every workspace sandbox is safe for third parties
  (`noEnv`), because other users now run on the app's Boat account. A
  sandbox gets only its user's GitHub token, limited to the org's
  repositories, and its user's agent credentials, as decision 24 says.
  It never gets the secrets of the Boat account.
- The org settings keep a startup script, which runs in each workspace's
  cloud computer at each start and resume, and env vars. Open decision 17
  decides where the env vars live.
- A sandbox stops after 30 minutes with no open tab and no running agent
  turn. Reason: a Boat stop ends all processes, so it must not cut off
  work. Opening the workspace resumes it, and the app shows a starting
  state until Boat reports it ready.
- The terminal is `ttyd` as a systemd service in the base snapshot,
  exposed as a private Boat port. Reason: Boat has no terminal API, and
  enabled services come back after each resume.

**Agents and tools.**

- Chat uses Boat's integrated agents: prompt, steer, interrupt, and
  conversations. The workspace Durable Object polls Boat's events with
  the `ETag` header, as decision 7 says. Decision 7 keeps streamed agent
  CLIs as the fallback.
- Agents create workspaces through an MCP server and a CLI in the base
  snapshot. Both call the Worker with the workspace token.
- Agents use Boat's built-in computer tools for browser work. The app
  embeds the Boat desktop stream, so the user can watch.

**GitHub banner.** A GitHub App sends pull request, check, status, and
push webhooks. The Worker routes each event to the workspace of its
branch. When a tab opens, the Worker reads the current pull request and
check state from the GitHub API.

**Prerequisites from the user.** A Stripe account with Stripe Tax, and
the tax registrations that it needs. A Cloudflare account on Workers
Paid. Two domains on that account: one for the app, and a
separate registrable domain for port previews. A Boat organization for
the app on a paid plan, as decision 5 says, with a scoped key and its
automatic top-up off. A GitHub App with its key and the "Email
addresses" read permission. Anthropic's Commercial Terms, accepted
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
- [ ] Redraw the seats to follow the people. Remove Change seats and the
      seat picker. Show the member count and the price in the billing
      tab, the upgrade flow, and the members tab.
- [ ] At the free workspace and minutes limits, show Upgrade to Team
      first and the free way forward second.
- [ ] Draw Archive, as decision 16 says: the action on a workspace, the
      check for unpushed work, and the Archived group.
- [ ] Draw Create org for a person who already owns a free org: the paid
      plan and the hand-off to Stripe Checkout.
- [ ] Draw what a member who is not an owner sees in the org settings and
      in the owner menu.
- [ ] Run the mockup check. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1, 1a, 1b, 1c, 1d

State the requirements and the decisions in force for the work below.

- [ ] Write `AGENTS.md` with the `agents-md` skill, and link `CLAUDE.md`
      to it.
- [ ] Write `README.md` with the features, the setup, and the key code.
- [ ] Write `docs/architecture.md` with the components and their
      boundaries.
- [ ] Write the five protocol docs named under "Contract owners".
- [ ] Add the build output to `.gitignore`.

## Milestone 3: Repository bootstrap

Depends on: 2

Create the app package and the complete gate, following the setup of
`calummoore/twilight-timer`.

- [ ] Extend the root package with `src/` for the web app, `worker/` for
      the Worker, and `src/shared/` for the types that both use.
- [ ] Add Vite with `@vitejs/plugin-react` and `@cloudflare/vite-plugin`,
      and serve the app as Worker static assets with the API first.
- [ ] Add strict TypeScript, Vitest, and the 300-line file check, and
      extend ESLint and Prettier from the mockups to the app code.
- [ ] Add one gate command and a GitHub Actions workflow that runs it.
- [ ] Add the Wrangler configuration with D1 and the Durable Object
      binding. Do not deploy.
- [ ] Build the package, and run the gate.

## Milestone 4: Worker core and Boat client

Depends on: 3

- [ ] Add GitHub sign-in through the GitHub App, signed session cookies,
      and the user and org records.
- [ ] Add the Boat client behind `SandboxProvider`, with the fixed route
      list and typed errors. Its key is limited to the app's own Boat
      environment.
- [ ] Add the D1 schema and its migrations for repositories, workspaces,
      and settings.
- [ ] Add the ownership check and the `Origin` check.
- [ ] Test the client and the checks against a fake Boat server.

## Milestone 5: Bases and workspace lifecycle

Depends on: 4

- [ ] Build the org image from the install script and the chosen
      repositories, keep the build history, and refresh the image after
      pushes.
- [ ] Create a workspace: fork, labels, branch, and workspace token.
- [ ] Add the workspace Durable Object: tabs, idle stop, and resume on
      open.
- [ ] Record each start step with its time in the workspace Durable
      Object, and push it to the open tabs, as decision 20 says.
- [ ] Receive and verify Boat webhooks, and update the workspace state.
- [ ] Add the daily refresh timer and the 30-minute push limit.
- [ ] Test the lifecycle against the fake Boat server.

## Milestone 6: App shell and workspaces

Tags: ui

Depends on: 5

- [ ] Build the app shell, the workspace list, and the sandbox states,
      with the starting card and its steps.
- [ ] Add draggable dividers on both sides of the chat: one for the
      left panel and one for the right column. Remember the widths.
- [ ] Build the new workspace and the org settings screens.
- [ ] Compare each screen with its mockup.

## Milestone 7: Chat backend

Depends on: 5

- [ ] Add prompt, steer, and interrupt endpoints.
- [ ] Poll Boat events in the workspace Durable Object while a tab is
      open: every 250 ms during a turn, every few seconds otherwise, and
      not at all with no tab.
- [ ] Measure how often Boat's partial events change during a turn.
      Save the result under `.context/`. Open decision 7 again if they
      lag.
- [ ] Map Boat events to our event type, store them, and push them to
      the open tabs over a WebSocket.
- [ ] Test the mapping and the poll cursor against recorded events.

## Milestone 8: Chat UI

Tags: ui

Depends on: 6, 7

- [ ] Build the chat with messages, tool calls, the running state,
      steer, and interrupt.
- [ ] Show the stored history while the sandbox is stopped or starting.
- [ ] Compare each screen with its mockup.

## Milestone 9: Files backend

Depends on: 5

- [ ] List files, and read one file with a size limit.
- [ ] List changes and diffs from `git status` and `git diff`.
- [ ] Test both against the fake Boat server.

## Milestone 10: Files UI

Tags: ui

Depends on: 6, 9

- [ ] Build the All and Changes lists, the Markdown and code preview,
      and the diff of a changed file.
- [ ] Compare each screen with its mockup.

## Milestone 11: Terminal, previews, and desktop backend

Depends on: 5

- [ ] Add the `ttyd` service with a per-workspace password to the base
      snapshot setup.
- [ ] Expose private ports, and proxy them with the `_port_auth`
      cookie, including WebSockets.
- [ ] Issue random preview hostnames on the preview domain, map them in
      D1, and revoke them on stop, on close, and after 24 hours.
- [ ] Set `Referrer-Policy: no-referrer` on each preview response.
- [ ] Add the desktop URL endpoint.
- [ ] Check whether an open desktop stream ends when its 10-minute URL
      expires. Save the result under `.context/`. If it ends, report a
      mockup gap for a Reconnect state.
- [ ] Test the proxy with a fake upstream: a revoked or unknown hostname
      gets no answer from the sandbox, and a browser `_port_auth` cookie
      never reaches it.

## Milestone 12: Terminal, previews, and desktop UI

Tags: ui

Depends on: 6, 11

- [ ] Build the terminal with xterm.js, the port preview with its "Open
      in new tab" link, and the desktop frame.
- [ ] Compare each screen with its mockup.

## Milestone 13: GitHub banner backend

Depends on: 5

- [ ] Receive and verify GitHub App webhooks.
- [ ] Route each event to the workspace of its branch, and push it to the
      open tabs.
- [ ] Read the current pull request and checks when a tab opens.
- [ ] Test with recorded webhook payloads.

## Milestone 14: GitHub banner UI

Tags: ui

Depends on: 6, 13

- [ ] Build the pull request bar of the right column, the compact pull
      request row on phones, and the Checks tab.
- [ ] Compare it with its mockup.

## Milestone 15: Agent tools

Depends on: 5

- [ ] Add the create and list workspace endpoints for workspace tokens.
- [ ] Add the CLI and the MCP server to the base snapshot setup.
- [ ] Test the token scope and both tools.

## Milestone 15a: Members, plans, and limits backend

Depends on: 5

- [ ] Add org members: invites by GitHub login, the owner and member
      roles, and removal.
- [ ] Give each workspace an owner, the user who created it, and let an
      org owner reassign it.
- [ ] Use the workspace owner's agent credentials, and record the
      workspace's compute use against its owner.
- [ ] Enforce the plan limits of decisions 23 and 25 before each create
      and each start: workspaces, minutes, starts a day, and members of a
      free org.
- [ ] Check the GitHub account age and the verified email at sign-up.
- [ ] Add Delete org with the 7-day restore, and read the final usage
      and remove the saved snapshots before each delete.
- [ ] Test the limits and the reassignment against the fake Boat server.

## Milestone 15b: Billing backend

Depends on: 15a

- [ ] Add Stripe Billing with Stripe Tax: the free plan, the paid plan
      at $30 a seat, the included compute pool of $15 a seat, and the
      overage at Boat's prices plus 10%, billed to the org.
- [ ] Meter compute from Boat's usage of each sandbox, and report it to
      the billing provider.
- [ ] Handle the billing provider's webhooks: upgrade, payment failure,
      and cancel.
- [ ] Test the metering and the webhooks with recorded payloads.

## Milestone 15c: Members and billing UI

Tags: ui

Depends on: 6, 15a, 15b

- [ ] Build the org billing page, the upgrade flow, the limit states,
      the sign-up refusal, and Delete org with its restore.
- [ ] Build the org members page and workspace reassignment.
- [ ] Compare each screen with its mockup.

## Milestone 16: Deployment and live smoke test

Depends on: 8, 10, 12, 14, 15, 15c

This milestone needs the prerequisites from the user.

- [ ] Deploy the Worker, D1, and the web app to the user's Cloudflare
      account, with GitHub sign-in.
- [ ] Smoke-test with a real Boat sandbox: create a workspace, chat, open
      a file, use the terminal, open a preview, stop, and resume.
- [ ] Check that a private Boat port does not answer on the public
      address of the sandbox without its token.

## Milestone 17: Verification, commit, review, and pull request

Depends on: every other milestone

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
