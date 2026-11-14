import {
  ArrowDown,
  ArrowUp,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { MenuEntry } from '../common/Menu'

/** Where a section is in the list, which decides its move items. */
export type SectionPlace = { first: boolean; last: boolean }

/**
 * The actions of a section. New workspace creates the workspace in this
 * section. Move section up and Move section down change the order of the
 * sections for the whole org: the first section has no Move section up,
 * and the last has no Move section down. Deleting a section moves its
 * workspaces to the default section.
 */
export function sectionMenu(place: SectionPlace): readonly MenuEntry[] {
  return [
    { kind: 'item', label: 'New workspace', icon: Plus },
    { kind: 'item', label: 'Rename section', icon: Pencil },
    ...(place.first
      ? []
      : [{ kind: 'item', label: 'Move section up', icon: ArrowUp } as const]),
    ...(place.last
      ? []
      : [
          {
            kind: 'item',
            label: 'Move section down',
            icon: ArrowDown,
          } as const,
        ]),
    { kind: 'item', label: 'New section', icon: FolderPlus },
    { kind: 'divider' },
    { kind: 'item', label: 'Delete section', icon: Trash2, tone: 'danger' },
  ]
}
