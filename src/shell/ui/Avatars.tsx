import { Avatar } from '@firna/ui/avatar'
import { useSharedUiTheme } from '@firna/ui/theme'
import { orgTileTint } from '../../ui/design/orgColors'
import { orgColorOf } from '../../shared/org-colors'
import type { MessageSender } from '../../shared/generated/MessageSender'
import { orgInitials, personInitials } from '../../app/people'
import type { OrgSummary } from '../../shared/orgs'

/** The initials that the rail shows: the saved ones, else from the name. */
export function tileInitials(org: Pick<OrgSummary, 'name' | 'initials'>) {
  return org.initials ?? orgInitials(org.name)
}

/**
 * The initials of an org on a rounded square with a hairline outline. The
 * current org shows its initials and its outline in the colour of the org,
 * Blue when it has none. The square is decorative: its link names the org.
 */
export function OrgTile(props: {
  org: Pick<OrgSummary, 'name' | 'initials' | 'color'>
  size: number
  current?: boolean
}) {
  const theme = useSharedUiTheme()
  const accent = props.current ?? false
  const tint = orgTileTint(orgColorOf(props.org), theme)
  return (
    <Avatar
      decorative
      label={tileInitials(props.org)}
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
export function PersonAvatar(props: {
  person: Pick<MessageSender, 'displayName' | 'githubLogin'>
  size: number
}) {
  const theme = useSharedUiTheme()
  return (
    <Avatar
      decorative
      label={personInitials(props.person)}
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
