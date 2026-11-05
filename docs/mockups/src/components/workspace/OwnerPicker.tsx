import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import {
  acmeMembers,
  people,
  type Person,
  type PersonKey,
} from '../../fixtures/members'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { Menu, type MenuEntry } from '../common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import a11y from '../common/a11y.module.css'
import { useControlSizes } from '../common/touch'
import { PersonAvatar } from '../orgs/OrgTile'
import styles from './OwnerPicker.module.css'

/**
 * The members whom an owner can make the owner of a workspace, with the
 * current owner marked. The agents of a workspace use its owner's accounts,
 * so a new owner's accounts apply when the cloud computer starts again.
 */
export function reassignMenu(owner: PersonKey): MenuEntry[] {
  return [
    { kind: 'label', label: 'Owner' },
    ...acmeMembers.map((membership): MenuEntry => ({
      kind: 'item',
      label: people[membership.person].name,
      mark: (
        <PersonAvatar initials={people[membership.person].initials} size={18} />
      ),
      checked: membership.person === owner,
    })),
    { kind: 'divider' },
    {
      kind: 'note',
      text: "The agents use the owner's own Claude and Codex accounts.",
    },
    {
      kind: 'note',
      text: "The cloud computer stops, and starts again with the new owner's accounts.",
    },
  ]
}

/**
 * The owner of the open workspace, as a picker in its header: the avatar
 * and the name, or the avatar alone on a phone. An owner of the org picks
 * another member. `open` draws the menu beside the picker, and a phone
 * shows it as a sheet instead. `readOnly` shows the owner to a member who
 * is not an owner, without the menu.
 */
export function OwnerPicker(props: {
  owner: Person
  open?: boolean
  compact?: boolean
  readOnly?: boolean
}) {
  const control = useControlSizes()
  const { owner } = props
  const avatar = <PersonAvatar initials={owner.initials} size={18} />
  if (props.readOnly) {
    return (
      <span className={styles.plain} title={`Owner: ${owner.name}`}>
        {props.compact ? (
          <PersonAvatar initials={owner.initials} size={24} />
        ) : (
          avatar
        )}
        {props.compact ? null : (
          <span className={styles.name}>{owner.name}</span>
        )}
        <span className={a11y.hidden}>, owner of the workspace</span>
      </span>
    )
  }
  const content = props.compact ? (
    <PersonAvatar initials={owner.initials} size={24} />
  ) : (
    <span className={styles.trigger} style={{ fontSize: control.labelSize }}>
      {avatar}
      <span className={styles.name}>{owner.name}</span>
      <ChevronDown aria-hidden className={styles.chevron} size={12} />
    </span>
  )
  const button = (
    <Button
      accessibilityLabel={`Owner: ${owner.name}`}
      boxSize={props.compact ? control.height : undefined}
      content={content}
      expanded={props.open ?? false}
      hasPopup="menu"
      onPress={noop}
      shape={props.compact ? 'square' : undefined}
      size="sm"
      style={
        props.compact
          ? undefined
          : { height: control.height, paddingHorizontal: 6 }
      }
      tone="plain"
    />
  )
  return (
    <span className={styles.anchor}>
      {props.open ? (
        button
      ) : (
        <ScreenLink asChild to={paths.reassign}>
          {button}
        </ScreenLink>
      )}
      {props.open && !props.compact ? (
        <Menu
          entries={reassignMenu(owner.key)}
          label="Owner"
          placement="below-end"
          wide
        />
      ) : null}
    </span>
  )
}
