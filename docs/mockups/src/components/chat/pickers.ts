import {
  agentKeys,
  agents,
  effortLabels,
  effortsFor,
  type AgentChoice,
} from '../../fixtures/agents'
import type { MenuEntry } from '../common/Menu'

const divider: MenuEntry = { kind: 'divider' }

/**
 * The menu of the model picker: the models of each agent as a group, with
 * no brand name, then the effort levels of the chosen model. The menu marks
 * the current model and the current effort.
 */
export function pickerMenu(choice: AgentChoice): MenuEntry[] {
  const models = agentKeys.flatMap((key, index): MenuEntry[] => [
    ...(index > 0 ? [divider] : []),
    ...agents[key].models.map((model): MenuEntry => ({
      kind: 'item',
      label: model.name,
      checked: key === choice.agent && model.name === choice.model,
    })),
  ])
  return [
    ...models,
    divider,
    { kind: 'label', label: 'Effort' },
    ...effortsFor(choice).map((effort): MenuEntry => ({
      kind: 'item',
      label: effortLabels[effort],
      checked: effort === choice.effort,
    })),
  ]
}
