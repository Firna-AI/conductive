import { defineScreen } from '@mokly/mokly'
import {
  hexwavePage,
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../../screens/OperatorOrgScreen'

export const operatorOrgSwitched = defineScreen({
  title: 'After a switch',
  description:
    'Hexwave after its switch. Its account is e2b, and Last switch says that it came from boat on 20 Nov at 14:19, by @calummoore. The 10 workspaces from before the switch stay on boat, and the 2 new ones run on e2b, so Workspaces by account lists both accounts. The counts add up to the workspaces by state. Switch account stays, for a switch to another account.',
  rationale:
    'The page names the last switch, with its time and its operator, as the Providers tab names the last change of the weights. The time is when the account changed, at the end of the switch build, because new workspaces move then. Each existing workspace keeps its account until it is archived, so the page gives the workspaces by account while they run on more than one.',
  relatedDocs: [],
  useCasePaths: ['user-flows/switch-org-account'],
  propSchema: operatorOrgSchema,
  props: { ...hexwavePage, switch: 'switched' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
})
