import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import type { DeviceApprovalAction } from '../../shared/device'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/mac/CommandActions.module.css'
import { ActionButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { useDismiss, useFocusInside } from '../ui/dismiss'
import local from './device.module.css'

/**
 * The other ways to allow a command, each with what it covers (decision
 * 62). Always allow covers the exact command text on this Mac. The 15
 * minutes cover every command from this workspace on this Mac.
 */
const choices = [
  {
    action: 'always-allow',
    label: 'Always allow',
    scope: 'This exact command, on this Mac',
  },
  {
    action: 'allow-workspace-15-minutes',
    label: 'Allow all commands for 15 minutes',
    scope: 'Every command from this workspace, on this Mac',
  },
] as const satisfies readonly {
  action: DeviceApprovalAction
  label: string
  scope: string
}[]

const ITEM = '[role="menuitem"]'

/**
 * The menu of the other ways to allow. It is a popover in the top layer, so
 * the scrolling region of the requests never cuts it, and the CSS keeps it
 * at the actions of its request. The arrow keys move between rows.
 */
function ChoiceMenu(props: {
  onChoose: (action: DeviceApprovalAction) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useLayoutEffect(() => {
    const menu = ref.current
    // A browser without the Popover API shows the menu in place.
    if (menu && 'showPopover' in menu) menu.showPopover()
  }, [])
  useFocusInside(ref, (node) => node.querySelector<HTMLElement>(ITEM))
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(ITEM) ?? [])]
    const index = items.findIndex((item) => item === document.activeElement)
    let next: HTMLElement | undefined
    if (event.key === 'ArrowDown') next = items[(index + 1) % items.length]
    else if (event.key === 'ArrowUp') {
      next = items[(index - 1 + items.length) % items.length]
    } else if (event.key === 'Home') next = items[0]
    else if (event.key === 'End') next = items.at(-1)
    else if (event.key === 'Tab') props.onClose()
    if (!next) return
    event.preventDefault()
    next.focus()
  }
  return (
    <div
      aria-label="More ways to allow"
      className={styles.choices}
      onKeyDown={onKeyDown}
      popover="manual"
      ref={ref}
      role="menu"
    >
      {choices.map((choice) => (
        <button
          aria-describedby={`${id}-${choice.action}`}
          aria-label={choice.label}
          className={classes(controls.bare, controls.row, styles.choice)}
          key={choice.action}
          onClick={() => props.onChoose(choice.action)}
          role="menuitem"
          tabIndex={-1}
          type="button"
        >
          <span aria-hidden className={styles.label}>
            {choice.label}
          </span>
          <span className={styles.scope} id={`${id}-${choice.action}`}>
            {choice.scope}
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * Deny and Allow for a command that waits on this Mac, and the arrow beside
 * Allow that opens the other ways to allow. `answering` is the choice that
 * this window sent: every choice then waits for the Mac to act on it. The
 * menu opens from the actions that hold these choices, so a narrow card can
 * keep it inside its edges. Escape, a press outside, and Tab close it, and
 * the focus goes back to the arrow.
 */
export function CommandChoices(props: {
  answering: DeviceApprovalAction | null
  onAnswer: (action: DeviceApprovalAction) => void
}) {
  const control = useControlSizes()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(anchor, open, close)
  const { answering, onAnswer } = props
  const sent = answering !== null
  const choose = (action: DeviceApprovalAction) => {
    setOpen(false)
    onAnswer(action)
  }
  return (
    <span className={local.choices} ref={anchor}>
      <ActionButton
        busy={answering === 'deny'}
        disabled={sent}
        onPress={() => onAnswer('deny')}
      >
        Deny
      </ActionButton>
      <span className={styles.split}>
        <Button
          busy={sent && answering !== 'deny'}
          disabled={sent}
          labelStyle={{
            fontSize: control.labelSize,
            fontWeight: control.labelWeight,
            lineHeight: control.labelSize + 4,
          }}
          numberOfLines={1}
          onPress={() => onAnswer('allow')}
          size="sm"
          style={{
            height: control.height,
            paddingHorizontal: 10,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
          tone="primary"
        >
          Allow
        </Button>
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="More ways to allow"
          className={classes(controls.bare, styles.arrow, local.arrow)}
          disabled={sent}
          onClick={() => setOpen((current) => !current)}
          style={{ height: control.height }}
          type="button"
        >
          <ChevronDown aria-hidden size={14} />
        </button>
      </span>
      {open ? <ChoiceMenu onChoose={choose} onClose={close} /> : null}
    </span>
  )
}
