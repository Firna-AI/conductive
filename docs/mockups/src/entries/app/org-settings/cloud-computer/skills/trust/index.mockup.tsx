import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

/** The decision that gives the trust choice. */
const decision =
  'The user chose option C of decision 403 of the skills trust plan on 17 November 2026, and approved its design on 18 November 2026: an admin can trust the skills repository, so that Claude runs the commands that its skills run while Claude reads them, which the words call automatic commands. Trust covers the future updates of the repository, and the commands run with the access of the workspace, so the hint says both.'

/** Why the switch looks as it does, and why its words are short. */
const control =
  'The switch is the switch of @firna/ui, at the end of its label, as the other switches of the settings show it. Its hint says what the current value does, as the hint of "Use for every member" on the Agents tab does. The words stay short, and "How trust works" opens the Cloud computer guide in a new tab, which gives the details. Each cloud computer takes the saved choice when it starts or resumes, so the note says that a running one keeps its current trust until then.'

/** Why the field and the switch save together. */
const draft =
  'Trust belongs to the repository that it names, from the design of decision 403. The field and the switch form one draft, and Save repository saves both, so an admin can trust a new repository before its first Save. Save repository keeps its name, because the choice is part of the repository.'

export const computerSkillsTrust = defineScreen({
  title: 'Trusted repository',
  description:
    'Cal trusted acme/agent-skills and saved. The switch "Trust this skills repository" under the field is on. Its hint says that Claude can run automatic commands from the skills of this repository, including future updates, with the access of the workspace, and that running cloud computers keep their current trust until their next start or resume. "How trust works" opens the guide in a new tab. Save repository is off.',
  rationale: `${decision} ${control} ${draft} An untrusted repository shows the switch off, as app/org-settings/cloud-computer shows.`,
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', skillsTrust: 'trusted' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'unsaved',
      title: 'Trust turned on, not saved',
      description:
        'acme/agent-skills is untrusted, and Cal turned the switch on without saving. The hint now says what trust does, and Save repository is on. Nothing changes until Save.',
      rationale: `${draft} Save repository waits for a change of the field or of the switch, so it is on here.`,
      props: { skillsTrust: 'unsaved' },
    },
    {
      slug: 'replaced',
      title: 'Another repository in the field',
      description:
        'acme/agent-skills is trusted, and Cal typed acme/team-skills in its place without saving. The switch is off, and its hint starts with "A new repository starts untrusted." The list still shows the 12 skills of the saved acme/agent-skills. Save repository is on.',
      rationale: `${draft} A change of the field clears the choice, so the trust of acme/agent-skills never passes to acme/team-skills, and the hint says why the switch is off. Cal can turn the switch on again before Save to trust acme/team-skills. The list belongs to the saved repository, as before.`,
      props: { skillsTrust: 'replaced' },
    },
    {
      slug: 'member',
      title: 'Trusted, seen by a member',
      description:
        'Priya, a member who is not an admin, sees acme/agent-skills and "Trust: Trusted" as read-only rows. Under them come the hint of trust, the note, and "How trust works". The section has no switch and no Save.',
      rationale:
        'Only an admin changes the choice, for the reason of decision 57, because it changes what Claude does in every workspace of the org. A member sees it, because it also covers the skills and custom slash commands of their own workspaces. An untrusted repository reads "Not trusted" in the same place, as app/org-settings/cloud-computer/member shows.',
      props: { skillsTrust: 'trusted', viewer: 'member' },
    },
  ],
})
