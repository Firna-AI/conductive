# Commits name the earlier owner after a change

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from the options check of the plan `plans/commit-author-in-cloud-computers.md`, branch `calummoore/git-identity-error`.
- **Location:** `worker/lifecycle/start-machine.ts:57`, `worker/lifecycle/ownership-maintenance.ts:3`, and `worker/lifecycle/machine-credential-data.ts:22`.
- **Reason:** an owner change during a running cloud computer is rare, and each option needs a choice that the commit author change did not make.

- **Terms:**
  - **Cloud computer:** the sandbox of one workspace. The agents, the
    shared terminal, and Git run there.
  - **Sandbox variables:** the environment variables that the Worker gives
    a cloud computer at each create and each resume. The runner, the agents,
    the terminal, and the startup script read them.
  - **Owner change:** a new member becomes the owner of a workspace. An
    admin can reassign it with `reassignWorkspace` in
    `worker/members/ownership.ts`. When a member leaves or an admin removes
    them, `removeOrgMember` in `worker/members/membership.ts` gives their
    workspaces to an admin. Both paths call `workspaceOwnerChangedHook` in
    `worker/lifecycle/ownership-maintenance.ts`.
- **Background:**
  - On 10 November 2026, the user chose that each commit in a cloud
    computer names the person whose GitHub token Git uses. In an agent
    turn, that person is the member whose message started the turn.
    Outside a turn, as in the terminal, that person is the workspace owner.
  - Each commit carries that person's GitHub display name, or login, and
    the GitHub no-reply address `<id>+<login>@users.noreply.github.com`.
  - The owner's author reaches the cloud computer as the sandbox variables
    `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and
    `GIT_COMMITTER_EMAIL`. The Worker sets them only at a create or a
    resume. No provider route changes them in a running computer.
  - The terminal's shell server loads these variables once at its start,
    in `worker/terminal/scripts.ts`. So a new shell also gets the earlier
    values. Programs that the startup script started keep them too, and so
    does each agent turn in a workspace from an older org image.
  - The git credential route reads the current owner at each request, in
    `worker/lifecycle/machine-credential-data.ts`. So after an owner
    change, Git outside a turn pushes with the new owner's token at once.
  - A cloud computer stops after 30 minutes without user activity and
    without a running agent turn. Its next resume gives the new owner's
    author. A busy workspace can keep the earlier author for hours.
- **Problem:** After an owner change, commits outside a turn name the
  earlier owner until the next start or resume. Git pushes them with the
  new owner's token.
- **Impact if no action:** After a rare admin action, commits can name a
  member who no longer owns the workspace, or who left the org.
- **Root question:** After an owner change, how soon do the commits that
  name the workspace owner name the new owner?
- **Options:**
  - **A.** Keep the earlier owner's author until the next start or resume,
    and state this in `docs/protocol/github-tokens.md`. Effort: Small.
  - **B.** Give Git the owner's author through a Git settings file in place
    of the sandbox variables. Use the `author.*` and `committer.*` keys,
    which win over a `user.name` that an agent writes into a repository.
    The Worker writes the file at each start, and the owner change hook
    runs a command that rewrites it. Agent turns keep their own variables.
    A failed rewrite keeps the earlier author until the next start.
    Effort: Medium.
  - **C.** A `git` wrapper in the sandbox software, like the `gh` wrapper.
    Before each Git command that writes a commit, it asks the Worker for
    the author of the current turn or of the current owner. It needs a new
    machine route and a network call for each commit. Tools that run
    `/usr/bin/git` directly skip it. Only workspaces from a rebuilt org
    image get it. Effort: Large.
  - **D.** The sandbox variables carry `GIT_CONFIG_COUNT=1`,
    `GIT_CONFIG_KEY_0=include.path`, and a `GIT_CONFIG_VALUE_0` path under
    `/run`, in place of the four owner variables. The startup command
    writes the owner's author into that file, and the owner change hook
    rewrites it in a running computer. Git reads the file at each command,
    with the precedence of a command-line setting. So the terminal, earlier
    programs, and agents of older images follow at once, and the turn
    variables of the runner still win. It needs no image build. A program
    that sets its own `GIT_CONFIG_COUNT` loses the file. Effort: Medium.
- **Left out:**
  - A restart of the terminal at each owner change, because it ends the
    shared shell and its running programs.
  - A stop of the computer at each owner change, because it ends running
    commands.
  - New shell variables through the tmux server or a prompt hook, because
    D also reaches running programs, scripts, and agents.
  - A delay of the owner change until the next stop, because pushes fail
    when the earlier owner left the org.
  - A terminal for each member, because the terminal is shared and uses
    the owner's token outside a turn.
- **Wider fix:** C, because the author then follows the token at each
  commit, also after other changes such as a new display name.
- **Previous examples:** The git credential helper asks the Worker at each
  operation, because the sandbox variables change only at a resume.
- **Related:** `plans/follow-ups/claude-attribution-names-claude-code.md`
  covers other text in the commits of agents. It is not the same problem.
- **Recommendation:** A. Owner changes during a run are rare, and each fix
  costs a day or more. D is the cheapest option that closes the window for
  every Git process.
- **Action:** ask the user, because A states a new requirement for the
  time after an owner change.
