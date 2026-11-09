import { expect, it, onTestFinished } from 'vitest'

import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import { filesFor, slow, startFiles } from '../files-test-kit'
import type { FilesSubscribe } from './files-store'

it(
  'keeps unpushed counts from route reads, history, and live count-only updates without inventing legacy counts',
  slow,
  async () => {
    const server = new FakeApiServer()
    const changes = toolFixtures().changes
    const path = filePaths.changes(FAKE_IDS.org, FAKE_IDS.workspace)
    server.json('GET', path, { ...changes, unpushedCommits: 4 })
    let send: Parameters<FilesSubscribe>[1] = () => {}
    const files = filesFor(server, (_after, listener) => {
      send = listener
      return () => {}
    })
    onTestFinished(() => files.stop())
    await startFiles(files)
    expect(files.getSnapshot().changes).toMatchObject({ unpushedCommits: 4 })
    const envelope = (eventNumber: number, unpushedCommits?: number) => ({
      workspaceId: FAKE_IDS.workspace,
      eventNumber,
      occurredAt: FAKE_TIME,
      event: {
        type: 'changes.updated',
        changes: {
          baseBranch: changes.baseBranch,
          files: changes.files,
          summary: changes.summary,
          ...(unpushedCommits === undefined ? {} : { unpushedCommits }),
        },
      },
    })
    send({
      type: 'history',
      history: { events: [envelope(1, 2)], throughEventNumber: 1 },
    })
    expect(files.getSnapshot().changes).toMatchObject({ unpushedCommits: 2 })
    send({ type: 'event', envelope: envelope(2, 0) })
    expect(files.getSnapshot().changes).toMatchObject({ unpushedCommits: 0 })
    send({ type: 'event', envelope: envelope(3) })
    expect(files.getSnapshot().changes).not.toHaveProperty('unpushedCommits')
  },
)
