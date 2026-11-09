import { Archive, ChevronDown, FolderGit2 } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/palette/CommandPalette.module.css'
import type { RepositoryChoice } from '../../app/palette/palette-source'
import { ActionButton } from '../ui/actions'
import { MenuButton, type MenuEntry } from '../ui/Menu'

const chevron = <ChevronDown aria-hidden className={styles.chevron} size={13} />

/**
 * The filters of the Workspaces tab: the repository, all or one, and the
 * state, Active or Archived. A desktop opens each menu beside its button,
 * and a phone opens it as a sheet.
 */
export function PaletteFilters(props: {
  choices: readonly RepositoryChoice[]
  repositoryId: string | null
  archived: boolean
  onRepository: (repositoryId: string | null) => void
  onArchived: (archived: boolean) => void
}) {
  const { choices, repositoryId, archived } = props
  const chosen = choices.find((choice) => choice.id === repositoryId)
  const repositories: MenuEntry[] = [
    {
      kind: 'item',
      label: 'All repositories',
      checked: chosen === undefined,
      onSelect: () => props.onRepository(null),
    },
    { kind: 'divider' },
    ...choices.map((choice): MenuEntry => ({
      kind: 'item',
      label: choice.name,
      checked: choice.id === chosen?.id,
      onSelect: () => props.onRepository(choice.id),
    })),
  ]
  const states: MenuEntry[] = [
    {
      kind: 'item',
      label: 'Active',
      checked: !archived,
      onSelect: () => props.onArchived(false),
    },
    {
      kind: 'item',
      label: 'Archived',
      checked: archived,
      onSelect: () => props.onArchived(true),
    },
  ]
  return (
    <div className={styles.filters}>
      <MenuButton
        entries={repositories}
        label="Repository"
        trigger={({ open, toggle }) => (
          <ActionButton
            expanded={open}
            icon={FolderGit2}
            menu
            onPress={toggle}
            tone="plain"
            trailing={chevron}
          >
            {chosen?.name ?? 'All repositories'}
          </ActionButton>
        )}
      />
      <MenuButton
        entries={states}
        label="State"
        trigger={({ open, toggle }) => (
          <ActionButton
            expanded={open}
            icon={Archive}
            menu
            onPress={toggle}
            tone="plain"
            trailing={chevron}
          >
            {archived ? 'Archived' : 'Active'}
          </ActionButton>
        )}
      />
    </div>
  )
}
