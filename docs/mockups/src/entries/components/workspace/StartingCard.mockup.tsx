import { defineComponent } from '@mokly/mokly'
import { StartingCard } from '../../../components/workspace/StartingCard'
import { creatingLog } from '../../../fixtures/starting'
import { startingLogSchema } from './sandboxSchemas'

/** The start of a sandbox in the chat, registered with Mokly. */
export const startingCard = defineComponent({
  slug: 'starting-card',
  title: 'Starting card',
  description:
    'The start of a sandbox in the chat: a quiet card with a moving mark, then each step so far, with the time since the start. Its own page shows the start of a new workspace.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['log'],
    properties: { log: startingLogSchema },
  } as const,
  props: { log: creatingLog },
  render: (props) => <StartingCard log={props.log} />,
})
