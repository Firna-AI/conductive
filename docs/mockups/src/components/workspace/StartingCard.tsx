import { Loader } from '@firna/ui/loader'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { StartingLog } from '../../fixtures/starting'
import styles from './StartingCard.module.css'

/**
 * The start of a sandbox in the chat: a quiet card with a moving mark, then
 * each step so far, with the time since the start. A step that failed while
 * the start goes on, such as the update of the agent and terminal software,
 * ends with "failed".
 */
export function StartingCard(props: { log: StartingLog }) {
  const theme = useSharedUiTheme()
  const { log } = props
  return (
    <section aria-label={log.title} className={styles.starting}>
      <div className={styles.card}>
        <Loader
          accessibilityLabel={log.title}
          color={theme.colors.muted}
          size={14}
          variant="dot-grid"
        />
        {log.title}
      </div>
      <div className={styles.log}>
        <ol className={styles.steps}>
          {log.steps.map((step) => (
            <li key={step}>
              <span aria-hidden className={styles.caret}>
                ›
              </span>
              {step}
              {step === log.failedStep ? (
                <span className={styles.failed}>failed</span>
              ) : null}
            </li>
          ))}
        </ol>
        <span className={styles.elapsed}>{log.elapsed}</span>
      </div>
    </section>
  )
}
