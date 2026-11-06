import { Avatar } from '@firna/ui/avatar'
import { useSharedUiTheme } from '@firna/ui/theme'
import { initials, type PersonName } from '../people'

/**
 * The initials of a person on a disc with a hairline outline. The disc is
 * decorative: the text beside it, or its control, names the person.
 */
export function PersonAvatar(props: { person: PersonName; size: number }) {
  const theme = useSharedUiTheme()
  return (
    <Avatar
      decorative
      label={initials(props.person)}
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
