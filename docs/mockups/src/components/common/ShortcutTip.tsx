import type { ReactNode } from 'react'
import { shownShortcut } from '../../fixtures/shortcutChanges'
import type { CommandId } from '../../fixtures/shortcutCommands'
import { pageHost } from '../../fixtures/shortcutHosts'
import { useMacApp } from '../mac/MacApp'
import { useTouchScreen } from './touch'
import styles from './ShortcutTip.module.css'

/**
 * The tooltip of a control whose command has a key: the label of the
 * control and the first default key of the command that works where the
 * page runs, such as "Create PR (⇧⌘P)". The page runs in the Mac app or in
 * a normal Chrome tab on a Mac. A phone shows no key hint, and a command
 * without a key that works there gives no tooltip.
 */
export function useShortcutTip(
  label: string,
  command: CommandId,
): string | undefined {
  const host = pageHost(useMacApp() !== undefined)
  const touch = useTouchScreen()
  const shortcut = shownShortcut(command, {}, host)
  if (touch || shortcut === undefined) return undefined
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
