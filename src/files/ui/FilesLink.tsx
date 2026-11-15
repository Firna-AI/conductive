import type {
  AriaAttributes,
  CSSProperties,
  MouseEvent,
  ReactNode,
  Ref,
} from 'react'
import type { FilesNavigation, FilesTarget } from '../navigation'
import { classes } from './classes'
import { focusClass } from './layout'

/** A plain left click, which the shell handles without a page load. */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/**
 * A link to a list, a file, or a diff. It has a real address, so it also
 * opens in a new browser tab. A plain click asks the shell to navigate. A
 * double-click navigates once: its second click opens nothing again, so
 * the history of the browser tab gets no second entry, and it selects no
 * text. `onDoubleClick` runs at a plain double-click, such as to keep the
 * tab that the link opens. `ref` gets the element of the link, such as to
 * give it the focus.
 */
export function FilesLink(props: {
  to: FilesTarget
  navigation: FilesNavigation
  onDoubleClick?: () => void
  ref?: Ref<HTMLAnchorElement>
  className?: string
  style?: CSSProperties
  title?: string
  'aria-current'?: AriaAttributes['aria-current']
  'aria-label'?: string
  /** The key of the command that the link runs, for a screen reader. */
  'aria-keyshortcuts'?: string
  children: ReactNode
}) {
  const { to, navigation, ref, onDoubleClick } = props
  return (
    <a
      aria-current={props['aria-current']}
      aria-keyshortcuts={props['aria-keyshortcuts']}
      aria-label={props['aria-label']}
      className={classes(props.className, focusClass)}
      href={navigation.href(to)}
      onClick={(event) => {
        if (!isPlainClick(event)) return
        event.preventDefault()
        // A press of Enter counts 0 clicks and a first click 1, so only the
        // second click of a double-click, or a later one, stops here.
        if (event.detail > 1) return
        navigation.navigate(to)
      }}
      onDoubleClick={(event) => {
        if (onDoubleClick && isPlainClick(event)) onDoubleClick()
      }}
      onMouseDown={(event) => {
        // The second press of a double-click would select a word.
        if (event.detail > 1) event.preventDefault()
      }}
      ref={ref}
      style={props.style}
      title={props.title}
    >
      {props.children}
    </a>
  )
}
