import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

export const computerSkillsPrivate = defineScreen({
  title: 'Private repository',
  description:
    'Cal saved acme/agent-skills while it is private on GitHub. In place of the list, a notice with a lock says "acme/agent-skills is private", that agents get no skills from it, and that Cal can choose a public repository, then save. The field keeps the saved value, and Save repository is off. The trust switch under the field is off, and its hint still applies: an untrusted repository turns off automatic commands also while it gives no skills.',
  rationale:
    "The user chose option A of decision 6 of the org skills repository plan on 16 November 2026: the cloud computer copies the repository with no GitHub token, so a private repository gives no skills. The user answered decision 7 of that plan with a new option, H, on the same day: the section looks up the saved repository on GitHub, and a private repository shows a notice in place of the list. Save still stores the value, because a refusal at Save is a new rejection, and the user did not ask for one. The lookup uses the GitHub sign-in of the viewer, so it can tell that Cal's repository is private. The notice is neutral, because the lookup worked and only the value needs a change. A member reads who can act, as app/org-settings/cloud-computer/member/private-skills shows.",
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', skills: 'private' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
