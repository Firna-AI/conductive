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
  /** The model offers fast mode, so the menu shows the Fast switch. */
  fast?: boolean
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
        efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
        fast: true,
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
        efforts: ['none', 'low', 'medium', 'high', 'xhigh'],
        fast: true,
      },
      { name: 'GPT-6 Astra', efforts: ['low', 'medium', 'high'], fast: true },
    ],
  },
}

/** The agent, the model, the effort, and the speed of a message. */
export type AgentChoice = {
  agent: AgentKey
  model: string
  effort: EffortKey
  /**
   * Fast mode: faster output at a higher price. A choice without the field
   * has fast mode off, so the tests of the app can reuse these choices.
   */
  fast?: boolean
}

/** What a new workspace starts with, from the account settings. */
export const defaultChoice: AgentChoice = {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'high',
}

/** The default choice with fast mode on. */
export const fastChoice: AgentChoice = { ...defaultChoice, fast: true }

/** A model without fast mode, so its menu has no Fast switch. */
export const noFastChoice: AgentChoice = {
  agent: 'claude',
  model: 'Sonnet 5.5',
  effort: 'high',
}

/** The effort levels of the chosen model. */
export function effortsFor(choice: AgentChoice): readonly EffortKey[] {
  const model = agents[choice.agent].models.find(
    (item) => item.name === choice.model,
  )
  return model?.efforts ?? []
}

/** The chosen model offers fast mode. */
export function offersFast(choice: AgentChoice): boolean {
  const model = agents[choice.agent].models.find(
    (item) => item.name === choice.model,
  )
  return model?.fast === true
}
