import { defineScreen } from '@mokly/mokly'
import {
  OperatorSettingsScreen,
  operatorSettingsSchema,
} from '../../../../../screens/OperatorSettingsScreen'

export const operatorSettingsChanged = defineScreen({
  title: 'Stop time changed',
  description:
    'The operator picked 1 hour. Save stop time is on. Nothing changes until the operator saves.',
  rationale:
    'Save stop time acts at once, with no question. One save makes one record of the operator and the time, as the weights of new orgs do.',
  relatedDocs: [],
  propSchema: operatorSettingsSchema,
  props: { stopTime: 'changed', signUps: 'open' },
  render: (props, context) => (
    <OperatorSettingsScreen state={props} viewport={context.viewport} />
  ),
})
