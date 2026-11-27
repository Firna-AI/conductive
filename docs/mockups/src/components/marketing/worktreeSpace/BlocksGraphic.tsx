import { classes } from '../../common/classes'
import { PanelHead } from './PanelHead'
import { PartsLegend } from './PartsLegend'
import {
  agentNames,
  formatSize,
  parallelAgents,
  totalGb,
  worktreeParts,
  worktreeSpaceCopy,
} from './worktreeSpace'
import parts from './parts.module.css'
import styles from './BlocksGraphic.module.css'

/** The size of one square, in GB. */
const squareGb = 0.25

/** The squares of one worktree, in the order of its parts. */
const squares = worktreeParts.flatMap((part) =>
  Array.from({ length: Math.round(part.gb / squareGb) }, () => part.key),
)

/** The squares of one worktree, filled or drawn as outlines. */
function Cluster(props: { name: string; cloud?: boolean }) {
  return (
    <div className={classes(styles.cluster, props.cloud && styles.cloud)}>
      <span className={styles.name}>{props.name}</span>
      <span className={styles.grid}>
        {squares.map((key, index) => (
          <span
            className={classes(styles.square, !props.cloud && parts[key])}
            key={index}
          />
        ))}
      </span>
      {props.cloud ? (
        <span className={styles.where}>Cloud computer</span>
      ) : null}
    </div>
  )
}

/**
 * Variation C, blocks: each square is a quarter of a GB, so a visitor can
 * count the copies. On the computer of the visitor, every agent adds a full
 * block of squares. With Conductive, each block sits on its own cloud
 * computer.
 */
export function BlocksGraphic(props: { mobile: boolean }) {
  const names = agentNames()
  return (
    <div className={parts.stack}>
      <div
        className={classes(parts.compare, props.mobile && parts.compareMobile)}
      >
        <div className={parts.panel}>
          <PanelHead
            caption={worktreeSpaceCopy.local}
            figure={formatSize(totalGb)}
            sub={`${parallelAgents} agents, ${parallelAgents} copies`}
          />
          <div className={styles.clusters}>
            {names.map((name) => (
              <Cluster key={name} name={name} />
            ))}
          </div>
        </div>
        <div className={classes(parts.panel, parts.panelCloud)}>
          <PanelHead
            caption={worktreeSpaceCopy.cloud}
            cloud
            figure="0 GB"
            sub="of worktrees on your computer"
          />
          <div className={styles.clusters}>
            {names.map((name) => (
              <Cluster cloud key={name} name={name} />
            ))}
          </div>
        </div>
      </div>
      <div className={styles.key}>
        <PartsLegend />
        <span className={styles.unit}>
          <span className={classes(styles.square, parts.build)} />
          {`= ${formatSize(squareGb)}`}
        </span>
      </div>
    </div>
  )
}
