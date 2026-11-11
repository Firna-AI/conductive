import type { ReactNode } from 'react'
import type { WorkspaceStatus } from '../../fixtures/workspaces'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { activityPresentation } from '../workspaces/status'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import {
  ChipEndRemove,
  ChipIconCell,
  useNoHover,
  type ChipRemoval,
} from './ChipRemove'
import base from './InlineChip.module.css'
import styles from './WorkspaceChip.module.css'

/** What a chip shows of its workspace, as the list of the org has it now. */
export type ChipWorkspace = {
  /** The label of the number of the workspace, such as `W-395`. */
  label: string
  /** The current name. */
  name: string
  /**
   * The current state, which the state mark draws: an activity, or inactive
   * before the activation of a workspace from Conductor.
   */
  status: WorkspaceStatus
}

/** What the element that opens the page of a chip gets from it. */
export type ChipOpener = {
  className: string
  /** The whole name, which a narrow line can cut short. */
  title: string
  /** The text that a copy of a file chip gives: its mention. */
  'data-mention'?: string
  children: ReactNode
}

/**
 * The class of a chip: a chip of the composer starts with the cell of its
 * icon, and where no pointer hovers it ends with a ×.
 */
export function useChipClass(removal: ChipRemoval | undefined): string {
  const noHover = useNoHover()
  return classes(
    base.chip,
    removal && base.removable,
    removal && noHover && base.withEnd,
  )
}

/**
 * A workspace in a line of text: a small rounded pill with the state mark
 * of the workspace, its label in a muted colour, and its current name. A
 * narrow line cuts the name short. Screen readers also hear the state. The
 * chip takes the height of the line around it, so it sits in a message, an
 * answer, or a message box and keeps the height of the line.
 *
 * In a sent message or an answer, `opener` makes the chip the element that
 * opens its workspace, such as a link. A chip in a message box has none: it
 * is one unit of the text, and a press there places the caret. `removal`
 * gives a chip of a message box the cell of its mark, which a pointer turns
 * into a × that removes the chip.
 */
export function WorkspaceChip(props: {
  workspace: ChipWorkspace
  opener?: (chip: ChipOpener) => ReactNode
  removal?: ChipRemoval
}) {
  const { label, name, status } = props.workspace
  const { removal } = props
  const className = useChipClass(removal)
  const mark = <StatusGlyph status={status} />
  const chip: ChipOpener = {
    className,
    title: name,
    children: (
      <>
        {removal ? <ChipIconCell icon={mark} removal={removal} /> : mark}
        <span className={base.text}>
          <span className={styles.label}>{label}</span>{' '}
          <span className={base.name}>{name}</span>
        </span>
        <span className={a11y.hidden}>
          , {activityPresentation[status].label}
        </span>
        {removal ? <ChipEndRemove removal={removal} /> : null}
      </>
    ),
  }
  return props.opener ? props.opener(chip) : <span {...chip} />
}
