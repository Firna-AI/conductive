import { defineScreen } from '@mokly/mokly'
import {
  OperatorSettingsScreen,
  operatorSettingsSchema,
} from '../../../../../screens/OperatorSettingsScreen'

export const operatorSettingsSaved = defineScreen({
  title: 'Stop time saved',
  description:
    'After Save stop time, the control keeps 1 hour, and a line under it says when and by which operator the time changed. Save stop time is off again.',
  rationale:
    'Each change of the stop time records the operator and the time, as the weights of new orgs and the pause of sign-ups do, so the box shows the last change in the same way.',
  relatedDocs: [],
  propSchema: operatorSettingsSchema,
  props: { stopTime: 'saved', signUps: 'open' },
  render: (props, context) => (
    <OperatorSettingsScreen state={props} viewport={context.viewport} />
  ),
})
