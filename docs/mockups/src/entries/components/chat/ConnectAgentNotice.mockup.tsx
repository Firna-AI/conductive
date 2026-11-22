import { defineComponent } from '@mokly/mokly'
import { ConnectAgentNotice } from '../../../components/chat/ConnectAgentNotice'
import { defaultChoice } from '../../../fixtures/agents'
import { agentChoiceSchema } from '../workspaces/workspaceSchemas'

/**
 * The notice over a composer when the agent of the chosen model is not
 * connected, registered with Mokly. Its pages show the notice of each
 * agent.
 */
export const connectAgentNotice = defineComponent({
  slug: 'connect-agent-notice',
  title: 'Connect agent notice',
  description:
    'The notice over a composer when the agent of the chosen model is not connected, such as "Connect Claude to use Opus 5.5". Its action opens the Connect form of that agent in the account. The chat, the New workspace page, and the New workspace dialog show it. Its own page shows the notice for Claude.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['choice'],
    properties: { choice: agentChoiceSchema },
  } as const,
  props: { choice: defaultChoice },
  render: (props) => <ConnectAgentNotice choice={props.choice} />,
  variants: [
    {
      slug: 'codex',
      title: 'Codex',
      description: 'The notice for a model of Codex.',
      props: {
        choice: { agent: 'codex', model: 'GPT-6.1 Sol', effort: 'medium' },
      },
    },
  ],
})
