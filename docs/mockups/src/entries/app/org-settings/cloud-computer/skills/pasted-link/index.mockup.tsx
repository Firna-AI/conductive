import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

export const computerSkillsPastedLink = defineScreen({
  title: 'Link pasted from GitHub',
  description:
    'Cal pasted https://github.com/acme/agent-skills into the empty field, and Save repository is on. Save repository stores the repository as acme/agent-skills, as app/org-settings/cloud-computer shows. The link names a repository, so the trust switch shows under the field, off, and its hint starts with "A new repository starts untrusted." Cal can turn it on before Save. The link is not saved yet, so the section lists no skills.',
  rationale:
    'The user chose option B of decision 1 of the org skills repository plan on 13 November 2026: the cloud computer of each workspace copies the skills repository when it starts, and checks it for new commits every 5 minutes. The field also takes a link from GitHub, because members copy links from GitHub, as a design call of that plan says. The app stores owner/name, so the read-only view shows one form. The user answered decision 7 of that plan with a new option, H, on 16 November 2026: the section looks up the repository on GitHub and lists its skills. The lookup runs at Save and at each load of the section, so the list shows after Save, not while the field changes. Moved here from a variant of app/org-settings/cloud-computer/skills, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', skills: 'pasted-link' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
