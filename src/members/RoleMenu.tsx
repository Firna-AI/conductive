import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { OrgRole } from '../shared/api'
import type { OrgMember } from '../shared/members'
import { personName, roleLabels, roleOrder } from './people'
import { ActionButton } from './ui/actions'
import { ChoiceMenu } from './ui/ChoiceMenu'
import styles from './Members.module.css'

const roleChoices = roleOrder.map((role) => ({
  value: role,
  label: roleLabels[role],
}))

/**
 * The role of a member as a button that opens the role menu, for an admin.
 * A choice closes the menu at once, and the button shows a spinner until
 * the change is saved.
 */
export function RoleMenu(props: {
  member: OrgMember
  busy: boolean
  onChange: (role: OrgRole) => void
}) {
  const [open, setOpen] = useState(false)
  const { member } = props
  const name = personName(member.user)
  const label = roleLabels[member.role]
  return (
    <ChoiceMenu
      choices={roleChoices}
      group="Role"
      label={`Role of ${name}`}
      onOpenChange={setOpen}
      onSelect={(role) => {
        setOpen(false)
        if (role !== member.role) props.onChange(role)
      }}
      open={open}
      placement="below-end"
      selected={member.role}
      sheetTitle={name}
      trigger={(trigger) => (
        <ActionButton
          accessibilityLabel={`Role of ${name}: ${label}`}
          busy={props.busy}
          buttonRef={trigger.buttonRef}
          expanded={trigger.expanded}
          menu
          onPress={trigger.onPress}
          tone="plain"
          trailing={
            <ChevronDown aria-hidden className={styles.chevron} size={13} />
          }
        >
          {label}
        </ActionButton>
      )}
    />
  )
}
