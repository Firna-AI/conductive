import { defineScreen } from '@mokly/mokly'
import {
  CommandPaletteScreen,
  commandPaletteSchema,
} from '../../../../../screens/CommandPaletteScreen'

export const paletteFeedbackSearch = defineScreen({
  title: 'Search for feedback',
  description:
    'Cal types "feedback". Send feedback is the only result, in the Actions group, and Enter opens the Feedback dialog over the list. "bug", "idea", "support", "contact", "help", and "report" find it too.',
  rationale:
    'The row shows on each page where the palette opens, also without an org and in a suspended org, because feedback changes no org. Its search words are the words of a person who wants to reach the team. In the app the row is not a link, because the dialog has no address. The dialog sits over the page, as the Archive question does.',
  relatedDocs: [],
  propSchema: commandPaletteSchema,
  props: { over: 'list', view: 'search-feedback' },
  useCasePaths: ['user-flows/send-feedback'],
  render: (props, context) => (
    <CommandPaletteScreen state={props} viewport={context.viewport} />
  ),
})
