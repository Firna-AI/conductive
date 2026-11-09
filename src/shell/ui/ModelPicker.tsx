import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import type { MenuPlacement } from '../../../docs/mockups/src/components/common/Menu'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { pickerButtonStyle } from '../../../docs/mockups/src/components/chat/ModelPicker'
import styles from '../../../docs/mockups/src/components/chat/ModelPicker.module.css'
import { EFFORTS } from '../../app/api/read-core'
import type {
  Agent,
  AgentChoice,
  AgentModel,
  Effort,
} from '../../shared/agents'
import { MenuButton, type MenuEntry } from './Menu'

const effortLabels: Readonly<Record<Effort, string>> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Max',
}

/** The effort that a new model keeps: the same one, or the next lower one. */
function effortFor(model: AgentModel, effort: Effort): Effort {
  if (model.efforts.includes(effort)) return effort
  const lower = EFFORTS.slice(0, EFFORTS.indexOf(effort)).reverse()
  return lower.find((item) => model.efforts.includes(item)) ?? model.efforts[0]
}

export function modelLabel(
  models: readonly AgentModel[],
  choice: AgentChoice,
): string {
  return (
    models.find(
      (item) => item.agent === choice.agent && item.model === choice.model,
    )?.label ?? choice.model
  )
}

function entries(
  models: readonly AgentModel[],
  choice: AgentChoice,
  change: (choice: AgentChoice) => void,
  sessionAgent: Agent | undefined,
): MenuEntry[] {
  const agents: readonly Agent[] = ['claude', 'codex']
  const groups = agents.flatMap((agent, index): MenuEntry[] => {
    const own = models.filter((item) => item.agent === agent)
    if (own.length === 0) return []
    const opensSession = sessionAgent !== undefined && agent !== sessionAgent
    return [
      ...(index > 0 ? [{ kind: 'divider' } as const] : []),
      ...own.map((item): MenuEntry => ({
        kind: 'item',
        label: item.label,
        detail: opensSession ? 'New session' : undefined,
        checked: item.agent === choice.agent && item.model === choice.model,
        onSelect: () =>
          change({
            agent: item.agent,
            model: item.model,
            effort: effortFor(item, choice.effort),
          }),
      })),
      ...(opensSession
        ? [
            {
              kind: 'note',
              text: 'Your draft moves to the new session.',
            } as const,
          ]
        : []),
    ]
  })
  const current = models.find(
    (item) => item.agent === choice.agent && item.model === choice.model,
  )
  const efforts = (current?.efforts ?? []).map((effort): MenuEntry => ({
    kind: 'item',
    label: effortLabels[effort],
    checked: effort === choice.effort,
    onSelect: () => change({ ...choice, effort }),
  }))
  if (efforts.length === 0) return groups
  return [
    ...groups,
    { kind: 'divider' },
    { kind: 'label', label: 'Effort' },
    ...efforts,
  ]
}

/**
 * One picker for the model and the effort, such as "Opus 5.5 High". It
 * names no agent brand. In a session with messages, `sessionAgent` marks
 * the models of the other agent, which open a new session (decision 51).
 */
export function ModelPicker(props: {
  models: readonly AgentModel[]
  choice: AgentChoice
  change: (choice: AgentChoice) => void
  placement?: Exclude<MenuPlacement, 'sheet'>
  sessionAgent?: Agent
  disabled?: boolean
}) {
  const control = useControlSizes()
  const { choice } = props
  const model = modelLabel(props.models, choice)
  const effort = effortLabels[choice.effort]
  return (
    <MenuButton
      className={styles.anchor}
      entries={entries(props.models, choice, props.change, props.sessionAgent)}
      label="Model and effort"
      placement={props.placement ?? 'above-start'}
      trigger={({ open, toggle }) => (
        <Button
          accessibilityLabel={`Model and effort: ${model}, ${effort}`}
          content={
            <span
              className={styles.trigger}
              style={{ fontSize: control.labelSize }}
            >
              <span className={styles.model}>{model}</span>
              <span className={styles.effort}>{effort}</span>
              <ChevronDown aria-hidden className={styles.chevron} size={12} />
            </span>
          }
          disabled={props.disabled}
          expanded={open}
          hasPopup="menu"
          onPress={toggle}
          size="sm"
          style={pickerButtonStyle(control.height)}
          tone="plain"
        />
      )}
    />
  )
}
