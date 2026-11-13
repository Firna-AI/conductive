import type { AgentModel } from '../../shared/generated/AgentModel'
import { ExternalLink } from 'lucide-react'
import type { Agent } from '../../shared/generated/Agent'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { Effort } from '../../shared/generated/Effort'
import { effortLabels, findModel } from '../../shared/agents'
import { effortFor } from '../state/format'
import type { MenuEntry } from '../ui/Menu'

const agentOrder: readonly Agent[] = ['claude', 'codex']
const effortOrder = Object.keys(effortLabels)
const divider: MenuEntry = { kind: 'divider' }

/** The efforts of the chosen model, in the order of the menu. */
export function effortsOf(
  models: readonly AgentModel[],
  choice: AgentChoice,
): Effort[] {
  const efforts = findModel(models, choice)?.efforts ?? [choice.effort]
  return [...efforts].sort(
    (left, right) => effortOrder.indexOf(left) - effortOrder.indexOf(right),
  )
}

/**
 * The menu of the model picker: the models of each agent as a group, with
 * no brand name, then the effort levels of the chosen model. The menu marks
 * the current model and effort. When the session has messages, each model of
 * the other agent opens a new session, and the draft moves there
 * (decision 51). The external link icon marks each of those models, and a
 * screen reader says "New session" for it. A model of the session's own
 * agent stays in it.
 */
export function modelMenu(
  models: readonly AgentModel[],
  choice: AgentChoice,
  sessionAgent: Agent | undefined,
  choose: (choice: AgentChoice) => void,
): MenuEntry[] {
  const entries: MenuEntry[] = []
  const groups = agentOrder
    .map((agent) => models.filter((model) => model.agent === agent))
    .filter((group) => group.length > 0)
  groups.forEach((group, index) => {
    const { agent } = group[0]
    const opensSession = sessionAgent !== undefined && agent !== sessionAgent
    if (index > 0) entries.push(divider)
    for (const model of group) {
      entries.push({
        kind: 'item',
        key: `${agent}:${model.model}`,
        label: model.label,
        trailingIcon: opensSession ? ExternalLink : undefined,
        trailingLabel: opensSession ? 'New session' : undefined,
        checked: agent === choice.agent && model.model === choice.model,
        onSelect: () =>
          choose({
            agent,
            model: model.model,
            effort: effortFor(model, choice.effort),
          }),
      })
    }
  })
  if (entries.length > 0) entries.push(divider)
  entries.push({ kind: 'label', label: 'Effort' })
  for (const effort of effortsOf(models, choice)) {
    entries.push({
      kind: 'item',
      key: `effort:${effort}`,
      label: effortLabels[effort],
      checked: effort === choice.effort,
      onSelect: () => choose({ ...choice, effort }),
    })
  }
  return entries
}
