import { classes } from '../../common/classes'
import { worktreeParts } from './worktreeSpace'
import styles from './parts.module.css'

/**
 * The legend of the parts of a worktree: a swatch, the name, and the folder
 * of each part. Each graphic shows it, so no part is told by colour alone.
 */
export function PartsLegend(props: { showFolders?: boolean }) {
  return (
    <ul className={styles.legend}>
      {worktreeParts.map((part) => (
        <li className={styles.legendItem} key={part.key}>
          <span className={classes(styles.swatch, styles[part.key])} />
          {part.label}
          {props.showFolders ? (
            <span className={styles.folder}>{part.folder}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
