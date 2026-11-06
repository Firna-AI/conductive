import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { DetailList } from '../../../docs/mockups/src/components/settings/DetailList'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import {
  orgNameFields,
  OrgNameFields,
  type OrgNameDraft,
} from '../orgs/OrgNameFields'
import { ActionButton } from '../ui/actions'
import { tileInitials } from '../ui/Avatars'
import { useAction } from '../ui/useAction'
import { DeleteOrgDialog, deletionDays } from './DeleteOrgDialog'

/**
 * The name and the initials of the org, which an admin changes. Save waits
 * for a change, and a name of spaces only does not count. Empty initials
 * keep the saved ones.
 */
function NameSection(props: { org: OrgSummary }) {
  const { org } = props
  const app = useApp()
  const [draft, setDraft] = useState<OrgNameDraft>({
    name: org.name,
    initials: org.initials ?? '',
  })
  const rename = useAction(
    () => app.renameOrg(org.id, orgNameFields(draft)),
    'The org was not saved',
  )
  const next = orgNameFields(draft)
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
        <ActionButton busy={rename.pending} disabled={!changed} onPress={save}>
          Save
        </ActionButton>
      }
      title="Org"
    >
      <OrgNameFields
        change={setDraft}
        disabled={rename.pending}
        draft={draft}
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
 * because only an admin changes them (decision 57).
 */
export function GeneralTab(props: { org: OrgSummary }) {
  const { org } = props
  if (org.role !== 'admin') {
    return (
      <Section description="Only an admin can change it." title="Org">
        <DetailList
          rows={[
            { term: 'Name', value: org.name },
            { term: 'Initials', value: tileInitials(org) },
          ]}
        />
      </Section>
    )
  }
  return (
    <>
      {/* A new name or initials, saved here or elsewhere, start a new draft. */}
      <NameSection key={`${org.name} ${org.initials ?? ''}`} org={org} />
      <DeleteSection org={org} />
    </>
  )
}
