import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

const signUp = ['user-flows/sign-up']

export const firstBuild = defineScreen({
  title: 'First build',
  description:
    'New workspace of Firna, the new org of the sign-up, while the first build of its cloud computer runs. Cal has typed the task of the first workspace. A notice over the composer says that the cloud computer is being prepared, with the time of the build, and that Cal can send when it is ready. Send is off, and the message stays in the composer.',
  rationale:
    'The user chose option C of decision 142 on 8 November 2026. A workspace starts from the org image (decision 13), so the page keeps Send off until the first build succeeds, in place of a create that fails and asks for a manual build. The notice shows only while the org has no good image. After the first good image, a later build or a failed later build leaves that image in use, as decision 9 says, so the New workspace page of Acme shows no notice.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, org: 'new', firstBuild: 'running' },
  useCasePaths: signUp,
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'ready',
      title: 'First build succeeded',
      description:
        'The first build of Firna succeeded. The notice is gone, and Send is on. The note under the repository names the build that the workspace starts from.',
      props: { firstBuild: 'succeeded' },
      useCasePaths: signUp,
    },
    {
      slug: 'failed',
      title: 'First build failed',
      description:
        'The first build of Firna failed. The notice says that the cloud computer did not build, and Open Cloud computer leads Cal, an admin, to the failed build with its log and Try again. Send stays off, and the message stays. The Settings link in the sidebar shows a dot.',
      rationale:
        'Only an admin builds the computer (decision 57), so only an admin gets the link. A failed build gets no automatic retry (decision 12).',
      props: { firstBuild: 'failed' },
    },
    {
      slug: 'no-build',
      title: 'No build',
      description:
        'Firna has repositories, but no build and no build that runs, such as after a first build that did not start. The notice asks for a build, and Open Cloud computer leads Cal to Build computer. Send stays off.',
      rationale:
        'The user learns the cause before sending, in place of a failed create. When the first build cannot start, Create org still succeeds, and Get started and the Cloud computer tab offer Build computer, as app/sign-in/get-started/no-build shows.',
      props: { firstBuild: 'none' },
    },
    {
      slug: 'member',
      title: 'Failed, seen by a member',
      description:
        'Priya, a member of Firna who is not an admin, opens New workspace after the first build failed. The notice says that an admin can try the build again, and it has no link. Send stays off.',
      rationale:
        'Only an admin builds the computer (decision 57), so a member sees the state with no action.',
      props: { firstBuild: 'failed', viewer: 'member' },
    },
  ],
})
