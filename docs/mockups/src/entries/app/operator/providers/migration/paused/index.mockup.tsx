import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../../screens/OperatorProvidersScreen'

export const operatorMigrationPaused = defineScreen({
  title: 'Paused',
  description:
    '@calummoore paused the job on 24 November at 11:42, from Pause job. Its state is Paused, and its facts give the time and the operator of the pause. Each account that has work left shows Paused, with the starts that are left. Continue job takes the place of Pause job, and Limit to one org stays.',
  rationale:
    'An operator can pause and continue the job (own computer decision 7 D). Pause job and Continue job ask no question, because each one undoes the other at once. The facts name the operator of the pause, so another operator knows whom to ask. Cal has not chosen yet what the box shows while steps of the job still run after a pause. This page draws the smallest choice: the box shows Paused at once.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: {
    weights: 'default',
    accounts: 'both',
    signUps: 'open',
    job: 'paused',
    pace: 'default',
  },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
})
