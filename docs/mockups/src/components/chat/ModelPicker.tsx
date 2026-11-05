import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import { effortLabels, type AgentChoice } from '../../fixtures/agents'
import { noop } from '../../noop'
import { Menu, type MenuPlacement } from '../common/Menu'
import { useControlSizes } from '../common/touch'
import { pickerMenu } from './pickers'
import styles from './ModelPicker.module.css'

/**
 * One picker for the model and the effort of the next message, such as
 * "Opus 5.5 High". The effort shows in a muted colour. `open` draws its
 * menu open.
 */
export function ModelPicker(props: {
  choice: AgentChoice
  open?: boolean
  placement?: MenuPlacement
}) {
  const control = useControlSizes()
  const { choice } = props
  const effort = effortLabels[choice.effort]
  return (
    <span className={styles.anchor}>
      <Button
        accessibilityLabel={`Model and effort: ${choice.model}, ${effort}`}
        content={
          <span
            className={styles.trigger}
            style={{ fontSize: control.labelSize }}
          >
            <span className={styles.model}>{choice.model}</span>
            <span className={styles.effort}>{effort}</span>
            <ChevronDown aria-hidden className={styles.chevron} size={12} />
          </span>
        }
        expanded={props.open ?? false}
        hasPopup="menu"
        onPress={noop}
        size="sm"
        style={{ height: control.height, paddingHorizontal: 8 }}
        tone="plain"
      />
      {props.open ? (
        <Menu
          entries={pickerMenu(choice)}
          label="Model and effort"
          placement={props.placement ?? 'above-start'}
        />
      ) : null}
    </span>
  )
}
