import { beforeAll, expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import {
  changedRow,
  changesDelta,
  fullChanges,
} from '../files/changes-delta.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { number } from '../chat/inputs'
import { secretFixture } from './requests.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/secrets/requests-entry.test-support.ts',
  )
})

it('masks newly used secret values in complete lists from saved file rows', async () => {
  const active = await secretFixture(bundle)
  try {
    await active.seed('TOKEN', 'newly-private-value', true)
    const path = 'runs/newly-private-value.txt'
    const displayPath = '[redacted]/newly-private-value.txt'
    const file = { ...changedRow(path), displayPath }
    const entry = {
      path,
      displayPath,
      name: 'newly-private-value.txt',
      kind: 'file' as const,
      change: null,
    }
    await active.emit(fullChanges({ files: [file] }))
    await active.emit({
      type: 'files.snapshot',
      tree: { revision: 1, partNumber: 1, partCount: 1, entries: [entry] },
    })
    const changesPath = filePaths.changes(OUTER_ORG, OUTER_WORKSPACE)
    const before = await active.request(changesPath)
    expect(before.status).toBe(200)
    expect(await before.json()).toMatchObject({ revision: 1, files: [file] })

    const run = await active.run({ names: ['TOKEN'], command: 'deploy' })
    expect(run.status).toBe(200)
    expect(await run.json()).toMatchObject({ status: 'allowed' })
    const older = await active.browser(0, active.cookies.ownerCookie, 'older')
    const after = number(older.history.throughEventNumber)
    await active.emit(changesDelta())

    const maskedPath = '[redacted]/[redacted].txt'
    const changes = {
      revision: 2,
      baseBranch: 'main',
      files: [{ ...file, displayPath: maskedPath }],
      summary: { files: 1, added: 1, removed: 0 },
      omitted: { files: 0, added: 0, removed: 0 },
    }
    const envelope = expect.objectContaining({
      eventNumber: after + 1,
      event: { type: 'changes.updated', changes },
    })
    expect(await older.inbox.next()).toEqual({ type: 'event', envelope })
    expect(older.history.events).toContainEqual(
      expect.objectContaining({
        event: {
          type: 'changes.updated',
          changes: {
            revision: 1,
            baseBranch: 'main',
            files: changes.files,
            summary: changes.summary,
          },
        },
      }),
    )

    const replay = await active.browser(
      after,
      active.cookies.ownerCookie,
      'older',
    )
    expect(replay.history.events).toEqual([envelope])

    const savedChanges = await active.request(changesPath)
    expect(savedChanges.status).toBe(200)
    expect(await savedChanges.json()).toMatchObject(changes)

    const tree = await active.request(
      filePaths.tree(OUTER_ORG, OUTER_WORKSPACE),
    )
    expect(tree.status).toBe(200)
    expect(await tree.json()).toMatchObject({
      revision: 1,
      entries: [{ ...entry, displayPath: maskedPath, name: '[redacted].txt' }],
    })
  } finally {
    await active.dispose()
  }
})
