import { defineComponent } from '@mokly/mokly'
import { AgentMark } from '../../../components/chat/AgentMark'
import { agentKeys } from '../../../fixtures/agents'

/**
 * The mark of an agent, registered with Mokly. Its pages show the mark of
 * each agent.
 */
export const agentMark = defineComponent({
  slug: 'agent-mark',
  title: 'Agent mark',
  description:
    'The mark of an agent: its two letters on a small tile, in the label font, in place of a brand logo. Menus of agents and models show it. Screen readers hear the name of the agent. Its own page shows the mark of Claude.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['agent'],
    properties: { agent: { enum: agentKeys } },
  } as const,
  props: { agent: 'claude' },
  render: (props) => <AgentMark agent={props.agent} />,
  variants: [
    {
      slug: 'codex',
      title: 'Codex',
      description: 'The mark of Codex.',
      props: { agent: 'codex' },
    },
  ],
})
