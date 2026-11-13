import type { effortLabels } from '../../../../src/shared/agents'

/**
 * The agents that a message can use, with their models and effort levels.
 * The app offers Claude and Codex only for now.
 */

export const agentKeys = ['claude', 'codex'] as const

export type AgentKey = (typeof agentKeys)[number]

export type EffortKey = keyof typeof effortLabels

type Model = {
  name: string
  /** The effort levels that the model accepts, from the lowest. */
  efforts: readonly EffortKey[]
}

export type Agent = {
  key: AgentKey
  name: string
  models: readonly Model[]
}

export const agents: Readonly<Record<AgentKey, Agent>> = {
  claude: {
    key: 'claude',
    name: 'Claude',
    models: [
      {
        name: 'Opus 5.5',
        efforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
      },
      { name: 'Sonnet 5.5', efforts: ['low', 'medium', 'high', 'max'] },
      { name: 'Fable 5.1', efforts: ['low', 'medium', 'high'] },
    ],
  },
  codex: {
    key: 'codex',
    name: 'Codex',
    models: [
      {
        name: 'GPT-6.1 Sol',
        efforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
      },
      { name: 'GPT-6 Astra', efforts: ['low', 'medium', 'high'] },
    ],
  },
}

/** The agent, the model, and the effort of a message. */
export type AgentChoice = {
  agent: AgentKey
  model: string
  effort: EffortKey
}

/** What a new workspace starts with, from the account settings. */
export const defaultChoice: AgentChoice = {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'high',
}

/** The effort levels of the chosen model. */
export function effortsFor(choice: AgentChoice): readonly EffortKey[] {
  const model = agents[choice.agent].models.find(
    (item) => item.name === choice.model,
  )
  return model?.efforts ?? []
}
