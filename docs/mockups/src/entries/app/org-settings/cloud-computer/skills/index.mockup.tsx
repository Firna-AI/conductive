import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

/** The decision that gives the setting and its timing. */
const decision =
  'The user chose option B of decision 1 of the org skills repository plan on 13 November 2026: the cloud computer of each workspace copies the skills repository when it starts, and checks it for new commits every 5 minutes. A changed repository reaches each workspace when it starts, as a changed env var does, so the hint under the field says when a change applies.'

export const computerSkills = defineScreen({
  title: 'No skills repository',
  description:
    'Cal opens the tab before an admin of Acme chose a skills repository, as every org starts. The Skills section at the end of the tab has an empty Repository field with the placeholder owner/repository, and Save repository is off until the field changes. The description says that agents in every workspace use the skills of the repository and get its updates within minutes. The hint says that a change applies at the next start of each workspace.',
  rationale: `${decision} The user changed decision 3 of that plan to option A on 16 November 2026: only the skill folders of the repository load, not a rules file. Only an admin sees the field, from decision 2 A of that plan, as app/org-settings/cloud-computer/member/no-skills shows. A new org shows the same empty field, as app/org-settings/cloud-computer/first-build shows.`,
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', skills: 'none' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'pasted-link',
      title: 'Link pasted from GitHub',
      description:
        'Cal pasted https://github.com/acme/agent-skills into the empty field, and Save repository is on. Save repository stores the repository as acme/agent-skills, as app/org-settings/cloud-computer shows.',
      rationale: `${decision} The field also takes a link from GitHub, because members copy links from GitHub, as a design call of that plan says. The app stores owner/name, so the read-only view shows one form.`,
      props: { skills: 'pasted-link' },
    },
  ],
})
