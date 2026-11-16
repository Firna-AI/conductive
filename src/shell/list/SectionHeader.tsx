import { useRef, useState } from 'react'
import { InputFrame } from '@firna/ui/input'
import {
  ArrowDown,
  ArrowUp,
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
import type { PointerDragProps } from '../../app/pointer-drag'
import type { Section } from '../../shared/sections'
import { IconButton } from '../ui/actions'
import { MenuButton, type MenuEntry } from '../ui/Menu'
import type { RowVariant } from './WorkspaceRow'
import list from './list.module.css'

/** The actions that a section's menu runs. */
export interface SectionActions {
  toggle: (section: Section) => void
  rename: (section: Section, name: string) => void
  /**
   * Moves the section to `index` of the list, which counts the sections
   * without the moved one.
   */
  moveTo: (section: Section, index: number) => void
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

/** Where a section is in the list: its index, and the number of sections. */
export interface SectionPlace {
  index: number
  total: number
}

/** The items of the menu that move a section one place up or down. */
function moveEntries(
  section: Section,
  place: SectionPlace,
  moveTo: SectionActions['moveTo'],
): MenuEntry[] {
  const entries: MenuEntry[] = []
  if (place.index > 0) {
    entries.push({
      kind: 'item',
      label: 'Move section up',
      icon: ArrowUp,
      onSelect: () => moveTo(section, place.index - 1),
    })
  }
  if (place.index < place.total - 1) {
    entries.push({
      kind: 'item',
      label: 'Move section down',
      icon: ArrowDown,
      onSelect: () => moveTo(section, place.index + 1),
    })
  }
  return entries
}

/**
 * The header of a section: its name, which collapses it, its count while
 * collapsed, and its menu with New workspace, Rename section, Move section
 * up, Move section down, New section, and Delete section. The first
 * section has no Move section up, and the last has no Move section down.
 * General, the default section, cannot be deleted. `bind` lets a drag of
 * the name move the section. A read-only list, as in a suspended org,
 * shows no menu and takes no drag.
 */
export function SectionHeader(props: {
  section: Section
  count: number
  place: SectionPlace
  variant: RowVariant
  actions: SectionActions
  readOnly: boolean
  bind?: PointerDragProps
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
    ...moveEntries(section, props.place, actions.moveTo),
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
            {...props.bind}
            aria-expanded={!section.collapsed}
            className={classes(styles.toggle, props.bind && list.headerDrag)}
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
