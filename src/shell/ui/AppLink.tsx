import type {
  AriaAttributes,
  CSSProperties,
  FocusEvent,
  MouseEvent,
  ReactNode,
  Ref,
} from 'react'
import { useNavigation } from '../../app/navigation'

/**
 * A press of the main button without a modifier key, which the app handles
 * itself. A link leaves every other click to the browser, such as a click
 * with Cmd or Ctrl that opens a new tab.
 */
export function isPlainClick(event: MouseEvent): boolean {
  if (event.button !== 0) return false
  return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
}

/**
 * A link to a screen of the app. A plain click changes the address without
 * a page load. A click with a modifier key opens the address as the browser
 * does, such as in a new tab.
 */
export function AppLink({
  ref,
  ...props
}: {
  to: string
  className?: string
  style?: CSSProperties
  title?: string
  'aria-current'?: AriaAttributes['aria-current']
  'aria-label'?: string
  /** The key of the command that the link runs, for a screen reader. */
  'aria-keyshortcuts'?: string
  /** Replaces the current address, as a redirect does. */
  replace?: boolean
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  /** The anchor takes the focus, or loses it. */
  onFocus?: (event: FocusEvent<HTMLAnchorElement>) => void
  onBlur?: (event: FocusEvent<HTMLAnchorElement>) => void
  /** The anchor, for an owner that moves the focus to it. */
  ref?: Ref<HTMLAnchorElement>
  children: ReactNode
}) {
  const navigation = useNavigation()
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    props.onClick?.(event)
    if (event.defaultPrevented || !isPlainClick(event)) return
    event.preventDefault()
    if (props.replace) navigation.replace(props.to)
    else navigation.push(props.to)
  }
  return (
    <a
      aria-current={props['aria-current']}
      aria-keyshortcuts={props['aria-keyshortcuts']}
      aria-label={props['aria-label']}
      className={props.className}
      href={props.to}
      onBlur={props.onBlur}
      onClick={onClick}
      onFocus={props.onFocus}
      ref={ref}
      style={props.style}
      title={props.title}
    >
      {props.children}
    </a>
  )
}

/** The function that goes to another screen, for a button that navigates. */
export function useGo(): (to: string) => void {
  const navigation = useNavigation()
  return (to) => navigation.push(to)
}

/**
 * The function that a key of a command uses to open a page. It adds no
 * entry to the history while the page already shows, so the key does
 * nothing there.
 */
export function useOpenPage(): (to: string) => void {
  const navigation = useNavigation()
  return (to) => {
    if (navigation.href() !== to) navigation.push(to)
  }
}
