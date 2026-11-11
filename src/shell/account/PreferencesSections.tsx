import { SegmentedControl, type SegmentOption } from '@firna/ui/segmented'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/settings/AccountSections.module.css'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { useStore } from '../../app/store'
import type { NewWorkspaceView } from '../../shared/account'
import type { AgentChoice } from '../../shared/agents'
import { useApp, useOfferedModels } from '../context'
import { ModelPicker } from '../ui/ModelPicker'
import { useAction } from '../ui/useAction'

const viewLabel = 'Open New workspace in'

const viewOptions: readonly SegmentOption<NewWorkspaceView>[] = [
  { label: 'Page', value: 'page' },
  { label: 'Dialog', value: 'dialog' },
]

/** The error of a choice whose save failed. The choice keeps its saved value. */
const choiceNotSaved = "The choice wasn't saved. Try again."

/**
 * The choice of how New workspace opens on a computer, with the helper line
 * that a phone always opens the page. Each change saves at once. The choice
 * shows the saved value, and it is off while its save runs. A failed save
 * shows its error under the choice until the next change.
 */
function NewWorkspaceViewChoice(props: { view: NewWorkspaceView }) {
  const app = useApp()
  const { field } = useControlSizes()
  const save = useAction((view: NewWorkspaceView) =>
    app.account.setNewWorkspaceView(view),
  )
  return (
    <SegmentedControl
      accessibilityLabel={viewLabel}
      disabled={save.pending}
      error={save.error ? choiceNotSaved : undefined}
      hint="A phone always opens the page."
      onChange={save.run}
      options={viewOptions}
      size={field}
      value={props.view}
    />
  )
}

/**
 * The New workspaces section of Preferences: the model and the effort that
 * new workspaces start with, and how New workspace opens. The picker hides
 * the models that the person's own endpoint does not list, and keeps the
 * saved model. Each change saves at once. A failed save of the model shows
 * a toast, and a failed save of the choice shows its error under the
 * choice.
 */
export function DefaultsSection() {
  const app = useApp()
  const account = useStore(app.account.account)
  const models = useOfferedModels(account?.defaultChoice)
  const save = useAction(
    (choice: AgentChoice) => app.account.setDefaultChoice(choice),
    "The model wasn't saved.",
  )
  if (!account) return null
  return (
    <Section description="How you start new workspaces." title="New workspaces">
      <div className={styles.defaults}>
        <span className={styles.defaultsLabel}>Model and effort</span>
        <ModelPicker
          change={save.run}
          choice={account.defaultChoice}
          disabled={save.pending}
          models={models}
          placement="below-start"
        />
        <span className={styles.defaultsLabel}>{viewLabel}</span>
        <div className={styles.defaultsWide}>
          <NewWorkspaceViewChoice view={account.newWorkspaceView} />
        </div>
      </div>
    </Section>
  )
}
