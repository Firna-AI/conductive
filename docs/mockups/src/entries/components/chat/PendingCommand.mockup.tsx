import { defineComponent } from '@mokly/mokly'
import { PendingCommand } from '../../../components/chat/PendingCommand'
import { safariSuite, safariTest } from '../../../fixtures/mac'
import { macCommandRequestSchema } from './chatItemSchemas'

/**
 * The command that waits for approval above the composer, registered with
 * Mokly. The Mac app of the sender adds Deny and Allow, which it reads
 * from the Mac app, not from a prop.
 */
export const pendingCommand = defineComponent({
  slug: 'pending-command',
  title: 'Pending command',
  description:
    'The command that waits for approval, as a compact message that the chat pins just above the composer: the exact command, the Mac, the time limit, and Details, which opens the other facts. A longer time limit shows its reason without a click. A browser shows the state only, because only the Mac app can allow a command on the Mac. Its own page shows a command in a browser.',
  relatedDocs: ['docs/mockups/mac-app.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'request'],
    properties: {
      /** The ID of the chat item of the command. */
      id: { type: 'string', minLength: 1 },
      request: macCommandRequestSchema,
      /** The other ways to allow are open, in the Mac app. */
      open: { type: 'boolean' },
      /** The request stack draws the outline of the card. */
      inStack: { type: 'boolean' },
    },
  } as const,
  props: { id: 'safari-test', request: safariTest },
  render: (props) => (
    <PendingCommand
      id={props.id}
      inStack={props.inStack}
      open={props.open}
      request={props.request}
    />
  ),
  variants: [
    {
      slug: 'longer',
      title: 'Longer time limit',
      description:
        'A command that asks for more than the usual time limit shows why.',
      props: { id: 'safari-suite', request: safariSuite },
    },
  ],
})
