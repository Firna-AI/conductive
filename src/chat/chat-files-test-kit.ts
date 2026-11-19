import { act } from 'react'
import { onTestFinished } from 'vitest'
import {
  filesAfterHistory,
  heldTree,
  startFiles,
} from '../files/files-test-kit'
import { filePaths } from '../shared/files'
import type { FileEntry } from '../shared/generated/FileEntry'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'

/** The real file store of a chat, with an optional wait for its tree. */
export async function chatFiles(
  entries: readonly FileEntry[],
  options: { holdTree?: boolean } = {},
) {
  const server = new FakeApiServer()
  server.json('GET', filePaths.tree(FAKE_IDS.org, FAKE_IDS.workspace), {
    revision: 1,
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
  }
}
