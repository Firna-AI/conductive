import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import type { DeviceApprovalAction } from '../../shared/device'
import { classes } from '../../ui/components/common/classes'
import { useControlSizes } from '../../ui/components/common/touch'
import styles from '../../ui/components/mac/CommandActions.module.css'
import { PopoverSurface } from '../../shell/ui/PopoverSurface'
import ui from '../../shell/ui/ui.module.css'
import { ActionButton } from '../ui/actions'
import controls from '../ui/controls.module.css'
import { useDismiss, useFocusInside } from '../ui/dismiss'
import local from './device.module.css'

/**
 * The other ways to allow a command, each with what it covers (decision
 * 62). Always allow covers the exact command text on this Mac. The 15
 * minutes cover every command from this workspace on this Mac, and so does
 * the choice until the user stops it (Mac until-stop decision 0).
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
  {
    action: 'allow-workspace-until-stop',
    label: 'Allow all commands until I stop',
    scope: 'Every command from this workspace, on this Mac, until you stop',
  },
] as const satisfies readonly {
  action: DeviceApprovalAction
  label: string
  scope: string
}[]

const ITEM = '[role="menuitem"]'

/**
 * The menu keeps its own width and height, up to the room of the window,
 * and opens 6 px from the actions, as the mockups draw it. Where the room
 * is shorter than the menu, its list scrolls.
 */
const SURFACE = {
  anchorWidthAsMinimum: false,
  maxWidth: Number.POSITIVE_INFINITY,
  maxHeight: Number.POSITIVE_INFINITY,
  gutter: 6,
}

/**
 * The width of the box of the actions while their request is narrow, else
 * null. A narrow request puts its actions under the command, and the CSS
 * of `marker` then sets `--narrow-actions`. A change of the size of the box
 * reads them again.
 */
function useNarrowWidth(
  marker: RefObject<HTMLElement | null>,
  actions: RefObject<HTMLElement | null>,
  open: boolean,
): number | null {
  const [width, setWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const node = marker.current
    const box = actions.current
    if (!open || !node || !box) return
    const read = () => {
      const style = getComputedStyle(node)
      const narrow = style.getPropertyValue('--narrow-actions') !== ''
      setWidth(narrow ? box.getBoundingClientRect().width : null)
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(read)
    observer.observe(box)
    return () => observer.disconnect()
  }, [marker, actions, open])
  return width
}

/** The menu of the other ways to allow. The arrow keys move between rows. */
function ChoiceMenu(props: {
  onChoose: (action: DeviceApprovalAction) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
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
      className={classes(styles.choices, ui.anchoredMenu)}
      onKeyDown={onKeyDown}
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
 * menu opens above `actions`, the box of the actions of the request that
 * holds these choices, on the surface of the shell menus. It is in the top
 * layer, so the region of the requests never cuts it. With no room above,
 * it opens on the side with more room. A narrow request starts it at the
 * start of that box and keeps it inside the width of the box. Escape, a
 * press outside, and Tab close it, and the focus goes back to the arrow.
 */
export function CommandChoices(props: {
  actions: RefObject<HTMLElement | null>
  answering: DeviceApprovalAction | null
  onAnswer: (action: DeviceApprovalAction) => void
}) {
  const control = useControlSizes()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(anchor, open, close)
  const narrow = useNarrowWidth(anchor, props.actions, open)
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
      {open ? (
        <PopoverSurface
          align={narrow === null ? 'end' : 'start'}
          anchor={props.actions}
          className={classes(ui.menuLayer, local.layer)}
          options={narrow === null ? SURFACE : { ...SURFACE, maxWidth: narrow }}
          side="above"
        >
          <ChoiceMenu onChoose={choose} onClose={close} />
        </PopoverSurface>
      ) : null}
    </span>
  )
}
