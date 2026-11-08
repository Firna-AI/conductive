import { defineScreen } from '@mokly/mokly'
import {
  OperatorScreen,
  operatorSchema,
} from '../../../../screens/OperatorScreen'

export const operatorLift = defineScreen({
  title: 'Lift a suspension',
  description:
    'Lift beside a suspended user asks first. The dialog says that the user can sign in again and that their workspaces can start again. It also says that a workspace that stopped 14 days ago or more may have lost its files. Lift suspension gives the access back, and the user leaves the Suspended box.',
  rationale:
    'The user chose a Lift action on the operator page, with a confirm step, on 8 November 2026, in decision 145. A lift sets the disk restart of each stopped workspace again, but a disk that was deleted while the suspension lasted stays lost, so the dialog says so. A lift gives back no sign-in session: the user signs in again. Suspend stays outside the page for now.',
  relatedDocs: [],
  propSchema: operatorSchema,
  props: { numbers: 'ready', suspended: 'some', dialog: 'lift-user' },
  render: (props, context) => (
    <OperatorScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'org',
      title: 'Lift an org',
      description:
        'The same question for a suspended org. Its members can change the org again, and its workspaces can start again.',
      props: { dialog: 'lift-org' },
    },
    {
      slug: 'nobody',
      title: 'Nobody suspended',
      description:
        'After the last lift, the Suspended box says that every user and org has access.',
      props: { dialog: 'none', suspended: 'none' },
    },
  ],
})
