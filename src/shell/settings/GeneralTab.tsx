import { useState } from 'react'
import { Input } from '@firna/ui/input'
import { Trash2 } from 'lucide-react'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { DetailList } from '../../../docs/mockups/src/components/settings/DetailList'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { DeleteOrgDialog, deletionDays } from './DeleteOrgDialog'

/**
 * The name of the org, which an admin changes. Save waits until the name
 * changes, and a name of spaces only does not count.
 */
function NameSection(props: { org: OrgSummary }) {
  const app = useApp()
  const { field } = useControlSizes()
  const [name, setName] = useState(props.org.name)
  const rename = useAction(
    (next: string) => app.renameOrg(props.org.id, next),
    'The name was not saved',
  )
  const next = name.trim()
  const changed = next !== '' && next !== props.org.name
  const save = () => {
    if (changed) rename.run(next)
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
      <Input
        label="Name"
        onChangeText={setName}
        onSubmitEditing={save}
        size={field}
        value={name}
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
 * The General tab. An admin renames and deletes the org. A member sees the
 * name without a field, because only an admin changes it (decision 57).
 * The org has no initials of its own: the rail takes them from the name.
 */
export function GeneralTab(props: { org: OrgSummary }) {
  const { org } = props
  if (org.role !== 'admin') {
    return (
      <Section description="Only an admin can change it." title="Org">
        <DetailList rows={[{ term: 'Name', value: org.name }]} />
      </Section>
    )
  }
  return (
    <>
      {/* A new name, saved here or elsewhere, starts a new draft. */}
      <NameSection key={org.name} org={org} />
      <DeleteSection org={org} />
    </>
  )
}
