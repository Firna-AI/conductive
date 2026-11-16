import { defineComponent } from '@mokly/mokly'
import type { WorkItem } from '../../../components/chat/groupItems'
import { groupItems } from '../../../components/chat/groupItems'
import { foldStates, WorkFold } from '../../../components/chat/WorkFold'
import { plainData } from '../../../defined'
import { history } from '../../../fixtures/autocompleteTurn'
import { safariTest } from '../../../fixtures/mac'
import { workItemSchema } from './chatItemSchemas'

/** The work of the finished turn of Checkout address autocomplete. */
const work: WorkItem[] = plainData(
  groupItems(history).flatMap((entry) =>
    entry.kind === 'work' ? entry.steps : [],
  ),
)

/** Work with a command on the Mac and a lost line among its steps. */
const macWork: WorkItem[] = [
  {
    kind: 'agent',
    id: 'safari-plan',
    blocks: [
      'The cloud computer has no Safari, so I run the test on your Mac.',
    ],
  },
  {
    kind: 'mac-command',
    id: 'safari-test',
    request: safariTest,
    state: 'done',
  },
  { kind: 'lost', id: 'lost-update', what: 'tool-update', reason: 'too_large' },
  {
    kind: 'tool',
    id: 'unit',
    tool: 'run',
    target: 'npm test -- checkout',
    detail: '14 passed',
    status: 'done',
  },
]

/**
 * The work of an ended turn before its answer, folded into one line,
 * registered with Mokly. Its pages show the closed fold, the open fold,
 * the open fold with its last message open, and a fold with a command on
 * the Mac.
 */
export const workFold = defineComponent({
  slug: 'work-fold',
  title: 'Work fold',
  description:
    'The work of an ended turn before its answer, folded into one line, such as "11 tool calls, 2 messages", with the icons of the tool kinds. A command on the Mac and a lost line fold with the work at their place, and add no count. The open fold lists the steps in order: a tool call as its call line, a message as its first words, a card as the card, and a lost line as the lost line. Its own page shows the closed fold of a finished turn.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['steps', 'state'],
    properties: {
      steps: { type: 'array', items: workItemSchema },
      /** Closed, open, or open with the last message line open too. */
      state: { enum: foldStates },
    },
  } as const,
  props: { steps: work, state: 'closed' },
  render: (props) => <WorkFold state={props.state} steps={props.steps} />,
  variants: [
    {
      slug: 'open',
      title: 'Open',
      description: 'The open fold lists the steps in order.',
      props: { state: 'open' },
    },
    {
      slug: 'open-message',
      title: 'Last message open',
      description: 'The open fold, with its last message line open too.',
      props: { state: 'open-message' },
    },
    {
      slug: 'mac-command',
      title: 'Command on the Mac',
      description:
        'An open fold with a command on the Mac and a lost line among its steps.',
      props: { steps: macWork, state: 'open' },
    },
  ],
})
