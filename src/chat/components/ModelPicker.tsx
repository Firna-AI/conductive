import { useCallback, useRef, useState } from 'react'
import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import {
  effortLabels,
  modelLabel,
  type Agent,
  type AgentChoice,
  type AgentModel,
} from '../../shared/agents'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { pickerButtonStyle } from '../../../docs/mockups/src/components/chat/pickerButton'
import styles from '../../../docs/mockups/src/components/chat/ModelPicker.module.css'
import { useDismiss } from '../ui/dismiss'
import { Menu } from '../ui/Menu'
import { modelMenu } from './model-menu'

/**
 * One picker for the model and the effort of the session, such as
 * "Opus 5.5 High", with the effort in a muted colour. `sessionAgent` is the
 * agent of a session with messages, whose other agent's models open a new
 * session.
 */
export function ModelPicker(props: {
  choice: AgentChoice
  models: readonly AgentModel[]
  sessionAgent?: Agent
  disabled?: boolean
  onChoose: (choice: AgentChoice) => void
}) {
  const control = useControlSizes()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(anchor, open, close)
  const { choice, onChoose } = props
  const label = modelLabel(props.models, choice)
  const effort = effortLabels[choice.effort]
  const choose = (next: AgentChoice) => {
    setOpen(false)
    if (
      next.agent !== choice.agent ||
      next.model !== choice.model ||
      next.effort !== choice.effort
    ) {
      onChoose(next)
    }
  }
  return (
    <span className={styles.anchor} ref={anchor}>
      <Button
        accessibilityLabel={`Model and effort: ${label}, ${effort}`}
        content={
          <span
            className={styles.trigger}
            style={{ fontSize: control.labelSize }}
          >
            <span className={styles.model}>{label}</span>
            <span className={styles.effort}>{effort}</span>
            <ChevronDown aria-hidden className={styles.chevron} size={12} />
          </span>
        }
        disabled={props.disabled}
        expanded={open}
        hasPopup="menu"
        onPress={() => setOpen((current) => !current)}
        size="sm"
        style={pickerButtonStyle(control.height)}
        tone="plain"
      />
      {open ? (
        <Menu
          entries={modelMenu(props.models, choice, props.sessionAgent, choose)}
          label="Model and effort"
          onClose={close}
          placement="above-start"
        />
      ) : null}
    </span>
  )
}
