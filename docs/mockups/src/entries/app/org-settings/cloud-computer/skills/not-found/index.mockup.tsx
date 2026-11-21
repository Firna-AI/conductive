import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

export const computerSkillsNotFound = defineScreen({
  title: 'Repository not found',
  description:
    'Cal saved acme/agent-skils, with a typo. In place of the list, a notice says "acme/agent-skils was not found", that GitHub has no public repository with this name, and that Cal can check the name, then save. The field keeps the saved value, and Save repository is off. acme/agent-skils names a repository as owner/name, so the trust switch shows under the field, off.',
  rationale:
    'The user answered decision 7 of the org skills repository plan with a new option, H, on 16 November 2026: the section looks up the saved repository on GitHub, and a repository that GitHub does not find shows a notice in place of the list. Save still stores the value, because a refusal at Save is a new rejection, and the user did not ask for one. GitHub answers "not found" also for a private repository that the sign-in of the viewer cannot see. So the notice speaks of a public repository, which is the only kind that gives skills, from decision 6 A of that plan. A member reads who can act, as app/org-settings/cloud-computer/member/skills-not-found shows.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', skills: 'not-found' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
