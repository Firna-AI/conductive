import { SegmentedControl, type SegmentOption } from '@firna/ui/segmented'
import { defaultChoice } from '../../fixtures/agents'
import { noop } from '../../noop'
import { ModelPicker } from '../chat/ModelPicker'
import { useControlSizes } from '../common/touch'
import { Section } from './Section'
import styles from './AccountSections.module.css'

/**
 * How New workspace opens on a computer: as the page, or as a dialog over
 * the current screen.
 */
export type NewWorkspaceView = 'page' | 'dialog'

const viewLabel = 'Open New workspace in'

const viewOptions: readonly SegmentOption<NewWorkspaceView>[] = [
  { label: 'Page', value: 'page' },
  { label: 'Dialog', value: 'dialog' },
]

/** The error of a choice whose save failed. The choice keeps its saved value. */
const choiceNotSaved = "The choice wasn't saved. Try again."

/**
 * The choice of how New workspace opens on a computer, with the helper line
 * that a phone always opens the page. `error` shows under the choice when
 * its save failed.
 */
export function NewWorkspaceViewChoice(props: {
  value: NewWorkspaceView
  error?: string
}) {
  const { field } = useControlSizes()
  return (
    <SegmentedControl
      accessibilityLabel={viewLabel}
      error={props.error}
      hint="A phone always opens the page."
      onChange={noop}
      options={viewOptions}
      size={field}
      value={props.value}
    />
  )
}

/**
 * The New workspaces section of Preferences: the model and the effort that
 * new workspaces start with, and how New workspace opens. Each change saves
 * at once. A failed save shows its error and keeps the saved choice.
 */
export function DefaultsSection(props: {
  view: NewWorkspaceView
  saveFailed: boolean
}) {
  return (
    <Section description="How you start new workspaces." title="New workspaces">
      <div className={styles.defaults}>
        <span className={styles.defaultsLabel}>Model and effort</span>
        <ModelPicker choice={defaultChoice} />
        <span className={styles.defaultsLabel}>{viewLabel}</span>
        <div className={styles.defaultsWide}>
          <NewWorkspaceViewChoice
            error={props.saveFailed ? choiceNotSaved : undefined}
            value={props.view}
          />
        </div>
      </div>
    </Section>
  )
}
