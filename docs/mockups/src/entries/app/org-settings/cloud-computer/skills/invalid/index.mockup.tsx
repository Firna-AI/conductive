import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

export const computerSkillsInvalid = defineScreen({
  title: 'Value that names no repository',
  description:
    'Cal saved agent-skills, without its owner. Save stored the text as typed. In place of the list, a notice says "agent-skills was not found", that GitHub has no public repository with this name, and that Cal can check the name, then save. The section has no trust switch, because the text names no repository to trust. Save repository is off.',
  rationale:
    'Text that is neither owner/name nor a link from GitHub is saved as typed, and the lookup shows the notice of a repository that is not found, from the org skills protocol. The design of decision 403 of the skills trust plan, which the user approved on 18 November 2026, makes the trust choice available only while the field names a repository. Such text cannot be trusted, and it sets no trust policy for the cloud computers, so a switch that shows off would claim a restriction that does not apply. The switch shows, off, once the field holds owner/name or a link from GitHub, as app/org-settings/cloud-computer/skills/pasted-link shows.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', skills: 'invalid' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
