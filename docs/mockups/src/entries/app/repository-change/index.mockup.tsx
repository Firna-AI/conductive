import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const repositoryChange = defineScreen({
  title: 'Change the repository',
  description:
    'Cal opens the repository in the header of Checkout address autocomplete, which works in acme/storefront. The menu lists the chosen repositories of Acme, with a check on acme/storefront. acme/admin-dashboard is not in the cloud computer of this workspace, so its row says so, and a press opens New workspace with that repository. On a phone the repository sits in the line under the name, and the menu is a sheet.',
  rationale:
    'The user asked on 13 November 2026 to change the repository from the header. In repository change decision 1 the user chose A: the workspace keeps its cloud computer, its sessions, and its chat, and moves to a new branch of the new repository. Decision 2 B lets every member change it, as for Continue. Decision 4 D shows a chosen repository that the cloud computer does not hold, also a waiting repository, with a note, and its row opens New workspace.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...checksWorkspace,
    banner: 'checks-running',
    overlay: 'repository',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'question',
      title: 'The question before the change',
      description:
        'Cal picked acme/billing-service. The workspace has work that it stops following, so a question comes first. The first list gives the files and the commit that are not pushed in acme/storefront, the open pull request #482, and the pushed commits of the branch. All of it stays. The second list gives a changed file in acme/billing-service, which moves to the new branch. Cancel keeps the workspace as it is. On a phone the question is a sheet.',
      rationale:
        'Repository change decision 3 D: the question lists the local work, the pull request, and the pushed commits that the workspace stops following, and the local work of the new folder that moves to the new branch. Without such work the change starts at once. Nothing is deleted, so the question says so.',
      props: { localWork: 'changes', overlay: 'repository-change' },
    },
    {
      slug: 'changing',
      title: 'The change runs',
      description:
        "The change runs: it starts a stopped cloud computer first, fetches the latest main of acme/billing-service with Cal's GitHub access, creates the new branch, and copies the context folder. The button shows a spinner and the new repository.",
      rationale:
        'The fetch uses the GitHub access of the member who changes the repository, as Continue does. The user asked on 13 November 2026 to copy the context folder, so notes and attached files stay with the workspace.',
      props: { repositoryMove: 'changing', overlay: 'none' },
    },
    {
      slug: 'failed',
      title: 'The change stopped',
      description:
        'Git could not move the changed file of acme/billing-service to the new branch, because it clashes with the latest main. The change stopped, and the workspace stays in acme/storefront on its old branch. A toast names the reason.',
      props: { overlay: 'repository-failed' },
    },
    {
      slug: 'changed',
      title: 'After the change',
      description:
        'The workspace works in acme/billing-service, on the new branch calummoore/oslo-9c1e. The pull request bar starts again at the state without a pull request, and Changes is empty. The session keeps its chat, and a note at the place of the change names who changed it, the new repository, and the new branch.',
      rationale:
        'The agents keep their sessions. Each session shows the note, so every member sees why the repository changed. The old branch, its pull request #482, and the work in acme/storefront stay as they are.',
      props: {
        focus: 'chat',
        files: 'changes',
        banner: 'no-commits',
        overlay: 'none',
        repositoryMove: 'changed',
        conversation: 'repository-changed',
      },
    },
  ],
})
