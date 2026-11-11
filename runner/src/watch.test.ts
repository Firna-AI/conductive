import { expect, it, onTestFinished } from 'vitest'

import type { FileEvent } from '../../src/shared/files'
import { runnerHarness } from '../test-support/harness'
import { repositoryFixture } from '../test-support/repository'
import { FileReporter } from './files'
import { Repository } from './repository'
import { Runner } from './runner'

it('watches new directories and Git index changes as tree deltas', async () => {
  const fixture = await repositoryFixture()
  const events: FileEvent[] = []
  let observed: (() => void) | undefined
  const reporter = new FileReporter(
    new Repository(fixture.root),
    'main',
    async (event) => {
      events.push(event)
      if (event.type === 'changes.updated') observed?.()
    },
  )
  await reporter.refresh(true)
  const close = reporter.watch(() => {})
  onTestFinished(close)
  const changed = new Promise<void>((resolve) => {
    observed = resolve
  })
  await fixture.write('created/deep/new.txt', 'new\n')
  await changed
  await reporter.refresh()
  expect(
    events.filter((event) => event.type === 'files.snapshot'),
  ).toHaveLength(1)
  expect(events).toContainEqual({
    type: 'files.changed',
    delta: {
      revision: 2,
      changes: [
        {
          operation: 'upsert',
          entry: {
            path: 'created',
            name: 'created',
            kind: 'directory',
            change: null,
          },
        },
        {
          operation: 'upsert',
          entry: {
            path: 'created/deep',
            name: 'deep',
            kind: 'directory',
            change: null,
          },
        },
        {
          operation: 'upsert',
          entry: {
            path: 'created/deep/new.txt',
            name: 'new.txt',
            kind: 'file',
            change: 'untracked',
          },
        },
      ],
    },
  })
  const staged = new Promise<void>((resolve) => {
    observed = resolve
  })
  await fixture.git('add', 'created/deep/new.txt')
  await staged
  await reporter.refresh()
  expect(events.at(-1)).toEqual({
    type: 'changes.updated',
    changes: {
      revision: 3,
      partNumber: 1,
      partCount: 1,
      baseBranch: 'main',
      unpushedCommits: 0,
      uncommittedFileCount: 1,
      files: [
        {
          path: 'created/deep/new.txt',
          change: 'added',
          added: 1,
          removed: 0,
          uncommitted: true,
        },
      ],
      summary: { files: 1, added: 1, removed: 0 },
    },
  })
})

it('waits for warm-up and watches files after an initial connection failure', async () => {
  const h = await runnerHarness()
  await h.runner.close()
  let warm: () => void = () => {}
  const warmed = new Promise<void>((resolve) => {
    warm = resolve
  })
  let attempts = 0
  let observed: () => void = () => {}
  const runner = new Runner({
    ...h.options,
    warm: () => warmed,
    connect: async (request) => {
      attempts++
      if (attempts === 1) throw new Error('The fake endpoint is offline.')
      const connection = await h.endpoint.connect(request)
      return {
        send: (message) => {
          connection.send(message)
          if (
            message.type === 'event' &&
            message.event.type === 'changes.updated' &&
            message.event.changes.summary.files > 0
          )
            observed()
        },
        onMessage: (listener) => connection.onMessage(listener),
        onClose: (listener) => connection.onClose(listener),
        close: () => connection.close(),
      }
    },
  })
  onTestFinished(() => runner.close())
  const started = runner.start().catch((error: unknown) => error)
  expect(attempts).toBe(0)
  warm()
  expect(await started).toEqual(new Error('The fake endpoint is offline.'))
  await runner.connect()
  const changed = new Promise<void>((resolve) => {
    observed = resolve
  })
  await h.write('after-recovery/new.txt', 'recovered\n')
  await changed
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'changes.updated',
    changes: {
      revision: 3,
      partNumber: 1,
      partCount: 1,
      baseBranch: 'main',
      unpushedCommits: 0,
      uncommittedFileCount: 1,
      files: [
        {
          path: 'after-recovery/new.txt',
          change: 'untracked',
          added: 1,
          removed: 0,
          uncommitted: true,
        },
      ],
      summary: { files: 1, added: 1, removed: 0 },
    },
  })
  await runner.close()
  let warmCalls = 0
  const retrying = new Runner({
    ...h.options,
    warm: async () => {
      warmCalls++
      if (warmCalls === 1)
        throw new Error('The binary pages are not available.')
    },
  })
  onTestFinished(() => retrying.close())
  await expect(retrying.start(false)).rejects.toThrow(
    'The binary pages are not available.',
  )
  await retrying.connect()
  expect(warmCalls).toBe(2)
})
