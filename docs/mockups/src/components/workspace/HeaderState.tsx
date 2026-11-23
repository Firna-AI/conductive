import { Button } from '@firna/ui/button'
import { ChevronDown, RotateCw } from 'lucide-react'
import type { ActivityStatus } from '../../../../../src/ui/components/workspaces/activityStatus'
import { noop } from '../../../../../src/ui/noop'
import { paths } from '../../paths'
import {
  Menu,
  type MenuEntry,
} from '../../../../../src/ui/components/common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { activityPresentation } from '../../../../../src/ui/components/workspaces/status'
import { statusGlyph } from '../../entries/components/workspaces/StatusGlyph.mockup'
import styles from '../../../../../src/ui/components/workspace/HeaderState.module.css'
import {
  restartableStates,
  restartCopy,
} from '../../../../../src/ui/components/workspace/restartCopy'

/**
 * The own computer of a workspace in its header: its name, which names the
 * menu of the state, and the line that says where the workspace runs.
 */
export type OwnComputerLabel = { name: string; line: string }

/**
 * The menu of the header state: Restart, and a note on what it does. On
 * an own computer, a line that names the computer comes first.
 */
export function restartMenu(
  highlighted = false,
  computer?: OwnComputerLabel,
): MenuEntry[] {
  const restart: MenuEntry[] = [
    { kind: 'item', label: restartCopy.item, icon: RotateCw, highlighted },
    { kind: 'divider' },
    { kind: 'note', text: restartCopy.note },
  ]
  if (computer === undefined) return restart
  return [
    { kind: 'note', text: computer.line },
    { kind: 'divider' },
    ...restart,
  ]
}

/** The name of the menu: the own computer, or else the cloud computer. */
export function stateMenuLabel(computer?: OwnComputerLabel): string {
  return computer?.name ?? restartCopy.menuLabel
}

/**
 * The state of the open workspace in its header. While the software of the
 * cloud computer runs, the state is a button that opens the menu with
 * Restart. `open` draws the menu below it, and a phone shows the menu as a
 * sheet instead. The other states, and a read-only workspace, show the
 * state as plain text. `computer` names the own computer of the workspace.
 */
export function HeaderState(props: {
  status: ActivityStatus
  canRestart: boolean
  open?: boolean
  phone?: boolean
  computer?: OwnComputerLabel
}) {
  const control = useControlSizes()
  const { label } = activityPresentation[props.status]
  const state = (
    <>
      <statusGlyph.Component status={props.status} />
      {label}
    </>
  )
  if (!props.canRestart || !restartableStates.has(props.status)) {
    return <span className={styles.state}>{state}</span>
  }
  const button = (
    <Button
      accessibilityLabel={`${label}. ${stateMenuLabel(props.computer)} menu`}
      content={
        <span className={styles.state} style={{ fontSize: control.labelSize }}>
          {state}
          <ChevronDown aria-hidden className={styles.chevron} size={12} />
        </span>
      }
      expanded={props.open ?? false}
      hasPopup="menu"
      onPress={noop}
      size="sm"
      style={{ height: control.height, paddingHorizontal: 6 }}
      tone="plain"
    />
  )
  return (
    <span className={styles.anchor}>
      {props.open ? (
        button
      ) : (
        <ScreenLink asChild to={paths.restart}>
          {button}
        </ScreenLink>
      )}
      {props.open && !props.phone ? (
        <Menu
          entries={restartMenu(true, props.computer)}
          label={stateMenuLabel(props.computer)}
          placement="below-end"
        />
      ) : null}
    </span>
  )
}
