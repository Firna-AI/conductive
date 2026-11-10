import { devTree } from '../../files/dev/dev-fixtures'
import type { ChatMentions } from '../mentions/MentionsContext'

/**
 * The files of the fake workspace, for the list of `@` and the file chips:
 * the tree of the Files development page. A press on a chip notes what the
 * app opens.
 */
export function devMentions(note: (line: string) => void): ChatMentions {
  const tree = devTree()
  const snapshot = {
    tree: {
      entries: new Map(tree.entries.map((entry) => [entry.path, entry])),
    },
    treeError: null,
    treeUnavailable: false,
  }
  return {
    files: { subscribe: () => () => undefined, getSnapshot: () => snapshot },
    openFile: (path) => note(`The app opens ${path}.`),
    showFolder: (path) => note(`The app shows ${path}/ in All files.`),
    href: (entry) => `#${entry.path}`,
  }
}
