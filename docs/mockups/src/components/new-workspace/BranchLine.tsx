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
import type { BranchLinks } from './branchScreens'
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
 * The link opens the picker with the current choice still checked, where
 * `links`, the branch links of the form, names that screen. Otherwise it
 * stays static. The open picker hangs below the link on a computer. A
 * phone draws it in a sheet, which the screen draws.
 */
export function BranchLine(props: {
  choice: BranchChoice
  picker: PickerState
  phone: boolean
  links: BranchLinks
}) {
  const open = props.picker !== 'closed'
  const to = props.links.picker
  const label = props.choice === 'new' ? 'Use an existing branch' : 'Change'
  return (
    <div className={styles.line}>
      <Choice choice={props.choice} />
      <span aria-hidden className={styles.dot}>
        ·
      </span>
      <span className={styles.anchor}>
        {open || to === null ? (
          <span className={styles.link}>{label}</span>
        ) : (
          <ScreenLink className={styles.link} to={to}>
            {label}
          </ScreenLink>
        )}
        {open && !props.phone ? (
          <BranchPicker
            choice={props.choice}
            links={props.links}
            placement="below-start"
            state={props.picker}
          />
        ) : null}
      </span>
    </div>
  )
}
