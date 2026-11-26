import { ArrowRight, GitBranch } from 'lucide-react'
import { baseBranchOf, type Workspace } from '../../fixtures/workspaces'
import styles from '../../../../../src/ui/components/workspace/BarActions.module.css'

/**
 * The branch and its base at the top of the Checks tab of a phone, where
 * Create PR stands (decision 306). They take the parts of the desktop bar.
 * The names wrap, and the base keeps its arrow on a line of its own, so
 * each name shows in full: a phone has no tooltip.
 */
export function ChecksBranches(props: { workspace: Workspace }) {
  const { workspace } = props
  return (
    <div className={styles.branches}>
      <GitBranch className={styles.branchIcon} size={13} />
      <span className={styles.names}>
        <span className={styles.branch}>{workspace.branch}</span>
        <span className={styles.base}>
          <ArrowRight className={styles.branchIcon} size={12} />
          <span className={styles.baseName}>{baseBranchOf(workspace)}</span>
        </span>
      </span>
    </div>
  )
}
