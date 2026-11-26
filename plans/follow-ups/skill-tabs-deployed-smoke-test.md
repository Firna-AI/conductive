# Smoke-test skill tabs on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-25, from branch `calummoore/skill-widget-tab-page-dtzl` (skill tabs), the post-merge follow-up of the skill tabs plan.
- **Location:** None.
- **Reason:** The test needs the merged change on the deployment at `conductive.build`, and a cloud computer that runs the runner release of that change.

- **Terms:**
  - **Skill chip:** the chip that shows a skill, such as `/findings`, in the message box and in a sent message of a workspace chat.
  - **Skill tab:** the tab of the centre column that a press on a skill chip opens. It shows the text of the `SKILL.md` that the agent reads.
  - **Org skill:** a skill of the org skills repository, which an org admin names in the Skills section of the Cloud computer tab.
- **Background:**
  - The skill tabs change makes a press on a skill chip open its skill in the temporary tab. `docs/protocol/skill-tabs.md` states the rules.
  - The browser asks the Worker for the skill by its agent and its name. The Worker sends the runner command `skill.read`, hides the secret values in the text, and gives the text to the app.
  - Tests and a check of the screens in a local browser against the mockups covered the change before the merge.
  - No check ran on the deployment, with a real runner release and a real copy of an org skills repository.
- **Task:** On `conductive.build`, open a workspace of an org with an org skills repository. Its repository holds a skill in `.claude/skills/<folder>/SKILL.md`. Then check each step:
  1. Type `/` in the message box, and choose an org skill. Press the name of its chip. A skill tab opens as the temporary tab. Its title is the name of the skill, in italics, with the skill icon.
  2. If the tab shows "Restart to open this skill", the cloud computer runs older software. Select Restart in the workspace header, and repeat step 1.
  3. Check the header: the name, then "Claude skill" or "Codex skill", the description under it, and the switch between Preview and Source.
  4. Check Preview: the Markdown body of the skill, without its front matter.
  5. Check Source: the whole text with line numbers and the front matter, and the line count in the header.
  6. Repeat steps 1 to 5 with a skill of the repository. Also press the chip of a skill in a sent message.
  7. Open the address of the workspace with `/skills/claude/no-such-skill` after it. Check that the tab shows "This skill was removed or renamed", with "Type / in a message to see the current skills."
- **Impact if no action:** A fault that only the deployment shows stays unknown until a member meets it. Examples are a runner release without skill reads, or a secret filter that fails on real data.
- **Needs:** The merged change on the deployment. A workspace whose cloud computer runs the runner release of the change, after a start or after Restart in the workspace header. An org with an org skills repository, and a repository with a Claude skill.
- **Done when:** On the deployment, the chips of an org skill and of a repository skill open their skill tab. Each tab shows the right header, Preview, and Source, and the notice of step 7 shows. Or a new follow-up item records each step that fails, with what it showed.
