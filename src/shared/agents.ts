export type Agent = 'claude' | 'codex'
export type Effort = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface AgentChoice {
  agent: Agent
  model: string
  effort: Effort
  fast: boolean
}

export interface AgentModel {
  agent: Agent
  model: string
  label: string
  efforts: readonly Effort[]
  fast?: boolean
}

export const MODELS_PATH = '/api/models'
export interface ModelsResponse {
  models: readonly AgentModel[]
}

/** The effort levels from the lowest, with the words that the picker shows. */
export const effortLabels: Readonly<Record<Effort, string>> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Max',
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
