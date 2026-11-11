# The chat comes first

Status: Active. On branch `calummoore/workspace-chat-immediate-access`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today several states keep a person out of a chat that takes work. New
workspace, as a page or a dialog, turns Send off while the first build of
the org runs, and while the chosen repository waits for its build. A
stopped workspace shows a Resume bar in place of the composer. A failed
resume shows Try again in place of the composer. The first open of a
workspace shows a spinner until its read answers. So a person who adds a
repository or opens a new org must come back later to give the first
task. A person who returns to an idle tab must press Resume first.

This change makes one rule for every state: the chat comes first. Every
way into a workspace opens its chat at once, also while parts still load.
The composer takes a message in every state from which the agent can run
later, and the server queues the message. The chat shows each
prerequisite as a start step: the build of the org image, the start, and
the resume. Only the parts that need a running cloud computer wait: the
files, the changes, the terminal, and the preview. The user asked for the
rule on 10 November 2026, and chose its approach on 11 November 2026, as
chat-first decisions 1 to 3 record. The change does not cover archived
workspaces, which chat-first decision 4 keeps open. It does not let a
member start a build outside a create, which chat-first decision 5 keeps
open.

A chat-first decision number names a decision of this change, as
[Decision numbers](../docs/architecture.md#decision-numbers) says.

Contract owners:

- [Life of a workspace](../docs/protocol/workspace-life.md).
- [Create a workspace](../docs/protocol/create-a-workspace.md).
- [Org image](../docs/protocol/org-image.md).
- [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- [Agent tools](../docs/protocol/agent-tools.md), for the create call and
  the repository list.
- [Routine runs](../docs/protocol/routine-runs.md) and
  [Pull request runs](../docs/protocol/pull-request-runs.md).
- [Workspaces during a suspension](../docs/protocol/suspension-workspaces.md).
- [Orgs and members](../docs/protocol/orgs-and-members.md), for Get
  started.
- [Flows](../docs/architecture/flows.md).
- The [workspace screen README](../src/shell/workspace/README.md), the
  [web app README](../src/app/README.md),
  [Creation recovery](../src/app/creation-recovery.md), the
  [chat README](../src/chat/README.md), the
  [lifecycle README](../worker/lifecycle/README.md), and
  [Image builds](../worker/lifecycle/image-builds.md).
- The public guides under `src/marketing/docs/`.

Replaced ways:

- The refusal of a create whose repository the org image lacks → a
  create that waits for the build of its repository. Consumers: the
  admission of a create in the Worker, the codes `image_required` and
  `repository_not_found` for a chosen repository, the repository list and
  the create call of the agent tools, the routine runs and the pull
  request runs, the readiness of New workspace in
  `src/shell/new-workspace/useNewWorkspaceForm.ts`, the notices in
  `src/shell/new-workspace/notices.tsx` and
  `src/shell/new-workspace/waiting.tsx`, their tests, the mockups, the
  protocol docs, and the public guides. Moved in Milestones 7 to 9.
  Deleted in Milestone 8 for the Worker and in Milestone 9 for the app.
- The Resume bar in place of the composer → the composer with a stopped
  line. Consumers: `sandboxView` in `src/shell/workspace/sandbox-view.ts`,
  `replacesComposer` in
  `docs/mockups/src/components/workspace/sandboxNoticeState.ts`, the
  stopped words in `src/shell/workspace/notice-copy.ts`, the chat's own
  bar in `src/chat/components/SandboxState.tsx`, their tests, the
  mockups, and the public guides. Moved in Milestone 1 for the shared
  rule. Moved and deleted in Milestones 5 and 6 for the app.
- The spinner of the first open → the chat from the list record.
  Consumers: the loading branch of
  `src/shell/workspace/WorkspaceScreen.tsx` and its tests. Moved and
  deleted in Milestone 5.

## Terms

- **Org image:** the saved snapshot of an org's cloud computer, with a
  prepared copy of each chosen repository. Every new workspace starts from
  it (decision 13).
- **Build:** the job that makes a new org image. It clones the chosen
  repositories and runs the install script. It has a 60-minute limit.
- **Job:** a build or a refresh of the org image. One job runs at a time
  in each org.
- **Waiting repository:** a chosen repository that the org image does not
  hold yet, such as one that an admin just added.
- **Added build:** the build that the app starts by itself when a job
  ends, for a change during the first good build or for a waiting
  repository.
- **Starter:** the member for whom a build runs. A suspension of the
  starter stops the build.
- **Waiting start:** the first start of a new workspace while it waits for
  the build that prepares its repository.
- **Start steps:** the steps that the chat shows while a cloud computer
  starts, with their times.
- **Queue:** the messages that the workspace stores on the server until
  its cloud computer is ready (decisions 14 and 130).
- **Composer:** the message box under the chat.

## Decisions

### Chat-first decision 1: One rule, the chat comes first

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design. The user asked for the rule on 10 November 2026.
- **Category:** Docs or spec.
- **Location:** `src/shell/new-workspace/useNewWorkspaceForm.ts:96-115`,
  `src/shell/workspace/sandbox-view.ts:74-83`,
  `src/shell/workspace/WorkspaceScreen.tsx:115-125`,
  `worker/lifecycle/creation-claims.ts:84`, and
  `docs/protocol/create-a-workspace.md`.
- **Background:**
  - New workspace turns Send off before the first good build (decision
    150) and for a waiting repository (decision 240). A create that waits
    for the first build was left out for now (decision 152).
  - A stopped workspace shows the Resume bar in place of the composer
    (decision 11). An open already resumes it, but the bar shows until
    the Resume request answers. The bar also shows when the computer
    stops while the tab stays open, and after a Restore.
  - A failed resume shows Try again in place of the composer. A failed
    first start already keeps its chat, its queue, and its composer, with
    Try again.
  - A create needs an org image that holds its repository. If the image
    does not hold it, the Worker refuses the create with `image_required`
    or `repository_not_found`.
  - A workspace computer can clone with a member's GitHub user token
    through the git credential helper, as
    `docs/protocol/github-tokens.md` says. So option B needs no
    installation token.
  - Both options keep the server queue of decision 14 and the early
    create answer of decision 91. Option B drops decision 13, which says
    that every workspace starts from the org image.
- **Problem:** Before the app takes the task, a person must wait outside a
  working chat or press a button.
- **Impact if no action:** A person who adds a repository or opens a new
  org must come back later to send the first task. A person who returns
  to an idle tab must press Resume first.
- **Root question:** How does a person reach a chat that takes their task
  at once, whatever the computer or the org image is doing?
- **Options:**
  - **A.** The chat comes first, and the workspace waits for the build.
    Effort: Large.
    - New workspace accepts the create while a build is due to prepare
      its repository. The workspace opens at once.
    - The first start step follows that build. Then the workspace starts
      from the new image.
    - The 20-minute start limit begins when the build succeeds. A failed
      build fails the first start, which keeps the chat, the queue, and
      Try again.
    - A stopped workspace keeps its composer, as chat-first decision 2
      says. A failed resume keeps its composer under the bar.
    - The first open draws the header from the list and the chat at
      once.
    - Cost: it changes the create path and the start limit, with changes
      to the mockups, the protocol docs, and the public guides.
  - **B.** The chat comes first, and a workspace in a waiting repository
    prepares that repository itself. Effort: Large.
    - The workspace starts from the last good image. In a new org, it
      starts from the software image.
    - It clones the repository and runs the install script in its own
      computer. The org image still builds for later workspaces.
    - The stopped, failed, and open rules of A stay.
    - Cost: the first agent starts some minutes sooner. But the app gets
      a second way to prepare a repository, and the install script runs
      outside a build.
- **Left out:**
  - The browser holds the message until the server takes it. A closed
    tab loses the message, as decision 14 says.
  - The Worker holds the create at the org until the build ends. The
    chat needs a workspace, and A is better on every point.
  - Keep the blocks and make the waits shorter. The person still waits
    before the chat takes work.
  - One image for each repository. Decision 13 rejected it for cost, and
    it only shortens the wait.
- **Wider fix:** A. Its one protocol rule covers each later state, so no
  new state can add its own block. B states the same rule.
- **Previous examples:**
  - Decision 14, option C, on 5 November 2026: "a message sent in a
    stopped workspace resumes it". It lost because decision 11 kept the
    Resume bar.
  - Decision 152 of PR #92, on 9 November 2026: the user chose the notice
    first, and the wait for the first build later.
  - Decision 240, option E, on 10 November 2026: a create that waits for
    the build of its repository. The user chose the off state and a
    build at each add.
  - The follow-up `plans/follow-ups/workspace-waits-for-first-build.md`.
    Its option F is close to A. This change deletes it.
- **Related:** Chat-first decisions 2, 3, and 4 set the edges of the
  rule. Chat-first decision 3 applies only under A.
- **Recommendation:** A. It keeps one way to prepare a repository, and it
  reuses the queue and the failed first start that exist today.
- **Action:** ask the user, because A and B trade the time to the first
  task against a second way to prepare a repository. Both change
  decisions in force.
- **Chosen:** A, by the user on 11 November 2026: "1 = A".

### Chat-first decision 2: What starts a stopped cloud computer

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/workspace/notice-copy.ts:96-104`,
  `src/app/workspace-model.ts:179-213`, and "Stop and resume" in
  `docs/protocol/workspace-life.md`.
- **Background:** A computer stops after 30 minutes without activity and
  without a running turn. Decision 11 chose a Resume button, so that the
  app makes no start that the person did not ask for. An open already
  resumes a stopped workspace. So this decision is for a tab that stays
  open while its computer stops, and for a Restore. A search of the
  Worker found no code that starts a stopped computer when a message
  arrives.
- **Problem:** Without the Resume bar, the rule must say which input
  starts the computer.
- **Impact if no action:** The plan cannot say when the agent gets the
  message.
- **Root question:** What starts a stopped computer, so that each
  accepted message reaches the agent soon, and no start comes without a
  sign of use? The options check of 11 November 2026 replaced "Which
  action of the person starts a stopped computer, so that the agent gets
  the message soonest?", because those words made the starts exclude each
  other, and they missed messages from other tabs.
- **Options:**
  - **A.** The tab starts it when the tab shows again. Each glance at an
    old tab then costs a start. This is option C of decision 11, which
    the user rejected on 5 November 2026. Effort: Small.
  - **B.** A send starts it, and the message waits in the queue during
    the resume. Each start then comes from a message. Effort: Medium.
  - **C.** The first key, paste, or file in the composer starts it, and
    the send queues the message. The resume then overlaps the typing. A
    draft that is never sent costs one start. That computer stops again
    after 30 minutes. Effort: Medium.
  - **D.** Added by the options check: A, and two more starts. The
    Worker starts a stopped computer when it accepts a message for it, also
    from another tab. A tab that stayed visible while its computer stopped
    asks for the resume at the next input, such as a key, a click, or a
    scroll. Cost: two more start paths, and a scroll in an old tab that
    stayed visible costs a start. Effort: Medium.
- **Left out:** None.
- **Assumptions:** All options first assumed that one start rule applies
  alone. That is not a requirement, because the starts can combine. D
  drops it. All options keep the rule of decision 11 that a hidden tab
  starts nothing.
- **Wider fix:** D. Its start at the accept covers each accepted message,
  whatever tab or member sent it.
- **Previous examples:** Decision 247 resumes the computer when a file tab
  opens, because that open asks for the computer.
- **Related:** Chat-first decision 1. Under option B of chat-first
  decision 4, a send restores an archived workspace, whatever this
  decision chooses.
- **Recommendation:** D. With A alone, a message from a tab that stayed
  visible, or from the tab of another member, stays queued, and nothing
  starts the computer. The first recommendation was C.
- **Action:** ask the user, because D adds the start of option B and a
  start at any input, and the answer A does not cover them.
- **Chosen:** A, by the user on 11 November 2026: "2 = A". It replaces the
  rejection of a resume at the show of the tab in decision 11.
- **Open:** The options check added D after the answer. D waits for the
  user. Milestones 4 and 6 wait for the answer, because a composer in a
  stopped workspace needs a start that follows each message.

### Chat-first decision 3: A waiting repository with no build to come

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/new-workspace/waiting.tsx`,
  `src/shell/new-workspace/notices.tsx`, and "Waiting repositories" in
  `docs/protocol/create-a-workspace.md`.
- **Background:** Under chat-first decision 1, a create waits for the
  build that prepares its repository. A repository can also wait with no
  build to come, such as after a failed build. A new org whose first
  build failed is in the same state. Only an admin builds (decision 57).
  The app starts no build by itself after a failed build (decision 12).
  But when an admin adds a repository, that add starts a build.
- **Problem:** The request does not say what a create does when nothing
  will end its wait.
- **Impact if no action:** The plan cannot say whether the app refuses
  such a create, or how long its workspace waits.
- **Root question:** What happens to a task when no build will prepare
  its repository by itself?
- **Options:**
  - **A.** Keep Send off with today's notice in this case only. The
    person still waits at New workspace. Effort: Small.
  - **B.** Accept the create. When an admin creates the workspace, the
    app starts a build, as for an admin's add of a repository. A member's
    workspace waits with no time limit. Its start step says that an admin
    must build. Effort: Medium.
  - **C.** As B, and a member's create also starts the build. This
    changes decision 57, and each member can then start a paid build.
    Effort: Medium.
  - **D.** Added by the options check: as C, but a create that no person
    sends at that moment starts no build after a failed build. Such
    creates are a scheduled routine run, a pull request run, and the
    create call of an agent. Such a create waits for a build that runs or
    is due. When none comes, its first start fails with the cause of the
    failed build. Cost: one input on the create path. Three failed runs in
    a row turn a routine off. Effort: Small.
- **Assumptions:** All options first assumed that each create that starts
  a build is a person's request. That does not hold for scheduled runs. D
  drops it.
- **Left out:** A build that the app starts by itself after a failed
  build. Decision 12 rejected it, because a broken install script fails
  again.
- **Wider fix:** D, with the source of the request as an input of
  `startImageBuild`, so that every caller follows the same rule.
- **Previous examples:** Decision 240, on 10 November 2026, made an
  admin's add start a build. The protocol lets that add start a build
  also after a failed build.
- **Related:** Chat-first decision 1. This decision applies only under
  its option A. Chat-first decision 5 asks how far the reason of this
  answer reaches.
- **Recommendation:** D. It keeps C for each create that a person sends.
  Without D, each scheduled run after a failed build starts a paid build,
  which the broken script fails again. The first recommendation was B.
- **Action:** ask the user, because no requirement covers this case.
- **Chosen:** C, by the user on 11 November 2026: "3 = C - the default
  build should not require an admin". A create of any member starts the
  build that its repository needs. Decision 57 keeps the settings of the
  cloud computer with the admins.
- **Applied:** D, as the reading of C, by a call of the agent on 11
  November 2026. D keeps C for each create that a person sends, and
  decision 12 stays in force for each create that no person sends.

### Chat-first decision 4: An archived workspace

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/workspace/notice-copy.ts:54-87`, the refusals
  of an archived chat at `worker/chat/browser-request.ts:42-48` and
  `worker/chat/attachment-routes.ts:44-48`, and "Archive" and "Restore"
  in `docs/protocol/workspace-life.md`.
- **Background:** Archive stops the computer and keeps it for 14 days.
  The archived chat is read-only, with a Restore bar in place of the
  composer (decision 16). Restore brings the workspace back stopped. After
  14 days, the app deletes the computer.
- **Problem:** An archived workspace can run again for 14 days, so the
  rule could show its composer. But Archive is a choice to put the task
  away.
- **Impact if no action:** An archived workspace keeps its own view. A
  person must press Restore before each new task there.
- **Root question:** How does a person continue the task of an archived
  workspace? The options check of 11 November 2026 replaced "Can a person
  give an archived workspace more work from its chat?", because those
  words assumed the same workspace, and left out a new workspace.
- **Options:**
  - **A.** Keep the read-only chat and the Restore bar. Effort: Small.
  - **B.** Show the composer until the last day of Restore. A send
    restores the workspace, resumes it, and queues the message. A key
    alone restores nothing, because Restore moves the workspace for every
    member. Effort: Medium.
  - **C.** As B, and after the 14 days a send starts a new computer on
    the pushed branch. Unpushed work and the old agent sessions are gone,
    so the agent starts fresh. Effort: Large.
  - **D.** Added by the options check: A or B for the 14 days. After them,
    in place of C, the bar offers a new workspace in the same repository
    and section, with a link to the archived chat. The archived chat stays
    read-only. Cost: the new workspace starts from the default branch,
    unless the create learns to check out the pushed branch. Effort:
    Medium.
- **Assumptions:** All options first assumed that the task goes on in the
  same workspace. After the 14 days nothing of the computer is left, so
  that reason is gone there. D drops it. A send that brings the workspace
  back moves it for every member, as "Restore" says. That holds.
- **Left out:** A Restore when an archived chat opens. One member's open
  would then undo the Archive of another member for every member.
- **Wider fix:** None.
- **Previous examples:** Decision 16 made the archived chat read-only.
  Decision 1 of PR #138 added Restore for 14 days.
- **Related:** Chat-first decision 1. This decision applies under its
  option A. Under each option here, the show of a tab and an input in it
  restore nothing, so chat-first decision 2 starts no archived workspace.
- **Recommendation:** A. Under option D of chat-first decision 2, the
  next input after a Restore from the open workspace starts the resume
  while the person types. B saves one press, but it starts the resume
  later, at the send, and it changes decision 16. The first
  recommendation was B.
- **Action:** ask the user, because A keeps decision 16, B applies the
  rule to one more state, and no option is clearly best. The request
  names only stopped workspaces.
- **Open:** The user gave no answer on 11 November 2026. Until an answer,
  this change does not touch the archived chat, its bar, or its mockups.
  Decision 16 stays in force.

### Chat-first decision 5: Which builds a member may start

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. It comes from the reason that the user gave for
  chat-first decision 3, on 11 November 2026.
- **Category:** Docs or spec.
- **Location:** `src/shell/settings/ComputerTab.tsx:141`,
  `src/shell/onboarding/OrgStep.tsx:91`,
  `src/shell/new-workspace/notices.tsx:60`, the admin check of
  `startImageBuild` at `worker/lifecycle/image-builds.ts:94`, the
  automatic starters at `worker/lifecycle/first-image-build.ts:19-20` and
  `worker/lifecycle/image-timers.ts:46-47,149-150`, and "The org image"
  and "The first build" in `docs/protocol/org-image.md`.
- **Background:**
  - On 11 November 2026 the user chose that a create of any member starts
    the build that its repository needs. The reason: "the default build
    should not require an admin".
  - Today only an admin starts a build by hand: Build computer and Try
    again on the Cloud computer tab, and Try again in Get started. An
    admin's add of a repository starts a build too.
  - The added build and the automatic refreshes run for an admin who is
    not suspended. An org without such an admin gets neither.
  - Decision 57 keeps the repositories, the install script, the startup
    script, and the env vars with the admins. Its reason: a changed
    script reaches every new computer of the org, and runs during the
    turns of other members.
  - Every member sees the Cloud computer tab and its builds, but a member
    who is not an admin gets no button there. The repository notice of
    the Repositories tab has a build button for admins too.
  - A create of a member builds only while the org has no good image, or
    while its repository waits. A create in a ready repository starts
    from the image and builds nothing.
  - All options keep decision 57 for the settings. All options keep the
    rule that the app starts no build by itself after a failed build
    (decision 12).
- **Problem:** The reason of the answer reaches further than a create. The
  plan does not know whether a member also gets Build computer and Try
  again, or whether the automatic builds still need an admin.
- **Impact if no action:** While a repository waits, a member can start
  a build through a create, but not with the button beside a failed
  build. That member must create a workspace to build again, or ask an
  admin.
- **Root question:** Which builds still need an admin, now that any
  member's create can start one? The options check of 11 November 2026
  replaced "Which builds of the saved settings may a member start?",
  because option C is about builds that no member starts.
- **Options:**
  - **A.** Keep every other build control with the admins. A member
    starts a build only through a create, or through the Try again of its
    workspace, as chat-first decision 3 chose. Effort: Small.
  - **B.** Every build of the saved settings. A member also gets Build
    computer and Try again, on the Cloud computer tab and in Get started.
    The settings stay with the admins. Effort: Medium.
  - **C.** As B, and the added build and the automatic refreshes run
    also when no admin of the org is active. Each then runs for the first
    member who is not suspended. The starter of a build serves only the
    suspension rules, so no token changes. Effort: Medium.
  - **D.** Added by the options check: a member gets Build computer and
    Try again only while a create would start a build: while the org has
    no good image, or while a chosen repository waits. This holds on the
    Cloud computer tab, on the Repositories tab, and in Get started. In
    other states, the controls stay with the admins. Cost: the controls
    of a member change with the state, and the Worker check reads the
    same state as a waiting create. Effort: Medium.
- **Assumptions:** The first options assumed that a member can always
  start a build through a create. That holds only while the org has no
  good image or a repository waits. D drops it. An org without an active
  admin exists only when an operator suspends every admin, which lowers
  the value of C.
- **Left out:** Members also change the settings. Decision 57 rejected
  it, because a changed script runs during the turns of other members.
  The answer names builds, not settings.
- **Wider fix:** One build permission beside `mayChangeSettings` in
  `src/app/permissions.ts`, which every build control and
  `startImageBuild` read, under B or D. The automatic starters keep
  `firstActiveOrgAdmin` unless C applies.
- **Previous examples:** Decision 240, on 10 November 2026, made an
  admin's add of a repository start a build.
- **Related:** Chat-first decision 3, whose answer gives the reason. The
  follow-up `plans/follow-ups/first-build-retry.md` asks for a retry of a
  failed first build with no manual step. It stays open under every
  option.
- **Recommendation:** D. A member's create builds only in the states of
  D, so D gives the member the same reach with a button. Outside them, B
  gives members builds that no repository needs. If "the default build"
  means every build of the saved settings, B fits. The first
  recommendation was B.
- **Action:** ask the user, because B, C, and D change "only an admin
  builds" beyond the create that the user chose.
- **Open:** The user has not answered. Until an answer, this change
  changes no build control outside a create and the Try again of its
  workspace.

## Design

### The states of the chat

| State | What the chat shows | The composer | What starts the computer |
| --- | --- | --- | --- |
| First read runs | The header of the list record, and the chat as it loads | Takes messages once the chat loads | The open, as today |
| Waits for a build | The start steps, with the build as the first step | Takes messages, which queue | The success of the build |
| Starting | The start steps | Takes messages, which queue | The start runs |
| Ready | The chat | Takes messages | Nothing to start |
| Stopped | One line that says that the computer stopped | Takes messages, which queue | The open, the show of the page, and the open of a file. Option D of chat-first decision 2 adds the next input in a tab that stayed visible, and a message that the Worker accepts. |
| Failed first start | The bar with Try again | Stays under the bar | Try again |
| Failed resume | The bar with Try again | Stays under the bar | Try again, or the next open |
| Refused start of a suspended org | The bar of the refusal | Gone | Nothing, until the suspension ends |
| Refused start of a suspended owner | The bar of the refusal | Stays under the bar | Nothing, until an admin assigns another owner |
| Archived | The read-only chat with the Restore bar | Gone, as decision 16 says | Nothing |

The table holds the rule of chat-first decision 1. A missing agent login
is not a state of the computer. It keeps its notice and its Send off, as
the design calls below say.

### The stopped workspace

- The composer stays. One line above it says that the computer stopped,
  and that it starts again when the person comes back. The mockups give
  the words.
- The browser asks for the resume when the workspace opens, as today,
  and when the page turns visible again, in the browser and in the Mac
  app. The second start is option A of chat-first decision 2.
- A hidden page asks for nothing.
- Option D of chat-first decision 2, which waits for the user, adds two
  starts:
  - The person acts in a tab that stayed visible while the computer
    stopped, with input that counts as activity: typing, a click, or a
    scroll.
  - The Worker starts a stopped computer when it accepts a message for
    it. This covers a message from the tab of another member, and from a
    tab whose own request failed. A suspended org or owner still refuses
    the start, as today.
- After a Restore from the open workspace, the workspace is stopped, so
  the same rule applies. Restore itself still starts nothing.
- The terminal and the preview keep their stopped panel with Resume. The
  files and the changes keep their saved lists. An open of a file or a
  diff resumes the computer, as decision 247 says.

### The failed resume

- The composer stays under the bar of every failed start, as it does
  today after a failed first start. A message queues and starts nothing.
- Try again starts the computer again. The next open retries, as today.
- The show of the tab does not retry a failed start.

### The first open

- The screen draws the header from the list record, and the chat at once,
  while the read of the workspace runs. Until the read answers, the bar or
  the composer follows the state of the list record and of the org.
- The start steps and the panels wait for the read.
- Without a list record, as for a link that opens before the list loads,
  the spinner shows until the list or the read answers.
- A failed read shows its error with Try again in place of the chat, as
  today. A workspace that the read does not find shows the unavailable
  state, as today.

### The message that starts a stopped computer

This section holds the design of option D of chat-first decision 2. It
waits for the answer.

- The workspace object starts the resume after the chat accepts a
  message, when the workspace is stopped. The start runs outside the chat
  queue, in `fetchChat` of `worker/workspace-lifecycle.ts` after
  `chat.fetch` returns, through `waitUntil`. Reason: the chat queue does
  not enter itself again, so a lifecycle call from inside the chat route
  would wait for itself.
- The resume follows `resumeWorkspace` in
  `worker/lifecycle/workspace-resume.ts`, with the sender as the user of
  its checks. So it reads the current startup script and env vars, and a
  suspended org or owner refuses it, as the Resume route does.
- One start job runs at a time in each workspace, so many messages start
  one resume.
- A message to a workspace that starts, runs, or shows an error starts
  nothing.

### The create that waits

- **Admission.** A create is admitted when the org chose its repository.
  When the newest good image lacks the repository, or the org has no good
  image, the create becomes a waiting create.
- **Records.** The claim batch of `worker/lifecycle/creation-claims.ts`
  stores the attempt and the plan of a waiting create with no image and
  no lease. The records phase writes the workspace row and the first
  message without a lease. So the create answers before the build ends,
  as decision 91 requires.
- A migration lets a plan wait for its image. The plan table holds no
  image data until the wait ends, and `default_branch` takes its value at
  the pin.
- **The wait.** The start coordinator gets a wait phase before the
  `machine` phase. The wait shows as the first start step, with the ID
  `build`, and the time since the build began.
- **The pin.** When a build that holds the repository publishes its
  image, the wait pins that image as Try again does, with
  `pinRetryCreation` in `worker/lifecycle/retry-creation-data.ts`. So the
  start reads the current startup script and env vars. It leases the
  image, and it sets a fresh 20-minute start limit.
- A waiting start never asks for a computer with no image. Reason: a null
  image name starts a computer from the default image of the provider.
- **The wake.** At each publish and each failure of a build, the build
  code wakes each waiting workspace of the org. The hook points are the
  publish in `worker/lifecycle/image-build-steps.ts`, and the calls of
  `failBuild` in `worker/lifecycle/image-build-failure.ts`.
- Each waiting workspace also checks the build on its own alarm, every 5
  minutes. Reason: a lost wake then delays the start, but never strands
  it.
- **The check.** At each wake and each alarm, the wait reads the newest
  good image and the job of the org:
  - The image holds the repository: the wait pins it.
  - A build runs whose repository list holds the repository, or an added
    build is due: the wait goes on.
  - The build that the wait followed failed or passed its limit: the
    first start fails, as the failure below says.
  - Nothing will prepare the repository: the wait starts a build, as the
    build of a create below says.
- **Failure.** A failed build fails each first start that waits for it.
  The workspace keeps its chat, its queue, and Try again, as a failed
  first start does today. The failure names the failed build.
- Try again of such a workspace waits again while a build runs or is
  due. Otherwise it starts a build, as the build of a create says.
- A removal of the repository during the wait fails the first start, with
  a cause that says that the org removed the repository.
- A suspension of the org or of the owner, a deletion of the org, and an
  Archive end the wait, as they end each start today. The wait phase runs
  the same checks as each other phase.
- **Other creates.** Routine runs and pull request runs wait in the same
  way. Their run takes the state of the workspace, so it shows as
  starting during the wait.
- The create call of the agent tools answers when the workspace is
  admitted, also when the workspace waits for a build. Reason: a build can
  take 60 minutes, and the call must not wait for the whole first start.
- The repository list of the agent tools returns each chosen repository,
  with a field that says whether the repository is ready. It no longer
  fails with `image_required`.

### The build of a create

- When no build runs and none is due, a create that a person sends starts
  a build, also for a member who is not an admin, and also after a failed
  build (chat-first decision 3). The owner of the new workspace is the
  starter of the build.
- Reason for after a failed build: such a create is a person's request,
  as an admin's add of a repository is.
- A create that no person sends at that moment starts no build after a
  failed build. Such creates are a scheduled routine run, a pull request
  run, and the create call of an agent. Such a create waits for a build
  that runs or is due. When none comes, its first start fails with the
  cause of the failed build. Reason: the app starts no build by itself
  after a failed build (decision 12). This is option D of chat-first
  decision 3.
- After a successful build, such a create can start a build, as the app
  starts an added build by itself.
- The build path of a create skips the admin check of `startImageBuild`.
  Every other build keeps it while chat-first decision 5 is open.
- Creates that come while that build runs share it, because one job runs
  at a time in each org.
- While a refresh runs, the wait starts the build when the refresh ends.
  Reason: a refresh never prepares a new repository, and the org allows
  one job at a time.
- When a build succeeds, but its image still lacks the repository and no
  added build is due, the wait starts a build for the owner of its
  workspace. Reason: a lost added build then cannot strand a waiting
  start.
- When the build cannot start, the first start fails with that cause.
  The workspace keeps its message and Try again.
- A suspension of the starter stops the build, as for each starter. Each
  start that waits for it then fails, and Try again can start a new build.

### Contracts

- The create route accepts a create in a waiting repository, and in an
  org with no good image. The create of a chosen repository no longer
  gets `image_required` or `repository_not_found`.
- `repository_not_found` stays for a repository that the org did not
  choose or removed. The other refusals stay: a suspended org or user, a
  missing agent login, and expired GitHub access.
- A waiting start has the start kind `create` and a first step with the
  ID `build`. The step starts at the start of the build that it follows,
  or at the create when the build starts later. It completes when the
  image is pinned, and it fails when the build fails.
- A failed waiting start sets the workspace error, with a code and a
  message that name the failed build.
- The repository entries of the agent tools get a field that says whether
  the repository is ready.
- The answer of a chat message does not change. The start of a stopped
  computer follows the answer, and its start steps reach each tab as
  events.

### New workspace and Get started

- Send and Create stay on while a build runs, and while the repository
  waits. The other reasons for Send off stay: an empty draft, an upload
  that runs or failed, a missing agent login, and a suspended org.
- The repository picker turns each waiting repository on. Its note still
  says when the repository is ready.
- The notice over the composer stays while the org has no good image, or
  while the repository of the form waits. Its words say that the
  workspace starts when the cloud computer is ready. After a failed build,
  or with no build, the words say that the send starts a new build. An
  admin keeps the link to the Cloud computer tab.
- When the server accepts the create, the app opens the new workspace, as
  today. The workspace shows the build as its first start step.
- The finish of Get started says that the person can send the first task
  now, while the cloud computer is prepared. Open stays on in every state
  of the build, as today.

### Design calls

Each call below is a call of the agent, not a user decision. The user can
change any of them.

- 10 November 2026: the rule goes in a new section of
  `docs/protocol/workspace-life.md`, and the other docs link to it.
  Reason: that doc holds the states of a workspace.
- 10 November 2026: the stopped state, the failed resume, and the first
  open come before the create that waits. Reason: that part is smaller,
  and the create path does not change for it.
- 10 November 2026: a refused start of a suspended org keeps its bar in
  place of the composer. Reason: a suspended org refuses every write, so
  no message can run. Changed on 11 November 2026 for a suspended owner:
  the composer stays under the bar, because the app accepts those
  messages, and the workspace can run after an admin assigns another
  owner.
- 10 November 2026: a missing agent login keeps Send off with its notice.
  Reason: only the sender can fix it, and the notice links to Connect.
- 10 November 2026: the Terminal and the Preview of a stopped computer
  keep their Resume. The files and the changes keep their saved lists,
  and an open of a file resumes, as decision 247 says. Reason: the user
  named these parts as the real waits.
- 10 November 2026: in a failed resume, a message queues and starts
  nothing. Try again starts the computer again. Reason: a failed first
  start works in this way, and repeated messages must not repeat failed
  starts.
- 10 November 2026: the workspace opens only after the create request
  answers. Reason: the create answers before the computer starts
  (decision 91). An earlier open needs a new failed state for a create
  that the server refused.
- 10 November 2026: a waiting start reads the startup script and the env
  vars when its build succeeds, not at the create. Reason: the start then
  uses the current values.
- 10 November 2026: a waiting workspace shows the starting state in the
  workspace list. Reason: it is a start, and no other state fits.
- 10 November 2026: routine runs, pull request runs, and the create call
  of the agent tools use the same create path, so they wait in the same
  way. Reason: one path for every create.
- 11 November 2026: the show of the tab does not retry a failed start.
  Reason: a failed start can fail again, and a retry at each show repeats
  paid starts that fail.
- 11 November 2026: after a Restore from the open workspace, the rule of
  a stopped workspace applies. Restore itself starts nothing. Reason: one
  rule then covers each stopped workspace that a tab shows. This changes
  no part of the archived chat, which chat-first decision 4 covers.
- 11 November 2026: the first open draws the chat from the list record,
  and keeps the spinner only without a list record. Reason: the list
  record holds the header and the state that the bar needs.
- 11 November 2026: the finish of Get started says that the person can
  send the first task during the build. Reason: Send is now on during the
  build, so words about a wait would mislead.
- 11 November 2026: under option D of chat-first decision 2, the
  workspace object starts the resume after the chat accepts a message,
  outside the chat queue. Reason: the chat queue does not enter itself
  again.
- 11 November 2026: the plan applies option D of chat-first decision 3
  as the reading of the answer C. Reason: D keeps C for each create that
  a person sends, and decision 12 stays in force for each create that no
  person sends.
- 11 November 2026: the owner of the new workspace is the starter of the
  build of its create. Reason: the suspension rules need the person who
  caused the build. The owner is the sender in New workspace, and the
  owner of the routine for a run.
- 11 November 2026: a waiting start pins its image as Try again does.
  Reason: that path already reads the current settings and leases the
  image, and it sets a fresh start limit.
- 11 November 2026: each waiting workspace checks the build on its own
  alarm every 5 minutes, beside the wake at each publish and failure.
  Reason: no event exists for a build today, and a lost wake must not
  strand a wait.
- 11 November 2026: while a refresh runs, the wait starts its build when
  the refresh ends. Reason: one job runs at a time in each org.
- 11 November 2026: when a build succeeds but its image lacks the
  repository and no added build is due, the wait starts a build. Reason:
  a lost added build then cannot strand a wait.
- 11 November 2026: a removal of the repository during the wait fails
  the first start. Reason: no build can prepare that repository.
- 11 November 2026: when the build of a create cannot start, the first
  start fails, and the workspace keeps its message. Reason: no failure
  loses an accepted message (decision 130).
- 11 November 2026: the create call of the agent tools answers when the
  workspace is admitted, also when it waits. Reason: a build can take 60
  minutes, and the call must not wait for the whole first start.
- 11 November 2026: the repository list of the agent tools returns each
  chosen repository, with a field that says whether it is ready. Reason:
  an agent can now create in a waiting repository, and the field tells
  it to expect a wait.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the chat that comes first in each state of the table above, for an
admin and for a member, on a phone and on a computer. Read the `mockups`
and `product-ui` skills first. Do not change the mockups of an archived
workspace, because chat-first decision 4 is open. The words of the
stopped line follow the answer to chat-first decision 2.

- [ ] Change `replacesComposer` in
      `docs/mockups/src/components/workspace/sandboxNoticeState.ts`, so
      that the composer stays for a stopped computer and under the bar of
      every failed start. The app imports this rule.
- [ ] `app/shell/stopped`: the composer stays, with one stopped line
      above it and no Resume in the chat. The Terminal and Preview panels
      keep their Resume. The `during-turn` variant changes in the same
      way.
- [ ] `app/shell/stopped`: a variant for the return to the tab, where the
      resume runs at once, with its start steps and a queued message.
- [ ] `app/shell/error`: a failed resume keeps the composer under its bar,
      with a variant that holds a queued message. The `time-limit` variant
      changes in the same way.
- [ ] `app/shell/starting`: a variant for a waiting start, with the build
      as its first start step and the time since the build began. Draw it
      for an admin, with the link to the build, and for a member.
- [ ] A new page `app/shell/opening`: the first open of a workspace, with
      the header from the list and the chat while the read runs, in place
      of the spinner.
- [ ] `app/new-workspace/first-build` and its variants: Send is on while
      the first build runs. The notice says that the workspace starts when
      the cloud computer is ready. After a failed build and with no build,
      the notice says that the send starts a new build, also for a member.
- [ ] `app/new-workspace/dialog/first-build`: the same states in the
      dialog, with Create on.
- [ ] `app/new-workspace/waiting-repository` and its variants: the waiting
      repository is on in the picker, with its note, and Send is on. The
      `none-ready` variant keeps Send on.
- [ ] `app/new-workspace/error`: a variant where the build that the
      workspace waited for failed. The bar names the failed build and
      offers Try again, with the composer under it, for an admin and for a
      member.
- [ ] `app/archive/restored`: after Restore from the open workspace, the
      workspace is stopped, so it shows the composer with the stopped
      line, not Resume.
- [ ] `app/sign-in/get-started` `preparing`, `build-failed`, and
      `no-build`: the finish says that the person can send the first task
      now, while the cloud computer is prepared.
- [ ] The user flows `join`, `create-workspace`,
      `create-workspace-dialog`, `reopen-stopped-workspace`, and
      `retry-first-start`: each step follows the new screens. In `join`,
      the person sends the first task during the first build, and the
      workspace opens with the build step.
- [ ] Update `docs/mockups/catalogue.md` for each changed or new page and
      variant, with chat-first decisions 1 to 3.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements of chat-first decisions 1 to 3 and of the design
calls in the protocol docs, the architecture doc, and the READMEs. Keep
decision 16 for the archived chat, because chat-first decision 4 is open.
Keep "only an admin builds" for each build outside a create, because
chat-first decision 5 is open. State the starts of a stopped computer
only after the answer to chat-first decision 2.

- [ ] `docs/protocol/workspace-life.md`: a new section "The chat comes
      first" with the rule and the table of states, and the definition of
      a chat-first decision number. Change "Start steps", "Time limits of
      builds and starts", "Stop and resume", and the line of "Restore"
      about the open workspace.
- [ ] `docs/protocol/create-a-workspace.md`: replace "Before the first
      good build" and "Waiting repositories" with the create that waits
      and the build of a create. Change the notices of the dialog, "The
      create", and "A failed first start" for a failed build.
- [ ] `docs/protocol/org-image.md`: "The first build", "Added
      repositories", and "The repository notice" for a create that waits,
      and for the build that a create starts for any member.
- [ ] `docs/protocol/messages-and-attachments.md`: the app accepts a
      message also while the computer is stopped or waits for a build, and
      a message to a stopped workspace starts its computer.
- [ ] `docs/protocol/agent-tools.md`: the repository list and the create
      call follow the create that waits.
- [ ] `docs/protocol/routine-runs.md` and
      `docs/protocol/pull-request-runs.md`: a run in a waiting repository
      waits in the same way.
- [ ] `docs/protocol/suspension-workspaces.md`: a suspension ends each
      waiting start, and a suspension of the starter of a build fails the
      starts that wait for it.
- [ ] `docs/protocol/orgs-and-members.md`: the finish of Get started.
- [ ] `docs/architecture/flows.md`: "Create a workspace" gets the wait
      for the build, and "Stops" gets the start at the show of the tab.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update each sentence that restates a changed fact.
- [ ] Check the rows in `src/marketing/from-conductor/`, such as the note
      about stopped computers in `areas/cloud.ts`. Update each note that
      restates a changed fact, and each status that this change ships,
      starts, or drops.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Public guides

Depends on: 2

- [ ] Read each guide under `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact. Examples are **Send** off
      during the first build in `get-started.md` and `workspaces.md`, and
      **Resume** in `overview.md`, `workspaces.md`,
      `files-and-changes.md`, `terminal-and-previews.md`,
      `sessions-and-chat.md`, and `pull-requests.md`.
- [ ] Run the guide tests and `npm run site:build`. Check each relative
      link of each changed guide.

## Milestone 4: Worker: a message starts a stopped computer

Depends on: 2

Waits for chat-first decision 2, because only its option D adds this
start. When the Worker accepts a message for a workspace whose computer
is stopped, it starts the resume, as the Resume route does.

- [ ] In `fetchChat` of `worker/workspace-lifecycle.ts`, after the chat
      accepts a message for a stopped workspace, start the resume through
      `waitUntil`, with the sender as the user of the checks of
      `resumeWorkspace`.
- [ ] Add Worker tests: a message to a stopped workspace starts one
      resume, also for many messages. A message to a starting, ready, or
      failed workspace starts nothing. A suspended org or owner refuses
      the start, and the message stays queued.
- [ ] Update the [lifecycle README](../worker/lifecycle/README.md) and the
      docs that it links for the routes and the workspace object.
- [ ] Run the targeted tests, `npm run typecheck`, and the early check.

## Milestone 5: The chat comes first in a failed or opening workspace

Tags: ui

Depends on: 1, 2

The chat keeps its composer under the bar of every failed start. The
first open draws the chat from the list record. Read the `product-ui` and
`typescript` skills first.

- [ ] The sandbox view keeps the composer under the bar of every failed
      start, with the rule that Milestone 1 changes in
      `replacesComposer`. A message there queues and starts nothing.
- [ ] A refused start of a suspended owner keeps the composer under its
      bar. A refused start of a suspended org keeps its bar in place of
      the composer.
- [ ] The first open draws the header and the chat from the list record
      while the read runs. The spinner stays only without a list record.
- [ ] Move each test of the failed bar and of the spinner to the new way,
      with every assertion. Add cases for a failed resume with a queued
      message, a suspended owner, a suspended org, the open from the list
      record, and a link that opens before the list loads.
- [ ] Update the workspace screen README and the web app README.
- [ ] Run the targeted tests, `npm run typecheck`, and the early check.

## Milestone 6: The chat comes first in a stopped workspace

Tags: ui

Depends on: 1, 2, 4

Waits for chat-first decision 2. The chat keeps its composer when the
computer is stopped, and the tab asks for the resume when it shows again.

- [ ] The sandbox view keeps the composer for a stopped computer, with
      the stopped line above it. Update `sandboxView` and the words in
      `notice-copy.ts`. The Terminal and Preview panels keep their
      Resume.
- [ ] The workspace model asks for the resume of a stopped workspace when
      its page turns visible again, through `AppServices.visible`. It
      asks only while the view shows, never for a hidden page, never for
      a failed start, and never in a suspended org.
- [ ] Under option D of chat-first decision 2, the model also asks for the
      resume at the next input in a tab that stayed visible, through
      `AppServices.onInput`.
- [ ] After a Restore from the open workspace, the same rule applies.
- [ ] Bring the chat's own bar in `src/chat/components/SandboxState.tsx`
      to the same rule, so that the chat development page shows what the
      product shows.
- [ ] Move each test of the Resume bar to the new way, with every
      assertion. Add cases for the page that turns visible, the input in
      a visible tab, a hidden page, a failed start, a suspended org, and a
      Restore from the open workspace.
- [ ] Update the workspace screen README and the chat README.
- [ ] Run the targeted tests, `npm run typecheck`, and the early check.
      Smoke-test the stopped state with `npm run dev`.

## Milestone 7: Worker: a create waits for the build of its repository

Depends on: 2

A create whose repository a running or due build prepares is admitted at
once and waits for that build. In this milestone, a create with no build
to come still gets the refusal of today, so the product keeps working.
Read the `databases` and `testing` skills first.

- [ ] Admit a create of a chosen repository while a running build holds
      it, or while an added build is due. Store the attempt, the plan, the
      workspace row, and the first message with no image and no lease.
- [ ] Add the migration that lets a plan wait for its image.
- [ ] Add the wait phase to the start coordinator, with the `build` start
      step. Pin the image as `pinRetryCreation` does, with the current
      startup script and env vars, and a fresh 20-minute limit.
- [ ] Wake each waiting workspace of the org at each publish and each
      failure of a build. Add the check on the alarm of each waiting
      workspace, every 5 minutes.
- [ ] Fail each start that waits for a failed build, with a code and a
      message that name the build. Keep the workspace, its chat, its
      queue, and Try again. Try again waits again while a build runs or
      is due.
- [ ] End the wait at a removal of the repository, a suspension, a
      deletion of the org, and an Archive.
- [ ] Routine runs and pull request runs wait in the same way.
- [ ] The create call of the agent tools answers at the admission of a
      waiting create. The repository list returns each chosen repository
      with its ready field.
- [ ] Add Worker tests for each case above: a create during the first
      build, a create in a waiting repository, a build that succeeds, a
      build that fails, a build that passes its limit, a lost wake, Try
      again during a build, a removal, a suspension, an Archive, a
      routine run, and the agent tool calls.
- [ ] Update the lifecycle README and
      [Image builds](../worker/lifecycle/image-builds.md).
- [ ] Run the targeted tests, `npm run typecheck`, and the early check.

## Milestone 8: Worker: a create starts the build when none will come

Depends on: 7

A create that a person sends, with no build to come, starts the build,
also for a member who is not an admin. The refusal of a create of a
chosen repository goes.

- [ ] When no build runs and none is due, a create that a person sends
      starts a build, also after a failed build. The owner of the new
      workspace is the starter. Skip the admin check of
      `startImageBuild` on this path only.
- [ ] A scheduled routine run, a pull request run, and the create call of
      an agent start no build after a failed build. They wait for a build
      that runs or is due. When none comes, the first start fails with
      the cause of the failed build.
- [ ] While a refresh runs, the wait starts the build when the refresh
      ends.
- [ ] When a build succeeds, but its image still lacks the repository and
      no added build is due, the wait starts a build for the owner of its
      workspace.
- [ ] Try again of a failed waiting start starts a build when none runs or
      is due, for any member.
- [ ] When the build cannot start, the first start fails with that cause,
      and the workspace keeps its message and Try again.
- [ ] Remove `image_required` and `repository_not_found` from the create
      of a chosen repository, with their words. Keep
      `repository_not_found` for a repository that the org did not choose
      or removed.
- [ ] Add Worker tests for each case above, also a member's create after
      a failed build, a scheduled run after a failed build, two creates
      that share one build, and a suspension of the member who started
      the build.
- [ ] Delete `plans/follow-ups/workspace-waits-for-first-build.md`, which
      this change fixes. Update the **Related** lines of
      `plans/follow-ups/first-build-retry.md`,
      `plans/follow-ups/added-build-can-be-lost.md`, and
      `plans/follow-ups/build-during-refresh-starts-nothing.md`, so that
      no line links to the deleted item and each names the new wait.
- [ ] Update the lifecycle README and Image builds.
- [ ] Run the targeted tests, `npm run typecheck`, and the early check.

## Milestone 9: New workspace sends during a build, and the workspace shows the wait

Tags: ui

Depends on: 1, 2, 5, 8

New workspace keeps Send on during a build and for a waiting repository.
The new workspace shows the build as its first start step.

- [ ] Remove the build notices from the readiness of
      `useNewWorkspaceForm`. The other reasons for Send off stay.
- [ ] Turn each waiting repository on in the repository picker, with its
      note. Change the words of both notices, as the mockups show. Keep
      the admin link.
- [ ] Show the `build` start step with the time since the build began,
      and the admin link to the build on the Cloud computer tab.
- [ ] Show a failed waiting start with the bar that names the failed
      build, Try again, and the composer under it.
- [ ] Change the finish words of Get started for the build states.
- [ ] Bring the fakes of `src/test-support/` and the dev wiring of
      `src/app/dev/` to the create that waits, so that `npm run dev`
      shows a create during the first build and in a waiting repository.
- [ ] Move each test of Send off during a build to the new way, with
      every assertion. Add cases for a create during the first build, in
      a waiting repository, after a failed build, and for a member.
- [ ] Delete `plans/follow-ups/new-workspace-unknown-build-data.md`. With
      this change, old build data changes only a note, and the Worker
      refuses no create of a chosen repository.
- [ ] Update the web app README, [Creation recovery](../src/app/creation-recovery.md),
      and the workspace screen README.
- [ ] Run the targeted tests, `npm run typecheck`, and the early check.
      Smoke-test both creates with `npm run dev`.

## Milestone 10: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`,
      after `npm --prefix desktop ci` and `npm ci --prefix runner`.
- [ ] Smoke-test with `npm run dev`: a create during the first build of a
      new org, a create in a waiting repository, a failed build during a
      wait with Try again, the return to a stopped tab, and a failed
      resume.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan". Give each open chat-first decision a follow-up item first.
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds or deletes.

## Post-merge follow-up (non-blocking)

- [ ] On the deployment, create a workspace during the first build of a
      new org. Check that the workspace opens at once, shows the build as
      its first step, and starts the agent after the build.
- [ ] On the deployment, leave a workspace tab until its computer stops.
      Switch to another tab and back. Check that the resume starts at
      once, and that a message sent before it reaches the agent.
