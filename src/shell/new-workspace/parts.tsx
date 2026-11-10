import { ChevronDown, FolderGit2 } from 'lucide-react'
import type { Repository } from '../../shared/org-settings'
import { ActionButton, type ActionTone } from '../ui/actions'
import { MenuButton } from '../ui/Menu'

// The parts of a New workspace form that the page and the dialog share.

/** The repository of the new workspace, as a menu of the chosen ones. */
export function RepositoryMenu(props: {
  repositories: readonly Repository[]
  chosen: Repository
  choose: (id: string) => void
  /** The look of the button. The page uses the default, the dialog `plain`. */
  tone?: ActionTone
  /** The class of the chevron, from the CSS of the page or of the dialog. */
  chevron: string
}) {
  const { chosen } = props
  return (
    <MenuButton
      entries={props.repositories.map((item) => ({
        kind: 'item',
        label: item.fullName,
        checked: item.id === chosen.id,
        onSelect: () => props.choose(item.id),
      }))}
      label="Repository"
      placement="below-start"
      trigger={({ open, toggle }) => (
        <ActionButton
          accessibilityLabel={`Repository: ${chosen.fullName}`}
          expanded={open}
          icon={FolderGit2}
          menu
          onPress={toggle}
          tone={props.tone}
          trailing={
            <ChevronDown aria-hidden className={props.chevron} size={13} />
          }
        >
          {chosen.fullName}
        </ActionButton>
      )}
    />
  )
}
