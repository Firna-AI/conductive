import { effortLabels } from '../../../../../src/shared/agents'
import {
  agentKeys,
  agents,
  effortsFor,
  type AgentChoice,
  type AgentKey,
} from '../../fixtures/agents'
import type { MenuEntry } from '../common/Menu'

const divider: MenuEntry = { kind: 'divider' }

/**
 * The muted words after a model: "New session" for a model that opens a new
 * session, or "Not listed" for a model that the model list of the viewer's
 * own endpoint does not name. That mark is soft, and the model stays a
 * choice.
 */
function modelDetail(opensSession: boolean, unlisted: boolean) {
  if (opensSession) return 'New session'
  return unlisted ? 'Not listed' : undefined
}

/**
 * The menu of the model picker: the models of each agent as a group, with
 * no brand name, then the effort levels of the chosen model. The menu marks
 * the current model and the current effort. In a session with messages,
 * each model of the other agent opens a new session, and the draft moves
 * there (decision 51). A model of the session's own agent stays in it.
 * `unlisted` holds the labels of the models that the model list of the
 * viewer's own endpoint does not name.
 */
export function pickerMenu(
  choice: AgentChoice,
  sessionAgent?: AgentKey,
  unlisted: readonly string[] = [],
): MenuEntry[] {
  const models = agentKeys.flatMap((key, index): MenuEntry[] => {
    const opensSession = sessionAgent !== undefined && key !== sessionAgent
    return [
      ...(index > 0 ? [divider] : []),
      ...agents[key].models.map((model): MenuEntry => ({
        kind: 'item',
        label: model.name,
        detail: modelDetail(opensSession, unlisted.includes(model.name)),
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
