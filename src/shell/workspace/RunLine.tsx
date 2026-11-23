import { Repeat } from 'lucide-react'
import styles from '../../ui/components/workspace/RunLinks.module.css'
import { routes } from '../../app/router'
import type { RunAutomation } from '../../chat/api/read-view'
import { AppLink } from '../ui/AppLink'

/**
 * The line under the header of a run workspace, which links to its automation
 * and, for a pull request run, to that pull request on GitHub. The header
 * bar has no room left for them, also on desktop. A long automation name gives
 * up its room first and ends with an ellipsis, so the number of the pull
 * request always shows.
 */
export function RunLine(props: { orgId: string; automation: RunAutomation }) {
  const { automation } = props
  const { pullRequest } = automation
  return (
    <p className={styles.line}>
      <Repeat aria-hidden className={styles.icon} size={13} />
      <span className={styles.words}>Run of</span>{' '}
      <AppLink
        aria-label={`Automation: ${automation.name}`}
        className={styles.automation}
        title={automation.name}
        to={routes.automation(props.orgId, automation.id)}
      >
        {automation.name}
      </AppLink>
      {pullRequest ? (
        <>
          {' '}
          <span className={styles.words}>for</span>{' '}
          <a
            aria-label={`Pull request #${pullRequest.number} on GitHub`}
            className={styles.pullRequest}
            href={pullRequest.url}
            rel="noreferrer"
            target="_blank"
          >
            {`#${pullRequest.number}`}
          </a>
        </>
      ) : null}
    </p>
  )
}
