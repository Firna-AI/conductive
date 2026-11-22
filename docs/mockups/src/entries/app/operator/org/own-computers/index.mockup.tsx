import { defineScreen } from '@mokly/mokly'
import {
  hexwavePage,
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../../screens/OperatorOrgScreen'

export const operatorOrgComputers = defineScreen({
  title: 'Own computers',
  description:
    'Hexwave, whose admin added three own computers. The Own computers box follows the Provider account box: 3 own computers, with how many are connected, full, offline, building, failed in their build, and never connected, each with the glyph of its state. A line under the list says that 2 workspaces run on them now. The box names no computer and shows nothing of its work. An org without own computers shows no box.',
  rationale:
    'The design calls of the plan say that the operator section shows the number and the state of the own computers of each org, and no content. So an operator can answer a support question about a start that waits for an own computer, without names that only the org chose. Own computers use no cloud hours, so the provider account of the org stays its one account.',
  relatedDocs: [],
  propSchema: operatorOrgSchema,
  props: { ...hexwavePage, computers: 'some' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
})
