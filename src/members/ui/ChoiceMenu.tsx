import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import type { ButtonHandle } from './actions'
import { useViewport } from './controls'
import { MenuPanel, type MenuChoice } from './MenuPanel'
import { Sheet } from './Sheet'
import styles from './ChoiceMenu.module.css'

export type { MenuChoice } from './MenuPanel'

/** What the trigger of a menu needs: its handle, its state, and its press. */
export type MenuTriggerProps = {
  buttonRef: RefObject<ButtonHandle | null>
  expanded: boolean
  onPress: () => void
}

/**
 * A button that opens a menu of choices, one of them marked as current.
 * Desktop opens the menu below the button. A phone opens it as a sheet.
 * Arrow keys move between the choices, and Escape, Tab, or a press outside
 * closes the menu. The parent owns `open`, so it decides whether a choice
 * closes the menu at once or after its change.
 */
export function ChoiceMenu<T extends string>(props: {
  /** The name of the menu, for a screen reader. */
  label: string
  /** The label above the choices, such as "Owner". */
  group?: string
  choices: readonly MenuChoice<T>[]
  selected: T | null
  /** A short line under the choices. */
  note?: string
  /** A line in the danger colour under the choices, such as a failed change. */
  error?: string
  /** The choice whose change runs now. The other choices wait. */
  busy?: T | null
  /** Shows in place of the choices, such as while they load. */
  status?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (value: T) => void
  /** The title of the sheet on a phone. */
  sheetTitle: string
  placement: 'below-start' | 'below-end'
  wide?: boolean
  trigger: (trigger: MenuTriggerProps) => ReactNode
}) {
  const { open, onOpenChange } = props
  const mobile = useViewport() === 'mobile'
  const anchor = useRef<HTMLSpanElement>(null)
  const trigger = useRef<ButtonHandle>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (!open || mobile) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && anchor.current?.contains(target)) return
      onOpenChange(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, mobile, onOpenChange])

  // A choice that closes the menu gives the focus back to the button.
  useEffect(() => {
    if (wasOpen.current && !open) {
      const active = document.activeElement
      const lost = active === null || active === document.body
      if (
        lost ||
        (active instanceof Node && anchor.current?.contains(active))
      ) {
        trigger.current?.focus()
      }
    }
    wasOpen.current = open
  }, [open])

  function onAnchorKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      onOpenChange(true)
    } else if (open && event.key === 'Escape') {
      event.preventDefault()
      onOpenChange(false)
    } else if (open && event.key === 'Tab') {
      onOpenChange(false)
    }
  }

  const panel = (
    <MenuPanel
      busy={props.busy ?? null}
      choices={props.choices}
      error={props.error}
      group={props.group}
      label={props.label}
      note={props.note}
      onSelect={props.onSelect}
      selected={props.selected}
      status={props.status}
    />
  )
  const placement = `${styles.menu} ${styles[props.placement]}`
  return (
    <>
      <span
        className={styles.anchor}
        onKeyDown={mobile ? undefined : onAnchorKeyDown}
        ref={anchor}
      >
        {props.trigger({
          buttonRef: trigger,
          expanded: open,
          onPress: () => onOpenChange(!open),
        })}
        {open && !mobile ? (
          <div
            className={props.wide ? `${placement} ${styles.wide}` : placement}
          >
            {panel}
          </div>
        ) : null}
      </span>
      {open && mobile ? (
        <Sheet onDismiss={() => onOpenChange(false)} title={props.sheetTitle}>
          <div className={styles.sheet}>{panel}</div>
        </Sheet>
      ) : null}
    </>
  )
}
