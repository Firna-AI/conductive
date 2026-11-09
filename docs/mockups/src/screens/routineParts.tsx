import type { Viewport } from '@mokly/mokly'
import { UserX } from 'lucide-react'
import { Notice } from '../components/common/Notice'
import { Menu } from '../components/common/Menu'
import { Sheet } from '../components/common/Sheet'
import { ActionButton } from '../components/common/actions'
import { AuthorFilter } from '../components/routines/AuthorFilter'
import { PromptBox } from '../components/routines/PromptBox'
import {
  RoutineFacts,
  RoutineFields,
} from '../components/routines/RoutineFields'
import {
  addTriggerEntries,
  TriggerList,
} from '../components/routines/TriggerList'
import { eventLabels, hasSchedule } from '../components/routines/triggerCopy'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { SectionText } from '../components/settings/Section'
import { agents } from '../fixtures/agents'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import type { TriggerEdit } from '../fixtures/routineTriggers'
import type { Routine } from '../fixtures/routines'
import { paths } from '../paths'
import type { RoutineAccess } from './routineState'
import styles from './RoutineScreen.module.css'

/** The screens of the run workspaces that the mockups draw, by run. */
export const runLinks: Readonly<Record<string, string>> = {
  'opened-482': paths.runWorkspace,
  'run-now': paths.runNowWorkspace,
}

/** The name in the header: "New routine" until the routine is saved. */
export function titleOf(routine: Routine): string {
  if (!routine.saved) return 'New routine'
  return routine.name === '' ? 'Untitled routine' : routine.name
}

/**
 * Why the person signed in reads the routine without fields. A routine
 * whose owner left the org stays off, because its runs used the logins of
 * that person.
 */
function ReadOnlyNote(props: { routine: Routine; access: RoutineAccess }) {
  const { routine, access } = props
  const owner = routine.owner
  const admin = access === 'admin'
  if (owner.left) {
    return (
      <Notice
        body={`${owner.name} left ${orgs.acme.name}, and its runs used ${owner.name}'s logins.${admin ? ' You can delete it.' : ''}`}
        icon={UserX}
        title="This routine stays off"
      />
    )
  }
  let actions = ''
  if (admin) {
    actions = routine.active
      ? ' You can turn it off or delete it.'
      : ' You can delete it.'
  }
  return (
    <SectionText muted>
      {`Only ${owner.name} can change this routine.${actions}`}
    </SectionText>
  )
}

/** Why the routine shows without fields: the org, or the access of the person. */
function Note(props: {
  routine: Routine
  access: RoutineAccess
  suspended: boolean
}) {
  if (props.suspended) return <SuspendedOrgNotice org={orgs[suspendedOrg]} />
  if (props.access === 'owner') return null
  return <ReadOnlyNote access={props.access} routine={props.routine} />
}

/**
 * The form of a routine: its fields, its triggers, and its prompt. Only the
 * owner gets fields. Every other member reads the same facts. In a
 * suspended org every person reads them under the notice of the org, and
 * no line names the logins of runs, because no run starts.
 */
export function RoutineForm(props: {
  routine: Routine
  access: RoutineAccess
  edits: readonly TriggerEdit[]
  menu: boolean
  suspended: boolean
  viewport: Viewport
}) {
  const { routine, access } = props
  const readOnly = access !== 'owner'
  const schedules = hasSchedule(props.edits.map((edit) => edit.trigger))
  let whose: string | undefined = `${routine.owner.name}'s`
  if (access === 'owner') whose = 'your'
  if (routine.owner.left || props.suspended) whose = undefined
  return (
    <>
      <Note access={access} routine={routine} suspended={props.suspended} />
      {readOnly ? (
        <RoutineFacts routine={routine} schedules={schedules} />
      ) : (
        <RoutineFields routine={routine} viewport={props.viewport} />
      )}
      <TriggerList
        edits={props.edits}
        emptyText={
          readOnly
            ? 'No triggers.'
            : 'No triggers. The routine runs only when you use Run now.'
        }
        menu={props.menu}
        readOnly={readOnly}
        timeZone={routine.timeZone}
        viewport={props.viewport}
      />
      <PromptBox
        agent={agents[routine.choice.agent].name}
        choice={routine.choice}
        prompt={routine.prompt}
        readOnly={readOnly}
        whose={whose}
      />
    </>
  )
}

/**
 * The sheet of a phone over the routine page: the Add trigger menu, or the
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
