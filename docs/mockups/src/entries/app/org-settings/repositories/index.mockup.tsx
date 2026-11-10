import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

const decisions =
  'The user chose option B and C of decision 240 and option C of decision 241 on 10 November 2026: an added repository starts a build, and a repository change gets its own notice on the Repositories and Cloud computer tabs, for admins and members, while the cloud computer lacks a chosen repository or still holds a removed one.'

export const repositories = defineScreen({
  title: 'Repositories',
  description:
    'The repositories that the org bundles into its cloud computer, chosen from those that the shared GitHub App can reach. An added repository starts a build of the computer, and a removed one leaves at the next build.',
  rationale: `Repositories keep their own tab, as the user asked. Waits on decisions 10 and 21, drawn as their recommended options at org level: an admin chooses the repositories of the org, from one GitHub App that every org shares. ${decisions} The notice names the repositories, so the rows of the list stay as they are.`,
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'repositories' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'building',
      title: 'Build after an add',
      description:
        'Cal added acme/admin-dashboard, and the add started a build. The notice above the list says that acme/admin-dashboard is ready after the build, with a spinner. It has no button, because the build runs by itself. The row of acme/admin-dashboard shows Added.',
      rationale: `${decisions} An add during a build waits for that build, and the app starts one more build when it succeeds, so the words name the build, not this build.`,
      props: { repositoryChange: 'added', build: 'building' },
    },
    {
      slug: 'build-failed',
      title: 'Newest build failed',
      description:
        'The build of acme/admin-dashboard failed, and no build runs. The notice says that acme/admin-dashboard is ready after a build succeeds, and that the last build failed, with Try again. The Settings link in the sidebar shows a dot.',
      rationale: `${decisions} A failed build gets no automatic retry (decision 12), so the notice offers Try again, which builds the current choice. The first state that applies wins, so a failed newest build comes first.`,
      props: { repositoryChange: 'added', build: 'failed' },
    },
    {
      slug: 'removed',
      title: 'Removal waits for a build',
      description:
        'Cal removed acme/marketing-site, so its row offers Add again. A removal starts no build, so the notice says that acme/marketing-site leaves at the next build, with Build computer. New workspace no longer offers it.',
      rationale: `${decisions} A removed repository starts no build: it leaves only an unused folder in new workspaces until the next build. The same words and Build computer show after a start that failed and during a refresh, because a refresh never counts as a build that runs.`,
      props: { repositoryChange: 'removed' },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an admin, sees the four repositories of Acme, without the search, Add, and Remove. One line says that only an admin can change them. The build of acme/admin-dashboard failed, so the notice says that it is ready after a build succeeds, and that an admin can try the build again. The notice has no button.',
      rationale: `The user chose option B of decision 57: only admins change the repositories, the scripts, and the environment variables, because a change reaches every new sandbox of the org. Members see them read-only. ${decisions} A member reads the same notice without a button, in each state.`,
      props: { viewer: 'member', repositoryChange: 'added', build: 'failed' },
    },
  ],
})
