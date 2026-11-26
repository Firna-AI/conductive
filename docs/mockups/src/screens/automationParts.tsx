import type { Viewport } from '@mokly/mokly'
import { menu } from '../entries/components/common/Menu.mockup'
import { sheet } from '../entries/components/common/Sheet.mockup'
import { actionButton } from '../entries/components/common/actions.mockup'
import { AuthorFilter } from '../components/automations/AuthorFilter'
import { PromptBox } from '../components/automations/PromptBox'
import {
  AutomationFacts,
  AutomationFields,
} from '../components/automations/AutomationFields'
import {
  addTriggerEntries,
  TriggerList,
} from '../components/automations/TriggerList'
import {
  eventLabels,
  hasPullRequestTrigger,
  hasSchedule,
} from '../../../../src/ui/components/automations/triggerCopy'
import type { CapabilitiesControl } from '../components/capabilities/CapabilitiesButton'
import { agents } from '../fixtures/agents'
import { unlistedLabels } from '../fixtures/endpointModels'
import { people, type PersonKey } from '../fixtures/members'
import { orgWithLogin } from '../fixtures/orgLogins'
import type { TriggerEdit } from '../fixtures/automationTriggers'
import type { Automation } from '../fixtures/automations'
import { paths } from '../paths'
import { AutomationNote } from './automationNote'
import type { AutomationAccess, AutomationState } from './automationState'
import styles from '../../../../src/ui/screens/AutomationScreen.module.css'

/**
 * The screens of the run workspaces that the mockups draw, by run: a run
 * that works, the run of Run now, and the two failed runs whose first
 * start or first turn failed, which kept their workspaces.
 */
export const runLinks: Readonly<Record<string, string>> = {
  'opened-482': paths.runWorkspace,
  'run-now': paths.runNowWorkspace,
  'opened-486': paths.runStartFailed,
  'pushed-486': paths.runTurnFailed,
}

/** The name in the header: "New automation" until the automation is saved. */
export function titleOf(automation: Automation): string {
  if (!automation.saved) return 'New automation'
  return automation.name === '' ? 'Untitled automation' : automation.name
}

/**
 * Whose logins the runs use, as the person signed in reads them, such as
 * "your", "Cal's", or "Acme's": the agent login, and the GitHub access of
 * the owner. A run takes the default login of its owner (decision 5 A of
 * the org logins plan): the own login, or the org login. A suspended org
 * starts no run, so the line names none.
 */
function runLogins(props: {
  automation: Automation
  viewer: PersonKey
  login: AutomationState['login']
  suspended: boolean
}): { login: string; github: string } | undefined {
  if (props.suspended) return undefined
  const owner = props.automation.owner.key
  const github = owner === props.viewer ? 'your' : `${people[owner].name}'s`
  const login = props.login === 'org' ? `${orgWithLogin.name}'s` : github
  return { login, github }
}

/**
 * The form of an automation: its fields, its triggers, and its prompt. Only the
 * owner gets fields, and the Capabilities icon of the prompt. Every other
 * member reads the same facts, and the secrets that each run workspace
 * pre-approves. In a suspended org every person reads them under the notice
 * of the org, which the page draws. No line names the logins of runs there,
 * and no hint warns about pull requests, because no run starts. On the org
 * login of Acme, the model picker of the prompt hides the models that the
 * model list of its gateway does not name, except the current model
 * (decision 3 A of the org logins plan).
 */
export function AutomationForm(props: {
  automation: Automation
  access: AutomationAccess
  edits: readonly TriggerEdit[]
  menu: boolean
  suspended: boolean
  viewer: PersonKey
  login: AutomationState['login']
  modelMenu: boolean
  /** The Capabilities icon of the owner, and its control when it is open. */
  capabilities?: CapabilitiesControl
  viewport: Viewport
}) {
  const { automation, access } = props
  const readOnly = access !== 'owner'
  const triggers = props.edits.map((edit) => edit.trigger)
  const schedules = hasSchedule(triggers)
  const logins = runLogins(props)
  const hidden =
    props.login === 'org'
      ? unlistedLabels.filter((label) => label !== automation.choice.model)
      : undefined
  return (
    <>
      <AutomationNote
        access={access}
        automation={automation}
        suspended={props.suspended}
      />
      {readOnly ? (
        <AutomationFacts automation={automation} schedules={schedules} />
      ) : (
        <AutomationFields automation={automation} viewport={props.viewport} />
      )}
      <TriggerList
        edits={props.edits}
        emptyText={
          readOnly
            ? 'No triggers.'
            : 'No triggers. The automation runs only when you use Run now.'
        }
        menu={props.menu}
        readOnly={readOnly}
        timeZone={automation.timeZone}
        viewport={props.viewport}
      />
      <PromptBox
        agent={agents[automation.choice.agent].name}
        capabilities={readOnly ? undefined : props.capabilities}
        choice={automation.choice}
        hiddenModels={hidden}
        loginWhose={logins?.login}
        open={props.modelMenu}
        prompt={automation.prompt}
        pullRequest={!props.suspended && hasPullRequestTrigger(triggers)}
        readOnly={readOnly}
        secrets={automation.preApproved}
        whose={logins?.github}
      />
    </>
  )
}

/**
 * The sheet of a phone over the automation page: the Add trigger menu, or the
 * author filter of a pull request trigger.
 */
export function PhoneSheet(props: {
  menu: boolean
  edits: readonly TriggerEdit[]
}) {
  if (props.menu) {
    return (
      <sheet.Component moklyInstance="add-trigger-sheet" title="Add trigger">
        <menu.Component
          entries={addTriggerEntries}
          label="Add trigger"
          moklyInstance="add-trigger-menu"
          placement="sheet"
        />
      </sheet.Component>
    )
  }
  const edit = props.edits.find((item) => item.filterOpen)
  if (!edit || edit.trigger.kind !== 'pull-request') return null
  return (
    <sheet.Component
      moklyInstance="authors-sheet"
      title={`Authors for ${eventLabels[edit.trigger.event]}`}
    >
      <div className={styles.sheetBody}>
        <AuthorFilter edit={edit} />
        <actionButton.Component moklyInstance="done" tone="primary">
          Done
        </actionButton.Component>
      </div>
    </sheet.Component>
  )
}
