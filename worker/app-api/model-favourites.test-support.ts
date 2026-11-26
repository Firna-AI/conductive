import type { AgentChoice } from '../../src/shared/generated/AgentChoice'
import type { AgentModel } from '../../src/shared/generated/AgentModel'

export const favourite: AgentChoice = {
  agent: 'claude',
  model: 'favourite-claude',
  effort: 'high',
  fast: false,
}

export const otherFavourite: AgentChoice = {
  agent: 'codex',
  model: 'favourite-codex',
  effort: 'medium',
  fast: false,
}

export const favouriteModels: AgentModel[] = [
  {
    agent: 'claude',
    model: 'favourite-claude',
    label: 'Claude',
    efforts: ['low', 'medium', 'high', 'max'],
    fast: true,
  },
  {
    agent: 'codex',
    model: 'favourite-codex',
    label: 'Codex',
    efforts: ['low', 'medium', 'high'],
  },
]
