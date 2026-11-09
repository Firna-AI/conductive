import { defineScreen } from '@mokly/mokly'
import {
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../../screens/OperatorOrgScreen'

export const operatorOrgSuspend = defineScreen({
  title: 'Suspend an org',
  description:
    'Suspend org asks first. Every cloud computer and build of the org stops, and its members can still read it but not change it. Each unfinished build of the org fails, and a lift does not bring it back. A stopped workspace gets no restart near day 14, so its files can be deleted.',
  relatedDocs: [],
  propSchema: operatorOrgSchema,
  props: { status: 'active', dialog: 'suspend' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
})
