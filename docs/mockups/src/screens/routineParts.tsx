import type { Viewport } from '@mokly/mokly'
import { FolderX, PowerOff, UserX } from 'lucide-react'
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
import { SectionText } from '../components/settings/Section'
import { agents } from '../fixtures/agents'
import { orgs } from '../fixtures/orgs'
import type { TriggerEdit } from '../fixtures/routineTriggers'
import {
  offAfterFailedRuns,
  repositoryOf,
  type Routine,
} from '../fixtures/routines'
import { paths } from '../paths'
import type { RoutineAccess } from './routineState'
import styles from './RoutineScreen.module.css'

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

/** The name in the header: "New routine" until the routine is saved. */
export function titleOf(routine: Routine): string {
  if (!routine.saved) return 'New routine'
  return routine.name === '' ? 'Untitled routine' : routine.name
}

/** Why the person signed in reads the routine without fields. */
function ReadOnlyNote(props: { routine: Routine; access: RoutineAccess }) {
  const { routine, access } = props
  let actions = ''
  if (access === 'admin') {
    actions = routine.active
      ? ' You can turn it off or delete it.'
      : ' You can delete it.'
  }
  return (
    <SectionText muted>
      {`Only ${routine.owner.name} can change this routine.${actions}`}
    </SectionText>
  )
}

/**
 * Why a routine turned off after three failed runs in a row (decision
 * 513 B). The owner fixes the cause and turns it on. Another person reads
 * who can.
 */
function FailedRunsNotice(props: { routine: Routine; ownerViews: boolean }) {
  return (
    <Notice
      body={
        props.ownerViews
          ? 'Three runs in a row failed. Fix the cause, then turn it on.'
          : `Three runs in a row failed. Only ${props.routine.owner.name} can turn it on again.`
      }
      icon={PowerOff}
      title="This routine turned off"
      tone="danger"
    />
  )
}

/**
 * Why a routine turned off when an admin removed its repository from the
 * chosen repositories of the org. While the org does not choose that
 * repository, the notice names it, and the owner reads to choose another
 * one. After the routine has a chosen repository again, the notice names
 * none, because an admin can choose the repository again, or the owner can
 * save another one. The routine then stays off until its owner turns it
 * on. Another person reads who can act.
 */
function RepositoryRemovedNotice(props: {
  routine: Routine
  ownerViews: boolean
}) {
  const { routine, ownerViews } = props
  const owner = routine.owner.name
  const org = orgs.acme.name
  let body: string
  if (routine.repositoryRemoved === 'not-chosen') {
    const removed = `${repositoryOf(routine)} is no longer a chosen repository of ${org}.`
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
      title="This routine turned off"
      tone="danger"
    />
  )
}

/**
 * The note above the routine: the reason why it turned off after failed
 * runs or after its repository was removed, the reason why the person
 * signed in reads it without fields, or, for its owner, the notice of a
 * routine that moved from a member who left (decision 508 E). A suspended
 * org has no note, because the page shows the notice of the org, and
 * nobody can act.
 */
function Note(props: {
  routine: Routine
  access: RoutineAccess
  suspended: boolean
}) {
  const { routine } = props
  const ownerViews = props.access === 'owner'
  if (props.suspended) return null
  if (offAfterFailedRuns(routine)) {
    return <FailedRunsNotice ownerViews={ownerViews} routine={routine} />
  }
  if (!routine.active && routine.repositoryRemoved !== undefined) {
    return <RepositoryRemovedNotice ownerViews={ownerViews} routine={routine} />
  }
  if (!ownerViews) {
    return <ReadOnlyNote access={props.access} routine={routine} />
  }
  if (!routine.movedFrom) return null
  return (
    <Notice
      body={`${routine.movedFrom} left ${orgs.acme.name}. It stays off until you turn it on.`}
      icon={UserX}
      title="This routine moved to you"
    />
  )
}

/**
 * The form of a routine: its fields, its triggers, and its prompt. Only the
 * owner gets fields. Every other member reads the same facts. In a
 * suspended org every person reads them under the notice of the org, which
 * the page draws, and no line names the logins of runs, because no run
 * starts.
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
  if (props.suspended) whose = undefined
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
