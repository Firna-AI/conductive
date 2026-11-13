import { RadioCard, RadioCardGroup } from '@firna/ui/radio'
import { SegmentedControl, type SegmentOption } from '@firna/ui/segmented'
import { noop } from '../../noop'
import { classes } from '../common/classes'
import { useControlSizes, useTouch } from '../common/touch'
import { targetCopy } from './branchCopy'
import styles from './TargetChoice.module.css'

/** The target of a picked branch: that branch, or the default branch. */
export type BranchTarget = 'picked' | 'default'

/**
 * The choice of two targets, which New workspace shows when the picked
 * branch is not the default branch (decision 291). The first option targets
 * the picked branch, so the work stacks on it, and New workspace selects it
 * first (decision 295). The second targets the default branch. The line
 * under the choice says what the pull request then holds.
 *
 * A computer shows a segmented control, whose options take the width of
 * their words, up to a limit where a long name ends in an ellipsis. A phone
 * has no room for two branch names side by side, so it shows the two
 * options as radio cards, one above the other, and a long name wraps.
 * `inline` puts the line beside the choice when it fits, as in the dialog.
 * It takes no fixtures, so the app can draw the choice with it.
 */
export function TargetChoice(props: {
  picked: string
  defaultBranch: string
  value: BranchTarget
  inline?: boolean
}) {
  const { field } = useControlSizes()
  const touch = useTouch()
  const options: readonly SegmentOption<BranchTarget>[] = [
    { label: targetCopy.option(props.picked), value: 'picked' },
    { label: targetCopy.option(props.defaultBranch), value: 'default' },
  ]
  return (
    <div
      className={classes(
        styles.choice,
        touch && styles.cards,
        props.inline && styles.inline,
      )}
    >
      {touch ? (
        <RadioCardGroup accessibilityLabel={targetCopy.label}>
          {options.map((option) => (
            <RadioCard
              checked={option.value === props.value}
              key={option.value}
              onPress={noop}
              title={option.label}
            />
          ))}
        </RadioCardGroup>
      ) : (
        <div className={styles.segments}>
          <SegmentedControl
            accessibilityLabel={targetCopy.label}
            onChange={noop}
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
