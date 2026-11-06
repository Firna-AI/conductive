import type { KeyboardEvent, ReactNode, Ref } from 'react'
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
export function menuItems(menu: HTMLElement | null): HTMLElement[] {
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
      onPointerMove={(event) => event.currentTarget.focus()}
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
 * its choice shows a spinner and the other choices wait.
 */
export function MenuPanel<T extends string>({
  ref,
  ...props
}: {
  /** The list of choices, which takes the keyboard focus. */
  ref: Ref<HTMLDivElement>
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
          ref={ref}
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
