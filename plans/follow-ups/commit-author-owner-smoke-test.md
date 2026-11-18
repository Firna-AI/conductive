# Check the owner commit author on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the plan `plans/commit-author-in-cloud-computers.md` of pull request #181, branch `calummoore/git-identity-error`.
- **Location:** `ownerGitSettingsCommand` in `worker/lifecycle/image-software.ts`.
- **Reason:** A shared terminal commit and an agent commit after a resume are not proven, and the shared terminal needs a signed-in owner.

- **Terms:**
  - **Cloud computer:** the sandbox of one workspace, where the agents and
    the shared terminal run Git.
  - **No-reply address:** GitHub's private address for an account,
    `<id>+<login>@users.noreply.github.com`.
  - **Resume:** the start of a stopped cloud computer, for example when a
    member opens its workspace in the app.
  - **Shared terminal:** a shell of the Terminal tool of a workspace in the
    app, which every member sees and which runs outside an agent turn.
- **Background:** Each start and resume of a cloud computer writes the
  workspace owner's GitHub display name, or login, and no-reply address
  into the Git system settings, `/etc/gitconfig`, as the `author.name`,
  `author.email`, `committer.name`, and `committer.email` keys. The
  startup command of `worker/lifecycle/image-software.ts` writes them.
  `docs/protocol/github-tokens.md`, section "Commit author", states the
  rule. The automated suite does not run this startup command on a real
  cloud computer.
- **Results on 2026-11-18:** The checks used Cal's GitHub account: display
  name `Cal`, login `calummoore`, and ID `4988117`.
  - [Deploy run 44324448083](https://github.com/Firna-AI/conductive/actions/runs/44324448083)
    deployed `70545b5ac` to production at 14:27 UTC. That commit contains
    `36c3b17cb` of 2026-11-11, which moved the owner's author into the Git
    system settings.
  - The head commits of four production follow-up branches of that day
    name `Cal <4988117+calummoore@users.noreply.github.com>` as the author
    and the committer. GitHub links the author and the committer to the
    account `calummoore`. `git log` in a clone gives the same author and
    committer.
    - [`434317327`](https://github.com/Firna-AI/conductive/commit/434317327236a6bbae92c07dcaef8a142b199621), the head of pull request #468.
    - [`2c92cf415`](https://github.com/Firna-AI/conductive/commit/2c92cf4159cb8cca92c11ead087017fb147beace), the head of pull request #470.
    - [`01a1cbf0d`](https://github.com/Firna-AI/conductive/commit/01a1cbf0db9573c526b963cebf9bf2b559ffa30f), the head of pull request #483.
    - [`93a6a9b73`](https://github.com/Firna-AI/conductive/commit/93a6a9b73fda616ee59986229083c48072c047d0), the head of pull request #487.
  - Cal's workspace W-363, created at 14:31 UTC after that deploy, holds the
    four keys in `/etc/gitconfig` with the same name and address. Its
    first start wrote them, and that start is not a resume.
    `git config --show-origin` finds the identity keys only in
    `/etc/gitconfig`. The checks changed no Git setting.
  - In an agent shell of that workspace, `git var GIT_AUTHOR_IDENT` and
    `git var GIT_COMMITTER_IDENT` give the same identity. The same holds
    without the turn variables `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`,
    `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL`. That shell is not the
    shared terminal.
  - Commit [`ca44d3a0c`](https://github.com/Firna-AI/conductive/commit/ca44d3a0c0ebc7d3073b279d74a2c06d85f1b377),
    which added the results above, proves that Git in W-363 takes the
    author from the system settings:
    - An agent of W-363 made it in a pseudo-terminal, with no author
      option and no change to a Git setting.
    - `env -u` removed `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`,
      `GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL`, and `CONDUCTIVE_TURN_ID`
      from the environment of `git commit`.
    - After the push, `git log` and GitHub show `Cal` and the no-reply
      address above as the author and the committer. GitHub links both
      roles to `calummoore`.
    - The commit did not use the shared terminal, and it did not follow a
      known resume.
  - Not proven: a resume, a commit in the shared terminal, and an agent
    commit after a resume. No check above follows a known resume. The
    check had no signed-in app browser.
- **Task:** The owner does these steps on `app.conductive.build`. The
  results above do not replace any of them.
  1. Sign in. Open an existing workspace that you own and whose cloud
     computer is stopped. The open resumes it.
  2. In its shared terminal, make a commit.
  3. In that workspace, send a message that asks its agent to make a
     second commit and to push both commits.
  4. Ask the agent to read both commits with
     `gh api repos/<org>/<repo>/commits/<sha>`. In each, `commit.author`
     and `commit.committer` must give the owner's display name and
     no-reply address. `author.login` and `committer.login` must give the
     owner's login.
- **Impact if no action:** A fault in the startup command, such as quoting
  of a display name, stays unknown until a member's commit fails.
- **Needs:** An owner who can sign in to `app.conductive.build`. An
  existing workspace of that owner, with a stopped cloud computer and a
  repository where the owner may push. A cloud computer stops after 30
  minutes without user activity and without a running agent turn. The
  deployment already has the change.
- **Done when:** GitHub shows both commits with the owner's display name and
  no-reply address, and links them to the owner's account.
