# Finish the live checks of GitHub stacks

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-24, from `calummoore/merge-queue-k2ep`, decision 319 of its plan.
- **Location:** `worker/merge-queue/server-rebase.ts:10`.
- **Reason:** The checks need a scratch repository that the GitHub App can reach. The agent's GitHub App token could not create one (`createRepository` was refused), so Cal must create it.

- **Terms:**
  - **GitHub stack:** GitHub's own stacked pull requests. Each pull request targets the branch of the one below it, and a merge of one also merges each one below it.
  - **Restack:** a move of one queued pull request onto the newest commit of the branch below it.
  - **Server rebase:** GitHub's GraphQL mutation `updatePullRequestBranch` with `updateMethod: REBASE`, which rebases one pull request branch on GitHub's servers.
- **Background:**
  - The merge queue keeps its queued pull requests in one GitHub stack (decision 313). Its rules are in `docs/protocol/merge-queue.md` and `docs/protocol/merge-queue-stack.md`.
  - On 22 November 2026 Cal chose decision 319 B: a restack first asks GitHub for a server rebase, and sends an agent turn only on a conflict. He chose it on one condition: a live check must show that the server rebase keeps only the layer's own commits after a squash merge below it.
  - The code for the server rebase exists, behind the constant `GITHUB_SERVER_REBASE_FIRST = false` in `worker/merge-queue/server-rebase.ts`. Until it is on, every restack uses one agent turn (decision 319 A), which works but costs a turn.
  - The stack client and its fakes were built from GitHub's REST docs (`/repos/{owner}/{repo}/stacks`, API version `2026-03-10`), not from a live repository.
  - The server rebase rebases only onto the pull request's current GitHub base. The queue sets a new base only after a restack (`docs/protocol/merge-queue-stack.md`), so the check must show whether this order works with the server rebase.
- **Task:**
  1. Cal creates the private repository `Firna-AI/merge-queue-scratch` with a README, and gives the Conductive GitHub App access to it. Never use `Firna-AI/conductive` for these checks.
  2. With small branches and pull requests, check and record:
     - A merge of an upper layer merges the layers below.
     - A stack merge that stops partway, and the state of each layer.
     - Which layers GitHub rebases after a merge, and which webhooks it sends.
     - A base that already holds the head of the layer.
     - The server rebase of one layer after a squash merge below it: does it keep only the layer's own commits, refuse a stale expected head, and accept a member's user token?
     - Which GitHub App permission the stacks routes need.
     - That a stack and its bases survive a rename of the default branch.
  3. Fix each difference between GitHub and the fakes in `worker/github/fake-stacks.ts`, `fake-pull-writes.ts`, and the code that relies on it.
- **Results of 25 November 2026:** an agent ran the checks in the private repository `calummoore/merge-queue-scratch`, with Cal's fine-grained personal access token. The token could not create a repository in the `Firna-AI` org ("You need admin access to the organization"), so the repository is in Cal's own account.
  - A merge of the top layer merged every layer below it, and the stack then read `open: false`.
  - A merge of a middle layer merged the layers below it. GitHub then moved the layer above to the trunk and rebased it by itself. Its timeline showed `automatic_base_change_succeeded` and `head_ref_force_pushed`, and it kept only its own commit.
  - A base change to a branch that already holds the pull request's head was refused with HTTP 422, "There are no new commits between base branch and head branch". GitHub did not treat the pull request as merged.
  - The server rebase refused a stale expected head ("head sha didn't match the current head ref").
  - The server rebase did not keep only the layer's own commits after a squash merge below it. It replayed the commits of the merged layer and failed with `PullRequest::RebaseConflictError`. So the condition of decision 319 B failed.
  - Not checked: a stack merge that stops partway, because no way to force it was found. The GitHub App permission, because the checks used a personal token. A rename of the default branch, because the token lacks the Administration permission (HTTP 403).
- **Decision of 25 November 2026:** after these results, Cal chose decision 319 A: one restack turn for every restack. The server rebase code was removed. The remaining work is the three checks that did not run, and step 3.
- **Impact if no action:** A difference between GitHub and the fakes can stall the queue in production.
- **Needs:** The merged change, the scratch repository with the GitHub App installed, and Cal's GitHub account.
- **Done when:** The stack merge that stops partway, the GitHub App permission, and the rename of the default branch each have a recorded result, and the fakes match GitHub.
