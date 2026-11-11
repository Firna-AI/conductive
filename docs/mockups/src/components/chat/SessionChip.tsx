import type { ReactNode } from 'react'
import { MessageSquare } from 'lucide-react'
import a11y from '../common/a11y.module.css'
import { activityPresentation } from '../workspaces/status'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import { ChipEndRemove, ChipIconCell, type ChipRemoval } from './ChipRemove'
import base from './InlineChip.module.css'
import {
  useChipClass,
  type ChipOpener,
  type ChipWorkspace,
} from './WorkspaceChip'
import workspaceStyles from './WorkspaceChip.module.css'
import styles from './SessionChip.module.css'

/** What a session chip shows: its workspace now, and the session title. */
export type ChipSession = {
  /** The label and the current state of the workspace of the session. */
  workspace: Pick<ChipWorkspace, 'label' | 'status'>
  /**
   * The title of the session, or Untitled for a session without one, as
   * `nameLabel` in `src/shared/` gives it.
   */
  title: string
}

/**
 * A session in a line of text: the pill of a workspace chip, with the state
 * mark and the label of the workspace of the session, then the icon of a
 * session tab and the title of the session. The icon tells it from the chip
 * of a workspace, whose name takes the same place. A narrow line cuts the
 * title short, and the chip gives the whole title as its title. Screen
 * readers hear "Session" before the title, and the state of the workspace
 * after it. It takes no fixtures, so the app can use it too.
 *
 * `opener` and `removal` work as for a workspace chip. In a sent message or
 * an answer, `opener` makes the chip the element that opens its session. In
 * a message box the chip is one unit of the text, and `removal` gives it the
 * cell of its mark, which a pointer turns into a × that removes the chip.
 */
export function SessionChip(props: {
  session: ChipSession
  opener?: (chip: ChipOpener) => ReactNode
  removal?: ChipRemoval
}) {
  const { workspace, title } = props.session
  const { removal } = props
  const mark = <StatusGlyph status={workspace.status} />
  const chip: ChipOpener = {
    className: useChipClass(removal),
    title,
    children: (
      <>
        {removal ? <ChipIconCell icon={mark} removal={removal} /> : mark}
        <span className={base.text}>
          <span className={workspaceStyles.label}>{workspace.label}</span>{' '}
          <MessageSquare aria-hidden className={styles.icon} size={11} />
          <span className={a11y.hidden}>Session </span>
          <span className={base.name}>{title}</span>
        </span>
        <span className={a11y.hidden}>
          , {activityPresentation[workspace.status].label}
        </span>
        {removal ? <ChipEndRemove removal={removal} /> : null}
      </>
    ),
  }
  return props.opener ? props.opener(chip) : <span {...chip} />
}
