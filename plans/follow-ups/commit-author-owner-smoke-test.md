# Check the owner commit author on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the plan `plans/commit-author-in-cloud-computers.md` of pull request #181, branch `calummoore/git-identity-error`.
- **Location:** `ownerGitSettingsCommand` in `worker/lifecycle/image-software.ts`.
- **Reason:** the check needs the merged change on the deployment and a real cloud computer.

- **Terms:**
  - **Cloud computer:** the sandbox of one workspace, where the agents and
    the shared terminal run Git.
  - **No-reply address:** GitHub's private address for an account,
    `<id>+<login>@users.noreply.github.com`.
- **Background:** Each start and resume of a cloud computer writes the
  workspace owner's GitHub display name, or login, and no-reply address
  into the Git system settings, `/etc/gitconfig`, as the `author.name`,
  `author.email`, `committer.name`, and `committer.email` keys. The
  startup command of `worker/lifecycle/image-software.ts` writes them.
  `docs/protocol/github-tokens.md`, section "Commit author", states the
  rule. No automated test reaches a real cloud computer, so the startup
  command and Git are not proven together there.
- **Task:** On `conductive.build`, resume an existing workspace. In its
  Terminal, make a commit, and ask its agent to make a commit in a turn
  that the owner sends. Push both with the agent. Read the author of both
  commits on GitHub.
- **Impact if no action:** A fault in the startup command, such as quoting
  of a display name, stays unknown until a member's commit fails.
- **Needs:** The merged change on the deployment, a workspace that the
  tester owns, and a repository where the tester may push.
- **Done when:** GitHub shows both commits with the owner's display name and
  no-reply address, and links them to the owner's account.
