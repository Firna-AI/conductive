import type { ReactNode } from 'react'
import { shownShortcut } from '../../fixtures/shortcutChanges'
import type { CommandId } from '../../fixtures/shortcutCommands'
import { pageHost } from '../../fixtures/shortcutHosts'
import { useMacApp } from '../mac/MacApp'
import type { Shortcut } from './KeyChips'
import { useTouchScreen } from './touch'
import styles from './ShortcutTip.module.css'

/**
 * The key hint of a command: its first default key that works where the
 * page runs, such as ⇧⌘P. The page runs in the Mac app or in a normal
 * Chrome tab on a Mac. A phone shows no key hint, and a command without a
 * key that works there has none.
 */
export function useShortcutHint(command: CommandId): Shortcut | undefined {
  const host = pageHost(useMacApp() !== undefined)
  const touch = useTouchScreen()
  return touch ? undefined : shownShortcut(command, {}, host)
}

/**
 * The tooltip of a control whose command has a key hint: the label of the
 * control and the key, such as "Create PR (⇧⌘P)". A control without a key
 * hint gives no tooltip.
 */
export function useShortcutTip(
  label: string,
  command: CommandId,
): string | undefined {
  const shortcut = useShortcutHint(command)
  if (shortcut === undefined) return undefined
  return `${label} (${shortcut})`
}

/**
 * The tooltip of a Firna control, which takes no title of its own. The
 * wrapper draws no box, so the control keeps its place in the layout. A
 * control that cannot take a click now, such as a busy button, passes
 * `off`, because its key does nothing then.
 */
export function ShortcutTip(props: {
  label: string
  command: CommandId
  off?: boolean
  children: ReactNode
}) {
  const tip = useShortcutTip(props.label, props.command)
  if (props.off || tip === undefined) return props.children
  return (
    <span className={styles.tip} title={tip}>
      {props.children}
    </span>
  )
}
