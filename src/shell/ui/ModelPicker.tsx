import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import type { MenuPlacement } from '../../../docs/mockups/src/components/common/Menu'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { pickerButtonStyle } from '../../../docs/mockups/src/components/chat/pickerButton'
import styles from '../../../docs/mockups/src/components/chat/ModelPicker.module.css'
import { EFFORTS } from '../../app/api/read-core'
import {
  effortLabels,
  modelLabel,
  type Agent,
  type AgentChoice,
  type AgentModel,
  type Effort,
} from '../../shared/agents'
import { MenuButton, type MenuEntry } from './Menu'

/** The effort that a new model keeps: the same one, or the next lower one. */
function effortFor(model: AgentModel, effort: Effort): Effort {
  if (model.efforts.includes(effort)) return effort
  const lower = EFFORTS.slice(0, EFFORTS.indexOf(effort)).reverse()
  return lower.find((item) => model.efforts.includes(item)) ?? model.efforts[0]
}

function entries(
  models: readonly AgentModel[],
  choice: AgentChoice,
  change: (choice: AgentChoice) => void,
): MenuEntry[] {
  const agents: readonly Agent[] = ['claude', 'codex']
  const groups = agents.flatMap((agent, index): MenuEntry[] => {
    const own = models.filter((item) => item.agent === agent)
    if (own.length === 0) return []
    return [
      ...(index > 0 ? [{ kind: 'divider' } as const] : []),
      ...own.map((item): MenuEntry => ({
        kind: 'item',
        label: item.label,
        checked: item.agent === choice.agent && item.model === choice.model,
        onSelect: () =>
          change({
            agent: item.agent,
            model: item.model,
            effort: effortFor(item, choice.effort),
          }),
      })),
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
 * names no agent brand.
 */
export function ModelPicker(props: {
  models: readonly AgentModel[]
  choice: AgentChoice
  change: (choice: AgentChoice) => void
  placement?: Exclude<MenuPlacement, 'sheet'>
  disabled?: boolean
}) {
  const control = useControlSizes()
  const { choice } = props
  const model = modelLabel(props.models, choice)
  const effort = effortLabels[choice.effort]
  return (
    <MenuButton
      className={styles.anchor}
      entries={entries(props.models, choice, props.change)}
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
