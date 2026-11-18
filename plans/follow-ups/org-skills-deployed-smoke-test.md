# Smoke-test org skills on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, the post-merge tasks of the org skills repository plan.
- **Location:** None.
- **Reason:** The test needs the merged change on the deployment and cloud computer software that supports org skills and repository trust.

- **Terms:**
  - **Org skills repository:** one public GitHub repository of agent skills that an org admin names in the Skills section of the Cloud computer tab. `docs/protocol/org-skills.md` states its rules.
  - **Runner:** the app's program in each workspace's cloud computer. It copies the skills repository and gives its skills to Claude and Codex.
- **Background:** The runner copies the repository at its start and checks it every 5 minutes. Before the change, this org cloned `futex-ai/skills` from its install script into `~/.futex/skills`, but the agents of the app did not read that copy.
- **Task:**
  1. After updated runner and helper software arrives, set the org skills repository to `futex-ai/skills` on the Cloud computer tab. Existing automatic software updates can supply it. A new image build is unnecessary.
  2. Check that the section lists its skills.
  3. Start a new Claude session and a new Codex session in a new workspace. Check that each lists the skills of the repository.
  4. Push a change to a skill, wait 5 minutes, and check that a next turn sees it.
  5. Ask the user whether to remove the manual skills install from the org install script.
  6. Check that the repository starts untrusted. Check the saved Trust detail for a member and the public trust guide link.
  7. Save trust on and off in a test org. Check each saved choice after a cloud computer stops and resumes. Restart alone keeps its start settings.
- **Impact if no action:** A fault that only the deployment shows, such as a network limit on GitHub, stays unknown.
- **Needs:** The merged change on the deployment, an org admin, updated runner and helper software, and a test org for trust changes.
- **Done when:** Both agents list the skills of `futex-ai/skills`, a pushed change reaches a next turn, trust saves and the guide work, and the user answered the question about the install script.

Software updates and settings have separate timing. Updated software
arrives under `docs/protocol/sandbox-software.md`. A saved repository or
trust choice applies at the next cloud computer start or resume, as
`docs/protocol/org-skills-trust.md` says.
