# Boat-Native Remote Workspaces

Status: Active. On branch `calummoore/conductor-alternative-architecture`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductor Cloud goes read-only on 13 November 2026 and shuts down on
20 November 2026. This change builds a browser-only replacement for one
user first: one Boat sandbox per workspace, chat with coding agents, a
file list and preview, a terminal, port previews, a GitHub banner, a
prepared base per repository, and agent tools that create workspaces.
Nothing runs on the user's computer.

The chosen approach is a Boat-native app. A web app and a Cloudflare
Worker use Boat's own agents, files, port URLs, desktop stream, saved
snapshots, environments, and webhooks. There is no daemon of our own in
the sandbox. This change does not cover other users, billing, a mobile
app, or a provider other than Boat. The brainstorm notes and sources are
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
- **Root question:** How do we limit what the app's Boat key can reach?
- **Options:**
  - **A.** Keep one account key, and rely on the D1 check. Effort: Small.
  - **F.** Give the app its own Boat organization, whose key sees nothing
    else. Set a 365-day key lifetime and a dated rotation. Register the
    Boat webhook by hand, because it needs `account.admin`. A seat costs
    the plan price, and it adds its full included time. Effort: Small.
  - **G.** Added by the second options check: put the app's sandboxes in
    their own Boat environment, and limit the Worker key to it. Boat then
    refuses every other sandbox. Effort: Small.
- **Left out:** Per-sandbox keys, because minting them needs
  `account.admin` in the Worker.
- **Wider fix:** G.
- **Recommendation:** G. The first recommendation was F. G gives the same
  limit at no cost. F also separates the start limits from ciproxy.
- **Action:** applied as an agent call. Decision 5 is closed.

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

### 9. Keep only saved software in the base

Open. Added on 5 November 2026 from the mockups of Milestone 1.

Changed on 5 November 2026: the user moved every setting from
repositories to orgs, and repositories have no settings for now. This
decision now applies to org settings. Its options are rewritten after
decision 21 settles what an org owns.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** "Install software" opens a terminal on the base. The
  mockup offers Cancel and "Save to base".
- **Problem:** The plan does not say what Cancel does. The base keeps the
  unsaved installs, and the next automatic update saves them. Nothing
  stops an automatic update during an install session.
- **Impact if no action:** Cancelled software can reach every new
  workspace, and an update can save a half-done install.
- **Root question:** How does each change to a base, made by the user or
  by an update, land whole or not at all? The options check wrote this
  root question, because Cancel and the update race are one problem.
- **Options:**
  - **A.** Cancel restores the base from its last good saved snapshot.
    Automatic updates wait while an install session is open. Effort:
    Medium.
  - **B.** Install sessions and updates each work on a fork of the newest
    good snapshot, one at a time. Save stores the fork, and Cancel
    deletes it. Effort: Medium.
- **Left out:**
  - C, remove Cancel so that leaving the screen saves: it saves half-done
    installs and keeps the race.
  - D, from the options check, installs only in the setup script and no
    base terminal: it drops "Install software", which the task asks for.
- **Wider fix:** B. Every base change is then one complete step.
- **Related:** Decisions 12 and 13 change the same base update path.
- **Recommendation:** B. The first recommendation was A. Boat cannot
  restore a sandbox in place. The only way back is a new sandbox from a
  saved snapshot, so A needs the step of B anyway.
- **Action:** ask the user, because the option adds base behaviour that
  no requirement covers.

### 10. Add a repository to the app

Open. Added on 5 November 2026 from the mockups of Milestone 1.

Changed on 5 November 2026: the user moved every setting from
repositories to orgs, and repositories have no settings for now. This
decision now applies to org settings. Its options are rewritten after
decision 21 settles what an org owns.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Each workspace starts from the base of its repository.
  The plan creates bases, but no screen or endpoint adds a repository.
  The mockups draw `app/repository-settings/add-repository` and a first
  run with one action, Add repository.
- **Problem:** Nothing lets the user add a GitHub repository and prepare
  its first base.
- **Impact if no action:** The user cannot start without editing D1 by
  hand.
- **Root question:** How does a repository join the app?
- **Options:**
  - **A.** Build the drawn screen. The user picks a repository that the
    GitHub App can reach, with an optional startup script. Milestone 5
    lists the repositories and prepares the first base. Effort: Medium.
  - **B.** Add every repository that the GitHub App can reach, each with
    a base. Effort: Medium.
  - **C.** Seed repositories in D1 by hand. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. This is a missing feature.
- **Recommendation:** A, with its scripts stored as option E of decision
  13 says. The user chooses which repositories cost a base. The options
  check found that Boat's own repository list is no choice here: Boat
  clones every repository of an environment into every sandbox.
- **Action:** ask the user, because the option adds a GitHub read and a
  base step that no requirement covers.

### 11. Stop sandboxes of forgotten tabs

Open. Added on 5 November 2026 from the mockups of Milestone 1.

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

### 12. Update the base by hand

Open. Added on 5 November 2026 from the mockups of Milestone 1.

Changed on 5 November 2026: the user moved every setting from
repositories to orgs, and repositories have no settings for now. This
decision now applies to org settings. Its options are rewritten after
decision 21 settles what an org owns.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** A push or the daily timer updates the base. The
  mockups draw "Update now", and "Try again" on a failed update.
- **Problem:** The plan has no manual update, so a failed update has no
  recovery until the next push or the next day.
- **Impact if no action:** New workspaces can keep an old base for a day.
- **Root question:** How does the user get a fresh base when they need
  one?
- **Options:**
  - **A.** Add a manual update with the drawn "Update now" and "Try
    again" buttons. Effort: Small.
  - **B.** Update automatically when the user saves the startup script,
    with no buttons. Effort: Small.
  - **C.** A and B together. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Related:** Decisions 9 and 13 change the same base update path.
- **Recommendation:** C. The first recommendation was A. With a separate
  setup script, a saved script otherwise waits up to a day. A save is a
  user action, so the user still controls each paid start.
- **Action:** ask the user, because the option adds an update action
  that no requirement covers.

### 13. Separate base setup from sandbox start

Open. Added on 5 November 2026 from the mockups of Milestone 1.

Changed on 5 November 2026: the user moved every setting from
repositories to orgs, and repositories have no settings for now. This
decision now applies to org settings. Its options are rewritten after
decision 21 settles what an org owns.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** A base update runs the startup script, then saves the
  base. The Boat environment also runs the script at each sandbox start.
- **Problem:** One script prepares the base and starts each sandbox, so
  installs such as `npm ci` run again at every start and every resume.
- **Impact if no action:** Each start and resume waits for a full
  install.
- **Root question:** Which repository commands run at which moment, and
  who runs them? The options check wrote this root question.
- **Options:**
  - **A.** Keep one script, and ask the user to keep it fast. Effort:
    Small.
  - **B.** Two scripts: a setup script for base updates, and a start
    script for each sandbox start. Effort: Small.
  - **C.** Run the script only at base updates. Long-running services
    become systemd services in the base. Effort: Small.
  - **D.** Added by the options check: a setup script at base updates,
    and a run script that the user starts in the app. Effort: Medium.
  - **E.** Added by the options check: as B, but the Worker runs both
    scripts from D1 as Boat commands, and the app shows their output.
    The Boat environment keeps only shared logins. Effort: Small.
- **Left out:** None.
- **Wider fix:** E. It also settles where decision 10 stores scripts.
- **Related:** Decisions 9 and 12 change the same base update path.
  Decision 17 stores the env vars.
- **Recommendation:** E. The first recommendation was B. Boat runs every
  repository setup script of an environment in every sandbox at each
  start, so per-repository scripts cannot live in one Boat environment.
- **Action:** ask the user, because the option changes what the user
  configures for each repository.

### 14. Accept messages before the sandbox is ready

Open. Added on 5 November 2026 from the mockups of Milestone 1.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** The mockups accept a first message in the new
  workspace form and while a sandbox starts. Such a message shows "Sends
  when the sandbox is ready".
- **Problem:** The plan does not say whether the app accepts a message
  before the sandbox is ready.
- **Impact if no action:** Milestone 7 can refuse these messages, and
  the drawn create flow then fails.
- **Root question:** Can the user give the agent work before the
  sandbox is ready?
- **Options:**
  - **A.** Queue messages in the workspace Durable Object, and send them
    when the sandbox is ready. Effort: Small.
  - **B.** Disable the composer until the sandbox is ready. Effort:
    Small.
  - **C.** Added by the options check: as A, and a message sent in a
    stopped workspace resumes it. Effort: Small.
- **Left out:** A queue in the browser, because a closed tab loses the
  message.
- **Wider fix:** None.
- **Recommendation:** A. The user writes the task once, and the agent
  starts at the earliest moment. C removes the drawn Resume bar, which
  decision 11 keeps.
- **Action:** ask the user, because the option adds a message queue that
  no requirement covers.

### 15. Make the web app work on phones

Open. Added on 5 November 2026 from the mockups of Milestone 1.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Docs or spec.
- **Background:** Every mockup has a mobile and a desktop layout. A phone
  shows the workspace list, then a workspace with tabs for Chat, Files,
  Terminal, Preview, and Desktop.
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

### 16. Remove finished workspaces from the list

Open. Added on 5 November 2026 from the mockups of Milestone 1.

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

### 17. Store the env vars of each repository

Open. Added on 5 November 2026 from the options check of the mockup
decisions.

Changed on 5 November 2026: the user moved every setting from
repositories to orgs, and repositories have no settings for now. This
decision now applies to org settings. Its options are rewritten after
decision 21 settles what an org owns.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation. **Category:** Security.
- **Background:** The mockups set env vars for each repository, with
  write-only values. The design keeps them in the app's one Boat
  environment. Boat applies a saved environment change to a sandbox only
  after an upgrade call for that sandbox. Boat can also attach variables
  to one sandbox at create, at fork, and at each resume.
- **Problem:** One shared environment gives every sandbox the env vars of
  every repository.
- **Impact if no action:** Secrets of one repository reach the sandboxes
  of all repositories.
- **Root question:** Where do the env vars of each repository live, and
  when does a sandbox get them?
- **Options:**
  - **A.** One Boat environment for each repository. Boat stores the
    values. The Worker key must name each new environment, so each new
    repository needs a new key from the user. Effort: Medium.
  - **B.** D1 stores the values, encrypted with a Worker secret. Before
    the start script runs, the Worker writes them into the sandbox as an
    env file. A change reaches each sandbox at its next start. Effort:
    Medium.
  - **C.** Keep one shared environment, and change the settings screen to
    one list for all repositories. Effort: Small.
  - **D.** Added by the options check: D1 stores the values, encrypted as
    in B. The Worker passes them as per-sandbox variables at create and at
    each resume. Boat gives them to the agent's commands, with no file. A
    change reaches each sandbox at its next start, as the mockup says.
    The base never gets them. Effort: Medium.
- **Left out:** Values in the saved snapshot, because a snapshot keeps
  every file, and Boat advises against secrets in snapshots.
- **Open point:** every option assumes that a base update needs no
  secret. A private registry token breaks this. The Worker must give such
  a value to the setup command only, so the saved snapshot does not keep
  it.
- **Wider fix:** None.
- **Related:** Option E of decision 13 runs the scripts from the Worker,
  which can write the env file first.
- **Recommendation:** D. The first recommendation was B. D gives the
  same isolation and timing with no file step, and it does not depend on
  decision 13. A new repository needs no new key.
- **Action:** ask the user, because the options trade who stores the
  secrets against a manual key step for each repository.

### 18. Choose the banner states

Open. Added on 5 November 2026 from the mockups of Milestone 1.

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

Open. Added on 5 November 2026 from the user's design feedback.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design. **Category:** Docs or spec.
- **Background:** On 5 November 2026 the user asked for orgs. The icon
  rail lists the orgs, and the user can create more. Each org has its own
  settings, and repositories have no settings for now. The sidebar shows
  the org name with a Settings link.
- **Problem:** The plan has no org model. It does not say what an org
  owns: its Boat account or key, its GitHub connection, its agent logins,
  its sandbox software, its scripts and env vars, or its members.
- **Impact if no action:** Milestones 4 and 5 cannot design the D1 schema
  or the Boat and GitHub calls.
- **Root question:** What must stay apart between two orgs of one user?
  The options check wrote this root question. The Boat and GitHub setup
  follows from the answer.
- **Options:**
  - **A.** A light grouping. All orgs share the app's one Boat key and
    GitHub App. Each org owns its workspaces, its sections, and its
    sandbox settings: software, scripts, and env vars. Effort: Medium.
  - **B.** A full tenant. Each org stores its own Boat key, limited to its
    own Boat environment, its own GitHub App installation, and its agent
    logins, besides its workspaces, sections, and sandbox settings.
    Effort: Medium.
  - **C.** Orgs mirror GitHub. Each org comes from one GitHub App
    installation, and its repositories come from it. The rest is as A.
    Effort: Medium.
  - **D.** Added by the options check: as A, plus the app's own Boat
    organization. The Worker makes one Boat environment for each org, and
    names the org's agent logins on it. Effort: Medium.
- **Boat facts from the options check:** Boat bills one wallet for each
  personal account or Boat organization, and keys have no wallet. So
  separate billing needs one Boat organization for each org, at one plan
  seat each. One Claude or ChatGPT sign-in can be in only one credential
  profile, so separate agent logins need a second subscription. Only the
  Boat dashboard or an `account.admin` key can create keys.
- **Left out:** Members and shared orgs, because the plan serves one user.
  Every record keeps a user ID, so members can come later.
- **Wider fix:** None.
- **Related:** Decisions 5, 9, 10, 12, 13, and 17 depend on the answer.
- **Later requirement:** on 5 November 2026 the user asked that the
  sandbox provider stays hidden from the user. B would ask for a Boat key
  in each org, so it conflicts with that requirement.
- **Recommendation:** A. The first recommendation was B. B does not split
  billing, its separate agent logins need a second subscription, and each
  new org needs a key from the Boat dashboard. C lets the user create an
  org only by installing the GitHub App on another account.
- **Effect on other decisions:** Under A, decision 5 keeps G. Decision 9
  needs one software base for the org, which the base of each repository
  starts from. Decision 10 keeps A, with the script in the org settings.
  Decision 12 keeps C, but a script save updates every base of the org.
  Decisions 13 and 17 keep E and D, stored for each org.
- **Action:** ask the user, because the options trade setup steps against
  isolation, and no requirement covers orgs yet.

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

**Mockups.** The UI implementors made these calls in Milestones 1 and
1a, and the orchestrator accepted them on 5 November 2026:

- The look is Graphite, which the user chose on 5 November 2026:
  dark-first, near-black with cool greys, one sky accent, dense 26 px
  rows and controls, 13 px Inter text, and monospace labels, with a
  matching light scheme. The tokens live in `docs/mockups/src/design/`.
- Desktop shows an icon rail, the workspace list, the chat, and a right
  column side by side, so the user sees files change while the agent
  works. The right column has the pull request bar on top, then the All
  files, Changes, and Checks tabs, then the Terminal, Preview, and
  Desktop tabs. Below 900 px the list moves to its own page.
- A phone shows the workspace list, then a workspace with a compact pull
  request row that opens Checks, and five bottom tabs: Chat, Files,
  Terminal, Preview, and Desktop.
- A selected tab is a filled pill, and the accent marks only what is
  active, so no box gets a coloured edge.
- Tabs are links, so each tool and file view has its own address.
- The user opens a port preview by typing its port. The plan has no port
  discovery.
- Environment variable values are write-only, so secrets never reach the
  browser.
- An update of the base disables Install software, so the two cannot
  change the base at once.
- The Inter font ships in the repository with its licence, because the
  `@firna/ui` theme names it first.

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

Agent call, 5 November 2026: the branch is `<GitHub login>/<city>-<four
random characters>`, such as `cal/lisbon-7k2q`, so branches stay grouped
by user. The workspace name starts as the city name. When the agent's
first answer arrives, the Worker asks the agent for a title of three to
five words in a side conversation, and renames the workspace.

**Marketing site.** The user asked for it on 5 November 2026. Agent
call: the marketing site is a few static pages, public at the root of
the app domain, served from the Worker's static assets. The app moves to
an `app.` subdomain behind Cloudflare Access. Reason: visitors must see
the site without signing in, and the app keeps one sign-in boundary.

**Access and security.** These calls answer the user's question of
5 November 2026 on secure access to Boat.

- Cloudflare Access protects the web app and the API. The Worker
  verifies the Access token on each request. Reason: it needs no login
  code for one user. Own GitHub login replaces it when other users join.
  Port previews do not use Access, as decision 6 says.
- The Boat key is a scoped key and a Worker secret. It has only the
  actions that the app uses, and no `account.admin` action. It is limited
  to the app's own Boat environment, as decision 5 says.
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

- Each repository has one base sandbox. A push to the default branch
  refreshes it at most once in 30 minutes, and a daily timer refreshes it
  too: resume, fetch, reset to the default branch, run the startup
  script, save a saved snapshot, and stop. Reason: each resume counts as
  a Boat start, and the $20 plan allows 200 starts a day.
- A new workspace starts from the newest good saved snapshot of its base,
  with labels for the user, the repository, and the workspace. It then
  creates its branch. Reason: a fork of a running base can copy a
  half-done refresh.
- Each workspace sandbox has a Boat auto-stop deadline as a safety net.
  The workspace Durable Object extends it while a tab is open or an agent
  turn runs. Reason: a new sandbox stops after one hour by default.
- Workspace sandboxes use the app's Boat environment, with the user's
  GitHub access and AI logins, as Conductor Cloud does. Reason: one user
  owns every sandbox. Sandboxes for other users will use `noEnv`.
- "Install software" opens a terminal on the base sandbox. The user
  installs tools and saves. The startup script and the env vars live in a
  Boat environment, which applies them at each start. Open decisions 9,
  13, and 17 replace this bullet.
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

**Prerequisites from the user.** A Cloudflare account on Workers Paid
with Access. Two domains on that account: one for the app, and a
separate registrable domain for port previews. A paid Boat plan, the
app's own Boat environment, and a Boat key limited to it. A GitHub App
with its key. Milestone 16 needs all of them. Earlier
milestones use fakes.

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

- [ ] Turn the icon rail into the org switcher, with a create action, and
      draw the create-org screen.
- [ ] Show the org name in the sidebar header, with a Settings link.
- [ ] Replace the repository settings screens with org settings, and
      remove the screens that only repository settings need.
- [ ] Make sidebar sections user-defined, collapsible, and with a menu
      with three dots. Show how a workspace moves between sections.
- [ ] Put a dot-matrix status mark on the left of each workspace row, and
      remove the marks on the right.
- [ ] Add file uploads, the agent choice for Codex and Claude, the model,
      and the effort level to the composer and to the new workspace form.
- [ ] Add the changes summary to the Changes tab.
- [ ] Open files, diffs, and agent sessions as closable tabs in the
      centre column, with "+" for a new session.
- [ ] Remove every mention of the sandbox provider.
- [ ] Redraw new workspace as an empty chat window with generated names.
- [ ] Make phone touch targets at least 44 px high.
- [ ] Replace "Move to section" with drag and drop, and add "New
      workspace" to the section menu.
- [ ] Combine the model and effort pickers into one.
- [ ] Run the mockup check. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show, and rewrite decisions 9, 10, 12, 13, and 17 for
      org settings.

## Milestone 1c: Marketing website

Tags: mockup

Depends on: 1b

The user asked on 5 November 2026 for a marketing website like
Conductor's home page, with similar claims, in the Graphite design, and
honest to this app's features. Draw it in the Mokly catalogue first.

- [ ] Draw the home page at phone and desktop sizes: a header, a hero
      with a real app screen, feature sections, a call to action, and a
      footer.
- [ ] Claim only what the plan decides. Leave out customer logos,
      testimonials, user counts, certifications, team features, a
      desktop or mobile app, an API, pricing, and any feature that waits
      on an open decision.
- [ ] Never name the sandbox provider.
- [ ] Run the mockup check. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show, including the product name.

## Milestone 2: Documentation and protocol

Depends on: 1, 1a, 1b, 1c

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

- [ ] Verify the Cloudflare Access token on each request.
- [ ] Add the Boat client behind `SandboxProvider`, with the fixed route
      list and typed errors. Its key is limited to the app's own Boat
      environment.
- [ ] Add the D1 schema and its migrations for repositories, workspaces,
      and settings.
- [ ] Add the ownership check and the `Origin` check.
- [ ] Test the client and the checks against a fake Boat server.

## Milestone 5: Bases and workspace lifecycle

Depends on: 4

- [ ] Create and refresh the base sandbox of a repository.
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
- [ ] Add a draggable divider between the chat and the right column.
- [ ] Build the new workspace and the repository settings screens.
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

## Milestone 16: Deployment and live smoke test

Depends on: 8, 10, 12, 14, 15

This milestone needs the prerequisites from the user.

- [ ] Deploy the Worker, D1, and the web app to the user's Cloudflare
      account behind Access.
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
