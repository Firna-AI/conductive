import { Input } from '@firna/ui/input'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/settings/OrgSections.module.css'
import { orgInitials } from '../../app/people'
import type { RenameOrgRequest } from '../../shared/orgs'

/** The name and the initials of an org, as an admin types them. */
export interface OrgNameDraft {
  name: string
  initials: string
}

/**
 * The request fields of a draft: the name, and the initials when the admin
 * typed them. Without initials, the rail takes them from the name.
 */
export function orgNameFields(draft: OrgNameDraft): RenameOrgRequest {
  const initials = draft.initials.trim()
  return { name: draft.name.trim(), ...(initials === '' ? {} : { initials }) }
}

/**
 * The name of an org and the initials that the rail shows. The initials
 * field suggests the initials of the name until the admin types others.
 */
export function OrgNameFields(props: {
  draft: OrgNameDraft
  change: (draft: OrgNameDraft) => void
  submit: () => void
  disabled?: boolean
}) {
  const { field } = useControlSizes()
  const { draft } = props
  const named = draft.name.trim() !== ''
  return (
    <div className={styles.fields}>
      <Input
        editable={!props.disabled}
        label="Name"
        onChangeText={(name) => props.change({ ...draft, name })}
        onSubmitEditing={props.submit}
        size={field}
        value={draft.name}
      />
      <Input
        editable={!props.disabled}
        hint="Shown in the rail."
        label="Initials"
        onChangeText={(initials) => props.change({ ...draft, initials })}
        onSubmitEditing={props.submit}
        placeholder={named ? orgInitials(draft.name) : undefined}
        size={field}
        value={draft.initials}
      />
    </div>
  )
}
