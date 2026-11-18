import { createFilesClient } from '../../files/api/files-client'
import { devTree, registerDevFiles } from '../../files/dev/dev-fixtures'
import { createPictureReads } from '../../files/page/picture-reads'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import type { ChatMentions } from '../mentions/MentionsContext'

/**
 * The files of the fake workspace, for the list of `@` and the file chips:
 * the tree of the Files development page. A press on a chip notes what the
 * app opens.
 */
export function devMentions(note: (line: string) => void): ChatMentions {
  const server = new FakeApiServer()
  registerDevFiles(server)
  const client = createFilesClient({
    fetch: server.fetch,
    orgId: FAKE_IDS.org,
    workspaceId: FAKE_IDS.workspace,
  })
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
    pictures: createPictureReads(client),
    openFile: (path, lines) =>
      note(
        lines
          ? `The app opens ${path} at lines ${lines.start} to ${lines.end}.`
          : `The app opens ${path}.`,
      ),
    showFolder: (path) => note(`The app shows ${path}/ in All files.`),
    href: (entry) => `#${entry.path}`,
  }
}
