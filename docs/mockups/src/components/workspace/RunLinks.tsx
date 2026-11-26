import { Repeat } from 'lucide-react'
import { ScreenLink, useOutsideHref } from '../common/ScreenLink'
import styles from '../../../../../src/ui/components/workspace/RunLinks.module.css'

/** The automation of a run workspace, and the pull request of its run. */
export type RunSource = {
  automation: string
  /** The page of the automation in the mockups. */
  automationTo: string
  pullRequest?: { number: number; url: string }
}

/**
 * The line under the header of a run workspace, which links to its automation
 * and to the pull request that started the run (decision 505 A, with the
 * links of D). The header bar has no room left for them, also on desktop.
 * A long automation name gives up its room first, and the number of the pull
 * request always shows.
 */
export function RunLinks(props: { run: RunSource }) {
  const { run } = props
  const pullRequestHref = useOutsideHref(run.pullRequest?.url ?? '')
  return (
    <p className={styles.line}>
      <Repeat aria-hidden className={styles.icon} size={13} />
      <span className={styles.words}>Run of</span>
      <ScreenLink
        aria-label={`Automation: ${run.automation}`}
        className={styles.automation}
        to={run.automationTo}
      >
        {run.automation}
      </ScreenLink>
      {run.pullRequest ? (
        <>
          <span className={styles.words}>for</span>
          <a
            aria-label={`Pull request #${run.pullRequest.number} on GitHub`}
            className={styles.pullRequest}
            href={pullRequestHref}
            rel="noreferrer"
            target="_blank"
          >
            {`#${run.pullRequest.number}`}
          </a>
        </>
      ) : null}
    </p>
  )
}
