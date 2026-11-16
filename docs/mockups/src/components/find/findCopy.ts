import type { LucideIcon } from 'lucide-react'
import { Search } from 'lucide-react'

/**
 * The words of find in the shown tab: the field of the find bar, its count,
 * its buttons, the Find item of a tab menu, the Find button of the header of
 * a file page, and the rows of the Keyboard shortcuts tab. The app can share
 * them, as it shares the words of Copy link.
 */

/** The spoken name of the field, which the empty field also shows. */
export const findFieldLabel = 'Find in this tab'

/** The item of a tab menu that opens the find bar on its tab. */
export const findItem: { label: string; icon: LucideIcon } = {
  label: 'Find',
  icon: Search,
}

/** The spoken names of the buttons of the find bar. */
export const findButtons = {
  previous: 'Previous match',
  next: 'Next match',
  close: 'Close the find bar',
} as const

/** The spoken name of the Find button in the header of a file page. */
export function findInFile(name: string): string {
  return `Find in ${name}`
}

/**
 * The count of the find bar: the place of the current match among all the
 * matches, such as "3 of 17", or "No matches". An empty field shows none.
 */
export function findCount(place: number, total: number): string {
  return total === 0 ? 'No matches' : `${place} of ${total}`
}

/** The labels of the three commands of find on the Keyboard shortcuts tab. */
export const findCommands = {
  find: 'Find',
  next: 'Find next',
  previous: 'Find previous',
} as const

/** The labels of the fixed keys of the find field on that tab. */
export const findKeyLabels = {
  next: 'Next match in the find field',
  previous: 'Previous match in the find field',
  close: findButtons.close,
} as const

/** More words that find the rows of find in a search of that tab. */
export const findWords: readonly string[] = ['search', 'text']
