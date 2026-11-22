import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

export const computerSkillsWithout = defineScreen({
  title: 'Repository without skills',
  description:
    'Cal saved acme/agent-skills before anyone added a skill to it. In place of the list, a notice says "acme/agent-skills has no skills yet", and that agents use each folder with a SKILL.md file in the skills folder of the repository, or at its top level. The file and folder names show as code. The trust switch under the field is off.',
  rationale:
    'The user answered decision 7 of the org skills repository plan with a new option, H, on 16 November 2026: the section looks up the saved repository on GitHub, and a repository that holds no skills shows a notice in place of the list. Save still stores the value, because a refusal at Save is a new rejection, and the user did not ask for one. The notice names the two places that the cloud computer loads, from a design call of that plan: each folder with a SKILL.md under skills, or at the top level of a repository without a skills folder. It reads the same for a member, because it names no action of an admin. "Yet" keeps a positive frame for a repository that is still new.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', skills: 'without-skills' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
