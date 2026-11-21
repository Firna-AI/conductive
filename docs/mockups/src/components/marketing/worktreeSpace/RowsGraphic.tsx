import { classes } from '../../common/classes'
import { PanelHead } from './PanelHead'
import { PartsLegend } from './PartsLegend'
import {
  agentNames,
  formatSize,
  parallelAgents,
  sharedHistory,
  totalGb,
  worktreeGb,
  worktreeParts,
  worktreeSpaceCopy,
} from './worktreeSpace'
import parts from './parts.module.css'
import styles from './RowsGraphic.module.css'

/** The stacked bar of one worktree, as wide as its share of a worktree. */
function WorktreeBar(props: { gb: number }) {
  return (
    <span
      className={styles.bar}
      style={{ width: `${(props.gb / worktreeGb) * 100}%` }}
    >
      {worktreeParts.map((part) => (
        <span
          className={classes(styles.segment, parts[part.key])}
          key={part.key}
          style={{ flexGrow: part.gb }}
          title={`${part.label}: ${formatSize(part.gb)}`}
        />
      ))}
    </span>
  )
}

/**
 * Variation A, rows: one stacked bar for each worktree, so the total grows
 * row by row. Conductive shows the same rows, each on its own cloud
 * computer, with nothing on the computer of the visitor.
 */
export function RowsGraphic(props: { mobile: boolean }) {
  const names = agentNames()
  return (
    <div
      className={classes(parts.compare, props.mobile && parts.compareMobile)}
    >
      <div className={parts.panel}>
        <PanelHead
          caption={worktreeSpaceCopy.local}
          figure={formatSize(totalGb)}
          sub={`${parallelAgents} worktrees, one for each agent`}
        />
        <ul className={styles.rows}>
          {names.map((name) => (
            <li className={styles.row} key={name}>
              <span className={styles.name}>{name}</span>
              <span className={styles.track}>
                <WorktreeBar gb={worktreeGb} />
              </span>
              <span className={styles.size}>{formatSize(worktreeGb)}</span>
            </li>
          ))}
          <li className={classes(styles.row, styles.shared)}>
            <span className={styles.name}>{sharedHistory.folder}</span>
            <span className={styles.track}>
              <span className={styles.history} />
            </span>
            <span className={styles.size}>{formatSize(sharedHistory.gb)}</span>
          </li>
        </ul>
        <PartsLegend showFolders />
      </div>
      <div className={classes(parts.panel, parts.panelCloud)}>
        <PanelHead
          caption={worktreeSpaceCopy.cloud}
          cloud
          figure="0 GB"
          sub="of worktrees on your computer"
        />
        <ul className={styles.rows}>
          {names.map((name) => (
            <li className={styles.row} key={name}>
              <span className={styles.name}>{name}</span>
              <span className={classes(styles.track, styles.cloudTrack)}>
                Its own cloud computer
              </span>
              <span className={styles.size}>0 GB</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
