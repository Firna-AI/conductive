import {
  agentKeys,
  agents,
  effortLabels,
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
 * there (decision 51). A model of the session's own agent stays in it.
 */
export function pickerMenu(
  choice: AgentChoice,
  sessionAgent?: AgentKey,
): MenuEntry[] {
  const models = agentKeys.flatMap((key, index): MenuEntry[] => {
    const opensSession = sessionAgent !== undefined && key !== sessionAgent
    return [
      ...(index > 0 ? [divider] : []),
      ...agents[key].models.map((model): MenuEntry => ({
        kind: 'item',
        label: model.name,
        detail: opensSession ? 'New session' : undefined,
        checked: key === choice.agent && model.name === choice.model,
      })),
      ...(opensSession
        ? [
            {
              kind: 'note',
              text: 'Your draft moves to the new session.',
            } satisfies MenuEntry,
          ]
        : []),
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
