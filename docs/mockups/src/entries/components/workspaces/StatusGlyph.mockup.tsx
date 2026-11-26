import { defineComponent } from '@mokly/mokly'
import { StatusGlyph } from '../../../../../../src/ui/components/workspaces/StatusGlyph'
import type { RunState } from '../../../../../../src/ui/components/workspaces/activityStatus'
import { activityStatuses } from './workspaceSchemas'

/** The states of a workspace and of an automation run, as `RunState`. */
const runStates = [
  ...activityStatuses,
  'queued',
  'failed',
  'skipped',
] as const satisfies readonly RunState[]

/**
 * The state of a workspace or of an automation run as a dot-matrix square,
 * registered with Mokly. Its pages show the motions and the colours that
 * the screens show most: the ring of a working agent, the pulse of a
 * request, the row of a start, the green grid of a finished turn, and the
 * rose cross of a failed start.
 */
export const statusGlyph = defineComponent({
  slug: 'status-glyph',
  title: 'Status glyph',
  description:
    'The state of the agent and the cloud computer of a workspace, as its header shows it, or the state of an automation run: a 3 × 3 dot-matrix square whose lit cells draw the state, so a state never depends on colour alone. Working moves around the ring, starting fills the middle row, and a workspace that needs input pulses. Its own page shows an agent that works.',
  relatedDocs: ['docs/mockups/design-marks.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['status'],
    properties: { status: { enum: runStates } },
  } as const,
  props: { status: 'working' },
  render: (props) => <StatusGlyph status={props.status} />,
  variants: [
    {
      slug: 'input',
      title: 'Needs input',
      description: 'The middle column pulses in the accent colour.',
      props: { status: 'input' },
    },
    {
      slug: 'starting',
      title: 'Starting',
      description: 'The middle row fills from left to right, in grey.',
      props: { status: 'starting' },
    },
    {
      slug: 'unread',
      title: 'Done, unread',
      description: 'Every cell in green: a turn finished with output to read.',
      props: { status: 'unread' },
    },
    {
      slug: 'error',
      title: "Couldn't start",
      description: 'A rose cross: the sandbox could not start.',
      props: { status: 'error' },
    },
  ],
})
