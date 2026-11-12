import { ExternalLink } from 'lucide-react'
import { effortLabels } from '../../../../../src/shared/agents'
import {
  agentKeys,
  agents,
  effortsFor,
  offersFast,
  type AgentChoice,
  type AgentKey,
} from '../../fixtures/agents'
import type { MenuEntry } from '../common/Menu'

const divider: MenuEntry = { kind: 'divider' }

/**
 * The menu of the model picker: the models of each agent as a group, with
 * no brand name, then the effort levels of the chosen model, then the Fast
 * switch of a model that offers fast mode. The menu marks the current model
 * and the current effort. In a session with messages,
 * each model of the other agent opens a new session, and the draft moves
 * there (decision 51). The external link icon marks each of those models,
 * and a screen reader says "New session" for it. A model of the session's
 * own agent stays in it.
 */
export function pickerMenu(
  choice: AgentChoice,
  sessionAgent?: AgentKey,
  /** The labels of the models that the menu leaves out. */
  hiddenModels: readonly string[] = [],
): MenuEntry[] {
  const models = agentKeys.flatMap((key, index): MenuEntry[] => {
    const opensSession = sessionAgent !== undefined && key !== sessionAgent
    const shown = agents[key].models.filter(
      (model) => !hiddenModels.includes(model.name),
    )
    return [
      ...(index > 0 ? [divider] : []),
      ...shown.map((model): MenuEntry => ({
        kind: 'item',
        label: model.name,
        trailingIcon: opensSession ? ExternalLink : undefined,
        trailingLabel: opensSession ? 'New session' : undefined,
        checked: key === choice.agent && model.name === choice.model,
      })),
    ]
  })
  const fast: MenuEntry[] = offersFast(choice)
    ? [divider, { kind: 'switch', label: 'Fast', on: choice.fast === true }]
    : []
  return [
    ...models,
    divider,
    { kind: 'label', label: 'Effort' },
    ...effortsFor(choice).map((effort): MenuEntry => ({
      kind: 'item',
      label: effortLabels[effort],
      checked: effort === choice.effort,
    })),
    ...fast,
  ]
}
