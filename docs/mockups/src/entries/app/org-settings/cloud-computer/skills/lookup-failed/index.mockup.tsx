import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

export const computerSkillsLookupFailed = defineScreen({
  title: 'List that did not load',
  description:
    'GitHub is not available when Cal opens the tab. In place of the list, the notice of data that did not load says "The list of skills did not load" and that GitHub is not available right now, with Try again. The field keeps acme/agent-skills, and Save repository is off.',
  rationale:
    'The user answered decision 7 of the org skills repository plan with a new option, H, on 16 November 2026: the section looks up the saved repository on GitHub at Save and at each load of the section. A design call of that plan gives a lookup that fails, such as in a GitHub outage, a notice that the skills cannot be listed now, and the saved repository stays. The notice is the one that the app shows for each part that did not load, with the danger tone and Try again, which loads the section again. A member sees the same notice, because anyone can load the section again.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', skills: 'lookup-failed' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
