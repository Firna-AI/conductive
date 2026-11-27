import type { ReactNode } from 'react'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { listMarkLabel } from '../workspaces/status'
import { WorkspaceMark, type MarkState } from '../workspaces/WorkspaceMark'
import {
  WorkspaceName,
  type EmphasisClasses,
} from '../workspaces/WorkspaceName'
import {
  ChipEndRemove,
  ChipIconCell,
  useNoHover,
  type ChipRemoval,
} from './ChipRemove'
import base from './InlineChip.module.css'
import styles from './WorkspaceChip.module.css'

/**
 * The look of the name of a chip: the strong weight for unread output. In
 * every other state the name keeps the weight of the chip, and no colour of
 * the state.
 */
const nameEmphasis: EmphasisClasses = { strong: styles.strong }

/** The workspace state and the link name that a chip shows. */
export type ChipWorkspace = {
  /** The label of the number of the workspace, such as `W-395`. */
  label: string
  /** The current link name, or the title of a session chip. */
  name: string
} & MarkState

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
 * A workspace in a line of text: a small rounded pill with the list mark
 * of the workspace, its label in a muted colour, and its current name. A
 * narrow line cuts the name short. `WorkspaceName` makes the name bold while
 * the workspace has output that the reader has not read, as in the list.
 * Screen readers also hear the GitHub state and the state of the workspace.
 * The chip takes the height of the line around it, so it sits in a message,
 * an answer, or a message box and keeps the height of the line.
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
  /** A session icon and its spoken name, before the link name. */
  beforeName?: ReactNode
}) {
  const { label, name, ...markState } = props.workspace
  const { github, status } = markState
  const { removal } = props
  const className = useChipClass(removal)
  const mark = <WorkspaceMark {...markState} />
  const chip: ChipOpener = {
    className,
    title: name,
    children: (
      <>
        {removal ? <ChipIconCell icon={mark} removal={removal} /> : mark}
        <span className={classes(base.text, styles.text)}>
          <span className={styles.label}>{label}</span> {props.beforeName}
          <WorkspaceName
            className={base.name}
            emphasis={nameEmphasis}
            status={status}
          >
            {name}
          </WorkspaceName>
        </span>
        <span className={a11y.hidden}>, {listMarkLabel(github, status)}</span>
        {removal ? <ChipEndRemove removal={removal} /> : null}
      </>
    ),
  }
  return props.opener ? props.opener(chip) : <span {...chip} />
}
