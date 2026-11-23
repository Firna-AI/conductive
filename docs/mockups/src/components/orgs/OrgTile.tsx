import { Avatar } from '@firna/ui/avatar'
import { useSharedUiTheme } from '@firna/ui/theme'
import {
  orgTileTint,
  type OrgColor,
} from '../../../../../src/ui/design/orgColors'
import { account, type Org } from '../../fixtures/orgs'

/**
 * The initials of an org on a rounded square with a hairline outline, so
 * that the square shows on the rail in both schemes. The current org shows
 * its initials and its outline in the colour of the org, Blue by default.
 * The square is decorative: its link names the org.
 */
export function OrgTile(props: { org: Org; size: number; current?: boolean }) {
  return (
    <InitialsTile
      color={props.org.color}
      current={props.current}
      initials={props.org.initials}
      size={props.size}
    />
  )
}

/**
 * The square of an org from its initials alone, for an org that is not
 * one of the user's own, such as an org on the operator page.
 */
export function InitialsTile(props: {
  initials: string
  size: number
  current?: boolean
  /** The colour of the org, which a current tile shows. */
  color?: OrgColor
}) {
  const theme = useSharedUiTheme()
  const accent = props.current ?? false
  const tint = orgTileTint(props.color ?? 'blue', theme)
  return (
    <Avatar
      decorative
      label={props.initials}
      shape="square"
      size={props.size}
      style={{
        borderColor: accent ? tint.border : theme.colors.border2,
        borderStyle: 'solid',
        borderWidth: 1,
      }}
      textColor={accent ? tint.ink : theme.colors.ink2}
      tone="soft"
    />
  )
}

/**
 * The initials of a person on a disc with a hairline outline. The disc is
 * decorative: the text beside it, or its control, names the person.
 */
export function PersonAvatar(props: { initials: string; size: number }) {
  const theme = useSharedUiTheme()
  return (
    <Avatar
      decorative
      label={props.initials}
      size={props.size}
      style={{
        borderColor: theme.colors.border2,
        borderStyle: 'solid',
        borderWidth: 1,
      }}
      textColor={theme.colors.ink2}
      tone="soft"
    />
  )
}

/** The initials of the signed-in person. */
export function AccountAvatar(props: { size: number }) {
  return <PersonAvatar initials={account.initials} size={props.size} />
}
