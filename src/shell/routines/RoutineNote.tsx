import { FolderX, PowerOff, UserX } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { SuspendedOrgNotice } from '../../../docs/mockups/src/components/orgs/SuspendedOrgNotice'
import { SectionText } from '../../../docs/mockups/src/components/settings/Section'
import { personName } from '../../app/people'
import type { OrgSummary } from '../../shared/orgs'
import type { Routine } from '../../shared/routines'

/**
 * What the person signed in may do with a routine: the owner changes it,
 * an admin turns it off and deletes it, and a member reads it. In a
 * suspended org every person reads it.
 */
export type RoutineAccess = 'owner' | 'admin' | 'member' | 'suspended'

/** Why the person signed in reads the routine without fields. */
function ReadOnlyNote(props: { routine: Routine; access: RoutineAccess }) {
  const { routine } = props
  let actions = ''
  if (props.access === 'admin') {
    actions = routine.active
      ? ' You can turn it off or delete it.'
      : ' You can delete it.'
  }
  return (
    <SectionText muted>
      {`Only ${personName(routine.owner)} can change this routine.${actions}`}
    </SectionText>
  )
}

/**
 * The note above a routine: the notice of a suspended org, why the app
 * turned the routine off, why the person signed in reads it without
 * fields, or, for its owner, that it moved from a member who left. The
 * owner reads what to do, and another person reads who can do it.
 */
export function RoutineNote(props: {
  org: OrgSummary
  routine: Routine
  access: RoutineAccess
  repositoryName: string
}) {
  const { org, routine, access } = props
  const owner = personName(routine.owner)
  const ownerViews = access === 'owner'
  if (access === 'suspended') return <SuspendedOrgNotice org={org} />
  if (!routine.active && routine.inactiveReason === 'failed_runs') {
    return (
      <Notice
        body={
          ownerViews
            ? 'Three runs in a row failed. Fix the cause, then turn it on.'
            : `Three runs in a row failed. Only ${owner} can turn it on again.`
        }
        icon={PowerOff}
        title="This routine turned off"
        tone="danger"
      />
    )
  }
  if (!routine.active && routine.inactiveReason === 'repository_removed') {
    const removed = `${props.repositoryName} is no longer a chosen repository of ${org.name}.`
    return (
      <Notice
        body={
          ownerViews
            ? `${removed} Choose another repository, then turn it on.`
            : `${removed} Only ${owner} can choose another one.`
        }
        icon={FolderX}
        title="This routine turned off"
        tone="danger"
      />
    )
  }
  if (!ownerViews) return <ReadOnlyNote access={access} routine={routine} />
  if (routine.inactiveReason !== 'owner_left' || routine.movedFrom === null) {
    return null
  }
  return (
    <Notice
      body={`${routine.movedFrom} left ${org.name}. It stays off until you turn it on.`}
      icon={UserX}
      title="This routine moved to you"
    />
  )
}
