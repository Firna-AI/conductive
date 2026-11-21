import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

export const computerSkillsIncomplete = defineScreen({
  title: 'List that can be incomplete',
  description:
    'acme/agent-skills is so large that GitHub cut its file tree short. "7 skills" heads the skills that the cut tree holds, in name order. A note under the list says that the repository is too large to list in full, and that agents still get all of its skills.',
  rationale:
    'The user answered decision 7 of the org skills repository plan with a new option, H, on 16 November 2026: the section looks up the saved repository on GitHub and lists the skills that it finds. GitHub cuts the file tree of a very large repository short, so a design call of that plan gives the skills of the cut tree and a note that the list can be incomplete. The cloud computer copies the whole repository with Git, so the note also says that agents get every skill. A cut tree with no skill in it shows only the note, because its skills can lie after the cut. A member sees the same list and note, because the note names no action of an admin.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', skills: 'incomplete' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
