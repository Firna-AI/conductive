import { useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronDown,
  GitBranch,
  GitBranchPlus,
  GitPullRequest,
} from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import line from '../../../docs/mockups/src/components/new-workspace/BranchLine.module.css'
import dialog from '../../../docs/mockups/src/components/new-workspace/NewWorkspaceDialog.module.css'
import { pullRequestText } from '../../app/branch-options'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import type { Repository } from '../../shared/org-settings'
import type { WorkspaceBranchOption } from '../../shared/workspace-branches'
import { ActionButton } from '../ui/actions'
import local from './branch-picker.module.css'
import { useBranchPicker } from './useBranchPicker'

/** The form, its draft, and the repository whose branches the picker lists. */
interface BranchChoiceProps {
  orgId: string
  model: NewWorkspaceModel
  repository: Repository
}

/**
 * What the line of the page says of the branch: a new branch from the
 * default branch, or the branch or the pull request that it continues.
 * After an existing choice, no text says that a new branch starts.
 */
function ChosenText(props: {
  chosen: WorkspaceBranchOption | null
  defaultBranch: string
}) {
  const { chosen } = props
  if (chosen === null) {
    return <span>New branch from {props.defaultBranch}</span>
  }
  if (chosen.type === 'branch') {
    return (
      <span className={line.chosen}>
        <GitBranch aria-hidden className={line.icon} size={13} />
        Continues <code className={line.branch}>{chosen.name}</code>
      </span>
    )
  }
  return (
    <span className={line.chosen}>
      <GitPullRequest aria-hidden className={line.icon} size={13} />
      Continues {pullRequestText(chosen)}
    </span>
  )
}

/**
 * The line under the repository picker of the New workspace page: the
 * branch of the new workspace, and a quiet link that changes it. New branch
 * stays the default, so the link stays quiet: Use an existing branch, or
 * Change once a branch is chosen. The picker hangs below the link on a
 * computer, and a phone shows it in a sheet.
 */
export function BranchLine(props: BranchChoiceProps) {
  const anchor = useRef<HTMLSpanElement>(null)
  const picker = useBranchPicker(
    props.orgId,
    props.model,
    props.repository,
    anchor,
  )
  const chosen = picker.chosen !== null
  return (
    <div className={line.line}>
      <ChosenText
        chosen={picker.chosen}
        defaultBranch={props.repository.defaultBranch}
      />
      <span aria-hidden className={line.dot}>
        ·
      </span>
      <span className={line.anchor} ref={anchor}>
        <button
          aria-expanded={picker.open}
          aria-haspopup="menu"
          aria-label={chosen ? 'Change the branch' : undefined}
          className={classes(line.link, local.link)}
          onClick={picker.toggle}
          type="button"
        >
          {chosen ? 'Change' : 'Use an existing branch'}
        </button>
        {picker.layer}
      </span>
    </div>
  )
}

/** What the control of the dialog says and shows for each choice. */
function controlOf(chosen: WorkspaceBranchOption | null): {
  label: string
  icon: LucideIcon
} {
  if (chosen === null) return { label: 'New branch', icon: GitBranchPlus }
  if (chosen.type === 'branch') return { label: chosen.name, icon: GitBranch }
  return { label: pullRequestText(chosen), icon: GitPullRequest }
}

/**
 * The branch of the new workspace in the dialog, as a quiet picker beside
 * the repository: New branch by default, or the branch or the pull request
 * that it continues. The picker hangs below it.
 */
export function BranchControl(props: BranchChoiceProps) {
  const anchor = useRef<HTMLSpanElement>(null)
  const picker = useBranchPicker(
    props.orgId,
    props.model,
    props.repository,
    anchor,
  )
  const { label, icon } = controlOf(picker.chosen)
  return (
    <span className={dialog.anchor} ref={anchor}>
      <ActionButton
        accessibilityLabel={`Branch: ${label}`}
        expanded={picker.open}
        icon={icon}
        menu
        onPress={picker.toggle}
        tone="plain"
        trailing={
          <ChevronDown aria-hidden className={dialog.chevron} size={13} />
        }
      >
        {label}
      </ActionButton>
      {picker.layer}
    </span>
  )
}
