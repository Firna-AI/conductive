import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { useMenuLayer } from '../../shell/ui/layers'
import type { ButtonHandle } from './actions'
import { useViewport } from './controls'
import { MenuPanel, type MenuChoice } from './MenuPanel'
import { requestClose } from './modal'
import { PopoverSurface, type MenuAlign } from './PopoverSurface'
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
 * Desktop opens the menu as a popover beside the button: below when it
 * fits, otherwise on the side with more room. A phone opens it as a sheet.
 * Arrow keys move between the choices. Escape, Tab, a press outside, a
 * press on the button, and the dismissal of the sheet close the menu,
 * except while a change runs: then the menu refuses each of them and stays
 * open, so the change's error shows in it. The parent owns `open`, so it
 * decides whether a choice closes the menu at once or after its change.
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
  /** The choice whose change runs now. The other choices wait, and the menu stays open. */
  busy?: T | null
  /** Shows in place of the choices, such as while they load. */
  status?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (value: T) => void
  /** The title of the sheet on a phone. */
  sheetTitle: string
  /** Which edge of the desktop menu lines up with the same edge of the button. */
  align: MenuAlign
  wide?: boolean
  trigger: (trigger: MenuTriggerProps) => ReactNode
}) {
  const { open, onOpenChange } = props
  const mobile = useViewport() === 'mobile'
  const busy = props.busy !== undefined && props.busy !== null
  const anchor = useRef<HTMLSpanElement>(null)
  const trigger = useRef<ButtonHandle>(null)
  const wasOpen = useRef(false)
  // Every request to close the desktop menu goes through here. The phone
  // sheet applies the same rule.
  const askToClose = useCallback(
    () => requestClose(busy, () => onOpenChange(false)),
    [busy, onOpenChange],
  )
  // The key of the command palette asks the desktop menu to close. While
  // a change runs, the menu refuses, and the palette stays closed.
  useMenuLayer(open && !mobile, askToClose)

  useEffect(() => {
    if (!open || mobile) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && anchor.current?.contains(target)) return
      askToClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, mobile, askToClose])

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
      askToClose()
    } else if (open && event.key === 'Tab') {
      askToClose()
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
          onPress: () => {
            if (open) askToClose()
            else onOpenChange(true)
          },
        })}
        {open && !mobile ? (
          <PopoverSurface align={props.align} anchor={anchor} wide={props.wide}>
            {panel}
          </PopoverSurface>
        ) : null}
      </span>
      {open && mobile ? (
        <Sheet
          busy={busy}
          onDismiss={() => onOpenChange(false)}
          title={props.sheetTitle}
        >
          <div className={styles.sheet}>{panel}</div>
        </Sheet>
      ) : null}
    </>
  )
}
