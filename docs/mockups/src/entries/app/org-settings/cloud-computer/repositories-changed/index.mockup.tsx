import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

const decision =
  'The user chose option C of decision 241 on 10 November 2026, and asked for a notice on the Cloud computer tab too: a repository change gets its own notice on the Repositories and Cloud computer tabs, for admins and members, and the notice of the install script shows only for a change of the install script.'

/** Why the notice of this tab has no button, also for an admin. */
const noButton =
  'On this tab the repository notice has no button, also for an admin, because the build card under it has the same action. The Repositories tab keeps Try again and Build computer in its notice.'

export const repositoriesChanged = defineScreen({
  title: 'Repositories changed',
  description:
    'Cal added acme/admin-dashboard on the Repositories tab, and the add started a build. The notice under the intro says that acme/admin-dashboard is ready after the build, with a spinner and no button. The card shows the build that runs, with its log. The install script did not change, so its notice does not show.',
  rationale: `${decision} The user chose option C of decision 240 on the same day, so an added repository starts a build by itself. The notice shows once the org has a cloud computer, because the notices of the first build cover the time before it. ${noButton} New workspace links an admin here while the build of a waiting repository runs.`,
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: {
    ...acmeSettings,
    tab: 'computer',
    repositoryChange: 'added',
    build: 'building',
  },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'build-failed',
      title: 'Newest build failed',
      description:
        'The build of acme/admin-dashboard failed. The notice says that acme/admin-dashboard is ready after a build succeeds, and that the last build failed. It has no button. The card under it shows the saved message, the end of the log, and Try again.',
      rationale: `${decision} ${noButton} New workspace links an admin here while no chosen repository is ready after a failed build, as app/new-workspace/waiting-repository/none-ready shows.`,
      props: { build: 'failed' },
    },
    {
      slug: 'no-build',
      title: 'Added repository waits for a build',
      description:
        'Cal added acme/admin-dashboard, and its build did not start. The notice says that acme/admin-dashboard is ready after the next build. It has no button, because the card under it offers Build computer. The history stays closed while a change waits.',
      rationale: `${decision} ${noButton} A start that failed keeps the saved choice and writes one warning, so the card offers Build computer. New workspace links an admin here when a repository waits and no build runs.`,
      props: { repositoryChange: 'added', build: 'ready' },
    },
    {
      slug: 'with-script',
      title: 'Repositories and install script changed',
      description:
        'Cal removed acme/marketing-site and took its line out of the install script. Neither starts a build. The repository notice under the intro says that acme/marketing-site leaves at the next build, without a button. The notice under the install script says that the script changed, with Build computer. The card has its own Build computer, and both start the same build.',
      rationale: `${decision} Each notice names its own change, so the reader learns what the next build brings. ${noButton} The notice of the install script keeps its Build computer, as before.`,
      props: { repositoryChange: 'removed', build: 'ready', script: 'changed' },
    },
  ],
})
