import { expect, it } from 'vitest'
import { filePaths, type FileEvent } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { FAKE_FILE_PATH, toolFixtures } from '../../test-support/fixtures/tools'
import {
  deferred,
  envelopeAfter,
  filesFor,
  slow,
  startFiles,
  waitUntil,
} from '../files-test-kit'
import { followPath } from './follow-path'
import { ResourceLoader } from './resource-loader'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace
const path = FAKE_FILE_PATH

function edit(revision: number): FileEvent {
  return {
    type: 'files.changed',
    delta: {
      revision,
      changes: [
        {
          operation: 'upsert',
          entry: {
            path,
            name: 'AddressForm.tsx',
            kind: 'file',
            change: 'modified',
          },
        },
      ],
    },
  }
}

it(
  'refreshes an open preview when the first history arrives late',
  slow,
  async () => {
    const server = new FakeApiServer()
    const content = toolFixtures().content
    server.events.emit(envelopeAfter(server, edit(3)))
    let deliver = () => {}
    const files = filesFor(server, (after, listener) =>
      server.events.subscribe(after, (message) => {
        if (message.type === 'history') deliver = () => listener(message)
        else listener(message)
      }),
    )
    const loader = new ResourceLoader((key, signal) =>
      files.client.readFile(key, signal),
    )
    let stop = () => {}
    try {
      await startFiles(files)
      stop = followPath(files, loader, path)
      await waitUntil(() => {
        expect(loader.getSnapshot()).toMatchObject({
          status: 'ready',
          value: { content: content.content },
        })
      })
      server.json('GET', filePaths.content(org, id, path), {
        ...content,
        content: 'changed in history',
        sizeBytes: 18,
      })
      deliver()
      expect(loader.getSnapshot()).toMatchObject({
        status: 'ready',
        refreshing: true,
      })
      await waitUntil(() => {
        expect(loader.getSnapshot()).toMatchObject({
          status: 'ready',
          value: { content: 'changed in history' },
          refreshing: false,
        })
      })
    } finally {
      stop()
      files.stop()
    }
  },
)

it('refreshes a live edit before the first tree arrives', slow, async () => {
  const server = new FakeApiServer()
  const treeReply = deferred<Response>()
  const data = toolFixtures()
  const files = filesFor(
    server,
    (after, listener) =>
      server.events.subscribe(
        Math.max(after, server.events.history().throughEventNumber),
        listener,
      ),
    (input, init) =>
      input === filePaths.tree(org, id)
        ? treeReply.promise
        : server.fetch(input, init),
  )
  const loader = new ResourceLoader((key, signal) =>
    files.client.readFile(key, signal),
  )
  files.start()
  const stop = followPath(files, loader, path)
  try {
    await waitUntil(() => {
      expect(loader.getSnapshot()).toMatchObject({
        status: 'ready',
        value: { content: data.content.content },
      })
    })
    expect(files.getSnapshot().tree).toBeNull()
    const epoch = files.getSnapshot().epoch
    server.json('GET', filePaths.content(org, id, path), {
      ...data.content,
      content: 'changed before tree',
      sizeBytes: 19,
    })
    server.events.emit(envelopeAfter(server, edit(2)))
    expect(files.getSnapshot().epoch).toBe(epoch + 1)
    expect(loader.getSnapshot()).toMatchObject({
      status: 'ready',
      refreshing: true,
    })
    await waitUntil(() => {
      expect(loader.getSnapshot()).toMatchObject({
        status: 'ready',
        value: { content: 'changed before tree' },
        refreshing: false,
      })
    })
    treeReply.resolve(Response.json(data.files))
    await waitUntil(() => expect(files.getSnapshot().tree?.revision).toBe(2))
  } finally {
    stop()
    files.stop()
    treeReply.resolve(Response.json(data.files))
  }
})
