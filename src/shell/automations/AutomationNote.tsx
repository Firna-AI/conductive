import { FolderX, PowerOff, UserX } from 'lucide-react'
import { Notice } from '../../ui/components/common/Notice'
import { SectionText } from '../../ui/components/settings/Section'
import { personName } from '../../app/people'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import type { Automation } from '../../shared/automations'

/**
 * What the person signed in may do with an automation: the owner changes it,
 * an admin turns it off and deletes it, and a member reads it. In a
 * suspended org every person reads it.
 */
export type AutomationAccess = 'owner' | 'admin' | 'member' | 'suspended'

/** Why the person signed in reads the automation without fields. */
function ReadOnlyNote(props: {
  automation: Automation
  access: AutomationAccess
}) {
  const { automation } = props
  let actions = ''
  if (props.access === 'admin') {
    actions = automation.active
      ? ' You can turn it off or delete it.'
      : ' You can delete it.'
  }
  return (
    <SectionText muted>
      {`Only ${personName(automation.owner)} can change this automation.${actions}`}
    </SectionText>
  )
}

/**
 * Why the app turned an automation off when its repository stopped being a
 * chosen repository of the org. It reads the saved repository, never the
 * draft. While the org does not choose that repository, the notice names
 * it. Once the automation has a chosen repository again, or names one that
 * the list lacks, the notice names none: an admin can choose the
 * repository again, or the owner can save another one, and the automation
 * stays off until the owner turns it on.
 */
function RepositoryRemovedNotice(props: {
  org: OrgSummary
  automation: Automation
  repositories: readonly Repository[]
  ownerViews: boolean
}) {
  const { org, automation, ownerViews } = props
  const owner = personName(automation.owner)
  const saved = props.repositories.find(
    (item) => item.id === automation.repositoryId,
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
      title="This automation turned off"
      tone="danger"
    />
  )
}

/**
 * The note above an automation: why the app turned the automation off, why the
 * person signed in reads it without fields, or, for its owner, that it
 * moved from a member who left. The owner reads what to do, and another
 * person reads who can do it. A suspended org has no note, because the
 * frame of the page shows the notice of the org, and nobody can act.
 * `repositories` is the repository list of the org.
 */
export function AutomationNote(props: {
  org: OrgSummary
  automation: Automation
  access: AutomationAccess
  repositories: readonly Repository[]
}) {
  const { org, automation, access } = props
  const owner = personName(automation.owner)
  const ownerViews = access === 'owner'
  if (access === 'suspended') return null
  if (!automation.active && automation.inactiveReason === 'failed_runs') {
    return (
      <Notice
        body={
          ownerViews
            ? 'Three runs in a row failed. Fix the cause, then turn it on.'
            : `Three runs in a row failed. Only ${owner} can turn it on again.`
        }
        icon={PowerOff}
        title="This automation turned off"
        tone="danger"
      />
    )
  }
  if (
    !automation.active &&
    automation.inactiveReason === 'repository_removed'
  ) {
    return (
      <RepositoryRemovedNotice
        org={org}
        ownerViews={ownerViews}
        repositories={props.repositories}
        automation={automation}
      />
    )
  }
  if (!ownerViews)
    return <ReadOnlyNote access={access} automation={automation} />
  if (
    automation.inactiveReason !== 'owner_left' ||
    automation.movedFrom === null
  ) {
    return null
  }
  return (
    <Notice
      body={`${automation.movedFrom} left ${org.name}. It stays off until you turn it on.`}
      icon={UserX}
      title="This automation moved to you"
    />
  )
}
