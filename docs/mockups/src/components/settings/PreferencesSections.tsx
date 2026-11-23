import { SegmentedControl, type SegmentOption } from '@firna/ui/segmented'
import { defaultChoice, fastChoice } from '../../fixtures/agents'
import { noop } from '../../../../../src/ui/noop'
import { modelPicker } from '../../entries/components/chat/ModelPicker.mockup'
import { placedModelAnchor } from '../../entries/components/chat/PlacedModelMenu.mockup'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { section } from '../../entries/components/settings/Section.mockup'
import styles from '../../../../../src/ui/components/settings/AccountSections.module.css'

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
function NewWorkspaceViewChoice(props: {
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
 * The New workspaces section of Preferences: the model, the effort, and the
 * speed that new workspaces start with, and how New workspace opens. Each
 * change saves at once. A failed save shows its error and keeps the saved
 * choice. `fastMenu` opens the picker, with fast mode on. The screen then
 * draws its menu above the page with `PlacedModelMenu`, so the box of the
 * page does not cut it, because the picker sits low under Favourites.
 */
export function DefaultsSection(props: {
  view: NewWorkspaceView
  saveFailed: boolean
  fastMenu?: boolean
}) {
  const picker = (
    <modelPicker.Component
      choice={props.fastMenu ? fastChoice : defaultChoice}
      menu={false}
      moklyInstance="default-model"
      open={props.fastMenu === true}
    />
  )
  return (
    <section.Component
      description="How you start new workspaces."
      moklyInstance="new-workspaces"
      title="New workspaces"
    >
      <div className={styles.defaults}>
        <span className={styles.defaultsLabel}>Model and effort</span>
        {props.fastMenu ? (
          <placedModelAnchor.Component moklyInstance="default-model-anchor">
            {picker}
          </placedModelAnchor.Component>
        ) : (
          picker
        )}
        <span className={styles.defaultsLabel}>{viewLabel}</span>
        <div className={styles.defaultsWide}>
          <NewWorkspaceViewChoice
            error={props.saveFailed ? choiceNotSaved : undefined}
            value={props.view}
          />
        </div>
      </div>
    </section.Component>
  )
}
