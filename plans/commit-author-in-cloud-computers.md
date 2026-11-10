# Commit author in cloud computers

Status: Active. On branch `calummoore/git-identity-error`, no pull request
yet. The pull request that completes the work deletes this plan, as the
`plans` skill says.

Git in a cloud computer has no author name and no author email. So each
`git commit` of an agent or of a member in the terminal fails. An agent
reported "The change is not committed yet, because this computer has no
git identity." Another agent wrote one member's name into the Git settings
of a repository, so later commits there named that member.

The user chose the approach on 10 November 2026. Each commit names the
person whose GitHub token Git uses (decision 231 B). In an agent turn, that
person is the turn sender. Outside a turn, that person is the workspace
owner. Each commit carries that person's GitHub no-reply address (decision
232 A). The Worker adds the owner's author to the sandbox variables of each
start, so current workspaces get it at their next start or resume. Each
turn command also carries the turn sender's author, and the runner gives it
to the agent. That part reaches only the workspaces that start from an org
image built after the change. An org variable with one of the four Git
author names then has no effect (decision 233 A).

The change does not cover signed commits. It also does not cover a personal
or an org choice of the commit name or email. Decision 232 keeps those as
options D to H for later. Two follow-up items are linked:
`plans/follow-ups/commit-author-after-owner-change.md`, which this plan
adds, and `plans/follow-ups/claude-attribution-names-claude-code.md`, which
becomes common once commits work.

Contract owners:

- [GitHub tokens](../docs/protocol/github-tokens.md).
- [Agent instructions](../docs/protocol/agent-instructions.md#access).
- The [sandbox software README](../image/README.md) and
  [GitHub access](../image/github.md).
- The [agent runner README](../runner/README.md).
- The [shared contracts README](../src/shared/README.md).

Replaced ways:

- The inline author of the app's first commit → the shared commit author
  helper. Consumer: `worker/lifecycle/default-branch-command.ts`. Moved and
  deleted in Milestone 2.
- Two copies of the sandbox variable list, in
  `worker/lifecycle/start-machine.ts` and `worker/lifecycle/disk-retention.ts`
  → one builder of the sandbox variables. Moved and deleted in Milestone 2.

## Decisions

### 231. Commits in a cloud computer have no author

Added on 10 November 2026 from the brainstorm of the user's report.

- **Severity:** High. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/lifecycle/start-machine.ts:57` and
  `runner/src/providers/environment.ts:16`.
- **Terms:**
  - **Runner:** the app's program in each cloud computer. It starts the
    agent of each turn.
  - **Turn sender:** the member whose message started an agent turn. Git
    uses this member's GitHub token during the turn.
- **Background:**
  - At each create and resume, the Worker gives the cloud computer a set
    of variables. The runner, the agents, the terminal, and the startup
    script read them.
  - No variable and no Git setting holds an author, so Git refuses each
    commit.
  - Git uses the turn sender's token in a turn, and the workspace owner's
    token outside a turn, as [GitHub tokens](../docs/protocol/github-tokens.md)
    says.
  - An org image build installs the newest runner, but a current workspace
    keeps its runner after each resume.
  - All options keep two facts. Git in the cloud computer makes each
    commit, as the code and the Pull requests guide do. Each push keeps the
    token that decision 50 sets.
- **Problem:** No cloud computer gives Git an author name and email, so
  each commit fails. The comparison page with Conductor shows "Managed Git
  identity" as Available.
- **Impact if no action:** Agents cannot commit or open pull requests
  without a manual step. An agent can write one member's name into the Git
  settings of a repository. Later commits there then name that member.
- **Root question:** Who does a commit made in a cloud computer name as its
  author?
- **Options:**
  - **A.** The workspace owner, for every commit. The Worker adds the
    owner's author to the variables of each create and resume. Current
    workspaces get it at their next resume, with no image build. A
    teammate's turn names the owner, but it pushes with the teammate's
    token. Effort: Small.
  - **B.** The person whose GitHub token Git uses. In an agent turn, this
    is the turn sender. Outside a turn, as in the terminal, this is the
    workspace owner. The owner part works as in A. The Worker also sends
    the sender's author with each turn, and the runner gives it to the
    agent. The sender part reaches only workspaces that start from an org
    image built after the change. In older workspaces, a teammate's turn
    names the owner. Effort: Medium.
  - **C.** As B in agent turns, with no author outside a turn. The terminal
    then has no default author. All members share one terminal, so a
    member who sets an author there sets it for every member. Agents in
    workspaces from an older image cannot commit. Effort: Medium.
  - **D.** A fixed app author, such as "Conductive", with a co-author line
    for the turn sender. GitHub then shows the app as the author, and the
    person only as a co-author. Commits from the terminal also show the
    app. Git adds no co-author line by itself, so the agent or a hook must
    add it. Effort: Medium.
  - **E.** As B, but an org variable wins. When the org sets any of the
    four Git author variables, the Worker adds none of its own and sends
    no turn author. The org's values then name every commit. An admin can
    then name one person in every commit, which repeats the reported
    problem on purpose. Effort: Medium.
  - **F.** The owner default of A, and a `git` wrapper in the sandbox
    software, like the `gh` wrapper. Before each Git command that writes a
    commit, the wrapper asks the Worker for the author of the current turn,
    or of the current owner outside a turn. So the author follows the
    token, also after an owner change. It needs a new machine route, a
    network call for each commit, and a list of Git commands. Tools that
    run `/usr/bin/git` directly skip it. It reaches only workspaces from a
    rebuilt image. Effort: Large.
- **Left out:**
  - Change nothing, because agents still cannot commit.
  - An agent rule that sets the author for each commit, because it depends
    on the model, and the terminal still has no author.
  - Commits through an app tool with the GitHub API, because plain
    `git commit` still fails.
- **Wider fix:** B. One shared helper builds the author for the first
  commit, for the owner default, and for each turn.
- **Previous examples:**
  - Conductor workspace "GitHub Push Failure", 9 November 2026. An agent
    hit this gap there. It wrote Jenna Ramdenee's name and no-reply address
    into the Git settings of that repository.
  - `worker/lifecycle/default-branch-command.ts` names the sender in the
    app's first commit.
  - Conductor writes the creator's author into each cloud workspace when
    it creates it. It does not change the author for each message. That is
    option A.
- **Related:** Decision 232 sets the email of the person that this decision
  names. Decision 233 sets what an org variable with the same name does.
- **Recommendation:** B. Each commit then names the same person as its
  GitHub token, as decision 50 and the comparison page describe.
- **Action:** ask the user, because each option publishes a person's name
  and email in commits on GitHub, and no requirement covers that.
- **Chosen:** B, by the user on 10 November 2026, after the comparison with
  Conductor.
- **Changed on 10 November 2026:** after the choice, the options check
  added E and F. F brings back the Git wrapper from **Left out**, because
  B does not follow an owner change at once. The check also corrected the
  facts of B, C, and D. The recommendation stays B.

### 232. No rule sets the commit email

Added on 10 November 2026 from the same brainstorm.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/default-branch-command.ts:11`.
- **Terms:**
  - **No-reply address:** GitHub's private address for an account,
    `<id>+<login>@users.noreply.github.com`. GitHub links each commit with
    it to that account.
  - **Mac app:** the optional Conductive desktop app under `desktop/`. A
    member who works only in the browser does not have it.
- **Background:** Each commit carries an email, and each reader of the
  repository can see it. GitHub links a commit to an account only when its
  email belongs to that account. At each sign-in, the app stores every
  verified GitHub email of the member and which one is primary. It does not
  store the public email of the GitHub profile. The app's first commit
  already uses the no-reply address.
- **Problem:** No requirement says which email a commit in a cloud computer
  carries.
- **Impact if no action:** A wrong choice can put a private address into
  the history of a repository for good. GitHub refuses a push when its
  author blocks pushes that expose their email.
- **Root question:** Which email address names a person in the commits of a
  cloud computer?
- **Options:**
  - **A.** The no-reply address. GitHub links each commit to the account
    and shows no private address. A company rule that wants work addresses
    in commits gets none. A GitHub ruleset that requires such an address
    refuses the push. Effort: Small.
  - **B.** The primary verified email. It matches the person's commits on
    their own computer. It publishes that address for good, and GitHub can
    refuse the push. The Privacy page must also add this use of the
    address. Effort: Small.
  - **C.** The public email of the GitHub profile, or the no-reply address
    when the profile shows none. It publishes only an address that the
    person already shows. The app must read and store that email at
    sign-in. Effort: Medium.
  - **D.** A setting where each member chooses a commit name and email,
    with the no-reply address as the default. It needs a settings screen,
    a mockup, and storage. Effort: Large.
  - **E.** The name and email from the member's own Git settings on their
    Mac, as Conductor does. The Mac app reads them and sends them to the
    app. A member without the Mac app gets the no-reply address. The app
    publishes the address that the person uses for local commits. Effort:
    Large.
  - **F.** An admin names the work email domain of the org. Each member's
    commits carry their verified GitHub email at that domain, or the
    no-reply address without one. It meets a company rule and publishes no
    personal address. It needs an org setting, a mockup, storage, and a
    Privacy page change. Effort: Large.
  - **G.** Follow each person's email privacy setting on GitHub. A public
    primary email goes into the commits, and a private one gives the
    no-reply address. The app must store that visibility at sign-in, and a
    change on GitHub applies after the next sign-in. It publishes the
    primary email of each person who never chose privacy. Effort: Medium.
  - **H.** Each member sets the four Git variables as personal cloud
    variables, with the no-reply address as the default. It reuses a
    planned feature, not a commit setting of its own. It needs that whole
    feature first: a screen, a mockup, storage, and delivery with each
    turn. Effort: Large.
- **Left out:** An address that the app makes up, such as one on
  `conductive.build`, because GitHub then links no commit to its person.
- **Wider fix:** None, because one shared helper holds this rule in each
  option.
- **Previous examples:**
  - The app's first commit uses the no-reply address, in
    `worker/lifecycle/default-branch-command.ts`.
  - Conductor writes the creator's own Mac Git settings into each cloud
    workspace, and it has a setting to change them.
- **Related:** Decision 231 names the person whose address this decision
  sets.
- **Recommendation:** A. It works for every member, also without the Mac
  app, and it keeps private addresses out of the history.
- **Action:** ask the user, because the commit email is new personal data
  on GitHub, and no requirement covers it.
- **Chosen:** A, by the user on 10 November 2026. Option E was added on the
  same day, after the user asked what Conductor does.
- **Changed on 10 November 2026:** after the choice, the options check
  added F, G, and H, and corrected the stored emails in **Background**.
  The recommendation stays A.

### 233. Org variables for the commit author stop working

Added on 10 November 2026 from the options check of decisions 231 and 232.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/start-machine.ts:58` and
  `worker/app-api/feature-settings.ts:28`.
- **Terms:**
  - **Org variable:** an environment variable that an org admin saves under
    **Cloud computer** in the settings. Each workspace of the org gets it
    at each start.
  - **App variables:** the variables that the Worker adds itself, such as
    `WORKSPACE_TOKEN` and the `CONDUCTIVE_` names. They come after the org
    variables, so an org variable with the same name has no effect.
- **Background:**
  - The settings accept an org variable of any name. Today an org can set
    `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and
    `GIT_COMMITTER_EMAIL`, and Git uses them.
  - Decision 231 B gives these four variables to Git from the Worker and
    the runner. They also win over an author that the org's install or
    startup script writes into the Git settings.
  - [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md),
    the cloud computer guide, and the security guide say that each sandbox
    gets the org's values.
  - Not every app value wins today. An explicit `GH_TOKEN` or
    `GITHUB_TOKEN`, also from an org variable, replaces the GitHub CLI
    login that the app gives.
- **Problem:** Decision 231 B and an org variable with one of these names
  set the same four values. No rule says which one wins.
- **Impact if no action:** If the app wins, an org value that works today
  stops working, and nothing tells the admin. If the org wins, commits of
  that org stop naming the person of the token.
- **Root question:** What happens to an org's own commit author when the
  app sets the author of each commit?
- **Options:**
  - **A.** The app's author wins, as the `CONDUCTIVE_` names do. The guides
    say that an org variable with one of these names has no effect, and
    that a script cannot change the author either. Effort: Small.
  - **B.** The org's values win. When the org sets any of the four names,
    the Worker adds none of the four and sends no turn author. That org's
    commits then name whoever its values name. The rule must follow the
    values that the running computer got, not the saved settings. Effort:
    Medium.
  - **C.** As A, and the settings screen says that one of these names has
    no effect when an admin saves it. It needs a mockup and new text on
    the screen. Effort: Medium.
  - **D.** As A, and the settings refuse the four names. It adds a new
    refusal to the settings. Effort: Small.
  - **E.** The org's values replace only the owner default. When the org
    sets any of the four names, the Worker adds none of its own, but each
    turn still carries its sender's author. Terminal and script commits
    then carry the org's values, and agent commits name the turn sender.
    The values of the admin then apply only outside a turn, which can
    surprise the admin. Effort: Small.
  - **F.** The author always names the person of the token, and the org's
    committer wins. When the org sets both committer names, the Worker and
    the runner set only the two author names. GitHub then shows the person
    as the author and the org's value as the committer, as for a shared
    bot. It changes the design call that the author and the committer are
    the same person. Effort: Medium.
  - **G.** One shared list holds every name that the app sets or removes:
    `WORKSPACE_TOKEN`, the `CONDUCTIVE_` names, the four Git names, and the
    agent login names that the runner removes. The builder removes the org
    values for the listed names. The settings screen marks each saved row
    with a listed name, and the guides give the same rule. It also covers
    each later app name. It needs a mockup and new text on the screen.
    Effort: Medium.
- **Left out:** A mix where the app fills only the names that the org
  leaves out, because one commit can then join one person's name with
  another person's email. F takes each pair from one source, so F stays.
- **Wider fix:** G. The class is an org variable that the app replaces or
  removes, with no sign to the admin.
- **Previous examples:**
  - The app's `WORKSPACE_TOKEN` and `CONDUCTIVE_` variables already replace
    an org variable with the same name, in
    `worker/lifecycle/start-machine.ts`.
  - The runner removes the agent login names from each agent process, in
    `runner/src/providers/environment.ts`.
- **Related:** Decision 231 B sets the four variables.
- **Recommendation:** A. It keeps the rule of decision 231 B for every org
  at the lowest cost, and the project is not in production. G best protects
  the codebase, because it also tells admins about every other name that
  the app replaces.
- **Action:** ask the user, because A stops org values for these four
  names, which work on `origin/main` today.
- **Changed on 10 November 2026:** before the report, the options check
  added E, F, and G, made G the wider fix, and changed the category to
  Docs or spec. The recommendation stays A.
- **Chosen:** A, by the user on 10 November 2026. This approves the stop of
  org values for the four names. The app's author comes after the org
  variables, and the guides say that an org variable or a script cannot
  change it.

## Design

These are my calls, made on 10 November 2026 under the decision test.

- The name is the GitHub display name, trimmed. The login replaces a
  display name that is missing, or that has no character that Git accepts
  in a name. Git refuses a name made only of spaces and the characters
  `,`, `:`, `;`, `<`, `>`, `"`, `\`, and `'`. The first commit already
  uses the display name or the login.
- The author and the committer are the same person, as in the first commit.
- Git gets the author through its four variables `GIT_AUTHOR_NAME`,
  `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL`. A Git
  settings file was not chosen. Reason: the variables reach the runner, the
  agents, the terminal, and the scripts with no image build. They also take
  precedence over an author that an agent wrote into the Git settings of a
  repository.
- One builder makes the sandbox variables of a start, a resume, and a disk
  retention restart. Reason: a retention restart runs the startup script
  too, and two copies of the list can drift.
- Only the turn command carries the author of the turn sender, from the
  Worker's record of the turn. The runner keeps it from the command that
  started the turn, as it keeps the agent login and the turn ID. A message
  command never starts a turn, so it needs no author. A message from
  another member during the turn changes nothing. Reason: the GitHub token
  of the turn follows the same record, as
  [Agent instructions](../docs/protocol/agent-instructions.md#access) says.
- The runner treats a missing author as no author, and keeps the sandbox
  variables. A malformed author does the same and gives a local warning.
  The turn continues. Reason: an old Worker or a bad field must not stop a
  turn.
- After an owner change, commits outside a turn keep the earlier owner's
  author until the next start or resume. The terminal's shell server,
  running programs, and older runners keep the variables of the start.
  `plans/follow-ups/commit-author-after-owner-change.md` holds the options
  for an update at once.
- The decision numbers 231 to 233 come after each number on `origin/main`
  and in the open pull requests on 10 November 2026.
- This Claude session orchestrates the plan, because the user started the
  task in this workspace.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol docs state the commit author rule and decisions 231 to 233.

- [x] Add a commit author section to `docs/protocol/github-tokens.md`. Give
      the turn sender rule, the owner rule, the name rule, and the email
      rule. Cite decisions 231 and 232, with the rejected options and their
      reasons. Add the rule of decision 233 A: an org variable with one of
      the four names has no effect.
- [x] Under "Access" in `docs/protocol/agent-instructions.md`, say that
      the commits of a turn name the same member as its token. Link to the
      new section.
- [x] Update the env var requirement of
      `docs/protocol/workspaces-and-sandboxes.md` for decision 233 A. Say
      that the app's own names, such as the four Git author names, replace
      an org variable with the same name.
- [x] Check `docs/architecture.md` and `docs/architecture/components.md`.
      Add the commit author where they list the Git access of a sandbox.
- [x] Check each relative link of each changed Markdown file.

## Milestone 2: Owner default in the sandbox variables

Depends on: 1

Each start, resume, and disk retention restart gives the cloud computer the
workspace owner's author. Current workspaces get it at their next start or
resume, with no image build.

- [x] Add `src/shared/commit-author.ts`. One function makes the name and
      the no-reply address from a `User`. One function makes the four Git
      variables from an author.
- [x] Make `worker/lifecycle/default-branch-command.ts` use the shared
      helper. Delete its inline author.
- [x] Make one builder for the sandbox variables of
      `worker/lifecycle/start-machine.ts` and
      `worker/lifecycle/disk-retention.ts`. Add the owner's author after the
      org variables, as decision 233 A says.
- [x] Extend `worker/lifecycle/runner-environment.test.ts`. A create and a
      resume give the owner's author. An org variable `GIT_AUTHOR_NAME`
      does not replace it. An owner without a usable
      display name gets the login. See each new assertion fail first.
- [x] Update the variables table of `image/README.md`. Add a short commit
      author section to `image/github.md`.
- [x] Run the targeted tests, the typecheck, the lint, the format check,
      and the file-length check.

Evidence: `.context/commit-author-in-cloud-computers/milestone-2/report.md`.

## Milestone 3: Turn commands carry the author of the turn sender

Depends on: 2

The Worker sends the author of the turn sender with each turn command. Old
runners ignore the new field.

- [ ] Add `commitAuthor`, an author or null, to `RunnerTurn` in
      `src/shared/runner.ts`.
- [ ] Fill it in `worker/chat/runner-delivery.ts` from the sender of the
      stored turn. A missing user gives null.
- [ ] Extend the turn cases of `worker/chat/queue.test.ts`. The owner's
      turn carries the owner's author. A turn that the member starts
      carries the member's author. See each new assertion fail first.
- [ ] Update the fakes and fixtures that build runner turn commands.
- [ ] Update the runner contract text in `src/shared/README.md`.
- [ ] Run the targeted tests and the checks of Milestone 2.

## Milestone 4: The runner gives each agent the author of its turn

Depends on: 3

Each agent process gets the author of its turn in the four Git variables.
The terminal and the scripts keep the owner's author.

- [ ] Parse `commitAuthor` of a turn command in `runner/src/commands.ts`.
      A missing field gives null. A malformed field gives null and a local
      warning.
- [ ] Pass the author of the command that started the turn to
      `providerEnvironment` in `runner/src/providers/environment.ts`. Set
      the four variables there. Without an author, keep the inherited
      values.
- [ ] Extend `runner/src/providers/workspace-tools.test.ts` for both
      agents. Alice's turn gets her author. Bob's message during that turn
      keeps it. Bob's next turn gets his author. A turn without an author
      keeps the inherited values. See each new assertion fail first.
- [ ] Add the missing and malformed cases to the parse test of runner
      commands.
- [ ] Update `runner/README.md`.
- [ ] Run `npm --prefix runner run typecheck` and `npm --prefix runner test`.

## Milestone 5: Public guides, Privacy page, and comparison row

Depends on: 1

The public text says who a commit names.

- [x] In `src/marketing/docs/pull-requests.md`, after the sentences about
      GitHub operations, say that commits name the same person with their
      private GitHub address.
- [x] In the GitHub account section of
      `src/marketing/docs/terminal-and-previews.md`, say that commits name
      the same person as the table, with their private GitHub address.
- [x] Give the rule of decision 233 A in
      `src/marketing/docs/cloud-computer.md` and
      `src/marketing/docs/security.md`, where they say that each workspace
      gets every org value. An org variable or a script cannot change the
      commit author.
- [x] Read the Privacy page in `src/marketing/privacy.ts` and
      `src/marketing/privacy-uses.ts` in full. Say that commits carry the
      member's GitHub name and no-reply address, and that each reader of
      the repository sees them. Add this use of the GitHub ID and the login
      to the purposes. Set the effective date to the date of the change.
- [x] Read the Terms page in `src/marketing/terms.ts` and every public
      guide in full. Update each sentence that restates a changed fact.
      Follow the marketing README when the Terms change.
- [x] Add the commit author to the note of the `managed-git-identity` row
      in `src/marketing/from-conductor/areas/cloud.ts`. Keep its status
      Available.
- [x] Follow [Website docs](../docs/protocol/website-docs.md) and the copy
      rules of the `product-ui` skill. Run `npm run site:build` and
      `npm run typecheck`.

## Milestone 6: Verification, commit, review, and pull request

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
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds. It also says that only
      workspaces from an image built after the merge get the turn sender
      part.

## Post-merge follow-up (non-blocking)

- [ ] On the deployment, resume a workspace and commit in its terminal.
      Check that GitHub shows the owner as the author.
- [ ] Build an org image again, and create a new workspace from it. Let a
      member send a message in another member's workspace and ask the agent
      to commit and push. Check that GitHub shows the sender as the author.
