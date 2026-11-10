import type { ReactElement } from 'react'
import { ScreenLink } from './ScreenLink'

/**
 * One control, such as a button, that opens the screen at `to`. Null keeps
 * the control static, where the mockups draw no matching screen, so the
 * control shows with no wrong destination.
 */
export function LinkedControl(props: {
  to: string | null
  children: ReactElement
}) {
  if (props.to === null) return props.children
  return (
    <ScreenLink asChild to={props.to}>
      {props.children}
    </ScreenLink>
  )
}
