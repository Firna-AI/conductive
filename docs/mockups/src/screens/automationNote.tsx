import { notice } from '../entries/components/common/Notice.mockup'
import { sectionText } from '../entries/components/settings/Section.mockup'
import { orgs } from '../fixtures/orgs'
import {
  offAfterFailedRuns,
  repositoryOf,
  type Automation,
} from '../fixtures/automations'
import type { AutomationAccess } from './automationState'

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
    <sectionText.Component moklyInstance="owner-only-text" muted>
      {`Only ${automation.owner.name} can change this automation.${actions}`}
    </sectionText.Component>
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
    <notice.Component
      body={
        props.ownerViews
          ? 'Three runs in a row failed. Fix the cause, then turn it on.'
          : `Three runs in a row failed. Only ${props.automation.owner.name} can turn it on again.`
      }
      icon="power-off"
      moklyInstance="failed-runs"
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
    <notice.Component
      body={body}
      icon="folder-x"
      moklyInstance="repository-removed"
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
export function AutomationNote(props: {
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
    <notice.Component
      body={`${automation.movedFrom} left ${orgs.acme.name}. It stays off until you turn it on.`}
      icon="user-x"
      moklyInstance="moved-to-you"
      title="This automation moved to you"
    />
  )
}
