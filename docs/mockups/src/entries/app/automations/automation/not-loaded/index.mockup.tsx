import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const notLoadedAutomation = defineScreen({
  title: 'Not loaded',
  description:
    'The read of the automation failed, here because the app could not reach the server. The page keeps Automation as its name. The notice names what failed and gives the message of the server, and Try again reads the automation again. The page has no tabs, no Runs list, and no actions.',
  rationale:
    'The page uses the load failure of the other lists of the app. A read that fails while the automation already shows keeps the automation on the page, so a short network problem does not take away an edit that is not saved.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, read: 'failed' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
})
