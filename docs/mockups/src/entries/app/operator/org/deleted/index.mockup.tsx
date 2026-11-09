import { defineScreen } from '@mokly/mokly'
import {
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../../screens/OperatorOrgScreen'

export const operatorOrgDeleted = defineScreen({
  title: 'Deleted org',
  description:
    'An org that an admin deleted shows the day of the delete and the day when everything is deleted. The operator can still suspend it. Its questions say what the deletion changes, and they promise its members nothing that they cannot open.',
  rationale:
    'A deleted org hides from its members, and only its admins can restore it, until everything of it is deleted. A suspension stops that restore, and a lift leaves the org deleted, as the operator protocol says. So each text of a deleted org says so, and no text says that its members can open, read, or change it.',
  relatedDocs: [],
  propSchema: operatorOrgSchema,
  props: { status: 'deleted', dialog: 'none' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'suspend',
      title: 'Suspend a deleted org',
      description:
        'Suspend org asks first. Every cloud computer and build of the org stops. Each unfinished build fails, and a lift does not bring it back. No admin can restore the org while it is suspended, and everything of it is deleted on its day.',
      props: { dialog: 'suspend' },
    },
    {
      slug: 'suspended',
      title: 'Suspended deleted org',
      description:
        'The notice of the suspension names the time and the operator. The notice of the deletion keeps its day, and it says that no admin can restore the org before a lift. Lift suspension takes the place of Suspend org.',
      props: { status: 'deleted-suspended' },
    },
    {
      slug: 'lift',
      title: 'Lift a deleted org',
      description:
        'Lift suspension asks first. The org stays deleted, and an admin can restore it until everything of it is deleted. The question promises no access.',
      props: { status: 'deleted-suspended', dialog: 'lift' },
    },
  ],
})
