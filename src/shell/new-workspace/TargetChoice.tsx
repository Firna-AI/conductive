import { RadioCard, RadioCardGroup } from '@firna/ui/radio'
import { SegmentedControl, type SegmentOption } from '@firna/ui/segmented'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { targetCopy } from '../../../docs/mockups/src/components/new-workspace/branchCopy'
import styles from '../../../docs/mockups/src/components/new-workspace/TargetChoice.module.css'
import type { BranchTarget } from '../../app/new-workspace-branch'
import { useViewport } from '../ui/viewport'

/**
 * The choice of two targets, which New workspace shows when the picked
 * branch is not the default branch (decision 291): the picked branch, so
 * the work stacks on it, or the default branch. The line under the choice
 * says what the pull request then holds.
 *
 * A computer shows a segmented control, whose options take the width of
 * their words, up to a limit where a long name ends in an ellipsis. A phone
 * has no room for two branch names side by side, so it shows two radio
 * cards, one above the other, and a long name wraps. `inline` puts the line
 * beside the choice when it fits, as in the dialog.
 */
export function TargetChoice(props: {
  picked: string
  defaultBranch: string
  value: BranchTarget
  choose: (target: BranchTarget) => void
  inline?: boolean
}) {
  const { field } = useControlSizes()
  const phone = useViewport() === 'phone'
  const options: readonly SegmentOption<BranchTarget>[] = [
    { label: targetCopy.option(props.picked), value: 'picked' },
    { label: targetCopy.option(props.defaultBranch), value: 'default' },
  ]
  return (
    <div
      className={classes(
        styles.choice,
        phone && styles.cards,
        props.inline && styles.inline,
      )}
    >
      {phone ? (
        <RadioCardGroup accessibilityLabel={targetCopy.label}>
          {options.map((option) => (
            <RadioCard
              checked={option.value === props.value}
              key={option.value}
              onPress={() => props.choose(option.value)}
              title={option.label}
            />
          ))}
        </RadioCardGroup>
      ) : (
        <div className={styles.segments}>
          <SegmentedControl
            accessibilityLabel={targetCopy.label}
            onChange={props.choose}
            options={options}
            size={field}
            value={props.value}
          />
        </div>
      )}
      <p className={styles.line}>
        {props.value === 'picked'
          ? targetCopy.picked
          : targetCopy.defaultBranch(props.picked)}
      </p>
    </div>
  )
}
