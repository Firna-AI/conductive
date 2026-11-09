import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import styles from './ChoiceMenu.module.css'

export type MenuChoice<T extends string> = {
  value: T
  label: string
  /** A mark before the label, such as an avatar. */
  mark?: ReactNode
}

/** The choices of a menu, in their order. */
function menuItems(menu: HTMLElement | null): HTMLElement[] {
  if (!menu) return []
  return Array.from(
    menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
  )
}

/** Moves the focus between the choices with the arrow keys, Home, and End. */
function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  const items = menuItems(event.currentTarget)
  if (items.length === 0) return
  const index = items.findIndex((item) => item === document.activeElement)
  const last = items.length - 1
  const moves: Readonly<Record<string, number>> = {
    ArrowDown: index < last ? index + 1 : 0,
    ArrowUp: index > 0 ? index - 1 : last,
    Home: 0,
    End: last,
  }
  const next = moves[event.key]
  if (next === undefined) return
  event.preventDefault()
  items[next].focus()
}

function Item<T extends string>(props: {
  choice: MenuChoice<T>
  checked: boolean
  /** The choice takes the focus when the menu opens. */
  first: boolean
  busy: boolean
  waiting: boolean
  onSelect: (value: T) => void
}) {
  const theme = useSharedUiTheme()
  const { choice } = props
  let end: ReactNode = null
  if (props.busy) end = <Spinner color={theme.colors.muted} size={12} />
  else if (props.checked) {
    end = <Check aria-hidden className={styles.check} size={14} />
  }
  return (
    <button
      aria-busy={props.busy || undefined}
      aria-checked={props.checked}
      aria-disabled={props.waiting || undefined}
      className={styles.item}
      data-autofocus={props.first || undefined}
      onClick={() => {
        if (!props.waiting) props.onSelect(choice.value)
      }}
      onPointerMove={(event) => {
        // A pointer that rests over a choice must not scroll the list.
        if (event.currentTarget !== document.activeElement) {
          event.currentTarget.focus({ preventScroll: true })
        }
      }}
      role="menuitemradio"
      tabIndex={-1}
      type="button"
    >
      {choice.mark ? <span className={styles.mark}>{choice.mark}</span> : null}
      <span className={styles.label}>{choice.label}</span>
      {end}
    </button>
  )
}

/**
 * The content of a menu of choices: an optional label, the choices with
 * the current one checked, then an error and a note. While a change runs,
 * its choice shows a spinner and the other choices wait. The current choice
 * takes the focus when it shows, also when the choices come after the menu
 * opened.
 */
export function MenuPanel<T extends string>(props: {
  label: string
  group?: string
  choices: readonly MenuChoice<T>[]
  selected: T | null
  busy: T | null
  status?: string
  error?: string
  note?: string
  onSelect: (value: T) => void
}) {
  const current = props.choices.some(
    (choice) => choice.value === props.selected,
  )
  const focused = current
    ? props.selected
    : (props.choices.at(0)?.value ?? null)
  const list = useRef<HTMLDivElement>(null)
  const shown = props.status ? null : focused

  // The marked choice takes the focus when it shows, unless the focus is
  // already in the list. In a sheet that opens with its choices, the dialog
  // is still closed here, so this does nothing, and the modal hook focuses
  // the marked choice after showModal().
  useEffect(() => {
    const menu = list.current
    if (shown === null || !menu || menu.contains(document.activeElement)) {
      return
    }
    menu.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [shown])

  return (
    <>
      {props.group ? (
        <div aria-hidden className={styles.group}>
          {props.group}
        </div>
      ) : null}
      {props.status ? (
        <p className={styles.note} role="status">
          {props.status}
        </p>
      ) : (
        <div
          aria-label={props.label}
          className={styles.items}
          onKeyDown={onMenuKeyDown}
          ref={list}
          role="menu"
        >
          {props.choices.map((choice) => (
            <Item
              busy={props.busy === choice.value}
              checked={props.selected === choice.value}
              choice={choice}
              first={focused === choice.value}
              key={choice.value}
              onSelect={props.onSelect}
              waiting={props.busy !== null}
            />
          ))}
        </div>
      )}
      {props.error ? (
        <p className={`${styles.note} ${styles.error}`} role="alert">
          {props.error}
        </p>
      ) : null}
      {props.note ? (
        <>
          <hr className={styles.divider} />
          <p className={styles.note}>{props.note}</p>
        </>
      ) : null}
    </>
  )
}
