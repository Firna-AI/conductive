import { classes } from '../../common/classes'
import {
  agentNames,
  formatSize,
  parallelAgents,
  totalGb,
  worktreeGb,
  worktreeParts,
  worktreeSpaceCopy,
} from './worktreeSpace'
import parts from './parts.module.css'
import styles from './MultiplierGraphic.module.css'

/** The folders of one worktree, with the size of each. */
function FolderTree() {
  return (
    <div className={styles.tree}>
      <span className={styles.root}>worktree/</span>
      <ul className={styles.folders}>
        {worktreeParts.map((part) => (
          <li className={styles.folder} key={part.key}>
            <span className={classes(parts.swatch, parts[part.key])} />
            <span className={styles.path}>{`${part.folder}/`}</span>
            <span className={styles.label}>{part.label}</span>
            <span className={styles.size}>{formatSize(part.gb)}</span>
          </li>
        ))}
      </ul>
      <span className={styles.sum}>
        One worktree <strong>{formatSize(worktreeGb)}</strong>
      </span>
    </div>
  )
}

/** The copies of the worktree, one behind the other. */
function Copies() {
  const names = agentNames()
  return (
    <div className={styles.copies}>
      <div className={styles.pile}>
        {names
          .slice()
          .reverse()
          .map((name, index) => (
            <div
              className={styles.sheet}
              key={name}
              style={{
                transform: `translate(${(names.length - 1 - index) * 10}px, ${(names.length - 1 - index) * 10}px)`,
              }}
            >
              <span className={styles.path}>{name}</span>
              <span className={styles.size}>{formatSize(worktreeGb)}</span>
            </div>
          ))}
      </div>
      <span className={styles.sum}>
        On your computer <strong>{formatSize(totalGb)}</strong>
      </span>
    </div>
  )
}

/**
 * Variation F, multiplier, after concept 2 of GPT-6 Astra: the folders of
 * one worktree with their sizes, times the agents, gives a pile of copies.
 * A band under it says where Conductive keeps them instead.
 */
export function MultiplierGraphic(props: { mobile: boolean }) {
  return (
    <div className={parts.stack}>
      <div className={classes(styles.row, props.mobile && styles.mobile)}>
        <FolderTree />
        <div className={styles.times}>
          <span className={styles.sign}>{`× ${parallelAgents}`}</span>
          <span className={parts.caption}>agents</span>
        </div>
        <Copies />
      </div>
      <p className={styles.band}>
        <strong>{worktreeSpaceCopy.cloud}:</strong> each workspace keeps these
        folders on its own cloud computer, and your computer keeps 0 GB of them.
      </p>
    </div>
  )
}
