import { classes } from '../../common/classes'
import styles from './parts.module.css'

/** The top of a panel: a label in capitals, a large figure, and a line. */
export function PanelHead(props: {
  caption: string
  figure: string
  sub: string
  cloud?: boolean
}) {
  return (
    <div className={styles.panelHead}>
      <span className={styles.caption}>{props.caption}</span>
      <span
        className={classes(styles.figure, props.cloud && styles.figureCloud)}
      >
        {props.figure}
      </span>
      <span className={styles.sub}>{props.sub}</span>
    </div>
  )
}
