import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import type { FieldHandle } from './chip-field/focus-plugins'
import local from './chat.module.css'

/**
 * Makes the place no tab stop again once the focus leaves it. A window that
 * loses the focus keeps its focused element, so the place stays focusable
 * until the focus moves on in the window.
 */
function leave(event: FocusEvent): void {
  const place = event.currentTarget
  if (!document.hasFocus() || !(place instanceof HTMLElement)) return
  place.removeAttribute('tabindex')
  place.removeEventListener('blur', leave)
}

/**
 * The place of the composer at the foot of a chat, which each layout of the
 * foot draws: the field of the composer, or the bar that takes its place
 * while the sandbox does not run, or both after a failed first start.
 * `focus` puts the focus in the field, else on the place, as the stack of
 * requests asks when its last card leaves with the focus. So the focus has a
 * place also while the stopped bar shows: a screen reader reads the bar, and
 * the next Tab reaches its first control, such as Resume. The place takes
 * the focus only for that call, so it is no tab stop. While the place holds
 * the focus, a field that shows, as after a start, takes the focus. Give
 * `place` to the `ComposerPlace` of the foot.
 */
export function useComposerPlace(field: RefObject<FieldHandle | null>) {
  const place = useRef<HTMLDivElement>(null)
  const focus = useCallback(() => {
    if (field.current) {
      field.current.focus()
      return
    }
    const node = place.current
    if (!node) return
    node.tabIndex = -1
    node.addEventListener('blur', leave)
    node.focus({ preventScroll: true })
  }, [field])
  useEffect(() => {
    const node = place.current
    if (node !== null && document.activeElement === node) field.current?.focus()
  })
  return { place, focus }
}

/**
 * The element of the place of the composer, as `useComposerPlace` says,
 * with the `place` of that hook as its `ref`. It lays out its parts with the
 * gap of the foot, and an empty place takes no room.
 */
export function ComposerPlace({
  ref,
  children,
}: {
  ref: Ref<HTMLDivElement>
  children: ReactNode
}) {
  return (
    <div className={local.composerPlace} ref={ref}>
      {children}
    </div>
  )
}
