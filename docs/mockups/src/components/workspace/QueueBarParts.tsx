import { Button } from '@firna/ui/button'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { ListOrdered, ListPlus } from 'lucide-react'
import type { GitHubSummary } from '../../../../../src/shared/generated/GitHubSummary'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { githubLink } from '../../entries/components/workspace/barParts.mockup'
import { pullRequest } from '../../fixtures/pullRequests'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { noop } from '../../../../../src/ui/noop'
import { queuePaths } from '../../queuePaths'
import { outlineFill } from '../../../../../src/ui/components/common/outlineTone'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { barLabels } from '../../../../../src/ui/components/workspace/barCopy'
import {
  queueLabels,
  queueLineText,
} from '../../../../../src/ui/components/workspace/queueCopy'
import type {
  QueueLine,
  QueueStep,
} from '../../../../../src/ui/components/workspace/queueModel'
import actionStyles from '../../../../../src/ui/components/common/actions.module.css'
import barStyles from '../../../../../src/ui/components/workspace/BarActions.module.css'
import styles from '../../../../../src/ui/components/workspace/QueueBar.module.css'

/**
 * Add to merge queue with only its icon, in the outline tone, for a narrow
 * bar beside a main action. Its name stays as a tooltip and for screen
 * readers.
 */
function QueueAddIcon() {
  const control = useControlSizes()
  return (
    <span title={queueLabels.add}>
      <ScreenLink asChild to={queuePaths.bar}>
        <Button
          accessibilityLabel={queueLabels.add}
          boxSize={control.height}
          iconNode={<ListPlus className={actionStyles.icon} size={15} />}
          onPress={noop}
          shape="square"
          size="sm"
          style={(state) => ({ backgroundColor: outlineFill(state) })}
          tone="secondary"
        />
      </ScreenLink>
    </span>
  )
}

/**
 * Add to merge queue: the outline button after the main action of the bar,
 * or alone, in the form of Archive after a merge (decision 317). The
 * workspace joins at the top of the stack of its repository. `beside`: a
 * main action comes first, so a narrow bar shows only the icon.
 */
export function QueueAddButton(props: { beside: boolean }) {
  const button = (
    <ScreenLink asChild to={queuePaths.bar}>
      <actionButton.Component
        icon="list-plus"
        moklyInstance="add-to-merge-queue"
        tone="outline"
      >
        {queueLabels.add}
      </actionButton.Component>
    </ScreenLink>
  )
  if (!props.beside) return button
  return (
    <span className={styles.beside}>
      <span className={styles.wide}>{button}</span>
      <span className={styles.narrow}>
        <QueueAddIcon />
      </span>
    </span>
  )
}

/**
 * The steps that run now, so a spinner takes the place of the icon. The
 * move onto the layer below runs until the one turn of the queue for its
 * conflict ends (decision 321 A).
 */
const runningSteps: ReadonlySet<QueueStep> = new Set(['rebasing', 'merging'])

/**
 * The line of a queued workspace under the bar, and at the top of the
 * Checks tab of a phone: its place, then what its step does, what the
 * queue waits for, or the pull request below it. An entry that cannot
 * merge keeps this line, and the bar keeps its fix, such as Fix checks. A
 * merge that GitHub refused leads to the pull request on GitHub. Remove
 * from queue ends the line for a member who may change the queue. It asks
 * first, and a lower entry of a member stack names the entries above it,
 * which leave with it. `github` is the GitHub state of the pull request,
 * which says what the queue waits for.
 */
export function QueueLineView(props: {
  line: QueueLine
  workspace: Workspace
  github: GitHubSummary | null
}) {
  const { line, workspace } = props
  const theme = useSharedUiTheme()
  const trunk = repositories[workspace.repository].defaultBranch
  const refused = line.problem === 'merge-refused'
  const stacked = line.stackedAbove !== undefined
  const icon = runningSteps.has(line.step) ? (
    <span className={styles.spinner}>
      <Spinner color={theme.colors.muted} size={12} />
    </span>
  ) : (
    <ListOrdered aria-hidden className={barStyles.icon} size={14} />
  )
  return (
    <div className={barStyles.message} role="status">
      {icon}
      <span className={styles.lineBody}>
        <span className={styles.lineText}>
          {queueLineText(line, {
            trunk: { text: trunk },
            github: props.github,
          })}
        </span>
        {refused || line.remove ? (
          <span className={styles.lineActions}>
            {refused ? (
              <githubLink.Component
                href={pullRequest.url}
                label={barLabels.openOnGitHub}
              />
            ) : null}
            {line.remove ? (
              <ScreenLink
                asChild
                to={stacked ? queuePaths.removeStack : queuePaths.remove}
              >
                <actionButton.Component
                  icon="list-x"
                  moklyInstance="remove-from-queue"
                  tone="outline"
                >
                  {queueLabels.remove}
                </actionButton.Component>
              </ScreenLink>
            ) : null}
          </span>
        ) : null}
      </span>
    </div>
  )
}
