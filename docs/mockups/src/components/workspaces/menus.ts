import { FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import type { MenuEntry } from '../common/Menu'

/**
 * The actions of a section. New workspace creates the workspace in this
 * section. Deleting a section moves its workspaces to the default section.
 */
export const sectionMenu: readonly MenuEntry[] = [
  { kind: 'item', label: 'New workspace', icon: Plus },
  { kind: 'item', label: 'Rename section', icon: Pencil },
  { kind: 'item', label: 'New section', icon: FolderPlus },
  { kind: 'divider' },
  { kind: 'item', label: 'Delete section', icon: Trash2, tone: 'danger' },
]
