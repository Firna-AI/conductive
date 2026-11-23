import { Button } from '@firna/ui/button'
import { ListOrdered, ListPlus, ListX } from 'lucide-react'
import { outlineFill } from '../ui/components/common/outlineTone'
import { barLabels } from '../ui/components/workspace/barCopy'
import barStyles from '../ui/components/workspace/BarActions.module.css'
import { queueLabels } from '../ui/components/workspace/queueCopy'
import styles from '../ui/components/workspace/QueueBar.module.css'
import actionStyles from '../ui/components/common/actions.module.css'
import { control } from '../ui/design/metrics'
import { ActionButton } from './ActionButton'
import { GitHubLink, MutedSpinner } from './bannerParts'
import type { CommandKeyOf } from './barKeys'
import type { QueueLineView } from './queueView'

/**
 * Add to merge queue with only its icon, in the outline tone, for a narrow
 * bar beside a main action. Its name stays as a tooltip and for screen
 * readers, as a link to GitHub keeps only its mark.
 */
function QueueAddIcon(props: { busy: boolean; onPress: () => void }) {
  return (
    <span title={queueLabels.add}>
      <Button
        accessibilityLabel={queueLabels.add}
        boxSize={control.height}
        busy={props.busy}
        iconNode={<ListPlus className={actionStyles.icon} size={15} />}
        onPress={props.onPress}
        shape="square"
        size="sm"
        style={(state) => ({ backgroundColor: outlineFill(state) })}
        tone="secondary"
      />
    </span>
  )
}

/**
 * Add to merge queue: the outline button after the main action of the bar,
 * or alone, in the form of Archive after a merge (decision 317). The
 * workspace joins at the top of the stack of its repository. `beside`: a
 * main action comes first, so a bar narrower than 540 px shows only the
 * icon. A phone, `touch`, always shows the words.
 */
export function QueueAddButton(props: {
  beside: boolean
  busy: boolean
  touch: boolean
  onPress: () => void
}) {
  const button = (
    <ActionButton
      busy={props.busy}
      icon={ListPlus}
      onPress={props.onPress}
      touch={props.touch}
    >
      {queueLabels.add}
    </ActionButton>
  )
  if (!props.beside || props.touch) return button
  return (
    <span className={styles.beside}>
      <span className={styles.wide}>{button}</span>
      <span className={styles.narrow}>
        <QueueAddIcon busy={props.busy} onPress={props.onPress} />
      </span>
    </span>
  )
}

/**
 * The line of a queued workspace under the bar, and at the top of the
 * Checks tab of a phone: its place, then what its step does, what the
 * queue waits for, or the pull request below it. A spinner takes the place
 * of the icon while a step runs. A merge that GitHub refused leads to the
 * pull request on GitHub. Remove from queue ends the line for a member who
 * may change the queue, and it asks first.
 */
export function QueueLine(props: {
  line: QueueLineView
  onRemove: () => void
  touch?: boolean
  keyOf?: CommandKeyOf
}) {
  const { line } = props
  const icon = line.running ? (
    <span className={styles.spinner}>
      <MutedSpinner size={12} />
    </span>
  ) : (
    <ListOrdered aria-hidden className={barStyles.icon} size={14} />
  )
  return (
    <div className={barStyles.message} role="status">
      {icon}
      <span className={styles.lineBody}>
        <span className={styles.lineText}>{line.text}</span>
        {line.href || line.remove ? (
          <span className={styles.lineActions}>
            {line.href ? (
              <GitHubLink
                href={line.href}
                keyOf={props.keyOf}
                label={barLabels.openOnGitHub}
                touch={props.touch}
              />
            ) : null}
            {line.remove ? (
              <ActionButton
                icon={ListX}
                onPress={props.onRemove}
                touch={props.touch}
              >
                {queueLabels.remove}
              </ActionButton>
            ) : null}
          </span>
        ) : null}
      </span>
    </div>
  )
}
