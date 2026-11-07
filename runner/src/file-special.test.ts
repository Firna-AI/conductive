import { execFile } from 'node:child_process'
import { constants } from 'node:fs'
import { open, symlink, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { expect, it, onTestFinished, vi } from 'vitest'

import { runnerHarness, turn } from '../test-support/harness'
import { Git } from './git'

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    open: vi.fn<typeof actual.open>((path, flags, mode) =>
      actual.open(
        path,
        typeof flags === 'number' ? flags | constants.O_NONBLOCK : flags,
        mode,
      ),
    ),
  }
})

const execute = promisify(execFile)

it('refuses pipes with a nonblocking descriptor and diffs link text without reading the pipe', async () => {
  const h = await runnerHarness()
  const pipe = join(h.root, 'pipe')
  await execute('mkfifo', [pipe])
  await symlink('pipe', join(h.root, 'pipe-link'))
  const original = Git.prototype.run
  const commands = vi.spyOn(Git.prototype, 'run').mockImplementation(function (
    this: Git,
    args,
    ...options
  ) {
    if (args.includes('--no-index') && args.includes('pipe-link'))
      return Promise.resolve(
        Buffer.from('The old pipe-following command was intercepted.'),
      )
    return original.call(this, args, ...options)
  })
  onTestFinished(() => commands.mockRestore())
  h.endpoint.send({
    type: 'file.read',
    requestId: 'pipe-read',
    path: 'pipe',
    maxBytes: 100,
  })
  await h.runner.idle()
  expect(
    h.endpoint.fileResponses.find(
      (response) => response.requestId === 'pipe-read',
    ),
  ).toEqual({
    type: 'file.read.result',
    requestId: 'pipe-read',
    result: {
      ok: false,
      error: { code: 'file_unavailable', message: 'The file cannot be read.' },
    },
  })
  expect(
    vi
      .mocked(open)
      .mock.calls.filter(([path]) => path === pipe)
      .map(([, flags]) =>
        typeof flags === 'number' ? flags & constants.O_NONBLOCK : 0,
      ),
  ).toEqual([constants.O_NONBLOCK])
  h.endpoint.send({
    type: 'file.diff',
    requestId: 'pipe-diff',
    path: 'pipe-link',
    defaultBranch: 'main',
  })
  await h.runner.idle()
  expect(
    h.endpoint.fileResponses.find(
      (response) => response.requestId === 'pipe-diff',
    ),
  ).toMatchObject({
    type: 'file.diff.result',
    result: {
      ok: true,
      diff: {
        oldContent: null,
        newContent: 'pipe',
        patch: expect.stringContaining('+pipe\n'),
      },
    },
  })
  await unlink(join(h.root, 'README.md'))
  await execute('mkfifo', [join(h.root, 'README.md')])
  const refreshed = await h.runner.files.refresh().then(
    () => 'ready',
    () => 'failed',
  )
  expect(refreshed).toBe('ready')
  expect(
    h.endpoint.runnerEvents.findLast(
      ({ event }) => event.type === 'changes.updated',
    )?.event,
  ).toMatchObject({
    type: 'changes.updated',
    changes: {
      files: expect.arrayContaining([
        {
          path: 'pipe-link',
          change: 'untracked',
          added: 1,
          removed: 0,
          uncommitted: true,
        },
      ]),
    },
  })
  h.endpoint.disconnect()
  await h.runner.connect()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'runner.ready',
  })
  h.endpoint.send(turn())
  await h.runner.idle()
  h.endpoint.send({
    type: 'interrupt',
    commandId: 'pipe-stop',
    sessionId: 'session-1',
    turnId: 'turn-1',
  })
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.completed',
    state: 'stopped',
  })
  await unlink(join(h.root, 'README.md'))
  await h.write('README.md', 'restored\n')
  await h.runner.files.refresh()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'changes.updated',
    changes: {
      files: expect.arrayContaining([
        {
          path: 'README.md',
          change: 'modified',
          added: 1,
          removed: 2,
          uncommitted: true,
        },
      ]),
    },
  })
})
