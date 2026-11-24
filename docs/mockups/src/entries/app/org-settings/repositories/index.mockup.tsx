import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../screens/orgSettingsState'

const decisions =
  'The user chose option B and C of decision 240 and option C of decision 241 on 10 November 2026: an added repository starts a build, and a repository change gets its own notice on the Repositories and Cloud computer tabs, for admins and members, while the cloud computer lacks a chosen repository or still holds a removed one.'

const orderRequest =
  'The user asked on 18 November 2026 for an order of the chosen repositories, whose first repository is the default of new workspaces, and which the New workspace menu follows. The user chose option F of repository-order decision 1 the same day: each row of an admin has a drag handle and a row menu with Make default, Move up, and Move down, and the first row shows Default for every person. The order belongs to the org, so only an admin changes it (decision 57).'
const doneRequest =
  'The user asked on 18 November 2026, decision 295, that the build start at Done, not at each add, because an admin may add many repositories in one edit.'

const editRequest =
  'The user asked on 17 November 2026 that the tab show only the chosen repositories, and that Edit open the whole list with Add and Remove, because the whole list of a GitHub account is long and hides the chosen ones.'

export const repositories = defineScreen({
  title: 'Repositories',
  description:
    'The repositories that the org bundles into its cloud computer. The tab lists only the chosen repositories, in the order of the org, with Edit. The first one, acme/storefront, shows Default: new workspaces and automations start in it. Each row of an admin has a drag handle and a row menu. Done starts a build of the computer when the edit added a repository, and an added repository goes to the end of the order. A removed one leaves at the next build. The order page shows a move.',
  rationale: `Repositories keep their own tab, as the user asked. Waits on decisions 10 and 21, drawn as their recommended options at org level: an admin chooses the repositories of the org, from one GitHub App that every org shares. ${decisions} The notice names the repositories, so the rows of the list stay as they are. ${editRequest} ${orderRequest} ${doneRequest}`,
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
        'Cal added acme/admin-dashboard and selected Done, which started a build. The notice above the list says that acme/admin-dashboard is ready after the build, with a spinner. It has no button, because the build runs by itself. The list shows acme/admin-dashboard with the other chosen repositories.',
      rationale: `${decisions} An add during a build waits for that build, and the app starts one more build when it succeeds, so the words name the build, not this build.`,
      props: { repositoryChange: 'added', build: 'building' },
    },
    {
      slug: 'build-failed',
      title: 'Newest build failed',
      description:
        'The build of acme/admin-dashboard failed, and no build runs. The title of the notice says that the last build failed. Its body says that acme/admin-dashboard is ready after a build succeeds, with Try again. The Settings link in the sidebar shows a dot.',
      rationale: `${decisions} A failed build gets no automatic retry (decision 12), so the notice offers Try again, which builds the current choice. The first state that applies wins, so a failed newest build comes first.`,
      props: { repositoryChange: 'added', build: 'failed' },
    },
    {
      slug: 'unsaved-add',
      title: 'Edit, add before Done',
      description:
        'Cal selected Edit and added acme/admin-dashboard, so its row shows Added. Done has not saved the edit yet. The notice above the list says to select Done to add acme/admin-dashboard and start a build. It has no button, so no build starts before Done.',
      rationale: `${doneRequest} The user chose on 20 November 2026 that the app adds the repositories only at Done (decision 296), and that the notice points to Done with no button while the edit adds repositories (decision 297). So an admin who adds many repositories gets one build, and leaving the tab without Done saves nothing.`,
      props: { repositoryView: 'edit-added' },
    },
    {
      slug: 'removed',
      title: 'Edit, removal waits for a build',
      description:
        'Cal removed acme/marketing-site in an earlier edit, and Done saved the removal. Cal selected Edit again, so the tab lists every repository that the GitHub App reaches, by name, with search, Add, Remove, and Done. Edit has no moves, because its list is not in the order of the org. The row of acme/marketing-site offers Add again. A removal starts no build, so the notice says that acme/marketing-site leaves at the next build, with Build computer. New workspace no longer offers it.',
      rationale: `${editRequest} Done saves the Add and Remove changes of the edit. The edit has no Cancel: an admin who leaves the tab without Done saves nothing. ${decisions} A removed repository starts no build: it leaves only an unused folder in new workspaces until the next build. The same words and Build computer show after a start that failed and during a refresh, because a refresh never counts as a build that runs.`,
      props: { repositoryChange: 'removed', repositoryView: 'edit' },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an admin, sees the chosen repositories of Acme in the order of the org, with Default on the first one, and without Edit, drag handles, row menus, search, Add, and Remove. One line says that only an admin can change them. The build of acme/admin-dashboard failed, so the title of the notice says that the last build failed. Its body says that acme/admin-dashboard is ready after a build succeeds, and that an admin can try the build again. The notice has no button.',
      rationale: `The user chose option B of decision 57: only admins change the repositories, the scripts, and the environment variables, because a change reaches every new sandbox of the org. Members see them read-only. ${decisions} A member reads the same notice without a button, in each state.`,
      props: { viewer: 'member', repositoryChange: 'added', build: 'failed' },
    },
  ],
})
