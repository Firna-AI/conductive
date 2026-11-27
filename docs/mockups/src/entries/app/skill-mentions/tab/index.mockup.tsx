import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const skillTab = defineScreen({
  title: 'Skill tab',
  description:
    'Cal pressed the skill chip plans in the sent message of Address autocomplete. The skill opens in the temporary tab, at the end of the row. The title of the tab is the name of the skill, in italics, after the skill icon. The header shows the skill icon and the name in a quiet chip, then "Claude skill", because the skill is of the Claude agent. The description of the skill follows under that line, muted, in at most three lines. The switch between Preview and Source ends the first line. Preview shows the Markdown body of the SKILL.md that the agent reads, without its front matter, with the look of the preview of a Markdown file. The header has no Copy and no Download. On a phone, the skill opens as a page of the Files tab, which leads back to All files, as a file does. The child pages show the Source view, the temporary tab with a keep and its menu, the notices in place of the text, and the wait while the open starts a stopped cloud computer.',
  rationale:
    'Cal chose option B of skill tab decision 1 on 24 November 2026: a press on a skill chip opens a skill tab. The browser asks for the skill by its agent and its name, and the cloud computer sends the text that the agent reads, with each secret value hidden. So the tab works for each place that a skill comes from, also the org skills and the shared Codex home, and no path leaves the cloud computer. A chip in a sent message opens the skill of the agent of that message. Cal chose option A of skill tab decision 2 on the same day: the skill opens in the temporary tab, which the next press on a skill, a file, or a diff replaces. The tab reads the text each time it shows, and again after each skills report while it shows. Its address, skills/claude/plans after the workspace, opens it again after Back, a reload, or a copied link. The header names the agent of the skill after its name, and the title of the tab stays the name. So two open tabs of one name show whose text each holds, because two agents can hold skills with one name and different texts. The header has no Copy and no Download, because the tab is for reading the skill. A selection copies text from both views.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'skill-answer',
    focus: 'files',
    tab: 'skill',
    temporary: 'opened',
  },
  useCasePaths: ['user-flows/use-a-skill'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
