import { defineComponent } from '@mokly/mokly'
import {
  CallLine,
  FoldLine,
  ToolGroup,
} from '../../../components/chat/ToolGroup'
import { plainData } from '../../../defined'
import {
  autocompleteStart,
  autocompleteTests,
} from '../../../fixtures/autocompleteTurn'
import type { ToolCallItem } from '../../../fixtures/conversations'
import { toolCallSchema } from './chatItemSchemas'

/** The tool calls of a run of the fixtures, as JSON. */
function callsOf(items: readonly { kind: string }[]): ToolCallItem[] {
  return plainData(
    items.filter((item): item is ToolCallItem => item.kind === 'tool'),
  )
}

/** The calls of the start of the turn: reads, a search, and edits. */
const startCalls = callsOf(autocompleteStart)

/** The run of the end-to-end tests while it runs. */
const e2eCall: ToolCallItem = {
  kind: 'tool',
  id: 'e2e',
  tool: 'run',
  target: 'npx playwright test checkout.spec.ts',
  status: 'running',
}

/** A run of the tests whose output the runner partly left out. */
const suite: ToolCallItem = {
  kind: 'tool',
  id: 'suite',
  tool: 'run',
  target: 'npm test',
  detail: '312 passed',
  omittedDetailBytes: 1_240_000,
  status: 'done',
}

/** The props of a fold line: its calls and the count of its messages. */
const callsSchema = { type: 'array', items: toolCallSchema } as const

/** One tool call of an open list, registered with Mokly. */
export const callLine = defineComponent({
  slug: 'call-line',
  title: 'Call line',
  description:
    'One tool call in an open list: the icon of its tool, its verb, its target, and its result. A running call shows a spinner, and a stopped one says so. When the runner left out output of the call, it gives its part. The row of the list spaces these parts, so its own page shows them without that space. Its own page shows an edit that finished.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['call'],
    properties: { call: toolCallSchema },
  } as const,
  props: {
    call: {
      kind: 'tool',
      id: 'edit-form',
      tool: 'edit',
      target: 'src/app/checkout/AddressForm.tsx',
      detail: '+38 −6',
      status: 'done',
    },
  },
  render: (props) => <CallLine call={props.call} />,
  variants: [
    {
      slug: 'running',
      title: 'Running',
      description: 'A run of the end-to-end tests that still runs.',
      props: { call: e2eCall },
    },
    {
      slug: 'stopped',
      title: 'Stopped',
      description: 'A run that a stop cut off.',
      props: { call: { ...e2eCall, status: 'stopped' } },
    },
    {
      slug: 'left-out',
      title: 'Output left out',
      description: 'A run whose output the runner partly left out.',
      props: { call: suite },
    },
  ],
})

/** The line of a fold, registered with Mokly. */
export const foldLine = defineComponent({
  slug: 'fold-line',
  title: 'Fold line',
  description:
    'The line of a fold: a chevron, the count of its tool calls and of its messages, such as "8 tool calls, 7 messages", the icons of the kinds of its tool calls, and the total output that the runner left out of them. It leaves out a zero count. Its own page shows the calls of the start of a turn.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['calls'],
    properties: {
      calls: callsSchema,
      /** The count of the messages of the fold. */
      messages: { type: 'integer', minimum: 0 },
    },
  } as const,
  props: { calls: startCalls },
  render: (props) => <FoldLine calls={props.calls} messages={props.messages} />,
  variants: [
    {
      slug: 'messages',
      title: 'With messages',
      description: 'The work of an ended turn, with its messages.',
      props: { messages: 2 },
    },
    {
      slug: 'left-out',
      title: 'Output left out',
      description:
        'A run whose output the runner partly left out: the line gives the total, and it wraps.',
      props: { calls: [...startCalls, suite] },
    },
  ],
})

/** A run of tool calls as one line that folds them, registered with Mokly. */
export const toolGroup = defineComponent({
  slug: 'tool-group',
  title: 'Tool group',
  description:
    'A run of tool calls as one line that folds them. While a turn runs, only its newest run shows its calls. Each other run shows them while one of its calls is not done. Its own page shows a closed run of the tests.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['calls', 'open'],
    properties: {
      calls: callsSchema,
      /** The run shows its calls. */
      open: { type: 'boolean' },
    },
  } as const,
  props: { calls: callsOf(autocompleteTests), open: false },
  render: (props) => <ToolGroup calls={props.calls} open={props.open} />,
  variants: [
    {
      slug: 'open',
      title: 'Open',
      description: 'The newest run of a turn that runs, with its running call.',
      props: {
        calls: [...callsOf(autocompleteTests), e2eCall],
        open: true,
      },
    },
  ],
})
