import { expect, it } from 'vitest'

import type { ChangedFile } from '../../src/shared/files'
import { turn } from '../test-support/harness'
import { wireFixture } from '../test-support/wire'
import { mapTool } from './providers/tool'

it('bounds normalized and escaped tool detail after filtering each full update', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  const command = turn()
  command.login.secret = 'x'
  h.endpoint.send(command)
  await h.runner.idle()
  const source = '\n'.repeat(32_765) + '😀\ud800"\\tail'
  for (const detail of [
    null,
    source,
    '"\\'.repeat(16_383) + '\u0000😀',
    'a'.repeat(65_533) + '😀',
    'ok\ud800😀\udc00',
    'x'.repeat(7_000),
  ]) {
    h.providers.latest.emit({
      type: 'tool',
      tool: mapTool(
        'tool',
        'Read',
        { path: 'file', description: detail },
        'running',
      ),
    })
    await h.runner.idle()
  }
  const tools = h.endpoint.runnerEvents.flatMap(({ event }) =>
    event.type === 'tool.updated' ? [event.tool] : [],
  )
  expect(tools.map((tool) => tool.detail)).toEqual([
    null,
    '\n'.repeat(32_765) + '😀',
    '"\\'.repeat(16_383),
    'a'.repeat(65_533),
    'ok�😀�',
    '[redacted]'.repeat(6_553) + '[red',
  ])
  expect(tools.map((tool) => tool.omittedDetailBytes)).toEqual([
    0, 9, 5, 4, 0, 4_466,
  ])
  expect(
    tools.map((tool) => Buffer.byteLength(JSON.stringify(tool.detail))),
  ).toEqual([4, 65_536, 65_534, 65_535, 14, 65_536])
  expect(h.warnings).toEqual([])
})

it('keeps a whole unique-path turn-file prefix within count and JSON byte caps', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  const countFiles: ChangedFile[] = Array.from({ length: 202 }, (_, index) => ({
    path: `file-${index}`,
    change: 'modified',
    added: 1,
    removed: 0,
  }))
  const byteFiles: ChangedFile[] = ['a', 'b', 'c'].map((id) => ({
    path: id + '\n'.repeat(50_000),
    previousPath: `${id}-old`,
    change: 'renamed',
    added: 1,
    removed: 0,
  }))
  byteFiles.push({ path: 'short', change: 'added', added: 1, removed: 0 })
  const duplicate = countFiles[0]
  if (!duplicate) throw new Error('The fixture needs its first file.')
  const secretFiles: ChangedFile[] = ['a', 'b'].map((id) => ({
    path: 'x'.repeat(15_000) + id,
    change: 'added',
    added: 1,
    removed: 0,
  }))
  secretFiles.push({ path: 'short', change: 'added', added: 1, removed: 0 })
  const boundaryFiles: ChangedFile[] = ['a', 'b'].map((path) => ({
    path,
    change: 'modified',
    added: 0,
    removed: 0,
  }))
  const room = 262_145 - Buffer.byteLength(JSON.stringify(boundaryFiles))
  boundaryFiles[0] = {
    path: 'a' + 'z'.repeat(Math.floor(room / 2)),
    change: 'modified',
    added: 0,
    removed: 0,
  }
  boundaryFiles[1] = {
    path: 'b' + 'z'.repeat(Math.ceil(room / 2)),
    change: 'modified',
    added: 0,
    removed: 0,
  }
  expect(Buffer.byteLength(JSON.stringify(boundaryFiles))).toBe(262_145)
  const inputs = [
    [...countFiles, duplicate],
    byteFiles,
    secretFiles,
    boundaryFiles,
  ]
  for (const [index, files] of inputs.entries()) {
    const command = turn(String(index))
    command.login.secret = 'x'
    h.endpoint.send(command)
    await h.runner.idle()
    h.setTurnFiles(files)
    h.providers.latest.emit({
      type: 'result',
      state: 'finished',
      userMessageIds: [],
    })
    await h.runner.idle()
  }
  const completed = h.endpoint.runnerEvents.flatMap(({ event }) =>
    event.type === 'turn.completed' ? [event] : [],
  )
  expect(completed.map((event) => event.files)).toEqual([
    countFiles.slice(0, 200),
    byteFiles.slice(0, 2),
    [
      {
        path: 'x'.repeat(15_000) + 'a',
        displayPath: '[redacted]'.repeat(15_000) + 'a',
        change: 'added',
        added: 1,
        removed: 0,
      },
    ],
    boundaryFiles.slice(0, 1),
  ])
  expect(completed.map((event) => event.omittedFileCount)).toEqual([2, 2, 2, 1])
  expect(
    Buffer.byteLength(JSON.stringify(byteFiles.slice(0, 2))),
  ).toBeLessThanOrEqual(262_144)
  expect(
    Buffer.byteLength(JSON.stringify(byteFiles.slice(0, 3))),
  ).toBeGreaterThan(262_144)
  expect(h.warnings).toEqual([])
})
