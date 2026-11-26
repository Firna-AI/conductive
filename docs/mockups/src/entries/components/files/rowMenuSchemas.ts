import {
  rowMenuEntries,
  type FileRowMenu,
} from '../../../components/files/FileRowMenu'
import { splitPath } from '../../../fixtures/files'
import { menuSchema } from '../common/menuEntries'

/**
 * The open menu of a row of All files or Changes as JSON, as `FileRowMenu`
 * with the key of the icon of each item.
 */
export const fileRowMenuSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'name', 'entries', 'at'],
  properties: {
    /** The path of the row from the root of the repository. */
    path: { type: 'string', minLength: 1 },
    /** The name that the row shows, which names the menu. */
    name: { type: 'string', minLength: 1 },
    entries: menuSchema.properties.entries,
    /** At the pointer of a right click, or as a sheet on a phone. */
    at: { enum: ['pointer', 'sheet'] },
  },
} as const

/**
 * The menu of a row at the pointer of a right click, with Add to chat and
 * Copy path, for the own pages of the lists.
 */
export function pointerMenu(path: string): FileRowMenu {
  return {
    path,
    name: splitPath(path).name,
    entries: rowMenuEntries(true),
    at: 'pointer',
  }
}
