import { issueLabel, type Issue } from '../../fixtures/issues'
import { ScreenLink } from '../common/ScreenLink'
import runLine from '../workspace/RunLinks.module.css'
import { statusLabels } from './issueCopy'
import { IssueStatusIcon } from './IssueStatusIcon'
import styles from './IssueLine.module.css'

/**
 * The line under the header of a workspace that works on an issue, in the
 * place of the line of a run workspace: the state of the issue, its label,
 * and its title, which opens the issue. The state follows the workspaces of
 * the issue, so it changes as the pull request moves on.
 */
export function IssueLine(props: { issue: Issue; to: string; count?: number }) {
  const { issue } = props
  return (
    <p className={runLine.line}>
      <IssueStatusIcon status={issue.status} />
      <span className={runLine.words}>Issue</span>
      <ScreenLink
        aria-label={`Issue ${issueLabel(issue.number)}: ${issue.title}`}
        className={runLine.automation}
        to={props.to}
      >
        {`${issueLabel(issue.number)} ${issue.title}`}
      </ScreenLink>
      <span className={styles.state}>{statusLabels[issue.status]}</span>
      {props.count && props.count > 1 ? (
        <span className={styles.state}>{`· ${props.count} workspaces`}</span>
      ) : null}
    </p>
  )
}
