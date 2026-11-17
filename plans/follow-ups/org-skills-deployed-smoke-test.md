# Smoke-test org skills on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, the post-merge tasks of the org skills repository plan.
- **Location:** None.
- **Reason:** The test needs the merged change on the deployment and a build of the org's cloud computer with the new runner.

- **Terms:**
  - **Org skills repository:** one public GitHub repository of agent skills that an org admin names in the Skills section of the Cloud computer tab. `docs/protocol/org-skills.md` states its rules.
  - **Runner:** the app's program in each workspace's cloud computer. It copies the skills repository and gives its skills to Claude and Codex.
- **Background:** The runner copies the repository at its start and checks it every 5 minutes. Before the change, this org cloned `futex-ai/skills` from its install script into `~/.futex/skills`, but the agents of the app did not read that copy.
- **Task:**
  1. After a build installs the new runner, set the org skills repository to `futex-ai/skills` on the Cloud computer tab.
  2. Check that the section lists its skills.
  3. Start a new Claude session and a new Codex session in a new workspace. Check that each lists the skills of the repository.
  4. Push a change to a skill, wait 5 minutes, and check that a next turn sees it.
  5. Ask the user whether to remove the manual skills install from the org install script.
- **Impact if no action:** A fault that only the deployment shows, such as a network limit on GitHub, stays unknown.
- **Needs:** The merged change on the deployment, an org admin, and a build of the cloud computer.
- **Done when:** Both agents list the skills of `futex-ai/skills`, a pushed change reaches a next turn, and the user answered the question about the install script.
