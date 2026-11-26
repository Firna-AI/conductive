import { defineScreen } from '@mokly/mokly'
import {
  OperatorSettingsScreen,
  operatorSettingsSchema,
} from '../../../../../screens/OperatorSettingsScreen'

export const operatorSettingsNotSaved = defineScreen({
  title: 'Save failed',
  description:
    'The save of the stop time failed. The control keeps the time that the operator chose, a line under it says that it was not saved, and Save stop time stays on to try again. Cloud computers keep the saved time.',
  rationale:
    'A failed save keeps the choice of the operator, as a failed save of the weights does, so one press tries again.',
  relatedDocs: [],
  propSchema: operatorSettingsSchema,
  props: { stopTime: 'not-saved', signUps: 'open' },
  render: (props, context) => (
    <OperatorSettingsScreen state={props} viewport={context.viewport} />
  ),
})
