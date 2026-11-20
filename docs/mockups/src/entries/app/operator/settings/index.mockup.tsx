import { defineScreen } from '@mokly/mokly'
import {
  OperatorSettingsScreen,
  operatorSettingsSchema,
} from '../../../../screens/OperatorSettingsScreen'

export const operatorSettings = defineScreen({
  title: 'Settings',
  description:
    'The Settings tab holds the settings of the app that hold for every org. Its Stop time box sets the time after which a cloud computer stops without user activity, unless an agent turn runs. The choices are 15 min, 30 min, 1 hour, 1.5 hours, and 2 hours. The default is 30 min. Save stop time stays off until the operator picks another time. A stop time that no operator changed has no line of the last change. The child pages show a changed time, a saved time, and a failed save.',
  rationale:
    'Cal asked on 20 November 2026 for an operator setting for the stop time of idle cloud computers, with 30 minutes as the current value. Cal chose a fixed list of 15, 30, 60, 90, and 120 minutes, so no typo can keep idle computers running for hours. Cal chose a new Settings tab, so later settings of the whole app have a home. The tab joins the end of the tabs, so the other tabs keep their places. A running computer takes a new time at its next activity, or when its current time ends, as Cal chose, so the box says it.',
  relatedDocs: [],
  propSchema: operatorSettingsSchema,
  props: { stopTime: 'default', signUps: 'open' },
  render: (props, context) => (
    <OperatorSettingsScreen state={props} viewport={context.viewport} />
  ),
})
