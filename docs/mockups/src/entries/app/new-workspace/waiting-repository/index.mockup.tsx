import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const waitingRepository = defineScreen({
  title: 'Waiting repository',
  description:
    'Cal, an admin of Acme, added acme/admin-dashboard on the Repositories tab, and the add started a build. The open repository menu lists each chosen repository. acme/admin-dashboard keeps its place, off, with the note "Ready after the build". The form holds acme/storefront, the first ready repository, so Send stays on. The phone opens the menu as a sheet.',
  rationale:
    'The user chose option B and C of decision 240 on 10 November 2026: New workspace shows a chosen repository that the cloud computer of the org does not hold yet as off, with a note, and an added repository starts a build. A create in such a repository would fail, so the form picks the first ready repository. The note says when the repository is ready: after the build that runs, after a build succeeds when the newest build failed, or after the next build when no build runs. The row is a menu item that is off, with the note as its muted detail, as the menu of the app draws one. A removed repository stays out of the menu, as before. The New workspace dialog shows the same repository menu and the same notices, as its controls show, so its page gets no more variants.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: {
    ...newWorkspaceForm,
    repositories: 'waiting',
    repositoryMenu: 'open',
  },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'kept-draft',
      title: 'Kept draft in a waiting repository',
      description:
        'A kept draft of Cal holds acme/admin-dashboard, which waits for the build that runs. The picker shows it, and the note of the cloud computer gives way. A notice over the composer says that acme/admin-dashboard is ready after the build, with a spinner, and that Cal can send then or choose another repository. Send is off, and the message stays.',
      rationale:
        'A draft keeps its repository, and a draft can name a repository that waits, such as after an admin removed it, a build ran without it, and the admin added it back. The form keeps the choice of the person, so it does not move the draft to another repository. The build runs by itself, so the notice has no action.',
      props: { repositories: 'draft-waits', repositoryMenu: 'closed' },
    },
    {
      slug: 'none-ready',
      title: 'No repository ready',
      description:
        'Acme chose only acme/admin-dashboard, after an admin replaced the repositories of its cloud computer, and the build of the add failed. The picker shows acme/admin-dashboard. The notice over the composer says that it is ready after a build succeeds, and that the last build failed. Cloud computer settings leads Cal to the failed build with Try again. Send is off, and the Settings link in the sidebar shows a dot.',
      rationale:
        'Only an admin builds the computer (decision 57), so only an admin gets the link. A failed build gets no automatic retry (decision 12). The link shows also when no build runs, and leads to Build computer. While a build runs, the notice has a spinner and no link, as kept-draft shows. The notice of a first build keeps its link during its build, because a change that an admin saves then needs no Build computer.',
      props: {
        repositories: 'none-ready',
        repositoryMenu: 'closed',
        waitingBuild: 'failed',
      },
    },
    {
      slug: 'member',
      title: 'No repository ready, seen by a member',
      description:
        'Priya, a member of Acme who is not an admin, opens New workspace while no chosen repository is ready and the last build failed. The notice says that an admin can try the build again, and it has no link. Send is off.',
      rationale:
        'Only an admin builds the computer (decision 57), so a member sees the state with no action, as on the Repositories tab.',
      props: {
        repositories: 'none-ready',
        repositoryMenu: 'closed',
        waitingBuild: 'failed',
        viewer: 'member',
      },
    },
  ],
})
