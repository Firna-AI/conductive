import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import {
  acmeMembers,
  people,
  type Person,
  type PersonKey,
} from '../../fixtures/members'
import { noop } from '../../../../../src/ui/noop'
import { paths } from '../../paths'
import { menu } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { ScreenLink } from '../common/ScreenLink'
import a11y from '../../../../../src/ui/components/common/a11y.module.css'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { personAvatar } from '../../entries/components/orgs/OrgTile.mockup'
import styles from '../../../../../src/ui/components/workspace/OwnerPicker.module.css'

/**
 * The members whom an admin can make the owner of a workspace, with the
 * current owner marked. Each session keeps its agent login, the login of
 * its starter or the org login, so a new owner changes no login, and the
 * cloud computer keeps running. One exception: a workspace whose stop for
 * a suspended owner has not finished still stops.
 */
export function reassignMenu(owner: PersonKey): MenuEntryData[] {
  return [
    { kind: 'label', label: 'Owner' },
    ...acmeMembers.map((membership): MenuEntryData => ({
      kind: 'item',
      label: people[membership.person].name,
      mark: { kind: 'person', initials: people[membership.person].initials },
      checked: membership.person === owner,
    })),
    { kind: 'divider' },
    {
      kind: 'note',
      text: 'Each session keeps its agent login.',
    },
  ]
}

/**
 * The owner of the open workspace, as a picker in its header: the avatar
 * and the name, or the avatar alone on a phone. An admin of the org picks
 * another member. `open` draws the menu beside the picker, and a phone
 * shows it as a sheet instead. `readOnly` shows the owner to a member who
 * is not an admin, without the menu.
 */
export function OwnerPicker(props: {
  owner: Person
  open?: boolean
  compact?: boolean
  readOnly?: boolean
}) {
  const control = useControlSizes()
  const { owner } = props
  const avatar = <personAvatar.Component initials={owner.initials} size={18} />
  if (props.readOnly) {
    return (
      <span className={styles.plain} title={`Owner: ${owner.name}`}>
        {props.compact ? (
          <personAvatar.Component initials={owner.initials} size={24} />
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
    <personAvatar.Component initials={owner.initials} size={24} />
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
        <menu.Component
          entries={reassignMenu(owner.key)}
          label="Owner"
          moklyInstance="owner-menu"
          placement="below-end"
          wide
        />
      ) : null}
    </span>
  )
}
