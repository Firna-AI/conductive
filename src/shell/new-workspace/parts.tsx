import { ChevronDown, FolderGit2 } from 'lucide-react'
import { menuNotes } from '../../../docs/mockups/src/components/settings/repositoryChangeCopy'
import type { WaitingRepositories } from '../../app/repository-changes'
import type { Repository } from '../../shared/org-settings'
import type { Section } from '../../shared/sections'
import { ActionButton, type ActionTone } from '../ui/actions'
import { MenuButton, type MenuEntry } from '../ui/Menu'

// The parts of a New workspace form that the page and the dialog share.

/**
 * The repository of the new workspace, as a menu of the chosen ones. A
 * repository that waits for a build keeps its place, off, with a note that
 * says when it is ready.
 */
export function RepositoryMenu(props: {
  repositories: readonly Repository[]
  chosen: Repository
  choose: (id: string) => void
  /** The chosen repositories that wait for a build. */
  waiting: WaitingRepositories
  /** The look of the button. The page uses the default, the dialog `plain`. */
  tone?: ActionTone
  /** The class of the chevron, from the CSS of the page or of the dialog. */
  chevron: string
}) {
  const { chosen, waiting } = props
  return (
    <MenuButton
      entries={props.repositories.map((item): MenuEntry => {
        const waits = waiting.ids.has(item.id)
        return {
          kind: 'item',
          label: item.fullName,
          checked: item.id === chosen.id,
          disabled: waits,
          detail: waits ? menuNotes[waiting.wait] : undefined,
          onSelect: () => props.choose(item.id),
        }
      })}
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

/**
 * The org and the section of the new workspace, as a menu of the sections
 * of the org in the order of the list. The Archived group of the list is
 * not a section, so the menu never offers it.
 */
export function SectionMenu(props: {
  org: string
  sections: readonly Section[]
  chosen: Section
  choose: (id: string) => void
  disabled: boolean
  /** The class of the chevron, from the CSS of the dialog. */
  chevron: string
  /** The class of the box that the open menu hangs from. */
  className: string
}) {
  const { chosen } = props
  const ordered = [...props.sections].sort((a, b) => a.position - b.position)
  return (
    <MenuButton
      className={props.className}
      entries={ordered.map((item): MenuEntry => ({
        kind: 'item',
        id: item.id,
        label: item.name,
        checked: item.id === chosen.id,
        onSelect: () => props.choose(item.id),
      }))}
      label="Section"
      trigger={({ open, toggle }) => (
        <ActionButton
          accessibilityLabel={`Section: ${chosen.name}`}
          disabled={props.disabled}
          expanded={open}
          menu
          onPress={toggle}
          tone="plain"
          trailing={
            <ChevronDown aria-hidden className={props.chevron} size={13} />
          }
        >
          {`${props.org} · ${chosen.name}`}
        </ActionButton>
      )}
    />
  )
}
