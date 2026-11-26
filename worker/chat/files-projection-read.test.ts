import { expect, it } from 'vitest'

import { FilesState } from '../files/state'
import { createRunnerLimitsFixture } from './runner-limits.test-support'
import { file, snapshot } from './runner-fixtures.test-support'

it('reads both projected lists in the chat queue without a new transaction', async () => {
  const fixture = await createRunnerLimitsFixture()
  const changes = {
    baseBranch: 'main',
    files: [
      {
        path: 'a',
        change: 'modified',
        added: 2,
        removed: 1,
        uncommitted: true,
      },
    ],
    summary: { files: 1, added: 2, removed: 1 },
  }
  await fixture.receive(1, snapshot(1, 1, 1, ['z', 'a']))
  await fixture.receive(2, {
    type: 'changes.updated',
    changes: { ...changes, revision: 1, partCount: 1, partNumber: 1 },
  })
  await fixture.setStorageHooks({
    beforeCommit: async () => {
      throw new Error('Projection read opened a durable transaction')
    },
  })

  const read = fixture.actor.api.chat.readWorkspace(
    'workspace',
    async (view) => {
      const files = new FilesState({
        get: (key) => view.files.get(key),
        getMany: (keys) => view.files.getMany(keys),
        transaction: async () => {
          throw new Error('Projection read opened a files transaction')
        },
      })
      return { tree: await files.tree(), changes: await files.changes() }
    },
  )
  await expect(read).resolves.toStrictEqual({
    tree: { revision: 1, entries: [file('z'), file('a')] },
    changes,
  })
})
