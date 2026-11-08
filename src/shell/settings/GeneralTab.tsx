import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { DetailList } from '../../../docs/mockups/src/components/settings/DetailList'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { mayChangeSettings } from '../../app/permissions'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgAccess } from '../context'
import {
  orgNameFields,
  OrgNameFields,
  type OrgNameDraft,
} from '../orgs/OrgNameFields'
import { ActionButton } from '../ui/actions'
import { tileInitials } from '../ui/Avatars'
import { useAction } from '../ui/useAction'
import { useSavedDraft } from '../ui/useSavedDraft'
import { DeleteOrgDialog, deletionDays } from './DeleteOrgDialog'
import { LeaveOrgSection } from './LeaveOrg'

function sameNames(a: OrgNameDraft, b: OrgNameDraft): boolean {
  return a.name === b.name && a.initials === b.initials
}

/**
 * The name and the initials of the org, which an admin changes. Save waits
 * for a change, and a name of spaces only does not count. Empty initials
 * keep the saved ones. When the saved name or initials change, here or
 * elsewhere, the fields show them, unless the admin changed the fields.
 */
function NameSection(props: { org: OrgSummary }) {
  const { org } = props
  const app = useApp()
  const names = useSavedDraft<OrgNameDraft>(
    { name: org.name, initials: org.initials ?? '' },
    sameNames,
  )
  const rename = useAction(
    () => names.save((draft) => app.renameOrg(org.id, orgNameFields(draft))),
    'The org was not saved',
  )
  const next = orgNameFields(names.draft)
  const changed =
    next.name !== '' &&
    (next.name !== org.name ||
      (next.initials !== undefined && next.initials !== org.initials))
  const save = () => {
    if (changed) rename.run()
  }
  return (
    <Section
      actions={
        <ActionButton
          busy={rename.pending}
          disabled={!changed}
          keepFocus
          onPress={save}
        >
          Save
        </ActionButton>
      }
      title="Org"
    >
      <OrgNameFields
        change={names.change}
        disabled={rename.pending}
        draft={names.draft}
        submit={save}
      />
    </Section>
  )
}

/**
 * Deletes the org, as the user decided in decision 30: every cloud computer
 * stops and the org hides at once, and everything is deleted after 7 days
 * unless an admin restores it.
 */
function DeleteSection(props: { org: OrgSummary }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      <Section
        actions={
          <ActionButton
            icon={Trash2}
            onPress={() => setConfirming(true)}
            tone="danger"
          >
            Delete org
          </ActionButton>
        }
        description={`Stops every cloud computer of ${props.org.name} and hides it from its members. Everything is deleted after ${deletionDays} days, unless an admin restores it.`}
        title="Delete org"
      />
      {confirming ? (
        <DeleteOrgDialog close={() => setConfirming(false)} org={props.org} />
      ) : null}
    </>
  )
}

/**
 * The General tab. An admin renames the org, sets its initials, and
 * deletes it. A member sees the name and the initials without fields,
 * because only an admin changes them (decision 57). A suspended org shows
 * them without fields to everyone, and offers Leave org, its one change.
 */
export function GeneralTab(props: { org: OrgSummary; user: User }) {
  const { org } = props
  const access = useOrgAccess(org)
  if (!mayChangeSettings(access)) {
    const { suspended } = access
    return (
      <>
        <Section
          description={suspended ? undefined : 'Only an admin can change it.'}
          title="Org"
        >
          <DetailList
            rows={[
              { term: 'Name', value: org.name },
              { term: 'Initials', value: tileInitials(org) },
            ]}
          />
        </Section>
        {suspended ? <LeaveOrgSection org={org} user={props.user} /> : null}
      </>
    )
  }
  return (
    <>
      <NameSection org={org} />
      <DeleteSection org={org} />
    </>
  )
}
