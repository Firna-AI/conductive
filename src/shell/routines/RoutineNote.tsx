import { FolderX, PowerOff, UserX } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { SectionText } from '../../../docs/mockups/src/components/settings/Section'
import { personName } from '../../app/people'
import type { Repository } from '../../shared/org-settings'
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
 * Why the app turned a routine off when its repository stopped being a
 * chosen repository of the org. It reads the saved repository, never the
 * draft. While the org does not choose that repository, the notice names
 * it. Once the routine has a chosen repository again, or names one that
 * the list lacks, the notice names none: an admin can choose the
 * repository again, or the owner can save another one, and the routine
 * stays off until the owner turns it on.
 */
function RepositoryRemovedNotice(props: {
  org: OrgSummary
  routine: Routine
  repositories: readonly Repository[]
  ownerViews: boolean
}) {
  const { org, routine, ownerViews } = props
  const owner = personName(routine.owner)
  const saved = props.repositories.find(
    (item) => item.id === routine.repositoryId,
  )
  let body: string
  if (saved && !saved.selected) {
    const removed = `${saved.fullName} is no longer a chosen repository of ${org.name}.`
    body = ownerViews
      ? `${removed} Choose another repository, then turn it on.`
      : `${removed} Only ${owner} can choose another one.`
  } else {
    const removed = `Its repository stopped being a chosen repository of ${org.name}.`
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
 * The note above a routine: why the app turned the routine off, why the
 * person signed in reads it without fields, or, for its owner, that it
 * moved from a member who left. The owner reads what to do, and another
 * person reads who can do it. A suspended org has no note, because the
 * frame of the page shows the notice of the org, and nobody can act.
 * `repositories` is the repository list of the org.
 */
export function RoutineNote(props: {
  org: OrgSummary
  routine: Routine
  access: RoutineAccess
  repositories: readonly Repository[]
}) {
  const { org, routine, access } = props
  const owner = personName(routine.owner)
  const ownerViews = access === 'owner'
  if (access === 'suspended') return null
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
    return (
      <RepositoryRemovedNotice
        org={org}
        ownerViews={ownerViews}
        repositories={props.repositories}
        routine={routine}
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
