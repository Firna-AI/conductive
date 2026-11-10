# Check the turn sender commit author after a build

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the plan `plans/commit-author-in-cloud-computers.md` of pull request #181, branch `calummoore/git-identity-error`.
- **Location:** `worker/chat/runner-delivery.ts` and `runner/src/providers/environment.ts`.
- **Reason:** the check needs the merged change, a new org image build, and two members.

- **Terms:**
  - **Turn sender:** the member whose message started an agent turn. Git
    uses this member's GitHub token during the turn.
  - **Org image:** the saved snapshot that each new cloud computer of an org
    starts from. A build installs the newest agent runner into it.
- **Background:** Since pull request #181, each runner turn command carries
  the turn sender's commit author, and the runner gives it to each agent
  process of the turn. A cloud computer keeps the runner of its org image,
  so only a workspace that starts from an image built after the merge has
  this behaviour. `docs/protocol/github-tokens.md`, section "Commit
  author", states the rule.
- **Task:** After the deploy, run **Build computer** for a test org. Create
  a new workspace from the new image. Let a second member send a message in
  that workspace and ask the agent to commit and push. Read the author of
  the commit on GitHub.
- **Impact if no action:** A fault in the turn author path stays unknown,
  and teammates' commits can name the workspace owner without notice.
- **Needs:** The merged change on the deployment, an org with two members
  and a connected agent login, and a repository where the second member may
  push.
- **Done when:** GitHub shows the commit with the second member's display
  name and no-reply address, and links it to that member's account.
