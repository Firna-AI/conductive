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
 * opens in a new browser tab. A plain click asks the shell to navigate.
 * `ref` gets the element of the link, such as to give it the focus.
 */
export function FilesLink(props: {
  to: FilesTarget
  navigation: FilesNavigation
  ref?: Ref<HTMLAnchorElement>
  className?: string
  style?: CSSProperties
  title?: string
  'aria-current'?: AriaAttributes['aria-current']
  'aria-label'?: string
  children: ReactNode
}) {
  const { to, navigation, ref } = props
  return (
    <a
      aria-current={props['aria-current']}
      aria-label={props['aria-label']}
      className={classes(props.className, focusClass)}
      href={navigation.href(to)}
      onClick={(event) => {
        if (!isPlainClick(event)) return
        event.preventDefault()
        navigation.navigate(to)
      }}
      ref={ref}
      style={props.style}
      title={props.title}
    >
      {props.children}
    </a>
  )
}
