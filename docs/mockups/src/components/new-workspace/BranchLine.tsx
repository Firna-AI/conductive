import { GitBranch, GitPullRequest } from 'lucide-react'
import { chosenBranch, chosenPullRequest } from '../../fixtures/branches'
import { repositories } from '../../fixtures/repositories'
import { ScreenLink } from '../common/ScreenLink'
import {
  BranchPicker,
  pullRequestText,
  type BranchChoice,
  type PickerState,
} from './BranchPicker'
import { pickerScreens } from './branchScreens'
import styles from './BranchLine.module.css'

/** What the line says of the branch of each choice. */
function Choice(props: { choice: BranchChoice }) {
  switch (props.choice) {
    case 'new':
      return (
        <span>New branch from {repositories.storefront.defaultBranch}</span>
      )
    case 'existing':
      return (
        <span className={styles.chosen}>
          <GitBranch aria-hidden className={styles.icon} size={13} />
          Continues <code className={styles.branch}>{chosenBranch.name}</code>
        </span>
      )
    case 'pull-request':
      return (
        <span className={styles.chosen}>
          <GitPullRequest aria-hidden className={styles.icon} size={13} />
          Continues {pullRequestText(chosenPullRequest)}
        </span>
      )
  }
}

/**
 * The line under the repository picker of the New workspace page: the
 * branch of the new workspace, and a quiet link that changes it. New
 * branch stays the default, so the link to an existing branch stays quiet.
 * The link opens the picker with the current choice still checked. The
 * open picker hangs below the link on a computer. A phone draws it in a
 * sheet, which the screen draws.
 */
export function BranchLine(props: {
  choice: BranchChoice
  picker: PickerState
  phone: boolean
}) {
  const open = props.picker !== 'closed'
  const label = props.choice === 'new' ? 'Use an existing branch' : 'Change'
  return (
    <div className={styles.line}>
      <Choice choice={props.choice} />
      <span aria-hidden className={styles.dot}>
        ·
      </span>
      <span className={styles.anchor}>
        {open ? (
          <span className={styles.link}>{label}</span>
        ) : (
          <ScreenLink
            className={styles.link}
            to={pickerScreens.page[props.choice]}
          >
            {label}
          </ScreenLink>
        )}
        {open && !props.phone ? (
          <BranchPicker
            choice={props.choice}
            placement="below-start"
            state={props.picker}
          />
        ) : null}
      </span>
    </div>
  )
}
