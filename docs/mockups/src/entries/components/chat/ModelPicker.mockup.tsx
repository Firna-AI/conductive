import { defineComponent } from '@mokly/mokly'
import { ModelPicker } from '../../../components/chat/ModelPicker'
import type { MenuPlacement } from '../../../components/common/Menu'
import { agentKeys, defaultChoice } from '../../../fixtures/agents'
import { agentChoiceSchema } from '../workspaces/workspaceSchemas'

/** Where the menu of the picker opens, as `MenuPlacement` lists them. */
const placements = [
  'below-start',
  'below-end',
  'above-start',
  'above-end',
  'sheet',
] as const satisfies readonly MenuPlacement[]

/**
 * The picker of the model and the effort, registered with Mokly. Its pages
 * show the picker, fast mode, and the menu open.
 */
export const modelPicker = defineComponent({
  slug: 'model-picker',
  title: 'Model picker',
  description:
    'One picker for the model and the effort of the next message, such as "Opus 5.5 High". The effort shows in a muted colour, and so does "Fast" after it while fast mode is on. Its menu lists the models of each agent, the efforts, and Fast. In a session with messages, a model of the other agent opens a new session. Its own page shows the default choice.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['choice'],
    properties: {
      choice: agentChoiceSchema,
      /** The menu is open. */
      open: { type: 'boolean' },
      /** Where the menu opens. */
      placement: { enum: placements },
      /** The agent of a session with messages. */
      sessionAgent: { enum: agentKeys },
      /** The models that the menu leaves out. */
      hiddenModels: { type: 'array', items: { type: 'string' } },
      /** The picker of a session tab, whose Fast row shows its key. */
      fastKey: { type: 'boolean' },
    },
  } as const,
  props: { choice: defaultChoice },
  render: (props) => (
    <ModelPicker
      choice={props.choice}
      fastKey={props.fastKey}
      hiddenModels={props.hiddenModels}
      open={props.open}
      placement={props.placement}
      sessionAgent={props.sessionAgent}
    />
  ),
  variants: [
    {
      slug: 'fast',
      title: 'Fast mode',
      description: 'Fast mode is on, so "Fast" follows the effort.',
      props: { choice: { ...defaultChoice, fast: true } },
    },
    {
      slug: 'open',
      title: 'Menu open',
      description:
        'The menu below the picker, with the models of each agent and the efforts.',
      props: { open: true, placement: 'below-start' },
    },
  ],
})
