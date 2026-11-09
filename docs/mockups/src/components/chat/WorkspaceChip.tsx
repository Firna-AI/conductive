import type { ComponentProps, ReactNode } from 'react'
import a11y from '../common/a11y.module.css'
import { activityPresentation } from '../workspaces/status'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import styles from './WorkspaceChip.module.css'

/** What a chip shows of its workspace, as the list of the org has it now. */
export type ChipWorkspace = {
  /** The label of the number of the workspace, such as `W-395`. */
  label: string
  /** The current name. */
  name: string
  /** The current state, which the state mark draws. */
  status: ComponentProps<typeof StatusGlyph>['status']
}

/** What the element that opens the workspace of a chip gets from it. */
export type ChipOpener = {
  className: string
  /** The whole name, which a narrow line can cut short. */
  title: string
  children: ReactNode
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
 * is one unit of the text, and a press there places the caret.
 */
export function WorkspaceChip(props: {
  workspace: ChipWorkspace
  opener?: (chip: ChipOpener) => ReactNode
}) {
  const { label, name, status } = props.workspace
  const chip: ChipOpener = {
    className: styles.chip,
    title: name,
    children: (
      <>
        <StatusGlyph status={status} />
        <span className={styles.text}>
          <span className={styles.label}>{label}</span>{' '}
          <span className={styles.name}>{name}</span>
        </span>
        <span className={a11y.hidden}>
          , {activityPresentation[status].label}
        </span>
      </>
    ),
  }
  return props.opener ? props.opener(chip) : <span {...chip} />
}
