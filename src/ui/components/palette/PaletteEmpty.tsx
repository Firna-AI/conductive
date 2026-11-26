import styles from './CommandPalette.module.css'

/**
 * The answer to a query that matches nothing, with a hint at what the
 * search finds. The Keyboard shortcuts tab answers in the same way.
 */
export function NoResults(props: { query: string; hint: string }) {
  return (
    <div className={styles.empty} role="status">
      <p className={styles.emptyTitle}>Nothing matches “{props.query}”</p>
      <p className={styles.emptyBody}>{props.hint}</p>
    </div>
  )
}

/** The line of a tab that has no row to show while the field is empty. */
export function EmptyTab(props: { line: string }) {
  return (
    <div className={styles.empty} role="status">
      <p className={styles.emptyBody}>{props.line}</p>
    </div>
  )
}
