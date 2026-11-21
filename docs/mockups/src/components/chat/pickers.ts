import { effortLabels } from '../../../../../src/shared/agents'
import { defined } from '../../defined'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import {
  agentKeys,
  agents,
  effortsFor,
  offersFast,
  type AgentChoice,
  type AgentKey,
} from '../../fixtures/agents'
import type { Shortcut } from '../common/KeyChips'

const divider: MenuEntryData = { kind: 'divider' }

/**
 * The external link icon of a model that opens a new session, which a
 * screen reader says as "New session".
 */
function newSession(opens: boolean) {
  return opens
    ? ({ trailingIcon: 'external-link', trailingLabel: 'New session' } as const)
    : {}
}

/**
 * The models of each agent as a group, with no brand name, and the current
 * model marked. In a session with messages, each model of the other agent
 * opens a new session, which the external link icon marks.
 */
export function modelEntries(
  choice: AgentChoice,
  sessionAgent?: AgentKey,
  /** The labels of the models that the menu leaves out. */
  hiddenModels: readonly string[] = [],
): MenuEntryData[] {
  return agentKeys.flatMap((key, index): MenuEntryData[] => {
    const opensSession = sessionAgent !== undefined && key !== sessionAgent
    const shown = agents[key].models.filter(
      (model) => !hiddenModels.includes(model.name),
    )
    return [
      ...(index > 0 ? [divider] : []),
      ...shown.map((model): MenuEntryData => ({
        kind: 'item',
        label: model.name,
        ...newSession(opensSession),
        checked: key === choice.agent && model.name === choice.model,
      })),
    ]
  })
}

/**
 * The effort levels of the chosen model under a line, with the current
 * effort marked, then the Fast switch of a model that offers fast mode.
 * `fastKey` is the key of Fast mode, which the Fast row shows before its
 * switch where the key runs (fast mode decision 258).
 */
export function effortEntries(
  choice: AgentChoice,
  fastKey?: Shortcut,
): MenuEntryData[] {
  const fast: MenuEntryData[] = offersFast(choice)
    ? [
        divider,
        {
          kind: 'switch',
          label: 'Fast',
          on: choice.fast === true,
          ...defined({ shortcut: fastKey }),
        },
      ]
    : []
  return [
    divider,
    { kind: 'label', label: 'Effort' },
    ...effortsFor(choice).map((effort): MenuEntryData => ({
      kind: 'item',
      label: effortLabels[effort],
      checked: effort === choice.effort,
    })),
    ...fast,
  ]
}

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
  fastKey?: Shortcut,
): MenuEntryData[] {
  return [
    ...modelEntries(choice, sessionAgent, hiddenModels),
    ...effortEntries(choice, fastKey),
  ]
}
