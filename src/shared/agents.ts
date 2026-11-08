export type Agent = 'claude' | 'codex'
export type Effort = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface AgentChoice {
  agent: Agent
  model: string
  effort: Effort
}

export interface AgentModel {
  agent: Agent
  model: string
  label: string
  efforts: readonly Effort[]
}

export const MODELS_PATH = '/api/models'
export interface ModelsResponse {
  models: readonly AgentModel[]
}
