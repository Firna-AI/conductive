# Skill lines need a check on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, from the post-merge tasks of the plan for skill lines in the chat, branch `calummoore/skill-usage-indicator`.
- **Location:** None.
- **Reason:** the check needs the merged change on the deployment, and an org image build that installs the new agent runner.

- **Terms:**
  - **Skill:** a folder with a `SKILL.md` file of instructions that an agent loads when a task needs them.
  - **Skill line:** the chat line of one skill use, such as "Used skill brainstorming", as the section "Skill lines" of `docs/protocol/chat-and-events.md` states.
  - **Org image:** the prepared cloud computer image of an org. Each build installs the newest agent runner.
- **Background:**
  - The change shows each skill that an agent loads as a skill line in the chat, and names the skills on each fold line. The concise and the full transcript copy use the same words.
  - Agents powered by Claude load the skills of the repository's `.claude/skills/` folder. The runner names the skill of each call of the Claude skill tool.
  - Codex loads the skills of the repository's `.agents/skills/` folder. The runner asks Codex for its list of loaded skills, and names the skill of each command that reads the `SKILL.md` file of a listed skill. It compares real paths, so a read through a linked skill folder also counts.
  - Tests cover each part with fakes of the agent programs. No test runs a real agent with a real skill.
- **Task:**
  1. Build the org image of a test org on the deployment, so that its cloud computers get the new runner.
  2. In a repository with a skill in `.claude/skills/`, ask an agent powered by Claude to use that skill. Check the skill line while the turn runs, the fold line after the turn ends, and both transcript copies.
  3. In a repository with a skill in `.agents/skills/`, ask a Codex agent to use that skill. Check the same lines.
  4. Repeat the Codex check with a skill folder in `.agents/skills/` that links to a folder elsewhere in the repository.
- **Impact if no action:** A difference between the fakes and the real agent programs, such as a changed input of the Claude skill tool or a changed read action of Codex, stays hidden until a member misses a skill line.
- **Needs:** The merged change on the deployment, an org image build with the new runner, and logins for Claude and Codex.
- **Done when:** Each of the three checks shows the skill line with the skill name, the fold line names the skill, and both transcript copies name it.
