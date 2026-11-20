import { act } from 'react'
import { onTestFinished } from 'vitest'
import {
  envelopeAfter,
  filesAfterHistory,
  heldTree,
  startFiles,
} from '../files/files-test-kit'
import { filePaths, type FileEvent } from '../shared/files'
import type { FileEntry } from '../shared/generated/FileEntry'
import type { FileTreeChange } from '../shared/generated/FileTreeChange'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'

/**
 * The real file store of a chat, with an optional wait for its tree.
 * `changeTree` sends the next update of the tree on the stream of the
 * workspace, as the cloud computer sends a change of its files, and draws
 * its result.
 */
export async function chatFiles(
  entries: readonly FileEntry[],
  options: { holdTree?: boolean } = {},
) {
  const server = new FakeApiServer()
  let revision = 1
  server.json('GET', filePaths.tree(FAKE_IDS.org, FAKE_IDS.workspace), {
    revision,
    entries,
  })
  const held = heldTree(server)
  const files = filesAfterHistory(server, held.fetch)
  onTestFinished(() => {
    files.stop()
    held.release()
  })
  if (options.holdTree) files.start()
  else {
    held.release()
    await startFiles(files)
  }
  return {
    files,
    async releaseTree() {
      await act(async () => {
        held.release()
        await startFiles(files)
      })
    },
    async changeTree(changes: readonly FileTreeChange[]) {
      revision += 1
      const event: FileEvent = {
        type: 'files.changed',
        delta: { revision, changes },
      }
      await act(async () => {
        server.events.emit(envelopeAfter(server, event))
      })
    },
  }
}
