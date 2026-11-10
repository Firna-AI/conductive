import { useRef, useState } from 'react'
import { InputFrame } from '@firna/ui/input'
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspaces/SectionList.module.css'
import type { Section } from '../../shared/sections'
import { IconButton } from '../ui/actions'
import { MenuButton, type MenuEntry } from '../ui/Menu'
import type { RowVariant } from './WorkspaceRow'

/** The actions that a section's menu runs. */
export interface SectionActions {
  toggle: (section: Section) => void
  rename: (section: Section, name: string) => void
  newWorkspace: (section: Section) => void
  newSection: () => void
  remove: (section: Section) => void
}

function RenameField(props: {
  name: string
  save: (name: string) => void
  cancel: () => void
}) {
  const [name, setName] = useState(props.name)
  // Enter and the blur that follows both finish the field: only the first counts.
  const finished = useRef(false)
  const finish = () => {
    if (finished.current) return
    finished.current = true
    const trimmed = name.trim()
    if (trimmed === '' || trimmed === props.name) props.cancel()
    else props.save(trimmed)
  }
  return (
    <InputFrame
      accessibilityLabel="Section name"
      autoFocus
      onBlur={finish}
      onChangeText={setName}
      onKeyPress={(event) => {
        if (event.nativeEvent.key !== 'Escape') return
        finished.current = true
        props.cancel()
      }}
      onSubmitEditing={finish}
      selectTextOnFocus
      size="sm"
      value={name}
    />
  )
}

/**
 * The header of a section: its name, which collapses it, its count while
 * collapsed, and its menu with New workspace, Rename section, New section, and
 * Delete section. General, the default section, cannot be deleted. A
 * read-only list, as in a suspended org, shows no menu.
 */
export function SectionHeader(props: {
  section: Section
  count: number
  variant: RowVariant
  actions: SectionActions
  readOnly: boolean
}) {
  const { section, actions } = props
  const [renaming, setRenaming] = useState(false)
  const Chevron = section.collapsed ? ChevronRight : ChevronDown
  const entries: MenuEntry[] = [
    {
      kind: 'item',
      label: 'New workspace',
      icon: Plus,
      onSelect: () => actions.newWorkspace(section),
    },
    {
      kind: 'item',
      label: 'Rename section',
      icon: Pencil,
      onSelect: () => setRenaming(true),
    },
    {
      kind: 'item',
      label: 'New section',
      icon: FolderPlus,
      onSelect: actions.newSection,
    },
  ]
  if (!section.isDefault) {
    entries.push(
      { kind: 'divider' },
      {
        kind: 'item',
        label: 'Delete section',
        icon: Trash2,
        tone: 'danger',
        onSelect: () => actions.remove(section),
      },
    )
  }
  return (
    <div
      className={classes(
        styles.header,
        props.variant === 'page' && styles.pageHeader,
      )}
    >
      <h3 className={styles.heading}>
        {/* A page that learns of a suspension while a rename is open drops it. */}
        {renaming && !props.readOnly ? (
          <RenameField
            cancel={() => setRenaming(false)}
            name={section.name}
            save={(name) => {
              setRenaming(false)
              actions.rename(section, name)
            }}
          />
        ) : (
          <button
            aria-expanded={!section.collapsed}
            className={styles.toggle}
            onClick={() => actions.toggle(section)}
            type="button"
          >
            <Chevron aria-hidden className={styles.chevron} size={12} />
            <span className={styles.name}>{section.name}</span>
            {section.collapsed ? (
              <span className={styles.count}>{props.count}</span>
            ) : null}
          </button>
        )}
      </h3>
      {props.readOnly ? null : (
        <MenuButton
          entries={entries}
          label={section.name}
          trigger={({ open, toggle }) => (
            <span className={classes(styles.more, open && styles.moreOpen)}>
              <IconButton
                expanded={open}
                icon={MoreHorizontal}
                label={`More for ${section.name}`}
                menu
                onPress={toggle}
                quiet
              />
            </span>
          )}
        />
      )}
    </div>
  )
}
