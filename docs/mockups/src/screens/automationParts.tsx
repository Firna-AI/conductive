import type { Viewport } from '@mokly/mokly'
import { FolderX, PowerOff, UserX } from 'lucide-react'
import { Notice } from '../components/common/Notice'
import { Menu } from '../components/common/Menu'
import { Sheet } from '../components/common/Sheet'
import { ActionButton } from '../components/common/actions'
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
import { eventLabels, hasSchedule } from '../components/automations/triggerCopy'
import { SectionText } from '../components/settings/Section'
import { agents } from '../fixtures/agents'
import { unlistedLabels } from '../fixtures/endpointModels'
import { people, type PersonKey } from '../fixtures/members'
import { orgWithLogin } from '../fixtures/orgLogins'
import { orgs } from '../fixtures/orgs'
import type { TriggerEdit } from '../fixtures/automationTriggers'
import {
  offAfterFailedRuns,
  repositoryOf,
  type Automation,
} from '../fixtures/automations'
import { paths } from '../paths'
import type { AutomationAccess, AutomationState } from './automationState'
import styles from './AutomationScreen.module.css'

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

/** Why the person signed in reads the automation without fields. */
function ReadOnlyNote(props: {
  automation: Automation
  access: AutomationAccess
}) {
  const { automation, access } = props
  let actions = ''
  if (access === 'admin') {
    actions = automation.active
      ? ' You can turn it off or delete it.'
      : ' You can delete it.'
  }
  return (
    <SectionText muted>
      {`Only ${automation.owner.name} can change this automation.${actions}`}
    </SectionText>
  )
}

/**
 * Why an automation turned off after three failed runs in a row (decision
 * 513 B). The owner fixes the cause and turns it on. Another person reads
 * who can.
 */
function FailedRunsNotice(props: {
  automation: Automation
  ownerViews: boolean
}) {
  return (
    <Notice
      body={
        props.ownerViews
          ? 'Three runs in a row failed. Fix the cause, then turn it on.'
          : `Three runs in a row failed. Only ${props.automation.owner.name} can turn it on again.`
      }
      icon={PowerOff}
      title="This automation turned off"
      tone="danger"
    />
  )
}

/**
 * Why an automation turned off when an admin removed its repository from the
 * chosen repositories of the org. While the org does not choose that
 * repository, the notice names it, and the owner reads to choose another
 * one. After the automation has a chosen repository again, the notice names
 * none, because an admin can choose the repository again, or the owner can
 * save another one. The automation then stays off until its owner turns it
 * on. Another person reads who can act.
 */
function RepositoryRemovedNotice(props: {
  automation: Automation
  ownerViews: boolean
}) {
  const { automation, ownerViews } = props
  const owner = automation.owner.name
  const org = orgs.acme.name
  let body: string
  if (automation.repositoryRemoved === 'not-chosen') {
    const removed = `${repositoryOf(automation)} is no longer a chosen repository of ${org}.`
    body = ownerViews
      ? `${removed} Choose another repository, then turn it on.`
      : `${removed} Only ${owner} can choose another one.`
  } else {
    const removed = `Its repository stopped being a chosen repository of ${org}.`
    body = ownerViews
      ? `${removed} It stays off until you turn it on.`
      : `${removed} Only ${owner} can turn it on again.`
  }
  return (
    <Notice
      body={body}
      icon={FolderX}
      title="This automation turned off"
      tone="danger"
    />
  )
}

/**
 * The note above the automation: the reason why it turned off after failed
 * runs or after its repository was removed, the reason why the person
 * signed in reads it without fields, or, for its owner, the notice of a
 * automation that moved from a member who left (decision 508 E). A suspended
 * org has no note, because the page shows the notice of the org, and
 * nobody can act.
 */
function Note(props: {
  automation: Automation
  access: AutomationAccess
  suspended: boolean
}) {
  const { automation } = props
  const ownerViews = props.access === 'owner'
  if (props.suspended) return null
  if (offAfterFailedRuns(automation)) {
    return <FailedRunsNotice ownerViews={ownerViews} automation={automation} />
  }
  if (!automation.active && automation.repositoryRemoved !== undefined) {
    return (
      <RepositoryRemovedNotice
        ownerViews={ownerViews}
        automation={automation}
      />
    )
  }
  if (!ownerViews) {
    return <ReadOnlyNote access={props.access} automation={automation} />
  }
  if (!automation.movedFrom) return null
  return (
    <Notice
      body={`${automation.movedFrom} left ${orgs.acme.name}. It stays off until you turn it on.`}
      icon={UserX}
      title="This automation moved to you"
    />
  )
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
 * owner gets fields. Every other member reads the same facts. In a
 * suspended org every person reads them under the notice of the org, which
 * the page draws, and no line names the logins of runs, because no run
 * starts. On the org login of Acme, the model picker of the prompt hides
 * the models that the model list of its gateway does not name, except the
 * current model (decision 3 A of the org logins plan).
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
  viewport: Viewport
}) {
  const { automation, access } = props
  const readOnly = access !== 'owner'
  const schedules = hasSchedule(props.edits.map((edit) => edit.trigger))
  const logins = runLogins(props)
  const hidden =
    props.login === 'org'
      ? unlistedLabels.filter((label) => label !== automation.choice.model)
      : undefined
  return (
    <>
      <Note
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
        choice={automation.choice}
        hiddenModels={hidden}
        loginWhose={logins?.login}
        open={props.modelMenu}
        prompt={automation.prompt}
        readOnly={readOnly}
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
      <Sheet title="Add trigger">
        <Menu
          entries={addTriggerEntries}
          label="Add trigger"
          placement="sheet"
        />
      </Sheet>
    )
  }
  const edit = props.edits.find((item) => item.filterOpen)
  if (!edit || edit.trigger.kind !== 'pull-request') return null
  return (
    <Sheet title={`Authors for ${eventLabels[edit.trigger.event]}`}>
      <div className={styles.sheetBody}>
        <AuthorFilter edit={edit} />
        <ActionButton tone="primary">Done</ActionButton>
      </div>
    </Sheet>
  )
}
