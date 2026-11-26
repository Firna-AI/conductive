import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

/** Who chooses the skills repository, and why. */
const skillsAdmin =
  'The user chose option A of decision 2 of the org skills repository plan on 13 November 2026: only an admin chooses the skills repository, for the reason of decision 57, because the skills change the work of every agent of the org.'

/** Why a member sees the list of skills and each notice of the lookup. */
const skillsLookup =
  'The user answered decision 7 of that plan with a new option, H, on 16 November 2026: the section looks up the saved repository on GitHub and lists its skills, or shows a notice in place of the list. The lookup runs for each viewer, with the GitHub sign-in of the viewer, so a member sees the same list and each notice. A member whose agents get no skills then learns why, and can tell an admin, as with the repository notice of decision 241.'

/** Why the notices of a member name an admin. */
const adminActs =
  'Only an admin changes the repository, so the notice of a member says that an admin can act, as the repository notice of decision 241 does. The notices of a repository without skills, of a list that can be incomplete, and of a list that did not load name no action of an admin, so they read the same for a member as for an admin. In a suspended org nobody can act, so the notice drops that sentence, and the notice of the org says why.'

export const computerMember = defineScreen({
  title: 'Seen by a member',
  description:
    'Priya, a member who is not an admin, sees the last build and its history, both scripts as text, the names of the environment variables with the Secret mark of each secret one, and the skills repository, acme/agent-skills, as text, with the row "Trust: Not trusted", the hint of that choice, and the 12 skills that the lookup found under it. The tab has no Build computer, no Save script, no Add variable, and no Save repository. No variable can be changed or deleted, and no mark has a switch. The intro says that only an admin can change the computer.',
  rationale: `The user chose option B of decision 57: only admins change the repositories, the scripts, and the environment variables, because a changed script reaches every new sandbox of the org and runs during the turns of other members. A member sees which values are secret, because the app hides only those in agent output and start logs (decision 133). ${skillsAdmin} A member sees which repository the agents use, and its trust choice of decision 403 as text, as app/org-settings/cloud-computer/skills/trust/member shows. ${skillsLookup} Moved here from a saved state of the Cloud computer page, with the same path, so that page shows only its canonical screen.`,
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'computer', viewer: 'member' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'repositories-changed',
      title: 'Repositories changed, seen by a member',
      description:
        'Priya opens the tab after the build of acme/admin-dashboard failed. The title of the notice under the intro says that the last build failed. Its body says that acme/admin-dashboard is ready after a build succeeds, and that an admin can try the build again. The notice and the card have no Try again.',
      rationale:
        'The user chose option C of decision 241 on 10 November 2026: the repository notice shows on the Cloud computer tab for admins and members. Only an admin builds the computer (decision 57), so a member reads who can act, as on the Repositories tab. On this tab the notice has no button for anyone, because the build card has the action, and the card of a member has none.',
      props: { repositoryChange: 'added', build: 'failed' },
    },
    {
      slug: 'no-skills',
      title: 'No skills repository, seen by a member',
      description:
        'Acme has no skills repository yet. Priya sees the Skills section with its description, and the text "An admin can choose one." in place of the repository.',
      rationale: `${skillsAdmin} So the empty text tells a member who can choose one, in a positive frame. In a suspended org the text says only that no repository is chosen, because nobody can choose one there, and the notice of the org says why.`,
      props: { skills: 'none' },
    },
    {
      slug: 'private-skills',
      title: 'Private skills repository, seen by a member',
      description:
        'Acme saved acme/agent-skills while it is private on GitHub. In place of the list, Priya sees the notice that acme/agent-skills is private, that agents get no skills from it, and that an admin can choose a public repository.',
      rationale: `The user chose option A of decision 6 of the org skills repository plan on 16 November 2026: only a public repository gives skills. ${skillsLookup} ${adminActs} A member whose sign-in cannot see the private repository gets the notice of a repository that is not found, which speaks of a public repository too.`,
      props: { skills: 'private' },
    },
    {
      slug: 'skills-not-found',
      title: 'Skills repository not found, seen by a member',
      description:
        'Acme saved acme/agent-skils, with a typo. In place of the list, Priya sees the notice that acme/agent-skils was not found, that GitHub has no public repository with this name, and that an admin can check the name.',
      rationale: `${skillsLookup} ${adminActs}`,
      props: { skills: 'not-found' },
    },
  ],
})
