import {
  agentActions,
  defaultSteps,
  type AgentAction,
  type OrgSteps,
} from '../workspace/barCopy'
import type { ReadOnlyCause } from './OrgSections'
import { PromptSection, type PromptView } from './PromptSection'
import { promptsCopy } from './promptsCopy'
import { TabIntro } from './TabIntro'

/** The steps of an action that an admin typed, while their save runs. */
export type PromptSave = { action: AgentAction; steps: string }

/**
 * What an action shows: the steps that the org saved, else the default
 * steps, or the typed steps of a save that runs.
 */
function viewOf(
  action: AgentAction,
  saved: OrgSteps,
  saving?: PromptSave,
): PromptView {
  const steps = saved[action]
  const edited = steps !== undefined
  if (saving?.action === action) {
    return { steps: saving.steps, edited, saving: true }
  }
  return { steps: steps ?? defaultSteps[action], edited, saving: false }
}

/**
 * The Prompts tab of the org settings: the steps of each agent action of
 * the pull request bar, in the order of the bar. An action without saved
 * steps of the org shows the default steps. `readOnly` shows the tab
 * without edits, for a member who is not an admin, whom the intro tells
 * that only an admin can change the steps, and for everyone in a suspended
 * org, whose notice says why. `resetTo` is the question that Reset to
 * default of an edited action opens.
 */
export function PromptsTab(props: {
  org: string
  saved: OrgSteps
  saving?: PromptSave
  readOnly?: ReadOnlyCause
  resetTo?: string
}) {
  return (
    <>
      <TabIntro title={promptsCopy.title}>
        {promptsCopy.intro(props.org)}
        {props.readOnly === 'member' ? promptsCopy.memberNote : null}
      </TabIntro>
      {agentActions.map((action) => (
        <PromptSection
          action={action}
          key={action}
          readOnly={props.readOnly !== undefined}
          resetTo={props.resetTo}
          view={viewOf(action, props.saved, props.saving)}
        />
      ))}
    </>
  )
}
