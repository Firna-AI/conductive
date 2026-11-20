import { issueLabel, type Issue } from '../../fixtures/issues'
import { IssueStatusIcon } from './IssueStatusIcon'
import styles from './StartNote.module.css'

/**
 * The line above the footer of New workspace when it starts from an
 * issue: the workspace links to the issue, and the issue moves on.
 */
export function StartNote(props: { issue: Issue; text?: string }) {
  const { issue } = props
  return (
    <p className={styles.note}>
      <IssueStatusIcon status="in-progress" />
      <span>
        <strong>{`${issueLabel(issue.number)} ${issue.title}`}</strong>
        {` ${props.text ?? 'moves to In progress, and the workspace links to it.'}`}
      </span>
    </p>
  )
}
