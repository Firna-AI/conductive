import type { Agent } from './generated/Agent'
import type { AgentModel } from './generated/AgentModel'
import type { AgentChoice } from './generated/AgentChoice'

import type { Effort } from './generated/Effort'

export const MODELS_PATH = '/api/models'
export interface ModelsResponse {
  models: readonly AgentModel[]
}

const choiceEqualities: {
  readonly [K in keyof AgentChoice]-?: (
    a: AgentChoice,
    b: AgentChoice,
  ) => boolean
} = {
  agent: (a, b) => a.agent === b.agent,
  model: (a, b) => a.model === b.model,
  effort: (a, b) => a.effort === b.effort,
  fast: (a, b) => a.fast === b.fast,
}

/** Whether every field of two choices is equal. */
export function sameChoice(a: AgentChoice, b: AgentChoice): boolean {
  return Object.values(choiceEqualities).every((equal) => equal(a, b))
}

/**
 * The name of each agent, for the marks, the notices, and screen readers
 * of the chat, and for a line that names the login of a session that a
 * member connects again, such as "after Cal connects Claude again".
 */
export const agentNames: Readonly<Record<Agent, string>> = {
  claude: 'Claude',
  codex: 'Codex',
}

/** The effort levels from the lowest, with the words that the picker shows. */
export const effortLabels: Readonly<Record<Effort, string>> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Max',
  ultra: 'Ultra',
}

export function findModel(
  models: readonly AgentModel[],
  choice: Pick<AgentChoice, 'agent' | 'model'>,
): AgentModel | undefined {
  return models.find(
    (item) => item.agent === choice.agent && item.model === choice.model,
  )
}

/** The name of a model without its agent's brand, such as "Opus 5.5". */
export function modelLabel(
  models: readonly AgentModel[],
  choice: AgentChoice,
): string {
  return findModel(models, choice)?.label ?? choice.model
}
