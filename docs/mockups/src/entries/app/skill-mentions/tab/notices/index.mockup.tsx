import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const skillTabNotices = defineScreen({
  title: 'Notices of the skill tab',
  description:
    'The read of the text runs. A spinner and "Opening the skill" take the place of the text. The header already shows the name and the agent, which the tab knows, and the description, from the list of skills that the workspace keeps. So it does not move when the text comes. The saved states show the other notices: a skill that the list no longer holds, a text over the read limit, older cloud computer software, and a read that failed. A stopped cloud computer has its own page, app/skill-mentions/tab/stopped.',
  rationale:
    'The design calls of the skill tabs plan give one notice in place of the text for each case, and no notice names the provider of the sandbox. The tab reads the text each time it shows, and again after each skills report while it shows, so a change of the name or the description of the skill shows without a reload. A stopped cloud computer shows the state of the sandbox in place of the text, as a file tab does, so it has its own page.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'skill-answer',
    focus: 'files',
    tab: 'skill-loading',
    temporary: 'opened',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'gone',
      title: 'Removed or renamed',
      description:
        'The latest skills report no longer holds plans, such as after a rename of its folder. In place of the text, a notice says "This skill was removed or renamed", and asks the member to type / in a message to see the current skills. The header shows the name and the agent without a description, because the list no longer gives one. The tab keeps its title.',
      rationale:
        'The cloud computer reads a skill only by a name that the list of its agent holds, so a name that the list does not hold gets this notice, also from an old address. The notice names what happened and the one way to find the skill again.',
      props: { tab: 'skill-gone' },
    },
    {
      slug: 'too-large',
      title: 'Too large',
      description:
        'The SKILL.md of plans grew over 1 MB after the latest read of the skills. In place of the text, a notice says "This skill is too large to show", and that skills up to 1 MB show here.',
      rationale:
        'The limit is the limit of the read of the skills on the cloud computer, which leaves out a larger skill. So the list holds such a skill only until its next read.',
      props: { tab: 'skill-too-large' },
    },
    {
      slug: 'older-software',
      title: 'Older cloud computer software',
      description:
        'The cloud computer runs older software, which cannot read a skill. In place of the text, a notice says "Restart to open this skill", and that opening a skill needs newer cloud computer software. It asks the member to select Restart in the workspace header, and it has no button of its own.',
      rationale:
        'The software of the cloud computer tells the app when it connects whether it can read a skill, so the notice shows at once. Restart installs the newest software, as app/restart shows, and the tab reads the text when the workspace leaves Starting. The words follow the notice of the HTML preview, which asks for the same Restart.',
      props: { tab: 'skill-older-software' },
    },
    {
      slug: 'failed',
      title: 'Failed read',
      description:
        'The read of the text failed for a cause without a notice of its own: the cloud computer could not read the file, its connection dropped, or the server failed. In place of the text, a notice says "This skill didn\'t open", with Try again, which reads the text again. The header keeps the name, the agent, and the description, because the list of skills still holds the skill.',
      rationale:
        'A design call of the skill tabs plan of 24 November 2026: every tab has a failure state, and Try again repeats the read. The notice has the look and the words of the failure of a file tab, "This file didn\'t open", with no sentence under its title, because the title names what failed and Try again is the way to recover. The notice of a removed skill would give a wrong cause, and a spinner that keeps reading would never end for a lasting failure.',
      props: { tab: 'skill-failed' },
    },
  ],
})
